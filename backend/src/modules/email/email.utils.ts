import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.MAILGUN_WEBHOOK_SECRET || 'dev-secret-change-me'

export function generateEmailToken(payload: string): string {
  // Use hex encoding — all lowercase, unaffected by email address case normalisation
  const encoded = Buffer.from(payload).toString('hex')
  const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(encoded).digest('hex').slice(0, 10)
  return `${encoded}.${sig}`
}

export function verifyEmailToken(token: string): string | null {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null
  const encoded = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(encoded).digest('hex').slice(0, 10)
  if (sig !== expected) return null
  try {
    return Buffer.from(encoded, 'hex').toString('utf8')
  } catch {
    return null
  }
}

export function ticketReplyToken(ticketId: string): string {
  return generateEmailToken(`ticket:${ticketId}`)
}

export function taskUserToken(taskId: string, userId: string): string {
  return generateEmailToken(`task:${taskId}:${userId}`)
}

export function isAutoReply(headers: Record<string, string>): boolean {
  const h = (k: string) => (headers[k] || '').toLowerCase()
  return (
    h('auto-submitted').startsWith('auto-') ||
    h('precedence') === 'bulk' ||
    h('precedence') === 'auto_reply' ||
    h('x-autoreply') === 'yes' ||
    !!h('x-autorespond') ||
    h('x-auto-response-suppress').includes('all')
  )
}

export function verifyMailgunSignature(timestamp: string, token: string, signature: string, signingKey: string): boolean {
  const value = timestamp + token
  const expected = crypto.createHmac('sha256', signingKey).update(value).digest('hex')
  return expected === signature
}
