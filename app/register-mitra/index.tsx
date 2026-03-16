import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
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
        email: email, // Email dikirim sebagai identitas utama
        username: email, // Backend tetap butuh username? Kita isi pakai email saja
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Elegant Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Daftar Mitra Baru</Text>
          <Text style={styles.headerSub}>Bergabunglah dengan ekosistem kami</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Informasi Bisnis</Text>
          
          <View style={styles.inputGroup}>
            <Ionicons name="business-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nama Toko / Usaha"
              value={namaToko}
              onChangeText={setNamaToko}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nama Pemilik"
              value={namaPemilik}
              onChangeText={setNamaPemilik}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email (Gunakan sebagai Username)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="logo-whatsapp" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="No. HP / WhatsApp"
              value={noHp}
              onChangeText={setNoHp}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={[styles.inputGroup, { alignItems: 'flex-start', paddingTop: 12 }]}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Alamat Lengkap Toko"
              value={alamat}
              onChangeText={setAlamat}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Keamanan Akun</Text>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Konfirmasi Password"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Buat Akun Mitra</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Sudah jadi mitra? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.footerLink}>Login Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 8, marginLeft: -10 },
  headerTextContainer: { marginLeft: 10 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  
  scrollContent: { paddingBottom: 40 },
  formContainer: { paddingHorizontal: 20, marginTop: -20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: '#333', fontSize: 15 },
  textarea: { height: 80, textAlignVertical: 'top', paddingTop: 0 },
  
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 20 },
  
  submitButton: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    elevation: 4,
  },
  disabledBtn: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 25 },
  footerText: { color: "#666", fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: "bold" },
});