"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "@/contexts/AuthContext";
import UserTypeChip from "@/components/users/UserTypeChip";
import AccountStatusChip from "@/components/users/AccountStatusChip";
import AuthorStatusChip from "@/components/users/AuthorStatusChip";
import StatusChangeDialog from "@/components/users/StatusChangeDialog";
import AdminRoleDialog from "@/components/users/AdminRoleDialog";
import AuthorActionDialog from "@/components/users/AuthorActionDialog";
import { getUser } from "@/lib/users/userService";
import type { Actor, AdminRole, AuthorStatus, UserDocument } from "@/lib/types";

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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type ActiveDialog = "status" | "adminRole" | "authorAction" | null;
type AuthorAction = "approve" | "reject" | "suspend";

export default function UserDetailPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [user, setUser] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [adminRoleMode, setAdminRoleMode] = useState<"assign" | "revoke">(
    "assign",
  );
  const [authorAction, setAuthorAction] = useState<AuthorAction>("approve");

  const actor: Actor | null =
    firebaseUser && role
      ? { uid: firebaseUser.uid, email: firebaseUser.email ?? "", role }
      : null;

  const isSuperAdmin = role === "super_admin";
  const canManageUsers = role === "super_admin" || role === "admin";

  const loadUser = useCallback(async () => {
    if (!actor || !params.uid) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getUser(params.uid, actor);
      if (!data) setLoadError("User not found.");
      else setUser(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.uid]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(params.uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDialogClose = () => setActiveDialog(null);

  const handleStatusSuccess = (newStatus: UserDocument["status"]) => {
    setUser((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  const handleRoleSuccess = () => loadUser();

  const handleAuthorActionSuccess = (newStatus: AuthorStatus) => {
    setUser((prev) => (prev ? { ...prev, authorStatus: newStatus } : prev));
  };

  if (!actor) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !user) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/users")}
          sx={{ mb: 2 }}
        >
          Back to Users
        </Button>
        <Alert severity="error">{loadError ?? "User not found."}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <IconButton
          onClick={() => router.push("/users")}
          aria-label="Back to users"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {user.displayName ?? user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <UserTypeChip userType={user.userType} />
          <AccountStatusChip status={user.status} />
          {user.userType === "author" && (
            <AuthorStatusChip authorStatus={user.authorStatus} />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left column — profile info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Profile
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "grid", gap: 2 }}>
              {/* UID */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  User ID
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" fontFamily="monospace">
                    {params.uid}
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy UID"}>
                    <IconButton size="small" onClick={handleCopyUid}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Email */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body2">{user.email}</Typography>
              </Box>

              {/* Display Name */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Display Name
                </Typography>
                <Typography variant="body2">
                  {user.displayName ?? "—"}
                </Typography>
              </Box>

              {user.userType === "admin" &&
                user.role &&
                ADMIN_ROLE_CHIP[user.role] && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Admin Role
                    </Typography>
                    <Box>
                      <Chip
                        label={ADMIN_ROLE_CHIP[user.role].label}
                        color={ADMIN_ROLE_CHIP[user.role].color}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                      />
                    </Box>
                  </Box>
                )}

              {/* Author bio */}
              {user.userType === "author" && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bio
                  </Typography>
                  <Typography variant="body2">{user.bio ?? "—"}</Typography>
                </Box>
              )}

              {/* Dates */}
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(
                      user.createdAt as Parameters<typeof formatDate>[0],
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(
                      user.updatedAt as Parameters<typeof formatDate>[0],
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Engagement summary */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Engagement
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
              }}
            >
              {user.userType === "author" && (
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color="text.disabled"
                  >
                    —
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Books
                  </Typography>
                </Box>
              )}
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="text.disabled">
                  —
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reviews
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="text.disabled">
                  —
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.userType === "reader" ? "In Progress" : "Favorites"}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right column — admin actions */}
        {canManageUsers && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={2} sx={{ p: 3, position: "sticky", top: 80 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Admin Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {/* Change Status */}
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setActiveDialog("status")}
                >
                  Change Account Status
                </Button>

                {/* Admin role actions (super_admin only) */}
                {isSuperAdmin && user.userType === "admin" && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={() => {
                        setAdminRoleMode("assign");
                        setActiveDialog("adminRole");
                      }}
                    >
                      Change Admin Role
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={() => {
                        setAdminRoleMode("revoke");
                        setActiveDialog("adminRole");
                      }}
                    >
                      Revoke Admin Access
                    </Button>
                  </>
                )}

                {/* Author actions */}
                {user.userType === "author" && (
                  <>
                    {user.authorStatus !== "approved" && (
                      <Button
                        variant="outlined"
                        color="success"
                        fullWidth
                        onClick={() => {
                          setAuthorAction("approve");
                          setActiveDialog("authorAction");
                        }}
                      >
                        Approve Author
                      </Button>
                    )}
                    {user.authorStatus !== "rejected" && (
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => {
                          setAuthorAction("reject");
                          setActiveDialog("authorAction");
                        }}
                      >
                        Reject Author
                      </Button>
                    )}
                    {user.authorStatus !== "suspended" && (
                      <Button
                        variant="outlined"
                        color="warning"
                        fullWidth
                        onClick={() => {
                          setAuthorAction("suspend");
                          setActiveDialog("authorAction");
                        }}
                      >
                        Suspend Author
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialogs */}
      <StatusChangeDialog
        open={activeDialog === "status"}
        user={user}
        actor={actor}
        onClose={handleDialogClose}
        onSuccess={handleStatusSuccess}
      />
      {isSuperAdmin && (
        <AdminRoleDialog
          open={activeDialog === "adminRole"}
          mode={adminRoleMode}
          user={user}
          actor={actor}
          onClose={handleDialogClose}
          onSuccess={handleRoleSuccess}
        />
      )}
      {user.userType === "author" && (
        <AuthorActionDialog
          open={activeDialog === "authorAction"}
          action={authorAction}
          user={user}
          actor={actor}
          onClose={handleDialogClose}
          onSuccess={handleAuthorActionSuccess}
        />
      )}
    </Box>
  );
}
