import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function AnalyticsDashboard({ leads = [], documents = [] }) {
  const statusData = [
    { name: "New", value: leads.filter((lead) => lead.status === "new").length },
    { name: "Contacted", value: leads.filter((lead) => lead.status === "contacted").length },
    { name: "Won", value: leads.filter((lead) => lead.status === "won").length },
    { name: "Lost", value: leads.filter((lead) => lead.status === "lost").length },
  ];

  const activityData = [
    { day: "Mon", queries: 18 },
    { day: "Tue", queries: 24 },
    { day: "Wed", queries: 16 },
    { day: "Thu", queries: 31 },
    { day: "Fri", queries: 27 },
    { day: "Sat", queries: 19 },
    { day: "Sun", queries: 22 },
  ];

  const summaryCards = [
    { label: "Total Leads", value: leads.length, accent: "bg-brand-50 text-brand-700" },
    { label: "Won Leads", value: leads.filter((lead) => lead.status === "won").length, accent: "bg-emerald-50 text-emerald-700" },
    { label: "Documents in Knowledge Base", value: documents.length, accent: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Analytics</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Pipeline performance</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 ${card.accent}`}>
            <p className="text-xs uppercase tracking-[0.18em]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Lead distribution by status</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Daily AI activity</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="queries" stroke="#0f766e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
