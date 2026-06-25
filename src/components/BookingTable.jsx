import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmt } from '../lib/metrics.js'

const EMPTY_ROW = {
  child_name: '',
  booking_type: 'day',
  days: '',
  fee: '',
  deposit_paid: '',
  balance_due: '',
  haf_code: '',
  notes: '',
}

function BookingRow({ booking, onEdit, onDelete }) {
  return (
    <tr>
      <td>{booking.child_name}</td>
      <td><span className={`badge badge-${booking.booking_type === 'two_week' ? 'green' : booking.booking_type === 'week' ? 'amber' : 'grey'}`}>{booking.booking_type.replace('_', ' ')}</span></td>
      <td>{booking.days}</td>
      <td>{fmt(booking.fee)}</td>
      <td>{fmt(booking.deposit_paid)}</td>
      <td>{fmt(booking.balance_due)}</td>
      <td>{booking.haf_code ? <code style={{ fontSize: '0.8rem' }}>{booking.haf_code}</code> : <span className="text-muted">—</span>}</td>
      <td className="text-muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.notes}</td>
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
      <td>
        <select value={row.booking_type} onChange={e => onChange('booking_type', e.target.value)}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="two_week">Two Week</option>
        </select>
      </td>
      <td><input type="number" min="1" value={row.days} onChange={e => onChange('days', e.target.value)} placeholder="Days" /></td>
      <td><input type="number" min="0" step="0.01" value={row.fee} onChange={e => onChange('fee', e.target.value)} placeholder="Fee" /></td>
      <td><input type="number" min="0" step="0.01" value={row.deposit_paid} onChange={e => onChange('deposit_paid', e.target.value)} placeholder="Deposit" /></td>
      <td><input type="number" min="0" step="0.01" value={row.balance_due} onChange={e => onChange('balance_due', e.target.value)} placeholder="Balance" /></td>
      <td><input value={row.haf_code} onChange={e => onChange('haf_code', e.target.value)} placeholder="HAF code" style={{ width: '90px' }} /></td>
      <td><input value={row.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Notes" /></td>
      <td className="col-actions">
        <button className="btn btn-success btn-sm" onClick={onSave} disabled={saving}>Save</button>{' '}
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  )
}

export default function BookingTable({ campId, bookings, onChanged }) {
  const [addRow, setAddRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function startAdd() { setAddRow({ ...EMPTY_ROW }); setEditRow(null) }
  function startEdit(b) { setEditRow({ ...b, haf_code: b.haf_code || '' }); setAddRow(null) }
  function changeAdd(f, v) { setAddRow(prev => ({ ...prev, [f]: v })) }
  function changeEdit(f, v) { setEditRow(prev => ({ ...prev, [f]: v })) }

  function buildPayload(row) {
    return {
      camp_id: campId,
      child_name: row.child_name.trim(),
      booking_type: row.booking_type,
      days: Number(row.days) || 1,
      fee: Number(row.fee) || 0,
      deposit_paid: Number(row.deposit_paid) || 0,
      balance_due: Number(row.balance_due) || 0,
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

  async function deleteBooking(bookingId) {
    if (!confirm('Delete this booking?')) return
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) throw error
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const hafBookings = bookings.filter(b => b.haf_code)
  const totalFee = bookings.reduce((s, b) => s + Number(b.fee), 0)
  const totalDeposit = bookings.reduce((s, b) => s + Number(b.deposit_paid), 0)
  const totalBalance = bookings.reduce((s, b) => s + Number(b.balance_due), 0)
  const totalDays = bookings.reduce((s, b) => s + Number(b.days), 0)

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Bookings ({bookings.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {hafBookings.length > 0 && (
            <span className="badge badge-green">{hafBookings.length} HAF</span>
          )}
          <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Booking</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Child Name</th>
              <th>Type</th>
              <th>Days</th>
              <th>Fee</th>
              <th>Deposit</th>
              <th>Balance</th>
              <th>HAF Code</th>
              <th>Notes</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addRow && (
              <InlineForm row={addRow} onChange={changeAdd} onSave={saveAdd} onCancel={() => setAddRow(null)} saving={saving} />
            )}
            {bookings.map(b => editRow?.id === b.id ? (
              <InlineForm key={b.id} row={editRow} onChange={changeEdit} onSave={saveEdit} onCancel={() => setEditRow(null)} saving={saving} />
            ) : (
              <BookingRow key={b.id} booking={b} onEdit={startEdit} onDelete={deleteBooking} />
            ))}
            {bookings.length > 0 && (
              <tr style={{ fontWeight: 600, background: 'var(--surface)' }}>
                <td colSpan={2}>Total ({bookings.length})</td>
                <td>{totalDays}</td>
                <td>{fmt(totalFee)}</td>
                <td>{fmt(totalDeposit)}</td>
                <td>{fmt(totalBalance)}</td>
                <td colSpan={3} />
              </tr>
            )}
            {bookings.length === 0 && !addRow && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No bookings yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
