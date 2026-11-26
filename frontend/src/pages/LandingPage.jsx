import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Cpu,
  FileSearch,
  Scale,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
} from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()
  const portalHref = user ? (user.role === 'recruiter' ? '/recruiter' : '/candidate') : '/auth'

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#top" className="hover:text-navy-900 transition-colors">
              Home
            </a>
            <a href="#features" className="hover:text-navy-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-navy-900 transition-colors">
              How It Works
            </a>
            <a href="#technology" className="hover:text-navy-900 transition-colors">
              Technology
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to={portalHref} className="btn-primary">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/auth?mode=register" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="pt-12 pb-16 lg:pt-20 lg:pb-24 bg-slate-50/70 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Decision-Support Recruitment Platform
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
                Find the Right Talent with Explainable{' '}
                <span className="text-teal-600">Job-Resume Matching</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                <strong>Smarter Hiring. Better Matching.</strong> SMARTMATCH connects recruiters and
                candidates through automated PDF &amp; DOCX resume parsing, rule-based skill
                extraction, and transparent TF-IDF cosine similarity scoring—while keeping final
                hiring decisions firmly with human recruiters.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to="/auth?mode=register" className="btn-primary px-6 py-3 text-sm">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#how-it-works" className="btn-secondary px-6 py-3 text-sm">
                  See How It Works
                </a>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  PDF &amp; DOCX Resume Extraction
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Transparent Score Breakdown
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  PII-Masked Bias Review
                </span>
              </div>
            </div>

            {/* Illustrative Scoring Model Preview Card (No fake metrics!) */}
            <div className="lg:col-span-6">
              <div className="card-surface p-6 sm:p-7 bg-white shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      Explainable Matching Architecture
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      Weighted Decision-Support Breakdown
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                    Illustrative Weights
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: 'Skills Similarity (Rule-Based + TF-IDF)',
                      weight: '40%',
                      bar: 'w-4/5',
                      color: 'bg-teal-600',
                    },
                    {
                      label: 'Experience Relevance (Provisional Indicator)',
                      weight: '30%',
                      bar: 'w-3/5',
                      color: 'bg-sky-600',
                    },
                    {
                      label: 'Job Description Cosine Similarity',
                      weight: '20%',
                      bar: 'w-2/5',
                      color: 'bg-indigo-600',
                    },
                    {
                      label: 'Education Relevance (Provisional Indicator)',
                      weight: '10%',
                      bar: 'w-1/5',
                      color: 'bg-slate-600',
                    },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700">{row.label}</span>
                        <span className="text-slate-900 font-semibold">Weight: {row.weight}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${row.bar} ${row.color} rounded-full`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-3 bg-slate-50 rounded-lg p-3.5">
                  <Scale className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Human-in-the-Loop Guarantee:</strong> Protected attributes are excluded
                    from scoring, PII is masked during bias review, and SMARTMATCH never
                    automatically rejects or selects candidates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Portal Entry Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Link
              to="/auth?mode=register&role=recruiter"
              className="group card-surface p-6 bg-teal-50/50 border-teal-200/80 hover:border-teal-400 hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">I&apos;m a Recruiter</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Post jobs, inspect parsed resumes, compare candidate rankings, and review bias
                    checks.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-700 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>

            <Link
              to="/auth?mode=register&role=candidate"
              className="group card-surface p-6 bg-indigo-50/50 border-indigo-200/80 hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">I&apos;m a Candidate</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Upload PDF/DOCX resumes, discover active jobs, view skill gaps, and track
                    applications.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-700 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">How SMARTMATCH Works</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              A transparent, four-stage workflow designed for both hiring teams and job seekers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: UploadCloud,
                title: 'Upload & Parse Resumes',
                desc: 'Candidates upload PDF or DOCX resumes. PyMuPDF and python-docx extract text, skills, education, and experience.',
              },
              {
                step: '02',
                icon: Briefcase,
                title: 'Define Job Requirements',
                desc: 'Recruiters create structured job profiles with required skills, preferred skills, and experience criteria.',
              },
              {
                step: '03',
                icon: Cpu,
                title: 'Explainable TF-IDF Matching',
                desc: 'Scikit-learn TF-IDF vectorization and Cosine Similarity compute transparent component scores.',
              },
              {
                step: '04',
                icon: UserCheck,
                title: 'Human Review & Shortlisting',
                desc: 'Recruiters inspect PII-masked bias reviews, original resumes, and update application statuses.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.step} className="card-surface p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">STEP {item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">
              Built for Real-World Recruitment Workflows
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Every metric, job card, and application status in SMARTMATCH is backed by persistent
              database records.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Database-Driven Dashboards',
                desc: 'Track active jobs, applications, status distributions, and candidate pipelines directly from live database queries.',
              },
              {
                icon: FileSearch,
                title: 'Skill-Gap & Match Insights',
                desc: 'Candidates see matched skills, missing skills, relevant resume sections, and actionable skill-gap recommendations.',
              },
              {
                icon: Scale,
                title: 'Dedicated Bias & Fairness Review',
                desc: 'Inspect PII-masked resumes, verify protected attribute exclusion, and review missing-information notices before deciding.',
              },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="card-surface p-6">
                  <div className="w-10 h-10 rounded-lg bg-navy-900 text-teal-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Technology Highlights */}
      <section id="technology" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card-surface p-8 bg-navy-900 text-white border-none">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  Technology Stack
                </p>
                <h2 className="text-2xl font-bold">Transparent, Extensible Architecture</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  SMARTMATCH uses Scikit-learn TF-IDF vectorization and Cosine Similarity alongside
                  an extensible skill dictionary—providing fast, deterministic, and explainable
                  results without black-box claims.
                </p>
              </div>
              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Frontend SPA',
                    items: 'React.js, Vite, Tailwind CSS, Lucide Icons, Axios',
                  },
                  {
                    title: 'Backend API & Auth',
                    items: 'Python, FastAPI, SQLAlchemy, Pydantic, JWT, bcrypt',
                  },
                  {
                    title: 'Matching & NLP Engine',
                    items: 'Scikit-learn TF-IDF, Cosine Similarity, Rule-Based Skill Dictionary',
                  },
                  {
                    title: 'Document Extraction & DB',
                    items: 'PyMuPDF (PDF), python-docx (DOCX), SQLite / PostgreSQL-ready',
                  },
                ].map((stack) => (
                  <div
                    key={stack.title}
                    className="rounded-xl bg-white/5 border border-white/10 p-4"
                  >
                    <p className="text-sm font-semibold text-teal-400">{stack.title}</p>
                    <p className="text-xs text-slate-300 mt-1">{stack.items}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs text-slate-500">Smarter Hiring. Better Matching.</span>
          </div>
          <p className="text-xs text-slate-500 text-center sm:text-right">
            SMARTMATCH is a decision-support platform. Final hiring decisions always remain with
            human recruiters.
          </p>
        </div>
      </footer>
    </div>
  )
}
