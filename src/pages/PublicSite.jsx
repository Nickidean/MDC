import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const CFK_URL = 'https://litton-lakes-summer-camp.classforkids.io/camps'

function AvailabilityPill({ availability }) {
  if (availability === 'available') {
    return <span className="pill pill-green">Spaces available</span>
  }
  if (availability === 'nearly_full') {
    return <span className="pill pill-amber">Nearly full — book soon</span>
  }
  return <span className="pill pill-red">Full</span>
}

function BookingButton({ availability, book_url }) {
  const url = book_url || CFK_URL
  if (availability === 'full') {
    return null
  }
  return (
    <a href={url} className="btn-book" target="_blank" rel="noopener noreferrer">
      Book this day
    </a>
  )
}

function PublicDayCard({ day }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="public-day-card">
      <div className="public-day-img-wrap">
        {day.image_url && !imgError ? (
          <img
            src={day.image_url}
            alt={day.weekday}
            className="public-day-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="img-placeholder public-img-placeholder">No image</div>
        )}
        {day.availability !== 'available' && (
          <span className={`img-availability-pill ${day.availability === 'full' ? 'pill-red' : 'pill-amber'}`}>
            {day.availability === 'full' ? 'Full' : 'Nearly full'}
          </span>
        )}
      </div>
      <div className="public-day-body">
        <div className="public-day-date">
          <span className="public-day-weekday">{day.weekday}</span>
          <span className="public-day-label">{day.date_label}</span>
        </div>
        {day.description && (
          <div className="public-day-description">
            {day.description.split('\n').map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return null
              const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
              const text = isBullet ? trimmed.slice(2) : trimmed
              return isBullet
                ? <div key={i} className="public-day-bullet">· {text}</div>
                : <div key={i}>{text}</div>
            })}
          </div>
        )}
        {day.special_guest && (
          <div className="public-guest-panel">
            {day.special_guest_image_url ? (
              <img src={day.special_guest_image_url} alt={day.special_guest} className="public-guest-avatar" />
            ) : (
              <div className="public-guest-avatar public-guest-avatar-placeholder" />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
              <span className="public-guest-label">Special guest</span>
              <span className="public-guest-name">{day.special_guest}</span>
              {day.special_guest_bio && (
                <p className="public-guest-bio">{day.special_guest_bio}</p>
              )}
            </div>
          </div>
        )}
        <div className="public-day-footer">
          <BookingButton availability={day.availability} book_url={day.book_url} />
        </div>
      </div>
    </div>
  )
}

export default function PublicSite() {
  const [days, setDays] = useState(null) // null = loading
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    supabase
      .from('published_plan')
      .select('days, logo_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        setDays(data ? data.days : [])
        setLogoUrl(data?.logo_url || '')
      })
  }, [])

  const week1 = (days || []).filter(d => d.week === 1)
  const week2 = (days || []).filter(d => d.week === 2)

  return (
    <div className="public-site">
      <section className="hero-section">
        <div className="hero-inner">
          {logoUrl && <img src={logoUrl} alt="Camp logo" className="hero-logo" />}
          <h1 className="hero-title">Summer Camp at Litton Lakes</h1>
          <p className="hero-prose">
            A fun, active and engaging summer camp where children build confidence, make friends and develop real-world skills.
          </p>
          <div className="hero-snapshot">
            <div className="hero-snapshot-item">
              <span className="hero-snapshot-icon">🕘</span>
              <span>9am – 4pm</span>
            </div>
            <div className="hero-snapshot-divider" />
            <div className="hero-snapshot-item">
              <span className="hero-snapshot-icon">📍</span>
              <span>Litton Lakes</span>
            </div>
            <div className="hero-snapshot-divider" />
            <div className="hero-snapshot-item">
              <span className="hero-snapshot-icon">🧒</span>
              <span>Ages 7–12</span>
            </div>
            <div className="hero-snapshot-divider" />
            <div className="hero-snapshot-item">
              <span className="hero-snapshot-icon">📅</span>
              <span>17–28 August 2026</span>
            </div>
            <div className="hero-snapshot-divider" />
            <div className="hero-snapshot-item">
              <span className="hero-snapshot-icon">🌟</span>
              <span>HAF places available</span>
            </div>
          </div>
          <a href="https://litton-lakes-summer-camp.classforkids.io/camps" target="_blank" rel="noopener noreferrer" className="btn btn-hero">Book a place</a>
        </div>
      </section>

      <div className="public-content">
        {days === null ? (
          <p className="public-loading">Loading…</p>
        ) : days.length === 0 ? (
          <p className="public-empty">We're getting the programme ready — check back soon.</p>
        ) : (
          <>
            <section className="public-week">
              <h2 className="public-week-heading">Week 1 — 17–21 August</h2>
              <div className="public-cards-grid">
                {week1.map((day, i) => (
                  <PublicDayCard key={day.id || i} day={day} />
                ))}
              </div>
            </section>
            <section className="public-week">
              <h2 className="public-week-heading">Week 2 — 24–28 August</h2>
              <div className="public-cards-grid">
                {week2.map((day, i) => (
                  <PublicDayCard key={day.id || i} day={day} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
