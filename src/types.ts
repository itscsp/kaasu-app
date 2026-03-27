// ─── API Types ────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expenses' | 'loan';

export interface ApiTransaction {
  id: number;
  date: string;
  amount: number;
  type: TransactionType;
  title?: string;
  description?: string;
  tags?: number[];
}

export interface ApiSummary {
  income: number;
  expenses: number;
  loan: number;
  balance: number;
}

export interface ApiBudget {
  id: number;
  title: string;
  date: string;
  transactions?: ApiTransaction[];
  summary?: ApiSummary;
}

export interface ApiTag {
  id: number;
  name: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AddTransaction: { budgetId: number };
  EditTransaction: { budgetId: number; transaction: ApiTransaction };
  Archive: undefined;
  BudgetDetail: { budgetId: number; budgetTitle: string };
};
