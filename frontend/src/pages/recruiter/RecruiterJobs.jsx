import React, { useCallback, useEffect, useState } from 'react'
import {
  Briefcase,
  Edit3,
  MapPin,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { jobsAPI, profilesAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'

const EMPTY_FORM = {
  title: '',
  company_name: '',
  location: '',
  employment_type: 'Full-time',
  experience_required: '',
  min_experience_years: 0,
  salary_range: '',
  description: '',
  required_skills_text: '',
  preferred_skills_text: '',
  educational_requirements: '',
  status: 'active',
}

export default function RecruiterJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [defaultCompany, setDefaultCompany] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { mine: true }
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      const { data } = await jobsAPI.list(params)
      setJobs(data)
    } catch {
      setFeedback({ type: 'error', text: 'Failed to load your job postings.' })
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    profilesAPI.getMe().then(({ data }) => {
      if (data?.profile?.company_name) {
        setDefaultCompany(data.profile.company_name)
      }
    }).catch(() => {})
  }, [])

  const openCreateModal = () => {
    setEditingJob(null)
    setForm({ ...EMPTY_FORM, company_name: defaultCompany })
    setModalOpen(true)
  }

  const openEditModal = (job) => {
    setEditingJob(job)
    setForm({
      title: job.title,
      company_name: job.company_name,
      location: job.location,
      employment_type: job.employment_type,
      experience_required: job.experience_required || '',
      min_experience_years: job.min_experience_years ?? 0,
      salary_range: job.salary_range || '',
      description: job.description,
      required_skills_text: (job.required_skills || []).join(', '),
      preferred_skills_text: (job.preferred_skills || []).join(', '),
      educational_requirements: job.educational_requirements || '',
      status: job.status,
    })
    setModalOpen(true)
  }

  const parseSkillText = (txt) =>
    txt
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback({ type: '', text: '' })
    const payload = {
      title: form.title,
      company_name: form.company_name,
      location: form.location,
      employment_type: form.employment_type,
      experience_required: form.experience_required,
      min_experience_years: Number(form.min_experience_years) || 0,
      salary_range: form.salary_range,
      description: form.description,
      required_skills: parseSkillText(form.required_skills_text),
      preferred_skills: parseSkillText(form.preferred_skills_text),
      educational_requirements: form.educational_requirements,
      status: form.status,
    }

    try {
      if (editingJob) {
        await jobsAPI.update(editingJob.id, payload)
        setFeedback({ type: 'success', text: 'Job profile updated successfully.' })
      } else {
        await jobsAPI.create(payload)
        setFeedback({ type: 'success', text: 'Job profile created and saved to database.' })
      }
      setModalOpen(false)
      fetchJobs()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Could not save job profile.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (job) => {
    const nextStatus = job.status === 'active' ? 'inactive' : 'active'
    try {
      await jobsAPI.update(job.id, { status: nextStatus })
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j)))
      setFeedback({
        type: 'success',
        text: `Job "${job.title}" is now ${nextStatus}.`,
      })
    } catch {
      setFeedback({ type: 'error', text: 'Failed to update job status.' })
    }
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This will also remove associated applications.`)) {
      return
    }
    try {
      await jobsAPI.remove(job.id)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
      setFeedback({ type: 'success', text: `Deleted "${job.title}".` })
    } catch {
      setFeedback({ type: 'error', text: 'Failed to delete job.' })
    }
  }

  return (
    <RecruiterLayout
      title="Job Management"
      subtitle="Create, edit, activate, and manage your recruitment job postings."
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

        {/* Toolbar */}
        <div className="card-surface p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs by title, company, or description..."
                className="input-field pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-44"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <button type="button" onClick={openCreateModal} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            Post New Job
          </button>
        </div>

        {/* Job List */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading your jobs...</div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No job postings found"
            description="Post a job with required skills and job description so candidates can discover and apply."
            action={
              <button type="button" onClick={openCreateModal} className="btn-primary">
                <Plus className="w-4 h-4" />
                Create Job Posting
              </button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="card-surface p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                      <StatusBadge status={job.status} />
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {job.employment_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{job.company_name}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      {job.experience_required && (
                        <span>Experience: {job.experience_required}</span>
                      )}
                      {job.salary_range && <span>Salary: {job.salary_range}</span>}
                      <span className="font-semibold text-teal-700">
                        {job.application_count} Application{job.application_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 pt-1">{job.description}</p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
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

                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(job)}
                      className="btn-secondary py-2 px-3 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(job)}
                      className="btn-secondary py-2 px-3 text-xs"
                    >
                      <Power className="w-3.5 h-3.5" />
                      {job.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(job)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Job Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-900">
                {editingJob ? 'Edit Job Profile' : 'Create Job Profile'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Backend Python Engineer"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="e.g. TechWave Solutions"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Bengaluru / Remote"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Experience Label
                  </label>
                  <input
                    type="text"
                    value={form.experience_required}
                    onChange={(e) => setForm({ ...form, experience_required: e.target.value })}
                    placeholder="e.g. 2-4 years"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Min Years (Numeric)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.min_experience_years}
                    onChange={(e) => setForm({ ...form, min_experience_years: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.salary_range}
                    onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                    placeholder="e.g. 12 - 18 LPA"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Required Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.required_skills_text}
                  onChange={(e) => setForm({ ...form, required_skills_text: e.target.value })}
                  placeholder="e.g. Python, FastAPI, SQL, Docker, REST API"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.preferred_skills_text}
                  onChange={(e) => setForm({ ...form, preferred_skills_text: e.target.value })}
                  placeholder="e.g. Kubernetes, AWS, React"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Educational Requirements
                </label>
                <input
                  type="text"
                  value={form.educational_requirements}
                  onChange={(e) => setForm({ ...form, educational_requirements: e.target.value })}
                  placeholder="e.g. Bachelor's degree in Computer Science or equivalent practical experience"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Description *
                </label>
                <textarea
                  rows={5}
                  required
                  minLength={10}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe responsibilities, tech stack, and role expectations..."
                  className="input-field"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editingJob ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RecruiterLayout>
  )
}
