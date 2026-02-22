"use client";

import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  MenuBook as BooksIcon,
  People as UsersIcon,
  RateReview as ReviewsIcon,
  SmartToy as AiOpsIcon,
  Assessment as ReportsIcon,
  History as AuditLogsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem } from "@/lib/types";

export const DRAWER_WIDTH = 240;

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: DashboardIcon,
    allowedRoles: [
      "super_admin",
      "admin",
    ],
  },
  {
    label: "Books",
    href: "/books",
    icon: BooksIcon,
    allowedRoles: ["super_admin", "admin"],
  },
  {
    label: "Users",
    href: "/users",
    icon: UsersIcon,
    allowedRoles: ["super_admin", "admin"],
  },
  {
    label: "Reviews",
    href: "/reviews",
    icon: ReviewsIcon,
    allowedRoles: ["super_admin", "admin"],
  },
  {
    label: "AI Ops",
    href: "/ai-ops",
    icon: AiOpsIcon,
    allowedRoles: ["super_admin"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ReportsIcon,
    allowedRoles: ["super_admin", "admin"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: AuditLogsIcon,
    allowedRoles: ["super_admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    allowedRoles: ["super_admin", "admin"],
  },
];

export { NAV_ITEMS };

export default function AppNavSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.allowedRoles.includes(role),
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Link href="/" passHref>
            <Typography
              variant="h6"
              noWrap
              fontWeight={700}
              color="primary.text"
            >
              AudioBook Admin
            </Typography>
          </Link>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "primary.light",
                    color: "white",
                    "& .MuiListItemIcon-root": { color: "white" },
                    "&:hover": { backgroundColor: "primary.main" },
                  },
                }}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}
