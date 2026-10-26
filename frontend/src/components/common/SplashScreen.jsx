import { useEffect } from "react";
import { Cloud } from "lucide-react";

function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden bg-[#030817]">
      {/* Background glow */}
      <div className="absolute h-72 w-72 animate-pulse rounded-full bg-blue-600/20 blur-[100px]" />

      {/* Logo and brand */}
      <div className="relative flex flex-col items-center animate-[fadeIn_0.8s_ease-out_both]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-500/30 animate-[logoPop_0.7s_ease-out_both]">
          <Cloud size={44} strokeWidth={1.8} />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
          Secure<span className="text-blue-400">Cloud</span>
        </h1>

        <p className="mt-3 text-sm tracking-[0.25em] text-slate-400">
          YOUR FILES. YOUR CONTROL.
        </p>

        {/* Loading indicator */}
        <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-full origin-left animate-[loadingBar_1.5s_ease-in-out_forwards] rounded-full bg-blue-500" />
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes logoPop {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes loadingBar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;