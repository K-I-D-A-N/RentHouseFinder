import { StyleSheet } from "react-native";
import colors from "../utils/colors";

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
