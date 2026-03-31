import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';

// Logo — save the logo image as assets/logo.png
let logoSource: any;
try { logoSource = require('../../assets/logo.png'); } catch { logoSource = null; }
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { encodeCredentials, verifyCredentials } from '../api';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

// Required for the OAuth redirect to complete inside Expo Go
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID: string =
  Constants.expoConfig?.extra?.googleWebClientId ?? '';

export default function LoginScreen() {
  const {
    handleCredentialLogin,
    handleGoogleLogin,
    goToRegister,
    goToForgotPassword,
    googleLoading,
    googleError,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        // Fallback: use access token to fetch userinfo if idToken absent
        setError('Google sign-in did not return an ID token. Please try again.');
      }
    } else if (response?.type === 'error') {
      setError('Google sign-in failed. Please try again.');
    }
  }, [response]);

  // ── Manual (WordPress App Password) ──────────────────────────────────────
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
          ? 'Could not reach the server. Make sure you are on the internet.'
          : e?.message ?? 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const anyError = error || googleError;

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
          {/* ── Logo ── */}
          <View style={styles.hero}>
            {logoSource ? (
              <Image
                source={logoSource}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <>
                <Text style={styles.heroIcon}>₹</Text>
                <Text style={styles.heroTitle}>Kaasu</Text>
              </>
            )}
            <Text style={styles.heroSub}>Budget Tracker</Text>
          </View>

          {/* ── Google Sign-In Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome</Text>
            <Text style={styles.cardDesc}>
              Sign in with your Google account to access your budget tracker.
            </Text>

            {anyError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{anyError}</Text>
              </View>
            ) : null}

            {/* Google Button */}
            <TouchableOpacity
              style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
              onPress={() => {
                setError('');
                promptAsync();
              }}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.bg} size="small" />
              ) : (
                <>
                  <View style={styles.googleIconWrap}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Toggle manual form */}
            <TouchableOpacity
              style={styles.toggleManualBtn}
              onPress={() => { setShowManual(v => !v); setError(''); }}
            >
              <Text style={styles.toggleManualText}>
                {showManual ? 'Hide App Password form' : 'Use WordPress App Password instead'}
              </Text>
            </TouchableOpacity>

            {/* ── Manual Form ── */}
            {showManual && (
              <View style={styles.manualForm}>
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

                <View style={[styles.hint, { marginTop: spacing.md }]}>
                  <Text style={styles.hintText}>💡 Get these credentials from your welcome email</Text>
                </View>

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

                <View style={styles.linksRow}>
                  <TouchableOpacity onPress={goToRegister}>
                    <Text style={styles.linkText}>New user? Create an account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goToForgotPassword}>
                    <Text style={styles.linkText}>Forgot App Password?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Help Card ── */}
          {showManual && (
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
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xl },

  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logoImage: {
    width: 200,
    height: 80,
    marginBottom: spacing.sm,
    tintColor: colors.textPrimary,
  },
  heroIcon: { fontSize: 52, color: colors.textPrimary, marginBottom: spacing.sm },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  heroSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },

  errorBox: {
    backgroundColor: '#F871711A',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#F8717144',
    padding: spacing.sm,
  },
  errorText: { fontSize: fontSize.sm, color: '#F87171', lineHeight: 18 },

  // ── Google button ──
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    marginTop: spacing.sm,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  googleBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#1F1F1F',
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: fontSize.xs, color: colors.textMuted },

  // ── Toggle manual ──
  toggleManualBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  toggleManualText: { fontSize: fontSize.sm, color: colors.textMuted },

  // ── Manual form ──
  manualForm: { gap: spacing.xs, marginTop: spacing.xs },
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.sm,
  },
  hintText: { fontSize: fontSize.xs, color: colors.textMuted },
  connectBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  linksRow: { marginTop: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  linkText: { fontSize: fontSize.sm, color: colors.textMuted },

  // ── Help card ──
  helpCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  helpTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  helpText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 22 },
});
