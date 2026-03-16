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
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

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
    ])
  ).filter((amount) => amount > 0);

  const handleSubmit = async () => {
    if (!userData?.id_user || !userData?.id_mitra) {
      Alert.alert("Error", "Data user tidak valid.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Info", "Keranjang masih kosong.");
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

      const successPayload = {
        ...result.data,
        kasir: userData.nama_lengkap,
        nama_toko: userData.nama_toko || "GoKasir",
        nama_pelanggan: namaPelanggan.trim(),
        nomor_hp: nomorHp.trim(),
      };

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Pembayaran</Text>
            <Text style={styles.headerSub}>
              Kasir: {userData?.nama_lengkap || "Admin"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Transaksi</Text>
        <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Jumlah Item: {totalQty()}</Text>
        <Text style={styles.infoText}>Total Bayar: {formatRupiah(total)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Pelanggan</Text>

        <TextInput
          style={styles.input}
          placeholder="Nama pelanggan"
          placeholderTextColor={Colors.textSoft}
          value={namaPelanggan}
          onChangeText={setNamaPelanggan}
        />

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Nomor HP"
          placeholderTextColor={Colors.textSoft}
          value={nomorHp}
          onChangeText={(text) => setNomorHp(normalizePhone(text))}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metode Pembayaran</Text>

        <View style={styles.methodRow}>
          {[
            { key: "tunai", label: "Tunai" },
            { key: "bank", label: "Bank" },
            { key: "e-money", label: "E-Money" },
            { key: "qris", label: "QRIS" },
            { key: "hutang", label: "Hutang" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.methodChip,
                paymentMethod === item.key && styles.methodChipActive,
              ]}
              onPress={() => setPaymentMethod(item.key)}
            >
              <Text
                style={[
                  styles.methodChipText,
                  paymentMethod === item.key && styles.methodChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nominal Bayar</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={paidAmount}
          onChangeText={setPaidAmount}
          editable={paymentMethod === "tunai" || paymentMethod === "hutang"}
        />

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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kembalian</Text>
        <Text style={styles.changeValue}>
          {formatRupiah(paymentMethod === "tunai" ? change : 0)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Selesaikan Pembayaran</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 44,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },

  totalCard: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
  },

  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoText: {
    color: Colors.text,
    fontWeight: "600",
    fontSize: 13,
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    color: Colors.text,
    backgroundColor: "#fff",
  },

  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  methodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  methodChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  methodChipTextActive: {
    color: "#fff",
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  quickBtn: {
    backgroundColor: "#F6F6F6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickBtnText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },

  changeValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    margin: 12,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});