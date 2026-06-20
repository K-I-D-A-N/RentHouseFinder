import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Image } from "react-native";
import useTheme from "../../hooks/useTheme";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace("Onboarding");
    }, 360000);
    return () => clearTimeout(timeout);
  }, [navigation]);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/FAMBetRent.png")}
        style={styles.logoIcon}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  logoIcon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
