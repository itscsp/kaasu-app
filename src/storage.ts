import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, MonthData } from './types';

const CURRENT_KEY = 'kaasu_current';
const ARCHIVE_KEY = 'kaasu_archive';

// ─── Current Month ───────────────────────────────────────────────────────────

export async function getCurrentTransactions(): Promise<Transaction[]> {
  const raw = await AsyncStorage.getItem(CURRENT_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCurrentTransactions(txns: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(txns));
}

export async function addTransaction(txn: Transaction): Promise<void> {
  const txns = await getCurrentTransactions();
  await saveCurrentTransactions([txn, ...txns]);
}

export async function updateTransaction(updated: Transaction): Promise<void> {
  const txns = await getCurrentTransactions();
  const next = txns.map(t => (t.id === updated.id ? updated : t));
  await saveCurrentTransactions(next);
}

export async function deleteTransaction(id: string): Promise<void> {
  const txns = await getCurrentTransactions();
  await saveCurrentTransactions(txns.filter(t => t.id !== id));
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export async function getArchive(): Promise<MonthData[]> {
  const raw = await AsyncStorage.getItem(ARCHIVE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function archiveCurrentMonth(label: string, key: string): Promise<void> {
  const txns = await getCurrentTransactions();
  if (txns.length === 0) return;
  const archive = await getArchive();
  // Replace if already exists, otherwise prepend
  const existing = archive.findIndex(m => m.key === key);
  const monthData: MonthData = { key, label, transactions: txns };
  if (existing >= 0) {
    archive[existing] = monthData;
  } else {
    archive.unshift(monthData);
  }
  await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  await AsyncStorage.removeItem(CURRENT_KEY);
}

export async function getArchivedMonth(key: string): Promise<MonthData | null> {
  const archive = await getArchive();
  return archive.find(m => m.key === key) ?? null;
}
