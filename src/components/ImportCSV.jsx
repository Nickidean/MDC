import React, { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase.js'
import { matchColumns, buildBookingsFromCSV } from '../lib/csvImport.js'

const FIELDS = ['child_name', 'booking_type', 'days', 'fee', 'deposit_paid', 'balance_due', 'notes']
const STORAGE_KEY = 'cba_csv_mapping'

export default function ImportCSV({ campId, onImported }) {
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({}) // field -> header index
  const [preview, setPreview] = useState([])
  const [result, setResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  // Load saved mapping from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setMapping(JSON.parse(saved)) } catch {}
    }
  }, [])

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

        // Auto-detect mapping
        const detected = matchColumns(rawHeaders)

        // Merge with saved mapping (saved wins if header still exists)
        const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } })()
        const merged = { ...detected }
        for (const [field, idx] of Object.entries(saved)) {
          if (idx < rawHeaders.length) merged[field] = Number(idx)
        }
        setMapping(merged)
        setPreview(dataRows.slice(0, 5))
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const objectRows = rows.map(row => {
        const obj = {}
        headers.forEach((h, i) => { obj[h] = row[i] })
        return obj
      })

      const bookings = buildBookingsFromCSV(objectRows, headers, mapping, campId)

      if (bookings.length === 0) {
        setError('No valid booking rows found after filtering.')
        return
      }

      // Upsert: match on child_name + days + fee
      let inserted = 0
      let skipped = 0

      for (const b of bookings) {
        // Check for existing match
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('camp_id', campId)
          .eq('child_name', b.child_name)
          .eq('days', b.days)
          .eq('fee', b.fee)
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
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Import Bookings from CSV</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Upload a CSV file of bookings. The app will try to auto-detect column names. Review the mapping before confirming.
        </p>
      </div>

      <div className="import-dropzone" onClick={() => fileRef.current?.click()}>
        <input type="file" accept=".csv,.tsv,text/csv" ref={fileRef} onChange={handleFile} />
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>CSV</div>
        <div>Click to choose a CSV file</div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>or drag a file here</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="import-result success">
          Import complete: <strong>{result.inserted}</strong> added, <strong>{result.skipped}</strong> skipped (duplicates). Total processed: {result.total}.
        </div>
      )}

      {headers.length > 0 && (
        <>
          <div>
            <div className="section-title">Column Mapping</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Map your CSV columns to the booking fields. Unmapped optional fields will use defaults.
            </p>
            <div className="table-wrapper">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>App Field</th>
                    <th>Required</th>
                    <th>Your CSV Column</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map(field => (
                    <tr key={field}>
                      <td><code>{field}</code></td>
                      <td>{field === 'child_name' ? <span className="badge badge-amber">Required</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Optional</span>}</td>
                      <td>
                        <select
                          value={mapping[field] != null ? String(mapping[field]) : ''}
                          onChange={e => updateMapping(field, e.target.value || '')}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                        >
                          <option value="">— not mapped —</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>{h} (col {i + 1})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <div className="section-title">Preview (first {preview.length} rows)</div>
              <div className="table-wrapper import-preview">
                <table style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      {headers.map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri}>
                        {headers.map((_, ci) => <td key={ci}>{row[ci]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing || !mapping.child_name != null}>
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
