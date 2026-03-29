import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { decryptCredentials } from '../lib/auth';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinEntryScreen() {
  const { handlePinSuccess, handleForgotPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleSubmit(enteredPin: string) {
    setLoading(true);
    const encoded = await decryptCredentials(enteredPin);
    setLoading(false);
    if (encoded) {
      handlePinSuccess(encoded);
    } else {
      setError('Incorrect PIN. Try again.');
      shake();
      setPin('');
    }
  }

  function handleDigit(digit: string) {
    if (pin.length >= 4 || loading) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => handleSubmit(next), 120);
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>₹</Text>
          <Text style={styles.heroTitle}>Kaasu</Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Enter PIN</Text>
          <Text style={styles.subtitle}>Use your PIN to unlock the app</Text>
        </View>

        {/* PIN dots with shake */}
        <Animated.View
          style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}
        >
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Keypad */}
        <View style={styles.keypad}>
          {KEYS.map((key, idx) => {
            if (key === '') return <View key={idx} />;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.key}
                onPress={() => key === '⌫' ? handleBackspace() : handleDigit(key)}
                disabled={loading}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, key === '⌫' && styles.keyBackText]}>
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && (
          <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.md }} />
        )}

        {/* Forgot PIN */}
        <TouchableOpacity onPress={handleForgotPin} style={{ marginTop: spacing.sm }}>
          <Text style={styles.forgotText}>
            Forgot / Reset PIN? Login with credentials
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },

  hero: { alignItems: 'center' },
  heroIcon: { fontSize: 36, color: colors.textPrimary, marginBottom: 2 },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },

  titleBlock: { alignItems: 'center' },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  dots: { flexDirection: 'row', gap: 20 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderFocus,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },

  error: { fontSize: fontSize.sm, color: '#F87171', textAlign: 'center' },

  keypad: {
    width: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  key: {
    width: (280 - 24) / 3,
    height: 64,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  keyBackText: { fontSize: fontSize.lg, color: colors.textMuted },

  forgotText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
