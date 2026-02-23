'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AuditActionChip from '@/components/audit/AuditActionChip';
import AuditResourceChip from '@/components/audit/AuditResourceChip';
import type { AuditLogDocument, ResourceType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Deep-link route map
// ---------------------------------------------------------------------------
function getEntityRoute(
  resourceType: ResourceType | string,
  resourceId: string | null
): string | null {
  if (!resourceId) return null;
  switch (resourceType) {
    case 'user':     return `/users/${resourceId}`;
    case 'book':     return `/books/${resourceId}`;
    case 'report':   return `/reports/${resourceId}`;
    case 'settings': return `/settings/${resourceId}`;
    case 'review':   return `/reviews/${resourceId}`;
    // auth, chapter, ai_config have no standalone admin page
    default:         return null;
  }
}

// ---------------------------------------------------------------------------
// Local CollapsibleJsonSection sub-component (not exported)
// ---------------------------------------------------------------------------
function CollapsibleJsonSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | undefined | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const isEmpty = !data || Object.keys(data).length === 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 0.5 }}
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((prev) => !prev);
        }}
        aria-expanded={expanded}
      >
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {title}
        </Typography>
        {!isEmpty && (
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              ml: 0.5,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              color: 'text.secondary',
            }}
          />
        )}
      </Box>
      {isEmpty ? (
        <Typography variant="caption" color="text.disabled">
          —
        </Typography>
      ) : (
        <Collapse in={expanded}>
          <Box
            component="pre"
            sx={{
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              backgroundColor: 'action.hover',
              borderRadius: 1,
              p: 1,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 300,
              overflowY: 'auto',
              m: 0,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 80, pt: '2px' }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------
function formatTimestamp(ts: AuditLogDocument['timestamp']): string {
  if (!ts) return '—';
  try {
    const date = ts.toDate();
    return date.toLocaleString();
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------
interface AuditLogDetailDrawerProps {
  open: boolean;
  log: AuditLogDocument | null;
  onClose: () => void;
}

export default function AuditLogDetailDrawer({
  open,
  log,
  onClose,
}: AuditLogDetailDrawerProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    if (!log?.id) return;
    await navigator.clipboard.writeText(log.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const entityRoute = log
    ? getEntityRoute(log.resourceType, log.resourceId)
    : null;

  const hasOptionalFields =
    log &&
    (log.result !== undefined ||
      log.actorType !== undefined ||
      log.reason !== undefined);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 } } }}
    >
      {log && (
        <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
            }}
          >
            <IconButton onClick={onClose} aria-label="Close detail" size="small">
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Audit Log Detail
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy log ID'}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleCopyId}
                  aria-label="Copy log ID"
                  disabled={!log.id}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {log.id && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}
            >
              {log.id}
            </Typography>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Event section */}
          <Typography
            variant="overline"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            Event
          </Typography>

          <DetailRow label="Timestamp">
            <Typography variant="body2">{formatTimestamp(log.timestamp)}</Typography>
          </DetailRow>

          <DetailRow label="Action">
            <AuditActionChip action={log.action} />
          </DetailRow>

          <DetailRow label="Resource">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <AuditResourceChip resourceType={log.resourceType} />
              {log.resourceId && (
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                >
                  {log.resourceId}
                </Typography>
              )}
              {entityRoute && (
                <Tooltip title="Open entity page">
                  <IconButton
                    size="small"
                    onClick={() => router.push(entityRoute)}
                    aria-label="Open entity page"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </DetailRow>

          <Divider sx={{ my: 2 }} />

          {/* Actor section */}
          <Typography
            variant="overline"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            Actor
          </Typography>

          <DetailRow label="Email">
            <Typography variant="body2">{log.actorEmail || '—'}</Typography>
          </DetailRow>

          <DetailRow label="UID">
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
            >
              {log.actorUid || '—'}
            </Typography>
          </DetailRow>

          <DetailRow label="Role">
            <Chip
              label={log.actorRole === 'super_admin' ? 'Super Admin' : 'Admin'}
              color={log.actorRole === 'super_admin' ? 'error' : 'success'}
              size="small"
            />
          </DetailRow>

          {/* Optional fields section */}
          {hasOptionalFields && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="overline"
                color="text.secondary"
                display="block"
                sx={{ mb: 1 }}
              >
                Additional Info
              </Typography>

              {log.result !== undefined && (
                <DetailRow label="Result">
                  <Chip
                    label={log.result === 'success' ? 'Success' : 'Failure'}
                    color={log.result === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                </DetailRow>
              )}

              {log.actorType !== undefined && (
                <DetailRow label="Actor Type">
                  <Typography variant="body2">{log.actorType}</Typography>
                </DetailRow>
              )}

              {log.reason !== undefined && (
                <DetailRow label="Reason">
                  <Typography variant="body2">{log.reason}</Typography>
                </DetailRow>
              )}
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Payload sections */}
          <Typography
            variant="overline"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            Payload
          </Typography>

          <CollapsibleJsonSection title="Metadata" data={log.metadata} />
          <CollapsibleJsonSection title="Before" data={log.before} />
          <CollapsibleJsonSection title="After" data={log.after} />
        </Box>
      )}
    </Drawer>
  );
}
