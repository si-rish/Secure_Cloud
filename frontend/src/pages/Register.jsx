import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Cloud, ArrowRight, UserPlus, Building2 } from "lucide-react";
import authService from "../services/authService";
import Logo from "../components/common/Logo";
import Button from "../components/common/Button";
import Input from "../components/common/Input";

function Register() {
const [form, setForm] = useState({
name: "",
email: "",
password: "",
confirmPassword: "",
organizationMode: "create",
organizationName: "",
organizationId: "",
});

const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);
const [success, setSuccess] = useState("");

function handleChange(event) {
const { name, value } = event.target;


setForm((current) => ({
  ...current,
  [name]: value,
}));

setErrors((current) => ({
  ...current,
  [name]: "",
  submit: "",
  ...(name === "password" ? { confirmPassword: "" } : {}),
}));

setSuccess("");


}

function handleModeChange(event) {
const organizationMode = event.target.value;


setForm((current) => ({
  ...current,
  organizationMode,
  organizationName: "",
  organizationId: "",
}));

setErrors({});
setSuccess("");


}

async function handleSubmit(event) {
event.preventDefault();


const newErrors = {};

if (!form.name.trim()) {
  newErrors.name = "Please enter your full name.";
} else if (form.name.trim().length > 100) {
  newErrors.name = "Name cannot exceed 100 characters.";
}

if (!form.email.trim()) {
  newErrors.email = "Please enter your email address.";
}

if (form.password.length < 8 || form.password.length > 72) {
  newErrors.password = "Password must contain 8–72 characters.";
}

if (form.password !== form.confirmPassword) {
  newErrors.confirmPassword = "Passwords do not match.";
}

if (form.organizationMode === "create") {
  if (!form.organizationName.trim()) {
    newErrors.organizationName = "Please enter your organization name.";
  } else if (
    form.organizationName.trim().length < 2 ||
    form.organizationName.trim().length > 150
  ) {
    newErrors.organizationName =
      "Organization name must contain 2–150 characters.";
  }
}

if (form.organizationMode === "join") {
  if (!form.organizationId.trim()) {
    newErrors.organizationId = "Please enter your organization ID.";
  } else if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      form.organizationId.trim()
    )
  ) {
    newErrors.organizationId = "Enter a valid organization UUID.";
  }
}

setErrors(newErrors);
setSuccess("");

if (Object.keys(newErrors).length > 0) {
  return;
}

try {
  setLoading(true);

  const registrationData = {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    organizationMode: form.organizationMode,
    ...(form.organizationMode === "create"
      ? { organizationName: form.organizationName.trim() }
      : { organizationId: form.organizationId.trim() }),
  };

  await authService.register(registrationData);

  setSuccess(
    form.organizationMode === "create"
      ? "Organization created and account registered successfully! You can now sign in."
      : "Account registered successfully! You can now sign in."
  );

  setForm({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationMode: "create",
    organizationName: "",
    organizationId: "",
  });
} catch (error) {
  const response = error.response?.data;

  setErrors({
    submit:
      response?.message ||
      response?.error?.message ||
      "Registration failed. Please check your details and try again.",
  });
} finally {
  setLoading(false);
}


}

return ( <div className="grid min-h-screen bg-white lg:grid-cols-2">
{/* Left branding panel */} <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex xl:p-16"> <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" /> <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

```
    <div className="relative z-10">
      <Logo />
    </div>

    <div className="relative z-10 max-w-lg">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-400">
        <Cloud size={34} />
      </div>

      <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
        Your files.
        <br />
        Your control.
        <br />
        <span className="text-blue-400">Your secure cloud.</span>
      </h1>

      <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
        Create your organization or join an existing workspace to manage
        files securely.
      </p>

      <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
        <ShieldCheck size={20} className="text-emerald-400" />
        Secure access with account-based authentication
      </div>
    </div>

    <p className="relative z-10 text-sm text-slate-500">
      © {new Date().getFullYear()} SecureCloud. All rights reserved.
    </p>
  </section>

  {/* Registration form */}
  <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
    <div className="w-full max-w-md">
      <div className="mb-8 lg:hidden">
        <div className="inline-flex rounded-xl bg-slate-950 p-3">
          <Logo />
        </div>
      </div>

      <div className="mb-7">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <UserPlus size={25} />
        </div>

        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          Get started
        </p>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Create your account
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Set up your secure workspace in a few steps.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organization mode */}
        <div>
          <label
            htmlFor="organizationMode"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Organization option
          </label>

          <select
            id="organizationMode"
            name="organizationMode"
            value={form.organizationMode}
            onChange={handleModeChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="create">Create a new organization</option>
            <option value="join">Join an existing organization</option>
          </select>
        </div>

        {form.organizationMode === "create" ? (
          <Input
            label="Organization name"
            name="organizationName"
            type="text"
            placeholder="e.g. Acme Technologies"
            value={form.organizationName}
            onChange={handleChange}
            error={errors.organizationName}
            required
          />
        ) : (
          <Input
            label="Organization ID"
            name="organizationId"
            type="text"
            placeholder="Enter your organization's UUID"
            value={form.organizationId}
            onChange={handleChange}
            error={errors.organizationId}
            required
          />
        )}

        <Input
          label="Full name"
          name="name"
          type="text"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          error={errors.name}
          required
        />

        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          error={errors.email}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          error={errors.password}
          required
        />

        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Enter your password again"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          error={errors.confirmPassword}
          required
        />

        {form.organizationMode === "create" && (
          <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            <Building2 size={19} className="mt-0.5 shrink-0" />
            <p>
              You'll become the organization's first administrator.
            </p>
          </div>
        )}

        {form.organizationMode === "join" && (
          <div className="flex gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
            <ShieldCheck size={19} className="mt-0.5 shrink-0" />
            <p>
              You'll join with the standard user role. Make sure you have
              permission to join this organization.
            </p>
          </div>
        )}

        {errors.submit && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errors.submit}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : form.organizationMode === "create"
              ? "Create organization & account"
              : "Join organization"}
          {!loading && <ArrowRight size={18} />}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Secure access
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          Sign in
        </Link>
      </p>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck size={15} />
        Your workspace is protected by SecureCloud
      </div>
    </div>
  </section>
</div>


);
}

export default Register;
