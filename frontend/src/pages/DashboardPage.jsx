import { useEffect, useMemo, useState } from "react";

import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import FollowUpPanel from "@/components/FollowUpPanel";
import LeadForm from "@/components/LeadForm";
import LeadTable from "@/components/LeadTable";
import useAuth from "@/hooks/useAuth";
import knowledgeBaseService from "@/services/knowledgeBaseService";
import leadService from "@/services/leadService";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "new",
  source: "other",
};

function DashboardPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const [leadData, documentData] = await Promise.all([leadService.getLeads(), knowledgeBaseService.getDocuments()]);
        setLeads(leadData);
        setDocuments(documentData);
      } catch (requestError) {
        setPageError(requestError.response?.data?.detail || "Unable to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const summary = useMemo(() => {
    const wonLeads = leads.filter((lead) => lead.status === "won").length;
    const newLeads = leads.filter((lead) => lead.status === "new").length;
    const activePipeline = leads.filter((lead) => !["won", "lost"].includes(lead.status)).length;

    return {
      total: leads.length,
      won: wonLeads,
      new: newLeads,
      activePipeline,
    };
  }, [leads]);

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedLead(null);
    setFormError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      if (selectedLead) {
        const updatedLead = await leadService.updateLead(selectedLead.id, formData);
        setLeads((current) => current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
      } else {
        const createdLead = await leadService.createLead(formData);
        setLeads((current) => [createdLead, ...current]);
      }

      resetForm();
    } catch (requestError) {
      setFormError(requestError.response?.data?.detail || "Unable to save the lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (lead) => {
    setSelectedLead(lead);
    setFormError("");
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      source: lead.source,
    });
  };

  const handleDelete = async (leadId) => {
    setDeletingLeadId(leadId);
    setPageError("");

    try {
      await leadService.deleteLead(leadId);
      setLeads((current) => current.filter((lead) => lead.id !== leadId));
      if (selectedLead?.id === leadId) {
        resetForm();
      }
    } catch (requestError) {
      setPageError(requestError.response?.data?.detail || "Unable to delete the lead.");
    } finally {
      setDeletingLeadId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">CRM Module</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Lead management dashboard</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Manage the full lead pipeline from one dashboard: create leads, review the table, update statuses, and
          remove records when they are no longer needed.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Leads</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">New</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.new}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active Pipeline</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.activePipeline}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Won</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.won}</p>
          </div>
        </div>
      </div>

      {pageError && !isLoading ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      <AnalyticsDashboard leads={leads} documents={documents} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <LeadTable
          leads={leads}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingLeadId={deletingLeadId}
          isLoading={isLoading}
        />
        <div className="space-y-6">
          <LeadForm
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            error={formError}
            isSubmitting={isSubmitting}
            isEditing={Boolean(selectedLead)}
            assignedUserLabel={selectedLead?.assigned_user?.name || user?.name || user?.email || "Current user"}
          />
          {selectedLead ? <FollowUpPanel lead={selectedLead} /> : null}
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
