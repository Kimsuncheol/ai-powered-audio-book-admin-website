"use client";

import React from "react";
import { Box, Toolbar } from "@mui/material";
import AppNavSidebar, { DRAWER_WIDTH } from "./AppNavSidebar";
import AdminAppBar from "./AppBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AdminAppBar />
      <AppNavSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          backgroundColor: "background.default",
          minHeight: "100vh",
        }}
      >
        {/* Toolbar spacer pushes content below the fixed AppBar */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
