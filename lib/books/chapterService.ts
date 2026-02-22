import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import type { Actor, ChapterDocument } from '@/lib/types';

const BOOKS_COLLECTION = 'books';
const CHAPTERS_SUBCOLLECTION = 'chapters';

function chaptersRef(bookId: string) {
  return collection(db, BOOKS_COLLECTION, bookId, CHAPTERS_SUBCOLLECTION);
}

function chapterDocRef(bookId: string, chapterId: string) {
  return doc(db, BOOKS_COLLECTION, bookId, CHAPTERS_SUBCOLLECTION, chapterId);
}

function docToChapter(id: string, data: Record<string, unknown>): ChapterDocument {
  return { ...(data as Omit<ChapterDocument, 'id'>), id };
}

// ---- Read ----

export async function listChapters(bookId: string): Promise<ChapterDocument[]> {
  const q = query(chaptersRef(bookId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToChapter(d.id, d.data()));
}

// ---- Create ----

export async function createChapter(
  bookId: string,
  data: Pick<ChapterDocument, 'title' | 'order'>,
  actor: Actor
): Promise<string> {
  const batch = writeBatch(db);

  // Add chapter document
  const newChapterRef = doc(chaptersRef(bookId));
  batch.set(newChapterRef, {
    bookId,
    title: data.title,
    order: data.order,
    audioUrl: null,
    audioPath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Increment totalChapters on parent book
  batch.update(doc(db, BOOKS_COLLECTION, bookId), {
    totalChapters: increment(1),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'create',
    resourceType: 'chapter',
    resourceId: bookId,
    metadata: { chapterId: newChapterRef.id, title: data.title, order: data.order },
  });

  return newChapterRef.id;
}

// ---- Update ----

export async function updateChapter(
  bookId: string,
  chapterId: string,
  patch: Partial<Pick<ChapterDocument, 'title' | 'order'>>,
  actor: Actor
): Promise<void> {
  // Validate order uniqueness if order is being changed
  if (patch.order !== undefined) {
    const siblings = await listChapters(bookId);
    const conflict = siblings.find(
      (c) => c.order === patch.order && c.id !== chapterId
    );
    if (conflict) {
      throw new Error('ORDER_CONFLICT');
    }
  }

  await updateDoc(chapterDocRef(bookId, chapterId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'chapter',
    resourceId: bookId,
    metadata: { chapterId, fields: Object.keys(patch) },
  });
}

// ---- Update chapter audio ----

export async function updateChapterAudio(
  bookId: string,
  chapterId: string,
  audioUrl: string,
  audioPath: string,
  actor: Actor
): Promise<void> {
  await updateDoc(chapterDocRef(bookId, chapterId), {
    audioUrl,
    audioPath,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'chapter',
    resourceId: bookId,
    metadata: { chapterId, assetType: 'chapterAudio' },
  });
}

// ---- Delete ----

export async function deleteChapter(
  bookId: string,
  chapterId: string,
  actor: Actor
): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(chapterDocRef(bookId, chapterId));
  batch.update(doc(db, BOOKS_COLLECTION, bookId), {
    totalChapters: increment(-1),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'delete',
    resourceType: 'chapter',
    resourceId: bookId,
    metadata: { chapterId },
  });
}

// ---- Reorder (swap two adjacent chapters) ----

export async function swapChapterOrder(
  bookId: string,
  chapterIdA: string,
  orderA: number,
  chapterIdB: string,
  orderB: number,
  actor: Actor
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(chapterDocRef(bookId, chapterIdA), {
    order: orderB,
    updatedAt: serverTimestamp(),
  });
  batch.update(chapterDocRef(bookId, chapterIdB), {
    order: orderA,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'chapter',
    resourceId: bookId,
    metadata: { reorder: true, chapterIdA, chapterIdB },
  });
}
