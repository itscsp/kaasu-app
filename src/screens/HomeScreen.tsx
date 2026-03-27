import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApiBudget, ApiTransaction, ApiSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getBudgets,
  createBudget,
  getTransactions,
  getBudgetSummary,
  deleteApiTransaction,
} from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TransactionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ApiTransaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
          {item.description ? (
            <Text style={styles.rowDesc}>{item.description}</Text>
          ) : null}
          <Text style={styles.rowType}>{item.type}</Text>
          <Text style={styles.rowDate}>
            {MONTH_NAMES[date.getMonth()]} {day}, {date.getFullYear()}
          </Text>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.btnUpdate} onPress={onEdit}>
              <Text style={styles.btnUpdateText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDelete} onPress={onDelete}>
              <Text style={styles.btnDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { credentials, logout } = useAuth();

  const [budget, setBudget] = useState<ApiBudget | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');

  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!credentials) return;
      if (!isRefresh) setLoading(true);
      try {
        // Get all budgets and find current month
        const budgets = await getBudgets(credentials, now.getFullYear());
        const monthTitle = currentMonthLabel; // e.g. "March 2026"

        let currentBudget = budgets.find(b =>
          b.title.toLowerCase().includes(MONTH_NAMES[now.getMonth()].toLowerCase()) &&
          b.title.includes(String(now.getFullYear()))
        ) ?? null;

        // Auto-create current month budget if missing
        if (!currentBudget) {
          currentBudget = await createBudget(credentials, monthTitle);
        }

        setBudget(currentBudget);

        const [txns, sum] = await Promise.all([
          getTransactions(credentials, currentBudget.id),
          getBudgetSummary(credentials, currentBudget.id),
        ]);

        setTransactions(txns);
        setSummary(sum);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [credentials]
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (tid: number) => {
    if (!credentials || !budget) return;
    Alert.alert('Delete Transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteApiTransaction(credentials, budget.id, tid);
            load();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Disconnect', 'Remove saved credentials?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentMonthLabel}</Text>
        <View style={styles.headerRight}>
          {budget && (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction', { budgetId: budget.id })}
              style={styles.headerBtn}
            >
              <Text style={styles.headerAction}>Add</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Text style={styles.headerLogout}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Summary ── */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              ₹{(summary.income ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              ₹{(summary.expenses ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: (summary.balance ?? 0) >= 0 ? colors.income : colors.expense },
              ]}
            >
              ₹{Math.abs(summary.balance ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading…</Text>
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
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.textMuted}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions this month.</Text>
              <Text style={styles.emptySub}>Tap "Add" to record your first one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TransactionRow
              item={item}
              onEdit={() =>
                budget &&
                navigation.navigate('EditTransaction', {
                  budgetId: budget.id,
                  transaction: item,
                })
              }
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            {MONTH_NAMES[now.getMonth()]}
          </Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={styles.tab}
          onPress={() => { setActiveTab('archive'); navigation.navigate('Archive'); }}
        >
          <Text style={[styles.tabText, activeTab === 'archive' && styles.tabTextActive]}>
            Archive
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerBtn: { paddingVertical: 2 },
  headerAction: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerLogout: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Summary bar
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  // List
  listContent: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },

  // Row
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
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowMeta: { flex: 1 },
  rowTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  rowAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  chevron: { fontSize: 13, color: colors.textMuted },

  rowBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  rowType: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowDate: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  btnUpdate: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  btnUpdateText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  btnDelete: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  btnDeleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.expense },

  // Loading / Empty
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  tabSep: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
