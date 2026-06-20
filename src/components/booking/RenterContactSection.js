import React from "react";
import { View, Text, StyleSheet } from "react-native";
import useTheme from "../../hooks/useTheme";
import { getRenterDisplay, canViewContactInfo } from "../../utils/bookingContact";

export default function RenterContactSection({ booking, style }) {
  const { colors } = useTheme();
  const renter = getRenterDisplay(booking);
  const showContact = canViewContactInfo(booking);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.name, { color: colors.text }]}>{renter.fullName}</Text>
      {renter.city ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{renter.city}</Text>
      ) : null}
      {showContact && renter.email ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{renter.email}</Text>
      ) : null}
      {showContact && renter.phone ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{renter.phone}</Text>
      ) : null}
      {!showContact ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Contact details appear after approval.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
});
