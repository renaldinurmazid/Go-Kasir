import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../constants/colors";
import { getMitraInfo, updateMitraInfo, MitraInfo } from "../../services/mitra";

export default function InfoTokoScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idMitra, setIdMitra] = useState<number | null>(null);

  const [form, setForm] = useState({
    nama_toko: "",
    email: "",
    no_hp: "",
    alamat: "",
    logo: null as any,
  });

  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) {
        router.replace("/login");
        return;
      }

      const user = JSON.parse(storedUser);
      const mitraId = user.id_mitra;
      setIdMitra(mitraId);

      const result = await getMitraInfo(mitraId);
      if (result.success && result.data) {
        const data: MitraInfo = result.data;
        setForm({
          nama_toko: data.nama_toko || "",
          email: data.email || "",
          no_hp: data.no_hp || "",
          alamat: data.alamat || "",
          logo: data.logo || null,
        });
        if (data.logo) {
          setPreviewLogo(data.logo);
        }
      }
    } catch (error) {
      console.error("LOAD MITRA INFO ERROR:", error);
      Alert.alert("Error", "Gagal memuat informasi toko.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selected = result.assets[0];
      setPreviewLogo(selected.uri);
      
      // Prepare for FormData upload
      const uriParts = selected.uri.split(".");
      const fileType = uriParts[uriParts.length - 1];

      setForm((prev) => ({
        ...prev,
        logo: {
          uri: selected.uri,
          name: `logo_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        },
      }));
    }
  };

  const handleSave = async () => {
    if (!idMitra) return;

    if (!form.nama_toko || !form.email || !form.no_hp || !form.alamat) {
      Alert.alert("Peringatan", "Harap isi semua bidang wajib.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateMitraInfo({
        id_mitra: idMitra,
        nama_toko: form.nama_toko,
        email: form.email,
        no_hp: form.no_hp,
        alamat: form.alamat,
        logo: form.logo,
      });

      if (result.success) {
        // Update stored user data if nama_toko changed
        const storedUser = await AsyncStorage.getItem("user_data");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.nama_toko = form.nama_toko;
          await AsyncStorage.setItem("user_data", JSON.stringify(user));
        }

        Alert.alert("Berhasil", "Informasi toko telah diperbarui.");
        router.back();
      } else {
        Alert.alert("Gagal", result.message || "Gagal memperbarui informasi toko.");
      }
    } catch (error) {
      console.error("UPDATE MITRA INFO ERROR:", error);
      Alert.alert("Error", "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat informasi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informasi Toko</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.logoSection}>
            <TouchableOpacity 
              style={styles.logoWrapper} 
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {previewLogo ? (
                <Image source={{ uri: previewLogo }} style={styles.logoImage} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="camera" size={32} color="#94A3B8" />
                  <Text style={styles.logoPlaceholderText}>Unggah Logo</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.logoHint}>Gunakan gambar persegi (1:1) untuk hasil terbaik</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Toko</Text>
              <View style={[styles.inputWrapper, !form.nama_toko && styles.inputError]}>
                <Ionicons name="storefront-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Toko Berkah Jaya"
                  value={form.nama_toko}
                  onChangeText={(val) => setForm({ ...form, nama_toko: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Toko</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="email@toko.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(val) => setForm({ ...form, email: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="08123456789"
                  keyboardType="phone-pad"
                  value={form.no_hp}
                  onChangeText={(val) => setForm({ ...form, no_hp: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat Lengkap</Text>
              <View style={[styles.inputWrapper, { height: 100, alignItems: "flex-start", paddingTop: 12 }]}>
                <Ionicons name="location-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { textAlignVertical: "top", height: "100%" }]}
                  placeholder="Jl. Merdeka No. 123..."
                  multiline
                  numberOfLines={4}
                  value={form.alamat}
                  onChangeText={(val) => setForm({ ...form, alamat: val })}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  topHeader: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 100,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    marginTop: 4,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  logoHint: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 12,
    textAlign: "center",
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: "#FECACA",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 58,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
