"use client";

import Chip from "@mui/material/Chip";
import type { SxProps, Theme } from "@mui/material/styles";
import type { UserType } from "@/lib/types";

interface UserTypeChipProps {
  userType: UserType | undefined;
  sx?: SxProps<Theme>;
}

type ChipColor = "default" | "primary" | "warning" | "info";

const USER_TYPE_CONFIG: Record<UserType, { label: string; color: ChipColor }> =
  {
    admin: { label: "Admin", color: "primary" },
    author: { label: "Author", color: "info" },
    reader: { label: "Reader", color: "warning" },
  };

export default function UserTypeChip({ userType, sx }: UserTypeChipProps) {
  const config = userType
    ? USER_TYPE_CONFIG[userType]
    : { label: "Unknown", color: "default" as ChipColor };
  return (
    <Chip label={config.label} color={config.color} size="small" sx={sx} />
  );
}
