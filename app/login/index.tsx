import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../constants/colors";
import { loginRequest } from "../../services/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid = username.trim() !== "" && password.trim() !== "";

  const handleLogin = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);

      const result = await loginRequest({
        username,
        password,
      });

      if (!result.success) {
        Alert.alert("Login Gagal", result.message || "Username atau password salah");
        return;
      }

      const user = result.data?.user;
      const token = result.data?.token;

      await AsyncStorage.setItem("auth_token", token || "");
      await AsyncStorage.setItem("user_data", JSON.stringify(user || {}));

      router.replace("/dashboard");
    } catch (error: any) {
      console.log("LOGIN ERROR FULL:", JSON.stringify(error?.response?.data || null));
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Tidak bisa terhubung ke server"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/go_kasir.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Selamat Datang!</Text>
            <Text style={styles.welcomeSubtitle}>
              Silakan login untuk masuk ke aplikasi Kasir Anda.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan username"
                placeholderTextColor={Colors.textSoft}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                placeholderTextColor={Colors.textSoft}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textSoft}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid || loading) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerTextRow}>
              <Text style={styles.footerText}>Belum memiliki akun? </Text>
              <TouchableOpacity onPress={() => router.push("/register-mitra")}>
                <Text style={styles.footerLink}>Daftar Disini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 220,
    height: 80,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.textSoft,
    lineHeight: 22,
  },
  formContainer: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    height: 56,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#D1D1D1",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footerTextRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSoft,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "700",
  },
});
