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
      <div className="public-day-body">
        <div className="public-day-date">
          <span className="public-day-weekday">{day.weekday}</span>
          <span className="public-day-label">{day.date_label}</span>
        </div>
        {day.description && <p className="public-day-description">{day.description}</p>}
        {day.special_guest && (
          <p className="public-day-guest">
            <em>Special guest: {day.special_guest}</em>
          </p>
        )}
        <div className="public-day-footer">
          <AvailabilityPill availability={day.availability} />
          <BookingButton availability={day.availability} book_url={day.book_url} />
        </div>
      </div>
    </div>
  )
}

export default function PublicSite() {
  const [days, setDays] = useState(null) // null = loading

  useEffect(() => {
    supabase
      .from('published_plan')
      .select('days')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        setDays(data ? data.days : [])
      })
  }, [])

  const week1 = (days || []).filter(d => d.week === 1)
  const week2 = (days || []).filter(d => d.week === 2)

  return (
    <div className="public-site">
      <section className="hero-section">
        <div className="hero-inner">
          <h1 className="hero-title">Summer Camp at Litton Lakes</h1>
          <p className="hero-dates">17–28 August 2026</p>
          <p className="hero-prose">
            Every day follows the same rhythm: morning sports and activities, a shared lunch,
            an afternoon special guest or workshop, then more sport to finish.
            No screens. Plenty of mud.
          </p>
          <div className="hero-meta">
            <span>Ages 8–12</span>
            <span>·</span>
            <span>From £39/day</span>
            <span>·</span>
            <span>HAF-funded places available</span>
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
