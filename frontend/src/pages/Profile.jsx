import { useNavigate } from "react-router-dom";
import { UserRound, ArrowLeft, ShieldCheck } from "lucide-react";
import authService from "../services/authService";

export default function Profile() {
  const navigate = useNavigate();
  const user = authService.getUser();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-4 text-blue-600">
              <UserRound size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                My Profile
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Your SecureCloud account details
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <p className="text-sm text-slate-500">Full name</p>
              <p className="mt-1 font-semibold">
                {user?.name || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Email address</p>
              <p className="mt-1 font-semibold">
                {user?.email || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Account role</p>
              <p className="mt-1 font-semibold capitalize">
                {user?.role || "User"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <ShieldCheck size={20} className="shrink-0" />
            <p>Your account is protected by SecureCloud authentication.</p>
          </div>
        </div>
      </div>
    </main>
  );
}