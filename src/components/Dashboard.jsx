import React from 'react'
import { fmt, fmtNum } from '../lib/metrics.js'

function MetricCard({ label, value, explanation, sub, color = 'neutral', progress }) {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {explanation && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.4 }}>{explanation}</div>}
      {sub && <div className="metric-sub" style={{ marginTop: '0.4rem' }}>{sub}</div>}
      {progress != null && (
        <div className="progress-bar">
          <div className={`progress-fill fill-${color}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
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
      {profitConfirmedOnly < 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <strong>At Risk:</strong> The camp is currently projecting a loss of {fmt(Math.abs(profitConfirmedOnly))}. You need either more bookings or confirmed funding to close this gap.
        </div>
      )}
      {profitConfirmedOnly >= 0 && profitWithAllFunding > profitConfirmedOnly && (
        <div className="alert" style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Projecting a surplus of <strong>{fmt(profitConfirmedOnly)}</strong> on confirmed funding. {fmt(totalFunding - confirmedFunding)} in unconfirmed grants could add to this if they land.
        </div>
      )}

      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>

        <MetricCard
          label="Capacity Utilisation"
          value={`${fmtNum(childDays)} / ${fmtNum(capacity)} child-days`}
          explanation="Total days attended by all children booked, vs the maximum your camp can take. A child attending for 5 days counts as 5 child-days."
          sub={`${capacityPct}% full · ${fmtNum(capacityRemaining)} child-days remaining`}
          color={capColor}
          progress={capacityPct}
        />

        <MetricCard
          label="Gross Revenue"
          value={fmt(projectedRevenue)}
          explanation="Total fees charged across all bookings — what the camp will bring in from families once everyone has paid in full."
          sub={`from ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
          color="neutral"
        />

        <MetricCard
          label="Blended Rate"
          value={`${fmt(blendedRate, 2)} per child-day`}
          explanation="Your average revenue per child per day across all booking types. Falls below your day price when week or two-week bundles are popular, because those are priced at a discount."
          color={blendedRate > 0 ? 'neutral' : 'amber'}
        />

        <MetricCard
          label="Total Cost Base"
          value={fmt(totalCost)}
          explanation="Everything you're spending to run this camp. Split between sunk costs (already paid — committed regardless of what happens next) and costs still to pay."
          sub={`${fmt(sunkCost)} already paid · ${fmt(goForwardCost)} still to pay`}
          color="neutral"
        />

        <MetricCard
          label="Net P&L"
          value={fmt(profitConfirmedOnly)}
          explanation="Revenue plus confirmed funding (received in the bank) minus total costs. This is your real position today — treat this as the number to act on."
          sub={`${fmt(confirmedFunding)} confirmed funding included`}
          color={profitColor(profitConfirmedOnly)}
        />

        <MetricCard
          label="Upside if All Funding Lands"
          value={fmt(profitWithAllFunding)}
          explanation={`If all unconfirmed grants come through (${fmt(totalFunding - confirmedFunding)} still outstanding), this is what the P&L would look like. Don't plan around this — treat it as a bonus if it happens.`}
          sub={`${fmt(totalFunding)} total funding pipeline`}
          color="neutral"
        />

        <MetricCard
          label="Go-Forward Break-Even"
          value={
            breakEvenChildDays != null
              ? breakEvenChildDays <= 0
                ? 'Already in surplus'
                : `${fmtNum(breakEvenChildDays)} more child-days`
              : '—'
          }
          explanation={
            breakEvenChildDays != null && breakEvenChildDays <= 0
              ? "Your current bookings cover all remaining unpaid costs — you won't lose more money by running the camp. Note: the overall P&L may still be negative because of costs already paid that can't be recovered."
              : "How many more child-days you need to book before your remaining (unpaid) costs are covered. Sunk costs are excluded — they're spent regardless."
          }
          color={breakEvenChildDays != null && breakEvenChildDays <= 0 ? 'green' : 'amber'}
        />

        <MetricCard
          label="Cash Position"
          value={fmt(cashPosition)}
          explanation="Money actually in vs out right now. In = deposits and payments collected from families. Out = costs you've already paid. Does not include money still owed to you or bills still to pay."
          sub={`In: ${fmt(cashIn)} collected · Out: ${fmt(cashOut)} paid`}
          color={cashColor(cashPosition)}
        />

      </div>

      {funding.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="section-title">Funding Summary</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Grants and external funding at each stage of the pipeline.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Applied (awaiting decision): </span><strong>{fmt(funding.filter(f => f.status === 'applied').reduce((s, f) => s + Number(f.amount), 0))}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Awarded (not yet paid): </span><strong>{fmt(funding.filter(f => f.status === 'awarded').reduce((s, f) => s + Number(f.amount), 0))}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Received (in the bank): </span><strong style={{ color: 'var(--green)' }}>{fmt(confirmedFunding)}</strong></div>
          </div>
        </div>
      )}

      {costs.length > 0 && (
        <div className="card">
          <div className="section-title">Cost Base by Category</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Fixed = same regardless of numbers (venue, insurance). Staff = people costs. Variable = scales with child-days (e.g. consumables).
          </div>
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
