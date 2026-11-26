import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Trash2 } from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { applicationsAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'

const PIPELINE_STEPS = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected']

export default function CandidateApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')

  const fetchApps = async () => {
    setLoading(true)
    try {
      const { data } = await applicationsAPI.listMine()
      setApplications(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApps()
  }, [])

  const handleWithdraw = async (app) => {
    if (!window.confirm(`Withdraw your application for "${app.job?.title}"?`)) return
    await applicationsAPI.withdraw(app.id)
    setApplications((prev) => prev.filter((a) => a.id !== app.id))
    setFeedback(`Withdrew application for "${app.job?.title}".`)
  }

  return (
    <CandidateLayout
      title="My Applications"
      subtitle="Track status updates from recruiters and review your submitted match scores."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {feedback}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading your applications...
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No applications submitted yet"
            description="Browse active jobs and submit an application using your uploaded resume to track hiring progress here."
            action={
              <Link to="/candidate/jobs" className="btn-primary">
                Browse Active Jobs
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const currentStepIdx = PIPELINE_STEPS.indexOf(app.status)
              const isRejected = app.status === 'Rejected'
              return (
                <div key={app.id} className="card-surface p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{app.job?.title}</h3>
                      <p className="text-xs text-slate-500">
                        {app.job?.company_name} &bull; {app.job?.location} &bull; Applied on{' '}
                        {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                      {app.resume && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Resume: {app.resume.original_filename}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {app.match_score !== null && (
                        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                          {app.match_score}% Match
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                  </div>

                  {/* Status Stepper */}
                  {!isRejected && (
                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const completed = currentStepIdx >= idx
                        return (
                          <div key={step} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                completed ? 'bg-teal-600' : 'bg-slate-200'
                              }`}
                            />
                            <p
                              className={`text-[11px] font-medium text-center ${
                                completed ? 'text-teal-800' : 'text-slate-400'
                              }`}
                            >
                              {step}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {app.recruiter_notes && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong>Recruiter Note:</strong> {app.recruiter_notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <Link
                      to={`/candidate/insights?jobId=${app.job_id}`}
                      className="text-teal-700 font-semibold hover:underline"
                    >
                      View Detailed Match Insights
                    </Link>
                    {app.status !== 'Selected' && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(app)}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
