import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { encodeCredentials, verifyCredentials } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

export default function LoginScreen() {
  const { handleCredentialLogin, goToRegister, goToForgotPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and application password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cleanPassword = password.replace(/\s/g, '');
      const encoded = encodeCredentials(username.trim(), cleanPassword);
      const valid = await verifyCredentials(encoded);
      if (valid) {
        await handleCredentialLogin(encoded);
      } else {
        setError(
          'Invalid credentials. Make sure you are using a WordPress Application Password, not your login password.'
        );
      }
    } catch (e: any) {
      setError(
        e?.message?.includes('Network')
          ? 'Could not reach the server. Make sure you are on the same network.'
          : e?.message ?? 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo / Title ── */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>₹</Text>
            <Text style={styles.heroTitle}>Kaasu</Text>
            <Text style={styles.heroSub}>Budget Tracker</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect to WordPress</Text>
            <Text style={styles.cardDesc}>
              Enter your WordPress username and an Application Password
              (generated in Users → Profile → Application Passwords).
            </Text>

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="your-wp-username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>Application Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
              returnKeyType="done"
              onSubmitEditing={handleConnect}
            />

            {/* Hint */}
            <View style={styles.hint}>
              <Text style={styles.hintText}>💡 Get these credentials from your email</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.connectBtnText}>Connect</Text>
              )}
            </TouchableOpacity>

            {/* Links to Register / Forgot */}
            <View style={styles.linksRow}>
              <TouchableOpacity onPress={goToRegister}>
                <Text style={styles.linkText}>New user? Create an account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToForgotPassword}>
                <Text style={styles.linkText}>Forgot App Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Help Card ── */}
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Where is the Application Password?</Text>
            <Text style={styles.helpText}>
              {'1. Log into your WordPress dashboard\n'}
              {'2. Go to Users → Your Profile\n'}
              {'3. Scroll to "Application Passwords"\n'}
              {'4. Create a new password named "Kaasu"\n'}
              {'5. Copy and paste it above'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, paddingTop: spacing.xl },

  hero: { alignItems: 'center', marginBottom: spacing.xl },
  heroIcon: { fontSize: 48, color: colors.textPrimary, marginBottom: spacing.sm },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, letterSpacing: 1 },
  heroSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  cardDesc: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },

  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  hint: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.sm,
  },
  hintText: { fontSize: fontSize.xs, color: colors.textMuted },

  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: '#F87171',
    lineHeight: 20,
  },

  connectBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.surface },

  linksRow: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  linkText: { fontSize: fontSize.sm, color: colors.textMuted },

  helpCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  helpTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.sm },
  helpText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 22 },
});
