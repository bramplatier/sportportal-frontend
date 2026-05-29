import React, { createContext, useContext, useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { authApi } from '../services/apiClient';
import { normalizeRole } from '../utils/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const data = await authApi.me();
      if (data && data.user) {
        setUser({ ...data.user, role: normalizeRole(data.user.role) });
      } else if (data && data.email) {
        setUser({ ...data, role: normalizeRole(data.role) });
      } else {
        setUser(data);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const loginWithGoogle = async () => {
    try {
      window.location.assign('/api/auth/google/start?redirect=true');
    } catch (err) {
      console.error('Google login start failed', err);
    }
  };

  const loginWithPasskey = async (email) => {
    try {
      const options = await authApi.getPasskeyLoginOptions({ email });
      const authResponse = await startAuthentication({ optionsJSON: options });
      await authApi.verifyPasskeyLogin({ email, body: authResponse });
      await fetchUser();
      return true;
    } catch (err) {
      console.error('Passkey login failed', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, loginWithGoogle, loginWithPasskey, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
