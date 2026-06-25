import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase.js'
import { isClassForKidsFormat, buildBookingsFromCFK, matchColumns, buildBookingsFromCSV } from '../lib/csvImport.js'

const BOOKING_TYPE_OPTIONS = [
  { value: 'day', label: 'Day (1 day)' },
  { value: 'week', label: 'Week (5 days)' },
  { value: 'two_week', label: 'Two weeks (10 days)' },
]

export default function ImportCSV({ campId, onImported }) {
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [isCFK, setIsCFK] = useState(false)
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [result, setResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  // CFK-specific defaults (set by user before import)
  const [defaultDays, setDefaultDays] = useState(5)
  const [defaultBookingType, setDefaultBookingType] = useState('week')

  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setError(null)

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length < 2) {
          setError('File appears to be empty or has only one row.')
          return
        }
        const rawHeaders = results.data[0].map(h => String(h).trim())
        const dataRows = results.data.slice(1)
        setHeaders(rawHeaders)
        setRows(dataRows)

        const cfk = isClassForKidsFormat(rawHeaders)
        setIsCFK(cfk)

        if (!cfk) {
          const detected = matchColumns(rawHeaders)
          const saved = (() => { try { return JSON.parse(localStorage.getItem('cba_csv_mapping') || '{}') } catch { return {} } })()
          const merged = { ...detected }
          for (const [field, idx] of Object.entries(saved)) {
            if (idx < rawHeaders.length) merged[field] = Number(idx)
          }
          setMapping(merged)
        }

        setPreview(dataRows.slice(0, 4))
      },
      error: (err) => setError(err.message),
    })
  }

  function updateMapping(field, headerIdx) {
    const val = headerIdx === '' ? undefined : Number(headerIdx)
    setMapping(prev => {
      const next = { ...prev }
      if (val == null) delete next[field]
      else next[field] = val
      localStorage.setItem('cba_csv_mapping', JSON.stringify(next))
      return next
    })
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      let bookings = []

      if (isCFK) {
        bookings = buildBookingsFromCFK(rows, headers, campId, Number(defaultDays) || 1, defaultBookingType)
      } else {
        const objectRows = rows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] })
          return obj
        })
        bookings = buildBookingsFromCSV(objectRows, headers, mapping, campId)
      }

      if (bookings.length === 0) {
        setError('No valid booking rows found after filtering.')
        return
      }

      let inserted = 0
      let skipped = 0

      for (const b of bookings) {
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('camp_id', campId)
          .eq('child_name', b.child_name)
          .eq('deposit_paid', b.deposit_paid)
          .maybeSingle()

        if (existing) {
          skipped++
        } else {
          const { error: insertErr } = await supabase.from('bookings').insert(b)
          if (insertErr) throw insertErr
          inserted++
        }
      }

      setResult({ inserted, skipped, total: bookings.length })
      onImported()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="import-section">
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Import Bookings from CSV</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Export the Financial Report from ClassForKids and upload it here.
      </p>

      <div className="import-dropzone" onClick={() => fileRef.current?.click()}>
        <input type="file" accept=".csv,text/csv" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>CSV</div>
        <div>Click to choose a CSV file</div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>ClassForKids Financial Report export</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="import-result success">
          Import complete: <strong>{result.inserted}</strong> added, <strong>{result.skipped}</strong> already existed. Total: {result.total}.
        </div>
      )}

      {headers.length > 0 && (
        <>
          {isCFK ? (
            <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>ClassForKids format detected</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Child names, payment amounts and booking types (Deposit / Pay in full / HAF) will be imported automatically.
                Because ClassForKids doesn't include the number of days in the export, set a default below — you can adjust individual bookings afterwards.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' }}>
                  Default booking type
                  <select value={defaultBookingType} onChange={e => setDefaultBookingType(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {BOOKING_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' }}>
                  Default days per booking
                  <input type="number" min="1" max="30" value={defaultDays}
                    onChange={e => setDefaultDays(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)', width: '80px' }} />
                </label>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                <strong>Note on deposits:</strong> For deposit bookings, only the deposit amount is recorded — the total fee and balance due will be set to the deposit amount and "balance TBC" in notes. Update them manually once you know the full amount.
              </p>
            </div>
          ) : (
            <div>
              <div className="section-title">Column Mapping</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Map your CSV columns to booking fields.
              </p>
              <div className="table-wrapper">
                <table className="mapping-table">
                  <thead>
                    <tr><th>App Field</th><th>Required</th><th>Your CSV Column</th></tr>
                  </thead>
                  <tbody>
                    {['child_name', 'booking_type', 'days', 'fee', 'deposit_paid', 'balance_due', 'notes'].map(field => (
                      <tr key={field}>
                        <td><code>{field}</code></td>
                        <td>{field === 'child_name' ? <span className="badge badge-amber">Required</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Optional</span>}</td>
                        <td>
                          <select value={mapping[field] != null ? String(mapping[field]) : ''}
                            onChange={e => updateMapping(field, e.target.value || '')}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            <option value="">— not mapped —</option>
                            {headers.map((h, i) => <option key={i} value={i}>{h} (col {i + 1})</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <div className="section-title">Preview (first {preview.length} rows)</div>
              <div className="table-wrapper import-preview">
                <table style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri}>{headers.map((_, ci) => <td key={ci}>{row[ci]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
            <button className="btn btn-ghost" onClick={() => { setHeaders([]); setRows([]); setPreview([]); setResult(null); if (fileRef.current) fileRef.current.value = '' }}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}
