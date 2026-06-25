/**
 * ClassForKids financial CSV import.
 *
 * Real column names: orderId, created, date, value, method, transaction, type,
 * customer, child, discountTotal, discountName, code, venue, term, class, time,
 * day, nominal, fees, income
 *
 * What we can reliably extract:
 *   child_name    <- child
 *   deposit_paid  <- value  (what they actually paid — deposit or full amount)
 *   payment_type  <- class  ("Deposit - …" / "Pay in full - …" / "HAF Funded places - …")
 *   notes         <- customer (parent name) + discount info
 *
 * What we CANNOT get from this CSV:
 *   days          — not present; user sets a default at import time
 *   fee (total)   — for deposit payers only the deposit amount is recorded
 *   balance_due   — unknown for deposit payers; set to 0, user updates later
 *
 * booking_type is derived:
 *   "HAF"         -> booking_type = 'day', fee = 0 (funded)
 *   "Pay in full" -> booking_type inferred from default or left as 'day'
 *   "Deposit"     -> booking_type inferred from default or left as 'day'
 */

function normalise(str) {
  return (str || '').toString().toLowerCase().trim()
}

function detectPaymentClass(classCol) {
  const n = normalise(classCol)
  if (n.includes('haf') || n.includes('funded')) return 'haf'
  if (n.includes('pay in full') || n.includes('full')) return 'full'
  if (n.includes('deposit')) return 'deposit'
  return 'unknown'
}

// Detect if this is a ClassForKids financial report by looking for known columns
export function isClassForKidsFormat(headers) {
  const h = headers.map(normalise)
  return h.includes('child') && h.includes('value') && h.includes('customer')
}

// Build a column index map for ClassForKids format
function buildCFKIndex(headers) {
  const idx = {}
  headers.forEach((h, i) => { idx[normalise(h)] = i })
  return idx
}

function parseAmount(raw) {
  return parseFloat((raw || '0').toString().replace(/[£$,\s]/g, '')) || 0
}

function looksLikeSummaryRow(row) {
  // Skip rows where first cell is empty, or child name looks like a total/summary
  const first = normalise(row[0] || '')
  return !first || ['total', 'subtotal', 'grand total', 'sum', 'count'].some(w => first.startsWith(w))
}

/**
 * Infer days from deposit amount.
 * Deposit rate = £10/day. Sibling discount = 20%, so effective rate = £8/day.
 * We detect sibling discount from discountTotal > 0.
 */
function inferDaysFromDeposit(depositAmount, hasDiscount, depositRatePerDay = 10, siblingDiscountPct = 0.20) {
  if (depositAmount <= 0) return null
  const effectiveRate = hasDiscount ? depositRatePerDay * (1 - siblingDiscountPct) : depositRatePerDay
  const days = Math.round(depositAmount / effectiveRate)
  return days > 0 ? days : null
}

function bookingTypeFromDays(days) {
  if (days >= 9) return 'two_week'
  if (days >= 4) return 'week'
  return 'day'
}

/**
 * Parse ClassForKids rows into booking objects.
 *
 * campDayPrice: the camp's price per day (used to calculate total fee for deposit bookings)
 * depositRatePerDay: £ per day charged as deposit (default £10)
 */
