import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { buildStrukText } from "../../utils/strukFormatter";
import { printStruk } from "../../services/printerService";
import { getDetailPenjualan } from "../../services/penjualan";
import { getCachedMitraInfo } from "../../services/mitra";

import Colors from "../../constants/colors";

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

const DottedLine = () => (
  <View style={styles.dottedLineContainer}>
    {[...Array(40)].map((_, i) => (
      <View key={i} style={styles.dot} />
    ))}
  </View>
);

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
      const res = await getDetailPenjualan(
        Number(id_penjualan),
        Number(id_mitra),
      );
      if (res.success) {
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

      // Fetch Store Info for Receipt Header/Logo
      const mitraResult = await getCachedMitraInfo(Number(id_mitra));
      const storeData = mitraResult.success ? mitraResult.data : {};

      const dataStruk = {
        ...data,
        nama_toko: storeData.nama_toko || data.nama_toko,
        alamat_toko: storeData.alamat,
        hp_toko: storeData.no_hp,
      };

      const text = buildStrukText(dataStruk);
      const result = await printStruk(
        text,
        storeData.logo || data?.logo || null,
      );

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
        <Text style={styles.loadingText}>Memuat detail transaksi...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={80}
          color={Colors.textSoft}
        />
        <Text style={styles.errorText}>Data transaksi tidak ditemukan.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Transaksi Berhasil!</Text>
          <Text style={styles.successDate}>{data.tanggal}</Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptStoreName}>
              {data.nama_toko || "GoKasir"}
            </Text>
            <Text style={styles.receiptId}>
              No. Transaksi: #{data.id_penjualan}
            </Text>
          </View>

          <DottedLine />

          <View style={styles.itemsContainer}>
            {(data.items || []).map((item: any, index: number) => (
              <View key={`${item.id_produk}-${index}`} style={styles.itemRow}>
                <View style={styles.itemMainInfo}>
                  <Text style={styles.itemName}>{item.nama_produk}</Text>
                  <Text style={styles.itemQty}>
                    {item.qty} x {formatRupiah(item.harga)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatRupiah(item.total)}</Text>
              </View>
            ))}
          </View>

          <DottedLine />

          <View style={styles.pricingContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>{formatRupiah(data.total)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Bayar ({data.metode_pembayaran})
              </Text>
              <Text style={styles.priceValue}>{formatRupiah(data.bayar)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Kembalian</Text>
              <Text style={styles.totalValue}>
                {formatRupiah(data.kembalian)}
              </Text>
            </View>
          </View>

          <DottedLine />

          <View style={styles.customerInfo}>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Kasir:</Text>
              <Text style={styles.infoValue}>{data.kasir}</Text>
            </View>
            {data.nama_pelanggan && (
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Pelanggan:</Text>
                <Text style={styles.infoValue}>{data.nama_pelanggan}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Ionicons name="print-outline" size={20} color="#fff" />
            <Text style={styles.printBtnText}>Cetak Struk</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newBtn} onPress={handleTransaksiBaru}>
            <Text style={styles.newBtnText}>Transaksi Baru</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },

  loadingText: { marginTop: 12, color: Colors.textSoft, fontSize: 14 },
  errorText: {
    marginTop: 12,
    color: Colors.textSoft,
    fontSize: 16,
    textAlign: "center",
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2F8F46",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#2F8F46",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  successDate: {
    fontSize: 13,
    color: Colors.textSoft,
    marginTop: 4,
  },

  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  receiptStoreName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  receiptId: {
    fontSize: 12,
    color: Colors.textSoft,
  },

  dottedLineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
    height: 1,
    overflow: "hidden",
  },
  dot: {
    width: 3,
    height: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 1,
  },

  itemsContainer: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  itemQty: {
    fontSize: 12,
    color: Colors.textSoft,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },

  pricingContainer: {
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.textSoft,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
  },

  customerInfo: {
    marginTop: 8,
  },
  infoLine: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSoft,
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },

  actionContainer: {
    marginTop: 24,
    gap: 12,
  },
  printBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
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
  printBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  newBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  newBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
});
