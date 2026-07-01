import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

function EyeIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M2.5 12s3.2-5.5 9.5-5.5S21.5 12 21.5 12s-3.2 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9 5.3A11.8 11.8 0 0 1 12 4.5c6.3 0 9.5 7.5 9.5 7.5a19.3 19.3 0 0 1-3.2 4.1" />
      <path d="M6.3 8.3A19.8 19.8 0 0 0 2.5 12s3.2 5.5 9.5 5.5c1.1 0 2.1-.1 3-.3" />
    </svg>
  );
}

import PrimaryButton from "@/components/PrimaryButton";
import useAuth from "@/hooks/useAuth";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, register } = useAuth();
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Unable to create your account.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Registration</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create your AI GrowthHub account</h1>
        <p className="mt-3 text-sm text-slate-500">
          Register with your name, email, and password. The first account becomes `admin`; later accounts default to
          the `user` role.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              required
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <PrimaryButton className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link className="font-medium text-brand-700 hover:text-brand-800" to="/login">
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default RegisterPage;
