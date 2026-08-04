export default async (request, context) => {
  const user = Deno.env.get('HANDBOOK_AUTH_USER')
  const pass = Deno.env.get('HANDBOOK_AUTH_PASS')

  // If credentials aren't configured, fail closed rather than serving the page unprotected.
  if (!user || !pass) {
    return new Response('Handbook access is not configured. Set HANDBOOK_AUTH_USER and HANDBOOK_AUTH_PASS in Netlify environment variables.', { status: 503 })
  }

  const auth = request.headers.get('authorization')
  const expected = 'Basic ' + btoa(`${user}:${pass}`)

  if (auth !== expected) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Camp Handbook", charset="UTF-8"' },
    })
  }

  return context.next()
}

export const config = { path: '/handbook/*' }
