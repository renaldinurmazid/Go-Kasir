import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
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
		  console.log("LOGIN ERROR MESSAGE:", error?.message);
		  console.log("LOGIN ERROR STATUS:", error?.response?.status);

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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <Image
          source={require("../../assets/images/gokasir-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Input username"
          placeholderTextColor={Colors.textSoft}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Input password"
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
          style={[styles.loginButton, (!isFormValid || loading) && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 280,
    height: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primaryDark,
    marginBottom: 10,
  },
  passwordLabel: {
    marginTop: 18,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 22,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 22,
    height: 52,
    paddingHorizontal: 2,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 14,
    paddingRight: 8,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  footerTextRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    color: "#666",
  },
  footerLink: {
    fontSize: 15,
    color: Colors.link,
    fontWeight: "600",
  },
});
