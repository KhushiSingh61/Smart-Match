import React, { useEffect, useState } from 'react'
import { AlertCircle, Award, Briefcase } from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { applicationsAPI, jobsAPI, matchingAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'

const STATUS_OPTIONS = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
]

export default function RecruiterShortlist() {
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [ranking, setRanking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data } = await jobsAPI.list({ mine: true })
        setJobs(data)
        if (data.length > 0) {
          setSelectedJobId(String(data[0].id))
        }
      } finally {
        setLoading(false)
      }
    }
    loadJobs()
  }, [])

  useEffect(() => {
    if (!selectedJobId) return
    const loadRanking = async () => {
      setLoading(true)
      try {
        const { data } = await matchingAPI.rankForJob(selectedJobId)
        setRanking(data)
      } finally {
        setLoading(false)
      }
    }
    loadRanking()
  }, [selectedJobId])

  const handleQuickStatus = async (applicationId, status) => {
    await applicationsAPI.updateStatus(applicationId, { status })
    setRanking((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.application_id === applicationId ? { ...c, status } : c
      ),
    }))
  }

  return (
    <RecruiterLayout
      title="Candidate Ranking"
      subtitle="Explainable TF-IDF & skill-based candidate ordering to support human shortlisting."
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3 text-xs text-sky-900">
          <AlertCircle className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
          <p>
            <strong>Decision-Support Notice:</strong> Candidate rankings are strictly a review aid
            generated from TF-IDF text similarity and rule-based skill extraction. SMARTMATCH never
            automatically shortlists, selects, or rejects any applicant.
          </p>
        </div>

        {jobs.length === 0 && !loading ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs available for ranking"
            description="Create a job posting first, and once candidates apply, you can compare and rank them here."
          />
        ) : (
          <>
            <div className="card-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Select Job Posting to Rank Applicants
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="input-field sm:w-80"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.application_count} applicant{j.application_count === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>
              {ranking && (
                <div className="text-xs text-slate-500">
                  Showing <strong>{ranking.total_candidates}</strong> applicant
                  {ranking.total_candidates === 1 ? '' : 's'} for{' '}
                  <strong>{ranking.job_title}</strong>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Computing candidate ranking...
              </div>
            ) : !ranking || ranking.candidates.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No applications for this job yet"
                description="Once candidates apply for this role, they will appear ranked by explainable match score."
              />
            ) : (
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Candidate</th>
                        <th className="px-4 py-3 text-left">Overall Score</th>
                        <th className="px-4 py-3 text-left">Matched Skills</th>
                        <th className="px-4 py-3 text-left">Missing Skills</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Human Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ranking.candidates.map((c) => (
                        <tr key={c.application_id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 font-bold text-slate-700">#{c.rank}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">{c.candidate_name}</p>
                            <p className="text-xs text-slate-400">{c.candidate_reference}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-teal-700">{c.overall_score}%</p>
                            <p className="text-[11px] text-slate-400">
                              S:{c.skills_score}% E:{c.experience_score}% D:{c.description_score}%
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {c.matched_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-xs"
                                >
                                  {s}
                                </span>
                              ))}
                              {c.matched_skills.length === 0 && (
                                <span className="text-xs text-slate-400">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {c.missing_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs"
                                >
                                  {s}
                                </span>
                              ))}
                              {c.missing_skills.length === 0 && (
                                <span className="text-xs text-emerald-700">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={c.status}
                              onChange={(e) =>
                                handleQuickStatus(c.application_id, e.target.value)
                              }
                              className="input-field py-1.5 text-xs w-36"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RecruiterLayout>
  )
}
