import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Transaction } from '../types';
import {
  getCurrentTransactions,
  deleteTransaction,
  archiveCurrentMonth,
} from '../storage';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Transaction Row ─────────────────────────────────────────────────────────
function TransactionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(item.date);
  const day = date.getDate();
  const sign = item.type === 'Income' ? '+' : '-';
  const amtColor = item.type === 'Income' ? colors.income : colors.expense;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(e => !e)}
      style={styles.row}
    >
      {/* Collapsed Header */}
      <View style={styles.rowHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
        <Text style={[styles.rowAmount, { color: amtColor }]}>
          {sign} {item.amount.toLocaleString()}
        </Text>
        <Text style={styles.chevron}>{expanded ? '∧' : '∨'}</Text>
      </View>

      {/* Expanded Body */}
      {expanded && (
        <View style={styles.rowBody}>
          {item.description ? (
            <Text style={styles.rowDesc}>{item.description}</Text>
          ) : null}
          {item.group ? (
            <Text style={styles.rowGroup}>Group: {item.group}</Text>
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

// ─── Home Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');

  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const load = useCallback(async () => {
    const data = await getCurrentTransactions();
    setTransactions(data);
  }, []);

  useFocusEffect(load);

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await deleteTransaction(id); load(); },
      },
    ]);
  };

  const handleArchive = () => {
    Alert.alert('Archive', `Move ${monthLabel} to archive?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: async () => { await archiveCurrentMonth(monthLabel, monthKey); load(); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')}>
          <Text style={styles.headerAction}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions this month.</Text>
            <Text style={styles.emptySub}>Tap "Add" to record your first one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionRow
            item={item}
            onEdit={() => navigation.navigate('EditTransaction', { transaction: item })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

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

  // Header
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
  headerAction: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  // List
  listContent: {
    padding: spacing.md,
    paddingBottom: 80,
    gap: spacing.sm,
  },

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
  rowAmount: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Expanded
  rowBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  rowDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
    lineHeight: 20,
  },
  rowGroup: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rowType: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnUpdate: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  btnUpdateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  btnDelete: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  btnDeleteText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.expense,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

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
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  tabSep: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
