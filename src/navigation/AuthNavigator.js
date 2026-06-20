import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/register";
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen";
import ForgotPasswordScreen from "../screens/auth/Forgot PasswordScreen";
import ResetPasswordScreen from "../screens/auth/Reset PasswordScreen";
import PlanSelectionScreen from "../screens/subscription/PlanSelectionScreen";
import ChapaCheckoutScreen from "../screens/subscription/ChapaCheckoutScreen";
import PaymentPendingScreen from "../screens/subscription/PaymentPendingScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="PlanSelectionScreen" component={PlanSelectionScreen} />
      <Stack.Screen name="ChapaCheckoutScreen" component={ChapaCheckoutScreen} />
      <Stack.Screen name="PaymentPendingScreen" component={PaymentPendingScreen} />
    </Stack.Navigator>
  );
}
