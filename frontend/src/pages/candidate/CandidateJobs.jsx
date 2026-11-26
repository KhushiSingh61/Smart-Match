import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CheckCircle2, MapPin, Search, Sparkles, X } from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { applicationsAPI, jobsAPI, resumesAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'

export default function CandidateJobs() {
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [appliedJobIds, setAppliedJobIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [skill, setSkill] = useState('')
  const [experience, setExperience] = useState('')

  const [activeJob, setActiveJob] = useState(null)
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [applying, setApplying] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (location.trim()) params.location = location.trim()
      if (skill.trim()) params.skill = skill.trim()
      if (experience.trim()) params.experience = experience.trim()

      const [jobsRes, resRes, appsRes] = await Promise.all([
        jobsAPI.list(params),
        resumesAPI.listMine(),
        applicationsAPI.listMine(),
      ])
      setJobs(jobsRes.data)
      setResumes(resRes.data)
      if (resRes.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(String(resRes.data[0].id))
      }
      setAppliedJobIds(new Set(appsRes.data.map((a) => a.job_id)))
    } finally {
      setLoading(false)
    }
  }, [search, location, skill, experience, selectedResumeId])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const openApplyModal = (job) => {
    setActiveJob(job)
    setCoverNote('')
    if (resumes.length > 0) {
      setSelectedResumeId(String(resumes[0].id))
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!activeJob) return
    setApplying(true)
    setFeedback({ type: '', text: '' })
    try {
      const { data } = await applicationsAPI.apply(activeJob.id, {
        resume_id: selectedResumeId ? Number(selectedResumeId) : null,
        cover_note: coverNote,
      })
      setAppliedJobIds((prev) => new Set([...prev, activeJob.id]))
      setActiveJob(null)
      setFeedback({
        type: 'success',
        text: `Application submitted for "${data.job?.title}"! Initial match score: ${data.match_score}%.`,
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Could not submit application.',
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <CandidateLayout
      title="Browse Jobs"
      subtitle="Discover active openings, inspect requirements, and apply with your uploaded resume."
    >
      <div className="space-y-6">
        {feedback.text && (
          <div
            className={`p-3.5 rounded-lg text-sm border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Search & Filters */}
        <div className="card-surface p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or company..."
              className="input-field pl-9"
            />
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Filter by location..."
            className="input-field"
          />
          <input
            type="text"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Filter by skill (e.g. Python)..."
            className="input-field"
          />
          <input
            type="text"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Filter by experience..."
            className="input-field"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading active jobs...</div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No matching active jobs found"
            description="No active postings matched your filters. Clear filters or check back when recruiters publish new roles."
          />
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const hasApplied = appliedJobIds.has(job.id)
              return (
                <div key={job.id} className="card-surface p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                          {job.employment_type}
                        </span>
                        {hasApplied && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Applied
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{job.company_name}</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                        {job.experience_required && (
                          <span>Experience: {job.experience_required}</span>
                        )}
                        {job.salary_range && <span>Salary: {job.salary_range}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Link
                        to={`/candidate/insights?jobId=${job.id}`}
                        className="btn-secondary py-2 px-3.5 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        Match Insights
                      </Link>
                      <button
                        type="button"
                        disabled={hasApplied}
                        onClick={() => openApplyModal(job)}
                        className="btn-primary py-2 px-4 text-xs"
                      >
                        {hasApplied ? 'Already Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 whitespace-pre-line">{job.description}</p>

                  {job.educational_requirements && (
                    <p className="text-xs text-slate-500">
                      <strong>Education:</strong> {job.educational_requirements}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(job.required_skills || []).map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                    {(job.preferred_skills || []).map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs"
                      >
                        {s} (Preferred)
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {activeJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Apply for {activeJob.title}
                </h2>
                <p className="text-xs text-slate-500">{activeJob.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveJob(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resumes.length === 0 ? (
              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-slate-600">
                  You need to upload at least one PDF or DOCX resume before applying.
                </p>
                <Link to="/candidate/resumes" className="btn-primary">
                  Go to Resume Upload
                </Link>
              </div>
            ) : (
              <form onSubmit={handleApply} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Resume *
                  </label>
                  <select
                    required
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cover Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Briefly highlight why you are interested in this role..."
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveJob(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={applying} className="btn-primary">
                    {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </CandidateLayout>
  )
}
