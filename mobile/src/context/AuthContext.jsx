import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on app launch ───────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    // Backend responds: { success: true, data: { token, user } }
    const { token: newToken, user: newUser } = res.data.data;

    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      // ignore logout API errors — clear local state regardless
    } finally {
      await AsyncStorage.multiRemove(['token', 'user']);
      setToken(null);
      setUser(null);
    }
  };

  // ── Refresh user from server ─────────────────────────────────────────────────
  const refreshUser = async () => {
    try {
      const res = await authAPI.getProfile();
      const updated = res.data.user ?? res.data;
      setUser(updated);
      await AsyncStorage.setItem('user', JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
