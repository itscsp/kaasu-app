// ─── API Types ────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expenses' | 'loan';

export type TagStatus = 'DONE' | 'PENDING';

export interface ApiTransaction {
  id: number;
  date: string;
  amount: number;
  type: TransactionType;
  title?: string;
  description?: string;
  notes?: string;
  tags?: number[];
  account_id?: number;
}

export interface ApiSummary {
  income: number;
  expenses: number;
  loan: number;
  balance: number;
  accounts?: ApiAccount[];
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
  slug?: string;
  status?: TagStatus;
}

export interface ApiPlan {
  id: number;
  title: string;
  amount: number;
}

export type AccountType = 'bank' | 'cash' | 'loan' | 'investment' | 'other';

export interface ApiAccount {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  is_connected: boolean;
  transaction_count: number;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  PinEntry: undefined;
  PinSetup: { username: string; appPassword: string };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  AddTransaction: { budgetId: number };
  EditTransaction: { budgetId: number; transaction: ApiTransaction };
  Archive: undefined;
  BudgetDetail: { budgetId: number; budgetTitle: string };
  Tags: undefined;
  Accounts: undefined;
  AccountDetail: { accountId: number; accountName: string };
  Summary: { budgetId: number; monthLabel: string };
};
