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
import { createTag, deleteTag } from '../api';
import { ApiTag } from '../types';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

export default function TagsScreen() {
  const navigation = useNavigation();
  const { credentials } = useAuth();
  const { tags, fetchTags, invalidateTags } = useData();

  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
          renderItem={({ item }) => (
            <View style={styles.tagRow}>
              <Text style={styles.tagName}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
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

  errorText: {
    margin: spacing.md,
    fontSize: fontSize.sm,
    color: '#F87171',
  },

  list: { padding: spacing.md, gap: spacing.sm },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tagName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  deleteBtn: { fontSize: fontSize.sm, color: colors.textMuted },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm, paddingTop: 40 },
});
