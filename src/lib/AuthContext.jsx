import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getUserProfile } from '@/lib/userProfile';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState(null);

  const loadProfile = async (supaUser) => {
    if (!supaUser) { setUserProfile(null); return; }
    try {
      const profile = await getUserProfile(supaUser.id);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsLoadingAuth(true);
        setUser(session.user);
        setIsAuthenticated(true);
        await loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUserProfile = async () => {
    if (user) await loadProfile(user);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setUserProfile(null);
    window.location.href = '/';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      await loadProfile(session.user);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setUserProfile(null);
    }
    setAuthChecked(true);
  };

  const checkAppState = checkUserAuth;

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      refreshUserProfile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};