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

const stats = [
  {
    label: "Total Users",
    value: "—",
    description: "Registered organization members",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Total Files",
    value: "—",
    description: "Files stored in SecureCloud",
    icon: Files,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Storage Used",
    value: "—",
    description: "Current storage consumption",
    icon: HardDrive,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Active Users",
    value: "—",
    description: "Currently active accounts",
    icon: UserCheck,
    color: "bg-emerald-50 text-emerald-600",
  },
];

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("securecloud_user") ||
        localStorage.getItem("user") ||
        "{}"
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
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
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
          {stats.map(({ label, value, description, icon: Icon, color }) => (
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
                {description}
              </p>
            </article>
          ))}
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
              <p className="text-xs text-slate-500">
                Your session information
              </p>
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
              <p className="mt-1 break-all text-sm font-medium">
                {userEmail}
              </p>
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
  return (
    <>
      <SectionHeading
        title="Users & access"
        description="Review the members and access permissions in your organization."
        action={
          <button
            onClick={() =>
              window.alert(
                "Connect the user-management API to add users."
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Add user
          </button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={Users}
          title="Member directory"
          description="Review organization accounts and members."
        />
        <FeatureCard
          icon={LockKeyhole}
          title="Role management"
          description="Keep access permissions appropriate."
        />
        <FeatureCard
          icon={UserCheck}
          title="Account status"
          description="Monitor active and inactive accounts."
        />
      </div>

      <EmptyState
        icon={Users}
        title={
          search
            ? `No loaded users match "${search}"`
            : "User directory is ready"
        }
        description="Connect the user-list API to display real names, email addresses, roles, departments, and account statuses."
      />
    </>
  );
}

function OrganizationPage() {
  const organizationName =
    localStorage.getItem("securecloud_organization_name") ||
    "Organization details not loaded";

  const organizationSlug =
    localStorage.getItem("securecloud_organization_slug") || "—";

  return (
    <>
      <SectionHeading
        title="Organization details"
        description="Review your workspace profile and organization information."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Building2 size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold">{organizationName}</h3>
              <p className="mt-1 text-sm text-slate-500">
                SecureCloud organization
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Organization name</dt>
              <dd className="mt-1 font-semibold">{organizationName}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Organization slug</dt>
              <dd className="mt-1 font-semibold">{organizationSlug}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Session status</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 size={16} />
                Authenticated
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Organization data</dt>
              <dd className="mt-1 font-semibold">
                API connection pending
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6">
          <ShieldCheck size={25} className="text-blue-600" />
          <h3 className="mt-4 font-bold">Organization security</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Organization membership and server-side role checks should protect
            access to workspace data.
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
  return (
    <>
      <SectionHeading
        title="Departments"
        description="Organize members into teams and keep responsibilities clear."
        action={
          <button
            onClick={() =>
              window.alert(
                "Connect the department API to create departments."
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={17} />
            New department
          </button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={BriefcaseBusiness}
          title="Team structure"
          description="Group members by function."
        />
        <FeatureCard
          icon={Users}
          title="Member assignment"
          description="Associate users with departments."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Access clarity"
          description="Support organized permissions."
        />
      </div>

      <EmptyState
        icon={FolderOpen}
        title={
          search
            ? `No loaded departments match "${search}"`
            : "No department data loaded"
        }
        description="Connect the departments endpoint to display real department names, member counts, and management actions."
      />
    </>
  );
}

function FilesPage({ search }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

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
          "Unable to load files. Please check your login session."
      );
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

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
          "File upload failed. Please try again."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }


const filteredFiles = files.filter((file) =>
  String(
    file.originalName ||
    file.original_name ||
    file.originalname ||
    file.name ||
    "Unnamed file"
  )
    .toLowerCase()
    .includes(search.toLowerCase())
);



  function formatSize(bytes) {
    const size = Number(bytes || 0);

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <>
      <SectionHeading
        title="Organization files"
        description="Review stored files and upload new content."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadFiles}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
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

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={Files}
          title="File library"
          description={`${files.length} file(s) returned by the API.`}
        />

        <FeatureCard
          icon={LockKeyhole}
          title="Secure sharing"
          description="File access is controlled by backend permissions."
        />

        <FeatureCard
          icon={Clock3}
          title="Recent updates"
          description="Review the files returned by your current session."
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold text-slate-900">File library</h3>
          <p className="mt-1 text-sm text-slate-500">
            File information loaded from SecureCloud.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading files...
          </div>
        ) : filteredFiles.length === 0 && !error ? (
          <EmptyState
            icon={FileText}
            title={search ? "No matching files" : "No files found"}
            description={
              search
                ? "Try a different search term."
                : "Upload a file to get started, or refresh the list."
            }
          />
        ) : (
          
<div className="overflow-x-auto">
  <table className="w-full text-left text-sm">
    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
      <tr>
        <th className="px-5 py-4">File name</th>
        <th className="px-5 py-4">Type</th>
        <th className="px-5 py-4">Size</th>
        <th className="px-5 py-4">Uploaded</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-slate-100">
      {filteredFiles.map((file, index) => (
        <tr
          key={file.id || file._id || index}
          className="hover:bg-slate-50"
        >
          {/* File name */}
          <td className="px-5 py-4 font-medium text-slate-800">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <FileText size={18} />
              </span>

              {file.originalName ||
                file.original_name ||
                file.originalname ||
                file.name ||
                "Unnamed file"}
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
          <td className="px-5 py-4 text-slate-500">
            {formatSize(
              file.sizeBytes ?? file.size_bytes ?? file.size ?? 0
            )}
          </td>

          {/* Upload date */}
          <td className="px-5 py-4 text-slate-500">
            {file.createdAt || file.created_at
              ? new Date(
                  file.createdAt || file.created_at
                ).toLocaleDateString()
              : "—"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
)}
</section>
</>
);
}


function StoragePage() {
  return (
    <>
      <SectionHeading
        title="Storage overview"
        description="Monitor storage usage across your workspace."
        action={
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tracked storage</p>
              <p className="mt-2 text-3xl font-extrabold">—</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <HardDrive size={23} />
            </div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-0 rounded-full bg-blue-600" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Usage data will appear when the storage API is connected.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total files</p>
              <p className="mt-2 text-3xl font-extrabold">—</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Files size={23} />
            </div>
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-500">
            File totals and storage distribution will be shown after the
            backend provides real values.
          </p>
        </article>
      </div>

      <div className="mt-6">
        <EmptyState
          icon={Database}
          title="Storage analytics are waiting for data"
          description="Connect the storage summary endpoint to display real usage, capacity, and department-level breakdowns."
        />
      </div>
    </>
  );
}

function ActivityPage({ search }) {
  return (
    <>
      <SectionHeading
        title="Activity logs"
        description="Monitor important events and account activity."
        action={
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
            <Activity size={14} />
            Audit trail
          </span>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={LockKeyhole}
          title="Authentication"
          description="Sign-ins and session events."
        />
        <FeatureCard
          icon={Files}
          title="File operations"
          description="Uploads, downloads, and changes."
        />
        <FeatureCard
          icon={UserCheck}
          title="Account changes"
          description="Roles and membership updates."
        />
      </div>

      <EmptyState
        icon={Activity}
        title={
          search
            ? `No loaded events match "${search}"`
            : "No activity events loaded"
        }
        description="Connect the activity-log endpoint to show timestamps, actors, event types, and outcomes."
      />
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
    localStorage.getItem("securecloud_token") ||
      localStorage.getItem("token")
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

                  {active && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
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
                    <p className="truncate text-sm font-semibold">
                      {userName}
                    </p>
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
                                      : "Users"
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
                        activePage === "Settings" ? "Overview" : "Settings"
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

          <div key={activePage}>
            {renderActivePage()}
          </div>

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

