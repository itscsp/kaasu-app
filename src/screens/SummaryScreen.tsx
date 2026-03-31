import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Summary'>;
type RouteProps = RouteProp<RootStackParamList, 'Summary'>;

export default function SummaryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { budgetId, monthLabel } = route.params;
  const { credentials } = useAuth();
  const { budgetDetails, fetchBudgetDetails } = useData();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!credentials) return;
    if (!isRefresh) setLoading(true);
    try {
      await fetchBudgetDetails(credentials, budgetId, true);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [credentials, budgetId, fetchBudgetDetails]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summary = budgetDetails[budgetId]?.summary;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.textMuted}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.textMuted} />
            <Text style={styles.loadingText}>Loading summary…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : summary ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>{monthLabel} Overview</Text>

            {/* Main Stats */}
            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Income</Text>
                <Text style={[styles.statValue, { color: colors.income }]}>
                  ₹{Number(summary.total_income ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Expenses</Text>
                <Text style={[styles.statValue, { color: colors.expense }]}>
                  ₹{Number(summary.total_expenses ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { fontWeight: fontWeight.bold, color: colors.textPrimary }]}>
                  Net Balance
                </Text>
                <Text style={[
                  styles.statValue,
                  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: (summary.net_balance ?? 0) >= 0 ? colors.income : colors.expense }
                ]}>
                  ₹{Math.abs(summary.net_balance ?? 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Account Balances */}
            {summary.accounts && summary.accounts.length > 0 && (
              <View style={styles.accountsSection}>
                <Text style={styles.sectionLabel}>Account Balances</Text>
                <View style={styles.accountsList}>
                  {summary.accounts.map(acc => {
                    const balance = Number(acc.balance ?? acc.amount ?? 0);
                    return (
                      <View key={acc.id} style={styles.accountRow}>
                        <View style={styles.accountInfo}>
                          <Text style={styles.accountName}>{acc.name}</Text>
                          <Text style={styles.accountGroup}>{acc.group ?? acc.type}</Text>
                        </View>
                        <Text style={[
                          styles.accountBalance,
                          { color: balance >= 0 ? colors.income : colors.expense }
                        ]}>
                          ₹{Math.abs(balance).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {(!summary.accounts || summary.accounts.length === 0) && (
              <View style={styles.emptyAccounts}>
                <Text style={styles.emptyText}>No accounts tracked for this month.</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
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

  content: { padding: spacing.md, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  errorText: { color: colors.expense, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xl },

  summaryContainer: { gap: spacing.md },
  summaryTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center', marginVertical: spacing.sm },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  statValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  statDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  accountsSection: { marginTop: spacing.md, gap: spacing.sm },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  accountsList: { gap: spacing.sm },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
  accountGroup: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'capitalize' },
  accountBalance: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  emptyAccounts: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
