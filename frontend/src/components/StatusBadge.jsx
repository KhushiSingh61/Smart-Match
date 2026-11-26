import React from 'react'

const STATUS_STYLES = {
  Applied: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-sky-50 text-sky-700 border-sky-200',
  Shortlisted: 'bg-teal-50 text-teal-700 border-teal-200',
  Interview: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Selected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  const label = status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : status
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  )
}
