import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { getAccounts, createAccount, deleteAccount } from '../api';
import { ApiAccount, AccountType, RootStackParamList } from '../types';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Accounts'>;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank',
  cash: 'Cash',
  loan: 'Loan',
  investment: 'Investment',
  other: 'Other',
};

const ACCOUNT_TYPES: AccountType[] = ['bank', 'cash', 'loan', 'investment', 'other'];

const TYPE_COLORS: Record<AccountType, string> = {
  bank: '#60A5FA',
  cash: '#34D399',
  loan: '#F87171',
  investment: '#FBBF24',
  other: '#A78BFA',
};

function AccountRow({
  account,
  onDelete,
  onPress,
}: {
  account: ApiAccount;
  onDelete: () => void;
  onPress: () => void;
}) {
  const typeColor = TYPE_COLORS[account.type] ?? colors.textMuted;
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const balanceColor = account.balance >= 0 ? colors.income : colors.expense;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.row}>
      {/* Left accent bar */}
      <View style={[styles.rowAccent, { backgroundColor: typeColor }]} />

      <View style={styles.rowContent}>
        {/* Top row: name + balance */}
        <View style={styles.rowTop}>
          <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
          <Text style={[styles.accountBalance, { color: balanceColor }]}>
            ₹{Math.abs(account.balance).toLocaleString()}
          </Text>
        </View>

        {/* Bottom row: type badge + linked badge */}
        <View style={styles.rowBottom}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '44' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>

          {account.is_connected && (
            <View style={styles.linkedBadge}>
              <Text style={styles.linkedBadgeText}>
                🔗 Linked to {account.transaction_count} txn{account.transaction_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Delete button — disabled if connected */}
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

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('bank');
  const [formBalance, setFormBalance] = useState('');
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

  const handleCreate = async () => {
    if (!formName.trim() || !credentials) return;
    setSaving(true);
    try {
      await createAccount(credentials, {
        name: formName.trim(),
        type: formType,
        balance: formBalance ? Number(formBalance) : 0,
      });
      setFormName('');
      setFormBalance('');
      setFormType('bank');
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setFormName('');
    setFormBalance('');
    setFormType('bank');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity onPress={() => setShowForm(v => !v)}>
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
        <FlatList
          data={accounts}
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
          ListHeaderComponent={
            showForm ? (
              <View style={styles.form}>
                <Text style={styles.formTitle}>New Account</Text>
                <TextInput
                  style={styles.formInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Account name"
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
                {/* Type picker */}
                <Text style={styles.formLabel}>Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typePicker}
                >
                  {ACCOUNT_TYPES.map(t => {
                    const selected = formType === t;
                    const tc = TYPE_COLORS[t];
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setFormType(t)}
                        style={[
                          styles.typeChip,
                          selected
                            ? { backgroundColor: tc + '33', borderColor: tc }
                            : { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.typeChipText, { color: selected ? tc : colors.textMuted }]}>
                          {ACCOUNT_TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.formBtnPrimary, !formName.trim() && { opacity: 0.5 }]}
                    onPress={handleCreate}
                    disabled={!formName.trim() || saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.formBtnPrimaryText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.formBtn} onPress={cancelForm}>
                    <Text style={styles.formBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !showForm ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No accounts yet.</Text>
                <Text style={styles.emptySub}>Tap "+ Add" to create one.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <AccountRow
              account={item}
              onDelete={() => handleDelete(item)}
              onPress={() =>
                navigation.navigate('AccountDetail', {
                  accountId: item.id,
                  accountName: item.name,
                })
              }
            />
          )}
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
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },

  typeBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.4 },

  linkedBadge: {
    backgroundColor: colors.savings + '22',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  linkedBadgeText: { fontSize: fontSize.xs, color: colors.savings, fontWeight: fontWeight.medium },

  deleteBtn: { padding: spacing.md },
  deleteBtnText: { fontSize: fontSize.md, color: colors.textMuted },
  deleteDisabled: { padding: spacing.md },
  deleteDisabledText: { fontSize: fontSize.md, opacity: 0.4 },

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
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  formLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  typePicker: { gap: spacing.sm, paddingVertical: spacing.xs },
  typeChip: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
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