export function buildBookingsFromCFK(rows, headers, campId, campDayPrice = 0, depositRatePerDay = 10) {
  const idx = buildCFKIndex(headers)
  const bookings = []

  for (const row of rows) {
    if (looksLikeSummaryRow(row)) continue

    const child = (row[idx['child']] || '').toString().trim()
    if (!child) continue

    const valueRaw = row[idx['value']] || '0'
    const classCol = row[idx['class']] || ''
    const customer = (row[idx['customer']] || '').toString().trim()
    const discountTotal = parseAmount(row[idx['discounttotal']])
    const discountName = (row[idx['discountname']] || '').toString().trim()

    const paymentClass = detectPaymentClass(classCol)
    const amountPaid = parseAmount(valueRaw)
    const hasSiblingDiscount = discountTotal > 0

    let fee = 0
    let depositPaid = amountPaid
    let balanceDue = 0
    let days = null
    let notes = customer ? `Parent: ${customer}` : ''

    if (paymentClass === 'haf') {
      fee = 0
      depositPaid = 0
      balanceDue = 0
      days = inferDaysFromDeposit(0, false, depositRatePerDay) // unknown, will use fallback
      notes = (notes ? notes + ' | ' : '') + 'HAF Funded'
    } else if (paymentClass === 'deposit') {
      days = inferDaysFromDeposit(amountPaid, hasSiblingDiscount, depositRatePerDay)
      if (days && campDayPrice > 0) {
        const fullFee = days * campDayPrice
        const discountedFee = hasSiblingDiscount ? fullFee * 0.8 : fullFee
        fee = Math.round(discountedFee * 100) / 100
        balanceDue = Math.max(0, Math.round((fee - amountPaid) * 100) / 100)
      } else {
        fee = amountPaid // fallback until camp price is set
        balanceDue = 0
        notes = (notes ? notes + ' | ' : '') + 'Balance TBC — set camp day price to auto-calculate'
      }
    } else if (paymentClass === 'full') {
      fee = amountPaid
      depositPaid = amountPaid
      balanceDue = 0
      // For pay-in-full, infer days from fee / day price if available
      if (campDayPrice > 0) {
        const effectivePrice = hasSiblingDiscount ? campDayPrice * 0.8 : campDayPrice
        days = Math.round(amountPaid / effectivePrice) || null
      }
    }

    if (hasSiblingDiscount) {
      notes = (notes ? notes + ' | ' : '') + `Sibling discount: £${discountTotal.toFixed(2)}${discountName ? ' (' + discountName + ')' : ''}`
    }

    const resolvedDays = days || 5 // fallback to 5 (1 week) if can't infer
    const bookingType = bookingTypeFromDays(resolvedDays)

    bookings.push({
      camp_id: campId,
      child_name: child,
      booking_type: bookingType,
      days: resolvedDays,
      fee,
      deposit_paid: depositPaid,
      balance_due: balanceDue,
      notes: notes || null,
    })
  }

  return bookings
}

// ── Generic / fallback import ─────────────────────────────────────────────────

const FIELD_ALIASES = {
  child_name: ['child', 'child name', 'child_name', 'name', 'pupil', 'student', 'attendee', 'participant'],
  booking_type: ['booking_type', 'booking type', 'type', 'period', 'package', 'class'],
  days: ['days', 'day count', 'number of days', 'duration'],
  fee: ['fee', 'value', 'amount', 'total', 'price', 'cost', 'charge', 'income'],
  deposit_paid: ['deposit_paid', 'deposit paid', 'deposit', 'paid', 'amount paid'],
  balance_due: ['balance_due', 'balance due', 'balance', 'outstanding', 'remaining'],
  notes: ['notes', 'note', 'comments', 'customer'],
}

export function matchColumns(headers) {
  const mapping = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    let found = -1
    for (const alias of aliases) {
      found = headers.findIndex(h => normalise(h) === normalise(alias))
      if (found !== -1) break
    }
    if (found === -1) {
      for (const alias of aliases) {
        found = headers.findIndex(h => normalise(h).includes(normalise(alias)) || normalise(alias).includes(normalise(h)))
        if (found !== -1) break
      }
    }
    if (found !== -1 && !Object.values(mapping).includes(found)) {
      mapping[field] = found
    }
  }
  return mapping
}

const BOOKING_TYPE_MAP = {
  day: ['day', '1 day', 'daily', 'single day'],
  week: ['week', '1 week', 'weekly', '5 days'],
  two_week: ['two week', '2 week', '2 weeks', 'fortnight', 'two weeks', '10 days'],
}

export function normaliseBookingType(raw) {
  const n = normalise(raw)
  for (const [type, aliases] of Object.entries(BOOKING_TYPE_MAP)) {
    if (aliases.some(a => normalise(a) === n || n.includes(normalise(a)))) return type
  }
  return 'day'
}

export function buildBookingsFromCSV(rows, headers, mapping, campId) {
  const bookings = []
  for (const row of rows) {
    if (looksLikeSummaryRow(Object.values(row))) continue
    const getVal = (field) => {
      const idx = mapping[field]
      if (idx == null) return null
      return row[headers[idx]]
    }
    const childName = (getVal('child_name') || '').toString().trim()
    if (!childName) continue
    const fee = parseAmount(getVal('fee'))
    const depositPaid = parseAmount(getVal('deposit_paid'))
    const balanceDue = parseAmount(getVal('balance_due')) || (fee - depositPaid)
    const days = parseInt((getVal('days') || '1').toString()) || 1
    const bookingType = normaliseBookingType(getVal('booking_type') || '')
    const notes = (getVal('notes') || '').toString().trim()
    bookings.push({
      camp_id: campId,
      child_name: childName,
      booking_type: bookingType,
      days,
      fee,
      deposit_paid: depositPaid,
      balance_due: balanceDue,
      notes: notes || null,
    })
  }
  return bookings
}
