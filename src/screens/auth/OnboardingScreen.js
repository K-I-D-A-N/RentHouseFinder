import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";

const { width } = Dimensions.get("window");

const slides = [
  {
    icon: "search-outline",
    title: "Find Houses Easily",
    description: "Search through thousands of properties in Addis Ababa with our smart search.",
  },
  {
    icon: "funnel-outline",
    title: "Filter by Your Needs",
    description: "Filter properties by price, location, number of rooms, and more.",
  },
  {
    icon: "home-outline",
    title: "Post Your Property",
    description: "List your house for rent or sale and reach thousands of potential buyers.",
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const { token, markOnboardingSeen } = useAuth();
  const finishRoute = token ? "Main" : "Auth";

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSkip = async () => {
    await markOnboardingSeen();
    console.log("Onboarding skipped, hasSeenOnboarding should update...");
    
    if (finishRoute === "Auth") {
      navigation.replace("Auth", { screen: "Login" });
      return;
    }

    // Let the context change trigger AppNavigator re-render
  };

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={styles.scrollContainer}
      >
        {slides.map((slideItem, idx) => (
          <View key={idx} style={styles.slide}>
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name={slideItem.icon} size={42} color={colors.primary} />
              </View>
              <Text style={styles.title}>{slideItem.title}</Text>
              <Text style={styles.description}>{slideItem.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {slides.map((_, idx) => (
          <View key={idx} style={[styles.dot, idx === index && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 24,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    skipText: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: "bold",
    },
    scrollContainer: {
      flexGrow: 1,
    },
    slide: {
      width,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    card: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: 32,
      padding: 28,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 10,
    },
    iconBox: {
      width: 116,
      height: 116,
      borderRadius: 24,
      backgroundColor: colors.soft,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      textAlign: "center",
    },
    pagination: {
      flexDirection: "row",
      marginTop: 32,
      justifyContent: "center",
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.muted,
      marginHorizontal: 6,
    },
    activeDot: {
      backgroundColor: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      marginBottom: 12,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "900",
    },
  });
}
