import { useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import api from "../services/api";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  Database,
  Activity,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Cloud,
  ShieldCheck,
  HardDrive,
  Files,
  UserCheck,
  TrendingUp,
  LogOut,
  Plus,
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  Mail,
  Clock3,
  FileText,
  CircleHelp,
  CheckCircle2,
  BriefcaseBusiness,
  RefreshCw,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Pencil,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Organization", icon: Building2 },
  { label: "Departments", icon: FolderOpen },
  { label: "Files", icon: Files },
  { label: "Storage", icon: Database },
  { label: "Activity Logs", icon: Activity },
  { label: "Settings", icon: Settings },
];

const pageConfig = {
  Overview: {
    eyebrow: "ADMINISTRATOR WORKSPACE",
    title: (name) => `Welcome back, ${name}!`,
    description:
      "Manage your organization, monitor storage, and keep your files secure from one place.",
    icon: ShieldCheck,
  },
  Users: {
    eyebrow: "PEOPLE & PERMISSIONS",
    title: () => "Manage your users",
    description:
      "Review organization members, account status, and access permissions.",
    icon: Users,
  },
  Organization: {
    eyebrow: "WORKSPACE PROFILE",
    title: () => "Your organization",
    description:
      "Review your organization profile and keep workspace information organized.",
    icon: Building2,
  },
  Departments: {
    eyebrow: "TEAM STRUCTURE",
    title: () => "Organize your teams",
    description:
      "Group members into departments to keep responsibilities and collaboration organized.",
    icon: FolderOpen,
  },
  Files: {
    eyebrow: "FILE MANAGEMENT",
    title: () => "Your organization's files",
    description:
      "Explore stored files, review file ownership, and manage organization content.",
    icon: Files,
  },
  Storage: {
    eyebrow: "CAPACITY & USAGE",
    title: () => "Storage overview",
    description:
      "Monitor storage consumption and understand how files use available space.",
    icon: HardDrive,
  },
  "Activity Logs": {
    eyebrow: "AUDIT & MONITORING",
    title: () => "Workspace activity",
    description:
      "Review account and workspace events to help keep your organization secure.",
    icon: Activity,
  },
  Settings: {
    eyebrow: "WORKSPACE CONTROLS",
    title: () => "Workspace settings",
    description:
      "Review account information and security preferences for your administrator workspace.",
    icon: Settings,
  },
};

const statCards = [
  {
    label: "Total Users",
    key: "total_users",
    description: "Registered organization members",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Total Files",
    key: "total_files",
    description: "Files stored in SecureCloud",
    icon: Files,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Storage Used",
    key: "storage_used_bytes",
    description: "Current storage consumption",
    icon: HardDrive,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Active Users",
    key: "active_users",
    description: "Currently active accounts",
    icon: UserCheck,
    color: "bg-emerald-50 text-emerald-600",
  },
];

function formatStorage(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("securecloud_user") ||
        localStorage.getItem("user") ||
        "{}",
    );
  } catch {
    return {};
  }
}

function SectionHeading({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon size={25} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
        <CircleHelp size={14} />
        Waiting for backend data
      </span>
    </div>
  );
}

