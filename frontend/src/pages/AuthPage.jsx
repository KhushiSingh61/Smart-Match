import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Briefcase, CheckCircle2, Eye, EyeOff, Lock, Mail, User, Users } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, login, register } = useAuth()

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const initialRole = searchParams.get('role') === 'candidate' ? 'candidate' : 'recruiter'

  const [mode, setMode] = useState(initialMode)
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(user.role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let loggedInUser
      if (mode === 'login') {
        loggedInUser = await login(email, password)
      } else {
        loggedInUser = await register({
          email,
          password,
          full_name: fullName,
          role,
          company_name: role === 'recruiter' ? companyName : '',
        })
      }
      navigate(loggedInUser.role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Authentication failed. Please check your details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50">
      {/* Left Brand Panel */}
      <div className="lg:col-span-5 bg-navy-900 text-white p-8 sm:p-12 flex flex-col justify-between">
        <div>
          <Link to="/" className="inline-block">
            <Logo dark size="lg" />
          </Link>

          <div className="mt-14 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome to SMARTMATCH
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Smarter Hiring. Better Matching. An AI-assisted decision-support recruitment platform
              for recruiters and candidates.
            </p>
          </div>

          <ul className="mt-10 space-y-4 text-sm text-slate-200">
            {[
              'Explainable TF-IDF & Skill-Dictionary Matching',
              'PDF & DOCX Resume Parsing & Preview',
              'Skill-Gap Suggestions & Application Tracking',
              'Dedicated Bias Review & Human-in-the-Loop Controls',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-400">
          SMARTMATCH supports human hiring decisions and never automatically selects or rejects
          candidates.
        </div>
      </div>

      {/* Right Auth Form Panel */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md card-surface p-6 sm:p-8">
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
              }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Login to your account' : 'Create your SMARTMATCH account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'login'
                ? 'Access your recruiter or candidate portal.'
                : 'Select your role and get started in seconds.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Select your role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('recruiter')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === 'recruiter'
                          ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Briefcase
                        className={`w-5 h-5 mb-1.5 ${
                          role === 'recruiter' ? 'text-teal-600' : 'text-slate-500'
                        }`}
                      />
                      <p className="text-sm font-semibold text-slate-900">Recruiter</p>
                      <p className="text-[11px] text-slate-500">Hire &amp; review talent</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('candidate')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === 'candidate'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Users
                        className={`w-5 h-5 mb-1.5 ${
                          role === 'candidate' ? 'text-indigo-600' : 'text-slate-500'
                        }`}
                      />
                      <p className="text-sm font-semibold text-slate-900">Candidate</p>
                      <p className="text-[11px] text-slate-500">Find jobs &amp; insights</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohit Sharma"
                      className="input-field pl-9"
                    />
                  </div>
                </div>

                {role === 'recruiter' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Company / Organization Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. TechWave Solutions"
                      className="input-field"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="input-field pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-sm font-semibold"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Login to Dashboard'
                : `Create ${role === 'recruiter' ? 'Recruiter' : 'Candidate'} Account`}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            <Link to="/" className="text-teal-700 hover:underline font-medium">
              &larr; Back to SMARTMATCH Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
