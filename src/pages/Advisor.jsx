import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { computeMetrics } from '../lib/metrics.js'

function renderMarkdown(text) {
  // Very basic markdown renderer
  return text
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>{line.slice(4)}</h4>
      if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>{line.slice(3)}</h3>
      if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>{line.slice(2)}</h2>
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i}>{renderInline(line.slice(2))}</li>
      if (/^\d+\. /.test(line)) return <li key={i}>{renderInline(line.replace(/^\d+\. /, ''))}</li>
      if (line.trim() === '') return <br key={i} />
      return <p key={i}>{renderInline(line)}</p>
    })
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: 'rgba(0,0,0,0.07)', padding: '0.1em 0.3em', borderRadius: '3px', fontSize: '0.85em' }}>{part.slice(1, -1)}</code>
    return part
  })
}

export default function Advisor() {
  const { id } = useParams()
  const [camp, setCamp] = useState(null)
  const [bookings, setBookings] = useState([])
  const [costs, setCosts] = useState([])
  const [funding, setFunding] = useState([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const chatRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const [campRes, bookingsRes, costsRes, fundingRes] = await Promise.all([
          supabase.from('camps').select('*').eq('id', id).single(),
          supabase.from('bookings').select('*').eq('camp_id', id),
          supabase.from('costs').select('*').eq('camp_id', id),
          supabase.from('funding').select('*').eq('camp_id', id),
        ])
        if (campRes.error) throw campRes.error
        setCamp(campRes.data)
        setBookings(bookingsRes.data || [])
        setCosts(costsRes.data || [])
        setFunding(fundingRes.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || sending) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setSending(true)

    const metrics = computeMetrics(camp, bookings, costs, funding)
    const campData = { camp, bookings, costs, funding, metrics }

    try {
      const res = await fetch('/.netlify/functions/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, campData }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't reach the advisor: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="loading"><span className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div className="advisor-layout">
      <div className="advisor-header">
        <Link to={`/admin/camps/${id}`} className="advisor-back">← Back to {camp?.name}</Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Camp Business Advisor</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Ask anything about your camp's numbers, scenarios, or strategy.
        </p>
      </div>

      <div className="chat-box" ref={chatRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Hi! I have full access to <strong>{camp?.name}</strong>'s data.</p>
            <p style={{ marginTop: '0.5rem' }}>Try asking: <em>"What's my break-even point?"</em> or <em>"What happens if I add 5 more bookings?"</em></p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? 'You' : 'Advisor'}</span>
            <div className="chat-bubble">
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant">
            <span className="chat-role">Advisor</span>
            <div className="chat-bubble chat-thinking">Thinking...</div>
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Ask about your camp finances…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
