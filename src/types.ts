export type TransactionType = 'Expenses' | 'Income' | 'Savings' | 'Investment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // ISO date string
  group?: string;
}

export interface MonthData {
  key: string; // e.g. "2025-06"
  label: string; // e.g. "June 2025"
  transactions: Transaction[];
}

export type RootStackParamList = {
  Home: undefined;
  AddTransaction: undefined;
  EditTransaction: { transaction: Transaction };
  Archive: undefined;
  ArchiveMonth: { monthKey: string; monthLabel: string };
};
