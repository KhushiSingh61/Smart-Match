import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { jobsAPI, matchingAPI, resumesAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'
import MatchScoreRing from '../../components/MatchScoreRing'

export default function CandidateMatchInsights() {
  const [searchParams] = useSearchParams()
  const initialJobId = searchParams.get('jobId') || ''

  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(initialJobId)
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [result, setResult] = useState(null)
  const [loadingInit, setLoadingInit] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([jobsAPI.list({}), resumesAPI.listMine()])
      .then(([jRes, rRes]) => {
        setJobs(jRes.data)
        setResumes(rRes.data)
        if (!initialJobId && jRes.data.length > 0) {
          setSelectedJobId(String(jRes.data[0].id))
        }
        if (rRes.data.length > 0) {
          setSelectedResumeId(String(rRes.data[0].id))
        }
      })
      .finally(() => setLoadingInit(false))
  }, [initialJobId])

  const runAnalysis = useCallback(async () => {
    if (!selectedJobId || !selectedResumeId) return
    setAnalyzing(true)
    setError('')
    try {
      const { data } = await matchingAPI.analyze({
        job_id: Number(selectedJobId),
        resume_id: Number(selectedResumeId),
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compute match insights.')
    } finally {
      setAnalyzing(false)
    }
  }, [selectedJobId, selectedResumeId])

  useEffect(() => {
    if (selectedJobId && selectedResumeId) {
      runAnalysis()
    }
  }, [selectedJobId, selectedResumeId, runAnalysis])

  return (
    <CandidateLayout
      title="Match Insights & Skill Gap Analysis"
      subtitle="See how your resume aligns with job postings and discover actionable skill-gap suggestions."
    >
      {loadingInit ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading matching workspace...</div>
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Upload a resume to run match analysis"
          description="Upload at least one PDF or DOCX resume to compute TF-IDF similarity, matched skills, and skill-gap suggestions."
          action={
            <Link to="/candidate/resumes" className="btn-primary">
              Upload Resume
            </Link>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No active jobs available"
          description="Recruiters have not posted any active jobs yet. Check back soon to compare your resume."
        />
      ) : (
        <div className="space-y-6">
          {/* Selector Controls */}
          <div className="card-surface p-5 grid sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Target Job Posting
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="input-field"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Resume Version
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="input-field"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.original_filename} {r.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analyzing}
                className="btn-primary w-full"
              >
                {analyzing ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3 text-xs text-sky-900">
                <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <p>{result.explanation?.decision_support_notice}</p>
              </div>

              {/* Overall Score + Component Breakdown */}
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 card-surface p-6 flex flex-col items-center justify-center text-center">
                  <MatchScoreRing score={result.overall_score} size={132} label="Similarity" />
                  <h3 className="text-base font-bold text-slate-900 mt-4">{result.job_title}</h3>
                  <p className="text-xs text-slate-500">{result.company_name}</p>
                </div>

                <div className="lg:col-span-8 card-surface p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    How Your Score Was Calculated
                  </h3>
                  <p className="text-xs text-slate-600">{result.explanation?.summary}</p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    {[
                      {
                        label: 'Skills Similarity',
                        weight: '40%',
                        score: result.skills_score,
                        note: 'Rule-based skill dictionary & TF-IDF',
                      },
                      {
                        label: 'Experience Relevance (Provisional)',
                        weight: '30%',
                        score: result.experience_score,
                        note: result.explanation?.experience_note,
                      },
                      {
                        label: 'Job Description Similarity',
                        weight: '20%',
                        score: result.description_score,
                        note: 'Scikit-learn TF-IDF cosine similarity',
                      },
                      {
                        label: 'Education Relevance (Provisional)',
                        weight: '10%',
                        score: result.education_score,
                        note: result.explanation?.education_note,
                      },
                    ].map((item) => (
                      <div key={item.label} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>
                            {item.label} ({item.weight})
                          </span>
                          <span className="text-teal-700">{item.score}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden my-2">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Matching & Missing Skills */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card-surface p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <h3 className="text-base font-bold text-slate-900">Matching Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_skills.length > 0 ? (
                      result.matched_skills.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No direct required-skill matches yet.</p>
                    )}
                  </div>
                </div>

                <div className="card-surface p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-900">Missing Required Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.length > 0 ? (
                      result.missing_skills.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-700 font-medium">
                        Your resume includes all listed required skills!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Relevant Resume Sections & Skill-Gap Suggestions */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card-surface p-6 space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Relevant Resume Sections</h3>
                  {result.relevant_sections.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {result.relevant_sections.map((sec, i) => (
                        <li
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          {sec}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No strong keyword-matching lines highlighted.
                    </p>
                  )}
                </div>

                <div className="card-surface p-6 space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Skill-Gap Suggestions</h3>
                  {result.skill_gap_suggestions.length > 0 ? (
                    <div className="space-y-2.5">
                      {result.skill_gap_suggestions.map((sg, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{sg.skill}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              {sg.priority}
                            </span>
                          </div>
                          <p className="text-slate-600">{sg.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700">
                      No critical skill gaps detected for this role.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CandidateLayout>
  )
}
