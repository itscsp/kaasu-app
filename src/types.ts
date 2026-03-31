// ─── API Types ────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expenses' | 'transfer';

export type PlanStatus = 'DONE' | 'PENDING';

export interface ApiTransaction {
  id: number;
  date: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  tags?: number[];
  account_id?: number;
  to_account_id?: number;
}

export interface ApiSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
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
}

export interface ApiPlan {
  id: number;
  title: string;
  amount: number;
  status?: PlanStatus;
}

export type AccountGroup = 'Cash' | 'Accounts' | 'Investment' | 'Loan' | 'Insurance' | 'Saving';

export interface ApiAccount {
  id: number;
  name: string;
  type: AccountGroup;
  group: AccountGroup;
  balance: number;
  amount?: number;
  description?: string;
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
