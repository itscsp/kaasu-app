import {
  ApiBudget,
  ApiTransaction,
  ApiSummary,
  ApiTag,
  ApiPlan,
  ApiAccount,
  PlanStatus,
  TransactionType,
} from './types';

const BASE_URL = 'https://powderblue-alligator-718865.hostingersite.com/wp-json/kaasu-wp/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAuthHeader(credentials: string): string {
  // Google ID tokens are JWTs: three base64url segments separated by dots
  const isJWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(credentials);
  return isJWT ? `Bearer ${credentials}` : `Basic ${credentials}`;
}

function headers(credentials: string) {
  return {
    Authorization: buildAuthHeader(credentials),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function normalizeTransaction(t: any): ApiTransaction {
  return {
    ...t,
    amount: Number(t?.amount ?? 0),
    tags: Array.isArray(t?.tags) ? t.tags.map(Number) : [],
    notes: t?.notes ?? t?.description ?? '',
  };
}

function normalizeAccount(a: any): ApiAccount {
  return {
    ...a,
    balance: Number(a?.balance ?? a?.amount ?? 0),
    amount: Number(a?.amount ?? a?.balance ?? 0),
    group: a?.group ?? a?.type ?? 'Accounts',
    type: a?.group ?? a?.type ?? 'Accounts',
    is_connected: Boolean(a?.is_connected),
    transaction_count: Number(a?.transaction_count ?? 0),
  };
}

async function request<T>(
  url: string,
  credentials: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method || 'GET';
  console.log(`\n🚀 [API REQUEST] ${method} ${url}`);
  if (options.body) {
    console.log(`📦 [API PAYLOAD]:`, options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers: { ...headers(credentials), ...(options.headers ?? {}) },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const rawText = await res.text();
      try {
        const body = JSON.parse(rawText);
        console.log(`❌ [API ERROR] ${res.status}:`, JSON.stringify(body, null, 2));
        msg = body?.message ?? msg;
      } catch {
        console.log(`❌ [API ERROR] ${res.status}:`, rawText);
        msg = rawText || msg;
      }
    } catch { }
    throw new Error(msg);
  }

  if (res.status === 204) {
    console.log(`✅ [API SUCCESS] ${res.status} No Content`);
    return {} as T;
  }

  const data = isJson ? await res.json() : await res.text();
  console.log(`✅ [API SUCCESS] ${res.status}:`, JSON.stringify(data, null, 2));
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function encodeCredentials(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

export async function googleSignIn(
  idToken: string
): Promise<{ success: boolean; user?: { name: string; email: string } }> {
  const url = `${BASE_URL}/auth/google`;
  console.log(`\n🚀 [API REQUEST] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token: idToken }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      try { msg = JSON.parse(text)?.message ?? msg; } catch { msg = text || msg; }
    } catch {}
    console.log(`❌ [GOOGLE AUTH ERROR] ${res.status}: ${msg}`);
    throw new Error(msg);
  }
  const data = await res.json();
  console.log(`✅ [GOOGLE AUTH SUCCESS]:`, JSON.stringify(data));
  return data;
}


export async function verifyCredentials(credentials: string): Promise<boolean> {
  try {
    await request<ApiBudget[]>(`${BASE_URL}/budgets`, credentials);
    return true;
  } catch {
    return false;
  }
}

export async function registerUser(
  _credentials: string,
  data: { name: string; phone: string; email: string }
): Promise<void> {
  const url = `${BASE_URL}/auth/register`;
  console.log(`\n🚀 [API REQUEST] POST ${url}`);
  console.log(`📦 [API PAYLOAD]:`, JSON.stringify(data));

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.log(`❌ [API FETCH FAILED]`, err);
    throw err;
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const rawText = await res.text();
      try {
        const body = JSON.parse(rawText);
        console.log(`❌ [API ERROR] ${res.status}:`, JSON.stringify(body, null, 2));
        msg = body?.message ?? msg;
      } catch {
        console.log(`❌ [API ERROR] ${res.status}:`, rawText);
        msg = rawText || msg;
      }
    } catch { }
    throw new Error(msg);
  }
  console.log(`✅ [API SUCCESS] ${res.status} User Registered`);
}

export async function forgotAppPassword(email: string): Promise<void> {
  const url = `${BASE_URL}/auth/forgot-app-password`;
  console.log(`\n🚀 [API REQUEST] POST ${url}`);
  console.log(`📦 [API PAYLOAD]:`, JSON.stringify({ email }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const rawText = await res.text();
      try {
        const body = JSON.parse(rawText);
        console.log(`❌ [API ERROR] ${res.status}:`, JSON.stringify(body, null, 2));
        msg = body?.message ?? msg;
      } catch {
        console.log(`❌ [API ERROR] ${res.status}:`, rawText);
        msg = rawText || msg;
      }
    } catch { }
    throw new Error(msg);
  }
  console.log(`✅ [API SUCCESS] ${res.status} Forgot Password Sent`);
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export async function getBudgets(credentials: string, year?: number): Promise<ApiBudget[]> {
  const url = year ? `${BASE_URL}/budgets?year=${year}` : `${BASE_URL}/budgets`;
  return request<ApiBudget[]>(url, credentials);
}

export async function getBudget(credentials: string, id: number): Promise<ApiBudget> {
  return request<ApiBudget>(`${BASE_URL}/budgets/${id}`, credentials);
}

export async function createBudget(credentials: string, title: string): Promise<ApiBudget> {
  return request<ApiBudget>(`${BASE_URL}/budgets`, credentials, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function deleteBudget(credentials: string, id: number): Promise<void> {
  await request<{}>(`${BASE_URL}/budgets/${id}`, credentials, { method: 'DELETE' });
}

export async function getBudgetSummary(credentials: string, id: number): Promise<ApiSummary> {
  const raw = await request<any>(`${BASE_URL}/budgets/${id}/summary`, credentials);
  return {
    total_income: Number(raw?.total_income ?? raw?.income ?? 0),
    total_expenses: Number(raw?.total_expenses ?? raw?.expenses ?? 0),
    net_balance: Number(raw?.net_balance ?? raw?.balance ?? 0),
    accounts: Array.isArray(raw?.accounts)
      ? raw.accounts.map(normalizeAccount)
      : undefined,
  };
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(
  credentials: string,
  budgetId: number,
  type?: TransactionType
): Promise<ApiTransaction[]> {
  const url = type
    ? `${BASE_URL}/budgets/${budgetId}/transactions?type=${type}`
    : `${BASE_URL}/budgets/${budgetId}/transactions`;
  const raw = await request<any[]>(url, credentials);
  return Array.isArray(raw) ? raw.map(normalizeTransaction) : [];
}

export async function addApiTransaction(
  credentials: string,
  budgetId: number,
  data: {
    date: string;
    amount: number;
    type: TransactionType;
    notes?: string;
    tags?: number[];
    account_id?: number;
    to_account_id?: number;
  }
): Promise<ApiTransaction> {
  return request<ApiTransaction>(
    `${BASE_URL}/budgets/${budgetId}/transactions`,
    credentials,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function updateApiTransaction(
  credentials: string,
  budgetId: number,
  transactionId: number,
  data: Partial<{
    date: string;
    amount: number;
    type: TransactionType;
    notes: string;
    tags: number[];
    account_id: number;
    to_account_id: number;
  }>
): Promise<ApiTransaction> {
  return request<ApiTransaction>(
    `${BASE_URL}/budgets/${budgetId}/transactions/${transactionId}`,
    credentials,
    { method: 'PUT', body: JSON.stringify(data) }
  );
}

export async function deleteApiTransaction(
  credentials: string,
  budgetId: number,
  transactionId: number
): Promise<void> {
  await request<{}>(
    `${BASE_URL}/budgets/${budgetId}/transactions/${transactionId}`,
    credentials,
    { method: 'DELETE' }
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(credentials: string): Promise<ApiTag[]> {
  return request<ApiTag[]>(`${BASE_URL}/tags`, credentials);
}

export async function createTag(credentials: string, name: string): Promise<ApiTag> {
  return request<ApiTag>(`${BASE_URL}/tags`, credentials, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteTag(credentials: string, id: number): Promise<void> {
  await request<{}>(`${BASE_URL}/tags/${id}`, credentials, { method: 'DELETE' });
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlans(credentials: string, budgetId: number): Promise<ApiPlan[]> {
  return request<ApiPlan[]>(`${BASE_URL}/budgets/${budgetId}/plans`, credentials);
}

export async function createPlan(
  credentials: string,
  budgetId: number,
  data: { title: string; amount: number; status?: PlanStatus }
): Promise<ApiPlan> {
  return request<ApiPlan>(`${BASE_URL}/budgets/${budgetId}/plans`, credentials, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlan(
  credentials: string,
  budgetId: number,
  planId: number,
  data: { title: string; amount: number; status?: PlanStatus }
): Promise<ApiPlan> {
  return request<ApiPlan>(
    `${BASE_URL}/budgets/${budgetId}/plans/${planId}`,
    credentials,
    { method: 'PUT', body: JSON.stringify(data) }
  );
}

export async function deletePlan(
  credentials: string,
  budgetId: number,
  planId: number
): Promise<void> {
  await request<{}>(
    `${BASE_URL}/budgets/${budgetId}/plans/${planId}`,
    credentials,
    { method: 'DELETE' }
  );
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(credentials: string): Promise<ApiAccount[]> {
  const raw = await request<any[]>(`${BASE_URL}/accounts`, credentials);
  return Array.isArray(raw) ? raw.map(normalizeAccount) : [];
}

export async function createAccount(
  credentials: string,
  data: { name: string; group: string; amount?: number; description?: string }
): Promise<ApiAccount> {
  const raw = await request<any>(`${BASE_URL}/accounts`, credentials, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return normalizeAccount(raw);
}

export async function updateAccount(
  credentials: string,
  id: number,
  data: { name?: string; group?: string; amount?: number; description?: string }
): Promise<ApiAccount> {
  const raw = await request<any>(`${BASE_URL}/accounts/${id}`, credentials, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return normalizeAccount(raw);
}

export async function deleteAccount(credentials: string, id: number): Promise<void> {
  await request<{}>(`${BASE_URL}/accounts/${id}`, credentials, { method: 'DELETE' });
}

export async function getAccountTransactions(
  credentials: string,
  accountId: number
): Promise<ApiTransaction[]> {
  const raw = await request<any[]>(`${BASE_URL}/accounts/${accountId}/transactions`, credentials);
  return Array.isArray(raw) ? raw.map(normalizeTransaction) : [];
}
