import { Link } from "react-router-dom";

import useAuth from "@/hooks/useAuth";

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Production-ready starter
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          AI GrowthHub now ships with a document-powered support chatbot.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Manage support content from the new knowledge base, index PDFs with a LangChain RAG pipeline,
          and let customers ask questions through the embedded AI support widget.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
          >
            {isAuthenticated ? "Open dashboard" : "Go to login"}
          </Link>
          <a
            href="https://fastapi.tiangolo.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            FastAPI Docs
          </a>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white shadow-soft">
        <p className="text-sm font-medium text-brand-300">Included in phase one</p>
        <ul className="mt-6 space-y-4 text-sm text-slate-300">
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Customer support AI chat widget</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Knowledge base PDF upload and indexing</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">LangChain + OpenAI embeddings + ChromaDB</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">React + Vite + Tailwind CSS</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">FastAPI modular routing and config</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-4">JWT auth, PostgreSQL, and internal team tools</li>
        </ul>
      </div>
    </section>
  );
}

export default HomePage;
