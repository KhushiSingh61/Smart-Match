import React from 'react'
import {
  Briefcase,
  ClipboardCheck,
  FileUp,
  LayoutDashboard,
  Sparkles,
  UserCircle,
} from 'lucide-react'
import PortalLayout from '../../layouts/PortalLayout'

export const candidateNavItems = [
  { to: '/candidate', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/candidate/profile', label: 'My Profile', icon: UserCircle },
  { to: '/candidate/resumes', label: 'Upload Resume', icon: FileUp },
  { to: '/candidate/jobs', label: 'Browse Jobs', icon: Briefcase },
  { to: '/candidate/applications', label: 'My Applications', icon: ClipboardCheck },
  { to: '/candidate/insights', label: 'Match Insights', icon: Sparkles },
]

export default function CandidateLayout({ title, subtitle, children }) {
  return (
    <PortalLayout title={title} subtitle={subtitle} navItems={candidateNavItems}>
      {children}
    </PortalLayout>
  )
}
