import { ShieldCheck, Cloud } from "lucide-react";

export default function Footer() {
return ( <footer className="mt-auto border-t border-slate-200 bg-white"> <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8">
{/* Branding */} <div className="flex items-center gap-3"> <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"> <Cloud size={20} /> </div>


      <div>
        <p className="text-sm font-bold text-slate-800">
          Secure<span className="text-blue-600">Cloud</span>
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          Your files, your control.
        </p>
      </div>
    </div>

    {/* Copyright */}
    <p className="text-center text-xs text-slate-500 sm:text-sm">
      © {new Date().getFullYear()} SecureCloud. All rights reserved.
    </p>

    {/* Security indicator */}
    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2">
      <ShieldCheck size={16} className="text-emerald-600" />

      <span className="text-xs font-semibold text-emerald-700">
        Secure Workspace
      </span>
    </div>
  </div>
</footer>


);
}
