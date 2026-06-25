/**
 * CSV import logic with fuzzy column matching for bookings.
 */

// Target fields and their known aliases
const FIELD_ALIASES = {
  child_name: ['child_name', 'child name', 'name', 'pupil', 'student', 'attendee', 'participant', 'first name', 'firstname', 'full name', 'fullname'],
  booking_type: ['booking_type', 'booking type', 'type', 'period', 'package', 'duration type'],
  days: ['days', 'day count', 'number of days', 'num days', 'no of days', 'duration', 'nights'],
  fee: ['fee', 'amount', 'total', 'price', 'cost', 'charge', 'total fee', 'total amount', 'invoice'],
  deposit_paid: ['deposit_paid', 'deposit paid', 'deposit', 'paid', 'amount paid', 'payment', 'received'],
  balance_due: ['balance_due', 'balance due', 'balance', 'outstanding', 'remaining', 'amount due', 'owed'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'remark', 'info', 'information'],
}

const BOOKING_TYPE_MAP = {
  day: ['day', 'd', '1 day', 'daily', 'single day'],
  week: ['week', 'w', '1 week', 'weekly', '5 days', 'five days'],
  two_week: ['two_week', 'two week', '2 week', '2 weeks', 'fortnight', 'two weeks', '10 days', 'ten days'],
}

function normalise(str) {
  return (str || '').toString().toLowerCase().trim().replace(/[_\-\/]/g, ' ').replace(/\s+/g, ' ')
}

export function matchColumns(headers) {
  const mapping = {} // field -> header index

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    // 1. Exact match (normalised)
    let found = headers.findIndex(h => normalise(h) === normalise(aliases[0]))
    if (found === -1) {
      // 2. Any alias exact match
      for (const alias of aliases) {
        found = headers.findIndex(h => normalise(h) === normalise(alias))
        if (found !== -1) break
      }
    }
    if (found === -1) {
      // 3. Partial / contains match
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

export function normaliseBookingType(raw) {
  const n = normalise(raw)
  for (const [type, aliases] of Object.entries(BOOKING_TYPE_MAP)) {
    if (aliases.some(a => normalise(a) === n || n.includes(normalise(a)))) {
      return type
    }
  }
  return 'day' // default fallback
}

function looksLikeSummaryRow(row, headers) {
  const firstVal = normalise(row[headers[0]] || '')
  const summaryWords = ['total', 'subtotal', 'sub total', 'grand total', 'sum', 'count', 'average', '']
  return summaryWords.some(w => w !== '' && firstVal.startsWith(w))
}

export function parseCSV(csvText) {
  // Dynamic import not available in this context, use synchronous Papa
  // papaparse is imported in the component
  return csvText
}

export function buildBookingsFromCSV(rows, headers, mapping, campId) {
  const bookings = []

  for (const row of rows) {
    // Skip summary/total rows
    if (looksLikeSummaryRow(row, headers)) continue

    const getVal = (field) => {
      const idx = mapping[field]
      if (idx == null) return null
      return row[headers[idx]]
    }

    const childName = (getVal('child_name') || '').toString().trim()
    if (!childName) continue

    const feeRaw = (getVal('fee') || '0').toString().replace(/[£,$,]/g, '').trim()
    const depositRaw = (getVal('deposit_paid') || '0').toString().replace(/[£,$,]/g, '').trim()
    const balanceRaw = (getVal('balance_due') || '0').toString().replace(/[£,$,]/g, '').trim()
    const daysRaw = (getVal('days') || '1').toString().trim()
    const bookingTypeRaw = getVal('booking_type') || ''

    const fee = parseFloat(feeRaw) || 0
    const depositPaid = parseFloat(depositRaw) || 0
    const balanceDue = parseFloat(balanceRaw) || (fee - depositPaid)
    const days = parseInt(daysRaw) || 1
    const bookingType = normaliseBookingType(bookingTypeRaw)
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
