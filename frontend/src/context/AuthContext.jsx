import { createContext, useCallback, useMemo, useState } from "react";

import authService from "@/services/authService";
import { clearAuthSession, getAuthToken, getAuthUser, saveAuthSession } from "@/utils/storage";

export const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => getAuthUser());
  const [isReady] = useState(true);

  const persistSession = useCallback((payload) => {
    const session = {
      accessToken: payload.access_token,
      user: payload.user,
    };

    saveAuthSession(session);
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    persistSession(data);
    return data;
  }, [persistSession]);

  const register = useCallback(async (details) => {
    const data = await authService.register(details);
    persistSession(data);
    return data;
  }, [persistSession]);

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isReady,
      isAuthenticated: Boolean(token && user),
      tokenPreview: token ? `${token.slice(0, 20)}...` : "No active token",
      login,
      register,
      logout,
    }),
    [isReady, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
