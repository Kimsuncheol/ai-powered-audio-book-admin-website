import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import type {
  Actor,
  BookDocument,
  BookFormValues,
  BookStatus,
} from '@/lib/types';

const BOOKS_COLLECTION = 'books';

// ---- Helpers ----

function docToBook(id: string, data: Record<string, unknown>): BookDocument {
  return { ...(data as Omit<BookDocument, 'id'>), id };
}

// ---- Read ----

export async function getBook(
  bookId: string,
  actor: Actor
): Promise<BookDocument | null> {
  const snap = await getDoc(doc(db, BOOKS_COLLECTION, bookId));
  if (!snap.exists()) return null;
  const book = docToBook(snap.id, snap.data());
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'book',
    resourceId: bookId,
  });
  return book;
}

export async function listBooks(actor: Actor): Promise<BookDocument[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'book',
    resourceId: null,
    metadata: { count: snap.size },
  });
  return snap.docs.map((d) => docToBook(d.id, d.data()));
}

// ---- Create ----

type BookCreateInput = Omit<
  BookDocument,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'totalChapters' | 'publishedAt'
>;

export async function createBook(
  data: BookCreateInput,
  actor: Actor
): Promise<string> {
  const docRef = await addDoc(collection(db, BOOKS_COLLECTION), {
    ...data,
    status: 'draft' as BookStatus,
    totalChapters: 0,
    publishedAt: null,
    createdBy: actor.uid,
    updatedBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'create',
    resourceType: 'book',
    resourceId: docRef.id,
    metadata: { title: data.title },
  });
  return docRef.id;
}

// ---- Update metadata ----

export async function updateBook(
  bookId: string,
  patch: Partial<BookFormValues>,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    ...patch,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'book',
    resourceId: bookId,
    metadata: { fields: Object.keys(patch) },
  });
}

// ---- Update asset fields ----

export async function updateBookCover(
  bookId: string,
  coverImageUrl: string,
  coverImagePath: string,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    coverImageUrl,
    coverImagePath,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'book',
    resourceId: bookId,
    metadata: { assetType: 'cover' },
  });
}

export async function updateBookAudio(
  bookId: string,
  audioUrl: string,
  audioPath: string,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    audioUrl,
    audioPath,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'book',
    resourceId: bookId,
    metadata: { assetType: 'bookAudio' },
  });
}

export async function removeBookCover(bookId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    coverImageUrl: null,
    coverImagePath: null,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'book',
    resourceId: bookId,
    metadata: { assetType: 'cover', action: 'remove' },
  });
}

export async function removeBookAudio(bookId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    audioUrl: null,
    audioPath: null,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update',
    resourceType: 'book',
    resourceId: bookId,
    metadata: { assetType: 'bookAudio', action: 'remove' },
  });
}

// ---- Status transitions ----

export async function updateBookStatus(
  bookId: string,
  newStatus: BookStatus,
  actor: Actor
): Promise<void> {
  const publishedAt = newStatus === 'published' ? serverTimestamp() : undefined;
  await updateDoc(doc(db, BOOKS_COLLECTION, bookId), {
    status: newStatus,
    ...(publishedAt !== undefined ? { publishedAt } : {}),
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  const action =
    newStatus === 'published'
      ? 'publish'
      : newStatus === 'archived'
        ? 'delete'  // logical delete
        : 'unpublish';

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    resourceType: 'book',
    resourceId: bookId,
    metadata: { newStatus },
  });
}

// ---- Duplicate ----

export async function duplicateBook(
  bookId: string,
  actor: Actor
): Promise<string> {
  const original = await getDoc(doc(db, BOOKS_COLLECTION, bookId));
  if (!original.exists()) throw new Error('Book not found');

  const data = original.data() as BookDocument;
  const newDocRef = await addDoc(collection(db, BOOKS_COLLECTION), {
    title: `Copy of ${data.title}`,
    author: data.author,
    narrator: data.narrator,
    description: data.description,
    language: data.language,
    genres: data.genres,
    tags: data.tags,
    status: 'draft' as BookStatus,
    coverImageUrl: null,
    coverImagePath: null,
    audioUrl: null,
    audioPath: null,
    totalChapters: 0,
    publishedAt: null,
    createdBy: actor.uid,
    updatedBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'create',
    resourceType: 'book',
    resourceId: newDocRef.id,
    metadata: { duplicatedFrom: bookId, title: `Copy of ${data.title}` },
  });

  return newDocRef.id;
}
