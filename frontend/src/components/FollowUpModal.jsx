import { useEffect, useState } from "react";

import PrimaryButton from "@/components/PrimaryButton";
import followUpService from "@/services/followUpService";

function FollowUpModal({ isOpen, lead, onClose }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [draft, setDraft] = useState("");
  const [activeFollowUpId, setActiveFollowUpId] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setScheduledAt("");
      setDraft("");
      setActiveFollowUpId(null);
      setMessage("");
      setIsScheduling(false);
      setIsGenerating(false);
      setIsSending(false);
      return;
    }

    if (!lead?.id) {
      return;
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) {
    return null;
  }

  const handleSchedule = async (event) => {
    event.preventDefault();

    if (!lead?.id || !scheduledAt) {
      setMessage("Choose a date and time for the follow-up.");
      return;
    }

    setIsScheduling(true);
    setMessage("");

    try {
      const created = await followUpService.scheduleFollowUp({
        lead_id: lead.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        is_automated: true,
      });
      setActiveFollowUpId(created.id);
      setDraft(created.ai_draft || "");
      setMessage("Follow-up scheduled successfully.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to schedule the follow-up.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!activeFollowUpId) {
      setMessage("Schedule a follow-up first.");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      const updated = await followUpService.generateDraft(activeFollowUpId, { notes: lead?.notes || "" });
      setDraft(updated.ai_draft || "");
      setMessage("AI draft generated.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to generate the draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!activeFollowUpId) {
      setMessage("Schedule and generate a draft before sending.");
      return;
    }

    setIsSending(true);
    setMessage("");

    try {
      await followUpService.sendFollowUp(activeFollowUpId);
      setMessage("Email sent successfully.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to send the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">AI Follow-up</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Follow up with {lead.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{lead.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Selected lead</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{lead.name}</p>
            <p className="mt-1 text-sm text-slate-600">{lead.company}</p>
          </div>

          <form className="space-y-4" onSubmit={handleSchedule}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Schedule next follow-up</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>

            <PrimaryButton className="w-full" type="submit" disabled={isScheduling}>
              {isScheduling ? "Scheduling..." : "Schedule Follow-up"}
            </PrimaryButton>
          </form>

          <PrimaryButton className="w-full" type="button" onClick={handleGenerateDraft} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate AI Follow-up Draft"}
          </PrimaryButton>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email draft</span>
            <textarea
              className="min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>

          <PrimaryButton className="w-full" type="button" onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send Email"}
          </PrimaryButton>

          {message ? <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default FollowUpModal;
