import React, { createContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ThemeContext = createContext(null);

const THEME_PREFERENCE_KEY = "theme_dark_mode";

const lightColors = {
  primary: "#ff6b00",
  primaryDark: "#d55a00",
  accent: "#ff7a00",
  background: "#fff8f0",
  surface: "#ffffff",
  muted: "#f5f5f5",
  soft: "#fff2e3",
  inputBackground: "#ffffff",
  text: "#111111",
  textSecondary: "#666666",
  placeholder: "#999999",
  border: "#dddddd",
  shadow: "#000000",
};

const darkColors = {
  primary: "#ff9a3c",
  primaryDark: "#ff7a00",
  accent: "#ffa65c",
  background: "#121212",
  surface: "#1f1f1f",
  muted: "#262626",
  soft: "#2b2b2b",
  inputBackground: "#2b2b2b",
  text: "#f5f5f5",
  textSecondary: "#cccccc",
  placeholder: "#aaaaaa",
  border: "#444444",
  shadow: "#000000",
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (storedValue !== null) {
          setIsDarkMode(storedValue === "true");
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
      }
    };

    loadThemePreference();
  }, []);

  const toggleDarkMode = async (value) => {
    const nextValue = typeof value === "boolean" ? value : !isDarkMode;
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextValue.toString());
    } catch (error) {
      console.error("Failed to save theme preference", error);
    }
    setIsDarkMode(nextValue);
  };

  const value = useMemo(
    () => ({
      isDarkMode,
      toggleDarkMode,
      colors: isDarkMode ? darkColors : lightColors,
    }),
    [isDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
