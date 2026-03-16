import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import { getLaporanSummary } from "../../services/laporan";

const screenWidth = Dimensions.get("window").width;

export default function LaporanScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [laporan, setLaporan] = useState<any>(null);

  // Periode default: awal bulan ini s/d hari ini
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, field: "" });

  useEffect(() => { initializePage(); }, []);
  useEffect(() => { if (userData?.id_mitra) fetchLaporan(userData.id_mitra, false); }, [dtAwal, dtAkhir]);

  const formatRupiah = (v: number) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
  const formatTglIndo = (date: Date) => date.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];

  const initializePage = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("user_data");
      if (!stored) return router.replace("/login");
      setUserData(JSON.parse(stored));
      await fetchLaporan(JSON.parse(stored).id_mitra, false);
    } catch (e) { Alert.alert("Error", "Gagal load session"); }
    finally { setLoading(false); }
  };

  const fetchLaporan = async (id_mitra: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await getLaporanSummary({
        id_mitra,
        tanggal_awal: formatDateDb(dtAwal),
        tanggal_akhir: formatDateDb(dtAkhir),
      });
      if (res.success) setLaporan(res.data);
    } catch (error) { console.log(error); }
    finally { setRefreshing(false); }
  };

  const labels = laporan?.grafik_penjualan?.length > 0 ? laporan.grafik_penjualan.map((i: any) => i.label) : ["-"];
  const values = laporan?.grafik_penjualan?.length > 0 ? laporan.grafik_penjualan.map((i: any) => Number(i.total)) : [0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Laporan Performa</Text>
            <Text style={styles.headerSub}>Analisa data real-time toko</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Periode Keren */}
      <View style={styles.periodeContainer}>
        <View style={styles.periodeCard}>
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <View style={styles.periodeTextRow}>
            <TouchableOpacity onPress={() => setShowPicker({ show: true, field: "awal" })}>
              <Text style={styles.tglText}>{formatTglIndo(dtAwal)}</Text>
            </TouchableOpacity>
            <Text style={styles.smdText}> s/d </Text>
            <TouchableOpacity onPress={() => setShowPicker({ show: true, field: "akhir" })}>
              <Text style={styles.tglText}>{formatTglIndo(dtAkhir)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLaporan(userData?.id_mitra, true)} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : laporan && (
          <View>
            {/* 1. Omzet & Transaksi */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryBox, { borderLeftColor: '#2196F3', borderLeftWidth: 4 }]}>
                <Text style={styles.summaryLabel}>OMZET</Text>
                <Text style={styles.summaryValue}>{formatRupiah(laporan.summary_penjualan?.omzet)}</Text>
              </View>
              <View style={[styles.summaryBox, { borderLeftColor: '#FF9800', borderLeftWidth: 4 }]}>
                <Text style={styles.summaryLabel}>TRANSAKSI</Text>
                <Text style={styles.summaryValue}>{laporan.summary_penjualan?.total_transaksi} Nota</Text>
              </View>
            </View>

            {/* 2. Grafik Penjualan */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tren Penjualan</Text>
              <LineChart
                data={{ labels, datasets: [{ data: values }] }}
                width={screenWidth - 45}
                height={180}
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
                  labelColor: () => "#999",
                  decimalPlaces: 0,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.primary }
                }}
                bezier
                style={{ borderRadius: 10, marginLeft: -15 }}
              />
            </View>

            {/* 3. Piutang Pelanggan (hutang_xx) */}
            <View style={[styles.card, { borderTopWidth: 3, borderTopColor: Colors.primary }]}>
              <Text style={styles.cardTitle}>Piutang Pelanggan</Text>
              <View style={styles.hRow}>
                <View style={styles.hCol}>
                  <Text style={styles.hLabel}>Belum Lunas</Text>
                  <Text style={[styles.hValue, { color: Colors.primary }]}>{formatRupiah(laporan.summary_hutang?.total_belum_lunas)}</Text>
                </View>
                <View style={styles.hCol}>
                  <Text style={styles.hLabel}>Sudah Lunas</Text>
                  <Text style={[styles.hValue, { color: '#2e7d32' }]}>{formatRupiah(laporan.summary_hutang?.total_lunas)}</Text>
                </View>
              </View>
            </View>

            {/* 4. Logistik & Pengeluaran */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Aktivitas Biaya & Stok</Text>
              <View style={styles.logistikRow}>
                <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}>
                  <Ionicons name="download-outline" size={20} color="#1976d2" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.logistikLabel}>Stok Masuk</Text>
                  <Text style={styles.logistikSub}>{laporan.summary_produk_masuk?.total_transaksi_produk_masuk || 0} Trx</Text>
                </View>
                <Text style={styles.logistikValue}>+{laporan.summary_produk_masuk?.total_qty_masuk || 0} Pcs</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.logistikRow}>
                <View style={[styles.iconBox, { backgroundColor: '#fff3e0' }]}>
                  <Ionicons name="trending-down-outline" size={20} color="#f57c00" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.logistikLabel}>Pengeluaran</Text>
                  <Text style={styles.logistikSub}>{laporan.summary_pengeluaran?.total_transaksi_pengeluaran || 0} Trx</Text>
                </View>
                <Text style={[styles.logistikValue, { color: '#d32f2f' }]}>-{formatRupiah(laporan.summary_pengeluaran?.total_pengeluaran)}</Text>
              </View>
            </View>

            {/* 5. Top 10 Produk Terlaris */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>10 Produk Terlaris</Text>
              {laporan.produk_terlaris?.map((item: any, index: number) => (
                <View key={index} style={styles.produkRow}>
                  <View style={styles.produkRank}><Text style={styles.rankText}>{index + 1}</Text></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.produkNama}>{item.nama_produk}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.barFill, { width: `${Math.min((item.total_qty / (laporan.produk_terlaris[0].total_qty || 1)) * 100, 100)}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.produkQty}>{item.total_qty} <Text style={{fontSize: 9}}>Qty</Text></Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {showPicker.show && (
        <DateTimePicker
          value={showPicker.field === "awal" ? dtAwal : dtAkhir}
          mode="date"
          onChange={(e, d) => {
            setShowPicker({ show: false, field: "" });
            if (d) { if (showPicker.field === "awal") setDtAwal(d); else setDtAkhir(d); }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa" },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 25 },
  backRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "bold" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 11 },

  periodeContainer: { marginTop: -15, paddingHorizontal: 15 },
  periodeCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', elevation: 4 },
  periodeTextRow: { flexDirection: 'row', marginLeft: 10, alignItems: 'center' },
  tglText: { fontWeight: 'bold', color: Colors.primary, fontSize: 13, borderBottomWidth: 1, borderBottomColor: Colors.primary },
  smdText: { color: '#999', marginHorizontal: 5 },

  summaryGrid: { flexDirection: 'row', paddingHorizontal: 10, marginTop: 15 },
  summaryBox: { flex: 1, backgroundColor: '#fff', margin: 5, padding: 15, borderRadius: 15, elevation: 2 },
  summaryLabel: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  summaryValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4, color: '#333' },

  card: { backgroundColor: "#fff", marginHorizontal: 15, marginTop: 15, borderRadius: 15, padding: 15, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 15 },

  hRow: { flexDirection: 'row' },
  hCol: { flex: 1 },
  hLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase' },
  hValue: { fontSize: 14, fontWeight: 'bold', marginTop: 3 },

  logistikRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logistikLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  logistikSub: { fontSize: 10, color: '#999' },
  logistikValue: { fontSize: 13, fontWeight: 'bold', color: '#1976d2' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },

  produkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  produkRank: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: 'bold', color: '#777' },
  produkNama: { fontSize: 13, color: '#333' },
  barContainer: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary },
  produkQty: { marginLeft: 10, fontWeight: 'bold', color: Colors.primary, fontSize: 13 }
});