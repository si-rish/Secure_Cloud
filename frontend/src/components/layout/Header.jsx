import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
Cloud,
LayoutDashboard,
FolderOpen,
UserRound,
LogIn,
LogOut,
} from "lucide-react";
import authService from "../../services/authService";

export default function Header() {
const navigate = useNavigate();
const location = useLocation();

const [isLoggedIn, setIsLoggedIn] = useState(() =>
Boolean(authService.getToken())
);

const [user, setUser] = useState(() =>
authService.getUser() || {}
);

useEffect(() => {
const syncAuthState = () => {
const token = authService.getToken();
const storedUser = authService.getUser();


  setIsLoggedIn(Boolean(token && storedUser));
  setUser(storedUser || {});
};

syncAuthState();

window.addEventListener("storage", syncAuthState);
window.addEventListener("auth-changed", syncAuthState);

return () => {
  window.removeEventListener("storage", syncAuthState);
  window.removeEventListener("auth-changed", syncAuthState);
};


}, [location.pathname]);

const navItems = [
{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
{ label: "My Files", icon: FolderOpen, path: "/my-files" },
{ label: "Profile", icon: UserRound, path: "/profile" },
];

const handleLogout = () => {
authService.logout();
setIsLoggedIn(false);
setUser({});
navigate("/login", { replace: true });
};

return ( <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"> <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-8">
<button
type="button"
onClick={() => navigate(isLoggedIn ? "/dashboard" : "/login")}
className="flex shrink-0 items-center gap-2.5"
aria-label="SecureCloud home"
> <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"> <Cloud size={23} /> </span>

      <span className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        Secure<span className="text-blue-600">Cloud</span>
      </span>
    </button>

    <nav className="flex items-center gap-1 sm:gap-2">
      {isLoggedIn ? (
        <>
          {navItems.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-medium transition sm:px-3 ${
                location.pathname === path
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Icon size={18} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}

          <div className="mx-1 hidden h-8 border-l border-slate-200 sm:block" />

          <div className="hidden max-w-36 text-right sm:block">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.email || ""}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="ml-1 flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-red-600 transition hover:bg-red-100"
          >
            <LogOut size={18} />
            <span className="hidden text-sm font-semibold lg:inline">
              Logout
            </span>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="ml-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-700"
        >
          <LogIn size={18} />
          <span className="text-sm font-semibold">Login</span>
        </button>
      )}
    </nav>
  </div>
</header>


);
}
