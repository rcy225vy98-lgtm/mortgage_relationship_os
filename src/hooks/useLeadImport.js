import { useState } from 'react'
import {
  parseCsvText,
  csvRowsToObjects,
  getLeadImportKey,
} from '../utils/csvImportHelpers'

function getImportedDateUpdates(importedLead = {}) {
  const updates = {}

  if (importedLead.referralDate) {
    updates.referralDate = importedLead.referralDate
    updates.dateReferred = importedLead.dateReferred || importedLead.referralDate
    updates.originalDateReferred = importedLead.originalDateReferred || importedLead.referralDate
    updates.importedDateReferred = importedLead.importedDateReferred || importedLead.referralDate
  }

  if (importedLead.rawDateReferred) {
    updates.rawDateReferred = importedLead.rawDateReferred
  }

  if (importedLead.underContractDate) {
    updates.underContractDate = importedLead.underContractDate
  }

  if (importedLead.contractDate) {
    updates.contractDate = importedLead.contractDate
  }

  return updates
}

function hasUpdates(updates) {
  return Object.keys(updates).length > 0
}

function useLeadImport({
  leads,
  setLeads,
  importLeadTrackerRows,
  summarizeLeadTrackerImport,
}) {
  const [leadImportSummary, setLeadImportSummary] = useState(null)
  const [pendingLeadImport, setPendingLeadImport] = useState(null)

  async function importLeadTrackerFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const csvText = await file.text()
      const csvRows = parseCsvText(csvText)
      const rowObjects = csvRowsToObjects(csvRows)
      const importedLeads = importLeadTrackerRows(rowObjects)
      const timestamp = Date.now()
      const existingLeadByImportKey = new Map(leads.map((lead) => [getLeadImportKey(lead), lead]))
      const seenImportKeys = new Set(existingLeadByImportKey.keys())
      const newLeads = []
      const leadUpdates = []

      importedLeads.forEach((lead) => {
        const importKey = getLeadImportKey(lead)
        const existingLead = existingLeadByImportKey.get(importKey)

        if (existingLead) {
          const updates = getImportedDateUpdates(lead)

          if (hasUpdates(updates)) {
            leadUpdates.push({
              importKey,
              leadId: existingLead.id,
              updates,
            })
          }

          return
        }

        if (seenImportKeys.has(importKey)) return

        seenImportKeys.add(importKey)
        newLeads.push({
          ...lead,
          id: lead.id || crypto.randomUUID?.() || `${timestamp}-${newLeads.length}`,
        })
      })

      const skippedDuplicates = importedLeads.length - newLeads.length - leadUpdates.length
      const summary = {
        fileName: file.name,
        totalCsvRows: Math.max(csvRows.length - 1, 0),
        skippedDuplicates,
        updatedDuplicates: leadUpdates.length,
        ...summarizeLeadTrackerImport(newLeads),
      }

      setPendingLeadImport({
        fileName: file.name,
        newLeads,
        leadUpdates,
        summary,
      })
    } catch (error) {
      console.error('Unable to import lead tracker CSV:', error)
      setLeadImportSummary({
        fileName: file.name,
        error: 'Import failed. Confirm this is a clean CSV export with column headers in row 1.',
      })
    } finally {
      event.target.value = ''
    }
  }

  function confirmPendingLeadImport() {
    if (!pendingLeadImport) return

    const updatesByLeadId = new Map(
      (pendingLeadImport.leadUpdates || []).map((item) => [String(item.leadId), item.updates]),
    )

    if (pendingLeadImport.newLeads.length > 0 || updatesByLeadId.size > 0) {
      setLeads((current) => {
        const updatedCurrent = current.map((lead) => {
          const updates = updatesByLeadId.get(String(lead.id))
          return updates ? { ...lead, ...updates } : lead
        })

        return [...pendingLeadImport.newLeads, ...updatedCurrent]
      })
    }

    setLeadImportSummary(pendingLeadImport.summary)
    setPendingLeadImport(null)
  }

  function cancelPendingLeadImport() {
    setPendingLeadImport(null)
  }

  return {
    leadImportSummary,
    pendingLeadImport,
    importLeadTrackerFile,
    confirmPendingLeadImport,
    cancelPendingLeadImport,
  }
}

export default useLeadImport
