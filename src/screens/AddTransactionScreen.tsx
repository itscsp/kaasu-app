import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TransactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { addApiTransaction } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
type RouteProps = RouteProp<RootStackParamList, 'AddTransaction'>;

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'loan', label: 'Loan' },
];

export default function AddTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { budgetId } = route.params;
  const { credentials } = useAuth();
  const { tags, fetchTags, accounts, fetchAccounts } = useData();

  const [type, setType] = useState<TransactionType>('expenses');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (credentials) {
      fetchTags(credentials).catch(() => {});
      fetchAccounts(credentials).catch(() => {});
    }
  }, [credentials, fetchTags, fetchAccounts]);

  const toggleTag = (id: number) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAdd = async () => {
    if (!credentials) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }
    setLoading(true);
    try {
      await addApiTransaction(credentials, budgetId, {
        date,
        amount: Number(amount),
        type,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        account_id: accountId || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Type Dropdown ── */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowTypeMenu(m => !m)}
        >
          <Text style={styles.dropdownText}>{selectedLabel}</Text>
          <Text style={styles.dropdownChevron}>{showTypeMenu ? '∧' : '∨'}</Text>
        </TouchableOpacity>
        {showTypeMenu && (
          <View style={styles.dropdownMenu}>
            {TYPES.map((t, i) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.dropdownItem,
                  i < TYPES.length - 1 && styles.dropdownItemBorder,
                  type === t.value && styles.dropdownItemActive,
                ]}
                onPress={() => { setType(t.value); setShowTypeMenu(false); }}
              >
                <Text style={[styles.dropdownItemText, type === t.value && styles.dropdownItemTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Title ── */}
        <TextInput
          style={styles.inputField}
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textMuted}
          returnKeyType="next"
        />

        {/* ── Amount ── */}
        <TextInput
          style={styles.inputField}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* ── Description ── */}
        <TextInput
          style={[styles.inputField, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ── Date ── */}
        <TextInput
          style={styles.inputField}
          value={date}
          onChangeText={setDate}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          returnKeyType="done"
        />

        {/* ── Accounts ── */}
        {accounts && accounts.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Account</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsList}
            >
              {accounts.map(acc => {
                const selected = accountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                    onPress={() => setAccountId(selected ? null : acc.id)}
                  >
                    <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Tags ── */}
        {tags && tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Tags</Text>
            <View style={styles.tagsList}>
              {tags.map(tag => {
                const selected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                      {selected ? '✓ ' : ''}{tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Add Button ── */}
        <TouchableOpacity
          style={[styles.addBtn, loading && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.addBtnText}>Add Transaction</Text>
          )}
        </TouchableOpacity>
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

  content: { padding: spacing.md, gap: spacing.sm },

  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dropdownText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.medium },
  dropdownChevron: { fontSize: 13, color: colors.textMuted },
  dropdownMenu: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.bg },
  dropdownItemText: { fontSize: fontSize.md, color: colors.textSecondary },
  dropdownItemTextActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },

  inputField: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  tagsSection: { gap: spacing.xs },
  tagsLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tagChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tagChipSelected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  tagChipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  tagChipTextSelected: { color: colors.surface, fontWeight: fontWeight.medium },

  addBtn: {
    backgroundColor: colors.textPrimary, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
    marginTop: spacing.sm, minHeight: 48, justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.surface },
});
