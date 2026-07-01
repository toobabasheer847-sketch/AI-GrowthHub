import { useEffect, useMemo, useState } from "react";

import useAuth from "@/hooks/useAuth";
import knowledgeBaseService from "@/services/knowledgeBaseService";

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function KnowledgeBasePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const [pageError, setPageError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const data = await knowledgeBaseService.getDocuments();
        setDocuments(data);
      } catch (requestError) {
        setPageError(requestError.response?.data?.detail || "Unable to load knowledge base documents.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const summary = useMemo(() => {
    const readyDocuments = documents.filter((document) => document.status === "ready");
    const failedDocuments = documents.filter((document) => document.status === "failed");

    return {
      total: documents.length,
      ready: readyDocuments.length,
      failed: failedDocuments.length,
      chunks: readyDocuments.reduce((total, document) => total + document.chunk_count, 0),
    };
  }, [documents]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setPageError("");
    setUploadMessage("");

    if (!selectedFile) {
      setPageError("Choose a PDF file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCompleted(false);
    setUploadMessage("");

    try {
      const createdDocument = await knowledgeBaseService.uploadDocument(selectedFile, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      setDocuments((current) => [createdDocument, ...current]);
      setUploadProgress(100);
      setUploadCompleted(true);
      setUploadMessage(`Indexed ${createdDocument.original_filename} successfully.`);
      setSelectedFile(null);
      event.target.reset();
    } catch (requestError) {
      setPageError(requestError.response?.data?.detail || "Unable to upload and index the PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Knowledge Base</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">RAG document management</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Upload support PDFs, extract their text, generate OpenAI embeddings, store vectors in ChromaDB, and make
          the content available to the customer support chatbot.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Documents</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Indexed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.ready}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.failed}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vector Chunks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.chunks}</p>
          </div>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      {uploadMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {uploadMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-slate-950">Upload documents</h2>
          <p className="mt-2 text-sm text-slate-500">
            Admins can upload support PDFs, Word docs, spreadsheets, or text files here. The backend extracts text, chunks it, and indexes it for RAG.
          </p>

          {isAdmin ? (
            <form className="mt-6 space-y-4" onSubmit={handleUpload}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Document file</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
                />
              </label>

              {isUploading ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Uploading and indexing</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}

              {uploadCompleted ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-base">
                    ✓
                  </span>
                  Processing complete
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploading ? "Uploading and indexing..." : "Upload document"}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your account can view the indexed document list, but only admins can upload new PDFs.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Indexed Documents</h2>
              <p className="mt-2 text-sm text-slate-500">Track upload status, extracted pages, and chunk counts.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading documents...</p>
            ) : documents.length ? (
              documents.map((document) => (
                <article key={document.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-950">{document.original_filename}</h3>
                      <p className="mt-1 text-sm text-slate-500">Uploaded {formatDateTime(document.created_at)}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
                        document.status === "ready"
                          ? "bg-emerald-50 text-emerald-700"
                          : document.status === "failed"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pages</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{document.page_count}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Chunks</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{document.chunk_count}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Type</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">PDF</p>
                    </div>
                  </div>

                  {document.failure_reason ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {document.failure_reason}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                No PDFs have been uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default KnowledgeBasePage;
