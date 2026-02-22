"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import UserTypeChip from "./UserTypeChip";
import AccountStatusChip from "./AccountStatusChip";
import AuthorStatusChip from "./AuthorStatusChip";
import StatusChangeDialog from "./StatusChangeDialog";
import AuthorActionDialog from "./AuthorActionDialog";
import AdminRoleDialog from "./AdminRoleDialog";
import { listUsers } from "@/lib/users/userService";
import type {
  Actor,
  AdminRole,
  AuthorStatus,
  UserDocument,
  UserType,
} from "@/lib/types";

const ADMIN_ROLE_CHIP: Record<
  AdminRole,
  { label: string; color: "error" | "warning" | "info" | "success" }
> = {
  super_admin: { label: "Super Admin", color: "error" },
  content_admin: { label: "Admin", color: "success" },
  community_admin: { label: "Admin", color: "success" },
  analyst: { label: "Admin", color: "success" },
  admin: { label: "Admin", color: "success" },
} as Record<
  AdminRole,
  { label: string; color: "error" | "warning" | "info" | "success" }
>;

interface UserListProps {
  actor: Actor;
}

type ActiveTab = 0 | 1 | 2 | 3;
type ActiveDialog = "status" | "adminRole" | "authorAction" | null;
type AuthorAction = "approve" | "reject" | "suspend";

function formatDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts) return "—";
  try {
    const date =
      typeof ts.toDate === "function"
        ? ts.toDate()
        : new Date(ts as unknown as string);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const TAB_USER_TYPES: (UserType | null)[] = [null, "admin", "author", "reader"];

export default function UserList({ actor }: UserListProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialog state
  const [actionTarget, setActionTarget] = useState<UserDocument | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [adminRoleMode, setAdminRoleMode] = useState<"assign" | "revoke">(
    "assign",
  );
  const [authorAction, setAuthorAction] = useState<AuthorAction>("approve");
  const [rowMenuAnchorEl, setRowMenuAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [rowMenuUser, setRowMenuUser] = useState<UserDocument | null>(null);

  const isSuperAdmin = actor.role === "super_admin";
  const canManageUsers = actor.role === "super_admin" || actor.role === "admin";
  const isRowMenuOpen = Boolean(rowMenuAnchorEl && rowMenuUser);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listUsers({ userType: "all", status: "all" }, actor);
      setUsers(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Client-side filtering
  const tabType = TAB_USER_TYPES[activeTab];
  const filteredUsers = users.filter((u) => {
    if (tabType && u.userType !== tabType) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName?.toLowerCase().includes(q) ?? false)
    );
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Dialog helpers
  const openStatusDialog = (user: UserDocument) => {
    setActionTarget(user);
    setActiveDialog("status");
  };

  const openAssignRoleDialog = (user: UserDocument) => {
    setActionTarget(user);
    setAdminRoleMode("assign");
    setActiveDialog("adminRole");
  };

  const openRevokeRoleDialog = (user: UserDocument) => {
    setActionTarget(user);
    setAdminRoleMode("revoke");
    setActiveDialog("adminRole");
  };

  const openAuthorActionDialog = (user: UserDocument, action: AuthorAction) => {
    setActionTarget(user);
    setAuthorAction(action);
    setActiveDialog("authorAction");
  };

  const openRowActionMenu = (anchorEl: HTMLElement, user: UserDocument) => {
    setRowMenuAnchorEl(anchorEl);
    setRowMenuUser(user);
  };

  const closeRowActionMenu = () => {
    setRowMenuAnchorEl(null);
    setRowMenuUser(null);
  };

  const withSelectedRowMenuUser = (callback: (user: UserDocument) => void) => {
    if (!rowMenuUser) return;
    const selectedUser = rowMenuUser;
    closeRowActionMenu();
    callback(selectedUser);
  };

  const handleDialogClose = () => {
    setActiveDialog(null);
    setActionTarget(null);
  };

  const handleStatusSuccess = (newStatus: UserDocument["status"]) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === actionTarget?.uid ? { ...u, status: newStatus } : u,
      ),
    );
  };

  const handleRoleSuccess = () => {
    // Reload to reflect role/userType changes accurately
    loadUsers();
  };

  const handleAuthorActionSuccess = (newStatus: AuthorStatus) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === actionTarget?.uid ? { ...u, authorStatus: newStatus } : u,
      ),
    );
  };

  return (
    <Box>
      {/* Search bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by email or name"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v as ActiveTab);
          setPage(0);
        }}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={`All (${users.length})`} />
        <Tab
          label={`Admins (${users.filter((u) => u.userType === "admin").length})`}
        />
        <Tab
          label={`Authors (${users.filter((u) => u.userType === "author").length})`}
        />
        <Tab
          label={`Readers (${users.filter((u) => u.userType === "reader").length})`}
        />
      </Tabs>

      {/* Error */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {/* Loading */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <PersonIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">
            {users.length === 0
              ? "No users found."
              : "No users match your search or filter."}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email / Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  {activeTab === 2 && <TableCell>Author Status</TableCell>}
                  <TableCell>Role</TableCell>
                  <TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow
                    key={user.uid}
                    hover
                    onClick={(event) => openRowActionMenu(event.currentTarget, user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRowActionMenu(event.currentTarget, user);
                      }
                    }}
                    tabIndex={0}
                    sx={{
                      cursor: "pointer",
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineColor: "primary.main",
                        outlineOffset: -2,
                      },
                    }}
                  >
                      {/* Email / Name */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {user.displayName ?? "—"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </TableCell>

                      {/* UserType */}
                      <TableCell>
                        <UserTypeChip userType={user.userType} />
                      </TableCell>

                      {/* Account Status */}
                      <TableCell>
                        <AccountStatusChip status={user.status} />
                      </TableCell>

                      {/* Author Status (Authors tab) */}
                      {activeTab === 2 && (
                        <TableCell>
                          <AuthorStatusChip authorStatus={user.authorStatus} />
                        </TableCell>
                      )}

                      {/* Role (all tabs) */}
                      <TableCell>
                        {user.role && ADMIN_ROLE_CHIP[user.role] ? (
                          <Chip
                            label={ADMIN_ROLE_CHIP[user.role].label}
                            color={ADMIN_ROLE_CHIP[user.role].color}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                          />
                        ) : user.userType === "author" ? (
                          <Chip
                            label="Author"
                            color="info"
                            size="small"
                            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                          />
                        ) : user.userType === "reader" ? (
                          <Chip
                            label="Reader (User)"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Joined */}
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(
                            user.createdAt as Parameters<typeof formatDate>[0],
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </>
      )}

      <Menu
        open={isRowMenuOpen}
        anchorEl={rowMenuAnchorEl}
        onClose={closeRowActionMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem
          onClick={() =>
            withSelectedRowMenuUser((user) => router.push(`/users/${user.uid}`))
          }
        >
          View Details
        </MenuItem>

        {canManageUsers && (
          <MenuItem onClick={() => withSelectedRowMenuUser(openStatusDialog)}>
            Change Status
          </MenuItem>
        )}

        {isSuperAdmin && rowMenuUser?.userType === "admin" && (
          <MenuItem onClick={() => withSelectedRowMenuUser(openAssignRoleDialog)}>
            Change Admin Role
          </MenuItem>
        )}

        {isSuperAdmin && rowMenuUser?.userType === "admin" && (
          <MenuItem onClick={() => withSelectedRowMenuUser(openRevokeRoleDialog)}>
            Revoke Admin Access
          </MenuItem>
        )}

        {canManageUsers &&
          rowMenuUser?.userType === "author" &&
          rowMenuUser.authorStatus !== "approved" && (
            <MenuItem
              onClick={() =>
                withSelectedRowMenuUser((user) =>
                  openAuthorActionDialog(user, "approve"),
                )
              }
            >
              Approve Author
            </MenuItem>
          )}

        {canManageUsers &&
          rowMenuUser?.userType === "author" &&
          rowMenuUser.authorStatus !== "rejected" && (
            <MenuItem
              onClick={() =>
                withSelectedRowMenuUser((user) =>
                  openAuthorActionDialog(user, "reject"),
                )
              }
            >
              Reject Author
            </MenuItem>
          )}

        {canManageUsers &&
          rowMenuUser?.userType === "author" &&
          rowMenuUser.authorStatus !== "suspended" && (
            <MenuItem
              onClick={() =>
                withSelectedRowMenuUser((user) =>
                  openAuthorActionDialog(user, "suspend"),
                )
              }
            >
              Suspend Author
            </MenuItem>
          )}
      </Menu>

      {/* Dialogs */}
      {actionTarget && (
        <StatusChangeDialog
          open={activeDialog === "status"}
          user={actionTarget}
          actor={actor}
          onClose={handleDialogClose}
          onSuccess={handleStatusSuccess}
        />
      )}
      {actionTarget && isSuperAdmin && (
        <AdminRoleDialog
          open={activeDialog === "adminRole"}
          mode={adminRoleMode}
          user={actionTarget}
          actor={actor}
          onClose={handleDialogClose}
          onSuccess={handleRoleSuccess}
        />
      )}
      {actionTarget && actionTarget.userType === "author" && (
        <AuthorActionDialog
          open={activeDialog === "authorAction"}
          action={authorAction}
          user={actionTarget}
          actor={actor}
          onClose={handleDialogClose}
          onSuccess={handleAuthorActionSuccess}
        />
      )}
    </Box>
  );
}
