import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { RootStackParamList } from './src/types';
import { colors } from './src/theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import PinSetupScreen from './src/screens/PinSetupScreen';
import PinEntryScreen from './src/screens/PinEntryScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import BudgetDetailScreen from './src/screens/BudgetDetailScreen';
import TagsScreen from './src/screens/TagsScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import AccountDetailScreen from './src/screens/AccountDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigator() {
  const { authState, isLoading } = useAuth();

  if (isLoading || authState === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/* ── Unauthenticated ─────────────────────────────────────────────── */}
      {(authState === 'credentials') && (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
      {authState === 'register' && (
        <Stack.Screen name="Register" component={RegisterScreen} />
      )}
      {authState === 'forgot-password' && (
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      )}

      {/* ── PIN Flow ────────────────────────────────────────────────────── */}
      {authState === 'pin-setup' && (
        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      )}
      {authState === 'pin-entry' && (
        <Stack.Screen name="PinEntry" component={PinEntryScreen} />
      )}

      {/* ── Authenticated ───────────────────────────────────────────────── */}
      {authState === 'home' && (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
          <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
          <Stack.Screen name="Archive" component={ArchiveScreen} />
          <Stack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
          <Stack.Screen name="Tags" component={TagsScreen} />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <NavigationContainer>
            <Navigator />
          </NavigationContainer>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
