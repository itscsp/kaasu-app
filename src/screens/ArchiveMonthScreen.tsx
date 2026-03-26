import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Transaction } from '../types';
import { getArchivedMonth } from '../storage';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ArchiveMonth'>;
type RouteProps = RouteProp<RootStackParamList, 'ArchiveMonth'>;

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function TransactionRow({ item }: { item: Transaction }) {
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
      <View style={styles.rowHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
        <Text style={[styles.rowAmount, { color: amtColor }]}>
          {sign} {item.amount.toLocaleString()}
        </Text>
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

export default function ArchiveMonthScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { monthKey, monthLabel } = route.params;
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getArchivedMonth(monthKey).then(data => {
      if (data) setTransactions(data.transactions);
    });
  }, [monthKey]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monthLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── List ── */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <TransactionRow item={item} />}
      />
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

  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },

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
  },
  chevron: {
    fontSize: 13,
    color: colors.textMuted,
  },
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
  rowDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
