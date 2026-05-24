import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import StarRating from "./StarRating";
import { createReview } from "../api/reviewApi";
import useTheme from "../hooks/useTheme";

export default function ReviewModal({ visible, onClose, booking, onSuccess }) {
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (!booking) return Alert.alert("Error", "Booking not available.");
    if (String(booking.status).toLowerCase() !== "completed") {
      return Alert.alert("Not allowed", "You can only review completed bookings.");
    }
    if (!rating || rating < 1) return Alert.alert("Validation", "Please select a rating.");

    setSubmitting(true);
    try {
      const payload = {
        listing_id: booking.listing || booking.property || booking.listing_id || booking.property_id,
        rating,
        comment,
      };
      const response = await createReview(payload);
      setSubmitting(false);
      reset();
      onClose && onClose();
      Alert.alert("Thank you", "Your review was submitted successfully.");
      onSuccess && onSuccess(response.data);
    } catch (err) {
      setSubmitting(false);
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 400 && data) {
        const msg = data.detail || data.message || JSON.stringify(data);
        Alert.alert("Validation error", msg);
      } else if (status === 401) {
        Alert.alert("Unauthorized", "Please login to submit a review.");
      } else if (status === 409) {
        Alert.alert("Duplicate", "You have already submitted a review for this listing.");
      } else {
        Alert.alert("Error", "Failed to submit review. Please try again.");
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.header, { color: colors.text }]}>Write a review</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>How was your stay?</Text>
          <StarRating rating={rating} size={36} onChange={setRating} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Tell others about your experience"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { reset(); onClose && onClose(); }}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  header: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 12 },
  input: { borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: "top", marginTop: 12 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
  submitBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
});
