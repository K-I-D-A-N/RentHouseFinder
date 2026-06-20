import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AppState } from "react-native";
import { login as apiLogin, register as apiRegister } from "../api/auth.api";
import { getCurrentUser, updateCurrentUser } from "../api/userApi";
import {
  getToken,
  removeToken,
  saveToken,
  saveRefreshToken,
  removeRefreshToken,
  saveOnboardingSeen,
  getOnboardingSeen,
  saveProfileImage,
  getProfileImage,
  saveRole,
  getRole,
  removeRole,
} from "../services/storage";
import { setAuthToken } from "../api/axiosConfig";
import { isActiveAccount, isPendingEmail, isPendingPayment } from "../utils/accountStatus";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [pendingAmount, setPendingAmount] = useState(null);
  const [canPostListings, setCanPostListings] = useState(false);
  const [canViewPremiumListings, setCanViewPremiumListings] = useState(false);
  const [isPremiumCustomer, setIsPremiumCustomer] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const updateAuthFields = async (data = {}) => {
    const source = data.user || data;
    const newRole = source.role;
    if (newRole) {
      await saveRole(newRole);
      setRole(newRole);
    }

    const newAccountStatus = source.account_status || source.accountStatus || source.status || null;
    setAccountStatus(newAccountStatus);
    setEmailVerified(Boolean(source.email_verified ?? source.emailVerified));
    setCanPostListings(Boolean(source.can_post_listings ?? source.canPostListings));
    setCanViewPremiumListings(Boolean(source.can_view_premium_listings ?? source.canViewPremiumListings));
    setIsPremiumCustomer(Boolean(source.is_premium_customer ?? source.isPremiumCustomer));
    setPremiumUntil(source.premium_until ?? source.premiumUntil ?? null);

    const txId = data.transaction_id || data.transactionId || source.transaction_id || source.transactionId;
    const amount = data.amount ?? source.amount ?? null;
    if (txId) setPendingTransactionId(txId);
    if (amount != null) setPendingAmount(amount);
  };

  const applySession = async (data = {}) => {
    const source = data.user || data;
    const access = data.access || data.token || data.access_token || source.access || source.access_token;
    const refresh = data.refresh || data.refresh_token || source.refresh || source.refresh_token;

    if (access) {
      setToken(access);
      setAuthToken(access);
      await saveToken(access);
    }
    if (refresh) {
      await saveRefreshToken(refresh);
    }

    if (source && (source.email || source.id || source.full_name)) {
      setUser((prev) => ({ ...(prev || {}), ...source }));
    }

    await updateAuthFields(data);
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await getCurrentUser();
      const userData = response.data || {};
      const userId = userData.id || userData.user_id || userData.email;
      const cachedProfileImage = userId ? await getProfileImage(userId) : null;

      if (!userData.profile_image && cachedProfileImage) {
        userData.profile_image = cachedProfileImage;
      }

      setUser(userData);
      await updateAuthFields(userData);

      if (userData.profile_image && userId) {
        await saveProfileImage(userId, userData.profile_image);
      }
      return userData;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await removeToken();
        await removeRefreshToken();
        setToken(null);
        setAuthToken(null);
      }
      console.error("Failed to load current user", error);
      return null;
    }
  };

  const refreshCurrentUser = useCallback(async () => fetchCurrentUser(), []);

  useEffect(() => {
    const restoreAuth = async () => {
      const storedToken = await getToken();
      const storedOnboarding = await getOnboardingSeen();
      const storedRole = await getRole();

      setHasSeenOnboarding(Boolean(storedOnboarding));
      setRole(storedRole);

      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
        await fetchCurrentUser();
      }

      setIsLoading(false);
    };
    restoreAuth();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && token) {
        refreshCurrentUser();
      }
    });
    return () => subscription.remove();
  }, [token, refreshCurrentUser]);

  const login = async ({ email, password }) => {
    try {
      const response = await apiLogin({ email, password });
      const data = response.data || {};
      await applySession(data);
      await fetchCurrentUser();

      const seenOnboarding = await getOnboardingSeen();
      setHasSeenOnboarding(Boolean(seenOnboarding));
      return data;
    } catch (error) {
      console.error("Login error:", error);
      const message = error.response?.data?.detail || error.response?.data || error.message;
      Alert.alert("Login failed", typeof message === "string" ? message : JSON.stringify(message));
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const response = await apiRegister(payload);
      const data = response.data || {};

      const roleToStore = payload.role || data.role;
      if (roleToStore) {
        await saveRole(roleToStore);
        setRole(roleToStore);
      }

      await applySession(data);

      if (!data.access && !data.access_token && !data.token) {
        await login({ email: payload.email, password: payload.password });
      } else {
        await fetchCurrentUser();
      }
      return data;
    } catch (error) {
      const message = error.response?.data || error.message;
      Alert.alert("Registration failed", typeof message === "string" ? message : JSON.stringify(message));
      throw error;
    }
  };

  const updateUserProfile = async (data) => {
    try {
      const config = data instanceof FormData ? { headers: {} } : undefined;
      const response = await updateCurrentUser(data, config);
      const updatedUser = response.data || {};
      const userId = updatedUser.id || updatedUser.user_id || updatedUser.email;
      setUser(updatedUser);
      await updateAuthFields(updatedUser);
      if (userId && updatedUser.profile_image) {
        await saveProfileImage(userId, updatedUser.profile_image);
      }
      return updatedUser;
    } catch (error) {
      const message = error.response?.data || error.message;
      Alert.alert("Update failed", typeof message === "string" ? message : JSON.stringify(message));
      throw error;
    }
  };

  const logout = async () => {
    await removeToken();
    await removeRefreshToken();
    await removeRole();
    setToken(null);
    setUser(null);
    setRole(null);
    setEmailVerified(false);
    setAccountStatus(null);
    setPendingTransactionId(null);
    setPendingAmount(null);
    setCanPostListings(false);
    setCanViewPremiumListings(false);
    setIsPremiumCustomer(false);
    setPremiumUntil(null);
    setAuthToken(null);
  };

  const markOnboardingSeen = async () => {
    try {
      await saveOnboardingSeen();
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error("Unable to save onboarding state", error);
    }
  };

  const isLoggedIn = !!token;
  const requiresEmailVerification = isPendingEmail(accountStatus, emailVerified);
  const requiresPayment = isPendingPayment(accountStatus);
  const isAccountActive = isActiveAccount(accountStatus);

  const value = useMemo(
    () => ({
      token,
      isLoggedIn,
      user,
      role,
      emailVerified,
      accountStatus,
      pendingTransactionId,
      pendingAmount,
      canPostListings,
      canViewPremiumListings,
      isPremiumCustomer,
      premiumUntil,
      initializing: isLoading,
      requiresEmailVerification,
      requiresPayment,
      isAccountActive,
      login,
      logout,
      register,
      updateUserProfile,
      fetchCurrentUser,
      refreshCurrentUser,
      applySession,
      hasSeenOnboarding,
      markOnboardingSeen,
    }),
    [
      token,
      isLoggedIn,
      user,
      role,
      emailVerified,
      accountStatus,
      pendingTransactionId,
      pendingAmount,
      canPostListings,
      canViewPremiumListings,
      isPremiumCustomer,
      premiumUntil,
      isLoading,
      requiresEmailVerification,
      requiresPayment,
      isAccountActive,
      hasSeenOnboarding,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
