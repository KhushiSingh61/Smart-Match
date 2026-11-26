import React from 'react'

export default function Logo({ dark = false, size = 'md' }) {
  const textSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-base' : 'text-lg'
  const iconSize = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${iconSize} rounded-lg bg-teal-600 flex items-center justify-center shadow-sm`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 text-white"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <span
        className={`${textSize} font-bold tracking-tight ${
          dark ? 'text-white' : 'text-navy-900'
        }`}
      >
        SMART<span className="text-teal-500">MATCH</span>
      </span>
    </div>
  )
}
