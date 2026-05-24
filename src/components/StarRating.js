import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function StarRating({ rating = 0, size = 28, onChange }) {
  const normalized = Math.max(0, Math.min(5, Math.round(rating || 0)));

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < normalized;
        return (
          <TouchableOpacity key={`star-${i}`} onPress={() => onChange && onChange(i + 1)} activeOpacity={0.8}>
            <Icon
              name={filled ? "star" : "star-border"}
              size={size}
              color={filled ? "#f5a623" : "#c1c1c1"}
              style={styles.icon}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  icon: { marginHorizontal: 2 },
});
