import { useMemo, useState } from "react";

import knowledgeBaseService from "@/services/knowledgeBaseService";

function createMessage(role, content, sources = []) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    sources,
  };
}

function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState(() => [
    createMessage(
      "assistant",
      "Hi, I’m the AI support assistant. Ask a product or support question and I’ll answer from the uploaded knowledge base.",
    ),
  ]);

  const hasConversation = useMemo(() => messages.length > 1, [messages.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || isSubmitting) {
      return;
    }

    const question = draft.trim();
    const userMessage = createMessage("user", question);
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsSubmitting(true);

    try {
      const response = await knowledgeBaseService.askQuestion(question);
      setMessages((current) => [...current, createMessage("assistant", response.answer, response.sources || [])]);
    } catch (requestError) {
      const fallbackMessage =
        requestError.response?.data?.detail ||
        "I’m unable to answer right now. Please try again after the knowledge base is configured.";
      setMessages((current) => [...current, createMessage("assistant", fallbackMessage)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {isOpen ? (
        <div className="w-[380px] max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="text-sm font-semibold">AI Support</p>
              <p className="text-xs text-slate-300">RAG customer support assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="max-h-[460px] space-y-4 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" && message.sources?.length ? (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sources</p>
                      {message.sources.map((source, index) => (
                        <div key={`${message.id}-${source.document_id}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-700">
                            {source.filename}
                            {source.page_number ? ` • Page ${source.page_number}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{source.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {!hasConversation ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                Try asking about onboarding, pricing, setup steps, feature usage, or troubleshooting.
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
            <textarea
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a support question..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Answers are grounded in uploaded PDFs.</p>
              <button
                type="submit"
                disabled={isSubmitting || !draft.trim()}
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-brand-700"
      >
        {isOpen ? "Hide Support" : "Ask AI Support"}
      </button>
    </div>
  );
}

export default SupportChatWidget;
