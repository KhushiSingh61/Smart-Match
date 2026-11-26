import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Sparkles,
  UploadCloud,
  UserCircle,
} from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { dashboardAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'

export default function CandidateDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardAPI
      .candidate()
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || 'Failed to load candidate dashboard.')
      )
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats || {}
  const recommended = data?.recommended_jobs || []
  const recentApps = data?.recent_applications || []

  return (
    <CandidateLayout
      title="Candidate Dashboard"
      subtitle="Find active jobs, track applications, and inspect your explainable match insights."
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading your dashboard...</div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: 'Profile Completion',
                value: `${stats.profile_completion ?? 0}%`,
                sub: 'Keep details updated',
                icon: UserCircle,
                accent: 'bg-indigo-50 text-indigo-700',
              },
              {
                label: 'Uploaded Resumes',
                value: stats.uploaded_resumes ?? 0,
                sub: data?.primary_resume
                  ? data.primary_resume.original_filename
                  : 'Upload PDF or DOCX',
                icon: FileText,
                accent: 'bg-teal-50 text-teal-700',
              },
              {
                label: 'Available Jobs',
                value: stats.available_jobs ?? 0,
                sub: 'Active openings',
                icon: Briefcase,
                accent: 'bg-sky-50 text-sky-700',
              },
              {
                label: 'Applications',
                value: stats.applications_submitted ?? 0,
                sub: `${stats.under_review ?? 0} under review`,
                icon: ClipboardCheck,
                accent: 'bg-amber-50 text-amber-700',
              },
              {
                label: 'Shortlisted / Match',
                value: stats.shortlisted ?? 0,
                sub:
                  stats.best_match_score !== null && stats.best_match_score !== undefined
                    ? `Best match: ${stats.best_match_score}%`
                    : 'Upload resume for match',
                icon: Sparkles,
                accent: 'bg-emerald-50 text-emerald-700',
              },
            ].map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className="card-surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-3">{kpi.value}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{kpi.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Prompt to upload resume if none */}
          {stats.uploaded_resumes === 0 && (
            <div className="card-surface p-6 bg-indigo-50/50 border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <UploadCloud className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Upload your resume to unlock live job matching
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Upload a PDF or DOCX resume to extract your skills automatically and see
                    explainable match scores across available jobs.
                  </p>
                </div>
              </div>
              <Link to="/candidate/resumes" className="btn-primary shrink-0">
                Upload Resume
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Recommended Jobs */}
            <div className="lg:col-span-7 card-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {data?.primary_resume ? 'Job Matches for Your Primary Resume' : 'Active Jobs'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {data?.primary_resume
                      ? `Scored against ${data.primary_resume.original_filename}`
                      : 'Active postings from recruiters'}
                  </p>
                </div>
                <Link
                  to="/candidate/jobs"
                  className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  Browse all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recommended.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No active jobs are currently posted in the database.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recommended.map((job) => (
                    <div
                      key={job.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">
                          {job.company_name} &bull; {job.location} &bull; {job.employment_type}
                        </p>
                        {job.matched_skills?.length > 0 && (
                          <p className="text-[11px] text-teal-700">
                            Matched: {job.matched_skills.slice(0, 4).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {job.match_score !== null && job.match_score !== undefined && (
                          <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                            {job.match_score}% Match
                          </span>
                        )}
                        <Link
                          to={`/candidate/insights?jobId=${job.id}`}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Insights
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Applications */}
            <div className="lg:col-span-5 card-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
                  <p className="text-xs text-slate-500">Live status updates from recruiters</p>
                </div>
                <Link
                  to="/candidate/applications"
                  className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  Track all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentApps.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500">You haven&apos;t applied to any jobs yet.</p>
                  <Link to="/candidate/jobs" className="btn-primary text-xs py-2">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentApps.map((app) => (
                    <div key={app.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{app.job_title}</p>
                        <p className="text-xs text-slate-500 truncate">{app.company_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {app.match_score !== null && (
                          <span className="text-xs font-semibold text-slate-600">
                            {app.match_score}%
                          </span>
                        )}
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </CandidateLayout>
  )
}
