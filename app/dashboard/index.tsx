import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "../../constants/colors";
import { getDashboardSummary } from "../../services/dashboard";

const screenWidth = Dimensions.get("window").width;

type UserData = {
  id_user: number;
  nama_lengkap: string;
  username: string;
  role: string;
  id_mitra: number;
  nama_toko?: string;
};

type GrafikItem = {
  tanggal: string;
  label: string;
  total: number;
};

type DashboardSummary = {
  total_transaksi: number;
  total_penjualan: number;
  produk_aktif: number;
  kasir_aktif: number;
  grafik: GrafikItem[];
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function DashboardScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    total_transaksi: 0,
    total_penjualan: 0,
    produk_aktif: 0,
    kasir_aktif: 0,
    grafik: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const menu = [
    { title: "Produk", icon: "cube", route: "/produk", color: "#6366F1" },
    { title: "Penjualan", icon: "cart", route: "/penjualan", color: "#10B981" },
    { title: "Input Stok", icon: "download", route: "/produk-masuk", color: "#F59E0B" },
    { title: "History", icon: "time", route: "/history-penjualan", color: "#3B82F6" },
    { title: "Pengeluaran", icon: "wallet", route: "/pengeluaran", color: "#EF4444" },
    { title: "Hutang", icon: "cash", route: "/hutang", color: "#8B5CF6" },
    { title: "Stok", icon: "layers", route: "/stok", color: "#EC4899" },
    { title: "Laporan", icon: "bar-chart", route: "/laporan", color: "#06B6D4" },
    { title: "Printer", icon: "print", route: "/settings/printer", color: "#64748B" },
    { title: "Info Toko", icon: "business", route: "/settings/info-toko", color: "#1E293B" },
  ];

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) {
        Alert.alert("Session Habis", "Silakan login kembali.");
        router.replace("/login");
        return;
      }
      const user: UserData = JSON.parse(storedUser);
      setUserData(user);
      if (user?.id_mitra) {
        await fetchSummary(user.id_mitra, false);
      }
    } catch (error: any) {
      Alert.alert("Error", "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (id_mitra: number, isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const result = await getDashboardSummary(id_mitra);
      if (result.success) {
        setSummary(result.data || {});
      }
    } catch (error: any) {
      console.log("FETCH DASHBOARD ERROR:", error?.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!userData?.id_mitra) return;
    await fetchSummary(userData.id_mitra, true);
  };

  const handleLogout = async () => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove(["auth_token", "user_data"]);
          router.replace("/login");
        },
      },
    ]);
  };

  const chartLabels =
    summary.grafik?.length > 0
      ? summary.grafik.map((item) => item.label)
      : ["-", "-", "-", "-", "-"];

  const chartValues =
    summary.grafik?.length > 0
      ? summary.grafik.map((item) => Number(item.total || 0))
      : [0, 0, 0, 0, 0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Selamat bekerja,</Text>
            <Text style={styles.userName}>{userData?.nama_lengkap || "Admin"}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.profileAction}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userData?.nama_lengkap?.charAt(0)?.toUpperCase() || "A"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.storeCard}>
          <View style={styles.storeIconContainer}>
            <Ionicons name="storefront" size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.storeName}>{userData?.nama_toko || "Toko GoKasir"}</Text>
            <Text style={styles.storeSystem}>Sistem Kasir v1.0</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { backgroundColor: "#E0F2FE" }]}>
            <View style={[styles.statIconCircle, { backgroundColor: "#BAE6FD" }]}>
              <Ionicons name="receipt" size={20} color="#0369A1" />
            </View>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={styles.statValue}>{summary.total_transaksi || 0}</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: "#DCFCE7" }]}>
            <View style={[styles.statIconCircle, { backgroundColor: "#BBF7D0" }]}>
              <Ionicons name="trending-up" size={20} color="#15803D" />
            </View>
            <Text style={styles.statLabel}>Penjualan</Text>
            <Text style={styles.statValue}>{formatRupiah(summary.total_penjualan || 0)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Layanan Utama</Text>
        </View>

        <View style={styles.menuGrid}>
          {menu.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuBox}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: item.color + "15" }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Grafik Penjualan (10 Hari)</Text>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartValues }],
            }}
            width={screenWidth - 48}
            height={180}
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(225, 37, 37, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(138, 138, 138, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>

        <View style={styles.otherStats}>
          <View style={styles.otherStatCard}>
            <Ionicons name="cube-outline" size={20} color={Colors.textSoft} />
            <Text style={styles.otherStatLabel}>Produk Aktif</Text>
            <Text style={styles.otherStatValue}>{summary.produk_aktif || 0}</Text>
          </View>
          <View style={styles.otherStatCard}>
            <Ionicons name="people-outline" size={20} color={Colors.textSoft} />
            <Text style={styles.otherStatLabel}>Kasir Aktif</Text>
            <Text style={styles.otherStatValue}>{summary.kasir_aktif || 0}</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSoft,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  profileAction: {
    padding: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  storeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  storeSystem: {
    fontSize: 12,
    color: Colors.textSoft,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: "row",
    paddingHorizontal: 24,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryItem: {
    width: (screenWidth - 60) / 2,
    padding: 16,
    borderRadius: 20,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSoft,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  menuBox: {
    width: (screenWidth - 32) / 3 - 8,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  menuIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 16,
  },
  chart: {
    paddingRight: 32,
    marginLeft: -16,
  },
  otherStats: {
    flexDirection: "row",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  otherStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  otherStatLabel: {
    fontSize: 12,
    color: Colors.textSoft,
    marginTop: 8,
  },
  otherStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
});