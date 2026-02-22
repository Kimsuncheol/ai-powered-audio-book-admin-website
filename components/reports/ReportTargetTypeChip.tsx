'use client';

import Chip from '@mui/material/Chip';
import type { ReportTargetEntityType } from '@/lib/types';

const TARGET_LABELS: Record<ReportTargetEntityType, string> = {
  review: 'Review',
  user: 'User',
  book: 'Book',
  author_profile: 'Author Profile',
};

export default function ReportTargetTypeChip({
  targetEntityType,
}: {
  targetEntityType: ReportTargetEntityType;
}) {
  return <Chip label={TARGET_LABELS[targetEntityType]} size="small" variant="outlined" />;
}

