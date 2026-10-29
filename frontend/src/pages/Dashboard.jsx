import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Cloud,
  File,
  FileImage,
  FileText,
  Files,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  FolderOpen,
  Clock3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";
import authService from "../services/authService";

function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("securecloud_theme") === "dark"
  );
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const dark = darkMode;

  const theme = {
    page: dark
      ? "bg-[#0b1120] text-slate-100"
      : "bg-[#f5f7fc] text-slate-900",
    header: dark
      ? "border-slate-800 bg-[#101827]"
      : "border-slate-200/80 bg-white",
    sidebar: dark
      ? "border-slate-800 bg-[#101827]"
      : "border-slate-200 bg-white",
    card: dark
      ? "border-slate-800 bg-[#101827]"
      : "border-slate-200/80 bg-white",
    muted: dark ? "text-slate-400" : "text-slate-500",
    subtle: dark ? "text-slate-500" : "text-slate-400",
    divider: dark ? "border-slate-800" : "border-slate-100",
    input: dark
      ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400",
    hover: dark ? "hover:bg-slate-800" : "hover:bg-slate-50",
    navActive: dark
      ? "bg-blue-500/15 text-blue-400"
      : "bg-blue-50 text-blue-700",
    iconBg: dark ? "bg-slate-800" : "bg-slate-100",
  };

  const displayName = user?.name || "User";
  const firstName = displayName.trim().split(/\s+/)[0];
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      localStorage.setItem("securecloud_theme", next ? "dark" : "light");
      return next;
    });
  }

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/v1/files");
      const result = response.data;

      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.files)
          ? result.data.files
          : [];

      setFiles(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load files. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authService.getToken()) {
      navigate("/login", { replace: true });
      return;
    }

    loadFiles();
  }, [navigate, loadFiles]);

  function handleLogout() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  const filteredFiles = files.filter((file) =>
    (file.original_name || file.originalName || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalBytes = files.reduce(
    (total, file) => total + Number(file.size_bytes || file.sizeBytes || 0),
    0
  );

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Date unavailable";

    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getFileIcon(file) {
    const name = (file.original_name || file.originalName || "").toLowerCase();
    const mime = (file.mime_type || file.mimeType || "").toLowerCase();

    if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) {
      return <FileImage size={20} />;
    }

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      return <FileText size={20} />;
    }

    return <File size={20} />;
  }

  const statCards = [
    {
      label: "Total files",
      value: loading ? "—" : files.length,
      description: "Files in your workspace",
      icon: Files,
      color: "text-blue-500",
      iconBg: dark ? "bg-blue-500/10" : "bg-blue-50",
    },
    {
      label: "Storage used",
      value: loading ? "—" : formatBytes(totalBytes),
      description: "Combined file size",
      icon: HardDrive,
      color: "text-violet-500",
      iconBg: dark ? "bg-violet-500/10" : "bg-violet-50",
    },
    {
      label: "Account status",
      value: "Active",
      description: "Your workspace is ready",
      icon: ShieldCheck,
      color: "text-emerald-500",
      iconBg: dark ? "bg-emerald-500/10" : "bg-emerald-50",
    },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.page}`}>
      {/* Top navigation */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${theme.header}`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex shrink-0 items-center gap-3"
            aria-label="SecureCloud home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Cloud size={25} strokeWidth={2.3} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Secure<span className="text-blue-500">Cloud</span>
            </span>
          </button>

          <div className="hidden max-w-md flex-1 md:block">
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${theme.input}`}
            >
              <Search size={18} className={theme.subtle} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your files..."
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Search files"
              />
              <kbd
                className={`hidden rounded border px-1.5 py-0.5 text-xs lg:inline ${theme.divider} ${theme.subtle}`}
              >
                Search
              </kbd>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className={`rounded-xl border p-2.5 transition ${theme.divider} ${theme.hover}`}
            >
              {dark ? (
                <Sun size={19} className="text-amber-400" />
              ) : (
                <Moon size={19} className="text-slate-600" />
              )}
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="max-w-36 truncate text-sm font-semibold">
                  {displayName}
                </p>
                <p className={`max-w-40 truncate text-xs ${theme.muted}`}>
                  {user?.email}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white ring-4 ring-blue-500/10">
                {initials || "U"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className={`rounded-xl border p-2.5 transition ${theme.divider} ${theme.hover}`}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-8 lg:px-10 lg:py-9">
        {/* Sidebar */}
        <aside className="h-fit">
          <div className={`rounded-2xl border p-3 shadow-sm ${theme.sidebar}`}>
            <p
              className={`px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] ${theme.subtle}`}
            >
              Workspace
            </p>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${theme.navActive}`}
            >
              <LayoutDashboard size={19} />
              Overview
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-files")}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${theme.muted} ${theme.hover}`}
            >
              <FolderOpen size={19} />
              My Files
              <ArrowRight size={15} className="ml-auto" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${theme.muted} ${theme.hover}`}
            >
              <UserRound size={19} />
              My Profile
            </button>

            <div className={`my-4 border-t ${theme.divider}`} />

            <p
              className={`px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] ${theme.subtle}`}
            >
              Your account
            </p>

            <div
              className={`rounded-xl p-3 ${
                dark ? "bg-emerald-500/[0.07]" : "bg-emerald-50/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-500" />
                <span className="text-sm font-semibold">Account protected</span>
              </div>
              <p className={`mt-2 text-xs leading-5 ${theme.muted}`}>
                Your private workspace is ready to use.
              </p>
            </div>
          </div>

          {/* Upgrade-free storage summary */}
          <div
            className={`mt-4 overflow-hidden rounded-2xl border p-5 ${theme.sidebar}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${theme.muted}`}>
                Storage overview
              </span>
              <HardDrive size={18} className="text-blue-500" />
            </div>

            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : formatBytes(totalBytes)}
            </p>
            <p className={`mt-1 text-xs ${theme.muted}`}>
              Across {loading ? "…" : files.length}{" "}
              {files.length === 1 ? "file" : "files"}
            </p>

            <div
              className={`mt-4 h-2 overflow-hidden rounded-full ${
                dark ? "bg-slate-800" : "bg-slate-100"
              }`}
            >
              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 opacity-80" />
            </div>
            <p className={`mt-2 text-[11px] ${theme.subtle}`}>
              Total tracked file size
            </p>
          </div>
        </aside>

        {/* Main dashboard */}
        <main className="min-w-0">
          {/* Welcome banner */}
          <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8 lg:p-10">
            <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full bg-white/[0.08] blur-2xl" />
            <div className="absolute -bottom-28 right-1/4 -z-10 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                  <Activity size={14} />
                  YOUR SECURE WORKSPACE
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[42px]">
                  Welcome back, {firstName}!
                </h1>

                <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100 sm:text-base">
                  Everything you need to manage your files, in one secure
                  place. Ready to get things organized?
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/my-files")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <Upload size={17} />
                  Go to My Files
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="hidden shrink-0 items-center justify-center sm:flex">
                <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md lg:h-44 lg:w-44">
                  <Cloud
                    size={88}
                    strokeWidth={1.1}
                    className="text-white drop-shadow-lg"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-xs font-medium text-blue-100">
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} />
                Authenticated session
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Workspace active
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={16} />
                Your files, always organized
              </span>
            </div>
          </section>

          {/* Statistics */}
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={`rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${theme.card}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${theme.muted}`}>
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-extrabold tracking-tight">
                        {stat.value}
                      </p>
                    </div>

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg} ${stat.color}`}
                    >
                      <Icon size={23} />
                    </div>
                  </div>

                  <p className={`mt-4 text-xs ${theme.muted}`}>
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Recent files */}
          <section
            className={`mt-7 overflow-hidden rounded-2xl border shadow-sm ${theme.card}`}
          >
            <div className="flex flex-col justify-between gap-4 border-b border-inherit px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold tracking-tight">
                    Recent files
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      dark
                        ? "bg-slate-800 text-slate-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {loading ? "…" : filteredFiles.length}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${theme.muted}`}>
                  Your latest files and documents
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={loading}
                  title="Refresh files"
                  className={`rounded-xl border p-2.5 transition disabled:opacity-50 ${theme.divider} ${theme.hover}`}
                >
                  <RefreshCw
                    size={17}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/my-files")}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View all
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Search for smaller screens */}
            <div className="px-5 pt-4 md:hidden">
              <div
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${theme.input}`}
              >
                <Search size={17} className={theme.subtle} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files..."
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search files"
                />
              </div>
            </div>

            {error ? (
              <div className="m-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Couldn't load your files</p>
                  <p className={`mt-1 text-sm ${theme.muted}`}>{error}</p>
                  <button
                    type="button"
                    onClick={loadFiles}
                    className="mt-3 text-sm font-semibold text-blue-500 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-4">
                    <div
                      className={`h-11 w-11 rounded-xl ${theme.iconBg}`}
                    />
                    <div className="flex-1">
                      <div className={`h-3 w-1/3 rounded ${theme.iconBg}`} />
                      <div
                        className={`mt-2 h-3 w-1/4 rounded ${theme.iconBg}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="px-5 py-12 text-center sm:py-16">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${theme.iconBg} text-blue-500`}
                >
                  {search ? <Search size={27} /> : <FolderOpen size={29} />}
                </div>

                <h3 className="mt-5 text-base font-bold">
                  {search ? "No matching files" : "Your workspace is ready"}
                </h3>

                <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${theme.muted}`}>
                  {search
                    ? "Try another search term to find your files."
                    : "You haven't uploaded any files yet. Head to My Files to add your first document."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={() => navigate("/my-files")}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Upload size={17} />
                    Explore My Files
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px] gap-4 border-b border-inherit px-6 py-3 text-[11px] font-bold uppercase tracking-wider sm:grid">
                  <span className={theme.subtle}>Name</span>
                  <span className={theme.subtle}>Date added</span>
                  <span className={`text-right ${theme.subtle}`}>Size</span>
                </div>

                <div className="divide-y divide-inherit">
                  {filteredFiles.slice(0, 6).map((file) => {
                    const fileName =
                      file.original_name ||
                      file.originalName ||
                      "Untitled file";

                    return (
                      <div
                        key={file.id}
                        className={`group grid grid-cols-1 gap-3 px-5 py-4 transition sm:grid-cols-[minmax(0,1fr)_130px_100px] sm:items-center sm:gap-4 sm:px-6 ${theme.hover}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              dark
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {getFileIcon(file)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {fileName}
                            </p>
                            <p className={`mt-1 truncate text-xs ${theme.muted}`}>
                              {file.mime_type ||
                                file.mimeType ||
                                "Document"}
                            </p>
                          </div>
                        </div>

                        <p className={`flex items-center gap-2 text-xs ${theme.muted}`}>
                          <Clock3 size={14} className="sm:hidden" />
                          {formatDate(file.created_at || file.createdAt)}
                        </p>

                        <div className="flex items-center justify-between sm:justify-end">
                          <span className={`text-xs ${theme.muted} sm:hidden`}>
                            File size
                          </span>
                          <span className="text-sm font-medium">
                            {formatBytes(
                              Number(file.size_bytes || file.sizeBytes || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredFiles.length > 6 && (
                  <div className={`border-t px-6 py-4 ${theme.divider}`}>
                    <button
                      type="button"
                      onClick={() => navigate("/my-files")}
                      className="text-sm font-semibold text-blue-500 hover:text-blue-400"
                    >
                      View all {filteredFiles.length} files →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Footer */}
          <footer
            className={`flex flex-col gap-2 py-7 text-xs sm:flex-row sm:items-center sm:justify-between ${theme.subtle}`}
          >
            <p>© {new Date().getFullYear()} SecureCloud. Your files, your control.</p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} />
              Secure workspace
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;