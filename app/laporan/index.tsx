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
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import { getLaporanSummary } from "../../services/laporan";

const screenWidth = Dimensions.get("window").width;

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

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

  const formatTglIndo = (date: Date) => date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];

  const initializePage = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("user_data");
      if (!stored) return router.replace("/login");
      const user = JSON.parse(stored);
      setUserData(user);
      await fetchLaporan(user.id_mitra, false);
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
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Laporan Performa</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.periodeSection}>
            <View style={styles.periodeRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <TouchableOpacity onPress={() => setShowPicker({ show: true, field: "awal" })}>
                    <Text style={styles.tglText}>{formatTglIndo(dtAwal)}</Text>
                </TouchableOpacity>
                <Text style={styles.smdText}>s/d</Text>
                <TouchableOpacity onPress={() => setShowPicker({ show: true, field: "akhir" })}>
                    <Text style={styles.tglText}>{formatTglIndo(dtAkhir)}</Text>
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLaporan(userData?.id_mitra, true)} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Menganalisa data...</Text>
          </View>
        ) : laporan && (
          <View>
            {/* 1. Omzet & Transaksi */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total Omzet</Text>
                <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatRupiah(laporan.summary_penjualan?.omzet)}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total Transaksi</Text>
                <Text style={styles.summaryValue}>{laporan.summary_penjualan?.total_transaksi} Nota</Text>
              </View>
            </View>

            {/* 2. Grafik Penjualan */}
            <View style={styles.reportCard}>
              <Text style={styles.cardTitle}>Tren Omzet Harian</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{ labels, datasets: [{ data: values }] }}
                  width={screenWidth - 72}
                  height={200}
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    color: (opacity = 1) => `rgba(225, 37, 37, ${opacity})`,
                    labelColor: () => "#94A3B8",
                    decimalPlaces: 0,
                    propsForDots: { r: "5", strokeWidth: "2", stroke: Colors.primary },
                    propsForBackgroundLines: { strokeDasharray: "" },
                  }}
                  bezier
                  style={styles.chartStyle}
                />
              </View>
            </View>

            {/* 3. Piutang Pelanggan */}
            <View style={[styles.reportCard, { borderLeftWidth: 4, borderLeftColor: Colors.primary }]}>
              <Text style={styles.cardTitle}>Riwayat Piutang</Text>
              <View style={styles.hGrid}>
                <View style={styles.hItem}>
                  <Text style={styles.hLabel}>Pending</Text>
                  <Text style={[styles.hValue, { color: Colors.primary }]}>{formatRupiah(laporan.summary_hutang?.total_belum_lunas)}</Text>
                </View>
                <View style={styles.hItem}>
                  <Text style={styles.hLabel}>Terselesaikan</Text>
                  <Text style={[styles.hValue, { color: '#16A34A' }]}>{formatRupiah(laporan.summary_hutang?.total_lunas)}</Text>
                </View>
              </View>
            </View>

            {/* 4. Logistik Row Cards */}
            <View style={styles.reportCard}>
                <Text style={styles.cardTitle}>Aset & Biaya</Text>
                <View style={styles.logRow}>
                    <View style={styles.logIconBox}>
                        <Ionicons name="cube-outline" size={20} color="#1E40AF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.logLabel}>Restock Produk</Text>
                        <Text style={styles.logSub}>{laporan.summary_produk_masuk?.total_transaksi_produk_masuk || 0} Trx</Text>
                    </View>
                    <Text style={styles.logValue}>+{laporan.summary_produk_masuk?.total_qty_masuk || 0} Pcs</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.logRow}>
                    <View style={[styles.logIconBox, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.logLabel}>Biaya Operasional</Text>
                        <Text style={styles.logSub}>{laporan.summary_pengeluaran?.total_transaksi_pengeluaran || 0} Trx</Text>
                    </View>
                    <Text style={[styles.logValue, { color: Colors.primary }]}>-{formatRupiah(laporan.summary_pengeluaran?.total_pengeluaran)}</Text>
                </View>
            </View>

            {/* 5. Top 10 Produk */}
            <View style={styles.reportCard}>
              <View style={styles.bestSellerHeader}>
                <Text style={styles.cardTitle}>10 Produk Terlaris</Text>
                <Ionicons name="trophy-outline" size={18} color="#D1A000" />
              </View>
              <View style={{ marginTop: 16 }}>
                {laporan.produk_terlaris?.map((item: any, index: number) => (
                  <View key={index} style={styles.bestSellerRow}>
                    <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={styles.bestSellerName}>{item.nama_produk}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min((item.total_qty / (laporan.produk_terlaris[0].total_qty || 1)) * 100, 100)}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.bestSellerQty}>{item.total_qty} <Text style={{fontSize: 10, color: '#94A3B8'}}>Qty</Text></Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  periodeSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: "center",
  },
  periodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tglText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  smdText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "center",
    marginTop: 8,
    marginLeft: -20,
  },
  chartStyle: {
    borderRadius: 16,
  },
  hGrid: {
    flexDirection: "row",
    gap: 16,
  },
  hItem: {
    flex: 1,
  },
  hLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  hValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  logIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  logLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  logSub: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  logValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  bestSellerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bestSellerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  bestSellerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  bestSellerQty: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },
  loadingBox: {
    paddingVertical: 80,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});