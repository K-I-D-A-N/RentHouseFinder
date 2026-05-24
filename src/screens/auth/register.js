import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";

export default function RegisterScreen({ navigation }) {
  const { register, login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const roleOptions = [
    { label: "Customer", value: "customer" },
    { label: "Landlord", value: "landlord" },
  ];

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Validation", "Please fill in all fields.");
      return;
    }
    if (!selectedRole) {
      Alert.alert("Validation", "Please select a role (Customer or Landlord).");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match");
      return;
    }
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    try {
      const payload = {
        full_name: fullName,
        email: trimmedEmail,
        phone,
        password: trimmedPassword,
        password_confirm: confirmPassword.trim(),
        role: selectedRole,
      };
      console.log("REGISTER PAYLOAD:", payload);
      const registerRes = await register(payload);
      console.log("REGISTER RESPONSE:", registerRes);
      // Auto-login after successful registration
      try {
        const loginPayload = {
          email: trimmedEmail,
          password: trimmedPassword,
        };
        const loginRes = await login(loginPayload);
        console.log("LOGIN RESPONSE:", loginRes);
        // Navigate to main app screen (adjust as needed)
        navigation.replace("Home");
      } catch (loginError) {
        console.log("LOGIN ERROR:", loginError.response?.data || loginError.message);
        Alert.alert(
          "Login Failed",
          typeof loginError.response?.data === "string"
            ? loginError.response?.data
            : JSON.stringify(loginError.response?.data || loginError.message)
        );
      }
    } catch (error) {
      console.log("REGISTER ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Registration Failed",
        typeof error.response?.data === "string"
          ? error.response?.data
          : JSON.stringify(error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Rent House Finder today</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Icon name="person" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.placeholder}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="phone" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <TouchableOpacity 
            style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}
            onPress={() => setShowRoleModal(true)}
          >
            <Icon name="security" size={20} color={colors.textSecondary} style={styles.icon} />
            <Text style={[styles.input, { color: selectedRole ? colors.text : colors.placeholder }]}>
              {selectedRole ? roleOptions.find(r => r.value === selectedRole)?.label : "Select Role"}
            </Text>
            <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} style={styles.icon} />
          </TouchableOpacity>
          <Modal
            visible={showRoleModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowRoleModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowRoleModal(false)}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={styles.modalTitle}>Select Role</Text>
                {roleOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.roleOption,
                      selectedRole === option.value && styles.roleOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedRole(option.value);
                      setShowRoleModal(false);
                    }}
                  >
                    <Icon 
                      name={selectedRole === option.value ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={selectedRole === option.value ? colors.primary : colors.textSecondary}
                      style={styles.radioIcon}
                    />
                    <Text style={[styles.roleOptionText, { color: colors.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={[styles.button, { marginTop: 16, backgroundColor: colors.textSecondary }]}
                  onPress={() => setShowRoleModal(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.muted,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.inputBackground,
  },
  icon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    color: colors.textSecondary,
  },
  link: {
    marginLeft: 6,
    color: colors.primary,
    fontWeight: "bold",
  },
  roleContainer: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  picker: {
    color: colors.text,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionSelected: {
    backgroundColor: "rgba(" + parseInt(colors.primary.slice(1, 3), 16) + "," + 
                      parseInt(colors.primary.slice(3, 5), 16) + "," + 
                      parseInt(colors.primary.slice(5, 7), 16) + ",0.1)",
    borderColor: colors.primary,
  },
  radioIcon: {
    marginRight: 12,
  },
  roleOptionText: {
    fontSize: 16,
    flex: 1,
  },
});