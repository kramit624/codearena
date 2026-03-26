import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  updateUser,
  logout,
} from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import toast from "react-hot-toast";
import {
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  AlertTriangle,
  Check,
  Mail,
  User,
  Lock,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import Footer from "../components/Footer.jsx";

// ── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z
  .object({
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(20, "Max 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine(
        (v) => !v || v.length >= 8,
        "New password must be at least 8 characters",
      )
      .refine((v) => !v || /[A-Z]/.test(v), "Must contain an uppercase letter")
      .refine((v) => !v || /[0-9]/.test(v), "Must contain a number"),
  })
  .refine(
    (d) => {
      // if newPassword is set, currentPassword must also be set
      if (d.newPassword && !d.currentPassword) return false;
      return true;
    },
    {
      message: "Current password required to set a new password",
      path: ["currentPassword"],
    },
  );

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid #1e1e30" }}>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Editable field row ────────────────────────────────────────────────────────
function FieldRow({
  label,
  icon: Icon,
  value,
  editable = true,
  isEditing,
  onEdit,
  error,
  children,
}) {
  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: "1px solid #0f0f1e" }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#13131f", border: "1px solid #1e1e30" }}
      >
        <Icon size={15} className="text-slate-500" />
      </div>

      {/* Label + content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </p>
        {children}
        {error && (
          <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
            {error}
          </p>
        )}
      </div>

      {/* Pencil / edit button */}
      {editable && !isEditing && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all flex-shrink-0"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
      )}
      {!editable && (
        <div className="p-2 flex-shrink-0" title="Not editable">
          <X size={14} className="text-slate-700" />
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Which fields are in edit mode
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Loading states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete account modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Profile form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username ?? "",
      currentPassword: "",
      newPassword: "",
    },
  });

  // Delete form
  const {
    register: regDel,
    handleSubmit: handleDelSubmit,
    reset: resetDel,
    formState: { errors: delErrors },
  } = useForm({ resolver: zodResolver(deleteSchema) });

  // Watched values — to detect actual changes
  const watchUsername = watch("username");
  const watchCurrent = watch("currentPassword");
  const watchNew = watch("newPassword");

  const hasChanges =
    watchUsername !== (user?.username ?? "") || !!watchCurrent || !!watchNew;

  const isEditing = editingUsername || editingPassword;
  const showActions = isEditing; // always show cancel when editing
  const showSave = isEditing && hasChanges;

  // Reset and exit edit mode
  const handleCancel = () => {
    reset({
      username: user?.username ?? "",
      currentPassword: "",
      newPassword: "",
    });
    setEditingUsername(false);
    setEditingPassword(false);
    setShowCurrent(false);
    setShowNew(false);
  };

  // Save profile changes
  const onSave = async (data) => {
    setSaving(true);
    try {
      const payload = {};
      if (data.username !== user?.username) payload.username = data.username;
      if (data.newPassword && data.currentPassword) {
        payload.currentPassword = data.currentPassword;
        payload.newPassword = data.newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast("Nothing changed");
        setSaving(false);
        return;
      }

  // Call update endpoint
  const res = await axiosInstance.patch("/users/me", payload);
  dispatch(updateUser(res.data.data?.user ?? { username: data.username }));
      toast.success("Profile updated successfully");
      handleCancel();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const onDelete = async (data) => {
    setDeleting(true);
    setDeleteError("");
    try {
      await axiosInstance.delete("/users/me", {
        data: { currentPassword: data.password },
      });
      dispatch(logout());
      navigate("/");
      toast.success("Account deleted. Sorry to see you go.");
    } catch (err) {
      const msg = err.response?.data?.message ?? "Something went wrong";
      if (
        err.response?.status === 401 ||
        msg.toLowerCase().includes("password")
      ) {
        setDeleteError("Sorry, that password is wrong.");
      } else {
        setDeleteError(msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#0a0a0f" }}
      >
        <p className="text-slate-500 text-sm">Please login first.</p>
      </div>
    );
  }

  return (
    <div
      style={{ background: "#0a0a0f", minHeight: "100vh", paddingTop: "64px" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your account preferences
          </p>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-5">
          {/* ── Profile section ── */}
          <Section title="Profile" subtitle="Update your username and password">
            {/* Username */}
            <FieldRow
              label="Username"
              icon={User}
              editable={true}
              isEditing={editingUsername}
              onEdit={() => setEditingUsername(true)}
              error={errors.username?.message}
            >
              {editingUsername ? (
                <input
                  {...register("username")}
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none transition-all"
                  style={{
                    background: "#13131f",
                    border: `1px solid ${errors.username ? "#ef4444" : "#7c3aed"}`,
                  }}
                />
              ) : (
                <p className="text-sm text-slate-200 font-medium">
                  {user?.username}
                </p>
              )}
            </FieldRow>

            {/* Email — not editable */}
            <FieldRow label="Email" icon={Mail} editable={false}>
              <p
                className="text-sm text-slate-500 font-medium select-none"
                style={{ cursor: "not-allowed" }}
                title="Email cannot be changed"
              >
                {user?.email}
              </p>
              <p className="text-[11px] text-slate-700 mt-1">
                Email address cannot be changed
              </p>
            </FieldRow>

            {/* Current password */}
            <FieldRow
              label="Current Password"
              icon={Lock}
              editable={true}
              isEditing={editingPassword}
              onEdit={() => setEditingPassword(true)}
              error={errors.currentPassword?.message}
            >
              {editingPassword ? (
                <div className="relative">
                  <input
                    {...register("currentPassword")}
                    type={showCurrent ? "text" : "password"}
                    autoFocus
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 pr-10 rounded-xl text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                    style={{
                      background: "#13131f",
                      border: `1px solid ${errors.currentPassword ? "#ef4444" : "#7c3aed"}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-600 font-medium tracking-widest">
                  ••••••••
                </p>
              )}
            </FieldRow>

            {/* New password — only shown when editing password */}
            {editingPassword && (
              <FieldRow
                label="New Password"
                icon={Lock}
                editable={false}
                error={errors.newPassword?.message}
              >
                <div className="relative">
                  <input
                    {...register("newPassword")}
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-10 rounded-xl text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                    style={{
                      background: "#13131f",
                      border: `1px solid ${errors.newPassword ? "#ef4444" : "#2d2d45"}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {/* Password hints */}
                {watchNew && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {[
                      { label: "8+ chars", ok: watchNew.length >= 8 },
                      { label: "Uppercase", ok: /[A-Z]/.test(watchNew) },
                      { label: "Number", ok: /[0-9]/.test(watchNew) },
                    ].map((c) => (
                      <span
                        key={c.label}
                        className={cn(
                          "flex items-center gap-1 text-[11px]",
                          c.ok ? "text-emerald-400" : "text-slate-600",
                        )}
                      >
                        <Check size={10} />
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </FieldRow>
            )}
          </Section>

          {/* ── Action buttons — cancel / save ── */}
          {showActions && (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all"
                style={{ background: "#13131f", border: "1px solid #2d2d45" }}
              >
                <X size={14} />
                Cancel
              </button>
              {showSave && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{
                    background: "#7c3aed",
                    boxShadow: "0 0 20px #7c3aed30",
                  }}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          )}
        </form>

        {/* ── Danger zone ── */}
        <div
          className="mt-6 rounded-2xl overflow-hidden"
          style={{ border: "1px solid #ef444425" }}
        >
          <div
            className="px-6 py-4"
            style={{
              background: "#ef444408",
              borderBottom: "1px solid #ef444420",
            }}
          >
            <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Irreversible actions — proceed with caution
            </p>
          </div>
          <div
            className="px-6 py-5 flex items-center justify-between gap-4"
            style={{ background: "#0d0d1a" }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Delete Account</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently delete your account and all submission data. This
                cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteError("");
                resetDel();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 flex-shrink-0 transition-all hover:bg-red-500/10"
              style={{ border: "1px solid #ef444430", background: "#ef444408" }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
            style={{ background: "#0d0d1a", border: "1px solid #ef444440" }}
          >
            {/* Modal header */}
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{
                background: "#ef444408",
                borderBottom: "1px solid #ef444425",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "#ef444415",
                  border: "1px solid #ef444430",
                }}
              >
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Delete Account
                </h3>
                <p className="text-xs text-slate-500">
                  This action is permanent and irreversible
                </p>
              </div>
              <button
                onClick={() => setDeleteOpen(false)}
                className="ml-auto text-slate-600 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form
              onSubmit={handleDelSubmit(onDelete)}
              className="px-6 py-5 space-y-4"
            >
              <p className="text-sm text-slate-400 leading-relaxed">
                All your submissions, progress, and stats will be permanently
                deleted. Please enter your password to confirm.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...regDel("password")}
                    type={showDelete ? "text" : "password"}
                    autoFocus
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                    style={{
                      background: "#13131f",
                      border: `1px solid ${deleteError || delErrors.password ? "#ef4444" : "#2d2d45"}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDelete((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showDelete ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Error messages */}
                {(deleteError || delErrors.password?.message) && (
                  <div
                    className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg"
                    style={{
                      background: "#ef444410",
                      border: "1px solid #ef444425",
                    }}
                  >
                    <X size={13} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-400">
                      {deleteError || delErrors.password?.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all"
                  style={{ background: "#13131f", border: "1px solid #2d2d45" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{
                    background: "#dc2626",
                    boxShadow: "0 0 20px #dc262630",
                  }}
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {deleting ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
