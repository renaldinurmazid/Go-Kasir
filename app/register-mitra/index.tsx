import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { registerMitraRequest } from "../../services/registerMitra";

export default function RegisterMitraScreen() {
  const router = useRouter();

  const [namaToko, setNamaToko] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = () => {
    if (!namaToko.trim() || !namaPemilik.trim() || !email.trim() || !noHp.trim()) {
      Alert.alert("Validasi", "Mohon lengkapi semua data toko.");
      return false;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Validasi", "Format email tidak valid.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Validasi", "Password minimal 6 karakter.");
      return false;
    }
    if (konfirmasiPassword !== password) {
      Alert.alert("Validasi", "Konfirmasi password tidak cocok.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      const result = await registerMitraRequest({
        nama_toko: namaToko,
        nama_pemilik: namaPemilik,
        email: email,
        username: email,
        no_hp: noHp,
        alamat,
        password,
        konfirmasi_password: konfirmasiPassword,
      });

      if (result.success) {
        Alert.alert("Berhasil", "Pendaftaran mitra berhasil! Silakan login.", [
          { text: "Login Sekarang", onPress: () => router.replace("/login") },
        ]);
      } else {
        Alert.alert("Gagal", result.message || "Terjadi kesalahan.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Koneksi terputus.");
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Daftar Mitra</Text>
            <Text style={styles.headerSub}>Mulai kelola bisnis Anda dengan mudah</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Informasi Bisnis</Text>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Nama Toko / Usaha</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama toko"
                placeholderTextColor={Colors.textSoft}
                value={namaToko}
                onChangeText={setNamaToko}
                editable={!loading}
              />
            </View>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Nama Pemilik</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={Colors.textSoft}
                value={namaPemilik}
                onChangeText={setNamaPemilik}
                editable={!loading}
              />
            </View>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Email / Username</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan email aktif"
                placeholderTextColor={Colors.textSoft}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>No. HP / WhatsApp</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="logo-whatsapp" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan nomor aktif"
                placeholderTextColor={Colors.textSoft}
                value={noHp}
                onChangeText={setNoHp}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Alamat Lengkap</Text>
            </View>
            <View style={[styles.inputWrapper, styles.textareaWrapper]}>
              <Ionicons name="location-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Masukkan alamat lengkap toko"
                placeholderTextColor={Colors.textSoft}
                value={alamat}
                onChangeText={setAlamat}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Keamanan</Text>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Password</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Buat password minimal 6 karakter"
                placeholderTextColor={Colors.textSoft}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel}>Konfirmasi Password</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSoft} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ulangi password Anda"
                placeholderTextColor={Colors.textSoft}
                value={konfirmasiPassword}
                onChangeText={setKonfirmasiPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Daftar Menjadi Mitra</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Sudah memiliki akun? </Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text style={styles.footerLink}>Login Sekarang</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  headerTextContainer: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSoft,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formContainer: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 20,
    marginTop: 8,
  },
  inputLabelContainer: {
    marginLeft: 4,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    height: 56,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  textareaWrapper: {
    height: 100,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: Platform.OS === "android" ? 2 : 0,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: Colors.text,
  },
  textarea: {
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: "#D1D1D1",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
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