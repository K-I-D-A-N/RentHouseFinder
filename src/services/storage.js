import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const ONBOARDING_KEY = "has_seen_onboarding";
const PROFILE_IMAGE_KEY_PREFIX = "profile_image_";

export const saveToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const saveRefreshToken = async (token) => {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getRefreshToken = async () => {
  return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

export const removeRefreshToken = async () => {
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const saveOnboardingSeen = async () => {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
};

export const getOnboardingSeen = async () => {
  return await AsyncStorage.getItem(ONBOARDING_KEY);
};

export const saveProfileImage = async (userId, uri) => {
  if (!userId || !uri) return;
  await AsyncStorage.setItem(`${PROFILE_IMAGE_KEY_PREFIX}${userId}`, uri);
};

export const getProfileImage = async (userId) => {
  if (!userId) return null;
  return await AsyncStorage.getItem(`${PROFILE_IMAGE_KEY_PREFIX}${userId}`);
};

export const removeProfileImage = async (userId) => {
  if (!userId) return;
  await AsyncStorage.removeItem(`${PROFILE_IMAGE_KEY_PREFIX}${userId}`);
};

export const setItem = async (key, value) => {
  await AsyncStorage.setItem(key, value);
};

export const getItem = async (key) => {
  return await AsyncStorage.getItem(key);
};