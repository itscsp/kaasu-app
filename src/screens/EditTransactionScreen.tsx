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
import { updateApiTransaction } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditTransaction'>;
type RouteProps = RouteProp<RootStackParamList, 'EditTransaction'>;

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'loan', label: 'Loan' },
];

export default function EditTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { budgetId, transaction } = route.params;
  const { credentials } = useAuth();
  const { tags, fetchTags } = useData();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [title, setTitle] = useState(transaction.title ?? '');
  const [description, setDescription] = useState(transaction.description ?? '');
  const [date, setDate] = useState(transaction.date);
  const [selectedTags, setSelectedTags] = useState<number[]>(transaction.tags ?? []);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (credentials) {
      fetchTags(credentials).catch(() => {});
    }
  }, [credentials, fetchTags]);

  const toggleTag = (id: number) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleUpdate = async () => {
    if (!credentials) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }
    setLoading(true);
    try {
      await updateApiTransaction(credentials, budgetId, transaction.id, {
        date,
        amount: Number(amount),
        type,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update transaction');
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
        <Text style={styles.headerTitle}>Edit Transaction</Text>
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
        <View style={styles.descWrap}>
          <Text style={styles.descLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Some description about the transaction"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Date ── */}
        <TextInput
          style={styles.inputField}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          returnKeyType="done"
        />

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

        {/* ── Update Button ── */}
        <TouchableOpacity
          style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.updateBtnText}>Update Transaction</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBack: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, minWidth: 40 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },

  content: { padding: spacing.md, gap: spacing.sm },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
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

  descWrap: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  descLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs, paddingTop: spacing.xs },
  textArea: { fontSize: fontSize.md, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },

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

  updateBtn: {
    backgroundColor: colors.textPrimary, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
    marginTop: spacing.sm, minHeight: 48, justifyContent: 'center',
  },
  updateBtnDisabled: { opacity: 0.6 },
  updateBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.surface },
});
