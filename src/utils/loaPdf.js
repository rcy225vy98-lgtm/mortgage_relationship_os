function sanitizePdfText(value) {
  return String(value || '')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)
    })
    .join('')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function formatMoney(value) {
  const amount = Number(value) || 0
  if (!amount) return 'Not captured'
  return `$${amount.toLocaleString()}`
}

function formatDate(value) {
  if (!value) return 'Not captured'

  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function wrapLine(text, maxLength = 94) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let currentLine = ''

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word

    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = nextLine
    }
  })

  if (currentLine) lines.push(currentLine)
  return lines.length ? lines : ['']
}

function addSection(lines, title, sectionLines) {
  lines.push('')
  lines.push(title.toUpperCase())
  lines.push('-'.repeat(Math.min(title.length, 48)))
  sectionLines.forEach((line) => {
    wrapLine(line).forEach((wrappedLine) => lines.push(wrappedLine))
  })
}

function getNeedOwnerOptions(lead) {
  return [
    { value: 'borrower', label: lead.client || 'Borrower' },
    ...(lead.coBorrower ? [{ value: 'coBorrower', label: lead.coBorrower }] : []),
    { value: 'both', label: lead.coBorrower ? 'Both borrowers' : 'Borrower' },
    { value: 'property', label: 'Property / File' },
    { value: 'internal', label: 'LOA / Internal' },
  ]
}

function getNeedOwnerLabel(lead, owner = 'borrower') {
  return getNeedOwnerOptions(lead).find((option) => option.value === owner)?.label || 'Borrower'
}

function getNeedDisplayText(item) {
  return String(item.text || '').replace(/^[A-Z]{1,4}\s+-\s+/i, '').trim()
}

function inferNeedOwner(lead, text) {
  const normalizedText = String(text || '').trim().toLowerCase()
  const borrowerFirstName = String(lead.client || '').trim().split(/\s+/)[0]?.toLowerCase()
  const coBorrowerFirstName = String(lead.coBorrower || '').trim().split(/\s+/)[0]?.toLowerCase()

  if (coBorrowerFirstName && normalizedText.startsWith(`${coBorrowerFirstName} -`)) return 'coBorrower'
  if (borrowerFirstName && normalizedText.startsWith(`${borrowerFirstName} -`)) return 'borrower'
  if (/^(lb|cb|cob|co-borrower)\s+-\s+/.test(normalizedText)) return lead.coBorrower ? 'coBorrower' : 'borrower'
  if (/^(file|property)\s+-\s+/.test(normalizedText)) return 'property'

  return 'borrower'
}

function groupNeedsByOwner(lead, needs) {
  const groups = new Map()

  needs.forEach((item) => {
    const owner = item.owner || inferNeedOwner(lead, item.text)
    const label = getNeedOwnerLabel(lead, owner)

    if (!groups.has(owner)) {
      groups.set(owner, { owner, label, items: [] })
    }

    groups.get(owner).items.push(item)
  })

  return Array.from(groups.values())
}

function buildPdfDocument(lines) {
  const maxLinesPerPage = 48
  const pages = []

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage))
  }

  const objects = []
  const pageObjectNumbers = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = objects.length + 1
    const contentObjectNumber = pageObjectNumber + 1
    pageObjectNumbers.push(pageObjectNumber)

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`)

    const streamLines = [
      'BT',
      '/F1 10 Tf',
      '14 TL',
      '50 752 Td',
      ...pageLines.map((line) => `(${sanitizePdfText(line)}) Tj T*`),
      'ET',
    ]
    const stream = streamLines.join('\n')
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)

    if (pageIndex === pages.length - 1) {
      objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`
    }
  })

  const bodyParts = ['%PDF-1.4\n']
  const offsets = [0]

  objects.forEach((objectContent, index) => {
    offsets.push(bodyParts.join('').length)
    bodyParts.push(`${index + 1} 0 obj\n${objectContent}\nendobj\n`)
  })

  const xrefOffset = bodyParts.join('').length
  bodyParts.push(`xref\n0 ${objects.length + 1}\n`)
  bodyParts.push('0000000000 65535 f \n')
  offsets.slice(1).forEach((offset) => {
    bodyParts.push(`${String(offset).padStart(10, '0')} 00000 n \n`)
  })
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return bodyParts.join('')
}

export function downloadLoaNeedsPdf({ lead, needsList, followUpPlan }) {
  const unmetNeeds = needsList.filter((item) => !item.met)
  const groupedNeeds = groupNeedsByOwner(lead, unmetNeeds)
  const recentNotes = (lead.touchHistory || [])
    .slice(0, 5)
    .map((activity) => `${formatDate(activity.date)} - ${activity.type || 'Touch'}: ${activity.note || 'No note captured.'}`)

  const lines = [
    'LOA FILE NOTES',
    `Generated: ${new Date().toLocaleString()}`,
    `Client: ${lead.coBorrower ? `${lead.client || 'Unnamed lead'} & ${lead.coBorrower}` : lead.client || 'Unnamed lead'}`,
  ]

  addSection(lines, 'File Snapshot', [
    `Stage: ${lead.stage || lead.status || 'Not captured'}`,
    `Lead Type: ${lead.leadType || 'Buyer Lead'}`,
    `Referral Partner / Source: ${lead.partner || lead.leadSource || 'Not captured'}`,
    `Phone: ${lead.phone || 'Not captured'}`,
    `Email: ${lead.email || 'Not captured'}`,
    `Loan Amount: ${formatMoney(lead.loanAmount)}`,
    `Closing Date: ${formatDate(lead.closingDate)}`,
    `Next Touch: ${formatDate(lead.nextActionDate)}`,
    `Next Action: ${lead.nextAction || followUpPlan.recommendedAction || 'Not captured'}`,
  ])

  addSection(lines, 'File Notes', [
    lead.detail || 'No file notes captured.',
    lead.appraisalNotes ? `Appraisal notes: ${lead.appraisalNotes}` : 'Appraisal notes: Not captured.',
  ])

  addSection(lines, 'Unmet Needs', groupedNeeds.length
    ? groupedNeeds.flatMap((group) => [
      `${group.label}:`,
      ...group.items.map((item, index) => `${index + 1}. ${getNeedDisplayText(item)}${item.note ? ` - ${item.note}` : ''}`),
    ])
    : ['No unmet needs.'])

  addSection(lines, 'Recent Activity Notes', recentNotes.length ? recentNotes : ['No recent activity notes captured.'])

  const pdf = buildPdfDocument(lines)
  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fileName = String(lead.client || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'client'

  link.href = url
  link.download = `${fileName}-loa-needs-list.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
