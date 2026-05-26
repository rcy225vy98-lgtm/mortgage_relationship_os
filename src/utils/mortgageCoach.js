export const defaultMortgageAnalysis = {
  id: '',
  title: 'New Total Cost Analysis',
  leadId: '',
  borrowerName: '',
  purchasePrice: 450000,
  downPaymentMode: 'percent',
  downPaymentPercent: 5,
  downPaymentAmount: 22500,
  loanAmount: '',
  programType: 'Conventional',
  termMonths: 360,
  ratePercent: 6.75,
  loanStructure: 'Fixed',
  interestOnly: false,
  balloonPayment: false,
  balloonTermMonths: 84,
  lenderFees: 1495,
  cannotShopFees: 950,
  attorneyTitleFees: 3200,
  otherFees: 0,
  discountPointsPercent: 0,
  prepaidInterestDays: 15,
  sellerCredit: 0,
  lenderCredit: 0,
  earnestMoney: 5000,
  fundingFeeAmount: 0,
  financeFundingFee: true,
  monthlyHoa: 0,
  annualInsurance: 1800,
  annualTaxes: 5400,
  monthlyMortgageInsurance: 180,
  prepaidHoiMonths: 12,
  taxEscrowMonths: 3,
  insuranceEscrowMonths: 3,
  miEscrowMonths: 2,
  customMonths: 60,
  extraMonthlyPrincipal: 0,
  notes: '',
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function clampNumber(value, min, max) {
  const numericValue = toNumber(value)
  return Math.min(Math.max(numericValue, min), max)
}

export function formatMoney(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(toNumber(value))
}

export function formatPercent(value, maximumFractionDigits = 3) {
  return `${toNumber(value).toFixed(maximumFractionDigits).replace(/\.?0+$/, '')}%`
}

function getDownPayment(analysis) {
  const purchasePrice = toNumber(analysis.purchasePrice)

  if (analysis.downPaymentMode === 'amount') {
    return clampNumber(analysis.downPaymentAmount, 0, purchasePrice)
  }

  return clampNumber(purchasePrice * (toNumber(analysis.downPaymentPercent) / 100), 0, purchasePrice)
}

function calculateScheduledPayment(principal, annualRatePercent, termMonths, interestOnly = false) {
  const loanAmount = Math.max(toNumber(principal), 0)
  const months = Math.max(Math.round(toNumber(termMonths)), 1)
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12

  if (loanAmount <= 0) return 0
  if (interestOnly) return loanAmount * monthlyRate
  if (monthlyRate <= 0) return loanAmount / months

  const growthFactor = (1 + monthlyRate) ** months
  return loanAmount * ((monthlyRate * growthFactor) / (growthFactor - 1))
}

function amortize({ principal, annualRatePercent, termMonths, monthsToAnalyze, extraMonthlyPrincipal = 0, interestOnly = false }) {
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12
  const scheduledPayment = calculateScheduledPayment(principal, annualRatePercent, termMonths, interestOnly)
  const analysisMonths = Math.max(Math.round(toNumber(monthsToAnalyze)), 1)
  const loanTermMonths = Math.max(Math.round(toNumber(termMonths)), 1)
  const extraPayment = Math.max(toNumber(extraMonthlyPrincipal), 0)
  let balance = Math.max(toNumber(principal), 0)
  let totalInterest = 0
  let totalPrincipal = 0
  let totalScheduledPayment = 0
  let totalExtraPrincipal = 0
  let payoffMonth = null

  for (let month = 1; month <= Math.min(analysisMonths, loanTermMonths); month += 1) {
    if (balance <= 0) {
      if (!payoffMonth) payoffMonth = month - 1
      break
    }

    const interest = balance * monthlyRate
    const scheduledPrincipal = interestOnly ? 0 : Math.max(scheduledPayment - interest, 0)
    const principalPayment = Math.min(balance, scheduledPrincipal + extraPayment)
    const scheduledPortion = Math.min(scheduledPayment, balance + interest)
    const extraPortion = Math.max(principalPayment - scheduledPrincipal, 0)

    balance = Math.max(balance - principalPayment, 0)
    totalInterest += interest
    totalPrincipal += principalPayment
    totalScheduledPayment += scheduledPortion
    totalExtraPrincipal += extraPortion

    if (balance <= 0 && !payoffMonth) {
      payoffMonth = month
      break
    }
  }

  return {
    balance,
    payoffMonth,
    scheduledPayment,
    totalInterest,
    totalPrincipal,
    totalScheduledPayment,
    totalExtraPrincipal,
  }
}

function getBalanceAfterMonths(principal, annualRatePercent, termMonths, monthsToAnalyze, interestOnly = false) {
  return amortize({
    principal,
    annualRatePercent,
    termMonths,
    monthsToAnalyze,
    extraMonthlyPrincipal: 0,
    interestOnly,
  }).balance
}

function calculateEffectiveRate({ principal, actualRatePercent, termMonths, monthsToAnalyze, targetBalance, interestOnly = false }) {
  const startingRate = Math.max(toNumber(actualRatePercent), 0)
  const target = Math.max(toNumber(targetBalance), 0)

  if (startingRate <= 0 || target <= 0 || toNumber(principal) <= 0) return 0

  const zeroRateBalance = getBalanceAfterMonths(principal, 0, termMonths, monthsToAnalyze, interestOnly)
  if (zeroRateBalance > target) return 0

  let low = 0
  let high = startingRate

  for (let index = 0; index < 48; index += 1) {
    const middle = (low + high) / 2
    const middleBalance = getBalanceAfterMonths(principal, middle, termMonths, monthsToAnalyze, interestOnly)

    if (middleBalance > target) {
      high = middle
    } else {
      low = middle
    }
  }

  return low
}

export function calculateMortgageAnalysis(analysis) {
  const purchasePrice = toNumber(analysis.purchasePrice)
  const downPayment = getDownPayment(analysis)
  const baseLoanAmount = toNumber(analysis.loanAmount) || Math.max(purchasePrice - downPayment, 0)
  const fundingFeeAmount = toNumber(analysis.fundingFeeAmount)
  const financedFundingFee = analysis.financeFundingFee ? fundingFeeAmount : 0
  const finalLoanAmount = baseLoanAmount + financedFundingFee
  const termMonths = Math.max(Math.round(toNumber(analysis.termMonths)), 1)
  const customMonths = Math.min(Math.max(Math.round(toNumber(analysis.customMonths)), 1), termMonths)
  const monthlyTaxes = toNumber(analysis.annualTaxes) / 12
  const monthlyInsurance = toNumber(analysis.annualInsurance) / 12
  const monthlyMi = toNumber(analysis.monthlyMortgageInsurance)
  const monthlyHoa = toNumber(analysis.monthlyHoa)
  const monthlyNonPi = monthlyTaxes + monthlyInsurance + monthlyMi + monthlyHoa
  const discountPoints = baseLoanAmount * (toNumber(analysis.discountPointsPercent) / 100)
  const prepaidInterest = finalLoanAmount * (toNumber(analysis.ratePercent) / 100 / 365) * toNumber(analysis.prepaidInterestDays)
  const prepaidHoi = monthlyInsurance * toNumber(analysis.prepaidHoiMonths)
  const escrowSetup = (monthlyTaxes * toNumber(analysis.taxEscrowMonths))
    + (monthlyInsurance * toNumber(analysis.insuranceEscrowMonths))
    + (monthlyMi * toNumber(analysis.miEscrowMonths))
  const closingCosts = toNumber(analysis.lenderFees)
    + toNumber(analysis.cannotShopFees)
    + toNumber(analysis.attorneyTitleFees)
    + toNumber(analysis.otherFees)
  const cashFundingFee = analysis.financeFundingFee ? 0 : fundingFeeAmount
  const borrowerCredits = toNumber(analysis.sellerCredit) + toNumber(analysis.lenderCredit)
  const upfrontBorrowerSpend = Math.max(
    downPayment + closingCosts + discountPoints + prepaidInterest + prepaidHoi + escrowSetup + cashFundingFee - borrowerCredits,
    0,
  )
  const cashToClose = Math.max(upfrontBorrowerSpend - toNumber(analysis.earnestMoney), 0)
  const standardAmortization = amortize({
    principal: finalLoanAmount,
    annualRatePercent: analysis.ratePercent,
    termMonths,
    monthsToAnalyze: customMonths,
    extraMonthlyPrincipal: 0,
    interestOnly: analysis.interestOnly,
  })
  const extraAmortization = amortize({
    principal: finalLoanAmount,
    annualRatePercent: analysis.ratePercent,
    termMonths,
    monthsToAnalyze: customMonths,
    extraMonthlyPrincipal: analysis.extraMonthlyPrincipal,
    interestOnly: analysis.interestOnly,
  })
  const monthsWithPayments = extraAmortization.payoffMonth || customMonths
  const totalTaxes = monthlyTaxes * monthsWithPayments
  const totalInsurance = monthlyInsurance * monthsWithPayments
  const totalMi = monthlyMi * monthsWithPayments
  const totalHoa = monthlyHoa * monthsWithPayments
  const totalMonthlyHousingSpend = extraAmortization.totalScheduledPayment
    + extraAmortization.totalExtraPrincipal
    + totalTaxes
    + totalInsurance
    + totalMi
    + totalHoa
  const totalBorrowerSpend = upfrontBorrowerSpend + totalMonthlyHousingSpend
  const effectiveRatePercent = calculateEffectiveRate({
    principal: finalLoanAmount,
    actualRatePercent: analysis.ratePercent,
    termMonths,
    monthsToAnalyze: customMonths,
    targetBalance: extraAmortization.balance,
    interestOnly: analysis.interestOnly,
  })

  return {
    purchasePrice,
    downPayment,
    baseLoanAmount,
    finalLoanAmount,
    fundingFeeAmount,
    financedFundingFee,
    discountPoints,
    prepaidInterest,
    prepaidHoi,
    escrowSetup,
    closingCosts,
    cashFundingFee,
    borrowerCredits,
    earnestMoney: toNumber(analysis.earnestMoney),
    upfrontBorrowerSpend,
    cashToClose,
    customMonths,
    monthlyTaxes,
    monthlyInsurance,
    monthlyMi,
    monthlyHoa,
    monthlyNonPi,
    monthlyPrincipalInterest: standardAmortization.scheduledPayment,
    monthlyPayment: standardAmortization.scheduledPayment + monthlyNonPi,
    monthlyPaymentWithExtra: standardAmortization.scheduledPayment + monthlyNonPi + toNumber(analysis.extraMonthlyPrincipal),
    standard: standardAmortization,
    withExtra: extraAmortization,
    totalTaxes,
    totalInsurance,
    totalMi,
    totalHoa,
    totalMonthlyHousingSpend,
    totalBorrowerSpend,
    interestSaved: Math.max(standardAmortization.totalInterest - extraAmortization.totalInterest, 0),
    balanceReduction: Math.max(standardAmortization.balance - extraAmortization.balance, 0),
    effectiveRatePercent,
  }
}

export function createSharePayload(analysis) {
  const snapshot = {
    ...analysis,
    id: '',
    leadId: '',
    createdAt: '',
    updatedAt: '',
    shareToken: '',
  }
  const json = JSON.stringify(snapshot)

  return btoa(encodeURIComponent(json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function parseSharePayload(payload) {
  try {
    const paddedPayload = `${payload}${'='.repeat((4 - (payload.length % 4)) % 4)}`
    const json = decodeURIComponent(atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      ...defaultMortgageAnalysis,
      ...JSON.parse(json),
      leadId: '',
    }
  } catch (error) {
    console.error('Unable to read shared mortgage analysis:', error)
    return null
  }
}
