

export function money(value) {
  if (!value) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function shortDate(value) {
  if (!value) return '—'

  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function daysSince(value) {
  if (!value) return 0

  const today = new Date('2026-04-24T12:00:00')
  const date = new Date(`${value}T12:00:00`)

  return Math.floor((today - date) / 86400000)
}