function OverviewPage({ userName, userEmail, hasToken, onNavigate, onLogout }) {
  const [workspaceStats, setWorkspaceStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsLoading(true);
      setStatsError("");

      try {
        const response = await api.get("/api/v1/workspace/stats");
        const result = response.data;

        if (!result?.success || !result?.data) {
          throw new Error("Invalid statistics response.");
        }

        if (!cancelled) {
          setWorkspaceStats(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setStatsError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load workspace statistics.",
          );
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);
  const quickActions = [
    {
      title: "Manage users",
      description: "Review members and account roles",
      icon: Users,
      page: "Users",
    },
    {
      title: "Organization details",
      description: "Review your workspace information",
      icon: Building2,
      page: "Organization",
    },
    {
      title: "Manage departments",
      description: "Organize users into departments",
      icon: FolderOpen,
      page: "Departments",
    },
    {
      title: "Storage overview",
      description: "Monitor file storage usage",
      icon: HardDrive,
      page: "Storage",
    },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
            <ShieldCheck size={15} />
            ADMINISTRATOR WORKSPACE
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {userName.split(" ")[0]}!
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
            Manage your organization, monitor storage, and keep your files
            secure from one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("Users")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <Users size={17} />
              Manage users
              <ArrowRight size={15} />
            </button>

            <button
              onClick={() => onNavigate("Files")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <FolderOpen size={17} />
              Explore files
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-36 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

        <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-3xl border border-white/20 bg-white/10 p-7 lg:block">
          <Cloud size={70} strokeWidth={1.25} />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          title="Workspace overview"
          description="Key metrics for your organization"
          action={
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
              Awaiting live data connection
            </span>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, key, description, icon: Icon, color }) => {
            const rawValue = workspaceStats?.[key];

            const value = statsLoading
              ? "..."
              : statsError
                ? "—"
                : key === "storage_used_bytes"
                  ? formatStorage(rawValue)
                  : Number(rawValue ?? 0).toLocaleString();

            return (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
                  >
                    <Icon size={21} />
                  </div>

                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    Overview
                  </span>
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  {label}
                </p>

                <p className="mt-1 text-3xl font-extrabold tracking-tight">
                  {value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {statsError ? statsError : description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Common organization management tasks
              </p>
            </div>
            <TrendingUp size={21} className="text-blue-600" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quickActions.map(({ title, description, icon: Icon, page }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className="group flex items-start gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>

                <ArrowUpRight
                  size={17}
                  className="mt-1 text-slate-400 group-hover:text-blue-600"
                />
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-bold">Account security</h2>
              <p className="text-xs text-slate-500">Your session information</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <span className="text-sm text-slate-500">Account role</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                ADMIN
              </span>
            </div>

            <div className="border-b border-slate-100 pb-4">
              <p className="text-sm text-slate-500">Email address</p>
              <p className="mt-1 break-all text-sm font-medium">{userEmail}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Session token</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  hasToken
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {hasToken ? "Stored" : "Not found"}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </article>
      </section>
    </>
  );
}

function UsersPage({ search }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    departmentId: "",
  });

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const [usersResponse, departmentsResponse] = await Promise.all([
        api.get("/api/v1/workspace/users"),
        api.get("/api/v1/workspace/departments"),
      ]);

      const usersData = usersResponse.data?.data;
      const departmentsData = departmentsResponse.data?.data;

      setUsers(
        Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData)
            ? usersData
            : [],
      );

      setDepartments(
        Array.isArray(departmentsData?.departments)
          ? departmentsData.departments
          : Array.isArray(departmentsData)
            ? departmentsData
            : [],
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Users load nahi hue. Backend aur permissions check karo.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "user",
      departmentId: "",
    });

    setShowAddForm(false);
    setEditingUser(null);
    setShowTemporaryPassword(false);
  }

  async function handleAddUser(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/v1/workspace/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        departmentId: form.departmentId || null,
      });

      setSuccess("User created successfully.");
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update user. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(event) {
    event.preventDefault();

    if (!editingUser) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/api/v1/workspace/users/${editingUser.id}`, {
        role: form.role,
        departmentId: form.departmentId || null,
        isActive: form.isActive,
      });

      setSuccess("User permissions updated successfully.");
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create user. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(user) {
    setEditingUser(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      departmentId: user.department_id ? String(user.department_id) : "",
      isActive: Boolean(user.is_active),
    });

    setShowAddForm(false);
    setError("");
    setSuccess("");
  }

  const filteredUsers = users.filter((user) => {
    const query = search?.trim().toLowerCase();

    if (!query) return true;

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Users & access"
        description="Organization members, roles, departments and account status manage karo."
        action={
          <button
            onClick={() => {
              setShowAddForm(true);
              setShowTemporaryPassword(false);
              setEditingUser(null);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Add user
          </button>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={Users}
          title="Total members"
          description={`${users.length} registered organization accounts`}
        />

        <FeatureCard
          icon={LockKeyhole}
          title="Active accounts"
          description={`${users.filter((u) => u.is_active).length} active accounts`}
        />

        <FeatureCard
          icon={UserCheck}
          title="Managers"
          description={`${users.filter((u) => u.role === "manager").length} managers`}
        />
      </div>

      {(showAddForm || editingUser) && (
        <form
          onSubmit={editingUser ? handleUpdateUser : handleAddUser}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingUser ? "Edit user permissions" : "Create new user"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingUser
                ? "Update the user's role, department and account status."
                : "Add a new member to your organization."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {!editingUser && (
              <>
                <label className="text-sm font-medium text-slate-700">
                  Full name
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    placeholder="Enter full name"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Email address
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    placeholder="user@example.com"
                  />
                </label>

                <div className="text-sm font-medium text-slate-700">
                  <label htmlFor="temporaryPassword">Temporary password</label>

                  <div className="relative mt-2">
                    <input
                      id="temporaryPassword"
                      required
                      type={showTemporaryPassword ? "text" : "password"}
                      minLength={8}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      placeholder="At least 8 characters"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowTemporaryPassword((current) => !current)
                      }
                      aria-label={
                        showTemporaryPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-blue-600"
                    >
                      {showTemporaryPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <label className="text-sm font-medium text-slate-700">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                {editingUser?.role === "admin" && (
                  <option value="admin">Admin</option>
                )}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Department
              <select
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">No department</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            {editingUser && (
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded"
                />
                Account active
              </label>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              disabled={saving}
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingUser
                  ? "Save changes"
                  : "Create user"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h3 className="font-bold">Member directory</h3>
            <p className="mt-1 text-sm text-slate-500">
              Real organization accounts from the database
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading users...
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {search
              ? "No users match your search."
              : "No users found in this organization."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Member</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const department = departments.find(
                    (item) => String(item.id) === String(user.department_id),
                  );

                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {user.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {department?.name ||
                          (user.department_id
                            ? `Department #${user.department_id}`
                            : "Unassigned")}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => startEditing(user)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-blue-300 hover:text-blue-700"
                        >
                          Edit access
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function OrganizationPage() {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const [invitationCode, setInvitationCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeAction, setCodeAction] = useState("");
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const codeExpiry = organization?.join_code_expires_at
    ? new Date(organization.join_code_expires_at)
    : null;

  const hasActiveCode = codeExpiry && codeExpiry.getTime() > Date.now();

  async function loadOrganization() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/v1/workspace/organization");

      const data = response.data?.data;

      setOrganization(data);
      setName(data?.name || "");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load organization details.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganization();
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch("/api/v1/workspace/organization", {
        name: name.trim(),
      });

      const updatedOrganization = response.data?.data;

      setOrganization(updatedOrganization);
      setName(updatedOrganization.name);
      setEditing(false);

      setSuccess("Organization updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update organization.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateCode() {
    setCodeLoading(true);
    setError("");
    setSuccess("");
    setCopied(false);

    try {
      const response = await api.post("/api/v1/workspace/invitation-code");

      const data = response.data?.data;

      if (!data?.invitationCode) {
        throw new Error("Invitation code was not returned.");
      }

      setInvitationCode(data.invitationCode);

      setOrganization((previous) => ({
        ...previous,
        join_code_expires_at: data.expiresAt,
      }));

      setSuccess("Invitation code generated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate invitation code.",
      );
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleRevokeCode() {
    const confirmed = window.confirm(
      "Are you sure you want to revoke the current invitation code? Anyone using it will no longer be able to join.",
    );

    if (!confirmed) return;

    setCodeLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.delete("/api/v1/workspace/invitation-code");

      setInvitationCode("");

      setOrganization((previous) => ({
        ...previous,
        join_code_expires_at: null,
      }));

      setSuccess("Invitation code revoked successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to revoke invitation code.",
      );
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopied(true);
      setSuccess("Invitation code copied to clipboard.");

      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Unable to copy automatically. Please select and copy the code.",
      );
    }
  }

  return (
    <>
      <SectionHeading
        title="Organization details"
        description="Manage your organization profile and workspace information."
        action={
          <button
            onClick={() => {
              setEditing(!editing);
              setName(organization?.name || "");
              setError("");
              setSuccess("");
            }}
            disabled={loading || !organization}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {editing ? "Cancel editing" : "Edit organization"}
          </button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          {loading ? (
            <p className="text-slate-500">Loading organization details...</p>
          ) : organization ? (
            <>
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Building2 size={26} />
                </div>

                <div>
                  <h3 className="text-lg font-bold">{organization.name}</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    SecureCloud organization
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Organization name</p>

                  {editing ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                      placeholder="Enter organization name"
                    />
                  ) : (
                    <p className="mt-1 font-semibold">{organization.name}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-500">Organization slug</p>

                  <p className="mt-1 font-semibold">
                    {organization.slug || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Organization status</p>

                  <p
                    className={`mt-1 font-semibold ${
                      organization.is_active
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {organization.is_active ? "Active" : "Inactive"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Last updated</p>

                  <p className="mt-1 font-semibold">
                    {organization.updated_at
                      ? new Date(organization.updated_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {editing && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>

                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(organization.name);
                      setError("");
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">
              Organization information is unavailable.
            </p>
          )}
        </article>

        {/* Invitation Code Management */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users size={23} />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Organization invitations
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generate a secure invitation code and share it with people who need
            to join your organization.
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invitation status
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  hasActiveCode
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {hasActiveCode ? "Active" : "No active code"}
              </span>
            </div>

            {hasActiveCode && (
              <div className="mt-4">
                <p className="text-xs text-slate-500">Expires on</p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {codeExpiry.toLocaleString()}
                </p>
              </div>
            )}

            {invitationCode && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500">
                  Newly generated invitation code
                </p>

                <div className="mt-2 break-all rounded-lg border border-indigo-200 bg-white p-3 font-mono text-sm font-bold tracking-wider text-indigo-700">
                  {invitationCode}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="mt-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  {copied ? "Copied!" : "Copy invitation code"}
                </button>

                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Save this code now. It will not be displayed again after
                  leaving or refreshing this page.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleGenerateCode}
              disabled={codeLoading || !organization?.is_active}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {codeLoading
                ? "Please wait..."
                : hasActiveCode
                  ? "Regenerate invitation code"
                  : "Generate invitation code"}
            </button>

            {hasActiveCode && (
              <button
                onClick={handleRevokeCode}
                disabled={codeLoading}
                className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Revoke invitation code
              </button>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Codes expire after 7 days. Regenerating a code immediately
            invalidates the previous code.
          </p>
        </article>

        {/* Organization Security */}
        <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6 xl:col-span-3">
          <ShieldCheck size={25} className="text-blue-600" />

          <h3 className="mt-4 font-bold">Organization security</h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Organization membership and server-side role checks protect access
            to workspace data.
          </p>

          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <LockKeyhole size={16} />
            Role-based access control
          </div>
        </article>
      </div>
    </>
  );
}

function DepartmentsPage({ search }) {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // Load departments and organization users
  async function loadDepartments() {
    setLoading(true);
    setError("");

    try {
      const [departmentResponse, userResponse] = await Promise.all([
        api.get("/api/v1/workspace/departments"),
        api.get("/api/v1/workspace/users"),
      ]);

      const departmentData =
        departmentResponse.data?.data?.departments ??
        departmentResponse.data?.departments ??
        departmentResponse.data?.data ??
        [];

      const userData =
        userResponse.data?.data?.users ??
        userResponse.data?.users ??
        userResponse.data?.data ??
        [];

      setDepartments(Array.isArray(departmentData) ? departmentData : []);

      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load department information. Please try again.",
      );

      setDepartments([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  // Reset department form
  function resetForm() {
    setForm({
      name: "",
      description: "",
    });

    setEditingDepartment(null);
    setShowForm(false);
  }

  // Open edit form
  function startEditing(department) {
    setEditingDepartment(department);

    setForm({
      name: department.name || "",
      description: department.description || "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  }

  // Create or update department
  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingDepartment) {
        await api.patch(
          `/api/v1/workspace/departments/${editingDepartment.id}`,
          payload,
        );

        setSuccess("Department updated successfully.");
      } else {
        await api.post("/api/v1/workspace/departments", payload);

        setSuccess("Department created successfully.");
      }

      resetForm();
      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save department. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete department
  async function handleDelete(department) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/api/v1/workspace/departments/${department.id}`);

      setSuccess("Department deleted successfully.");

      if (expandedDepartmentId === department.id) {
        setExpandedDepartmentId(null);
      }

      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete department. It may still have assigned users.",
      );
    }
  }

  // Filter departments
  const filteredDepartments = departments.filter((department) =>
    department.name?.toLowerCase().includes(search?.trim().toLowerCase() || ""),
  );

  // Calculate actual assigned members
  const totalAssignments = departments.reduce((total, department) => {
    return (
      total +
      users.filter(
        (user) => String(user.department_id) === String(department.id),
      ).length
    );
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <SectionHeading
        title="Departments"
        description="Organize members into teams and keep responsibilities clear."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadDepartments}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setError("");
                setSuccess("");
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              New department
            </button>
          </div>
        }
      />

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={BriefcaseBusiness}
          title="Total departments"
          description={`${departments.length} organizational teams`}
        />

        <FeatureCard
          icon={Users}
          title="Assigned members"
          description={`${totalAssignments} department assignments`}
        />

        <FeatureCard
          icon={ShieldCheck}
          title="Organization access"
          description="Organization-level department management."
        />
      </div>

      {/* Create / Edit department form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingDepartment ? "Edit department" : "Create new department"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add department information for your organization.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Department name
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Engineering"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Description
              <input
                maxLength={500}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the department"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingDepartment
                  ? "Save changes"
                  : "Create department"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Department directory */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-bold text-slate-900">Department directory</h3>

            <p className="mt-1 text-sm text-slate-500">
              Departments and their assigned members.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
            {filteredDepartments.length} departments
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading departments and members...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={
              search ? "No matching departments" : "No departments created yet"
            }
            description={
              search
                ? "Try searching with another department name."
                : "Create your first department to organize your organization members."
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDepartments.map((department) => {
              const departmentMembers = users.filter(
                (user) => String(user.department_id) === String(department.id),
              );

              const isExpanded = expandedDepartmentId === department.id;

              return (
                <div key={department.id}>
                  {/* Department row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-slate-50">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <BriefcaseBusiness size={22} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900">
                          {department.name}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          {department.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        <Users size={14} />
                        {departmentMembers.length} members
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDepartmentId(
                            isExpanded ? null : department.id,
                          )
                        }
                        className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        {isExpanded ? "Hide members" : "View members"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(department)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(department)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded members section */}
                  {isExpanded && (
                    <div className="bg-slate-50 px-5 py-5">
                      <h5 className="mb-4 text-sm font-bold text-slate-800">
                        Members of {department.name}
                      </h5>

                      {departmentMembers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                          <Users
                            className="mx-auto mb-2 text-slate-400"
                            size={25}
                          />

                          <p className="text-sm font-medium text-slate-700">
                            No members assigned
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Assign users to this department from the Users page.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="grid grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                            <span>Member</span>
                            <span>Role</span>
                            <span>Status</span>
                          </div>

                          {departmentMembers.map((member) => (
                            <div
                              key={member.id}
                              className="grid grid-cols-3 items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {member.name}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {member.email}
                                </p>
                              </div>

                              <div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                                  {member.role}
                                </span>
                              </div>

                              <div>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    member.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {member.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilesPage({ search = "" }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shares, setShares] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareUserId, setShareUserId] = useState("");
  const [sharePermission, setSharePermission] = useState("read");
  const [shareModalMode, setShareModalMode] = useState("share");
  const [openMenuId, setOpenMenuId] = useState(null);
  const fileInputRef = useRef(null);

  // Load files from backend
  async function loadFiles() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/v1/files");
      const result = response.data;

      const data =
        result?.data?.files ??
        result?.data?.items ??
        result?.data ??
        result?.files ??
        result?.items ??
        [];

      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to load files. Please check your login session.",
      );

      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  // Upload file
  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post("/api/v1/files/content", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("File uploaded successfully.");

      await loadFiles();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "File upload failed. Please try again.",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Get file name
  function getFileName(file) {
    return (
      file.originalName ||
      file.original_name ||
      file.originalname ||
      file.originalFilename ||
      file.filename ||
      file.name ||
      "Unnamed file"
    );
  }

  // Get uploader name
  function getUploader(file) {
    return (
      file.uploadedByName ||
      file.uploaded_by_name ||
      file.uploaderName ||
      file.uploader_name ||
      file.ownerName ||
      file.owner_name ||
      file.uploadedBy?.name ||
      file.owner?.name ||
      "—"
    );
  }

  // Get modifier name
  function getModifier(file) {
    return (
      file.modifiedByName ||
      file.modified_by_name ||
      file.modifierName ||
      file.modifier_name ||
      file.modifiedBy?.name ||
      "—"
    );
  }

  // Format file size
  function formatSize(bytes) {
    const size = Number(bytes || 0);

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Format timestamps
  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getFileId = (file) => file.id || file._id;

  // Preview file
  async function handleFilePreview(file) {
    try {
      const response = await api.get(
        `/api/v1/files/${getFileId(file)}/preview`,
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] || file.mimeType || file.mime_type,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError("Unable to preview this file.");
    }
  }

  // Download file
  async function handleFileDownload(file) {
    try {
      const response = await api.get(
        `/api/v1/files/${getFileId(file)}/content`,
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = getFileName(file);
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Unable to download this file.");
    }
  }

  // Delete file
  async function handleFileDelete(file) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${getFileName(file)}"?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/v1/files/${getFileId(file)}`);

      setSuccess("File deleted successfully.");
      setOpenMenuId(null);

      await loadFiles();
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Unable to delete this file.",
      );
    }
  }
  // Open the sharing dialog
  async function openShareDialog(file) {
    setSelectedFile(file);
    setShareModalMode("share");
    setShareUserId("");
    setSharePermission("read");
    setShares([]);
    setShareLoading(true);
    setError("");
    setSuccess("");

    try {
      const [usersResponse, sharesResponse] = await Promise.all([
        api.get("/api/v1/workspace/users"),
        api.get(`/api/v1/workspace/files/${getFileId(file)}/shares`),
      ]);

      const usersData =
        usersResponse.data?.data?.users ??
        usersResponse.data?.users ??
        usersResponse.data?.data ??
        [];

      const sharesData =
        sharesResponse.data?.data?.shares ??
        sharesResponse.data?.shares ??
        sharesResponse.data?.data ??
        [];

      setUsers(Array.isArray(usersData) ? usersData : []);
      setShares(Array.isArray(sharesData) ? sharesData : []);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to load sharing information.",
      );
      setSelectedFile(null);
    } finally {
      setShareLoading(false);
    }
  }

  // Share file with an organization member
  async function handleShare(event) {
    event.preventDefault();

    if (!selectedFile || !shareUserId) {
      setError("Please select a user.");
      return;
    }

    setSavingShare(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/api/v1/workspace/files/${getFileId(selectedFile)}/shares`,
        {
          userId: shareUserId,
          permission: sharePermission,
        },
      );

      setSuccess("File shared successfully.");

      const response = await api.get(
        `/api/v1/workspace/files/${getFileId(selectedFile)}/shares`,
      );

      const data =
        response.data?.data?.shares ??
        response.data?.shares ??
        response.data?.data ??
        [];

      setShares(Array.isArray(data) ? data : []);
      setShareUserId("");
      setSharePermission("read");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to share this file.",
      );
    } finally {
      setSavingShare(false);
    }
  }

  // Revoke a user's access to the file
  async function handleRevokeShare(shareId) {
    if (!selectedFile || !shareId) return;

    const confirmed = window.confirm(
      "Are you sure you want to revoke this user's access?",
    );

    if (!confirmed) return;

    setShareLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/api/v1/workspace/files/${getFileId(selectedFile)}/shares/${shareId}`,
      );

      setShares((previousShares) =>
        previousShares.filter(
          (share) => share.id !== shareId && share._id !== shareId,
        ),
      );

      setSuccess("Access revoked successfully.");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to revoke access.",
      );
    } finally {
      setShareLoading(false);
    }
  }

  // Search files
  const filteredFiles = files.filter((file) =>
    getFileName(file).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <>
      {/* Page heading */}
      <SectionHeading
        title="Organization files"
        description="Review stored files, ownership, and file activity."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadFiles}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={17} />
              {uploading ? "Uploading..." : "Upload file"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        }
      />

      {/* Error notification */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Success notification */}
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={Files}
          title="File library"
          description={`${files.length} file(s) in your organization.`}
        />

        <FeatureCard
          icon={LockKeyhole}
          title="Secure sharing"
          description="File access is controlled by backend permissions."
        />

        <FeatureCard
          icon={Clock3}
          title="File activity"
          description="Review file ownership and modification information."
        />
      </div>

      {/* File library */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-bold text-slate-900">
              Organization file library
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              File ownership, upload information and modification details.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
            {filteredFiles.length} files
          </span>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading organization files...
          </div>
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? "No matching files" : "No files found"}
            description={
              search
                ? "Try a different search term."
                : "Upload a file to get started."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">File name</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Uploaded by</th>
                  <th className="px-5 py-4">Uploaded at</th>
                  <th className="px-5 py-4">Modified by</th>
                  <th className="px-5 py-4">Last modified</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file, index) => {
                  const uploadedAt =
                    file.createdAt ||
                    file.created_at ||
                    file.uploadedAt ||
                    file.uploaded_at;

                  const modifiedAt =
                    file.modifiedAt ||
                    file.modified_at ||
                    file.updatedAt ||
                    file.updated_at;

                  return (
                    <tr
                      key={file.id || file._id || index}
                      className="transition hover:bg-slate-50"
                    >
                      {/* File name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                            <FileText size={18} />
                          </span>

                          <span className="font-semibold text-slate-800">
                            {getFileName(file)}
                          </span>
                        </div>
                      </td>

                      {/* File type */}
                      <td className="px-5 py-4 text-slate-500">
                        {file.mimeType ||
                          file.mime_type ||
                          file.mimetype ||
                          "—"}
                      </td>

                      {/* File size */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatSize(
                          file.sizeBytes ?? file.size_bytes ?? file.size ?? 0,
                        )}
                      </td>

                      {/* Uploaded by */}
                      <td className="px-5 py-4 text-slate-700">
                        {getUploader(file)}
                      </td>

                      {/* Upload timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatDate(uploadedAt)}
                      </td>

                      {/* Modified by */}
                      <td className="px-5 py-4 text-slate-700">
                        {getModifier(file)}
                      </td>

                      {/* Modification timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatDate(modifiedAt)}
                      </td>

                      {/* File actions */}
                      {/* File actions menu */}
                      <td className="px-5 py-4">
                        <div className="relative flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === getFileId(file)
                                  ? null
                                  : getFileId(file),
                              )
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            title="File options"
                          >
                            <MoreVertical size={20} />
                          </button>

                          {openMenuId === getFileId(file) && (
                            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleFilePreview(file);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Eye size={16} />
                                Preview
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleFileDownload(file);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Download size={16} />
                                Download
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  openShareDialog(file);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Share2 size={16} />
                                Share
                              </button>



                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                onClick={() => handleFileDelete(file)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Share file dialog */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Share file</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {getFileName(selectedFile)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {shareLoading ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Loading sharing information...
                </p>
              ) : (
                <>
                  <form onSubmit={handleShare} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Select organization member
                      </label>

                      <select
                        value={shareUserId}
                        onChange={(event) => setShareUserId(event.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">Choose a member</option>

                        {users
                          .filter((user) => {
                            const userId = String(user.id || user._id);

                            const ownerId = String(
                              selectedFile?.owner_id ||
                                selectedFile?.ownerId ||
                                selectedFile?.owner?.id ||
                                "",
                            );

                            const alreadyHasAccess = shares.some((share) => {
                              const sharedUserId = String(
                                share.shared_with_user_id ||
                                  share.sharedWithUserId ||
                                  share.user_id ||
                                  share.userId ||
                                  share.id ||
                                  "",
                              );

                              return sharedUserId === userId;
                            });

                            return (
                              user.is_active !== false &&
                              userId !== ownerId &&
                              !alreadyHasAccess
                            );
                          })
                          .map((user) => (
                            <option
                              key={user.id || user._id}
                              value={user.id || user._id}
                            >
                              {user.name} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Permission
                      </label>

                      <select
                        value={sharePermission}
                        onChange={(event) =>
                          setSharePermission(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="read">Read only</option>
                        <option value="write">Read and write</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={savingShare || !shareUserId}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingShare ? "Sharing..." : "Share file"}
                    </button>
                  </form>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="mb-3 text-sm font-bold text-slate-800">
                      People with access ({shares.length})
                    </h4>

                    {shares.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                        This file has not been shared yet.
                      </p>
                    ) : (
                      <div className="max-h-56 space-y-3 overflow-y-auto">
                        {shares.map((share) => {
                          const shareId = share.id || share._id;

                          return (
                            <div
                              key={shareId}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {share.name ||
                                    share.user_name ||
                                    share.shared_with_name ||
                                    share.email ||
                                    share.user_email ||
                                    "Organization member"}
                                </p>

                                <p className="mt-1 text-xs capitalize text-slate-500">
                                  {share.permission || "read"} access
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRevokeShare(shareId)}
                                className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Revoke
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StoragePage() {
  const [storage, setStorage] = useState(null);
  const [planData, setPlanData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [customQuotaGb, setCustomQuotaGb] = useState("5");

  const plans = [
    { name: "Basic", quota: "1 GB", description: "For small organizations" },
    { name: "Business", quota: "10 GB", description: "For growing teams" },
    { name: "Enterprise", quota: "100 GB", description: "For large organizations" },
  ];

  async function loadStorage() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/v1/files/storage/summary");
      setStorage(response.data?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Unable to load storage analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPlan() {
    try {
      const response = await api.get("/api/v1/workspace/storage-plan");
      setPlanData(response.data?.data || null);
    } catch (err) {
      setPlanError(
        err.response?.data?.message ||
        "Unable to load storage plan."
      );
    }
  }

  async function refreshAll() {
    await Promise.all([loadStorage(), loadPlan()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function changePlan(plan, customBytes = null) {
    const quotaText = customBytes
      ? `${formatBytes(customBytes)}`
      : plans.find((item) => item.name === plan)?.quota;

    if (
      !window.confirm(
        `Change your organization's storage plan to ${plan} (${quotaText})?`
      )
    ) {
      return;
    }

    setSavingPlan(true);
    setPlanError("");

    try {
      const payload =
        plan === "Custom"
          ? { plan, customQuotaBytes: customBytes }
          : { plan };

      await api.patch("/api/v1/workspace/storage-plan", payload);

      await refreshAll();
      alert("Storage plan updated successfully.");
    } catch (err) {
      setPlanError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        "Unable to update storage plan."
      );
    } finally {
      setSavingPlan(false);
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (!value) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(value) / Math.log(1024)),
      units.length - 1
    );

    return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
  }

  function formatQuotaInput(value) {
    const gb = Number(value);

    if (!Number.isFinite(gb) || gb <= 0) return null;

    const bytes = BigInt(Math.floor(gb * 1024 * 1024 * 1024));

    return bytes.toString();
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading storage analytics...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={refreshAll}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!storage) return null;

  const percentage = Math.min(
    100,
    Math.max(0, Number(storage.usagePercentage || 0))
  );

  const cards = [
    { label: "Total Allocated", value: formatBytes(storage.allocatedBytes) },
    { label: "Used Storage", value: formatBytes(storage.usedBytes) },
    { label: "Available Storage", value: formatBytes(storage.availableBytes) },
    { label: "Total Files", value: storage.totalFiles ?? 0 },
  ];

  return (
    <>
      <SectionHeading
        title="Storage overview"
        description="Monitor and manage storage across your organization."
        action={
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {/* STORAGE PLAN */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Organization storage plan
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage your organization's storage allocation.
            </p>
          </div>

          {planData && (
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              Current: {planData.plan}
            </span>
          )}
        </div>

        {planError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {planError}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const active = planData?.plan === plan.name;

            return (
              <div
                key={plan.name}
                className={`rounded-xl border p-5 ${
                  active
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <h4 className="text-lg font-bold text-slate-900">
                  {plan.name}
                </h4>

                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {plan.quota}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {plan.description}
                </p>

                <button
                  disabled={active || savingPlan}
                  onClick={() => changePlan(plan.name)}
                  className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                    active
                      ? "cursor-not-allowed bg-blue-100 text-blue-700"
                      : "bg-slate-900 text-white hover:bg-slate-700"
                  } disabled:opacity-60`}
                >
                  {active
                    ? "Current Plan"
                    : savingPlan
                      ? "Updating..."
                      : "Select Plan"}
                </button>
              </div>
            );
          })}
        </div>

        {/* CUSTOM PLAN */}
        <div className="mt-5 rounded-xl border border-slate-200 p-5">
          <h4 className="font-bold text-slate-900">Custom storage allocation</h4>
          <p className="mt-1 text-sm text-slate-500">
            Set a custom storage quota for your organization.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Storage quota (GB)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={customQuotaGb}
                onChange={(e) => setCustomQuotaGb(e.target.value)}
                className="w-40 rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <button
              disabled={savingPlan}
              onClick={() => {
                const bytes = formatQuotaInput(customQuotaGb);

                if (!bytes) {
                  setPlanError("Enter a valid positive storage quota.");
                  return;
                }

                changePlan("Custom", bytes);
              }}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingPlan ? "Updating..." : "Apply Custom Quota"}
            </button>
          </div>
        </div>
      </section>

      {/* STORAGE CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      {/* STORAGE UTILIZATION */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900">Storage utilization</h3>
            <p className="mt-1 text-sm text-slate-500">
              {percentage.toFixed(2)}% of allocated storage used
            </p>
          </div>
          <span className="text-xl font-bold text-blue-600">
            {percentage.toFixed(1)}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* USER AND FILE TYPE ANALYTICS */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-900">
            User-wise storage usage
          </h3>

          {storage.users?.length ? (
            <div className="space-y-4">
              {storage.users.map((user) => (
                <div key={user.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatBytes(user.used_bytes)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.total_files} files
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No user data available.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-900">
            File type distribution
          </h3>

          {storage.fileTypes?.length ? (
            <div className="space-y-4">
              {storage.fileTypes.map((item) => (
                <div
                  key={item.file_type}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {item.file_type}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatBytes(item.used_bytes)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.total_files} files
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No file data available.</p>
          )}
        </section>
      </div>

      {/* LARGEST FILES */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-bold text-slate-900">Largest files</h3>

        {storage.largestFiles?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="pb-3">File name</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Size</th>
                </tr>
              </thead>
              <tbody>
                {storage.largestFiles.map((file) => (
                  <tr key={file.id} className="border-b last:border-0">
                    <td className="py-3 font-medium text-slate-800">
                      {file.original_name}
                    </td>
                    <td className="py-3">{file.owner_name}</td>
                    <td className="py-3">{file.mime_type || "Unknown"}</td>
                    <td className="py-3 text-right font-semibold">
                      {formatBytes(file.size_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No files available.</p>
        )}
      </section>
    </>
  );
}

function ActivityPage({ search }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  async function loadActivity() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/v1/files/audit/logs");

      const data = response.data?.data;

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to load activity logs.",
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  const filteredLogs = logs.filter((log) => {
    const searchText = search.toLowerCase();

    const matchesSearch = [
      log.file_name,
      log.actor_name,
      log.actor_email,
      log.event_type,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchText));

    const matchesEvent =
      eventFilter === "all" || log.event_type === eventFilter;

    return matchesSearch && matchesEvent;
  });

  const eventTypes = [
    "upload",
    "modify",
    "download",
    "delete",
    "share",
    "unshare",
    "permission_change",
  ];

  function eventStyle(event) {
    const styles = {
      upload: "bg-emerald-50 text-emerald-700",
      modify: "bg-blue-50 text-blue-700",
      download: "bg-indigo-50 text-indigo-700",
      delete: "bg-red-50 text-red-700",
      share: "bg-purple-50 text-purple-700",
      unshare: "bg-orange-50 text-orange-700",
      permission_change: "bg-amber-50 text-amber-700",
    };

    return styles[event] || "bg-slate-100 text-slate-700";
  }

  return (
    <>
      <SectionHeading
        title="File activity logs"
        description="Monitor who accessed, uploaded, modified, and deleted organization files."
        action={
          <button
            onClick={loadActivity}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {" "}
            <RefreshCw size={16} />
            {loading ? "Refreshing..." : "Refresh"}{" "}
          </button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={Files}
          title="Total events"
          description={`${logs.length} recorded file activities.`}
        />

        <FeatureCard
          icon={Users}
          title="Unique users"
          description={`${
            new Set(logs.map((log) => log.actor_user_id).filter(Boolean)).size
          } users performed activities.`}
        />

        <FeatureCard
          icon={Clock3}
          title="Latest activity"
          description={
            logs.length
              ? formatDate(logs[0].created_at)
              : "No recorded activity."
          }
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-bold text-slate-900">
              Organization audit trail
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              File activity recorded by SecureCloud.
            </p>
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All activities</option>
            {eventTypes.map((event) => (
              <option key={event} value={event}>
                {event.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading activity logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity found"
            description="No records match your current search or activity filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4">File</th>
                  <th className="whitespace-nowrap px-5 py-4">Performed by</th>
                  <th className="whitespace-nowrap px-5 py-4">Activity</th>
                  <th className="whitespace-nowrap px-5 py-4">Details</th>
                  <th className="whitespace-nowrap px-5 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                          <FileText size={17} />
                        </span>
                        {log.file_name || "Unknown file"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {log.actor_name || "Unknown user"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.actor_email || "—"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${eventStyle(
                          log.event_type,
                        )}`}
                      >
                        {(log.event_type || "unknown").replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {log.details?.mimeType || log.details?.description || "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Showing {filteredLogs.length} of {logs.length} recorded events.
        </div>
      </section>
    </>
  );
}

function SettingsPage({ userEmail }) {
  const [showGuidance, setShowGuidance] = useState(true);

  return (
    <>
      <SectionHeading
        title="Settings"
        description="Review workspace preferences and account security."
        action={
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Administrator
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <h3 className="font-bold">Account information</h3>
          <p className="mt-1 text-sm text-slate-500">
            Details from your current signed-in session.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Email address</p>
                <p className="mt-1 break-all text-sm font-semibold">
                  {userEmail}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <LockKeyhole size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Access control</p>
                <p className="mt-1 text-sm font-semibold">
                  Role-based permissions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Workspace</p>
                <p className="mt-1 text-sm font-semibold">
                  Authenticated session
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <CircleHelp size={20} />
            </div>
            <h3 className="font-bold">Security checklist</h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Keep your credentials private and sign out when using a shared
            device.
          </p>

          {showGuidance && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Sensitive account changes should be validated by the backend.
            </div>
          )}

          <button
            onClick={() => setShowGuidance((value) => !value)}
            className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            {showGuidance ? "Hide guidance" : "Show guidance"}
          </button>
        </article>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const storedUser = useMemo(() => getStoredUser(), []);

  const userName = storedUser.name || "Administrator";
  const userEmail = storedUser.email || "admin@securecloud.local";
  const role = String(storedUser.role || "admin").toLowerCase();

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const hasToken = Boolean(
    localStorage.getItem("securecloud_token") || localStorage.getItem("token"),
  );

  const currentPage = pageConfig[activePage] || pageConfig.Overview;
  const BannerIcon = currentPage.icon;

  function navigateTo(page) {
    setActivePage(page);
    setSearch("");
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("securecloud_token");
    localStorage.removeItem("securecloud_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  }

  function renderActivePage() {
    switch (activePage) {
      case "Users":
        return <UsersPage search={search} />;

      case "Organization":
        return <OrganizationPage />;

      case "Departments":
        return <DepartmentsPage search={search} />;

      case "Files":
        return <FilesPage search={search} />;

      case "Storage":
        return <StoragePage />;

      case "Activity Logs":
        return <ActivityPage search={search} />;

      case "Settings":
        return <SettingsPage userEmail={userEmail} />;

      case "Overview":
      default:
        return (
          <OverviewPage
            userName={userName}
            userEmail={userEmail}
            hasToken={hasToken}
            onNavigate={navigateTo}
            onLogout={handleLogout}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Cloud size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight">
              Secure<span className="text-blue-600">Cloud</span>
            </h1>
            <p className="text-xs text-slate-500">Private workspace</p>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-3 pt-6">
          <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => {
              const active = activePage === label;

              return (
                <button
                  key={label}
                  onClick={() => navigateTo(label)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      active
                        ? "text-white"
                        : "text-slate-500 group-hover:text-blue-600"
                    }
                  />

                  <span className="flex-1 text-left">{label}</span>

                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <ShieldCheck size={20} />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Secure workspace
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Manage access and monitor your organization's files.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">
                SecureCloud / Admin
              </p>
              <h2 className="truncate text-lg font-bold">{activePage}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${activePage.toLowerCase()}...`}
                aria-label={`Search ${activePage}`}
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 lg:w-56"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="font-semibold">Notifications</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    You're all caught up. Live notifications will appear when
                    the event service is connected.
                  </p>
                </div>
              )}
            </div>

            <div className="hidden h-9 w-px bg-slate-200 sm:block" />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 sm:gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                  {initials || "AD"}
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-36 truncate text-sm font-semibold">
                    {userName}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {role === "admin" ? "Administrator" : role}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className="hidden text-slate-400 sm:block"
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold">{userName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {userEmail}
                    </p>
                  </div>

                  <button
                    onClick={() => navigateTo("Settings")}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-8">
          {activePage !== "Overview" && (
            <section className="relative isolate mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
                  <BannerIcon size={15} />
                  {currentPage.eyebrow}
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {currentPage.title(userName.split(" ")[0])}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                  {currentPage.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      navigateTo(
                        activePage === "Settings"
                          ? "Overview"
                          : activePage === "Organization"
                            ? "Departments"
                            : activePage === "Storage"
                              ? "Files"
                              : activePage === "Activity Logs"
                                ? "Settings"
                                : activePage === "Departments"
                                  ? "Users"
                                  : activePage === "Users"
                                    ? "Departments"
                                    : activePage === "Files"
                                      ? "Storage"
                                      : "Users",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    <Plus size={17} />
                    {activePage === "Users"
                      ? "View departments"
                      : activePage === "Organization"
                        ? "View departments"
                        : activePage === "Departments"
                          ? "Manage users"
                          : activePage === "Files"
                            ? "Storage overview"
                            : activePage === "Storage"
                              ? "Explore files"
                              : activePage === "Activity Logs"
                                ? "Security settings"
                                : activePage === "Settings"
                                  ? "Back to overview"
                                  : "Manage users"}
                    <ArrowRight size={15} />
                  </button>

                  <button
                    onClick={() =>
                      navigateTo(
                        activePage === "Settings" ? "Overview" : "Settings",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" />
              <div className="pointer-events-none absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

              <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-3xl border border-white/20 bg-white/10 p-6 lg:block">
                <BannerIcon size={64} strokeWidth={1.3} />
              </div>
            </section>
          )}

          <div key={activePage}>{renderActivePage()}</div>

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400">
            <p>© 2026 SecureCloud. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={15} />
              Secure organization workspace
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
