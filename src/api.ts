import {
  ApiBudget,
  ApiTransaction,
  ApiSummary,
  ApiTag,
  ApiPlan,
  TransactionType,
} from './types';

const BASE_URL = 'http://blogchethanspoojarycom.local/wp-json/budget-tracker/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers(credentials: string) {
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function normalizeTransaction(t: any): ApiTransaction {
  return {
    ...t,
    amount: Number(t?.amount ?? 0),
    tags: Array.isArray(t?.tags) ? t.tags.map(Number) : [],
  };
}

async function request<T>(
  url: string,
  credentials: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(credentials), ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function encodeCredentials(username: string, password: string): string {
  return btoa(`${username}:${password}`);
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
  // Registration is unauthenticated — use empty auth or public endpoint
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
}

export async function forgotAppPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/forgot-app-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
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
    income:   Number(raw?.income   ?? 0),
    expenses: Number(raw?.expenses ?? 0),
    loan:     Number(raw?.loan     ?? 0),
    balance:  Number(raw?.balance  ?? 0),
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
    title?: string;
    description?: string;
    tags?: number[];
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
    title: string;
    description: string;
    tags: number[];
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
  data: { title: string; amount: number }
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
  data: { title: string; amount: number }
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
