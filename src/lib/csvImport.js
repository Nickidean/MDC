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
 * Parse ClassForKids rows into booking objects.
 *
 * defaultDays: number of days to assign (user-specified at import time)
 * defaultBookingType: 'day' | 'week' | 'two_week'
 */
export function buildBookingsFromCFK(rows, headers, campId, defaultDays = 1, defaultBookingType = 'week') {
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

    let fee = amountPaid
    let depositPaid = amountPaid
    let balanceDue = 0
    let bookingType = defaultBookingType
    let notes = customer ? `Parent: ${customer}` : ''

    if (paymentClass === 'haf') {
      fee = 0
      depositPaid = 0
      balanceDue = 0
      bookingType = defaultBookingType
      notes = (notes ? notes + ' | ' : '') + 'HAF Funded'
    } else if (paymentClass === 'deposit') {
      // We only know the deposit; total fee and balance are unknown
      fee = amountPaid  // best guess: we'll show deposit as fee until user updates
      depositPaid = amountPaid
      balanceDue = 0   // unknown — user should update
      notes = (notes ? notes + ' | ' : '') + 'Deposit paid — balance TBC'
    } else if (paymentClass === 'full') {
      fee = amountPaid
      depositPaid = amountPaid
      balanceDue = 0
    }

    if (discountTotal > 0) {
      notes = (notes ? notes + ' | ' : '') + `Discount: ${discountName || ''} £${discountTotal.toFixed(2)}`
    }

    bookings.push({
      camp_id: campId,
      child_name: child,
      booking_type: bookingType,
      days: defaultDays,
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
