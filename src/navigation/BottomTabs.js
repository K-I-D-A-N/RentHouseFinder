import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import useTheme from "../hooks/useTheme";
import useAuth from "../hooks/useAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/home/HomeScreen";
import SearchScreen from "../screens/home/SearchScreen";
import AddPropertyScreen from "../screens/property/AddPropertyScreen";
import FavoritesScreen from "../screens/home/FavoritesScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import PropertyDetailScreen from "../screens/home/PropertyDetailScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import MyListingsScreen from "../screens/property/MyListingsScreen";
import EditPropertyScreen from "../screens/property/EditPropertyScreen";
import PromotionPaymentScreen from "../screens/property/PromotionPaymentScreen";
import MyBookingsScreen from "../screens/booking/MyBookingsScreen";
import PaymentScreen from "../screens/booking/PaymentScreen";
import BookingScreen from "../screens/booking/BookingScreen";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="PropertyDetailScreen" component={PropertyDetailScreen} />
      <HomeStack.Screen name="BookingScreen" component={BookingScreen} />
    </HomeStack.Navigator>
  );
}

import EditListingScreen from "../screens/property/EditListingScreen";
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="MyListings" component={MyListingsScreen} />
      <ProfileStack.Screen name="MyBookings" component={MyBookingsScreen} />
      <ProfileStack.Screen name="PaymentScreen" component={PaymentScreen} />
      <ProfileStack.Screen name="PromotionPaymentScreen" component={PromotionPaymentScreen} />
      <ProfileStack.Screen name="PropertyDetailScreen" component={PropertyDetailScreen} />
      <ProfileStack.Screen name="EditProperty" component={EditPropertyScreen} />
      <ProfileStack.Screen name="EditListingScreen" component={EditListingScreen} />
    </ProfileStack.Navigator>
  );
}

export default function BottomTabs() {
  const { colors } = useTheme();
  const { role } = useAuth();
  const styles = createStyles(colors);
  const isLandlord = role === "landlord";
  const insets = useSafeAreaInsets();

  function CustomTabBarButton({ children, onPress, style }) {
    return (
      <TouchableOpacity
        style={[styles.customButtonContainer, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.customButton}>{children}</View>
      </TouchableOpacity>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          { bottom: 0, height: (Platform.OS === "ios" ? 80 : 70) + insets.bottom, paddingBottom: insets.bottom },
        ],
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "home-outline";
          if (route.name === "HomeTab") iconName = focused ? "home" : "home-outline";
          if (route.name === "Search") iconName = focused ? "search" : "search-outline";
          if (route.name === "Favorites") iconName = focused ? "heart" : "heart-outline";
          if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />
      {isLandlord && (
        <Tab.Screen
          name="Post"
          component={AddPropertyScreen}
          options={{
            tabBarButton: (props) => <CustomTabBarButton {...props} />,
            tabBarIcon: () => <Ionicons name="add" size={28} color={colors.surface} />,
          }}
        />
      )}
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: "Favorites",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const createStyles = (colors) => StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    height: Platform.OS === "ios" ? 80 : 70,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  customButtonContainer: {
    top: -24,
    justifyContent: "center",
    alignItems: "center",
  },
  customButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
});
