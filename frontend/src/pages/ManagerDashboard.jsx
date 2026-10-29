import { useState, useEffect } from "react";
import {
LayoutDashboard,
Users,
FolderOpen,
Building2,
HardDrive,
Activity,
Settings,
ShieldCheck,
Search,
Bell,
Cloud,
FileText,
Clock,
CheckCircle2,
TrendingUp,
ArrowRight,
LogOut,
Menu,
X,
ChevronRight,
UserRound,
Share2,
Upload,
} from "lucide-react";

const navigation = [
{ label: "Overview", icon: LayoutDashboard },
{ label: "Team Members", icon: Users },
{ label: "Department Files", icon: FolderOpen },
{ label: "Shared Files", icon: Share2 },
{ label: "Storage", icon: HardDrive },
{ label: "Activity Logs", icon: Activity },
{ label: "Settings", icon: Settings },
];

const pageContent = {
Overview: {
heading: "Welcome back",
subtitle:
"Manage your department, coordinate your team, and keep shared files organized.",
badge: "MANAGER WORKSPACE",
primary: "Manage team",
secondary: "Explore files",
},
"Team Members": {
heading: "Your team, one place.",
subtitle:
"Review your department members and keep track of your team's workspace.",
badge: "TEAM MANAGEMENT",
primary: "View team",
secondary: "Department files",
},
"Department Files": {
heading: "Your department files.",
subtitle:
"Keep department documents organized and accessible to authorized members.",
badge: "DEPARTMENT WORKSPACE",
primary: "Browse files",
secondary: "View shared files",
},
"Shared Files": {
heading: "Work better together.",
subtitle:
"Find and organize files shared with your department and team members.",
badge: "COLLABORATION CENTER",
primary: "Explore shared files",
secondary: "Department files",
},
Storage: {
heading: "Your storage overview.",
subtitle:
"Monitor department storage usage and keep your workspace organized.",
badge: "STORAGE MANAGEMENT",
primary: "View storage",
secondary: "Browse files",
},
"Activity Logs": {
heading: "Stay up to date.",
subtitle:
"Review workspace activity and keep track of changes across your department.",
badge: "ACTIVITY MONITOR",
primary: "Review activity",
secondary: "Manage team",
},
Settings: {
heading: "Your workspace settings.",
subtitle:
"Review your manager workspace and account information.",
badge: "WORKSPACE PREFERENCES",
primary: "Review account",
secondary: "View activity",
},
};


const colorStyles = {
blue: "bg-blue-50 text-blue-600",
violet: "bg-violet-50 text-violet-600",
emerald: "bg-emerald-50 text-emerald-600",
amber: "bg-amber-50 text-amber-600",
};

