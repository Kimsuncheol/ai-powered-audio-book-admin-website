"use client";

import React, { useState, useContext } from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
  Typography,
  Divider,
  Skeleton,
} from "@mui/material";
import {
  Logout,
  LightMode,
  DarkMode,
  SettingsBrightness,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ColorModeContext, ColorMode } from "@/components/theme/ThemeRegistry";
import { DRAWER_WIDTH } from "./AppNavSidebar";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
};

export default function AdminAppBar() {
  const { firebaseUser, role, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mode, setMode } = useContext(ColorModeContext);

  const handleSignOut = async () => {
    setAnchorEl(null);
    await signOut();
    router.push("/login");
  };

  const initials = firebaseUser?.email?.[0]?.toUpperCase() ?? "?";

  if (isLoading) {
    return (
      <MuiAppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          ml: `${DRAWER_WIDTH}px`,
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton
              variant="circular"
              width={32}
              height={32}
              animation="wave"
              sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
            />
            <Skeleton
              variant="rounded"
              width={92}
              height={24}
              animation="wave"
              sx={{
                borderRadius: 10,
                bgcolor: "rgba(255,255,255,0.2)",
              }}
            />
            <Skeleton
              variant="circular"
              width={32}
              height={32}
              animation="wave"
              sx={{ bgcolor: "rgba(255,255,255,0.25)" }}
            />
          </Box>
        </Toolbar>
      </MuiAppBar>
    );
  }

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
      }}
    >
      <Toolbar>
        {/* Spacer — page titles will be injected in future milestones */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Appearance mode toggle */}
          <IconButton
            color="inherit"
            aria-label="Toggle appearance mode"
            onClick={() => {
              const modes: ColorMode[] = ["light", "dark", "system"];
              const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length];
              setMode(nextMode);
            }}
            sx={{
              mr: 0.5,
              color: "rgba(255,255,255,0.7)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
              },
            }}
          >
            {mode === "light" ? (
              <LightMode fontSize="small" />
            ) : mode === "dark" ? (
              <DarkMode fontSize="small" />
            ) : (
              <SettingsBrightness fontSize="small" />
            )}
          </IconButton>

          {role && (
            <Chip
              label={ROLE_LABELS[role] ?? role}
              size="small"
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.5)",
              }}
              variant="outlined"
            />
          )}
          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="account menu"
            aria-controls={anchorEl ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl)}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
              {initials}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          id="account-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {firebaseUser?.email}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>
            <Logout fontSize="small" sx={{ mr: 1 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </MuiAppBar>
  );
}
