import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { signOut } from '../lib/auth.js'
import { seedCampDays } from '../lib/seedDays.js'
import DayCard from '../components/DayCard.jsx'

export default function DayPlanner() {
  const [days, setDays] = useState([])
  const [published, setPublished] = useState(null)
  const [hasUnpublished, setHasUnpublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [publishMsg, setPublishMsg] = useState('')

  const computeUnpublished = useCallback((daysData, publishedData) => {
    if (!publishedData) {
      setHasUnpublished(daysData.length > 0)
      return
    }
    const newestDay = daysData.reduce((a, b) =>
      new Date(a.updated_at) > new Date(b.updated_at) ? a : b, daysData[0])
    if (!newestDay) { setHasUnpublished(false); return }
    setHasUnpublished(
      new Date(newestDay.updated_at) > new Date(publishedData.published_at)
    )
  }, [])

  async function load() {
    await seedCampDays(supabase)

    const [{ data: rawDaysData }, { data: pubData }] = await Promise.all([
      supabase.from('camp_days').select('*').order('sort_index'),
      supabase.from('published_plan').select('*').eq('id', 1).maybeSingle(),
    ])

    // Deduplicate by sort_index in case migration hasn't run yet
    const seen = new Set()
    const d = (rawDaysData || []).filter(day => {
      if (seen.has(day.sort_index)) return false
      seen.add(day.sort_index)
      return true
    })
    setDays(d)
    setPublished(pubData)
    computeUnpublished(d, pubData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function refreshUnpublished() {
    const { data: daysData } = await supabase
      .from('camp_days')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    const { data: pubData } = await supabase
      .from('published_plan')
      .select('published_at')
      .eq('id', 1)
      .maybeSingle()

    if (!daysData || daysData.length === 0) { setHasUnpublished(false); return }
    if (!pubData) { setHasUnpublished(true); return }
    setHasUnpublished(
      new Date(daysData[0].updated_at) > new Date(pubData.published_at)
    )
  }

  async function handlePublish() {
    const { data: rawDays } = await supabase
      .from('camp_days')
      .select('*')
      .eq('show_on_site', true)
      .order('sort_index')

    const seen = new Set()
    const daysData = (rawDays || []).filter(d => {
      if (seen.has(d.sort_index)) return false
      seen.add(d.sort_index)
      return true
    })

    const { error } = await supabase
      .from('published_plan')
      .upsert({ id: 1, days: daysData, published_at: new Date().toISOString() })

    if (!error) {
      setPublishMsg('Published ✓')
      setHasUnpublished(false)
      setTimeout(() => setPublishMsg(''), 3000)
    }
  }

  async function handleSignOut() {
    await signOut()
  }

  const week1 = days.filter(d => d.week === 1)
  const week2 = days.filter(d => d.week === 2)

  if (loading) return <div className="loading-screen">Loading planner…</div>

  return (
    <div className="planner-page">
      <div className="planner-topbar">
        <span className="planner-title">Camp Day Planner</span>
        <div className="planner-topbar-right">
          {publishMsg ? (
            <span className="publish-status status-published">{publishMsg}</span>
          ) : (
            <span className={`publish-status ${hasUnpublished ? 'status-unpublished' : 'status-uptodate'}`}>
              {hasUnpublished ? 'Unpublished changes' : 'Site up to date'}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={!hasUnpublished}
          >
            Publish to site
          </button>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div className="planner-content">
        <section className="week-section">
          <h2 className="week-heading">Week 1 — 17–21 August</h2>
          <div className="day-cards-grid">
            {week1.map(day => (
              <DayCard key={day.id} day={day} onSaved={refreshUnpublished} />
            ))}
          </div>
        </section>

        <section className="week-section">
          <h2 className="week-heading">Week 2 — 24–28 August</h2>
          <div className="day-cards-grid">
            {week2.map(day => (
              <DayCard key={day.id} day={day} onSaved={refreshUnpublished} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
