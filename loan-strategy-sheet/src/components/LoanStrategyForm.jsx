import { useEffect, useMemo, useState } from 'react';
import { generateLoanStrategyPdf } from '../utils/generateLoanStrategyPdf.js';
import {
  getCurrentSession,
  isSupabaseConfigured,
  listLoanStrategySheets,
  loadLoanStrategySheet,
  onAuthStateChange,
  saveLoanStrategySheet,
  signIn,
  signOut,
  signUp,
} from '../utils/supabaseLoanSheets.js';

const STORAGE_KEY = 'mcintosh-loan-strategy-sheet-draft';

const snapshotFields = [
  ['borrowerName', 'Borrower Name'],
  ['coBorrowerName', 'Co-Borrower Name'],
  ['propertyAddress', 'Property Address'],
  ['loanNumber', 'Loan Number'],
  ['loanType', 'Loan Type'],
  ['program', 'Program'],
  ['transactionType', 'Purchase or Refinance'],
  ['closingDate', 'Closing Date'],
  ['lockExpiration', 'Lock Expiration'],
  ['referralPartner', 'Referral Partner'],
  ['buyerAgent', 'Buyer Agent'],
  ['listingAgent', 'Listing Agent'],
  ['processor', 'Processor'],
  ['loa', 'LOA'],
];

const riskFields = [
  ['creditRisk', 'Credit Risk'],
  ['incomeRisk', 'Income Risk'],
  ['assetRisk', 'Asset Risk'],
  ['propertyRisk', 'Property Risk'],
];

const missingItems = [
  'Paystub',
  'W-2',
  'Tax Returns',
  'Bank Statement',
  'Gift Letter',
  'LOE',
  'VOE',
  'Insurance Quote',
  'Purchase Contract',
  'HOA Info',
  'Appraisal',
  'Other',
];

const narrativeFields = [
  ['whyLoanWorks', 'Why this loan works'],
  ['underwritingQuestions', 'What underwriting may question'],
  ['addressingQuestions', 'How we are addressing it'],
];

const noteFields = [
  ['brianNotes', 'Brian Notes'],
  ['angieNotes', 'Angie Notes'],
  ['veronicaNotes', 'Veronica Notes'],
];

const initialForm = {
  borrowerName: '',
  coBorrowerName: '',
  propertyAddress: '',
  loanNumber: '',
  loanType: '',
  program: '',
  transactionType: '',
  closingDate: '',
  lockExpiration: '',
  referralPartner: '',
  buyerAgent: '',
  listingAgent: '',
  processor: '',
  loa: '',
  creditRisk: 'Low',
  incomeRisk: 'Low',
  assetRisk: 'Low',
  propertyRisk: 'Low',
  biggestRisk: '',
  missingItems: [],
  otherMissingItems: '',
  whyLoanWorks: '',
  underwritingQuestions: '',
  addressingQuestions: '',
  brianNotes: '',
  angieNotes: '',
  veronicaNotes: '',
};

function readDraft() {
  try {
    const rawDraft = localStorage.getItem(STORAGE_KEY);
    return rawDraft ? { ...initialForm, ...JSON.parse(rawDraft) } : initialForm;
  } catch {
    return initialForm;
  }
}

