import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TransactionType } from '../types';
import { addTransaction } from '../storage';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;

const TYPES: TransactionType[] = ['Expenses', 'Income', 'Savings', 'Investment'];

export default function AddTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const [type, setType] = useState<TransactionType>('Expenses');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const handleAdd = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }
    await addTransaction({
      id: Date.now().toString(),
      type,
      amount: Number(amount),
      description: description.trim(),
      date,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Nav Header ── */}
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
          <Text style={styles.dropdownText}>{type}</Text>
          <Text style={styles.dropdownChevron}>{showTypeMenu ? '∧' : '∨'}</Text>
        </TouchableOpacity>

        {showTypeMenu && (
          <View style={styles.dropdownMenu}>
            {TYPES.map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.dropdownItem,
                  i < TYPES.length - 1 && styles.dropdownItemBorder,
                  type === t && styles.dropdownItemActive,
                ]}
                onPress={() => { setType(t); setShowTypeMenu(false); }}
              >
                <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
          placeholder="Description"
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
          placeholder="Date  (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          returnKeyType="done"
        />

        {/* ── Add Button ── */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>Add</Text>
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
  headerBack: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  dropdownChevron: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.bg,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },

  // Inputs
  inputField: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Add Button
  addBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
