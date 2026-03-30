import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApiTransaction, ApiAccount, AccountType } from '../types';
import { useAuth } from '../context/AuthContext';
import { getAccounts, getAccountTransactions } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'AccountDetail'>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank',
  cash: 'Cash',
  loan: 'Loan',
  investment: 'Investment',
  other: 'Other',
};

const TYPE_COLORS: Record<AccountType, string> = {
  bank: '#60A5FA',
  cash: '#34D399',
  loan: '#F87171',
  investment: '#FBBF24',
  other: '#A78BFA',
};

// ─── Shared Transaction Row ────────────────────────────────────────────────────
function TransactionRow({ item }: { item: ApiTransaction }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(item.date);
  const day = date.getDate();
  const sign = item.type === 'income' ? '+' : '-';
  const amtColor = item.type === 'income' ? colors.income : colors.expense;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(e => !e)}
      style={styles.row}
    >
      <View style={styles.rowHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
        <View style={styles.rowMeta}>
          {item.title ? (
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          ) : null}
          <Text style={[styles.rowAmount, { color: amtColor }]}>
            {sign} ₹{item.amount.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '∧' : '∨'}</Text>
      </View>

      {expanded && (
        <View style={styles.rowBody}>
          {(item.description ?? item.notes) ? (
            <Text style={styles.rowDesc}>{item.description ?? item.notes}</Text>
          ) : null}
          <Text style={styles.rowType}>{item.type}</Text>
          <Text style={styles.rowDate}>
            {MONTH_NAMES[date.getMonth()]} {day}, {date.getFullYear()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Account Detail Screen ────────────────────────────────────────────────────
type ActiveTab = 'details' | 'transactions';

export default function AccountDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { accountId, accountName } = route.params;
  const { credentials } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [account, setAccount] = useState<ApiAccount | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [txnsLoaded, setTxnsLoaded] = useState(false);
  const [error, setError] = useState('');

  // Load account details
  const loadAccount = useCallback(async () => {
    if (!credentials) return;
    try {
      const all = await getAccounts(credentials);
      const found = all.find(a => a.id === accountId) ?? null;
      setAccount(found);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load account');
    } finally {
      setLoadingAccount(false);
    }
  }, [credentials, accountId]);

  // Load transactions (lazy — only when tab is opened)
  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (!credentials) return;
    if (!isRefresh) setLoadingTxns(true);
    try {
      const data = await getAccountTransactions(credentials, accountId);
      setTransactions([...data].sort((a, b) => b.date.localeCompare(a.date)));
      setTxnsLoaded(true);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load transactions');
    } finally {
      setLoadingTxns(false);
      setRefreshing(false);
    }
  }, [credentials, accountId]);

  useFocusEffect(useCallback(() => { loadAccount(); }, [loadAccount]));

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'transactions' && !txnsLoaded) {
      loadTransactions();
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'details') {
      setLoadingAccount(true);
      loadAccount();
    } else {
      loadTransactions(true);
    }
  };

  const typeColor = account ? (TYPE_COLORS[account.type] ?? colors.textMuted) : colors.textMuted;
  const typeLabel = account ? (ACCOUNT_TYPE_LABELS[account.type] ?? account.type) : '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{accountName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => handleTabChange('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
            Details
          </Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => handleTabChange('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* ── Details Tab ── */}
      {activeTab === 'details' && (
        loadingAccount ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.textMuted} />
          </View>
        ) : account ? (
          <FlatList
            data={[]}
            keyExtractor={() => 'detail'}
            renderItem={null}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />
            }
            ListHeaderComponent={
              <View style={styles.detailsContainer}>
                {/* Balance card */}
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Balance</Text>
                  <Text style={[
                    styles.balanceValue,
                    { color: account.balance >= 0 ? colors.income : colors.expense },
                  ]}>
                    {account.balance >= 0 ? '' : '-'}₹{Math.abs(account.balance).toLocaleString()}
                  </Text>
                </View>

                {/* Detail rows */}
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Name</Text>
                    <Text style={styles.detailValue}>{account.name}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '44' }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    {account.is_connected ? (
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedText}>
                          🔗 Linked · {account.transaction_count} transaction{account.transaction_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.detailValueMuted}>Not linked</Text>
                    )}
                  </View>
                </View>
              </View>
            }
          />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Account not found.</Text>
          </View>
        )
      )}

      {/* ── Transactions Tab ── */}
      {activeTab === 'transactions' && (
        loadingTxns ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.textMuted} />
            <Text style={styles.loadingText}>Loading transactions…</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.textMuted}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No transactions linked to this account.</Text>
              </View>
            }
            renderItem={({ item }) => <TransactionRow item={item} />}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, minWidth: 40 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, flex: 1, textAlign: 'center' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  tabSep: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  errorText: { margin: spacing.md, fontSize: fontSize.sm, color: '#F87171' },

  // Details tab
  detailsContainer: { padding: spacing.md, gap: spacing.md },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },

  detailCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  detailDivider: { height: 1, backgroundColor: colors.border },
  detailLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  detailValueMuted: { fontSize: fontSize.sm, color: colors.textMuted },

  typeBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.4 },

  connectedBadge: {
    backgroundColor: colors.savings + '22',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  connectedText: { fontSize: fontSize.xs, color: colors.savings, fontWeight: fontWeight.medium },

  // Transactions list
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },

  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dayBadge: {
    width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  dayText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rowMeta: { flex: 1 },
  rowTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
  rowAmount: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  chevron: { fontSize: 13, color: colors.textMuted },
  rowBody: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 2 },
  rowType: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowDate: { fontSize: fontSize.xs, color: colors.textMuted },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
});
