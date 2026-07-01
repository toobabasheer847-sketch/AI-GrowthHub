import PrimaryButton from "@/components/PrimaryButton";
import { leadSourceOptions, leadStatusOptions } from "@/utils/leads";

function LeadForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  error,
  isSubmitting,
  isEditing,
  assignedUserLabel,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Lead Form</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {isEditing ? "Update lead" : "Create lead"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Capture and manage CRM leads with a clean SaaS workflow and Tailwind-based UI.
          </p>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            required
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              type="text"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Company</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            type="text"
            name="company"
            value={formData.company}
            onChange={onChange}
            required
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              name="status"
              value={formData.status}
              onChange={onChange}
            >
              {leadStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Source</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              name="source"
              value={formData.source}
              onChange={onChange}
            >
              {leadSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Assigned user</span>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {assignedUserLabel}
          </div>
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <PrimaryButton className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating lead..." : "Creating lead...") : isEditing ? "Update lead" : "Create lead"}
        </PrimaryButton>
      </form>
    </div>
  );
}

export default LeadForm;
