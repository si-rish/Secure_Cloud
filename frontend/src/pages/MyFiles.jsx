import { Files } from "lucide-react";

export default function MyFiles() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <Files size={30} className="text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">My Files</h1>
        </div>
        <p className="mt-3 text-slate-600">
          Your file workspace will appear here.
        </p>
      </div>
    </main>
  );
}