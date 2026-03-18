import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import Colors from "../../constants/colors";
import { useCartStore } from "../../store/cartStore";
import { simpanPenjualan } from "../../services/penjualan";

type UserData = {
  id_user: number;
  nama_lengkap: string;
  username: string;
  role: string;
  id_mitra: number;
  nama_toko?: string;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default function PembayaranScreen() {
  const router = useRouter();

  const { items, totalQty, totalAmount, clearCart } = useCartStore();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [paidAmount, setPaidAmount] = useState("");
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [loading, setLoading] = useState(false);

  const total = totalAmount();
  const change = Math.max(Number(paidAmount || 0) - total, 0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (paymentMethod !== "tunai") {
      setPaidAmount(String(total));
    }
  }, [paymentMethod, total]);

  const loadUser = async () => {
    const storedUser = await AsyncStorage.getItem("user_data");
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  };

  const quickAmounts = Array.from(
    new Set([
      total,
      Math.ceil(total / 5000) * 5000,
      Math.ceil(total / 10000) * 10000,
      Math.ceil(total / 50000) * 50000,
      Math.ceil(total / 100000) * 100000,
    ])
  ).filter((amount) => amount > 0);

  const handleSubmit = async () => {
    if (!userData?.id_user || !userData?.id_mitra) {
      Alert.alert("Error", "Data user tidak valid.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Info", "Keranjang masih kosoong.");
      return;
    }

    if (paymentMethod === "tunai" && Number(paidAmount || 0) < total) {
      Alert.alert("Validasi", "Nominal bayar kurang.");
      return;
    }

    if (paymentMethod === "hutang" && !namaPelanggan.trim()) {
      Alert.alert("Validasi", "Nama pelanggan wajib diisi untuk hutang.");
      return;
    }

    try {
      setLoading(true);

      const result = await simpanPenjualan({
        id_mitra: userData.id_mitra,
        id_user: userData.id_user,
        metode_pembayaran: paymentMethod,
        total,
        bayar: Number(paidAmount || 0),
        kembalian: paymentMethod === "tunai" ? change : 0,
        nama_pelanggan: namaPelanggan.trim(),
        nomor_hp: nomorHp.trim(),
        items: items.map((item) => ({
          id_produk: item.id_produk,
          nama_produk: item.nama_produk,
          harga: item.harga,
          qty: item.qty,
          diskon: item.diskon,
          total: item.total,
        })),
      });

      if (!result.success) {
        Alert.alert("Gagal", result.message || "Gagal menyimpan transaksi.");
        return;
      }

      clearCart();

      router.replace({
        pathname: "/pembayaran/sukses",
        params: {
          id_penjualan: result.data.id_penjualan,
          id_mitra: userData.id_mitra,
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal menyimpan transaksi"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Pembayaran</Text>
            <Text style={styles.headerSub}>
              Selesaikan transaksi penjualan
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Transaksi</Text>
              <Text style={styles.summaryValue}>{formatRupiah(total)}</Text>
            </View>
            <View style={styles.badgeQty}>
              <Text style={styles.badgeQtyText}>{totalQty()} Item</Text>
            </View>
          </View>
          <View style={styles.kasirInfo}>
            <Ionicons name="person-outline" size={14} color={Colors.textSoft} />
            <Text style={styles.kasirText}>Kasir: {userData?.nama_lengkap || "Admin"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Data Pelanggan (Opsional)</Text>
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Nama pelanggan"
              placeholderTextColor={Colors.textSoft}
              value={namaPelanggan}
              onChangeText={setNamaPelanggan}
            />
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Nomor HP"
              placeholderTextColor={Colors.textSoft}
              value={nomorHp}
              onChangeText={(text) => setNomorHp(normalizePhone(text))}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          </View>
          <View style={styles.methodGrid}>
            {[
              { key: "tunai", label: "Tunai", icon: "cash-outline" },
              { key: "bank", label: "Bank", icon: "business-outline" },
              { key: "qris", label: "QRIS", icon: "qr-code-outline" },
              { key: "e-money", label: "E-Wallet", icon: "wallet-outline" },
              { key: "hutang", label: "Hutang", icon: "time-outline" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.methodItem,
                  paymentMethod === item.key && styles.methodItemActive,
                ]}
                onPress={() => setPaymentMethod(item.key)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={paymentMethod === item.key ? "#fff" : Colors.text}
                />
                <Text
                  style={[
                    styles.methodLabel,
                    paymentMethod === item.key && styles.methodLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calculator-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Nominal Pembayaran</Text>
          </View>

          <View style={styles.paidAmountContainer}>
            <Text style={styles.currencyPrefix}>Rp</Text>
            <TextInput
              style={styles.paidAmountInput}
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
              placeholder="0"
              editable={paymentMethod === "tunai" || paymentMethod === "hutang"}
            />
          </View>

          {paymentMethod === "tunai" && (
            <View style={styles.quickRow}>
              {quickAmounts.map((amount, index) => (
                <TouchableOpacity
                  key={`${amount}-${index}`}
                  style={styles.quickBtn}
                  onPress={() => setPaidAmount(String(amount))}
                >
                  <Text style={styles.quickBtnText}>
                    {index === 0 ? "Uang Pas" : formatRupiah(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {paymentMethod === "tunai" && (
          <View style={styles.changeCard}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <Text style={[styles.changeValue, change > 0 && styles.changeValuePositive]}>
              {formatRupiah(change)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Selesaikan Pembayaran</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },

  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSoft,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
  },
  badgeQty: {
    backgroundColor: "#FCEAEA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeQtyText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  kasirInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
  },
  kasirText: {
    fontSize: 12,
    color: Colors.textSoft,
    marginLeft: 4,
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginLeft: 8,
  },
  inputGroup: {},
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },

  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  methodItem: {
    width: "30.5%",
    aspectRatio: 1,
    backgroundColor: "#F8F8F8",
    margin: "1.4%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  methodItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  methodLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  methodLabelActive: {
    color: "#fff",
  },

  paidAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    height: 60,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textSoft,
    marginRight: 8,
  },
  paidAmountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    gap: 8,
  },
  quickBtn: {
    backgroundColor: "#FCEAEA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: "center",
  },
  quickBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },

  changeCard: {
    backgroundColor: "#E8F5E9",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  changeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E7D32",
  },
  changeValuePositive: {
    color: "#2E7D32",
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    margin: 16,
    marginTop: 24,
    borderRadius: 14,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});