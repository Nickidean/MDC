import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession, onAuthChange } from '../lib/auth.js'

export default function AuthGuard({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = onAuthChange((_event, sess) => {
      setSession(sess)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="loading-screen">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
