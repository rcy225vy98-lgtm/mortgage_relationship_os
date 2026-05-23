import { useEffect, useState } from 'react'

function CloudSyncPage(props) {
  const {
    setActivePage,
    hasCompletedCloudStartupLoad,
    supabaseAuthMessage,
    leads,
    isSupabaseAutoSaving,
    isPartnerProfileAutoSaving,
    hasCompletedPartnerProfileStartupLoad,
    supabaseLoadMessage,
    supabaseAutoSaveMessage,
    supabaseTestMessage,
    supabaseBackupMessage,
    partnerProfileSyncMessage,
    partnerProfileAutoSaveMessage,
    reversedPartnerNameSuggestions,
    mergePartnerNames,
    mergeSourcePartner,
    setMergeSourcePartner,
    mergeTargetPartner,
    setMergeTargetPartner,
    partnerCleanupOptions,
    signInToSupabase,
    supabaseAuthEmail,
    setSupabaseAuthEmail,
    supabaseAuthPassword,
    setSupabaseAuthPassword,
    isSupabaseAuthLoading,
    createSupabaseAccount,
    signOutOfSupabase,
    testSupabaseConnection,
    isSupabaseTesting,
    backupCurrentLeadsToSupabase,
    isSupabaseBackupRunning,
    loadLeadsFromSupabaseManually,
    isSupabaseLoadRunning,
    backupPartnerProfilesToSupabase,
    isPartnerProfileSyncRunning,
    loadPartnerProfilesFromSupabaseManually,
  } = props
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isInstalledApp, setIsInstalledApp] = useState(false)
  const [installMessage, setInstallMessage] = useState('Ready for phone home-screen install.')

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')

    function updateInstalledState() {
      setIsInstalledApp(standaloneQuery.matches || window.navigator.standalone === true)
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallPromptEvent(event)
      setInstallMessage('This browser can install Mortgage OS directly.')
    }

    updateInstalledState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (standaloneQuery.addEventListener) {
      standaloneQuery.addEventListener('change', updateInstalledState)
    } else {
      standaloneQuery.addListener(updateInstalledState)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      if (standaloneQuery.removeEventListener) {
        standaloneQuery.removeEventListener('change', updateInstalledState)
      } else {
        standaloneQuery.removeListener(updateInstalledState)
      }
    }
  }, [])

  async function installAppFromPrompt() {
    if (!installPromptEvent) return

    installPromptEvent.prompt()
    const choice = await installPromptEvent.userChoice

    if (choice?.outcome === 'accepted') {
      setInstallPromptEvent(null)
      setInstallMessage('Mortgage OS was added to this device.')
      setIsInstalledApp(true)
    } else {
      setInstallMessage('Install was dismissed. You can still add it from the browser menu.')
    }
  }

  function exportLeadsToJson() {
    const exportedAt = new Date().toISOString()
    const payload = {
      exportedAt,
      leadCount: leads.length,
      leads,
    }
    const fileDate = exportedAt.slice(0, 10)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `mortgage-relationship-os-leads-${fileDate}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportLeadsToCsv() {
    if (leads.length === 0) return

    const exportedAt = new Date().toISOString()
    const fileDate = exportedAt.slice(0, 10)
    const baseColumns = [
      'id',
      'firstName',
      'lastName',
      'name',
      'phone',
      'email',
      'stage',
      'status',
      'referralPartner',
      'purchasePrice',
      'loanAmount',
      'loanType',
      'lastTouch',
      'nextTouchDate',
      'notes',
      'createdAt',
      'updatedAt',
    ]
    const extraColumns = Array.from(
      new Set(leads.flatMap((lead) => Object.keys(lead || {}))),
    ).filter((column) => !baseColumns.includes(column))
    const columns = [...baseColumns, ...extraColumns]

    function formatCsvValue(value) {
      if (value === null || value === undefined) return ''
      const normalizedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return `"${normalizedValue.replaceAll('"', '""')}"`
    }

    const rows = [
      columns.join(','),
      ...leads.map((lead) => columns.map((column) => formatCsvValue(lead?.[column])).join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `mortgage-relationship-os-leads-${fileDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel cloud-sync-page">
      <div className="panel-header">
        <div>
          <span>System Maintenance</span>
          <h2>Cloud Sync Status</h2>
          <p>Sign in once, then Supabase becomes the primary data home for laptop and phone.</p>
        </div>
        <button type="button" className="ghost-button" onClick={() => setActivePage('dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="production-metric-grid">
        <div className="production-metric primary">
          <span>Cloud Sync</span>
          <strong>{hasCompletedCloudStartupLoad ? 'Active' : 'Sign In'}</strong>
        </div>
        <div className="production-metric">
          <span>Auth Status</span>
          <strong>{supabaseAuthMessage.replace('Signed in as ', '')}</strong>
        </div>
        <div className="production-metric">
          <span>Lead Count</span>
          <strong>{leads.length}</strong>
        </div>
        <div className="production-metric">
          <span>Auto-Save</span>
          <strong>{isSupabaseAutoSaving ? 'Saving' : hasCompletedCloudStartupLoad ? 'Ready' : 'Paused'}</strong>
        </div>
        <div className="production-metric">
          <span>Partner Profiles</span>
          <strong>{isPartnerProfileAutoSaving ? 'Saving' : hasCompletedPartnerProfileStartupLoad ? 'Synced' : 'Local'}</strong>
        </div>
      </div>

      <div className="install-app-card">
        <div className="install-app-mark" aria-hidden="true">
          OS
        </div>
        <div>
          <span>Phone App</span>
          <strong>{isInstalledApp ? 'Installed App Mode' : 'Add to Home Screen'}</strong>
          <p>{isInstalledApp ? 'You are running Mortgage OS from the home-screen app shell.' : installMessage}</p>
          {!isInstalledApp && (
            <small>iPhone: open the Vercel URL in Safari, tap Share, then Add to Home Screen.</small>
          )}
        </div>
        {installPromptEvent && !isInstalledApp && (
          <button type="button" className="primary-button" onClick={installAppFromPrompt}>
            Install App
          </button>
        )}
      </div>

      <div className="import-summary-card preview">
        <div>
          <span>Latest Cloud Messages</span>
          <strong>Supabase Cloud Sync</strong>
          <p>{supabaseLoadMessage}</p>
          <small>{supabaseAutoSaveMessage}</small>
          <small>{supabaseTestMessage}</small>
          <small>{supabaseBackupMessage}</small>
          <small>{partnerProfileSyncMessage}</small>
          <small>{partnerProfileAutoSaveMessage}</small>
        </div>
      </div>

      <div className="import-summary-card preview">
        <div>
          <span>Data Cleanup</span>
          <strong>Merge Referral Partners</strong>
          <p>Use this when the same agent appears under two names, like “Smith John” and “John Smith.” The source partner will be merged into the target partner.</p>
          {reversedPartnerNameSuggestions.length > 0 ? (
            <small>{reversedPartnerNameSuggestions.length} possible reversed-name match{reversedPartnerNameSuggestions.length === 1 ? '' : 'es'} found.</small>
          ) : (
            <small>No obvious reversed-name matches found.</small>
          )}
        </div>

        {reversedPartnerNameSuggestions.length > 0 && (
          <div className="compact-pipeline-list">
            {reversedPartnerNameSuggestions.slice(0, 6).map((suggestion) => (
              <div className="compact-pipeline-row" key={`${suggestion.source}-${suggestion.target}`}>
                <span>{suggestion.source} → {suggestion.target}</span>
                <button type="button" className="ghost-button small-button" onClick={() => mergePartnerNames(suggestion.source, suggestion.target)}>
                  Merge
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="lead-form cloud-maintenance-form">
          <div className="field">
            <label htmlFor="merge-source-partner">Merge From</label>
            <select
              id="merge-source-partner"
              value={mergeSourcePartner}
              onChange={(event) => setMergeSourcePartner(event.target.value)}
            >
              <option value="">Choose source partner</option>
              {partnerCleanupOptions.map((partnerName) => (
                <option value={partnerName} key={partnerName}>{partnerName}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="merge-target-partner">Merge Into</label>
            <select
              id="merge-target-partner"
              value={mergeTargetPartner}
              onChange={(event) => setMergeTargetPartner(event.target.value)}
            >
              <option value="">Choose target partner</option>
              {partnerCleanupOptions.map((partnerName) => (
                <option value={partnerName} key={partnerName}>{partnerName}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions full">
            <button
              type="button"
              className="primary-button"
              disabled={!mergeSourcePartner || !mergeTargetPartner || mergeSourcePartner === mergeTargetPartner}
              onClick={() => mergePartnerNames(mergeSourcePartner, mergeTargetPartner)}
            >
              Merge Partner Records
            </button>
          </div>
        </div>
      </div>

      <form className="lead-form cloud-maintenance-form" onSubmit={signInToSupabase}>
        <div className="field">
          <label htmlFor="supabase-auth-email">Supabase Email</label>
          <input
            id="supabase-auth-email"
            type="email"
            value={supabaseAuthEmail}
            onChange={(event) => setSupabaseAuthEmail(event.target.value)}
            placeholder="Supabase email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="supabase-auth-password">Supabase Password</label>
          <input
            id="supabase-auth-password"
            type="password"
            value={supabaseAuthPassword}
            onChange={(event) => setSupabaseAuthPassword(event.target.value)}
            placeholder="Supabase password"
            required
          />
        </div>

        <div className="modal-actions full">
          <button type="submit" className="primary-button" disabled={isSupabaseAuthLoading}>
            {isSupabaseAuthLoading ? 'Working...' : 'Sign In'}
          </button>
          <button type="button" className="ghost-button" onClick={createSupabaseAccount} disabled={isSupabaseAuthLoading || !supabaseAuthEmail || !supabaseAuthPassword}>
            Create Account
          </button>
          <button type="button" className="ghost-button" onClick={signOutOfSupabase} disabled={isSupabaseAuthLoading}>
            Sign Out
          </button>
          <button type="button" className="ghost-button" onClick={testSupabaseConnection} disabled={isSupabaseTesting}>
            {isSupabaseTesting ? 'Testing...' : 'Test Supabase'}
          </button>
          <button type="button" className="primary-button" onClick={backupCurrentLeadsToSupabase} disabled={isSupabaseBackupRunning || isSupabaseAuthLoading || isSupabaseAutoSaving}>
            {isSupabaseBackupRunning ? 'Backing Up...' : 'Force Save Leads'}
          </button>
          <button type="button" className="ghost-button" onClick={loadLeadsFromSupabaseManually} disabled={isSupabaseLoadRunning || isSupabaseAuthLoading || isSupabaseAutoSaving}>
            {isSupabaseLoadRunning ? 'Loading...' : 'Reload Leads'}
          </button>
          <button type="button" className="ghost-button" onClick={exportLeadsToCsv} disabled={leads.length === 0}>
            Export Leads CSV
          </button>
          <button type="button" className="ghost-button" onClick={exportLeadsToJson} disabled={leads.length === 0}>
            Export Leads JSON
          </button>
          <button type="button" className="primary-button" onClick={backupPartnerProfilesToSupabase} disabled={isPartnerProfileSyncRunning || isSupabaseAuthLoading || isSupabaseAutoSaving || isPartnerProfileAutoSaving}>
            {isPartnerProfileSyncRunning ? 'Syncing...' : 'Force Save Partner Profiles'}
          </button>
          <button type="button" className="ghost-button" onClick={loadPartnerProfilesFromSupabaseManually} disabled={isPartnerProfileSyncRunning || isSupabaseAuthLoading || isSupabaseAutoSaving || isPartnerProfileAutoSaving}>
            {isPartnerProfileSyncRunning ? 'Syncing...' : 'Reload Partner Profiles'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CloudSyncPage
