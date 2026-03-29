import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

export default function RegisterScreen() {
  const { goToLogin } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await registerUser('', { name: name.trim(), phone: phone.trim(), email: email.trim() });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed. Please try again.');
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
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>₹</Text>
            <Text style={styles.heroTitle}>Kaasu</Text>
            <Text style={styles.heroSub}>Create Account</Text>
          </View>

          {success ? (
            /* ── Success state ── */
            <View style={styles.card}>
              <Text style={styles.successTitle}>Registration Successful!</Text>
              <Text style={styles.successText}>
                {"We've sent a magic link to your email.\n\n"}
                {"1. Click the link in your email to set a password.\n"}
                {"2. After setting it, you will receive a second email with your App Password."}
              </Text>
              <TouchableOpacity style={styles.btn} onPress={goToLogin}>
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form ── */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New User Registration</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Jane Doe"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="10–15 digits"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="jane@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.btnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={goToLogin} style={styles.linkWrap}>
                <Text style={styles.linkText}>Already have an account? Log in</Text>
              </TouchableOpacity>
            </View>
          )}
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
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  heroSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },

  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: '#F87171',
    lineHeight: 20,
  },

  btn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },

  linkWrap: { alignItems: 'center', marginTop: spacing.md },
  linkText: { fontSize: fontSize.sm, color: colors.textMuted },

  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
});
