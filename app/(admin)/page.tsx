"use client";

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_ITEMS } from "@/components/layout/AppNavSidebar";

export default function DashboardPage() {
  const { role } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.allowedRoles.includes(role),
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Grid key={item.href} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardActionArea
                  component={Link}
                  href={item.href}
                  sx={{ height: "100%" }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1.5,
                      py: 4,
                    }}
                  >
                    <Icon sx={{ fontSize: 48, color: "primary.main" }} />
                    <Typography variant="h6" fontWeight={600}>
                      {item.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
