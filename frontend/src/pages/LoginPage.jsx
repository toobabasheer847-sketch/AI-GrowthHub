import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import PrimaryButton from "@/components/PrimaryButton";
import useAuth from "@/hooks/useAuth";

const initialState = {
  email: "",
  password: "",
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from || "/dashboard";

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
    setIsSubmitting(true);

    try {
      await login(formData);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Unable to sign in. Check your credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Authentication</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sign in to AI GrowthHub</h1>
        <p className="mt-3 text-sm text-slate-500">
          Sign in with your email and password to access protected SaaS routes powered by the FastAPI backend.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <PrimaryButton className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link className="font-medium text-brand-700 hover:text-brand-800" to="/register">
          Create one
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
