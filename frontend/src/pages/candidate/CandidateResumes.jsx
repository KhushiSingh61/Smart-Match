import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import CandidateLayout from './CandidateLayout'
import { resumesAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

export default function CandidateResumes() {
  const [resumes, setResumes] = useState([])
  const [selectedResume, setSelectedResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [replaceTargetId, setReplaceTargetId] = useState(null)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  const fileInputRef = useRef(null)

  const fetchResumes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await resumesAPI.listMine()
      setResumes(data)
      if (data.length > 0) {
        setSelectedResume((prev) =>
          prev ? data.find((r) => r.id === prev.id) || data[0] : data[0]
        )
      } else {
        setSelectedResume(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  const triggerFilePicker = (replaceId = null) => {
    setReplaceTargetId(replaceId)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFeedback({ type: '', text: '' })
    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      setFeedback({
        type: 'error',
        text: 'Invalid file type. Please select a PDF (.pdf) or Word (.docx) resume.',
      })
      return
    }
    if (file.size === 0) {
      setFeedback({ type: 'error', text: 'The selected file is empty.' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFeedback({
        type: 'error',
        text: 'File size exceeds the 5 MB limit. Please upload a smaller PDF or DOCX.',
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (replaceTargetId) {
      formData.append('replace_resume_id', String(replaceTargetId))
    }

    setUploading(true)
    setProgress(0)
    try {
      const { data } = await resumesAPI.upload(formData, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      })
      setFeedback({
        type: 'success',
        text: replaceTargetId
          ? `Replaced resume with "${data.original_filename}" and updated extracted details.`
          : `Uploaded "${data.original_filename}" and extracted ${data.extracted_skills.length} skill(s).`,
      })
      setReplaceTargetId(null)
      await fetchResumes()
      setSelectedResume(data)
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Resume upload failed. Please try again.',
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleSetPrimary = async (id) => {
    await resumesAPI.setPrimary(id)
    setFeedback({ type: 'success', text: 'Primary resume updated.' })
    fetchResumes()
  }

  const handleDelete = async (resume) => {
    if (!window.confirm(`Delete "${resume.original_filename}"?`)) return
    await resumesAPI.remove(resume.id)
    setFeedback({ type: 'success', text: `Deleted "${resume.original_filename}".` })
    fetchResumes()
  }

  const handleDownload = async (resume) => {
    const response = await resumesAPI.downloadBlob(resume.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', resume.original_filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <CandidateLayout
      title="Resume Upload & Extraction"
      subtitle="Upload PDF or DOCX resumes, inspect extracted information, and manage multiple resume versions."
    >
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Dropzone Card */}
        <div className="card-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-dashed border-2 border-slate-300 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Your Resume</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Supports <strong>PDF (.pdf)</strong> and <strong>Word (.docx)</strong> files up to{' '}
                <strong>5 MB</strong>. Your file is stored privately and never exposed publicly.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => triggerFilePicker(null)}
            className="btn-primary shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            {uploading ? `Uploading ${progress}%...` : 'Upload Resume'}
          </button>
        </div>

        {uploading && (
          <div className="card-surface p-4 space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Uploading and parsing resume text...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {feedback.text && (
          <div
            className={`p-3.5 rounded-lg text-sm border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading your resumes...</div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes uploaded yet"
            description="Upload a PDF or DOCX resume to extract your technical skills, education, and experience for SMARTMATCH job matching."
            action={
              <button
                type="button"
                onClick={() => triggerFilePicker(null)}
                className="btn-primary"
              >
                <UploadCloud className="w-4 h-4" />
                Select Resume File
              </button>
            }
          />
        ) : (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Resume List */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Your Resumes ({resumes.length})
              </h3>
              {resumes.map((r) => {
                const isSelected = selectedResume?.id === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResume(r)}
                    className={`card-surface p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-teal-600 border-teal-600' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                          <p className="font-semibold text-sm text-slate-900 truncate">
                            {r.original_filename}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {r.file_type.toUpperCase()} &bull;{' '}
                          {(r.file_size_bytes / 1024).toFixed(1)} KB &bull;{' '}
                          {r.extracted_skills.length} skills extracted
                        </p>
                      </div>
                      {r.is_primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold shrink-0">
                          <Star className="w-3 h-3 fill-teal-600" />
                          Primary
                        </span>
                      )}
                    </div>

                    <div
                      className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!r.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(r.id)}
                          className="text-xs font-medium text-teal-700 hover:underline"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerFilePicker(r.id)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(r)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected Resume Extraction Details */}
            {selectedResume && (
              <div className="lg:col-span-7 card-surface p-6 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Extracted Information &bull; {selectedResume.original_filename}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fields that could not be reliably extracted are clearly marked rather than
                    guessed.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 font-medium">Detected Name</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedResume.extracted_name || 'Could not extract'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 font-medium">Detected Email</p>
                    <p className="font-semibold text-slate-900 mt-0.5 truncate">
                      {selectedResume.extracted_email || 'Could not extract'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 font-medium">Detected Phone</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedResume.extracted_phone || 'Could not extract'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Extracted Technical Skills ({selectedResume.extracted_skills.length})
                  </h4>
                  {selectedResume.extracted_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedResume.extracted_skills.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No skills from the dictionary were matched in this document.
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-1.5">Education</h4>
                    {selectedResume.extracted_education.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        {selectedResume.extracted_education.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">Could not extract education section.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-1.5">Experience</h4>
                    {selectedResume.extracted_experience.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        {selectedResume.extracted_experience.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">Could not extract experience section.</p>
                    )}
                  </div>
                </div>

                {selectedResume.extracted_certifications.length > 0 && (
                  <div className="text-xs">
                    <h4 className="font-semibold text-slate-700 mb-1.5">Certifications</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {selectedResume.extracted_certifications.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedResume.extraction_notes.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">Extraction Notices</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {selectedResume.extraction_notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Extracted Text Preview
                  </h4>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 whitespace-pre-wrap max-h-52 overflow-y-auto font-sans">
                    {selectedResume.raw_text || 'No selectable text found.'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
