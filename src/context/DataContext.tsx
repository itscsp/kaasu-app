import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  getBudgets,
  getBudget,
  getBudgetSummary,
  getTransactions,
  getTags,
  getPlans,
  getAccounts,
} from '../api';
import { ApiBudget, ApiSummary, ApiTag, ApiPlan, ApiTransaction, ApiAccount } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type BudgetDetails = {
  budget: ApiBudget;
  summary: ApiSummary;
  transactions: ApiTransaction[];
};

interface DataContextType {
  budgets: ApiBudget[] | null;
  tags: ApiTag[] | null;
  budgetDetails: Record<number, BudgetDetails>;
  plans: Record<number, ApiPlan[]>;
  accounts: ApiAccount[] | null;

  fetchBudgets: (credentials: string, force?: boolean) => Promise<void>;
  fetchTags: (credentials: string, force?: boolean) => Promise<void>;
  fetchAccounts: (credentials: string, force?: boolean) => Promise<void>;
  fetchBudgetDetails: (credentials: string, budgetId: number, force?: boolean) => Promise<void>;
  fetchPlans: (credentials: string, budgetId: number, force?: boolean) => Promise<void>;

  invalidateBudgets: () => void;
  invalidateTags: () => void;
  invalidateAccounts: () => void;
  invalidateBudgetDetails: (budgetId: number) => void;
  invalidatePlans: (budgetId: number) => void;
  clearCache: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<ApiBudget[] | null>(null);
  const [tags, setTags] = useState<ApiTag[] | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[] | null>(null);
  const [budgetDetails, setBudgetDetails] = useState<Record<number, BudgetDetails>>({});
  const [plans, setPlans] = useState<Record<number, ApiPlan[]>>({});

  const fetchedBudgets = useRef(false);
  const fetchedTags = useRef(false);
  const fetchedAccounts = useRef(false);
  const fetchedBudgetDetails = useRef<Set<number>>(new Set());
  const fetchedPlans = useRef<Set<number>>(new Set());

  const fetchBudgets = useCallback(async (credentials: string, force = false) => {
    if (!force && fetchedBudgets.current) return;
    fetchedBudgets.current = true;
    try {
      const data = await getBudgets(credentials);
      setBudgets(data);
    } catch (e) {
      fetchedBudgets.current = false;
      throw e;
    }
  }, []);

  const fetchTags = useCallback(async (credentials: string, force = false) => {
    if (!force && fetchedTags.current) return;
    fetchedTags.current = true;
    try {
      const data = await getTags(credentials);
      setTags(data);
    } catch (e) {
      fetchedTags.current = false;
      throw e;
    }
  }, []);

  const fetchAccounts = useCallback(async (credentials: string, force = false) => {
    if (!force && fetchedAccounts.current) return;
    fetchedAccounts.current = true;
    try {
      const data = await getAccounts(credentials);
      setAccounts(data);
    } catch (e) {
      fetchedAccounts.current = false;
      throw e;
    }
  }, []);

  const fetchBudgetDetails = useCallback(
    async (credentials: string, budgetId: number, force = false) => {
      if (!force && fetchedBudgetDetails.current.has(budgetId)) return;
      fetchedBudgetDetails.current.add(budgetId);
      try {
        const [budget, summary, transactions] = await Promise.all([
          getBudget(credentials, budgetId),
          getBudgetSummary(credentials, budgetId),
          getTransactions(credentials, budgetId),
        ]);
        setBudgetDetails(prev => ({
          ...prev,
          [budgetId]: { budget, summary, transactions },
        }));
      } catch (e) {
        fetchedBudgetDetails.current.delete(budgetId);
        throw e;
      }
    },
    []
  );

  const fetchPlans = useCallback(
    async (credentials: string, budgetId: number, force = false) => {
      if (!force && fetchedPlans.current.has(budgetId)) return;
      fetchedPlans.current.add(budgetId);
      try {
        const p = await getPlans(credentials, budgetId);
        setPlans(prev => ({ ...prev, [budgetId]: p }));
      } catch (e) {
        fetchedPlans.current.delete(budgetId);
        throw e;
      }
    },
    []
  );

  const invalidateBudgets = useCallback(() => {
    fetchedBudgets.current = false;
  }, []);

  const invalidateTags = useCallback(() => {
    fetchedTags.current = false;
  }, []);

  const invalidateAccounts = useCallback(() => {
    fetchedAccounts.current = false;
  }, []);

  const invalidateBudgetDetails = useCallback((budgetId: number) => {
    fetchedBudgetDetails.current.delete(budgetId);
  }, []);

  const invalidatePlans = useCallback((budgetId: number) => {
    fetchedPlans.current.delete(budgetId);
  }, []);

  const clearCache = useCallback(() => {
    fetchedBudgets.current = false;
    fetchedTags.current = false;
    fetchedAccounts.current = false;
    fetchedBudgetDetails.current.clear();
    fetchedPlans.current.clear();
    setBudgets(null);
    setTags(null);
    setAccounts(null);
    setBudgetDetails({});
    setPlans({});
  }, []);

  return (
    <DataContext.Provider
      value={{
        budgets,
        tags,
        accounts,
        budgetDetails,
        plans,
        fetchBudgets,
        fetchTags,
        fetchAccounts,
        fetchBudgetDetails,
        fetchPlans,
        invalidateBudgets,
        invalidateTags,
        invalidateAccounts,
        invalidateBudgetDetails,
        invalidatePlans,
        clearCache,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
