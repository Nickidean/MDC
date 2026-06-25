/**
 * Pure functions for computing all derived metrics from raw camp data.
 */

export function computeMetrics(camp, bookings = [], costs = [], funding = []) {
  if (!camp) return null

  // --- Capacity ---
  const childDays = bookings.reduce((sum, b) => sum + (Number(b.days) || 0), 0)
  const capacity = (camp.capacity_per_day || 0) * (camp.days || 0)
  const capacityRemaining = capacity - childDays
  const capacityPct = capacity > 0 ? Math.round((childDays / capacity) * 100) : 0

  // --- Revenue ---
  const projectedRevenue = bookings.reduce((sum, b) => sum + (Number(b.fee) || 0), 0)
  const blendedRate = childDays > 0 ? projectedRevenue / childDays : 0

  // --- Costs ---
  const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const sunkCost = costs.filter(c => c.paid).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const goForwardCost = costs.filter(c => !c.paid).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  // --- Funding ---
  const confirmedFunding = funding
    .filter(f => f.status === 'received')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const awardedFunding = funding
    .filter(f => f.status === 'awarded' || f.status === 'received')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const totalFunding = funding.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)

  // --- P&L ---
  const profitWithAllFunding = projectedRevenue + totalFunding - totalCost
  const profitConfirmedOnly = projectedRevenue + confirmedFunding - totalCost

  // --- Break-even ---
  // How many more paying child-days are needed to cover go-forward costs,
  // after accounting for revenue and confirmed funding already in hand?
  const paidChildDays = bookings
    .filter(b => (Number(b.fee) || 0) > 0)
    .reduce((sum, b) => sum + (Number(b.days) || 0), 0)
  const payingRate = paidChildDays > 0 ? projectedRevenue / paidChildDays : 0
  const alreadyCovered = projectedRevenue + confirmedFunding
  const breakEvenChildDays = payingRate > 0
    ? Math.max(0, Math.ceil((goForwardCost - alreadyCovered) / payingRate))
    : null

  // --- Cash ---
  const cashIn = bookings.reduce((sum, b) => sum + (Number(b.deposit_paid) || 0), 0)
  const cashOut = sunkCost
  const cashPosition = cashIn - cashOut

  return {
    childDays,
    capacity,
    capacityRemaining,
    capacityPct,
    projectedRevenue,
    blendedRate,
    payingRate,
    totalCost,
    sunkCost,
    goForwardCost,
    confirmedFunding,
    awardedFunding,
    totalFunding,
    profitWithAllFunding,
    profitConfirmedOnly,
    breakEvenChildDays,
    cashIn,
    cashOut,
    cashPosition,
  }
}

export function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—'
  return '£' + Number(n).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtNum(n) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-GB')
}
