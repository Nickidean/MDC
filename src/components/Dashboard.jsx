import React from 'react'
import { fmt, fmtNum } from '../lib/metrics.js'

function MetricCard({ label, value, sub, color = 'neutral', progress }) {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {progress != null && (
        <div className="progress-bar">
          <div
            className={`progress-fill fill-${color}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

function profitColor(n) {
  if (n == null) return 'neutral'
  if (n > 0) return 'green'
  if (n > -500) return 'amber'
  return 'red'
}

function cashColor(n) {
  if (n == null) return 'neutral'
  if (n >= 0) return 'green'
  return 'red'
}

function capacityColor(pct) {
  if (pct >= 80) return 'green'
  if (pct >= 40) return 'amber'
  return 'red'
}

export default function Dashboard({ camp, metrics, bookings, costs, funding }) {
  if (!metrics) return <div className="loading">No data</div>

  const {
    childDays, capacity, capacityRemaining, capacityPct,
    projectedRevenue, blendedRate,
    totalCost, sunkCost, goForwardCost,
    confirmedFunding, awardedFunding, totalFunding,
    profitWithAllFunding, profitConfirmedOnly,
    breakEvenChildDays,
    cashIn, cashOut, cashPosition,
  } = metrics

  const capColor = capacityColor(capacityPct)

  return (
    <div>
      {/* Summary strip */}
      {profitConfirmedOnly < 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <strong>At Risk:</strong> With confirmed funding only, the camp is currently projecting a loss of {fmt(Math.abs(profitConfirmedOnly))}.
          {totalFunding > confirmedFunding && ` (Unconfirmed funding of ${fmt(totalFunding - confirmedFunding)} would close this gap.)`}
        </div>
      )}

      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          label="Child-Days Booked"
          value={`${fmtNum(childDays)} / ${fmtNum(capacity)}`}
          sub={`${capacityPct}% full · ${fmtNum(capacityRemaining)} remaining`}
          color={capColor}
          progress={capacityPct}
        />
        <MetricCard
          label="Projected Revenue"
          value={fmt(projectedRevenue)}
          sub={`from ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
          color="neutral"
        />
        <MetricCard
          label="Blended Rate"
          value={fmt(blendedRate, 2)}
          sub="per child-day"
          color={blendedRate > 0 ? 'neutral' : 'amber'}
        />
        <MetricCard
          label="Total Cost"
          value={fmt(totalCost)}
          sub={`${fmt(sunkCost)} sunk · ${fmt(goForwardCost)} to go`}
          color="neutral"
        />
        <MetricCard
          label="P&L (all funding)"
          value={fmt(profitWithAllFunding)}
          sub={`Funding: ${fmt(totalFunding)} total`}
          color={profitColor(profitWithAllFunding)}
        />
        <MetricCard
          label="P&L (confirmed only)"
          value={fmt(profitConfirmedOnly)}
          sub={`${fmt(confirmedFunding)} confirmed · ${fmt(awardedFunding)} awarded`}
          color={profitColor(profitConfirmedOnly)}
        />
        <MetricCard
          label="Break-Even Still Needed"
          value={breakEvenChildDays != null ? (breakEvenChildDays <= 0 ? 'Already covered' : `${fmtNum(breakEvenChildDays)} child-days`) : '—'}
          sub={breakEvenChildDays != null && breakEvenChildDays > 0 ? 'to cover remaining costs' : undefined}
          color={breakEvenChildDays != null && breakEvenChildDays <= 0 ? 'green' : 'amber'}
        />
        <MetricCard
          label="Cash Position"
          value={fmt(cashPosition)}
          sub={`In: ${fmt(cashIn)} · Out: ${fmt(cashOut)}`}
          color={cashColor(cashPosition)}
        />
      </div>

      {/* Funding breakdown */}
      {funding.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="section-title">Funding Summary</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Applied: </span><strong>{fmt(funding.filter(f => f.status === 'applied').reduce((s, f) => s + Number(f.amount), 0))}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Awarded: </span><strong>{fmt(funding.filter(f => f.status === 'awarded').reduce((s, f) => s + Number(f.amount), 0))}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Received: </span><strong style={{ color: 'var(--green)' }}>{fmt(confirmedFunding)}</strong></div>
          </div>
        </div>
      )}

      {/* Costs breakdown */}
      {costs.length > 0 && (
        <div className="card">
          <div className="section-title">Costs by Category</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            {['fixed', 'staff', 'variable'].map(cat => {
              const catTotal = costs.filter(c => c.category === cat).reduce((s, c) => s + Number(c.amount), 0)
              return catTotal > 0 ? (
                <div key={cat}><span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{cat}: </span><strong>{fmt(catTotal)}</strong></div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
