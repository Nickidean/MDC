import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase.js'

const CFK_URL = 'https://litton-lakes-summer-camp.classforkids.io/camps'

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

function GuestCard({ guest }) {
  const [modal, setModal] = useState(false)

  return (
    <>
      {modal && <GuestModal guest={guest} onClose={() => setModal(false)} />}
      <div
        className="guest-card"
        onClick={() => setModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModal(true)}
      >
        <div className="guest-card-img-wrap">
          {guest.image ? (
            <img src={guest.image} alt={guest.name} className="guest-card-img" />
          ) : (
            <div className="guest-card-img-placeholder" />
          )}
        </div>
        <div className="guest-card-body">
          <span className="guest-card-label">Special guest</span>
          <span className="guest-card-name">{guest.name}</span>
          {guest.bio && <p className="guest-card-bio">{guest.bio}</p>}
          <span className="guest-card-more">Find out more ›</span>
        </div>
      </div>
    </>
  )
}

export default function PublicSite() {
  const [guests, setGuests] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [structure, setStructure] = useState([])
  const [organiser, setOrganiser] = useState(null)
  const [team, setTeam] = useState([])

  useEffect(() => {
    supabase
      .from('published_plan')
      .select('logo_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setLogoUrl(data?.logo_url || ''))

    supabase
      .from('special_guests')
      .select('*')
      .order('sort_index')
      .order('created_at')
      .then(({ data }) => setGuests(
        (data || [])
          .filter(g => g.name)
          .map(g => ({ name: g.name, image: g.image_url, bio: g.bio }))
      ))

    supabase
      .from('daily_structure')
      .select('*')
      .order('sort_index')
      .then(({ data }) => setStructure(data || []))

    supabase
      .from('site_content')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setOrganiser(data))

    supabase
      .from('team_members')
      .select('*')
      .order('sort_index')
      .order('created_at')
      .then(({ data }) => setTeam((data || []).filter(m => m.name)))
  }, [])

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
          <a href={CFK_URL} target="_blank" rel="noopener noreferrer" className="btn btn-hero">Book a place</a>
        </div>
      </section>

      <div className="public-content">
        <section className="day-structure-section">
          <h2 className="public-week-heading">The daily structure</h2>
          <div className="day-structure-grid">
            {structure.map(s => (
              <div key={s.id} className="day-structure-item">
                <div className="day-structure-accent" />
                <div className="day-structure-content">
                  <div className="day-structure-left">
                    <div className="day-structure-time">{s.time_label}</div>
                    <div className="day-structure-activity">{s.activity}</div>
                  </div>
                  <p className="day-structure-desc">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {organiser?.organiser_name && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="public-week-heading">Meet the organiser</h2>
            <div className="organiser-section">
              <div className="organiser-section-accent" />
              <div className="organiser-section-body">
                {organiser.organiser_image_url ? (
                  <img src={organiser.organiser_image_url} alt={organiser.organiser_name} className="organiser-photo" />
                ) : (
                  <div className="organiser-photo-placeholder-pub" />
                )}
                <div>
                  <div className="organiser-label">Your camp organiser</div>
                  <div className="organiser-name">{organiser.organiser_name}</div>
                  {organiser.organiser_intro && <p className="organiser-intro">{organiser.organiser_intro}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Team */}
        {team.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="public-week-heading">Meet the team</h2>
            <div className="guests-grid">
              {team.map(m => (
                <div key={m.id} className="guest-card" style={{ cursor: 'default' }}>
                  <div className="guest-card-img-wrap">
                    {m.image_url
                      ? <img src={m.image_url} alt={m.name} className="guest-card-img" />
                      : <div className="guest-card-img-placeholder" />}
                  </div>
                  <div className="guest-card-body">
                    {m.role && <span className="guest-card-label">{m.role}</span>}
                    <span className="guest-card-name">{m.name}</span>
                    {m.bio && <p className="guest-card-bio">{m.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {guests === null ? (
          <p className="public-loading">Loading…</p>
        ) : guests.length > 0 ? (
          <section>
            <h2 className="public-week-heading">This year's special guests</h2>
            <p style={{ color: 'rgba(19,44,10,0.6)', fontSize: '0.95rem', marginBottom: '1.75rem', marginTop: '-0.75rem' }}>Each day we bring in someone local and inspiring. Click on a guest to find out more.</p>
            <div className="guests-grid">
              {guests.map((g, i) => (
                <GuestCard key={i} guest={g} />
              ))}
            </div>
          </section>
        ) : (
          <p className="public-empty">We're getting the programme ready — check back soon.</p>
        )}
      </div>

      <div className="book-cta-section">
        <h2 className="book-cta-heading">Ready to book?</h2>
        <p className="book-cta-sub">Spaces are limited — secure your child's place today.</p>
        <a href={CFK_URL} target="_blank" rel="noopener noreferrer" className="btn btn-hero">Book a place on ClassForKids</a>
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
