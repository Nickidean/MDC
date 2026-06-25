import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a camp business advisor for a small UK activity camp operator. You have access to live data for the camp being discussed. Your job is to:

1. Answer questions about the numbers clearly and in plain English
2. Teach the business concept behind each answer using the actual figures as the worked example
3. Model scenarios when asked (price changes, extra days, more bookings)
4. Proactively flag risks: blended rate slipping, empty capacity, break-even dependent on unconfirmed grants
5. Never give tax, VAT or statutory accounting advice — redirect those to an accountant

Camp data will be provided in each message as structured JSON. Use those numbers as the basis of all calculations and answers. Be concise but thorough. Use bullet points and bold text for clarity. When modelling scenarios, show the maths step by step.`

function formatCampContext(campData) {
  const { camp, bookings = [], costs = [], funding = [], metrics = {} } = campData

  const lines = [
    `## Camp: ${camp.name}`,
    `- Dates: ${camp.start_date || 'TBC'} to ${camp.end_date || 'TBC'}`,
    `- Duration: ${camp.days} days`,
    `- Capacity: ${camp.capacity_per_day} places/day = ${(camp.capacity_per_day || 0) * (camp.days || 0)} total child-days`,
    `- Prices: Day £${camp.price_day}, Week £${camp.price_week}, Two-week £${camp.price_two_week}`,
    '',
    `## Key Metrics`,
    `- Child-days booked: ${metrics.childDays} / ${metrics.capacity} (${metrics.capacityPct}%)`,
    `- Projected revenue: £${(metrics.projectedRevenue || 0).toFixed(2)}`,
    `- Blended rate: £${(metrics.blendedRate || 0).toFixed(2)}/child-day`,
    `- Total cost: £${(metrics.totalCost || 0).toFixed(2)} (sunk: £${(metrics.sunkCost || 0).toFixed(2)}, to go: £${(metrics.goForwardCost || 0).toFixed(2)})`,
    `- P&L with all funding: £${(metrics.profitWithAllFunding || 0).toFixed(2)}`,
    `- P&L with confirmed funding only: £${(metrics.profitConfirmedOnly || 0).toFixed(2)}`,
    `- Break-even still needed: ${metrics.breakEvenChildDays != null ? metrics.breakEvenChildDays + ' more child-days' : 'already covered'}`,
    `- Cash position: £${(metrics.cashPosition || 0).toFixed(2)} (in: £${(metrics.cashIn || 0).toFixed(2)}, out: £${(metrics.cashOut || 0).toFixed(2)})`,
    '',
    `## Bookings (${bookings.length})`,
  ]

  for (const b of bookings) {
    lines.push(`- ${b.child_name}: ${b.booking_type} · ${b.days} days · fee £${b.fee} · deposit £${b.deposit_paid} · balance £${b.balance_due}`)
  }

  lines.push('', `## Costs (${costs.length})`)
  for (const c of costs) {
    lines.push(`- ${c.label} [${c.category}]: £${c.amount}${c.paid ? ' (PAID)' : ''}${c.is_capital ? ' [capital]' : ''}${c.recurring_upkeep ? ' [recurring]' : ''}`)
  }

  lines.push('', `## Funding (${funding.length})`)
  for (const f of funding) {
    lines.push(`- ${f.source}: £${f.amount} [${f.status}]${f.restricted ? ' [restricted]' : ''}${f.notes ? ' – ' + f.notes : ''}`)
  }

  if (camp.notes) {
    lines.push('', `## Camp Notes`, camp.notes)
  }

  return lines.join('\n')
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) }
  }

  const { question, campData } = body
  if (!question || !campData) {
    return { statusCode: 400, body: JSON.stringify({ error: 'question and campData are required.' }) }
  }

  try {
    const campContext = formatCampContext(campData)
    const userMessage = `${campContext}\n\n---\n\nQuestion: ${question}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const answer = message.content[0]?.text || 'No response generated.'

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    }
  } catch (err) {
    console.error('Advisor function error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    }
  }
}
