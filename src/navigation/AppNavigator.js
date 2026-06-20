import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthNavigator from "./AuthNavigator";
import BottomTabs from "./BottomTabs";
import SplashScreen from "../screens/auth/SplashScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import RegisterScreen from "../screens/auth/register";
import LoginScreen from "../screens/auth/LoginScreen";
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen";
import PlanSelectionScreen from "../screens/subscription/PlanSelectionScreen";
import ChapaCheckoutScreen from "../screens/subscription/ChapaCheckoutScreen";
import PaymentPendingScreen from "../screens/subscription/PaymentPendingScreen";
import useAuth from "../hooks/useAuth";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const {
    token,
    initializing,
    hasSeenOnboarding,
    user,
    requiresEmailVerification,
    requiresPayment,
    pendingTransactionId,
    pendingCheckoutUrl,
    pendingAmount,
    registrationDraft,
    role,
  } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  if (requiresEmailVerification) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="OTPVerificationGate">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
          name="OTPVerificationGate"
          component={OTPVerificationScreen}
          initialParams={{
            email: user?.email,
            registrationData: registrationDraft,
            role: registrationDraft?.role || role,
          }}
        />
        <Stack.Screen name="PlanSelectionScreen" component={PlanSelectionScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="ChapaCheckoutScreen" component={ChapaCheckoutScreen} />
        <Stack.Screen name="PaymentPendingScreen" component={PaymentPendingScreen} />
      </Stack.Navigator>
    );
  }

  if (requiresPayment) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="PaymentWaitingGate"
          component={PlanSelectionScreen}
        />
      </Stack.Navigator>
    );
  }

  if (token && !hasSeenOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="OnboardingFirstTime"
          component={OnboardingScreen}
          initialParams={{ finishRoute: "Main" }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabs} />
    </Stack.Navigator>
  );
}
