import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApiTransaction, ApiSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { getTransactions, getBudgetSummary } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BudgetDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'BudgetDetail'>;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

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
          {item.description ? (
            <Text style={styles.rowDesc}>{item.description}</Text>
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

export default function BudgetDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { budgetId, budgetTitle } = route.params;
  const { credentials } = useAuth();

  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (!credentials) return;
    if (!isRefresh) setLoading(true);
    try {
      const [txns, sum] = await Promise.all([
        getTransactions(credentials, budgetId),
        getBudgetSummary(credentials, budgetId),
      ]);
      setTransactions(txns);
      setSummary(sum);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load budget');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [budgetId]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{budgetTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
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
              <Text style={styles.emptyText}>No transactions in this budget.</Text>
            </View>
          }
          renderItem={({ item }) => <TransactionRow item={item} />}
        />
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
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },

  listContent: { padding: spacing.md, gap: spacing.sm },

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

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
});
