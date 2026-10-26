import { Cloud } from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <Cloud size={26} strokeWidth={2.2} />
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-white">
        Secure<span className="text-blue-400">Cloud</span>
      </h1>
    </div>
  );
}

export default Logo;