function ManagerDashboard() {
const [activePage, setActivePage] = useState("Overview");
const [sidebarOpen, setSidebarOpen] = useState(false);

const storedUser = (() => {
try {
return (
JSON.parse(localStorage.getItem("user")) ||
JSON.parse(sessionStorage.getItem("user")) ||
{}
);
} catch {
return {};
}
})();

const userName = storedUser.name || "Manager";
const userEmail = storedUser.email || "";
const initials = userName
.split(" ")
.filter(Boolean)
.map((part) => part[0])
.join("")
.slice(0, 2)
.toUpperCase();

const currentPage = pageContent[activePage];

const handleSignOut = () => {
localStorage.removeItem("token");
localStorage.removeItem("user");
sessionStorage.removeItem("token");
sessionStorage.removeItem("user");
window.location.href = "/login";
};

const selectPage = (label) => {
setActivePage(label);
setSidebarOpen(false);
};

const [teamMembers, setTeamMembers] = useState(0);
const metrics = [
  {
    title: "Team Members",
    value: teamMembers,
    description: "Members in your department",
    icon: Users,
    color: "blue",
  },
  {
    title: "Department Files",
    value: "—",
    description: "Files in your department",
    icon: FolderOpen,
    color: "purple",
  },
  {
    title: "Storage Used",
    value: "—",
    description: "Department storage usage",
    icon: HardDrive,
    color: "green",
  },
  {
    title: "Recent Activity",
    value: "—",
    description: "Recent team activities",
    icon: Activity,
    color: "orange",
  },
];


const handleHeroAction = (secondary = false) => {
const action = secondary
? currentPage.secondary
: currentPage.primary;


const destinations = {
  "Manage team": "Team Members",
  "View team": "Team Members",
  "Department files": "Department Files",
  "Explore files": "Department Files",
  "Browse files": "Department Files",
  "Explore shared files": "Shared Files",
  "View shared files": "Shared Files",
  "View storage": "Storage",
  "Review activity": "Activity Logs",
  "View activity": "Activity Logs",
  "Review account": "Settings",
};

if (action === "Explore shared files") {
  setActivePage("Shared Files");
} else {
  setActivePage(destinations[action] || activePage);
}


};

return ( <div className="min-h-screen bg-slate-50 text-slate-900">
{sidebarOpen && (
<button
type="button"
aria-label="Close navigation overlay"
className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
onClick={() => setSidebarOpen(false)}
/>
)}

```
  {/* Sidebar */}
  <aside
    className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    } lg:translate-x-0`}
  >
    <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
        <Cloud size={24} />
      </div>

      <div>
        <h1 className="text-lg font-extrabold tracking-tight">
          Secure<span className="text-blue-600">Cloud</span>
        </h1>
        <p className="text-[11px] text-slate-500">
          Private workspace
        </p>
      </div>

      <button
        type="button"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
        className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <X size={18} />
      </button>
    </div>

    <div className="px-4 pt-6">
      <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Workspace
      </p>

      <nav className="space-y-1">
        {navigation.map(({ label, icon: Icon }) => {
          const isActive = activePage === label;

          return (
            <button
              key={label}
              type="button"
              onClick={() => selectPage(label)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>

              {isActive && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </nav>
    </div>

    <div className="mt-auto p-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <ShieldCheck size={20} />
        </div>
        <h3 className="text-sm font-semibold">Secure workspace</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Manage your department and monitor shared files securely.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
      >
        <LogOut size={19} />
        Sign out
      </button>
    </div>
  </aside>

  {/* Main layout */}
  <div className="min-h-screen lg:pl-[248px]">
    {/* Topbar */}
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[11px] text-slate-400">
            SecureCloud / Manager
          </p>
          <h2 className="truncate text-base font-bold text-slate-900">
            {activePage}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden w-48 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 xl:flex">
          <Search size={16} className="text-slate-400" />
          <input
            type="search"
            placeholder="Search workspace..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
            {initials || "M"}
          </div>

          <div className="hidden sm:block">
            <p className="max-w-36 truncate text-xs font-semibold text-slate-900">
              {userName}
            </p>
            <p className="text-[11px] text-slate-500">Manager</p>
          </div>
        </div>
      </div>
    </header>

    {/* Page content */}
    <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-7">
      {/* Dynamic hero */}
      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white shadow-xl shadow-blue-100 sm:px-8 sm:py-9 lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-28 -z-10 h-72 w-72 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute right-36 top-24 -z-10 h-36 w-36 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wide">
            <ShieldCheck size={14} />
            {currentPage.badge}
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {currentPage.heading}
            {activePage === "Overview" && `, ${userName.split(" ")[0]}!`}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
            {currentPage.subtitle}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleHeroAction(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Users size={16} />
              {currentPage.primary}
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => handleHeroAction(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <FolderOpen size={16} />
              {currentPage.secondary}
            </button>
          </div>
        </div>

        <div className="absolute bottom-7 right-8 hidden h-32 w-32 items-center justify-center rounded-[28px] border border-white/20 bg-white/10 text-white/90 md:flex">
          {activePage === "Storage" ? (
            <HardDrive size={60} strokeWidth={1.3} />
          ) : activePage === "Team Members" ? (
            <Users size={60} strokeWidth={1.3} />
          ) : activePage === "Activity Logs" ? (
            <Activity size={60} strokeWidth={1.3} />
          ) : activePage === "Settings" ? (
            <Settings size={60} strokeWidth={1.3} />
          ) : (
            <Cloud size={64} strokeWidth={1.3} />
          )}
        </div>

        <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-xs font-medium text-blue-50">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Secure workspace
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            Role-based access
          </span>
          <span className="flex items-center gap-2">
            <Clock size={16} />
            Department overview
          </span>
        </div>
      </section>

      {/* Overview / page-specific heading */}
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {activePage === "Overview"
                ? "Department overview"
                : activePage}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activePage === "Overview"
                ? "A quick look at your team's workspace"
                : `Manage and review your ${activePage.toLowerCase()} workspace`}
            </p>
          </div>

          <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" />
            Awaiting live data connection
          </span>
        </div> 

        {activePage === "Overview" || activePage === "Storage" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ title, value, description, icon: Icon, color }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[color]}`}>
                    <Icon size={20} />
                  </div>
                  <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
                    {activePage === "Storage" && title === "Storage Used"
                      ? "Storage"
                      : "Overview"}
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-500">{title}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                  {value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: activePage,
                description: `Explore your ${activePage.toLowerCase()} workspace.`,
                icon:
                  activePage === "Team Members"
                    ? Users
                    : activePage === "Shared Files"
                      ? Share2
                      : activePage === "Activity Logs"
                        ? Activity
                        : activePage === "Settings"
                          ? Settings
                          : FolderOpen,
              },
              {
                title: "Access control",
                description: "Keep department access organized.",
                icon: ShieldCheck,
              },
              {
                title: "Workspace status",
                description: "Connect live data to display current details.",
                icon: CheckCircle2,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={21} />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {description}
                </p>
                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-600">
                  Workspace section
                  <ChevronRight size={15} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lower cards */}
      <section className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Common department management tasks
              </p>
            </div>
            <TrendingUp size={20} className="text-blue-600" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Team members",
                description: "Review your department team",
                icon: Users,
                page: "Team Members",
              },
              {
                title: "Department files",
                description: "Browse your workspace files",
                icon: FolderOpen,
                page: "Department Files",
              },
              {
                title: "Shared files",
                description: "Explore team-shared documents",
                icon: Share2,
                page: "Shared Files",
              },
              {
                title: "Activity logs",
                description: "Review recent workspace activity",
                icon: Activity,
                page: "Activity Logs",
              },
            ].map(({ title, description, icon: Icon, page }) => (
              <button
                key={title}
                type="button"
                onClick={() => selectPage(page)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-bold">Account security</h2>
              <p className="mt-1 text-xs text-slate-500">
                Your manager session
              </p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-3 py-4">
              <span className="text-sm text-slate-500">Account role</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase text-blue-700">
                Manager
              </span>
            </div>

            <div className="py-4">
              <p className="text-sm text-slate-500">Email address</p>
              <p className="mt-1 break-all text-sm font-semibold">
                {userEmail || "Email unavailable"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 py-4">
              <span className="text-sm text-slate-500">Session</span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 size={12} />
                Signed in
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400">
        <p>© 2026 SecureCloud. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <ShieldCheck size={14} />
          Secure department workspace
        </p>
      </footer>
    </main>
  </div>
</div>

);
}

export default ManagerDashboard;
