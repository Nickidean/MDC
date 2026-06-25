import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmt } from '../lib/metrics.js'

const EMPTY_ROW = {
  label: '',
  category: 'fixed',
  amount: '',
  paid: false,
  is_capital: false,
  recurring_upkeep: false,
}

function CostRow({ cost, onEdit, onDelete, onTogglePaid }) {
  return (
    <tr style={cost.paid ? { opacity: 0.6 } : {}}>
      <td>{cost.label}</td>
      <td><span className="badge badge-grey" style={{ textTransform: 'capitalize' }}>{cost.category}</span></td>
      <td>{fmt(cost.amount)}</td>
      <td className="col-check">
        <input type="checkbox" checked={cost.paid} onChange={() => onTogglePaid(cost)} title="Mark as paid" />
      </td>
      <td className="col-check">
        <input type="checkbox" checked={cost.is_capital} readOnly title="Capital item" />
      </td>
      <td className="col-check">
        <input type="checkbox" checked={cost.recurring_upkeep} readOnly title="Recurring/upkeep" />
      </td>
      <td className="col-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(cost)}>Edit</button>{' '}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(cost.id)}>Del</button>
      </td>
    </tr>
  )
}

function InlineForm({ row, onChange, onSave, onCancel, saving }) {
  return (
    <tr className="inline-form">
      <td><input value={row.label} onChange={e => onChange('label', e.target.value)} placeholder="Label" /></td>
      <td>
        <select value={row.category} onChange={e => onChange('category', e.target.value)}>
          <option value="fixed">Fixed</option>
          <option value="staff">Staff</option>
          <option value="variable">Variable</option>
        </select>
      </td>
      <td><input type="number" min="0" step="0.01" value={row.amount} onChange={e => onChange('amount', e.target.value)} placeholder="Amount" /></td>
      <td className="col-check"><input type="checkbox" checked={row.paid} onChange={e => onChange('paid', e.target.checked)} /></td>
      <td className="col-check"><input type="checkbox" checked={row.is_capital} onChange={e => onChange('is_capital', e.target.checked)} /></td>
      <td className="col-check"><input type="checkbox" checked={row.recurring_upkeep} onChange={e => onChange('recurring_upkeep', e.target.checked)} /></td>
      <td className="col-actions">
        <button className="btn btn-success btn-sm" onClick={onSave} disabled={saving}>Save</button>{' '}
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  )
}

export default function CostTable({ campId, costs, onChanged }) {
  const [addRow, setAddRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function startAdd() { setAddRow({ ...EMPTY_ROW }); setEditRow(null) }
  function startEdit(c) { setEditRow({ ...c }); setAddRow(null) }
  function changeAdd(f, v) { setAddRow(prev => ({ ...prev, [f]: v })) }
  function changeEdit(f, v) { setEditRow(prev => ({ ...prev, [f]: v })) }

  function buildPayload(row) {
    return {
      camp_id: campId,
      label: row.label.trim(),
      category: row.category,
      amount: Number(row.amount) || 0,
      paid: !!row.paid,
      is_capital: !!row.is_capital,
      recurring_upkeep: !!row.recurring_upkeep,
    }
  }

  async function saveAdd() {
    if (!addRow.label.trim()) { setError('Label is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('costs').insert(buildPayload(addRow))
      if (error) throw error
      setAddRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function saveEdit() {
    if (!editRow.label.trim()) { setError('Label is required.'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('costs').update(buildPayload(editRow)).eq('id', editRow.id)
      if (error) throw error
      setEditRow(null)
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function deleteCost(costId) {
    if (!confirm('Delete this cost?')) return
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('costs').delete().eq('id', costId)
      if (error) throw error
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function togglePaid(cost) {
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('costs').update({ paid: !cost.paid }).eq('id', cost.id)
      if (error) throw error
      onChanged()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const totalAmount = costs.reduce((s, c) => s + Number(c.amount), 0)
  const paidAmount = costs.filter(c => c.paid).reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Costs ({costs.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Cost</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Capital item</strong><br />
          A one-off purchase you now own — like buying the stretch tent. Tick this so the app knows not to count it in future camps' costs. You're buying an asset, not just spending money.
        </div>
        <div style={{ flex: 1, minWidth: '220px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Recurring upkeep</strong><br />
          The small ongoing cost of owning that asset — storage, cleaning, repairs. Future camps log this instead of the full purchase price, keeping the numbers honest without inflating break-even.
        </div>
        <div style={{ flex: 1, minWidth: '220px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Paid vs unpaid</strong><br />
          Paid costs are sunk — spent regardless of what happens next. Unpaid costs still matter for go-forward decisions. The dashboard break-even only counts unpaid costs, so you know what's actually left to cover.
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Category</th>
              <th>Amount</th>
              <th className="col-check" title="Paid">Paid</th>
              <th className="col-check" title="Capital item">Capital</th>
              <th className="col-check" title="Recurring/upkeep">Recur.</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addRow && (
              <InlineForm row={addRow} onChange={changeAdd} onSave={saveAdd} onCancel={() => setAddRow(null)} saving={saving} />
            )}
            {costs.map(c => editRow?.id === c.id ? (
              <InlineForm key={c.id} row={editRow} onChange={changeEdit} onSave={saveEdit} onCancel={() => setEditRow(null)} saving={saving} />
            ) : (
              <CostRow key={c.id} cost={c} onEdit={startEdit} onDelete={deleteCost} onTogglePaid={togglePaid} />
            ))}
            {costs.length > 0 && (
              <tr style={{ fontWeight: 600, background: 'var(--surface)' }}>
                <td colSpan={2}>Total</td>
                <td>{fmt(totalAmount)}</td>
                <td colSpan={4} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(paidAmount)} paid · {fmt(totalAmount - paidAmount)} unpaid</td>
              </tr>
            )}
            {costs.length === 0 && !addRow && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No costs yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
