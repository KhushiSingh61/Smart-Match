import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'

import RecruiterDashboard from './pages/recruiter/RecruiterDashboard'
import RecruiterJobs from './pages/recruiter/RecruiterJobs'
import RecruiterCandidates from './pages/recruiter/RecruiterCandidates'
import RecruiterShortlist from './pages/recruiter/RecruiterShortlist'
import RecruiterBiasCheck from './pages/recruiter/RecruiterBiasCheck'
import RecruiterProfile from './pages/recruiter/RecruiterProfile'

import CandidateDashboard from './pages/candidate/CandidateDashboard'
import CandidateProfile from './pages/candidate/CandidateProfile'
import CandidateResumes from './pages/candidate/CandidateResumes'
import CandidateJobs from './pages/candidate/CandidateJobs'
import CandidateApplications from './pages/candidate/CandidateApplications'
import CandidateMatchInsights from './pages/candidate/CandidateMatchInsights'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Recruiter Portal Routes */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/candidates"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterCandidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/ranking"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterShortlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/bias-check"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterBiasCheck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/profile"
            element={
              <ProtectedRoute allowedRole="recruiter">
                <RecruiterProfile />
              </ProtectedRoute>
            }
          />

          {/* Candidate Portal Routes */}
          <Route
            path="/candidate"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/profile"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/resumes"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateResumes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/jobs"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/applications"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/insights"
            element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateMatchInsights />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
