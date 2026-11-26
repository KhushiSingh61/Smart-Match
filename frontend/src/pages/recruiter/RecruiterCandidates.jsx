import React, { useCallback, useEffect, useState } from 'react'
import {
  CheckSquare,
  Download,
  Eye,
  FileText,
  GitCompare,
  Search,
  Square,
  Users,
  X,
} from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { applicationsAPI, jobsAPI, resumesAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import MatchScoreRing from '../../components/MatchScoreRing'

const STATUS_OPTIONS = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
]

export default function RecruiterCandidates() {
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('score_desc')
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [compareIds, setCompareIds] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [newStatus, setNewStatus] = useState('Applied')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [feedback, setFeedback] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { sort_by: sortBy }
      if (jobFilter) params.job_id = jobFilter
      if (statusFilter) params.status = statusFilter
      if (search.trim()) params.search = search.trim()

      const [appsRes, jobsRes] = await Promise.all([
        applicationsAPI.listForRecruiter(params),
        jobsAPI.list({ mine: true }),
      ])
      setApplications(appsRes.data)
      setJobs(jobsRes.data)
    } finally {
      setLoading(false)
    }
  }, [jobFilter, statusFilter, sortBy, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openReport = (app) => {
    setSelectedApp(app)
    setNewStatus(app.status)
    setStatusNote(app.recruiter_notes || '')
  }

  const toggleCompare = (id) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const handleStatusSave = async (e) => {
    e.preventDefault()
    if (!selectedApp) return
    setUpdatingStatus(true)
    try {
      const { data } = await applicationsAPI.updateStatus(selectedApp.id, {
        status: newStatus,
        recruiter_notes: statusNote,
      })
      setApplications((prev) => prev.map((a) => (a.id === data.id ? data : a)))
      setSelectedApp(data)
      setFeedback(`Updated ${data.candidate?.full_name}'s status to ${data.status}.`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDownloadResume = async (resumeId, filename) => {
    try {
      const response = await resumesAPI.downloadBlob(resumeId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || 'resume')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Could not download resume file.')
    }
  }

  const comparedApps = applications.filter((a) => compareIds.includes(a.id))

  return (
    <RecruiterLayout
      title="Candidate Management"
      subtitle="Inspect applicants, view extracted resume details, compare candidates, and update hiring statuses."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters & Compare Bar */}
        <div className="card-surface p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ref, skill..."
                className="input-field pl-9"
              />
            </div>

            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="score_desc">Sort: Highest Match Score</option>
              <option value="score_asc">Sort: Lowest Match Score</option>
              <option value="newest">Sort: Most Recent</option>
            </select>
          </div>

          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="btn-primary shrink-0"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({compareIds.length})
            </button>
          )}
        </div>

        {/* Candidates Table */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading candidates...</div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidate applications yet"
            description="When candidates apply to your active job postings, their resumes, extracted skills, and explainable match reports will appear here."
          />
        ) : (
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Compare</th>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-left">Applied Job</th>
                    <th className="px-4 py-3 text-left">Extracted Skills</th>
                    <th className="px-4 py-3 text-left">Match Score</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const isChecked = compareIds.includes(app.id)
                    const skills = app.resume?.extracted_skills || []
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleCompare(app.id)}
                            className="text-slate-500 hover:text-teal-600"
                            title="Select up to 3 candidates to compare"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">
                            {app.candidate?.full_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {app.candidate?.reference_code} &bull; {app.candidate?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">
                          {app.job?.title}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {skills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs"
                              >
                                {s}
                              </span>
                            ))}
                            {skills.length > 4 && (
                              <span className="text-xs text-slate-400">
                                +{skills.length - 4}
                              </span>
                            )}
                            {skills.length === 0 && (
                              <span className="text-xs text-slate-400">Not extracted</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900">
                            {app.match_score !== null ? `${app.match_score}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openReport(app)}
                            className="btn-secondary py-1.5 px-3 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect Report
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Candidate Inspection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Candidate Inspection Report &bull; {selectedApp.candidate?.full_name}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedApp.candidate?.reference_code} &bull; Applied for{' '}
                  {selectedApp.job?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Score & Human Review Reminder */}
              <div className="grid md:grid-cols-12 gap-6 items-center bg-slate-50 rounded-xl p-5 border border-slate-200/80">
                <div className="md:col-span-3 flex justify-center">
                  <MatchScoreRing score={selectedApp.match_score} size={100} label="Overall" />
                </div>
                <div className="md:col-span-9 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Skills (40%)', val: selectedApp.match_details?.skills_score },
                      { label: 'Experience (30%)', val: selectedApp.match_details?.experience_score },
                      { label: 'Description (20%)', val: selectedApp.match_details?.description_score },
                      { label: 'Education (10%)', val: selectedApp.match_details?.education_score },
                    ].map((c) => (
                      <div key={c.label} className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <p className="text-[11px] text-slate-500">{c.label}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {c.val !== undefined ? `${c.val}%` : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600">
                    {selectedApp.match_details?.explanation?.decision_support_notice ||
                      'Decision-support indicator only. Human review of the original resume is required.'}
                  </p>
                </div>
              </div>

              {/* Matched vs Missing Skills */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card-surface p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
                    Matched Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedApp.match_details?.matched_skills || []).length > 0 ? (
                      selectedApp.match_details.matched_skills.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None matched directly</span>
                    )}
                  </div>
                </div>

                <div className="card-surface p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                    Missing Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedApp.match_details?.missing_skills || []).length > 0 ? (
                      selectedApp.match_details.missing_skills.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700">All listed skills matched</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Profile + Resume Extraction */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card-surface p-4 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-slate-900">Extracted Experience</h3>
                  {(selectedApp.resume?.extracted_experience || []).length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {selectedApp.resume.extracted_experience.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">
                      Could not reliably extract structured experience lines.
                    </p>
                  )}
                </div>

                <div className="card-surface p-4 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-slate-900">Extracted Education</h3>
                  {(selectedApp.resume?.extracted_education || []).length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {selectedApp.resume.extracted_education.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">
                      Could not reliably extract structured education lines.
                    </p>
                  )}
                </div>
              </div>

              {/* Original Resume Text & Secure Download */}
              {selectedApp.resume && (
                <div className="card-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Resume: {selectedApp.resume.original_filename}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadResume(
                          selectedApp.resume.id,
                          selectedApp.resume.original_filename
                        )
                      }
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Original File
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto font-sans">
                    {selectedApp.resume.raw_text || 'No text extracted from file.'}
                  </pre>
                </div>
              )}

              {/* Human Recruiter Decision Form */}
              <form
                onSubmit={handleStatusSave}
                className="card-surface p-4 bg-slate-50/70 space-y-3"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Update Application Status (Human Decision)
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input-field"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Recruiter Review Notes
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Add human evaluation notes..."
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={updatingStatus} className="btn-primary">
                    {updatingStatus ? 'Updating...' : 'Save Status Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Candidate Comparison Modal */}
      {showCompare && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Candidate Comparison ({comparedApps.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-4">
              {comparedApps.map((app) => (
                <div key={app.id} className="card-surface p-4 space-y-3">
                  <div>
                    <p className="font-bold text-slate-900">{app.candidate?.full_name}</p>
                    <p className="text-xs text-slate-500">{app.job?.title}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-teal-700">
                      {app.match_score ?? 0}%
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 border-t border-slate-100 pt-2">
                    <p>Skills: {app.match_details?.skills_score ?? 0}%</p>
                    <p>Experience: {app.match_details?.experience_score ?? 0}%</p>
                    <p>Description: {app.match_details?.description_score ?? 0}%</p>
                    <p>Education: {app.match_details?.education_score ?? 0}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-teal-700 mb-1">Matched Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {(app.match_details?.matched_skills || []).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">Missing Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {(app.match_details?.missing_skills || []).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </RecruiterLayout>
  )
}
