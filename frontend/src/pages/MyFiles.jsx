import MainLayout from "../components/layout/MainLayout.jsx";
import { useMemo, useState } from "react";
import {
  Files,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File as FileIcon,
  Eye,
  Search,
  Upload,
  Grid2X2,
  List,
  HardDrive,
  Clock3,
  FolderOpen,
  Download,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  Cloud,
  ShieldCheck,
  FilePlus2,
  RefreshCw,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const FILTERS = ["All Files", "Documents", "Images", "Videos", "Archives"];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function getFileCategory(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.mimeType || file.type || "").toLowerCase();

  if (
    type.startsWith("image/") ||
    /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/.test(name)
  ) {
    return "Images";
  }

  if (type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
    return "Videos";
  }

  if (
    /\.(zip|rar|7z|tar|gz)$/.test(name) ||
    type.includes("zip") ||
    type.includes("compressed")
  ) {
    return "Archives";
  }

  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text") ||
    /\.(pdf|doc|docx|txt|rtf|odt|xls|xlsx|ppt|pptx|csv)$/.test(name)
  ) {
    return "Documents";
  }

  return "Other";
}

function getFileIcon(file) {
  const category = getFileCategory(file);

  if (category === "Images") return FileImage;
  if (category === "Videos") return FileVideo;
  if (category === "Archives") return FileArchive;
  if (category === "Documents") return FileText;

  return FileIcon;
}

function getFileColor(file) {
  const category = getFileCategory(file);

  const colors = {
    Images: "bg-violet-50 text-violet-600",
    Videos: "bg-rose-50 text-rose-600",
    Archives: "bg-amber-50 text-amber-600",
    Documents: "bg-blue-50 text-blue-600",
    Other: "bg-slate-100 text-slate-600",
  };

  return colors[category];
}

function getFileName(file) {
  return (
    file.originalName ||
    file.original_name ||
    file.originalname ||
    file.originalFilename ||
    file.filename ||
    file.name ||
    "Untitled file"
  );
}

function getFileSize(file) {
  const size = Number(
    file.size_bytes ?? file.sizeBytes ?? file.size ?? file.fileSize,
  );

  return Number.isFinite(size) && size >= 0 ? formatBytes(size) : "—";
}

