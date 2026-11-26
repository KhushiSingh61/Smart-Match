import React from 'react'

export default function MatchScoreRing({ score, size = 84, label = 'Match' }) {
  const numericScore = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (numericScore / 100) * circumference

  const color =
    numericScore >= 75
      ? '#0D9488'
      : numericScore >= 50
      ? '#0284C7'
      : numericScore >= 30
      ? '#D97706'
      : '#E11D48'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-slate-900 leading-none">
          {typeof score === 'number' ? `${Math.round(score)}%` : '—'}
        </span>
        {label && <span className="text-[10px] font-medium text-slate-500 mt-0.5">{label}</span>}
      </div>
    </div>
  )
}
