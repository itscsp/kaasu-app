import React, { useState, useCallback, useEffect } from 'react';
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
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApiBudget, ApiTransaction, ApiSummary, ApiPlan, PlanStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  getBudgets,
  createBudget,
  getBudgetSummary,
  getTransactions,
  deleteApiTransaction,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type ActiveTab = 'transactions' | 'plans';

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

  const isTransfer = item.type === 'transfer';
  const sign = item.type === 'income' ? '+' : item.type === 'expenses' ? '-' : '⇄';
  const amtColor = item.type === 'income' ? colors.income : item.type === 'expenses' ? colors.expense : colors.investment;

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
          {item.notes ? (
            <Text style={styles.rowTitle} numberOfLines={1}>{item.notes}</Text>
          ) : null}
          <Text style={[styles.rowAmount, { color: amtColor }]}>
            {sign} ₹{item.amount.toLocaleString()}
          </Text>
        </View>
        {isTransfer && (
          <View style={styles.transferBadge}>
            <Text style={styles.transferBadgeText}>Transfer</Text>
          </View>
        )}
        <Text style={styles.chevron}>{expanded ? '∧' : '∨'}</Text>
      </View>

      {expanded && (
        <View style={styles.rowBody}>
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

// ─── Plan Row ─────────────────────────────────────────────────────────────────
function PlanRow({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
  togglingStatus,
}: {
  plan: ApiPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  togglingStatus: boolean;
}) {
  const isDone = plan.status === 'DONE';
  return (
    <View style={styles.planRow}>
      <TouchableOpacity
        onPress={onToggleStatus}
        disabled={togglingStatus}
        style={[styles.statusCircle, isDone ? styles.statusCircleDone : styles.statusCirclePending]}
      >
        {togglingStatus ? (
          <ActivityIndicator size="small" color={isDone ? colors.income : colors.investment} />
        ) : (
          <Text style={[styles.statusCircleText, { color: isDone ? colors.income : colors.investment }]}>
            {isDone ? '✓' : '○'}
          </Text>
        )}
      </TouchableOpacity>
      <View style={styles.planInfo}>
        <Text style={[styles.planTitle, isDone && styles.planTitleDone]}>{plan.title}</Text>
        <Text style={styles.planAmount}>₹{Number(plan.amount).toLocaleString()}</Text>
      </View>
      <View style={[styles.planStatusBadge, isDone ? styles.planBadgeDone : styles.planBadgePending]}>
        <Text style={[styles.planStatusText, { color: isDone ? colors.income : colors.investment }]}>
          {plan.status ?? 'PENDING'}
        </Text>
      </View>
      <View style={styles.planActions}>
        <TouchableOpacity style={styles.planBtn} onPress={onEdit}>
          <Text style={styles.planBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.planBtn, styles.planBtnDanger]} onPress={onDelete}>
          <Text style={[styles.planBtnText, { color: colors.expense }]}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { credentials, logout } = useAuth();
  const { invalidateBudgetDetails, invalidatePlans, invalidateBudgets } = useData();

  const [budget, setBudget] = useState<ApiBudget | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');

  // Plan form state
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planStatus, setPlanStatus] = useState<PlanStatus>('PENDING');
  const [editingPlan, setEditingPlan] = useState<ApiPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [togglingPlanId, setTogglingPlanId] = useState<number | null>(null);

  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!credentials) return;
      if (!isRefresh) setLoading(true);
      try {
        const budgets = await getBudgets(credentials, now.getFullYear());

        // Always prefer the actual current calendar month
        let currentBudget = budgets.find(b =>
          b.title.toLowerCase() === currentMonthLabel.toLowerCase()
        ) ?? null;

        if (!currentBudget) {
          currentBudget = await createBudget(credentials, currentMonthLabel);
        }

        setBudget(currentBudget);

        const [txns, sum, plansData] = await Promise.all([
          getTransactions(credentials, currentBudget.id),
          getBudgetSummary(credentials, currentBudget.id),
          getPlans(credentials, currentBudget.id),
        ]);

        setTransactions([...txns].sort((a, b) => b.date.localeCompare(a.date)));
        setSummary(sum);
        setPlans(plansData);
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
            if (budget) {
              invalidateBudgetDetails(budget.id);
              invalidateBudgets();
            }
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

  // Plans handlers
  const handleSavePlan = async () => {
    if (!credentials || !budget || !planTitle.trim() || !planAmount) return;
    setSavingPlan(true);
    try {
      if (editingPlan) {
        await updatePlan(credentials, budget.id, editingPlan.id, {
          title: planTitle.trim(),
          amount: Number(planAmount),
          status: planStatus,
        });
      } else {
        await createPlan(credentials, budget.id, {
          title: planTitle.trim(),
          amount: Number(planAmount),
          status: planStatus,
        });
      }
      setPlanTitle('');
      setPlanAmount('');
      setPlanStatus('PENDING');
      setShowAddPlan(false);
      setEditingPlan(null);
      invalidatePlans(budget.id);
      const updated = await getPlans(credentials, budget.id);
      setPlans(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = (plan: ApiPlan) => {
    if (!credentials || !budget) return;
    Alert.alert('Delete Plan', `Delete "${plan.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(credentials, budget.id, plan.id);
            invalidatePlans(budget.id);
            const updated = await getPlans(credentials, budget.id);
            setPlans(updated);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete plan');
          }
        },
      },
    ]);
  };

  const handleTogglePlanStatus = async (plan: ApiPlan) => {
    if (!credentials || !budget) return;
    const newStatus: PlanStatus = (plan.status ?? 'PENDING') === 'DONE' ? 'PENDING' : 'DONE';
    setTogglingPlanId(plan.id);
    try {
      await updatePlan(credentials, budget.id, plan.id, {
        title: plan.title,
        amount: plan.amount,
        status: newStatus,
      });
      invalidatePlans(budget.id);
      const updated = await getPlans(credentials, budget.id);
      setPlans(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update plan status');
    } finally {
      setTogglingPlanId(null);
    }
  };

  const startEditPlan = (plan: ApiPlan) => {
    setEditingPlan(plan);
    setPlanTitle(plan.title);
    setPlanAmount(String(plan.amount));
    setPlanStatus(plan.status ?? 'PENDING');
    setShowAddPlan(true);
  };

  const cancelPlanForm = () => {
    setShowAddPlan(false);
    setEditingPlan(null);
    setPlanTitle('');
    setPlanAmount('');
    setPlanStatus('PENDING');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentMonthLabel}</Text>
        <View style={styles.headerRight}>
          {budget && (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction', { budgetId: budget.id })}
              style={styles.headerBtn}
            >
              <Text style={styles.headerAction}>+ Add</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Text style={styles.headerLogout}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Summary ── */}
      {summary && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => budget && navigation.navigate('Summary', { budgetId: budget.id, monthLabel: currentMonthLabel })}
          style={styles.summaryRow}
        >
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              ₹{(summary.total_income ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              ₹{(summary.total_expenses ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: (summary.net_balance ?? 0) >= 0 ? colors.income : colors.expense },
              ]}
            >
              ₹{Math.abs(summary.net_balance ?? 0).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>
            Plans
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : activeTab === 'transactions' ? (
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
              <Text style={styles.emptySub}>Tap "+ Add" to record your first one.</Text>
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
      ) : (
        /* ── Plans tab ── */
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.textMuted}
            />
          }
        >
          {/* Add / Edit plan form */}
          {showAddPlan ? (
            <View style={styles.planForm}>
              <TextInput
                style={styles.planInput}
                value={planTitle}
                onChangeText={setPlanTitle}
                placeholder="Plan title"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.planInput}
                value={planAmount}
                onChangeText={setPlanAmount}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              {/* Status toggle */}
              <View style={styles.planStatusRow}>
                <Text style={styles.planStatusLabel}>Status</Text>
                <View style={styles.planStatusToggle}>
                  <TouchableOpacity
                    style={[styles.planStatusBtn, planStatus === 'PENDING' && styles.planStatusBtnActive]}
                    onPress={() => setPlanStatus('PENDING')}
                  >
                    <Text style={[styles.planStatusBtnText, planStatus === 'PENDING' && { color: colors.investment }]}>
                      Pending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.planStatusBtn, planStatus === 'DONE' && styles.planStatusBtnDone]}
                    onPress={() => setPlanStatus('DONE')}
                  >
                    <Text style={[styles.planStatusBtnText, planStatus === 'DONE' && { color: colors.income }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.planFormBtns}>
                <TouchableOpacity
                  style={[styles.planFormBtn, styles.planFormBtnPrimary]}
                  onPress={handleSavePlan}
                  disabled={savingPlan}
                >
                  {savingPlan ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.planFormBtnPrimaryText}>
                      {editingPlan ? 'Update Plan' : 'Add Plan'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.planFormBtn} onPress={cancelPlanForm}>
                  <Text style={styles.planFormBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPlanBtn}
              onPress={() => { setShowAddPlan(true); setEditingPlan(null); }}
            >
              <Text style={styles.addPlanBtnText}>+ Add Plan</Text>
            </TouchableOpacity>
          )}

          {plans.length === 0 && !showAddPlan ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No plans yet.</Text>
              <Text style={styles.emptySub}>Add a budget goal above.</Text>
            </View>
          ) : (
            plans.map(plan => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onEdit={() => startEditPlan(plan)}
                onDelete={() => handleDeletePlan(plan)}
                onToggleStatus={() => handleTogglePlanStatus(plan)}
                togglingStatus={togglingPlanId === plan.id}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomTab}>
          <Text style={[styles.bottomTabText, styles.bottomTabActive]}>
            {MONTH_NAMES[now.getMonth()]}
          </Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigation.navigate('Archive')}
        >
          <Text style={styles.bottomTabText}>Archive</Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigation.navigate('Accounts')}
        >
          <Text style={styles.bottomTabText}>Accounts</Text>
        </TouchableOpacity>
        <View style={styles.tabSep} />
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigation.navigate('Tags')}
        >
          <Text style={styles.bottomTabText}>Tags</Text>
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
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBtn: { paddingVertical: 2 },
  headerAction: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  headerLogout: { fontSize: fontSize.md, color: colors.textMuted },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  summaryLabel: {
    fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  summaryValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },

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

  listContent: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },

  // Transaction row
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm,
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
  transferBadge: {
    backgroundColor: colors.investment + '22',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  transferBadgeText: { fontSize: 10, color: colors.investment, fontWeight: fontWeight.semibold },
  rowBody: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowType: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowDate: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  btnUpdate: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.card,
  },
  btnUpdateText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  btnDelete: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.card,
  },
  btnDeleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.expense },

  // Plans
  planRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCircle: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  statusCircleDone: { borderColor: colors.income, backgroundColor: colors.income + '22' },
  statusCirclePending: { borderColor: colors.investment, backgroundColor: colors.investment + '22' },
  statusCircleText: { fontSize: 14, fontWeight: fontWeight.bold },
  planInfo: { flex: 1 },
  planTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, marginBottom: 2 },
  planTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  planAmount: { fontSize: fontSize.sm, color: colors.textMuted },
  planStatusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planBadgeDone: { backgroundColor: colors.income + '22' },
  planBadgePending: { backgroundColor: colors.investment + '22' },
  planStatusText: { fontSize: 10, fontWeight: fontWeight.semibold, letterSpacing: 0.5 },
  planActions: { flexDirection: 'row', gap: spacing.sm },
  planBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.bg,
  },
  planBtnDanger: { borderColor: colors.expense + '55' },
  planBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textPrimary },

  planForm: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  planInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  planStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planStatusLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  planStatusToggle: { flexDirection: 'row', gap: spacing.xs },
  planStatusBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  planStatusBtnActive: { borderColor: colors.investment, backgroundColor: colors.investment + '22' },
  planStatusBtnDone: { borderColor: colors.income, backgroundColor: colors.income + '22' },
  planStatusBtnText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  planFormBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  planFormBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.bg,
    minHeight: 40, justifyContent: 'center',
  },
  planFormBtnPrimary: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  planFormBtnPrimaryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.surface },
  planFormBtnText: { fontSize: fontSize.sm, color: colors.textPrimary },

  addPlanBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.card,
  },
  addPlanBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },

  // Loading / Empty
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomTab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  bottomTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textMuted },
  bottomTabActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
});
