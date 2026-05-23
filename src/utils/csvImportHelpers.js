function parseCsvText(csvText) {
  const rows = []
  let currentRow = []
  let currentValue = ''
  let insideQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"'
      index += 1
      continue
    }

    if (character === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  if (currentValue || currentRow.length) {
    currentRow.push(currentValue)
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => String(cell || '').trim()))
}

function csvRowsToObjects(csvRows) {
  const [headers = [], ...dataRows] = csvRows
  const cleanHeaders = headers.map((header) => String(header || '').trim())

  return dataRows.map((row) => {
    return cleanHeaders.reduce((record, header, index) => {
      if (!header) return record
      record[header] = row[index] || ''
      return record
    }, {})
  })
}

function normalizeImportKeyValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function getLeadImportKey(lead) {
  const partnerOrSource = lead.referralPartner || lead.partner || lead.source || lead.leadSource
  const loanAmount = Number(lead.loanAmount) || 0

  return [
    lead.client,
    partnerOrSource,
    lead.referralDate,
    lead.closingDate,
    lead.leadType,
    loanAmount,
  ].map(normalizeImportKeyValue).join('|')
}

export {
  parseCsvText,
  csvRowsToObjects,
  getLeadImportKey,
}
