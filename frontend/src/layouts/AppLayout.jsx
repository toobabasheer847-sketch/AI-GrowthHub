import { Link, Outlet, useLocation } from "react-router-dom";

import PrimaryButton from "@/components/PrimaryButton";
import SupportChatWidget from "@/components/SupportChatWidget";
import useAuth from "@/hooks/useAuth";

function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
              AG
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI GrowthHub</p>
              <p className="text-xs text-slate-500">SaaS foundation starter</p>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className={`rounded-full px-4 py-2 text-sm transition ${
                location.pathname === "/" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className={`rounded-full px-4 py-2 text-sm transition ${
                location.pathname === "/dashboard"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/chat"
              className={`rounded-full px-4 py-2 text-sm transition ${
                location.pathname === "/chat"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Chat
            </Link>
            {isAuthenticated ? (
              <Link
                to="/knowledge-base"
                className={`rounded-full px-4 py-2 text-sm transition ${
                  location.pathname === "/knowledge-base"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Knowledge Base
              </Link>
            ) : null}
            {isAuthenticated ? (
              <>
                <div className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 md:block">
                  {user?.name || user?.email}
                </div>
                <PrimaryButton onClick={logout}>Sign out</PrimaryButton>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    location.pathname === "/register"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                >
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>

      <SupportChatWidget />
    </div>
  );
}

export default AppLayout;