function getUploadDate(file) {
  const value = file.createdAt || file.uploadedAt || file.created_at;

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStoredToken() {
  return (
    localStorage.getItem("securecloud_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function MyFiles() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Files");
  const [viewMode, setViewMode] = useState("grid");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const token = getStoredToken();

  /*
   * Backend integration:
   * Set VITE_API_URL in frontend/.env if your backend base URL differs.
   *
   * This page expects a GET /api/v1/files endpoint returning either:
   * { success: true, data: [...] }
   * or { data: { files: [...] } }
   * or { files: [...] }
   *
   * Confirm your existing backend response shape before connecting.
   */

  async function loadFiles() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
      ).replace(/\/$/, "");

      const response = await fetch(`${baseUrl}/files`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            result?.message ||
            `Unable to load files (${response.status}).`,
        );
      }

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.files)
            ? result.data.files
            : Array.isArray(result?.files)
              ? result.files
              : null;

      if (!records) {
        throw new Error(
          "The files API returned an unexpected response format.",
        );
      }

      setFiles(records);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load files. Check the backend connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredFiles = useMemo(() => {
    let result = files.filter((file) => {
      const name = getFileName(file).toLowerCase();
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        (file.mimeType || file.type || "").toLowerCase().includes(query);

      const matchesCategory =
        activeFilter === "All Files" || getFileCategory(file) === activeFilter;

      return matchesSearch && matchesCategory;
    });

    result = [...result].sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.uploadedAt || a.created_at || 0,
      ).getTime();

      const dateB = new Date(
        b.createdAt || b.uploadedAt || b.created_at || 0,
      ).getTime();

      if (sortOrder === "newest") return dateB - dateA;
      if (sortOrder === "oldest") return dateA - dateB;
      if (sortOrder === "name") {
        return getFileName(a).localeCompare(getFileName(b));
      }
      if (sortOrder === "largest") {
        return (
          Number(b.size || b.fileSize || 0) - Number(a.size || a.fileSize || 0)
        );
      }

      return 0;
    });

    return result;
  }, [files, search, activeFilter, sortOrder]);

  const totalBytes = files.reduce((total, file) => {
    const size = Number(
      file.size_bytes ?? file.sizeBytes ?? file.size ?? file.fileSize ?? 0,
    );

    return total + (Number.isFinite(size) && size > 0 ? size : 0);
  }, 0);

  const documentCount = files.filter(
    (file) => getFileCategory(file) === "Documents",
  ).length;

  const imageCount = files.filter(
    (file) => getFileCategory(file) === "Images",
  ).length;

  async function handleUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);

    event.target.value = "";

    if (!selectedFiles.length) return;

    setError("");
    setNotice("");

    if (!token) {
      setError("Please sign in before uploading files.");
      return;
    }

    setUploading(true);

    try {
      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
      ).replace(/\/$/, "");

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${baseUrl}/files/content`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: formData,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result?.error?.message ||
              result?.message ||
              `Upload failed for ${file.name}.`,
          );
        }
      }

      setNotice(
        selectedFiles.length === 1
          ? "File uploaded successfully."
          : `${selectedFiles.length} files uploaded successfully.`,
      );

      await loadFiles();
    } catch (err) {
      setError(
        err.message || "Upload failed. Verify the backend upload endpoint.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file) {
    setError("");
    setNotice("");

    try {
      const fileId = file.id || file.fileId || file._id;

      if (!fileId) {
        throw new Error("This file does not have a valid file ID.");
      }

      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
      ).replace(/\/$/, "");

      // Backend route: GET /api/v1/files/:id/content
      const response = await fetch(
        `${baseUrl}/files/${encodeURIComponent(fileId)}/content`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          result?.error?.message ||
            result?.message ||
            `Download failed (${response.status}).`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The downloaded file is empty.");
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = getFileName(file);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      // Give the browser time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setNotice("File downloaded successfully.");
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  async function handlePreview(file) {
    console.log("PREVIEW BUTTON CLICKED:", file);

    setError("");
    setNotice("");

    try {
      const fileId = file.id || file.fileId || file._id;

      if (!fileId) {
        throw new Error("File ID is missing.");
      }

      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
      ).replace(/\/$/, "");

      const response = await fetch(
        `${baseUrl}/files/${encodeURIComponent(fileId)}/content`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/pdf, */*",
          },
        },
      );

      console.log("PREVIEW RESPONSE STATUS:", response.status);
      console.log(
        "PREVIEW CONTENT TYPE:",
        response.headers.get("content-type"),
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result?.error?.message ||
            result?.message ||
            `Preview failed (${response.status}).`,
        );
      }

      const blob = await response.blob();

      console.log("PREVIEW FILE SIZE:", blob.size);
      console.log("PREVIEW BLOB TYPE:", blob.type);

      if (blob.size === 0) {
        throw new Error("The downloaded file is empty.");
      }

      const previewBlob = new Blob([blob], {
        type: "application/pdf",
      });

      const previewUrl = URL.createObjectURL(previewBlob);
      window.open(previewUrl, "_blank");
    } catch (err) {
      console.error("PREVIEW ERROR:", err);
      setError(err.message || "Preview failed.");
    }
  }

  async function handleDelete(file) {
    const fileId = file.id || file.fileId || file._id;

    if (!fileId) {
      setError("This file does not have a valid file ID.");
      return;
    }

    if (
      !window.confirm(`Are you sure you want to delete "${getFileName(file)}"?`)
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
      ).replace(/\/$/, "");

      // Backend route: DELETE /api/v1/files/:id
      const response = await fetch(
        `${baseUrl}/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          result?.error?.message ||
            result?.message ||
            `Delete failed (${response.status}).`,
        );
      }

      setFiles((current) =>
        current.filter(
          (item) =>
            String(item.id || item.fileId || item._id) !== String(fileId),
        ),
      );

      setSelectedFile(null);
      setNotice("File deleted successfully.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  }

  return (
    <MainLayout>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-100 sm:p-9">
            <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[30px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-24 right-36 -z-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide">
                <ShieldCheck size={15} />
                SECURE FILE WORKSPACE
              </div>

              <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                My Files
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Everything you need to store, organize, and access your files
                securely in one place.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
                  <Upload size={17} />
                  {uploading ? "Uploading..." : "Upload files"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>

                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={loading || uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh files
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-3xl border border-white/20 bg-white/10 p-7 lg:block">
              <Cloud size={66} strokeWidth={1.3} />
            </div>

            <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-xs font-medium text-blue-50">
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} />
                Secure storage
              </span>
              <span className="flex items-center gap-2">
                <Files size={15} />
                File organization
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} />
                Authenticated access
              </span>
            </div>
          </section>

          {/* Error and success messages */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              <CheckCircle2 size={19} className="shrink-0" />
              <div className="flex-1">{notice}</div>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* Storage cards */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold">Storage overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                A quick look at your file workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Total files",
                  value: files.length.toString(),
                  subtitle: "Files returned by the API",
                  icon: Files,
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  title: "Storage used",
                  value: formatBytes(totalBytes),
                  subtitle: "Total size of loaded files",
                  icon: HardDrive,
                  color: "bg-violet-50 text-violet-600",
                },
                {
                  title: "Documents",
                  value: documentCount.toString(),
                  subtitle: "PDFs and office documents",
                  icon: FileText,
                  color: "bg-emerald-50 text-emerald-600",
                },
                {
                  title: "Images",
                  value: imageCount.toString(),
                  subtitle: "Image files in your workspace",
                  icon: FileImage,
                  color: "bg-amber-50 text-amber-600",
                },
              ].map(({ title, value, subtitle, icon: Icon, color }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
                    >
                      <Icon size={21} />
                    </div>
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
                      Live list
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-medium text-slate-500">
                    {title}
                  </p>
                  <p className="mt-1 break-words text-2xl font-extrabold tracking-tight">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
                </article>
              ))}
            </div>
          </section>

          {/* File workspace */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">All files</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Browse and organize your stored files.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`rounded-lg p-2 transition ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Grid2X2 size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`rounded-lg p-2 transition ${
                    viewMode === "list"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Search and sorting */}
            <div className="mt-6 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files by name or type..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <ArrowUpDown size={16} className="text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  aria-label="Sort files"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="largest">Largest first</option>
                </select>
              </div>
            </div>

            {/* Category filters */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Filter size={16} className="mr-1 text-slate-400" />

              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeFilter === filter
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* File list */}
            <div className="mt-6">
              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <RefreshCw size={30} className="animate-spin text-blue-600" />
                  <p className="mt-4 font-semibold">Loading your files...</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Connecting to SecureCloud.
                  </p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    {search || activeFilter !== "All Files" ? (
                      <Search size={29} />
                    ) : (
                      <FolderOpen size={31} />
                    )}
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {search || activeFilter !== "All Files"
                      ? "No matching files"
                      : "Your workspace is ready"}
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {search || activeFilter !== "All Files"
                      ? "Try a different search term or select another file category."
                      : "Load your existing files or upload a document to get started."}
                  </p>

                  {!search && activeFilter === "All Files" && (
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={loadFiles}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        <RefreshCw size={16} />
                        Load existing files
                      </button>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                        <FilePlus2 size={16} />
                        Upload a file
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          disabled={uploading}
                          onChange={handleUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file, index) => {
                    const Icon = getFileIcon(file);
                    const fileId = file.id || file.fileId || file._id;

                    return (
                      <article
                        key={fileId}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${getFileColor(file)}`}
                          >
                            <Icon size={23} />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
  console.log("Clicked file ID:", fileId);
  console.log("Current selected file:", selectedFile);

  setSelectedFile(
    selectedFile === fileId ? null : fileId
  );
}}
                            aria-label={`Actions for ${getFileName(file)}`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>

                        <h3
                          className="mt-5 truncate text-sm font-bold text-slate-800"
                          title={getFileName(file)}
                        >
                          {getFileName(file)}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {getFileCategory(file)} · {getFileSize(file)}
                        </p>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock3 size={13} />
                            {getUploadDate(file)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            aria-label={`Download ${getFileName(file)}`}
                          >
                            <Download size={17} />
                          </button>
                        </div>

                        {selectedFile === fileId && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => handlePreview(file)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Eye size={14} />
                              Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(file)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Download size={14} />
                              Download
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(file)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Name</th>
                        <th className="px-5 py-4 font-semibold">Type</th>
                        <th className="px-5 py-4 font-semibold">Size</th>
                        <th className="px-5 py-4 font-semibold">Uploaded</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredFiles.map((file, index) => {
                        const Icon = getFileIcon(file);
                        const fileId = file.id || file.fileId || file._id;

                        return (
                          <tr
                            key={fileId}
                            className="transition hover:bg-blue-50/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getFileColor(file)}`}
                                >
                                  <Icon size={19} />
                                </div>
                                <span className="max-w-64 truncate font-semibold text-slate-800">
                                  {getFileName(file)}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {getFileCategory(file)}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {getFileSize(file)}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {getUploadDate(file)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownload(file)}
                                  aria-label={`Download ${getFileName(file)}`}
                                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                >
                                  <Download size={17} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(file)}
                                  aria-label={`Delete ${getFileName(file)}`}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>
                Showing {filteredFiles.length} of {files.length} loaded files
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                SecureCloud file workspace
              </span>
            </div>
          </section>

          {/* Bottom information */}
          <section className="grid gap-4 md:grid-cols-2">
            <article className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-semibold">Your files, protected</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Access to private files should be verified by the backend
                  before every download or deletion.
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <HardDrive size={22} />
              </div>
              <div>
                <h3 className="font-semibold">Storage at a glance</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  File totals and storage usage reflect only records returned by
                  the connected files API.
                </p>
              </div>
            </article>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400">
            <span>© 2026 SecureCloud. All rights reserved.</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} />
              Secure file management
            </span>
          </footer>
        </div>
      </main>
    </MainLayout>
  );
}

export default MyFiles;
