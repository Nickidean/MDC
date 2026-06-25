import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase.js'

function GuestModal({ guest, onClose }) {
  const handleBackdrop = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-guest-header">
          {guest.image ? (
            <img src={guest.image} alt={guest.name} className="modal-guest-avatar" />
          ) : (
            <div className="modal-guest-avatar modal-guest-avatar-placeholder" />
          )}
          <div>
            <div className="modal-guest-label">Special Guest</div>
            <div className="modal-guest-name">{guest.name}</div>
          </div>
        </div>
        {guest.bio && <p className="modal-guest-bio">{guest.bio}</p>}
      </div>
    </div>,
    document.body
  )
}

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
  const [guestModal, setGuestModal] = useState(false)

  return (
    <div className="public-day-card">
      {guestModal && day.special_guest && (
        <GuestModal
          guest={{ name: day.special_guest, image: day.special_guest_image_url, bio: day.special_guest_bio }}
          onClose={() => setGuestModal(false)}
        />
      )}
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
          <div
            className="public-guest-panel public-guest-panel-clickable"
            onClick={() => setGuestModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setGuestModal(true)}
          >
            {day.special_guest_image_url ? (
              <img src={day.special_guest_image_url} alt={day.special_guest} className="public-guest-avatar" />
            ) : (
              <div className="public-guest-avatar public-guest-avatar-placeholder" />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1, minWidth: 0 }}>
              <span className="public-guest-label">Special guest</span>
              <span className="public-guest-name">{day.special_guest}</span>
              {day.special_guest_bio && (
                <p className="public-guest-bio public-guest-bio-truncated">{day.special_guest_bio}</p>
              )}
            </div>
            <span className="public-guest-more">›</span>
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
              <span className="hero-snapshot-icon">💷</span>
              <span>£40 per day</span>
            </div>
            <div className="hero-snapshot-divider" />
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

      <footer className="public-footer">
        <p className="footer-social-heading">Follow us for updates</p>
        <div className="footer-social-links">
          <a href="https://www.instagram.com/themindfuldigitalcollective" target="_blank" rel="noopener noreferrer" className="footer-social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
          <a href="https://www.facebook.com/themindfuldigitalcollective" target="_blank" rel="noopener noreferrer" className="footer-social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
        </div>
        <p className="footer-copy">© 2026 The Mindful Digital Collective</p>
      </footer>
    </div>
  )
}
