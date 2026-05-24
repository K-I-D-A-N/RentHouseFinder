import React, { createContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { login as apiLogin, register as apiRegister } from "../api/authApi";
import { getCurrentUser, updateCurrentUser } from "../api/userApi";
import { getToken, removeToken, saveToken, saveRefreshToken, removeRefreshToken, saveOnboardingSeen, getOnboardingSeen, saveProfileImage, getProfileImage, saveRole, getRole, removeRole } from "../services/storage";
import { setAuthToken } from "../api/axiosConfig";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

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
      
      // Store user role if available
      if (userData.role) {
        await saveRole(userData.role);
        setRole(userData.role);
      }
      
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

  const login = async ({ email, password }) => {
    try {
      const response = await apiLogin({ email, password });
      const data = response.data || {};
      const access = data.access || data.token || data.access_token;
      const refresh = data.refresh || data.refresh_token;
      if (!access) {
        throw new Error("Unable to read access token from login response.");
      }
      console.log("Login successful, setting token...");
      setToken(access);
      setAuthToken(access);
      await saveToken(access);
      if (refresh) {
        await saveRefreshToken(refresh);
      }
      await fetchCurrentUser();

      const seenOnboarding = await getOnboardingSeen();
      console.log("Onboarding status:", seenOnboarding);
      setHasSeenOnboarding(Boolean(seenOnboarding));
      console.log("Auth state updated after login");
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
      const access = data.access || data.token || data.access_token;
      const refresh = data.refresh || data.refresh_token;
      
      // Store role from payload or response
      const roleToStore = payload.role || data.role;
      if (roleToStore) {
        await saveRole(roleToStore);
        setRole(roleToStore);
      }
      
      if (access) {
        setToken(access);
        setAuthToken(access);
        await saveToken(access);
        if (refresh) {
          await saveRefreshToken(refresh);
        }
        await fetchCurrentUser();
      } else {
        await login({ email: payload.email, password: payload.password });
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

  const value = useMemo(
    () => ({ token, isLoggedIn, user, role, initializing: isLoading, login, logout, register, updateUserProfile, hasSeenOnboarding, markOnboardingSeen }),
    [token, user, role, isLoading, hasSeenOnboarding]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
