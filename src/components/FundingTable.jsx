import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmt } from '../lib/metrics.js'

const EMPTY_ROW = {
  source: '',
  amount: '',
  status: 'applied',
  restricted: false,
  notes: '',
}

const STATUS_BADGE = {
  applied: 'badge-grey',
  awarded: 'badge-amber',
  received: 'badge-green',
}

function FundingRow({ item, onEdit, onDelete }) {
  return (
    <tr>
      <td>{item.source}</td>
      <td>{fmt(item.amount)}</td>
      <td><span className={`badge ${STATUS_BADGE[item.status] || 'badge-grey'}`}>{item.status}</span></td>
      <td className="col-check">
        <input type="checkbox" checked={item.restricted} readOnly title="Restricted funding" />
      </td>
      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{item.notes}</td>
      <td className="col-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Edit</button>{' '}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Del</button>
      </td>
    </tr>
  )
}

function InlineForm({ row, onChange, onSave, onCancel, saving }) {
  return (
    <tr className="inline-form">
      <td><input value={row.source} onChange={e => onChange('source', e.target.value)} placeholder="Funding source" /></td>
      <td><input type="number" min="0" step="0.01" value={row.amount} onChange={e => onChange('amount', e.target.value)} placeholder="Amount" /></td>
      <td>
        <select value={row.status} onChange={e => onChange('status', e.target.value)}>
          <option value="applied">Applied</option>
          <option value="awarded">Awarded</option>
          <option value="received">Received</option>
        </select>
      </td>
      <td className="col-check"><input type="checkbox" checked={row.restricted} onChange={e => onChange('restricted', e.target.checked)} /></td>
      <td><input value={row.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Notes" /></td>
      <td className="col-actions">
        <button className="btn btn-success btn-sm" onClick={onSave} disabled={saving}>Save</button>{' '}
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  )
}

export default function FundingTable({ campId, funding, onChanged }) {
  const [addRow, setAddRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function startAdd() { setAddRow({ ...EMPTY_ROW }); setEditRow(null) }
  function startEdit(f) { setEditRow({ ...f }); setAddRow(null) }
  function changeAdd(field, value) { setAddRow(prev => ({ ...prev, [field]: value })) }
  function changeEdit(field, value) { setEditRow(prev => ({ ...prev, [field]: value })) }

  function buildPayload(row) {
    return {
      camp_id: campId,
      source: row.source.trim(),
      amount: Number(row.amount) || 0,
      status: row.status,
      restricted: !!row.restricted,
      notes: row.notes?.trim() || null,
    }
  }

  async function saveAdd() {
    if (!addRow.source.trim()) { setError('Source is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('funding').insert(buildPayload(addRow))
      if (error) throw error
      setAddRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function saveEdit() {
    if (!editRow.source.trim()) { setError('Source is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('funding').update(buildPayload(editRow)).eq('id', editRow.id)
      if (error) throw error
      setEditRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function deleteFunding(fid) {
    if (!confirm('Delete this funding line?')) return
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('funding').delete().eq('id', fid)
      if (error) throw error
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const totalAmount = funding.reduce((s, f) => s + Number(f.amount), 0)
  const received = funding.filter(f => f.status === 'received').reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Funding ({funding.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Funding</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="col-check" title="Restricted">Rest.</th>
              <th>Notes</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addRow && (
              <InlineForm row={addRow} onChange={changeAdd} onSave={saveAdd} onCancel={() => setAddRow(null)} saving={saving} />
            )}
            {funding.map(f => editRow?.id === f.id ? (
              <InlineForm key={f.id} row={editRow} onChange={changeEdit} onSave={saveEdit} onCancel={() => setEditRow(null)} saving={saving} />
            ) : (
              <FundingRow key={f.id} item={f} onEdit={startEdit} onDelete={deleteFunding} />
            ))}
            {funding.length > 0 && (
              <tr style={{ fontWeight: 600, background: 'var(--surface)' }}>
                <td>Total</td>
                <td>{fmt(totalAmount)}</td>
                <td colSpan={4} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(received)} received</td>
              </tr>
            )}
            {funding.length === 0 && !addRow && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No funding lines yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
