import { useEffect, useState } from "react";

import PrimaryButton from "@/components/PrimaryButton";
import followUpService from "@/services/followUpService";

function FollowUpPanel({ lead }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [draft, setDraft] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [activeFollowUpId, setActiveFollowUpId] = useState(null);

  const loadFollowUps = async () => {
    if (!lead?.id) {
      return;
    }

    try {
      const data = await followUpService.getFollowUpsForLead(lead.id);
      setFollowUps(data);
      if (data.length > 0) {
        setActiveFollowUpId(data[0].id);
        setDraft(data[0].ai_draft || "");
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [lead?.id]);

  const handleSchedule = async (event) => {
    event.preventDefault();
    if (!lead?.id || !scheduledAt) {
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
      await loadFollowUps();
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
      await loadFollowUps();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to generate the draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!activeFollowUpId) {
      setMessage("No follow-up selected.");
      return;
    }

    setIsSending(true);
    setMessage("");

    try {
      await followUpService.sendFollowUp(activeFollowUpId);
      setMessage("Email sent successfully.");
      await loadFollowUps();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to send the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Automated AI Email Follow-up</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Follow-up automation</h2>
          <p className="mt-2 text-sm text-slate-500">
            Schedule a follow-up, generate a polished AI draft, and send it in one workflow.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSchedule}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Schedule for</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>

        <PrimaryButton className="w-full" type="submit" disabled={isScheduling}>
          {isScheduling ? "Scheduling..." : "Schedule follow-up"}
        </PrimaryButton>
      </form>

      <div className="mt-6 space-y-4">
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
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</div> : null}

      {followUps.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recent follow-ups</p>
          <ul className="space-y-2">
            {followUps.map((followUp) => (
              <li key={followUp.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>{new Date(followUp.scheduled_at).toLocaleString()}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {followUp.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default FollowUpPanel;
