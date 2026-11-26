import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, EyeOff, Info, Scale, ShieldCheck } from 'lucide-react'
import RecruiterLayout from './RecruiterLayout'
import { applicationsAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'

export default function RecruiterBiasCheck() {
  const [applications, setApplications] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await applicationsAPI.listForRecruiter({ sort_by: 'score_desc' })
        setApplications(data)
        if (data.length > 0) {
          setSelectedId(String(data[0].id))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selected = applications.find((a) => String(a.id) === selectedId)
  const bias = selected?.match_details?.bias_check || {}
  const explanation = selected?.match_details?.explanation || {}

  return (
    <RecruiterLayout
      title="Bias & Fairness Review"
      subtitle="Inspect PII-masked resumes, scoring transparency, missing-information notices, and limitations."
    >
      <div className="space-y-6">
        <div className="card-surface p-5 bg-amber-50/60 border-amber-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Honest Scope &amp; Limitations Notice</p>
            <p>
              SMARTMATCH helps reduce surface-level PII exposure by masking personal identifiers and
              excluding protected characteristics from TF-IDF scoring. However, no automated tool
              eliminates bias or guarantees fair hiring—human judgment and structured interviews
              remain essential.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading bias review data...</div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No applications to review yet"
            description="Once candidates apply to your job postings, you can inspect PII-masked resumes and transparent matching factors here."
          />
        ) : (
          <>
            <div className="card-surface p-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Select Application to Inspect (Anonymized Reference)
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="input-field max-w-md"
              >
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.candidate?.reference_code} &bull; {a.job?.title} (Score:{' '}
                    {a.match_score ?? 0}%)
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Left: PII-Masked Resume Preview */}
                <div className="lg:col-span-7 card-surface p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-5 h-5 text-teal-600" />
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          PII-Masked Resume Preview ({selected.candidate?.reference_code})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Names, emails, phone numbers, URLs, and explicit demographic cues are
                          masked.
                        </p>
                      </div>
                    </div>
                  </div>

                  <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 whitespace-pre-wrap max-h-[460px] overflow-y-auto font-sans leading-relaxed">
                    {selected.resume?.masked_text ||
                      'No selectable text was available in this resume.'}
                  </pre>
                </div>

                {/* Right: Fairness & Explainability Breakdown */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="card-surface p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-teal-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Protected Attributes Excluded from Scoring
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(bias.protected_attributes_excluded || []).map((attr) => (
                        <span
                          key={attr}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="card-surface p-5 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Matching Factor Explanation
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {explanation.summary}
                    </p>
                    <p className="text-xs text-slate-500">{explanation.experience_note}</p>
                    <p className="text-xs text-slate-500">{explanation.education_note}</p>
                  </div>

                  <div className="card-surface p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Missing Information &amp; Extraction Notices
                      </h3>
                    </div>
                    {(bias.missing_information_flags || []).length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                        {bias.missing_information_flags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-700">
                        All primary resume sections were detected in this document.
                      </p>
                    )}
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      {bias.human_review_reminder}
                    </p>
                  </div>

                  <div className="card-surface p-5 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Transparent System Limitations
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                      {(bias.limitations || []).map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RecruiterLayout>
  )
}
