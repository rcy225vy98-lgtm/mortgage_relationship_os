export function partnerScore(leads) {
  return leads.reduce((score, lead) => {
    if (lead.status === 'Under Contract') return score + 5
    if (lead.status === 'Pre-Approved') return score + 1
    if (lead.status.includes('DNQ')) return score - 1
    if (lead.status === 'Attempted to Connect') return score - 2
    if (lead.status === 'Other Lender') return score - 3
    return score
  }, 0)
}
