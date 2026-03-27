import { ApiBudget, ApiTransaction, ApiSummary, ApiTag, TransactionType } from './types';

const BASE_URL = 'http://blogchethanspoojarycom.local/wp-json/budget-tracker/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers(credentials: string) {
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

  // 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Returns base64-encoded credentials string to store
export function encodeCredentials(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

// Verify credentials by hitting /budgets
export async function verifyCredentials(credentials: string): Promise<boolean> {
  try {
    await request<ApiBudget[]>(`${BASE_URL}/budgets`, credentials);
    return true;
  } catch {
    return false;
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
  return request<ApiSummary>(`${BASE_URL}/budgets/${id}/summary`, credentials);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  credentials: string,
  budgetId: number,
  type?: TransactionType
): Promise<ApiTransaction[]> {
  const url = type
    ? `${BASE_URL}/budgets/${budgetId}/transactions?type=${type}`
    : `${BASE_URL}/budgets/${budgetId}/transactions`;
  return request<ApiTransaction[]>(url, credentials);
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
