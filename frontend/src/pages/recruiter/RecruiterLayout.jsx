import React from 'react'
import {
  Award,
  Briefcase,
  LayoutDashboard,
  Scale,
  UserCog,
  Users,
} from 'lucide-react'
import PortalLayout from '../../layouts/PortalLayout'

export const recruiterNavItems = [
  { to: '/recruiter', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/recruiter/candidates', label: 'Candidates', icon: Users },
  { to: '/recruiter/ranking', label: 'Candidate Ranking', icon: Award },
  { to: '/recruiter/bias-check', label: 'Bias & Fairness', icon: Scale },
  { to: '/recruiter/profile', label: 'Recruiter Profile', icon: UserCog },
]

export default function RecruiterLayout({ title, subtitle, children }) {
  return (
    <PortalLayout title={title} subtitle={subtitle} navItems={recruiterNavItems}>
      {children}
    </PortalLayout>
  )
}
