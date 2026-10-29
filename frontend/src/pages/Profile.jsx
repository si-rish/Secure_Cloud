import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout.jsx";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Building2,
  BriefcaseBusiness,
  LockKeyhole,
  Pencil,
  Save,
  X,
  CheckCircle2,
  Camera,
  CalendarDays,
} from "lucide-react";
import authService from "../services/authService";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return authService.getUser?.() || authService.getCurrentUser?.() || {};
    } catch {
      return {};
    }
  });

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department:
      user?.department || user?.department_name || user?.departmentName || "",
    organization:
      user?.organization?.name ||
      user?.organization ||
      user?.organization_name ||
      user?.organizationName ||
      "",
  });

  useEffect(() => {
    const currentUser =
      authService.getUser?.() || authService.getCurrentUser?.() || {};

    setUser(currentUser);
    setForm({
      name: currentUser.name || "",
      email: currentUser.email || "",
      department:
        currentUser.department ||
        currentUser.department_name ||
        currentUser.departmentName ||
        "",
      organization:
        currentUser.organization?.name ||
        currentUser.organization ||
        currentUser.organization_name ||
        currentUser.organizationName ||
        "",
    });
  }, []);

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const role = user?.role || "user";

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.name.trim() || !form.email.trim()) {
      setMessage("Name and email address are required.");
      return;
    }

    setSaving(true);

    try {
      // Update the local profile display. Connect this to a profile-update
      // API when the backend endpoint is available.
      const updatedUser = {
        ...user,
        name: form.name.trim(),
        email: form.email.trim(),
      };

      const storageKey = localStorage.getItem("securecloud_user")
        ? "securecloud_user"
        : "user";

      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditing(false);
      setMessage("Profile changes saved on this device.");
    } catch {
      setMessage("Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
  setForm({
    name: user?.name || "",
    email: user?.email || "",
    department:
      user?.department ||
      user?.department_name ||
      user?.departmentName ||
      "",
    organization:
      user?.organization?.name ||
      user?.organization ||
      user?.organization_name ||
      user?.organizationName ||
      "",
  });

  setEditing(false);
  setMessage("");
};

  const InfoCard = ({ icon: Icon, label, value, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600",
      violet: "bg-violet-50 text-violet-600",
      emerald: "bg-emerald-50 text-emerald-600",
      amber: "bg-amber-50 text-amber-600",
    };

    return (
      <div className="flex min-w-0 items-start gap-4 rounded-xl border border-slate-100 bg-white p-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            colorClasses[color] || colorClasses.blue
          }`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-words font-semibold text-slate-800">
            {value || "Not available"}
          </p>
        </div>
      </div>
    );
  };

  const InputField = ({ label, name, value, icon: Icon, type = "text" }) => (
    <label className="block">
      {" "}
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}{" "}
      </span>
      <div className="relative">
        <Icon
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder={`Enter ${label.toLowerCase()}`}
          required={name === "name" || name === "email"}
        />
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      {" "}
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          {" "}
          <ArrowLeft size={18} />
          Back to dashboard{" "}
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">
            ACCOUNT SETTINGS
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My Profile
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your personal information and account details.
          </p>
        </div>

        {/* Profile banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-2xl font-bold shadow-inner backdrop-blur">
                {initials}
                <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-blue-600 bg-emerald-400 text-white">
                  <CheckCircle2 size={16} />
                </span>
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-2xl font-bold">
                  {user?.name || "SecureCloud User"}
                </h2>
                <p className="mt-1 break-all text-sm text-blue-100">
                  {user?.email || "No email available"}
                </p>

                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold capitalize">
                  <ShieldCheck size={14} />
                  {role}
                </span>
              </div>
            </div>

            {!editing && (
              <button
                onClick={() => {
                  setMessage("");
                  setEditing(true);
                }}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:self-auto"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            )}
          </div>
        </section>

        {/* Status message */}
        {message && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              message.startsWith("Profile changes")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          {/* Main profile section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Personal Information
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your basic account details
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <UserRound size={22} />
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="mt-7 space-y-5">
                <InputField
                  label="Full name"
                  name="name"
                  value={form.name}
                  icon={UserRound}
                />

                <InputField
                  label="Email address"
                  name="email"
                  value={form.email}
                  icon={Mail}
                  type="email"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <InputField
                    label="Department"
                    name="department"
                    value={form.department}
                    icon={Building2}
                  />

                  <InputField
                    label="Organization"
                    name="organization"
                    value={form.organization}
                    icon={BriefcaseBusiness}
                  />
                </div>

                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  Name and email changes are saved locally in this UI.
                  Department and organization are displayed from your account
                  data. Server-side profile updates are not connected yet.
                </p>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={17} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <X size={17} />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={UserRound}
                  label="Full name"
                  value={user?.name}
                  color="blue"
                />
                <InfoCard
                  icon={Mail}
                  label="Email address"
                  value={user?.email}
                  color="violet"
                />
                <InfoCard
                  icon={Building2}
                  label="Department"
                  value={user?.department || user?.department_name}
                  color="emerald"
                />
                <InfoCard
                  icon={BriefcaseBusiness}
                  label="Organization"
                  value={
                    user?.organization?.name ||
                    user?.organization ||
                    user?.organization_name ||
                    user?.organizationName
                  }
                  color="amber"
                />
              </div>
            )}
          </section>

          {/* Security panel */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Account Security</h3>
                  <p className="text-xs text-slate-500">
                    Authentication status
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    SecureCloud authentication
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Your account uses the application's authentication system.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 p-4">
                <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
                  <LockKeyhole size={19} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Password
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Managed by your account credentials
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Account Overview</h3>
                  <p className="text-xs text-slate-500">
                    Your account at a glance
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Account role</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                    {role}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Account status</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {user?.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs leading-5 text-slate-500">
                    Your available features may depend on your assigned role and
                    organization permissions.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          SecureCloud · Private storage, managed securely.
        </p>
      </div>
    </main>
  );
}
