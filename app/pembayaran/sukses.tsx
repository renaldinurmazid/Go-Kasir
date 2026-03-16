import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { buildStrukText } from "../../utils/strukFormatter";
import { printStruk } from "../../services/printerService";
import { getDetailPenjualan } from "../../services/penjualan";

import Colors from "../../constants/colors";

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function PembayaranSuksesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id_penjualan, id_mitra } = params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id_penjualan && id_mitra) {
      fetchDetail();
    }
  }, [id_penjualan, id_mitra]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getDetailPenjualan(Number(id_penjualan), Number(id_mitra));
      if (res.success) {
        // Flatten structure for the UI compatibility
        setData({
          ...res.data.header,
          items: res.data.items,
        });
      } else {
        Alert.alert("Error", res.message || "Gagal mengambil detail transaksi");
      }
    } catch (error) {
      Alert.alert("Error", "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      if (!data) {
        Alert.alert("Print Struk", "Data transaksi tidak ditemukan.");
        return;
      }

      const text = buildStrukText(data);
      const result = await printStruk(text);

      if (!result.success) {
        Alert.alert("Printer", result.message || "Gagal mencetak struk.");
        return;
      }

      Alert.alert("Sukses", result.message || "Struk berhasil dicetak.");
    } catch (error) {
      Alert.alert("Error", "Terjadi kesalahan saat mencetak struk.");
    }
  };

  const handleTransaksiBaru = () => {
    router.replace("/penjualan");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10 }}>Memuat detail transaksi...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={{ marginTop: 10 }}>Data transaksi tidak ditemukan.</Text>
        <TouchableOpacity 
          style={[styles.newBtn, { marginTop: 20, paddingHorizontal: 20 }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.newBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.successBox}>
        <Ionicons name="checkmark-circle" size={72} color="#2F8F46" />
        <Text style={styles.successTitle}>Transaksi Berhasil</Text>
        <Text style={styles.successAmount}>{formatRupiah(data.total)}</Text>
        <Text style={styles.successSub}>Pembayaran berhasil disimpan</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detail Pembayaran</Text>
        <Text style={styles.rowText}>No. Transaksi: #{data.id_penjualan}</Text>
        <Text style={styles.rowText}>Tanggal: {data.tanggal}</Text>
        <Text style={styles.rowText}>Kasir: {data.kasir}</Text>
        <Text style={styles.rowText}>Metode: {data.metode_pembayaran}</Text>
        <Text style={styles.rowText}>Total: {formatRupiah(data.total)}</Text>
        <Text style={styles.rowText}>Bayar: {formatRupiah(data.bayar)}</Text>
        <Text style={styles.rowText}>Kembalian: {formatRupiah(data.kembalian)}</Text>
        <Text style={styles.rowText}>
          Nama Pelanggan: {data.nama_pelanggan || "-"}
        </Text>
        <Text style={styles.rowText}>
          Nomor HP: {data.nomor_hp || "-"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Item Transaksi</Text>
        {(data.items || []).map((item: any, index: number) => (
          <View key={`${item.id_produk}-${index}`} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nama_produk}</Text>
              <Text style={styles.itemSub}>
                {item.qty} x {formatRupiah(item.harga)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatRupiah(item.total)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
        <Text style={styles.printBtnText}>Cetak Struk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.newBtn} onPress={handleTransaksiBaru}>
        <Text style={styles.newBtnText}>Transaksi Baru</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  successBox: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  successTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  successAmount: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
  },
  successSub: {
    marginTop: 6,
    color: "#666",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  rowText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  itemSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },

  printBtn: {
    backgroundColor: Colors.primary,
    margin: 12,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  printBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  newBtn: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  newBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
});