import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function FaqRow({ faq, onUpdated, onDeleted }) {
  const [fields, setFields] = useState({
    question: faq.question || '',
    answer: faq.answer || '',
  })
  const [saveStatus, setSaveStatus] = useState('')
  const saveTimer = useRef(null)

  function scheduleSave(updated) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(updated), 800)
  }

  async function persist(updated) {
    setSaveStatus('saving')
    const { error } = await supabase.from('faqs').update(updated).eq('id', faq.id)
    if (!error) {
      setSaveStatus('saved')
      onUpdated && onUpdated()
      setTimeout(() => setSaveStatus(''), 2000)
    } else {
      setSaveStatus('')
      console.error('Save error:', error)
    }
  }

  function handleChange(field, value) {
    const updated = { ...fields, [field]: value }
    setFields(updated)
    scheduleSave(updated)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${fields.question || 'this question'}"?`)) return
    await supabase.from('faqs').delete().eq('id', faq.id)
    onDeleted && onDeleted()
  }

  return (
    <div className="guest-admin-row" style={{ alignItems: 'flex-start' }}>
      <div className="guest-admin-fields">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            value={fields.question}
            onChange={e => handleChange('question', e.target.value)}
            placeholder="Question, e.g. What's your cancellation policy?"
            className="field-input"
            style={{ flex: 1, fontWeight: 700 }}
          />
          {saveStatus && (
            <span className={`autosave-indicator ${saveStatus}`} style={{ flexShrink: 0 }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
          <button className="btn-icon btn-icon-danger" onClick={handleDelete} title="Remove">✕</button>
        </div>
        <textarea
          value={fields.answer}
          onChange={e => handleChange('answer', e.target.value)}
          placeholder="Answer…"
          className="field-textarea"
          rows={4}
        />
      </div>
    </div>
  )
}

export default function FaqsAdmin() {
  const [faqs, setFaqs] = useState(null)

  async function load() {
    const { data } = await supabase.from('faqs').select('*').order('sort_index').order('created_at')
    setFaqs(data || [])
  }

  useEffect(() => { load() }, [])

  async function addFaq() {
    const maxSort = faqs.length ? Math.max(...faqs.map(f => f.sort_index)) : -1
    const { data, error } = await supabase
      .from('faqs')
      .insert({ question: '', answer: '', sort_index: maxSort + 1 })
      .select().single()
    if (!error) setFaqs(prev => [...prev, data])
  }

  if (faqs === null) return <div className="loading">Loading…</div>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>FAQs</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Add questions and answers — they'll appear in the FAQ section at the bottom of the public site.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addFaq}>+ Add question</button>
      </div>

      {faqs.length === 0 ? (
        <div className="empty-state"><p>No FAQs yet. Click <strong>+ Add question</strong> to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map(f => <FaqRow key={f.id} faq={f} onUpdated={load} onDeleted={load} />)}
        </div>
      )}
    </div>
  )
}
