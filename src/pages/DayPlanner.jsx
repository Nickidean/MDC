import React, { useEffect, useState, useCallback, useRef } from 'react'
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
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoFileRef = useRef(null)

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
    setLogoUrl(pubData?.logo_url || '')
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
      .upsert({ id: 1, days: daysData, published_at: new Date().toISOString(), logo_url: logoUrl || null })

    if (!error) {
      setPublishMsg('Published ✓')
      setHasUnpublished(false)
      setTimeout(() => setPublishMsg(''), 3000)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError('')
    const ext = file.name.split('.').pop()
    const path = `logo-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage
      .from('camp-images')
      .upload(path, file, { upsert: true })
    if (storageError) {
      setLogoError('Upload failed — check the camp-images bucket exists.')
      setLogoUploading(false)
      return
    }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const url = data.publicUrl
    await supabase.from('published_plan').upsert({
      id: 1,
      days: published?.days || [],
      published_at: published?.published_at || new Date().toISOString(),
      logo_url: url,
    })
    setLogoUrl(url)
    setLogoUploading(false)
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
        <div className="logo-upload-section">
          <h3 className="logo-upload-heading">Site logo</h3>
          <div className="logo-upload-row">
            {logoUrl && (
              <img src={logoUrl} alt="Logo preview" className="logo-preview" />
            )}
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => logoFileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? 'Uploading…' : logoUrl ? '↑ Replace logo' : '↑ Upload logo'}
              </button>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              {logoError && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.25rem' }}>{logoError}</p>}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Shown above the title on the public site. Saves instantly.</p>
            </div>
          </div>
        </div>

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
