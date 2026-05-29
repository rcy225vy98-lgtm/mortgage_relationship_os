import { createClient } from '@supabase/supabase-js';

const TABLE_NAME = 'loan_strategy_sheets';

const supabaseUrl = import.meta.env.VITE_LOAN_STRATEGY_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_LOAN_STRATEGY_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function getCurrentSession() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function onAuthStateChange(callback) {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function signIn(email, password) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUp(email, password) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

function buildTitle(form) {
  if (form.borrowerName?.trim()) {
    return form.borrowerName.trim();
  }

  if (form.propertyAddress?.trim()) {
    return form.propertyAddress.trim();
  }

  return 'Untitled Loan Strategy Sheet';
}

export async function listLoanStrategySheets() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,title,borrower_name,property_address,loan_number,updated_at')
    .order('updated_at', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function loadLoanStrategySheet(id) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.from(TABLE_NAME).select('id,data').eq('id', id).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveLoanStrategySheet(form, currentId) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    title: buildTitle(form),
    borrower_name: form.borrowerName || null,
    property_address: form.propertyAddress || null,
    loan_number: form.loanNumber || null,
    data: form,
  };

  if (currentId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', currentId)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  }

  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select('id').single();

  if (error) {
    throw error;
  }

  return data.id;
}
