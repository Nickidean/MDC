import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const CFK_URL = 'https://litton-lakes-summer-camp.classforkids.io/camps'

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{faq.question}</span>
        <span className={`faq-chevron ${open ? 'faq-chevron-open' : ''}`}>›</span>
      </button>
      {open && (
        <div className="faq-answer">
          <BioText bio={faq.answer} className="faq-answer-p" />
        </div>
      )}
    </div>
  )
}

function formatBio(bio) {
  return bio
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
}

function linkifyMdc(text) {
  return text.split(/(The Mindful Digital Collective)/g).map((part, i) =>
    part === 'The Mindful Digital Collective' ? (
      <a key={i} href="https://www.themindfuldigitalcollective.co.uk/" target="_blank" rel="noopener noreferrer" className="mdc-link">
        {part}
      </a>
    ) : part
  )
}

function BioText({ bio, className }) {
  const paragraphs = formatBio(bio)
  return paragraphs.map((para, i) => (
    <p key={i} className={className}>
      {para.split('\n').map((line, j, arr) => (
        <React.Fragment key={j}>
          {linkifyMdc(line)}
          {j < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  ))
}

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
        <div className="modal-scroll">
          <div className="modal-close-bar">
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="modal-scroll-inner">
            <div className="modal-guest-header">
              {guest.image ? (
                <img src={guest.image} alt={guest.name} className="modal-guest-avatar" />
              ) : (
                <div className="modal-guest-avatar modal-guest-avatar-placeholder" />
              )}
              <div>
                <div className="modal-guest-label">Special Guest</div>
                <div className="modal-guest-name">{guest.name}</div>
                {guest.tag && <span className="modal-guest-tag">{guest.tag}</span>}
              </div>
            </div>
            {guest.bio && <div className="modal-guest-bio"><BioText bio={guest.bio} /></div>}
            {guest.website && (
              <a href={guest.website} target="_blank" rel="noopener noreferrer" className="btn btn-outline-green modal-guest-website">
                Visit website →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="organiser-copy-btn"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
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
          {guest.tag && <span className="guest-card-tag">{guest.tag}</span>}
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
  const [partners, setPartners] = useState([])
  const [faqs, setFaqs] = useState([])

  useEffect(() => {
    if (!logoUrl) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = ''
    link.href = logoUrl
  }, [logoUrl])

  useEffect(() => {
    if (!supabase) return
    if (sessionStorage.getItem('visit_tracked')) return
    sessionStorage.setItem('visit_tracked', '1')
    supabase.rpc('track_site_visit')
  }, [])

  useEffect(() => {
    if (!supabase) return
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
          .map(g => ({ name: g.name, image: g.image_url, bio: g.bio, tag: g.tag, website: g.website_url }))
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

    supabase
      .from('partner_logos')
      .select('*')
      .order('sort_index')
      .order('created_at')
      .then(({ data }) => setPartners((data || []).filter(p => p.image_url)))

    supabase
      .from('faqs')
      .select('*')
      .order('sort_index')
      .order('created_at')
      .then(({ data }) => setFaqs((data || []).filter(f => f.question)))
  }, [])

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>Site not configured</h1>
        <p>VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing from the build environment.</p>
      </div>
    )
  }

  return (
    <div className="public-site">
      <nav className="public-nav">
        <div className="public-nav-inner">
          <a href={CFK_URL} target="_blank" rel="noopener noreferrer" className="btn public-nav-btn">Book now</a>
        </div>
      </nav>

      <section
        className="hero-section"
        style={organiser?.hero_background_url ? { backgroundImage: `url(${organiser.hero_background_url})` } : undefined}
      >
        <div className="hero-inner">
          {logoUrl && <img src={logoUrl} alt="Camp logo" className="hero-logo" />}
          <h1 className="hero-title">Summer Camp<br />at Litton Lakes 2026</h1>
          <p className="hero-prose hero-prose-big">
            {linkifyMdc('An active, outdoors summer camp from The Mindful Digital Collective - the community interest company helping children grow into confident, thoughtful young people ready for the real world.')}
          </p>
          <div className="hero-snapshot">
            <span>17–28 August 2026</span>
            <span className="hero-snapshot-sep">/</span>
            <span>Ages 7–12</span>
            <span className="hero-snapshot-sep">/</span>
            <span>9am – 4pm</span>
            <span className="hero-snapshot-sep">/</span>
            <span>{organiser?.pricing_day || '£40'} per day</span>
          </div>
          <a href={CFK_URL} target="_blank" rel="noopener noreferrer" className="btn btn-hero">Book a place</a>
        </div>
      </section>

      <div className="public-content">
        <section className="day-structure-section">
          <h2 className="public-week-heading">The daily structure</h2>
          <p className="public-section-intro">Every day has the same familiar rhythm, with a few twists and surprises depending on who's joining us.</p>
          <div className="day-structure-grid">
            {structure.map(s => (
              <div key={s.id} className="day-structure-item">
                <div className="day-structure-accent" />
                <div className="day-structure-content">
                  {s.image_url && (
                    <div className="day-structure-img-wrap">
                      <img src={s.image_url} alt="" className="day-structure-img" />
                    </div>
                  )}
                  <div className="day-structure-text">
                    <div className="day-structure-left">
                      <div className="day-structure-time">{s.time_label}</div>
                      <div className="day-structure-activity">{s.activity}</div>
                    </div>
                    <p className="day-structure-desc">{s.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

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
            <p className="public-section-intro">Each day we bring in someone local and inspiring. Click on a guest to find out more.</p>
            <div className="guests-grid">
              {guests.map((g, i) => (
                <GuestCard key={i} guest={g} />
              ))}
            </div>

            {organiser && (organiser.session_looks_like_body || organiser.session_group_size) && (
              <div className="session-looks-like-card">
                <div className="session-looks-like-body">
                  <div className="session-looks-like-eyebrow">What a guest session looks like</div>
                  <h3 className="session-looks-like-heading">An hour that sticks with them</h3>
                  {organiser.session_looks_like_body && <BioText bio={organiser.session_looks_like_body} className="session-looks-like-text" />}
                  {organiser.session_group_size && (
                    <p className="session-looks-like-text">
                      Sessions run for around an hour with groups of {organiser.session_group_size} children, supported by our camp team throughout. Guests don't need to be teachers — they need a skill worth sharing and a bit of enthusiasm. We handle everything else.
                    </p>
                  )}
                  {organiser.organiser_email && (
                    <div className="session-looks-like-contact">
                      <span>Interested in running a session?</span>
                      <a href={`mailto:${organiser.organiser_email}`} className="session-looks-like-email">{organiser.organiser_email}</a>
                      <CopyButton value={organiser.organiser_email} label="email" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <p className="public-empty">We're getting the programme ready — check back soon.</p>
        )}

        {/* Fine print / pricing */}
        {organiser && (organiser.pricing_day || organiser.pricing_sibling_discount || organiser.pricing_haf_info || organiser.pricing_installments) && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="public-week-heading">Your investment</h2>
            <p className="public-section-intro">Come for a day, a few days, a full week, or join us for the whole two weeks.</p>
            <div className="organiser-section">
              <div className="organiser-section-accent" />
              <div className="fine-print-row">
                {organiser.pricing_image_url && (
                  <div className="fine-print-img-wrap">
                    <img src={organiser.pricing_image_url} alt="" className="fine-print-img" />
                  </div>
                )}
                <div className="fine-print-body">
                  {organiser.pricing_day && (
                    <div className="fine-print-item fine-print-item-price">
                      <span className="fine-print-icon">💷</span>
                      <div>
                        <div className="fine-print-price">{organiser.pricing_day}<span className="fine-print-price-unit"> / day</span></div>
                      </div>
                    </div>
                  )}
                  {organiser.pricing_sibling_discount && (
                    <div className="fine-print-item">
                      <span className="fine-print-icon">👨‍👩‍👧</span>
                      <span>{organiser.pricing_sibling_discount}</span>
                    </div>
                  )}
                  {organiser.pricing_haf_info && (
                    <div className="fine-print-item">
                      <span className="fine-print-icon">🌟</span>
                      <span>{organiser.pricing_haf_info}</span>
                    </div>
                  )}
                  {organiser.pricing_installments && (
                    <div className="fine-print-item">
                      <span className="fine-print-icon">💳</span>
                      <span>{organiser.pricing_installments}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Location */}
        {(organiser?.location_name || organiser?.location_image_url) && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="public-week-heading">Where we are</h2>
            <div className="location-card">
              {organiser.location_image_url && (
                <div className="location-card-img-wrap">
                  <img src={organiser.location_image_url} alt={organiser.location_name} className="location-card-img" />
                </div>
              )}
              <div className="location-card-body">
                {(() => {
                  const mapsHref = organiser.location_map_url
                    || `https://maps.google.com/?q=${encodeURIComponent(organiser.location_address || organiser.location_name || '')}`
                  return (
                    <>
                      {organiser.location_logo_url && (
                        <img src={organiser.location_logo_url} alt="" className="location-card-badge" />
                      )}
                      {organiser.location_name && (
                        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="location-card-name location-card-name-link">
                          {organiser.location_name}
                        </a>
                      )}
                      {organiser.location_address && (
                        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="location-card-address">
                          📍 {organiser.location_address}
                        </a>
                      )}
                      {organiser.location_description && <p className="location-card-desc">{organiser.location_description}</p>}
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-green"
                        style={{ marginTop: '1.25rem', display: 'inline-block' }}
                      >
                        Open in Google Maps →
                      </a>
                    </>
                  )
                })()}
              </div>
            </div>
          </section>
        )}

        {organiser?.organiser_name && (
          <section style={{ marginBottom: '3rem', marginTop: '3rem' }}>
            <h2 className="public-week-heading">Meet the organiser</h2>
            <div className="organiser-section">
              <div className="organiser-section-accent" />
              <div className="organiser-section-body-letter">
                <div className="organiser-label">Your camp organiser</div>
                <div className="organiser-name">Hi, I'm {organiser.organiser_name}</div>
                {organiser.organiser_intro && <p className="organiser-intro">{organiser.organiser_intro}</p>}

                {organiser.organiser_signature_url ? (
                  <img src={organiser.organiser_signature_url} alt={`${organiser.organiser_name}'s signature`} className="organiser-signature-img" />
                ) : (
                  <div className="organiser-signature">{organiser.organiser_name}</div>
                )}

                <div className="organiser-signoff-row">
                  {organiser.organiser_image_url ? (
                    <img src={organiser.organiser_image_url} alt={organiser.organiser_name} className="organiser-signoff-photo" />
                  ) : (
                    <div className="organiser-signoff-photo organiser-photo-placeholder-pub" />
                  )}

                  <div className="organiser-signoff-stack">
                    <div className="organiser-signoff-name">
                      {organiser.organiser_name}
                      {organiser.organiser_role && <> / {organiser.organiser_role}</>}
                    </div>

                    {organiser.organiser_email && (
                      <div className="organiser-contact-item">
                        <a href={`mailto:${organiser.organiser_email}`} className="organiser-contact-link">
                          <span className="organiser-contact-icon">✉️</span> {organiser.organiser_email}
                        </a>
                        <CopyButton value={organiser.organiser_email} label="email" />
                      </div>
                    )}

                    {organiser.organiser_whatsapp && (
                      <div className="organiser-contact-item">
                        <a
                          href={`https://wa.me/${organiser.organiser_whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="organiser-contact-link"
                        >
                          <span className="organiser-contact-icon">💬</span> {organiser.organiser_whatsapp}
                        </a>
                        <CopyButton value={organiser.organiser_whatsapp} label="number" />
                      </div>
                    )}

                    {(organiser.organiser_instagram || organiser.organiser_facebook) && (
                      <div className="organiser-contact-row">
                        {organiser.organiser_instagram && (
                          <a
                            href={`https://www.instagram.com/${organiser.organiser_instagram.replace(/^@/, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="organiser-contact-pill"
                          >
                            <span className="organiser-contact-icon">📷</span> Instagram
                          </a>
                        )}
                        {organiser.organiser_facebook && (
                          <a
                            href={organiser.organiser_facebook.startsWith('http') ? organiser.organiser_facebook : `https://www.facebook.com/${organiser.organiser_facebook}`}
                            target="_blank" rel="noopener noreferrer"
                            className="organiser-contact-pill"
                          >
                            <span className="organiser-contact-icon">👍</span> Facebook
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Who's behind the camp */}
        {organiser?.about_mdc_body && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="public-week-heading">Who's behind the camp</h2>
            <div className="organiser-section">
              <div className="organiser-section-accent" />
              <div className="fine-print-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <BioText bio={organiser.about_mdc_body} className="location-card-desc" />
                {organiser.about_mdc_haf_places && (
                  <p className="location-card-desc" style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {organiser.about_mdc_haf_places} places at this year's camp are fully funded through the Dorset Council HAF programme, so children on benefits-related free school meals can come at no cost to their families.
                  </p>
                )}
                {organiser.about_mdc_quote_text && (
                  <blockquote className="about-mdc-quote">
                    “{organiser.about_mdc_quote_text}”
                    {organiser.about_mdc_quote_author && <cite className="about-mdc-quote-author">— {organiser.about_mdc_quote_author}</cite>}
                  </blockquote>
                )}
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <section>
            <h2 className="public-week-heading">Questions & answers</h2>
            <div className="faq-list">
              {faqs.map(f => <FaqItem key={f.id} faq={f} />)}
            </div>
          </section>
        )}

        {/* Partner logos */}
        {partners.length > 0 && (() => {
          const partnerLogos = partners.filter(p => p.category !== 'school')
          const schoolLogos = partners.filter(p => p.category === 'school')
          const renderLogo = p => {
            const img = <img src={p.image_url} alt={p.name || 'Partner logo'} className="partner-logo-img" />
            return p.link_url ? (
              <a key={p.id} href={p.link_url} target="_blank" rel="noopener noreferrer" className="partner-logo-item">
                {img}
              </a>
            ) : (
              <div key={p.id} className="partner-logo-item">{img}</div>
            )
          }
          return (
            <section style={{ marginBottom: '3rem' }}>
              <h2 className="public-week-heading">Partners &amp; supporters</h2>
              {organiser?.partners_intro && <p className="public-section-intro">{organiser.partners_intro}</p>}

              {partnerLogos.length > 0 && (
                <>
                  {partnerLogos.some(p => p.blurb) && (
                    <div className="partner-blurb-list">
                      {partnerLogos.filter(p => p.blurb).map(p => (
                        <div key={p.id} className="partner-blurb-item">
                          <strong>{p.name}</strong> — {p.blurb}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="partner-logos-row">
                    {partnerLogos.map(renderLogo)}
                  </div>
                </>
              )}

              {schoolLogos.length > 0 && (
                <>
                  <div className="partner-logos-subheading">Schools we work with</div>
                  <div className="partner-logos-row">
                    {schoolLogos.map(renderLogo)}
                  </div>
                </>
              )}

              {organiser?.partners_closing && (
                <p className="public-section-intro" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                  {organiser.partners_closing}
                  {organiser.organiser_email && (
                    <> <a href={`mailto:${organiser.organiser_email}`} className="location-card-name-link" style={{ fontWeight: 700 }}>Get in touch →</a></>
                  )}
                </p>
              )}
            </section>
          )
        })()}
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
        <p className="footer-brought-by">
          The Summer Camp is brought to you by{' '}
          <a href="https://www.themindfuldigitalcollective.co.uk/" target="_blank" rel="noopener noreferrer" className="footer-brought-by-link">
            The Mindful Digital Collective
          </a>
        </p>
        <p className="footer-links">
          <a href="https://drive.google.com/file/d/1-jI9WrNFNkmqXCeI-a3AY-lXWaOXpIjY/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="footer-links-link">
            Safeguarding Policy
          </a>
        </p>
        <p className="footer-copy">© 2026 {linkifyMdc('The Mindful Digital Collective')}</p>
      </footer>
    </div>
  )
}
