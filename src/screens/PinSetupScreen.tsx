import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinSetupScreen() {
  const { handlePinSetupComplete, pendingCreds } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPin = step === 'enter' ? pin : confirmPin;

  function handleDigit(digit: string) {
    setError('');
    if (step === 'enter') {
      if (pin.length >= 4) return;
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => setStep('confirm'), 180);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        setTimeout(() => handleConfirm(next), 180);
      }
    }
  }

  function handleBackspace() {
    setError('');
    if (step === 'enter') setPin(p => p.slice(0, -1));
    else setConfirmPin(p => p.slice(0, -1));
  }

  async function handleConfirm(confirmedPin: string) {
    if (pin !== confirmedPin) {
      setError("PINs don't match. Try again.");
      setConfirmPin('');
      setStep('enter');
      setPin('');
      return;
    }
    setLoading(true);
    await handlePinSetupComplete(pin);
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>₹</Text>
          <Text style={styles.heroTitle}>Kaasu</Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {step === 'enter' ? 'Set Your PIN' : 'Confirm PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'enter'
              ? 'Choose a 4-digit PIN to unlock the app'
              : 'Re-enter your PIN to confirm'}
          </Text>
        </View>

        {/* PIN dots */}
        <View style={styles.dots}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[styles.dot, i < currentPin.length && styles.dotFilled]}
            />
          ))}
        </View>

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
});
