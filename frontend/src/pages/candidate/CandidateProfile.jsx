import React, { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { profilesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function CandidateProfile() {
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    location: '',
    headline: '',
    bio: '',
    portfolio_url: '',
    linkedin_url: '',
    skills_text: '',
    certifications_text: '',
    education: [],
    experience: [],
  })
  const [completion, setCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    profilesAPI
      .getMe()
      .then(({ data }) => {
        const p = data.profile
        setCompletion(data.completion_percentage)
        setForm({
          full_name: p.full_name || data.user.full_name || '',
          phone: p.phone || '',
          location: p.location || '',
          headline: p.headline || '',
          bio: p.bio || '',
          portfolio_url: p.portfolio_url || '',
          linkedin_url: p.linkedin_url || '',
          skills_text: (p.skills || []).join(', '),
          certifications_text: (p.certifications || []).join(', '),
          education: Array.isArray(p.education) ? p.education : [],
          experience: Array.isArray(p.experience) ? p.experience : [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      location: form.location,
      headline: form.headline,
      bio: form.bio,
      portfolio_url: form.portfolio_url,
      linkedin_url: form.linkedin_url,
      skills: form.skills_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      certifications: form.certifications_text
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      education: form.education.filter((ed) => ed.degree || ed.institution),
      experience: form.experience.filter((ex) => ex.role || ex.company),
    }

    try {
      const { data } = await profilesAPI.updateMe(payload)
      setCompletion(data.completion_percentage)
      await refreshUser()
      setMessage({ type: 'success', text: 'Candidate profile saved successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save profile.' })
    } finally {
      setSaving(false)
    }
  }

  const addEducation = () =>
    setForm((prev) => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: '' }],
    }))

  const addExperience = () =>
    setForm((prev) => ({
      ...prev,
      experience: [...prev.experience, { role: '', company: '', duration: '', summary: '' }],
    }))

  return (
    <CandidateLayout
      title="My Profile"
      subtitle="Manage your contact details, technical skills, education, experience, and links."
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading your profile...</div>
      ) : (
        <div className="max-w-4xl space-y-6">
          <div className="card-surface p-5 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900 mb-2">
                <span>Profile Completion</span>
                <span className="text-indigo-700">{completion}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          {message.text && (
            <div
              className={`p-3.5 rounded-lg text-sm border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Info */}
            <div className="card-surface p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Personal &amp; Contact Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={form.headline}
                    onChange={(e) => setForm({ ...form, headline: e.target.value })}
                    placeholder="e.g. Full-Stack Python & React Developer"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Bengaluru, India"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={form.portfolio_url}
                    onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
                    placeholder="https://yourportfolio.dev"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={form.linkedin_url}
                    onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Skills & Certifications */}
            <div className="card-surface p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Technical Skills &amp; Certifications
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Technical Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.skills_text}
                  onChange={(e) => setForm({ ...form, skills_text: e.target.value })}
                  placeholder="Python, SQL, React, FastAPI, Docker, Scikit-learn"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Certifications (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.certifications_text}
                  onChange={(e) => setForm({ ...form, certifications_text: e.target.value })}
                  placeholder="AWS Cloud Practitioner, Google Data Analytics"
                  className="input-field"
                />
              </div>
            </div>

            {/* Education */}
            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Education</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Education
                </button>
              </div>
              {form.education.length === 0 ? (
                <p className="text-xs text-slate-500">No education entries added yet.</p>
              ) : (
                <div className="space-y-3">
                  {form.education.map((ed, idx) => (
                    <div
                      key={idx}
                      className="grid sm:grid-cols-12 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <input
                        type="text"
                        placeholder="Degree (e.g. B.Tech CS)"
                        value={ed.degree || ''}
                        onChange={(e) => {
                          const next = [...form.education]
                          next[idx] = { ...next[idx], degree: e.target.value }
                          setForm({ ...form, education: next })
                        }}
                        className="input-field sm:col-span-5"
                      />
                      <input
                        type="text"
                        placeholder="Institution"
                        value={ed.institution || ''}
                        onChange={(e) => {
                          const next = [...form.education]
                          next[idx] = { ...next[idx], institution: e.target.value }
                          setForm({ ...form, education: next })
                        }}
                        className="input-field sm:col-span-4"
                      />
                      <input
                        type="text"
                        placeholder="Year"
                        value={ed.year || ''}
                        onChange={(e) => {
                          const next = [...form.education]
                          next[idx] = { ...next[idx], year: e.target.value }
                          setForm({ ...form, education: next })
                        }}
                        className="input-field sm:col-span-2"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            education: form.education.filter((_, i) => i !== idx),
                          })
                        }
                        className="sm:col-span-1 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Work Experience</h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </button>
              </div>
              {form.experience.length === 0 ? (
                <p className="text-xs text-slate-500">No experience entries added yet.</p>
              ) : (
                <div className="space-y-3">
                  {form.experience.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="grid sm:grid-cols-12 gap-3">
                        <input
                          type="text"
                          placeholder="Role / Title"
                          value={ex.role || ''}
                          onChange={(e) => {
                            const next = [...form.experience]
                            next[idx] = { ...next[idx], role: e.target.value }
                            setForm({ ...form, experience: next })
                          }}
                          className="input-field sm:col-span-4"
                        />
                        <input
                          type="text"
                          placeholder="Company"
                          value={ex.company || ''}
                          onChange={(e) => {
                            const next = [...form.experience]
                            next[idx] = { ...next[idx], company: e.target.value }
                            setForm({ ...form, experience: next })
                          }}
                          className="input-field sm:col-span-4"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 2022 - Present)"
                          value={ex.duration || ''}
                          onChange={(e) => {
                            const next = [...form.experience]
                            next[idx] = { ...next[idx], duration: e.target.value }
                            setForm({ ...form, experience: next })
                          }}
                          className="input-field sm:col-span-3"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              experience: form.experience.filter((_, i) => i !== idx),
                            })
                          }
                          className="sm:col-span-1 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Key responsibilities & achievements"
                        value={ex.summary || ''}
                        onChange={(e) => {
                          const next = [...form.experience]
                          next[idx] = { ...next[idx], summary: e.target.value }
                          setForm({ ...form, experience: next })
                        }}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary px-6">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Candidate Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </CandidateLayout>
  )
}
