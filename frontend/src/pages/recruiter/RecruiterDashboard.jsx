import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { dashboardAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'

export default function RecruiterDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardAPI.recruiter()
        setData(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load recruiter dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = data?.stats || {}
  const statusDist = data?.status_distribution || {}
  const matchDist = data?.match_distribution || {}
  const recentApps = data?.recent_applications || []
  const recentJobs = data?.recent_jobs || []

  const totalApps = stats.total_applications || 0

  return (
    <RecruiterLayout
      title="Recruiter Dashboard"
      subtitle="Manage jobs, review candidates, and track hiring progress from live database records."
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading dashboard metrics...</div>
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
                label: 'Active Jobs',
                value: stats.active_jobs ?? 0,
                sub: `${stats.total_jobs ?? 0} total posted`,
                icon: Briefcase,
                accent: 'bg-teal-50 text-teal-700',
              },
              {
                label: 'Total Applications',
                value: stats.total_applications ?? 0,
                sub: 'Across your jobs',
                icon: Users,
                accent: 'bg-sky-50 text-sky-700',
              },
              {
                label: 'Resumes Received',
                value: stats.total_resumes_received ?? 0,
                sub: 'Unique resumes',
                icon: FileText,
                accent: 'bg-indigo-50 text-indigo-700',
              },
              {
                label: 'Under Review',
                value: stats.under_review ?? 0,
                sub: 'In active screening',
                icon: Clock,
                accent: 'bg-amber-50 text-amber-700',
              },
              {
                label: 'Shortlisted',
                value: stats.shortlisted ?? 0,
                sub:
                  stats.avg_match_score !== null && stats.avg_match_score !== undefined
                    ? `Avg match: ${stats.avg_match_score}%`
                    : 'No scores yet',
                icon: CheckCircle2,
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
                  <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
                </div>
              )
            })}
          </div>

          {stats.total_jobs === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs posted yet"
              description="Create your first job posting to start receiving candidate applications and explainable TF-IDF matching scores."
              action={
                <Link to="/recruiter/jobs" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create First Job Posting
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Recent Applications */}
                <div className="lg:col-span-7 card-surface overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
                      <p className="text-xs text-slate-500">
                        Decision-support match scores for incoming applicants
                      </p>
                    </div>
                    <Link
                      to="/recruiter/candidates"
                      className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {recentApps.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No applications received yet. Active jobs are visible to candidates in the
                      Candidate Portal.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-5 py-3 text-left font-semibold">Candidate</th>
                            <th className="px-5 py-3 text-left font-semibold">Job</th>
                            <th className="px-5 py-3 text-left font-semibold">Match Score</th>
                            <th className="px-5 py-3 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentApps.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-slate-900">{app.candidate_name}</p>
                                <p className="text-xs text-slate-400">{app.candidate_reference}</p>
                              </td>
                              <td className="px-5 py-3.5 text-slate-700">{app.job_title}</td>
                              <td className="px-5 py-3.5 font-semibold text-slate-900">
                                {app.match_score !== null && app.match_score !== undefined
                                  ? `${app.match_score}%`
                                  : '—'}
                              </td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={app.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Hiring / Status Distribution + Match Distribution */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="card-surface p-6">
                    <h2 className="text-base font-bold text-slate-900">
                      Application Status Distribution
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Real-time breakdown across {totalApps} application{totalApps === 1 ? '' : 's'}
                    </p>
                    <div className="space-y-3">
                      {[
                        { key: 'Applied', color: 'bg-slate-500' },
                        { key: 'Under Review', color: 'bg-sky-500' },
                        { key: 'Shortlisted', color: 'bg-teal-600' },
                        { key: 'Interview', color: 'bg-indigo-600' },
                        { key: 'Selected', color: 'bg-emerald-600' },
                        { key: 'Rejected', color: 'bg-rose-500' },
                      ].map((row) => {
                        const count = statusDist[row.key] || 0
                        const pct = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0
                        return (
                          <div key={row.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{row.key}</span>
                              <span className="text-slate-600 font-semibold">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${row.color} rounded-full`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="card-surface p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      <h2 className="text-base font-bold text-slate-900">Match Score Distribution</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        { label: '80% – 100%', val: matchDist['80_100'] || 0, cls: 'bg-emerald-50 text-emerald-800' },
                        { label: '60% – 79%', val: matchDist['60_79'] || 0, cls: 'bg-teal-50 text-teal-800' },
                        { label: '40% – 59%', val: matchDist['40_59'] || 0, cls: 'bg-amber-50 text-amber-800' },
                        { label: 'Below 40%', val: matchDist['0_39'] || 0, cls: 'bg-slate-100 text-slate-700' },
                      ].map((b) => (
                        <div key={b.label} className={`p-3 rounded-lg ${b.cls}`}>
                          <p className="font-medium">{b.label}</p>
                          <p className="text-lg font-bold mt-0.5">{b.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Jobs */}
              <div className="card-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Job Postings</h2>
                  <Link
                    to="/recruiter/jobs"
                    className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                  >
                    Manage all jobs <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">
                          {job.company_name} &bull; {job.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-600 font-medium">
                          {job.application_count} application{job.application_count === 1 ? '' : 's'}
                        </span>
                        <span className="text-slate-600">
                          {job.avg_match_score !== null ? `Avg ${job.avg_match_score}%` : 'No scores'}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </RecruiterLayout>
  )
}
