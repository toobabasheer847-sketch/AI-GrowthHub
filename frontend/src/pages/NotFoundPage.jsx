import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">Page not found</h1>
      <p className="mt-4 text-slate-500">The route you requested does not exist in this initial SaaS setup.</p>
      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
