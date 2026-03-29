/**
 * auth.ts — PIN-based credential security for Kaasu (React Native)
 *
 * Strategy:
 *   - Credentials (username + app password) are stored in expo-secure-store,
 *     which uses OS-level hardware-backed encryption (Keychain on iOS, Keystore on Android).
 *   - A 4-digit PIN is used as a user-facing gate. The PIN itself is hashed
 *     (SHA-256 via expo-crypto) and also stored securely.
 *   - On PIN entry, we compare hashes. If correct, we retrieve the credentials.
 *   - This is simpler and more appropriate for mobile than AES-GCM PBKDF2, since
 *     expo-secure-store already provides hardware encryption at the storage layer.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const CREDS_KEY = 'kaasu_credentials';
const PIN_HASH_KEY = 'kaasu_pin_hash';

// ─── Credential helpers ───────────────────────────────────────────────────────

/** Saves base64-encoded "username:password" credentials securely. */
export async function saveCredentials(encoded: string): Promise<void> {
  await SecureStore.setItemAsync(CREDS_KEY, encoded);
}

/** Returns stored credentials (base64 string) or null. */
export async function loadCredentials(): Promise<string | null> {
  return SecureStore.getItemAsync(CREDS_KEY);
}

/** Removes stored credentials. */
export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDS_KEY);
}

// ─── PIN helpers ──────────────────────────────────────────────────────────────

/** Returns true if a PIN hash is stored (PIN was previously set). */
export async function hasPinSetup(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!hash;
}

/** Hash a PIN string using SHA-256. */
async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

/**
 * Encrypts (stores) credentials secured by a PIN.
 * Stores the PIN as a SHA-256 hash in SecureStore.
 * The credentials themselves are stored separately in SecureStore (OS-encrypted).
 */
export async function encryptCredentials(
  pin: string,
  encoded: string
): Promise<void> {
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(CREDS_KEY, encoded);
}

/**
 * Verifies a PIN and, if correct, returns the stored credentials.
 * Returns `null` if PIN is wrong or no credentials stored.
 */
export async function decryptCredentials(pin: string): Promise<string | null> {
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!storedHash) return null;

  const enteredHash = await hashPin(pin);
  if (enteredHash !== storedHash) return null;

  return SecureStore.getItemAsync(CREDS_KEY);
}

/** Removes the PIN hash (e.g. when user wants to reset PIN). */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
}

/** Clears everything (full logout). */
export async function clearAll(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDS_KEY);
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
}
