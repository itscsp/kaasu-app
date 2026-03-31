import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api';
import { ApiAccount, AccountGroup, RootStackParamList } from '../types';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Accounts'>;

const ACCOUNT_GROUP_LABELS: Record<AccountGroup, string> = {
  Cash: 'Cash',
  Accounts: 'Bank / Accounts',
  Investment: 'Investment',
  Loan: 'Loan',
  Insurance: 'Insurance',
  Saving: 'Saving',
};

const ACCOUNT_GROUPS: AccountGroup[] = ['Cash', 'Accounts', 'Investment', 'Loan', 'Insurance', 'Saving'];

const GROUP_COLORS: Record<AccountGroup, string> = {
  Cash: '#34D399',
  Accounts: '#60A5FA',
  Investment: '#FBBF24',
  Loan: '#F87171',
  Insurance: '#A78BFA',
  Saving: '#2DD4BF',
};

function AccountRow({
  account,
  onDelete,
  onEdit,
  onPress,
}: {
  account: ApiAccount;
  onDelete: () => void;
  onEdit: () => void;
  onPress: () => void;
}) {
  const group = (account.group ?? account.type) as AccountGroup;
  const groupColor = GROUP_COLORS[group] ?? colors.textMuted;
  const groupLabel = ACCOUNT_GROUP_LABELS[group] ?? group;
  const balance = Number(account.balance ?? account.amount ?? 0);
  const balanceColor = balance >= 0 ? colors.income : colors.expense;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.row}>
      <View style={[styles.rowAccent, { backgroundColor: groupColor }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
          <Text style={[styles.accountBalance, { color: balanceColor }]}>
            ₹{Math.abs(balance).toLocaleString()}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={[styles.typeBadge, { backgroundColor: groupColor + '22', borderColor: groupColor + '44' }]}>
            <Text style={[styles.typeBadgeText, { color: groupColor }]}>{groupLabel}</Text>
          </View>
          {account.description ? (
            <Text style={styles.accountDesc} numberOfLines={1}>{account.description}</Text>
          ) : null}
          {account.is_connected && (
            <View style={styles.linkedBadge}>
              <Text style={styles.linkedBadgeText}>
                🔗 {account.transaction_count} txn{account.transaction_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.editBtn}>
          <Text style={styles.editBtnText}>✏</Text>
        </TouchableOpacity>
        {account.is_connected ? (
          <View style={styles.deleteDisabled}>
            <Text style={styles.deleteDisabledText}>🔒</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AccountsScreen() {
  const navigation = useNavigation<Nav>();
  const { credentials } = useAuth();

  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState<AccountGroup>('Accounts');
  const [formBalance, setFormBalance] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!credentials) return;
    if (!isRefresh) setLoading(true);
    try {
      const data = await getAccounts(credentials);
      setAccounts(data);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [credentials]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (account: ApiAccount) => {
    if (!credentials) return;
    Alert.alert('Delete Account', `Delete "${account.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(credentials, account.id);
            load();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete account');
          }
        },
      },
    ]);
  };

  const startEdit = (account: ApiAccount) => {
    setEditingId(account.id);
    setFormName(account.name);
    setFormGroup((account.group ?? account.type) as AccountGroup);
    setFormBalance(String(account.balance ?? account.amount ?? 0));
    setFormDescription(account.description ?? '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !credentials) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateAccount(credentials, editingId, {
          name: formName.trim(),
          group: formGroup,
          amount: formBalance ? Number(formBalance) : 0,
          description: formDescription.trim() || undefined,
        });
      } else {
        await createAccount(credentials, {
          name: formName.trim(),
          group: formGroup,
          amount: formBalance ? Number(formBalance) : 0,
          description: formDescription.trim() || undefined,
        });
      }
      cancelForm();
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormBalance('');
    setFormDescription('');
    setFormGroup('Accounts');
  };

  // Group accounts by group field
  const grouped = accounts.reduce((acc, a) => {
    const key = (a.group ?? a.type) as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, ApiAccount[]>);

  const groupedSections = Object.entries(grouped);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity onPress={() => { cancelForm(); setShowForm(v => !v); }}>
          <Text style={styles.headerAdd}>{showForm ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading accounts…</Text>
        </View>
      ) : (
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
          {/* ── Add / Edit Form ── */}
          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{editingId ? 'Edit Account' : 'New Account'}</Text>
              <TextInput
                style={styles.formInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Account name (e.g. HDFC Bank)"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
              <TextInput
                style={styles.formInput}
                value={formBalance}
                onChangeText={setFormBalance}
                placeholder="Opening balance (optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.formInput}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.formLabel}>Group</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupPicker}
              >
                {ACCOUNT_GROUPS.map(g => {
                  const selected = formGroup === g;
                  const gc = GROUP_COLORS[g];
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setFormGroup(g)}
                      style={[
                        styles.groupChip,
                        selected
                          ? { backgroundColor: gc + '33', borderColor: gc }
                          : { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.groupChipText, { color: selected ? gc : colors.textMuted }]}>
                        {ACCOUNT_GROUP_LABELS[g]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.formBtns}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnPrimary, !formName.trim() && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!formName.trim() || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.formBtnPrimaryText}>{editingId ? 'Save Changes' : 'Create Account'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.formBtn} onPress={cancelForm}>
                  <Text style={styles.formBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Grouped Accounts ── */}
          {groupedSections.length === 0 && !showForm ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No accounts yet.</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to create one.</Text>
            </View>
          ) : (
            groupedSections.map(([group, accs]) => (
              <View key={group} style={styles.groupSection}>
                <Text style={styles.groupSectionLabel}>{ACCOUNT_GROUP_LABELS[group as AccountGroup] ?? group}</Text>
                {accs.map(item => (
                  <AccountRow
                    key={item.id}
                    account={item}
                    onDelete={() => handleDelete(item)}
                    onEdit={() => startEdit(item)}
                    onPress={() =>
                      navigation.navigate('AccountDetail', {
                        accountId: item.id,
                        accountName: item.name,
                      })
                    }
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
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
  headerAdd: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, minWidth: 40, textAlign: 'right' },

  errorText: { margin: spacing.md, fontSize: fontSize.sm, color: '#F87171' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  listContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },

  // Account row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowAccent: { width: 4, alignSelf: 'stretch' },
  rowContent: { flex: 1, padding: spacing.md, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  accountBalance: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  accountDesc: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  typeBadge: {
    borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.4 },
  linkedBadge: {
    backgroundColor: colors.savings + '22',
    borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  linkedBadgeText: { fontSize: fontSize.xs, color: colors.savings, fontWeight: fontWeight.medium },
  rowActions: { flexDirection: 'column', gap: 4, paddingRight: spacing.sm },
  editBtn: { padding: spacing.xs },
  editBtnText: { fontSize: 14, color: colors.textMuted },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: { fontSize: fontSize.md, color: colors.textMuted },
  deleteDisabled: { padding: spacing.xs },
  deleteDisabledText: { fontSize: fontSize.md, opacity: 0.4 },

  // Group sections
  groupSection: { gap: spacing.xs },
  groupSectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing.xs,
  },

  // Form
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  formTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  formInput: {
    backgroundColor: colors.bg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  formLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupPicker: { gap: spacing.sm, paddingVertical: spacing.xs },
  groupChip: {
    borderRadius: radius.full, borderWidth: 1.5,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  groupChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  formBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  formBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.bg,
    minHeight: 42, justifyContent: 'center',
  },
  formBtnPrimary: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  formBtnPrimaryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.surface },
  formBtnText: { fontSize: fontSize.sm, color: colors.textPrimary },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted },
});
