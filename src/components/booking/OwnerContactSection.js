import React from "react";
import { View, Text, StyleSheet } from "react-native";
import useTheme from "../../hooks/useTheme";
import { getOwnerDisplayFromBooking, canViewContactInfo } from "../../utils/bookingContact";

export default function OwnerContactSection({ booking, style }) {
  const { colors } = useTheme();
  const owner = getOwnerDisplayFromBooking(booking);
  const showContact = canViewContactInfo(booking);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.name, { color: colors.text }]}>{owner.fullName}</Text>
      {owner.city ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{owner.city}</Text>
      ) : null}
      {showContact && owner.email ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{owner.email}</Text>
      ) : null}
      {showContact && owner.phone ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{owner.phone}</Text>
      ) : null}
      {!showContact ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Contact details appear after booking approval.
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
