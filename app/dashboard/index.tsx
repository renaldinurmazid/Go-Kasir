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
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

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
    { title: "Produk", icon: "cube", route: "/produk" },
    { title: "Penjualan", icon: "cart", route: "/penjualan" },
    { title: "Produk Masuk", icon: "download", route: "/produk-masuk" },
    { title: "History Penjualan", icon: "time", route: "/history-penjualan" },
    { title: "Pengeluaran", icon: "wallet", route: "/pengeluaran" },
    { title: "Hutang", icon: "cash", route: "/hutang" },
    { title: "Stok", icon: "layers", route: "/stok" },
    { title: "Laporan", icon: "bar-chart", route: "/laporan" },
    { title: "Printer", icon: "print", route: "/settings/printer" },
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

      if (!user?.id_mitra) {
        Alert.alert("Error", "ID mitra tidak ditemukan.");
        return;
      }

      setUserData(user);
      await fetchSummary(user.id_mitra, false);
    } catch (error: any) {
      console.log("INIT DASHBOARD ERROR:", error?.message || error);
      Alert.alert("Error", "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (id_mitra: number, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const result = await getDashboardSummary(id_mitra);

      if (!result.success) {
        Alert.alert("Gagal", result.message || "Gagal memuat summary dashboard");
        return;
      }

      setSummary(result.data || {});
    } catch (error: any) {
      console.log("FETCH DASHBOARD ERROR:", error?.response?.data || error?.message);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal memuat data dashboard"
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!userData?.id_mitra) return;
    await fetchSummary(userData.id_mitra, true);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["auth_token", "user_data"]);
    router.replace("/login");
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>
            Selamat datang, {userData?.nama_lengkap || "Admin"}
          </Text>
      </View>

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData?.nama_lengkap?.charAt(0)?.toUpperCase() || "A"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>
            {userData?.nama_lengkap || "Admin"}
          </Text>
          <Text style={styles.userRole}>
            {userData?.nama_toko || "GoKasir"}
          </Text>
          <Text style={styles.userDesc}>Kelola penjualan dengan lebih cepat</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        {menu.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ringkasan Hari Ini</Text>

        {loading ? (
          <View style={styles.summaryLoadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat summary...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Total Transaksi</Text>
                <Text style={styles.summaryValue}>
                  {summary.total_transaksi || 0}
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Total Penjualan</Text>
                <Text style={styles.summaryValue}>
                  {formatRupiah(summary.total_penjualan || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Produk Aktif</Text>
                <Text style={styles.summaryValue}>
                  {summary.produk_aktif || 0}
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Kasir Aktif</Text>
                <Text style={styles.summaryValue}>
                  {summary.kasir_aktif || 0}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Grafik Penjualan 10 Hari Terakhir</Text>

        <LineChart
          data={{
            labels: chartLabels,
            datasets: [
              {
                data: chartValues,
              },
            ],
          }}
          width={screenWidth - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          withInnerLines
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLabels
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: () => Colors.primary,
            labelColor: () => "#666",
            propsForDots: {
              r: "4",
              strokeWidth: "1",
              stroke: Colors.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  headerSub: {
    color: "#fff",
    marginTop: 4,
    fontSize: 14,
  },

  userCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  userRole: {
    color: Colors.text,
    fontSize: 14,
    marginTop: 2,
  },

  userDesc: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },

  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginBottom: 6,
  },

  menuItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 20,
  },

  menuText: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
    color: Colors.text,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: Colors.text,
  },

  summaryLoadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  loadingText: {
    marginTop: 8,
    color: "#666",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  summaryBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#F3CACA",
    borderRadius: 10,
    padding: 10,
  },

  summaryTitle: {
    fontSize: 12,
    color: "#777",
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    color: Colors.text,
  },

  chart: {
    borderRadius: 12,
  },

  logoutButton: {
    margin: 16,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});