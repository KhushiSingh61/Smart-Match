import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { profilesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function RecruiterProfile() {
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    company_website: '',
    job_title: '',
    location: '',
    phone: '',
    bio: '',
  })
  const [completion, setCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    profilesAPI
      .getMe()
      .then(({ data }) => {
        setCompletion(data.completion_percentage)
        setForm({
          full_name: data.user.full_name || '',
          company_name: data.profile.company_name || '',
          company_website: data.profile.company_website || '',
          job_title: data.profile.job_title || '',
          location: data.profile.location || '',
          phone: data.profile.phone || '',
          bio: data.profile.bio || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await profilesAPI.updateMe(form)
      setCompletion(data.completion_percentage)
      await refreshUser()
      setMessage({ type: 'success', text: 'Recruiter profile updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecruiterLayout
      title="Recruiter Profile"
      subtitle="Manage your recruiter and organization details."
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading profile...</div>
      ) : (
        <div className="max-w-3xl space-y-6">
          <div className="card-surface p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Profile Completion</p>
              <p className="text-xs text-slate-500">
                Complete organization details appear on your recruitment workspace.
              </p>
            </div>
            <span className="text-lg font-bold text-teal-700">{completion}%</span>
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

          <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  placeholder="e.g. Technical Recruiter"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bengaluru, India"
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
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Website
                </label>
                <input
                  type="url"
                  value={form.company_website}
                  onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                  placeholder="https://company.com"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bio / About</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </RecruiterLayout>
  )
}
