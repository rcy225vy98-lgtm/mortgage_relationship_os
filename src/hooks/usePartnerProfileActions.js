

import { savePartnerProfile } from '../data/partnerProfilesRepository'

function getEmptyPartnerTouchForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: 'Value Touch',
    note: '',
    nextAction: '',
    nextTouchDate: '',
  }
}

function usePartnerProfileActions({
  partnerProfiles,
  setPartnerProfiles,
  partnerProfileDraft,
  setPartnerProfileDraft,
  setPartnerTouchForm,
  setSelectedPartnerProfile,
  setIsEditingPartnerProfile,
  setActivePage,
  setLeads,
  selectedPartner,
  setSelectedPartner,
  partnerFilter,
  setPartnerFilter,
  agentQuery,
  setAgentQuery,
  setMergeSourcePartner,
  setMergeTargetPartner,
  setIsPartnerProfileAutoSaving,
  setPartnerProfileAutoSaveMessage,
}) {
  function openPartnerProfile(row) {
    setSelectedPartnerProfile(row)
    setIsEditingPartnerProfile(false)
    setPartnerProfileDraft(null)
    setPartnerTouchForm(getEmptyPartnerTouchForm())
    setActivePage('partnerProfile')
  }

  function renamePartner(oldName, newNameValue) {
    const newName = newNameValue.trim()

    if (!newName || newName === oldName) return

    setPartnerProfiles((current) => {
      const nextProfiles = { ...current }
      const existingProfile = nextProfiles[oldName] || {}
      const mergedProfile = {
        ...existingProfile,
        ...(nextProfiles[newName] || {}),
      }

      delete nextProfiles[oldName]
      nextProfiles[newName] = mergedProfile

      return nextProfiles
    })

    setLeads((current) =>
      current.map((lead) => {
        const isAgentRelationshipRecord = lead.leadType === 'Agent Prospect' && lead.stage === 'Referral Partner' && lead.client === oldName
        const isBuyerLeadFromPartner = lead.partner === oldName

        if (isAgentRelationshipRecord) {
          return {
            ...lead,
            client: newName,
          }
        }

        if (isBuyerLeadFromPartner) {
          return {
            ...lead,
            partner: newName,
          }
        }

        return lead
      }),
    )

    setSelectedPartnerProfile((current) => {
      if (!current || current.partner !== oldName) return current
      return {
        ...current,
        partner: newName,
      }
    })

    if (selectedPartner === oldName) {
      setSelectedPartner(newName)
    }

    if (partnerFilter === oldName) {
      setPartnerFilter(newName)
    }

    if (agentQuery === oldName) {
      setAgentQuery(newName)
    }
  }

  function mergePartnerNames(sourceName, targetName) {
    const cleanSourceName = String(sourceName || '').trim()
    const cleanTargetName = String(targetName || '').trim()

    if (!cleanSourceName || !cleanTargetName || cleanSourceName === cleanTargetName) return

    renamePartner(cleanSourceName, cleanTargetName)
    setMergeSourcePartner('')
    setMergeTargetPartner('')
  }

  function startEditingPartnerProfile(currentPartner, partnerProfile) {
    setPartnerProfileDraft({
      partnerName: currentPartner.partner,
      email: partnerProfile.email || '',
      phone: partnerProfile.phone || '',
      brokerage: partnerProfile.brokerage || '',
      notes: partnerProfile.notes || '',
    })
    setIsEditingPartnerProfile(true)
  }

  function cancelEditingPartnerProfile() {
    setPartnerProfileDraft(null)
    setIsEditingPartnerProfile(false)
  }

  async function savePartnerProfileChanges(currentPartner) {
    if (!partnerProfileDraft) return

    const originalName = currentPartner.partner
    const nextName = partnerProfileDraft.partnerName.trim() || originalName
    const nextProfile = {
      ...(partnerProfiles[nextName] || partnerProfiles[originalName] || {}),
      partnerName: nextName,
      email: partnerProfileDraft.email,
      phone: partnerProfileDraft.phone,
      brokerage: partnerProfileDraft.brokerage,
      notes: partnerProfileDraft.notes,
    }

    if (nextName !== originalName) {
      renamePartner(originalName, nextName)
    }

    setPartnerProfiles((current) => ({
      ...current,
      [nextName]: nextProfile,
    }))

    setSelectedPartnerProfile((current) => {
      if (!current) return current
      return {
        ...current,
        partner: nextName,
      }
    })

    setPartnerProfileDraft(null)
    setIsEditingPartnerProfile(false)
    setIsPartnerProfileAutoSaving(true)
    setPartnerProfileAutoSaveMessage(`Saving ${nextName} to Supabase...`)

    try {
      await savePartnerProfile(nextProfile)
      setPartnerProfileAutoSaveMessage(`${nextName} saved to Supabase.`)
    } catch (error) {
      console.error('Partner profile save failed:', error)
      setPartnerProfileAutoSaveMessage(error.message || `Could not save ${nextName} to Supabase. Check the browser console for details.`)
    } finally {
      setIsPartnerProfileAutoSaving(false)
    }
  }

  function addPartnerTouch(partnerName, touch) {
    const today = new Date().toISOString().slice(0, 10)

    const touchEntry = {
      id: Date.now(),
      date: touch.date || today,
      type: touch.type || 'Relationship Touch',
      note: touch.note || '',
      nextAction: touch.nextAction || '',
      nextTouchDate: touch.nextTouchDate || '',
    }

    setPartnerProfiles((current) => {
      const currentProfile = current[partnerName] || {}
      const touchHistory = currentProfile.touchHistory || []

      return {
        ...current,
        [partnerName]: {
          ...currentProfile,
          touchHistory: [touchEntry, ...touchHistory],
        },
      }
    })
  }

  function removePartnerTouch(partnerName, touchId) {
    setPartnerProfiles((current) => {
      const currentProfile = current[partnerName] || {}
      const touchHistory = currentProfile.touchHistory || []

      return {
        ...current,
        [partnerName]: {
          ...currentProfile,
          touchHistory: touchHistory.filter((touch) => touch.id !== touchId),
        },
      }
    })
  }

  function completePartnerReminder(partnerName, touchId) {
    setPartnerProfiles((current) => {
      const currentProfile = current[partnerName] || {}
      const touchHistory = currentProfile.touchHistory || []

      return {
        ...current,
        [partnerName]: {
          ...currentProfile,
          touchHistory: touchHistory.map((touch) => {
            if (touch.id !== touchId) return touch

            return {
              ...touch,
              completedAt: new Date().toISOString().slice(0, 10),
              nextTouchDate: '',
            }
          }),
        },
      }
    })
  }

  return {
    openPartnerProfile,
    mergePartnerNames,
    renamePartner,
    startEditingPartnerProfile,
    cancelEditingPartnerProfile,
    savePartnerProfileChanges,
    addPartnerTouch,
    removePartnerTouch,
    completePartnerReminder,
  }
}

export default usePartnerProfileActions
