import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = { child_name: '', days: '', haf_code: '', notes: '' }

function HafRow({ booking, onEdit, onDelete }) {
  return (
    <tr>
      <td>{booking.child_name}</td>
      <td style={{ textAlign: 'center' }}>{booking.days}</td>
      <td>{booking.haf_code ? <code style={{ fontSize: '0.85rem' }}>{booking.haf_code}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
      <td className="text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.notes}</td>
      <td className="col-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(booking)}>Edit</button>{' '}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(booking.id)}>Del</button>
      </td>
    </tr>
  )
}

function InlineForm({ row, onChange, onSave, onCancel, saving }) {
  return (
    <tr className="inline-form">
      <td><input value={row.child_name} onChange={e => onChange('child_name', e.target.value)} placeholder="Child name" /></td>
      <td><input type="number" min="1" max="20" value={row.days} onChange={e => onChange('days', e.target.value)} placeholder="Days" style={{ width: '60px' }} /></td>
      <td><input value={row.haf_code} onChange={e => onChange('haf_code', e.target.value)} placeholder="HAF code" style={{ width: '110px' }} /></td>
      <td><input value={row.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Notes" /></td>
      <td className="col-actions">
        <button className="btn btn-success btn-sm" onClick={onSave} disabled={saving}>Save</button>{' '}
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  )
}

export default function HafTab({ campId, hafPlaces, bookings, onChanged, onUpdateHafPlaces }) {
  const [addRow, setAddRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editingLimit, setEditingLimit] = useState(false)
  const [limitInput, setLimitInput] = useState(hafPlaces ?? 50)

  const hafBookings = bookings.filter(b => b.fee === 0 || b.haf_code)
  const placesUsed = hafBookings.reduce((s, b) => s + Number(b.days), 0)
  const placesRemaining = (hafPlaces ?? 50) - placesUsed
  const pct = hafPlaces ? Math.min(100, Math.round((placesUsed / hafPlaces) * 100)) : 0

  function startAdd() { setAddRow({ ...EMPTY }); setEditRow(null) }
  function startEdit(b) { setEditRow({ ...b, haf_code: b.haf_code || '', notes: b.notes || '' }); setAddRow(null) }
  function changeAdd(f, v) { setAddRow(prev => ({ ...prev, [f]: v })) }
  function changeEdit(f, v) { setEditRow(prev => ({ ...prev, [f]: v })) }

  function buildPayload(row) {
    return {
      camp_id: campId,
      child_name: row.child_name.trim(),
      booking_type: 'day',
      days: Number(row.days) || 1,
      fee: 0,
      deposit_paid: 0,
      balance_due: 0,
      haf_code: row.haf_code?.trim() || null,
      notes: row.notes?.trim() || null,
    }
  }

  async function saveAdd() {
    if (!addRow.child_name.trim()) { setError('Child name is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('bookings').insert(buildPayload(addRow))
      if (error) throw error
      setAddRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function saveEdit() {
    if (!editRow.child_name.trim()) { setError('Child name is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('bookings').update(buildPayload(editRow)).eq('id', editRow.id)
      if (error) throw error
      setEditRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function deleteBooking(id) {
    if (!confirm('Remove this HAF booking?')) return
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function saveLimit() {
    await onUpdateHafPlaces(Number(limitInput) || 50)
    setEditingLimit(false)
  }

  const limitColor = placesRemaining < 0 ? 'var(--color-red)' : placesRemaining <= 5 ? 'var(--color-amber)' : 'var(--color-green)'

  return (
    <div>
      {/* Allocation bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.5rem', color: limitColor }}>{placesRemaining}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
              places remaining of{' '}
              {editingLimit ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="number" min="1" value={limitInput} onChange={e => setLimitInput(e.target.value)}
                    style={{ width: '60px', padding: '0.2rem 0.4rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.9rem' }} />
                  <button className="btn btn-success btn-sm" onClick={saveLimit}>OK</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingLimit(false)}>Cancel</button>
                </span>
              ) : (
                <span>
                  <strong>{hafPlaces ?? 50}</strong>{' '}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }} onClick={() => { setLimitInput(hafPlaces ?? 50); setEditingLimit(true) }}>change</button>
                </span>
              )}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{placesUsed} used · {hafBookings.length} children</div>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-red)' : pct >= 80 ? 'var(--color-amber)' : 'var(--color-green)', height: '100%', borderRadius: '99px', transition: 'width 0.3s' }} />
        </div>
        {placesRemaining < 0 && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Over-allocated by {Math.abs(placesRemaining)} places.
          </div>
        )}
      </div>

      <div className="page-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>HAF Children ({hafBookings.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Child</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Child Name</th>
              <th style={{ textAlign: 'center' }}>Places (days)</th>
              <th>HAF Code</th>
              <th>Notes</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addRow && (
              <InlineForm row={addRow} onChange={changeAdd} onSave={saveAdd} onCancel={() => setAddRow(null)} saving={saving} />
            )}
            {hafBookings.map(b => editRow?.id === b.id ? (
              <InlineForm key={b.id} row={editRow} onChange={changeEdit} onSave={saveEdit} onCancel={() => setEditRow(null)} saving={saving} />
            ) : (
              <HafRow key={b.id} booking={b} onEdit={startEdit} onDelete={deleteBooking} />
            ))}
            {hafBookings.length === 0 && !addRow && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No HAF children yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
