import { formatLeadValue, getLeadStatusClasses } from "@/utils/leads";

function LeadTable({ leads, onEdit, onDelete, deletingLeadId, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-soft">
        Loading leads...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Lead Pipeline</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Lead table</h2>
        <p className="mt-2 text-sm text-slate-500">View, update, and delete leads from a central CRM workspace.</p>
      </div>

      {leads.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">No leads yet. Create your first lead to start the pipeline.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Assigned User</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{lead.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{lead.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{lead.company}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getLeadStatusClasses(
                        lead.status,
                      )}`}
                    >
                      {formatLeadValue(lead.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatLeadValue(lead.source)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-900">{lead.assigned_user?.name}</p>
                      <p className="mt-1">{lead.assigned_user?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => onEdit(lead)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(lead.id)}
                        disabled={deletingLeadId === lead.id}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingLeadId === lead.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeadTable;
