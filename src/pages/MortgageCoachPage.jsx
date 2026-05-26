import { useMemo, useState } from 'react'
import {
  calculateMortgageAnalysis,
  createSharePayload,
  defaultMortgageAnalysis,
  formatMoney,
  formatPercent,
  toNumber,
} from '../utils/mortgageCoach'

const programTypes = ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo', 'Non-QM', 'Other']
const quickMonthOptions = [12, 24, 36, 60, 84, 120]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getLeadName(lead) {
  if (!lead) return ''
  return lead.coBorrower ? `${lead.client} & ${lead.coBorrower}` : lead.client
}

function getScenarioSummary(analysis) {
  const totals = calculateMortgageAnalysis(analysis)

  return `${formatMoney(totals.totalBorrowerSpend)} over ${totals.customMonths} months`
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`mortgage-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function MoneyInput({ value, onChange, id }) {
  return (
    <input
      id={id}
      type="number"
      min="0"
      step="100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function NumberInput({ value, onChange, min = '0', step = '1' }) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ResultMetric({ label, value, detail }) {
  return (
    <div className="mortgage-result-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  )
}

function SpendRow({ label, value }) {
  return (
    <div className="mortgage-spend-row">
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </div>
  )
}

export function MortgageAnalysisSharePage({ analysis }) {
  if (!analysis) {
    return (
      <main className="mortgage-share-page">
        <section className="mortgage-share-shell">
          <h1>Analysis link unavailable</h1>
          <p>This borrower link could not be opened. Ask your loan officer for a fresh copy.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="mortgage-share-page">
      <section className="mortgage-share-shell">
        <div className="mortgage-share-header">
          <span>Total Cost Analysis</span>
          <h1>{analysis.title || 'Mortgage Analysis'}</h1>
          <p>{analysis.borrowerName || 'Borrower'} · {analysis.programType || 'Loan scenario'}</p>
        </div>
        <MortgageAnalysisResults analysis={analysis} shareView />
      </section>
    </main>
  )
}

function MortgageAnalysisResults({ analysis, shareView = false }) {
  const totals = useMemo(() => calculateMortgageAnalysis(analysis), [analysis])
  const extraPayment = toNumber(analysis.extraMonthlyPrincipal)

  return (
    <div className={shareView ? 'mortgage-results share-results' : 'mortgage-results'}>
      <section className="mortgage-results-summary">
        <ResultMetric
          label={`Total Borrower Spend Over ${totals.customMonths} Months`}
          value={formatMoney(totals.totalBorrowerSpend)}
          detail="Includes upfront borrower spend and monthly housing payments during the selected period."
        />
        <ResultMetric
          label="Estimated Cash To Close"
          value={formatMoney(totals.cashToClose)}
          detail={`${formatMoney(totals.earnestMoney)} earnest money credited against cash needed at closing.`}
        />
        <ResultMetric
          label="Monthly Payment"
          value={formatMoney(totals.monthlyPaymentWithExtra)}
          detail={extraPayment > 0 ? `${formatMoney(extraPayment)} extra principal included.` : 'PITI, MI, and HOA included.'}
        />
        <ResultMetric
          label="Effective Borrowing Cost"
          value={formatPercent(totals.effectiveRatePercent)}
          detail={`Note rate remains ${formatPercent(analysis.ratePercent)}. This reflects the balance impact of extra principal.`}
        />
      </section>

      <section className="mortgage-detail-band">
        <div>
          <span>Purchase Price</span>
          <strong>{formatMoney(totals.purchasePrice)}</strong>
        </div>
        <div>
          <span>Base Loan</span>
          <strong>{formatMoney(totals.baseLoanAmount)}</strong>
        </div>
        <div>
          <span>Final Loan</span>
          <strong>{formatMoney(totals.finalLoanAmount)}</strong>
        </div>
        <div>
          <span>Rate / Term</span>
          <strong>{formatPercent(analysis.ratePercent)} / {analysis.termMonths} mo</strong>
        </div>
      </section>

      <section className="mortgage-results-grid">
        <div className="mortgage-results-panel">
          <div className="mortgage-section-header">
            <strong>Spend Breakdown</strong>
            <span>{totals.customMonths} month view</span>
          </div>
          <SpendRow label="Down payment" value={totals.downPayment} />
          <SpendRow label="Closing costs" value={totals.closingCosts} />
          <SpendRow label="Discount points" value={totals.discountPoints} />
          <SpendRow label="Prepaid interest" value={totals.prepaidInterest} />
          <SpendRow label="HOI prepaid" value={totals.prepaidHoi} />
          <SpendRow label="Escrow setup" value={totals.escrowSetup} />
          <SpendRow label="Monthly principal and interest" value={totals.withExtra.totalScheduledPayment} />
          <SpendRow label="Extra principal paid" value={totals.withExtra.totalExtraPrincipal} />
          <SpendRow label="Property taxes" value={totals.totalTaxes} />
          <SpendRow label="Insurance" value={totals.totalInsurance} />
          <SpendRow label="Mortgage insurance" value={totals.totalMi} />
          <SpendRow label="HOA" value={totals.totalHoa} />
        </div>

        <div className="mortgage-results-panel">
          <div className="mortgage-section-header">
            <strong>Extra Payment Strategy</strong>
            <span>{extraPayment > 0 ? `${formatMoney(extraPayment)} extra monthly` : 'No extra principal'}</span>
          </div>
          <SpendRow label="Interest paid without extra" value={totals.standard.totalInterest} />
          <SpendRow label="Interest paid with extra" value={totals.withExtra.totalInterest} />
          <SpendRow label="Interest saved" value={totals.interestSaved} />
          <SpendRow label="Balance without extra" value={totals.standard.balance} />
          <SpendRow label="Balance with extra" value={totals.withExtra.balance} />
          <SpendRow label="Additional balance reduction" value={totals.balanceReduction} />
          {totals.withExtra.payoffMonth && (
            <div className="mortgage-spend-row">
              <span>Paid off by month</span>
              <strong>{totals.withExtra.payoffMonth}</strong>
            </div>
          )}
        </div>
      </section>

      {analysis.notes && (
        <section className="mortgage-results-panel mortgage-notes-panel">
          <div className="mortgage-section-header">
            <strong>Assumptions</strong>
            <span>Loan officer notes</span>
          </div>
          <p>{analysis.notes}</p>
        </section>
      )}
    </div>
  )
}

export default function MortgageCoachPage({ leads, mortgageAnalyses, setMortgageAnalyses }) {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(mortgageAnalyses[0]?.id || '')
  const [draft, setDraft] = useState(() => mortgageAnalyses[0] || {
    ...defaultMortgageAnalysis,
    id: '',
    createdAt: getTodayKey(),
    updatedAt: getTodayKey(),
  })
  const [shareMessage, setShareMessage] = useState('')
  const activeLeads = useMemo(() => leads.filter((lead) => !lead.archived), [leads])
  const selectedLead = useMemo(() => activeLeads.find((lead) => String(lead.id) === String(draft.leadId)), [activeLeads, draft.leadId])

  function updateDraft(field, value) {
    setDraft((current) => {
      const nextDraft = {
        ...current,
        [field]: value,
      }

      if (field === 'leadId') {
        const nextLead = activeLeads.find((lead) => String(lead.id) === String(value))
        nextDraft.borrowerName = nextLead ? getLeadName(nextLead) : current.borrowerName
      }

      return nextDraft
    })
  }

  function startNewAnalysis() {
    setSelectedAnalysisId('')
    setShareMessage('')
    setDraft({
      ...defaultMortgageAnalysis,
      id: '',
      title: 'New Total Cost Analysis',
      createdAt: getTodayKey(),
      updatedAt: getTodayKey(),
    })
  }

  function loadAnalysis(analysis) {
    setSelectedAnalysisId(analysis.id)
    setDraft(analysis)
    setShareMessage('')
  }

  function saveAnalysis() {
    const now = new Date().toISOString()
    const id = draft.id || crypto.randomUUID?.() || String(Date.now())
    const analysisToSave = {
      ...draft,
      id,
      title: draft.title.trim() || 'Total Cost Analysis',
      borrowerName: draft.borrowerName.trim() || selectedLead?.client || '',
      createdAt: draft.createdAt || now,
      updatedAt: now,
    }

    setMortgageAnalyses((current) => {
      const exists = current.some((analysis) => analysis.id === id)
      if (exists) {
        return current.map((analysis) => (analysis.id === id ? analysisToSave : analysis))
      }

      return [analysisToSave, ...current]
    })
    setDraft(analysisToSave)
    setSelectedAnalysisId(id)
    setShareMessage('Analysis saved.')
  }

  function duplicateAnalysis() {
    const now = new Date().toISOString()
    const copy = {
      ...draft,
      id: crypto.randomUUID?.() || String(Date.now()),
      title: `${draft.title || 'Total Cost Analysis'} Copy`,
      createdAt: now,
      updatedAt: now,
    }

    setMortgageAnalyses((current) => [copy, ...current])
    setDraft(copy)
    setSelectedAnalysisId(copy.id)
    setShareMessage('Analysis duplicated.')
  }

  function deleteAnalysis() {
    if (!selectedAnalysisId) return
    const confirmed = window.confirm('Delete this saved analysis?')

    if (!confirmed) return

    setMortgageAnalyses((current) => current.filter((analysis) => analysis.id !== selectedAnalysisId))
    startNewAnalysis()
  }

  async function shareAnalysis() {
    const payload = createSharePayload(draft)
    const shareUrl = `${window.location.origin}${window.location.pathname}#/analysis-share/${payload}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('Borrower link copied. It opens a read-only copy of this analysis.')
    } catch (error) {
      console.error('Unable to copy borrower link:', error)
      setShareMessage(shareUrl)
    }
  }

  const sortedAnalyses = useMemo(() => {
    return [...mortgageAnalyses].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }, [mortgageAnalyses])

  return (
    <div className="mortgage-coach-page">
      <section className="page-hero compact-hero">
        <div>
          <span className="eyebrow">Mortgage Coach</span>
          <h1>Total Cost Analysis</h1>
          <p>Create a generic borrower analysis, assign it to a lead when needed, and show total spend over custom months.</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-button" onClick={startNewAnalysis}>
            New Analysis
          </button>
          <button type="button" className="primary-button" onClick={saveAnalysis}>
            Save Analysis
          </button>
        </div>
      </section>

      <div className="mortgage-coach-layout">
        <aside className="mortgage-saved-panel">
          <div className="mortgage-section-header">
            <strong>Saved Analyses</strong>
            <span>{mortgageAnalyses.length} saved</span>
          </div>
          <div className="mortgage-saved-list">
            {sortedAnalyses.length > 0 ? sortedAnalyses.map((analysis) => {
              const lead = activeLeads.find((item) => String(item.id) === String(analysis.leadId))
              return (
                <button
                  type="button"
                  key={analysis.id}
                  className={analysis.id === selectedAnalysisId ? 'mortgage-saved-item active' : 'mortgage-saved-item'}
                  onClick={() => loadAnalysis(analysis)}
                >
                  <strong>{analysis.title}</strong>
                  <span>{lead ? getLeadName(lead) : analysis.borrowerName || 'Unassigned'}</span>
                  <small>{getScenarioSummary(analysis)}</small>
                </button>
              )
            }) : (
              <p className="mortgage-empty-state">Saved total cost analyses will appear here.</p>
            )}
          </div>
        </aside>

        <section className="mortgage-editor-panel">
          <div className="mortgage-editor-toolbar">
            <div>
              <span>Analysis Builder</span>
              <strong>{draft.title || 'New analysis'}</strong>
            </div>
            <div>
              <button type="button" className="ghost-button small-button" onClick={duplicateAnalysis}>
                Duplicate
              </button>
              <button type="button" className="ghost-button small-button" onClick={shareAnalysis}>
                Share
              </button>
              <button type="button" className="ghost-button danger-button small-button" onClick={deleteAnalysis} disabled={!selectedAnalysisId}>
                Delete
              </button>
            </div>
          </div>

          {shareMessage && <div className="mortgage-share-message">{shareMessage}</div>}

          <div className="mortgage-form-section">
            <div className="mortgage-section-header">
              <strong>Scenario Basics</strong>
              <span>Lead assignment is optional</span>
            </div>
            <div className="mortgage-form-grid">
              <Field label="Analysis Name" className="wide">
                <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
              </Field>
              <Field label="Assign To Lead">
                <select value={draft.leadId} onChange={(event) => updateDraft('leadId', event.target.value)}>
                  <option value="">Unassigned / Generic</option>
                  {activeLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{getLeadName(lead)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Borrower Name">
                <input value={draft.borrowerName} onChange={(event) => updateDraft('borrowerName', event.target.value)} />
              </Field>
              <Field label="Purchase Price">
                <MoneyInput value={draft.purchasePrice} onChange={(value) => updateDraft('purchasePrice', value)} />
              </Field>
              <Field label="Program Type">
                <select value={draft.programType} onChange={(event) => updateDraft('programType', event.target.value)}>
                  {programTypes.map((programType) => (
                    <option key={programType}>{programType}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="mortgage-form-section">
            <div className="mortgage-section-header">
              <strong>Loan Structure</strong>
              <span>Rate, term, ARM, I/O, and balloon</span>
            </div>
            <div className="mortgage-form-grid">
              <Field label="Down Payment Type">
                <select value={draft.downPaymentMode} onChange={(event) => updateDraft('downPaymentMode', event.target.value)}>
                  <option value="percent">Percentage</option>
                  <option value="amount">Dollars</option>
                </select>
              </Field>
              {draft.downPaymentMode === 'percent' ? (
                <Field label="Down Payment %">
                  <NumberInput value={draft.downPaymentPercent} step="0.125" onChange={(value) => updateDraft('downPaymentPercent', value)} />
                </Field>
              ) : (
                <Field label="Down Payment $">
                  <MoneyInput value={draft.downPaymentAmount} onChange={(value) => updateDraft('downPaymentAmount', value)} />
                </Field>
              )}
              <Field label="Loan Amount Override">
                <MoneyInput value={draft.loanAmount} onChange={(value) => updateDraft('loanAmount', value)} />
              </Field>
              <Field label="Interest Rate">
                <NumberInput value={draft.ratePercent} step="0.001" onChange={(value) => updateDraft('ratePercent', value)} />
              </Field>
              <Field label="Term In Months">
                <NumberInput value={draft.termMonths} min="1" onChange={(value) => updateDraft('termMonths', value)} />
              </Field>
              <Field label="Fixed Or ARM">
                <select value={draft.loanStructure} onChange={(event) => updateDraft('loanStructure', event.target.value)}>
                  <option>Fixed</option>
                  <option>ARM</option>
                </select>
              </Field>
              <Field label="Interest Only">
                <select value={draft.interestOnly ? 'yes' : 'no'} onChange={(event) => updateDraft('interestOnly', event.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Balloon Payment">
                <select value={draft.balloonPayment ? 'yes' : 'no'} onChange={(event) => updateDraft('balloonPayment', event.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              {draft.balloonPayment && (
                <Field label="Balloon Term Months">
                  <NumberInput value={draft.balloonTermMonths} min="1" onChange={(value) => updateDraft('balloonTermMonths', value)} />
                </Field>
              )}
            </div>
          </div>

          <div className="mortgage-form-section">
            <div className="mortgage-section-header">
              <strong>Closing Costs And Credits</strong>
              <span>Cash to close and borrower spend</span>
            </div>
            <div className="mortgage-form-grid">
              <Field label="Lender Fees">
                <MoneyInput value={draft.lenderFees} onChange={(value) => updateDraft('lenderFees', value)} />
              </Field>
              <Field label="Cannot Shop Fees">
                <MoneyInput value={draft.cannotShopFees} onChange={(value) => updateDraft('cannotShopFees', value)} />
              </Field>
              <Field label="Attorney And Title">
                <MoneyInput value={draft.attorneyTitleFees} onChange={(value) => updateDraft('attorneyTitleFees', value)} />
              </Field>
              <Field label="Other Fees">
                <MoneyInput value={draft.otherFees} onChange={(value) => updateDraft('otherFees', value)} />
              </Field>
              <Field label="Discount Points %">
                <NumberInput value={draft.discountPointsPercent} step="0.125" onChange={(value) => updateDraft('discountPointsPercent', value)} />
              </Field>
              <Field label="Prepaid Interest Days">
                <NumberInput value={draft.prepaidInterestDays} onChange={(value) => updateDraft('prepaidInterestDays', value)} />
              </Field>
              <Field label="Seller Credit">
                <MoneyInput value={draft.sellerCredit} onChange={(value) => updateDraft('sellerCredit', value)} />
              </Field>
              <Field label="Lender Credit">
                <MoneyInput value={draft.lenderCredit} onChange={(value) => updateDraft('lenderCredit', value)} />
              </Field>
              <Field label="Earnest Money">
                <MoneyInput value={draft.earnestMoney} onChange={(value) => updateDraft('earnestMoney', value)} />
              </Field>
              <Field label="UFMIP / Funding Fee">
                <MoneyInput value={draft.fundingFeeAmount} onChange={(value) => updateDraft('fundingFeeAmount', value)} />
              </Field>
              <Field label="Funding Fee Treatment">
                <select value={draft.financeFundingFee ? 'finance' : 'cash'} onChange={(event) => updateDraft('financeFundingFee', event.target.value === 'finance')}>
                  <option value="finance">Finance Into Loan</option>
                  <option value="cash">Pay In Cash</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="mortgage-form-section">
            <div className="mortgage-section-header">
              <strong>Payment, Prepaids, And Escrows</strong>
              <span>PITI, MI, HOA, and setup months</span>
            </div>
            <div className="mortgage-form-grid">
              <Field label="HOA Monthly">
                <MoneyInput value={draft.monthlyHoa} onChange={(value) => updateDraft('monthlyHoa', value)} />
              </Field>
              <Field label="Annual Insurance">
                <MoneyInput value={draft.annualInsurance} onChange={(value) => updateDraft('annualInsurance', value)} />
              </Field>
              <Field label="Annual Property Taxes">
                <MoneyInput value={draft.annualTaxes} onChange={(value) => updateDraft('annualTaxes', value)} />
              </Field>
              <Field label="Monthly MI">
                <MoneyInput value={draft.monthlyMortgageInsurance} onChange={(value) => updateDraft('monthlyMortgageInsurance', value)} />
              </Field>
              <Field label="HOI Prepaid Months">
                <NumberInput value={draft.prepaidHoiMonths} onChange={(value) => updateDraft('prepaidHoiMonths', value)} />
              </Field>
              <Field label="Tax Escrow Months">
                <NumberInput value={draft.taxEscrowMonths} onChange={(value) => updateDraft('taxEscrowMonths', value)} />
              </Field>
              <Field label="Insurance Escrow Months">
                <NumberInput value={draft.insuranceEscrowMonths} onChange={(value) => updateDraft('insuranceEscrowMonths', value)} />
              </Field>
              <Field label="MI Escrow Months">
                <NumberInput value={draft.miEscrowMonths} onChange={(value) => updateDraft('miEscrowMonths', value)} />
              </Field>
            </div>
          </div>

          <div className="mortgage-form-section">
            <div className="mortgage-section-header">
              <strong>Total Spend Period</strong>
              <span>Custom months drive the analysis</span>
            </div>
            <div className="mortgage-form-grid">
              <Field label="Custom Months">
                <NumberInput value={draft.customMonths} min="1" onChange={(value) => updateDraft('customMonths', value)} />
              </Field>
              <Field label="Extra Monthly Principal">
                <MoneyInput value={draft.extraMonthlyPrincipal} onChange={(value) => updateDraft('extraMonthlyPrincipal', value)} />
              </Field>
              <div className="mortgage-quick-months">
                {quickMonthOptions.map((monthCount) => (
                  <button type="button" key={monthCount} onClick={() => updateDraft('customMonths', monthCount)}>
                    {monthCount} mo
                  </button>
                ))}
                <button type="button" onClick={() => updateDraft('customMonths', draft.termMonths)}>
                  Full Term
                </button>
              </div>
              <Field label="Notes / Assumptions" className="wide">
                <textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows="4" />
              </Field>
            </div>
          </div>
        </section>

        <aside className="mortgage-results-panel-wrap">
          <MortgageAnalysisResults analysis={draft} />
        </aside>
      </div>
    </div>
  )
}