export default function LoanStrategyForm() {
  const [form, setForm] = useState(readDraft);
  const [activeSheetId, setActiveSheetId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSession, setAuthSession] = useState(null);
  const [authStatus, setAuthStatus] = useState(isSupabaseConfigured ? 'Sign in to save sheets.' : 'Local draft only');
  const [remoteSheets, setRemoteSheets] = useState([]);
  const [remoteStatus, setRemoteStatus] = useState(isSupabaseConfigured ? 'Sign in to load saved sheets.' : 'Local draft only');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSavingRemote, setIsSavingRemote] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  }, [form]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    getCurrentSession()
      .then((session) => {
        setAuthSession(session);
        setAuthStatus(session?.user?.email ? `Signed in as ${session.user.email}` : 'Sign in to save sheets.');
      })
      .catch((error) => setAuthStatus(`Supabase auth error: ${error.message}`));

    const subscription = onAuthStateChange((session) => {
      setAuthSession(session);
      setAuthStatus(session?.user?.email ? `Signed in as ${session.user.email}` : 'Sign in to save sheets.');
      setRemoteSheets([]);
      setActiveSheetId('');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authSession) {
      return;
    }

    refreshRemoteSheets();
  }, [authSession]);

  const completedMissingCount = useMemo(() => form.missingItems.length, [form.missingItems]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleMissingItem(item) {
    setForm((current) => {
      const hasItem = current.missingItems.includes(item);
      return {
        ...current,
        missingItems: hasItem
          ? current.missingItems.filter((value) => value !== item)
          : [...current.missingItems, item],
      };
    });
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
    setForm(initialForm);
    setActiveSheetId('');
    setSavedAt('');
  }

  async function generatePdf() {
    await generateLoanStrategyPdf(form);
  }

  async function refreshRemoteSheets() {
    if (!authSession) {
      setRemoteSheets([]);
      setRemoteStatus('Sign in to load saved sheets.');
      return;
    }

    try {
      const sheets = await listLoanStrategySheets();
      setRemoteSheets(sheets);
      setRemoteStatus(sheets.length ? 'Supabase ready' : 'Supabase ready. No saved sheets yet.');
    } catch (error) {
      setRemoteStatus(`Supabase error: ${error.message}`);
    }
  }

  async function saveRemoteDraft() {
    if (!authSession) {
      setRemoteStatus('Sign in before saving to Supabase.');
      return;
    }

    setIsSavingRemote(true);
    setRemoteStatus('Saving to Supabase...');

    try {
      const savedId = await saveLoanStrategySheet(form, activeSheetId);
      setActiveSheetId(savedId);
      await refreshRemoteSheets();
      setRemoteStatus('Saved to Supabase');
    } catch (error) {
      setRemoteStatus(`Supabase error: ${error.message}`);
    } finally {
      setIsSavingRemote(false);
    }
  }

  async function loadRemoteDraft(id) {
    if (!id) {
      setActiveSheetId('');
      return;
    }

    setRemoteStatus('Loading from Supabase...');

    try {
      const sheet = await loadLoanStrategySheet(id);
      setForm({ ...initialForm, ...sheet.data });
      setActiveSheetId(sheet.id);
      setRemoteStatus('Loaded from Supabase');
    } catch (error) {
      setRemoteStatus(`Supabase error: ${error.message}`);
    }
  }

  async function handleSignIn() {
    setIsAuthLoading(true);
    setAuthStatus('Signing in...');

    try {
      const session = await signIn(authEmail, authPassword);
      setAuthSession(session);
      setAuthStatus(session?.user?.email ? `Signed in as ${session.user.email}` : 'Signed in.');
    } catch (error) {
      setAuthStatus(`Sign-in error: ${error.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSignUp() {
    setIsAuthLoading(true);
    setAuthStatus('Creating account...');

    try {
      const session = await signUp(authEmail, authPassword);
      setAuthSession(session);
      setAuthStatus(session ? 'Account created and signed in.' : 'Account created. Check your email if confirmation is enabled.');
    } catch (error) {
      setAuthStatus(`Sign-up error: ${error.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setIsAuthLoading(true);
    setAuthStatus('Signing out...');

    try {
      await signOut();
      setAuthSession(null);
      setActiveSheetId('');
      setRemoteSheets([]);
      setRemoteStatus('Sign in to load saved sheets.');
      setAuthStatus('Signed out.');
    } catch (error) {
      setAuthStatus(`Sign-out error: ${error.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  }

  const canUseSupabase = isSupabaseConfigured && Boolean(authSession);

  return (
    <main className="app-shell">
      <section className="page-header">
        <div>
          <p className="eyebrow">McIntosh Team</p>
          <h1>Loan Strategy Sheet</h1>
        </div>
        <div className="header-actions">
          <span className="save-status">{savedAt ? `Draft saved ${savedAt}` : 'Draft ready'}</span>
          <button className="secondary-button" type="button" onClick={clearDraft}>
            Clear
          </button>
          <button
            className="secondary-button"
            disabled={!canUseSupabase || isSavingRemote}
            type="button"
            onClick={saveRemoteDraft}
          >
            {isSavingRemote ? 'Saving...' : 'Save to Supabase'}
          </button>
          <button className="primary-button" type="button" onClick={generatePdf}>
            Generate PDF
          </button>
        </div>
      </section>

      <form className="strategy-form">
        <section className="form-section auth-section">
          <div>
            <h2>Account</h2>
            <p>{authStatus}</p>
          </div>
          {authSession ? (
            <button className="secondary-form-button" disabled={isAuthLoading} type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <div className="auth-controls">
              <input
                aria-label="Email"
                disabled={!isSupabaseConfigured || isAuthLoading}
                placeholder="Email"
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
              <input
                aria-label="Password"
                disabled={!isSupabaseConfigured || isAuthLoading}
                placeholder="Password"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
              <button
                className="secondary-form-button"
                disabled={!isSupabaseConfigured || isAuthLoading || !authEmail || !authPassword}
                type="button"
                onClick={handleSignIn}
              >
                Sign In
              </button>
              <button
                className="secondary-form-button"
                disabled={!isSupabaseConfigured || isAuthLoading || !authEmail || !authPassword}
                type="button"
                onClick={handleSignUp}
              >
                Create Account
              </button>
            </div>
          )}
        </section>

        <section className="form-section remote-section">
          <div className="remote-controls">
            <div>
              <h2>Saved Sheets</h2>
              <p>{remoteStatus}</p>
            </div>
            <select
              disabled={!canUseSupabase || !remoteSheets.length}
              value={activeSheetId}
              onChange={(event) => loadRemoteDraft(event.target.value)}
            >
              <option value="">Start a new sheet</option>
              {remoteSheets.map((sheet) => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.title} {sheet.loan_number ? `| ${sheet.loan_number}` : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>File Snapshot</h2>
            <p>Core details for the loan file and team handoff.</p>
          </div>
          <div className="field-grid">
            {snapshotFields.map(([name, label]) => (
              <label className={name === 'propertyAddress' ? 'field wide' : 'field'} key={name}>
                <span>{label}</span>
                <input
                  type={name.includes('Date') || name === 'lockExpiration' ? 'date' : 'text'}
                  value={form[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>Risk Dashboard</h2>
            <p>Rate each category and capture the main closing risk.</p>
          </div>
          <div className="risk-grid">
            {riskFields.map(([name, label]) => (
              <fieldset className="risk-card" key={name}>
                <legend>{label}</legend>
                <div className="segmented-control">
                  {['Low', 'Medium', 'High'].map((rating) => (
                    <label className={`risk-option ${form[name] === rating ? rating.toLowerCase() : ''}`} key={rating}>
                      <input
                        checked={form[name] === rating}
                        name={name}
                        onChange={() => updateField(name, rating)}
                        type="radio"
                      />
                      <span>{rating}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <label className="field">
            <span>Biggest Risk to Closing</span>
            <textarea
              rows="3"
              value={form.biggestRisk}
              onChange={(event) => updateField('biggestRisk', event.target.value)}
            />
          </label>
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>Missing Items</h2>
            <p>{completedMissingCount} selected for follow-up.</p>
          </div>
          <div className="checkbox-grid">
            {missingItems.map((item) => (
              <label className="checkbox-field" key={item}>
                <input
                  checked={form.missingItems.includes(item)}
                  onChange={() => toggleMissingItem(item)}
                  type="checkbox"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span>Other Missing Items</span>
            <textarea
              rows="3"
              value={form.otherMissingItems}
              onChange={(event) => updateField('otherMissingItems', event.target.value)}
            />
          </label>
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>Submission Narrative</h2>
            <p>Summarize the approval story before submission.</p>
          </div>
          <div className="textarea-grid">
            {narrativeFields.map(([name, label]) => (
              <label className="field" key={name}>
                <span>{label}</span>
                <textarea rows="5" value={form[name]} onChange={(event) => updateField(name, event.target.value)} />
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading">
            <h2>Team Notes</h2>
            <p>Internal notes by team member.</p>
          </div>
          <div className="textarea-grid">
            {noteFields.map(([name, label]) => (
              <label className="field" key={name}>
                <span>{label}</span>
                <textarea rows="4" value={form[name]} onChange={(event) => updateField(name, event.target.value)} />
              </label>
            ))}
          </div>
        </section>
      </form>
    </main>
  );
}
