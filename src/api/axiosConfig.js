import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://betrent-u5jj.onrender.com/api/v1";
const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

const refreshAuthToken = async () => {
  const refreshToken = await AsyncStorage.getItem("refresh_token");
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await axios.post(
    `${BASE_URL}/auth/refresh/`,
    { refresh: refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const data = response.data || {};
  const access = data.access || data.token || data.access_token;
  if (!access) {
    throw new Error("Unable to refresh access token");
  }

  await AsyncStorage.setItem("auth_token", access);
  API.defaults.headers.Authorization = `Bearer ${access}`;
  return access;
};

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh/")
    ) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.removeItem("auth_token");
        await AsyncStorage.removeItem("refresh_token");
        delete API.defaults.headers.Authorization;
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.Authorization;
  }
};

export default API;
