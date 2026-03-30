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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { createTag, deleteTag, updateTag } from '../api';
import { ApiTag, TagStatus } from '../types';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

export default function TagsScreen() {
  const navigation = useNavigation();
  const { credentials } = useAuth();
  const { tags, fetchTags, invalidateTags } = useData();

  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!credentials) return;
    fetchTags(credentials).catch(() => setError('Failed to load tags'));
  }, [credentials, fetchTags]);

  useEffect(() => {
    if (tags !== null) setLoading(false);
  }, [tags]);

  const handleCreate = async () => {
    if (!newTagName.trim() || !credentials) return;
    setCreating(true);
    try {
      // createTag now sends { name, status: 'PENDING' } automatically
      await createTag(credentials, newTagName.trim());
      setNewTagName('');
      invalidateTags();
      await fetchTags(credentials, true);
    } catch {
      setError('Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (tag: ApiTag) => {
    if (!credentials) return;
    const newStatus: TagStatus = (tag.status ?? 'PENDING') === 'DONE' ? 'PENDING' : 'DONE';
    setTogglingId(tag.id);
    try {
      await updateTag(credentials, tag.id, { status: newStatus });
      invalidateTags();
      await fetchTags(credentials, true);
    } catch {
      setError('Failed to update tag status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (tag: ApiTag) => {
    if (!credentials) return;
    Alert.alert('Delete Tag', `Delete "${tag.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTag(credentials, tag.id);
            invalidateTags();
            await fetchTags(credentials, true);
          } catch {
            setError('Failed to delete tag');
          }
        },
      },
    ]);
  };

  const renderTag = ({ item }: { item: ApiTag }) => {
    const status = item.status ?? 'PENDING';
    const isDone = status === 'DONE';
    const isToggling = togglingId === item.id;

    return (
      <View style={styles.tagRow}>
        {/* Status toggle */}
        <TouchableOpacity
          onPress={() => handleToggleStatus(item)}
          disabled={isToggling}
          style={[styles.statusBtn, isDone ? styles.statusBtnDone : styles.statusBtnPending]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={isDone ? colors.income : colors.investment} />
          ) : (
            <Text style={[styles.statusBtnText, isDone ? styles.statusTextDone : styles.statusTextPending]}>
              {isDone ? '✓' : '◷'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Tag name + badge */}
        <View style={styles.tagMeta}>
          <Text style={styles.tagName}>{item.name}</Text>
          <View style={[styles.statusBadge, isDone ? styles.badgeDone : styles.badgePending]}>
            <Text style={[styles.badgeText, isDone ? styles.badgeTextDone : styles.badgeTextPending]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tags</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* New tag input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="New tag name"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newTagName.trim() || creating) && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={!newTagName.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.addBtnText}>+ Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Tag list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : (
        <FlatList
          data={tags ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tags yet. Create one above.</Text>
          }
          renderItem={renderTag}
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

  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  addBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.surface },

  errorText: { margin: spacing.md, fontSize: fontSize.sm, color: '#F87171' },

  list: { padding: spacing.md, gap: spacing.sm },

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  // Status toggle button
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBtnDone: { borderColor: colors.income, backgroundColor: colors.income + '22' },
  statusBtnPending: { borderColor: colors.investment, backgroundColor: colors.investment + '22' },
  statusBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  statusTextDone: { color: colors.income },
  statusTextPending: { color: colors.investment },

  // Tag meta
  tagMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tagName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },

  // Status badge
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeDone: { backgroundColor: colors.income + '22' },
  badgePending: { backgroundColor: colors.investment + '22' },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5 },
  badgeTextDone: { color: colors.income },
  badgeTextPending: { color: colors.investment },

  deleteBtn: { fontSize: fontSize.sm, color: colors.textMuted },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm, paddingTop: 40 },
});
