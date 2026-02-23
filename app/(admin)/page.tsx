"use client";

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Skeleton,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_ITEMS } from "@/components/layout/AppNavSidebar";

const DASHBOARD_SKELETON_COUNT = 8;

function DashboardCardSkeletonGrid() {
  return (
    <>
      {Array.from({ length: DASHBOARD_SKELETON_COUNT }).map((_, index) => (
        <Grid key={`dashboard-skeleton-${index}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                py: 4,
              }}
            >
              <Skeleton variant="circular" width={48} height={48} animation="wave" />
              <Skeleton
                variant="text"
                width="68%"
                height={36}
                animation="wave"
                sx={{ transform: "none" }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </>
  );
}

export default function DashboardPage() {
  const { role, isLoading } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.allowedRoles.includes(role),
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        {isLoading ? (
          <DashboardCardSkeletonGrid />
        ) : (
          visibleItems.map((item) => {
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
          })
        )}
      </Grid>
    </Box>
  );
}
