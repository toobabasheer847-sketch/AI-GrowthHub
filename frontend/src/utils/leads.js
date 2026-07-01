export const leadStatusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const leadSourceOptions = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "ads", label: "Ads" },
  { value: "other", label: "Other" },
];

export function formatLeadValue(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLeadStatusClasses(status) {
  const styles = {
    new: "bg-sky-50 text-sky-700 ring-sky-200",
    contacted: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    qualified: "bg-amber-50 text-amber-700 ring-amber-200",
    proposal: "bg-purple-50 text-purple-700 ring-purple-200",
    won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    lost: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return styles[status] || "bg-slate-50 text-slate-700 ring-slate-200";
}
