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
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import { getHutangList, lunasiHutang } from "../../services/hutang";

// --- Types Sesuai hutang_xx ---
type HutangItem = {
  id_hutang: number;
  nama_pelanggan: string;
  nominal: number;
  tanggal_hutang: string; // DATETIME dari DB
  jatuh_tempo: string;    // DATETIME dari DB
  catatan: string | null;
  status_hutang: string;  // lunas / belum_lunas
  tanggal_lunas: string;
  id_user: number;
  id_mitra: number;
  nama_lengkap?: string; // Biasanya hasil JOIN di backend
};

export default function HutangScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [items, setItems] = useState<HutangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Summary State
  const [summary, setSummary] = useState({ lunas: 0, belum_lunas: 0 });

  // Filter State
  const [keyword, setKeyword] = useState("");
  const [statusHutang, setStatusHutang] = useState("");
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, field: "" });

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!userData?.id_mitra) return;
    const timer = setTimeout(() => fetchList(userData.id_mitra, false), 350);
    return () => clearTimeout(timer);
  }, [keyword, statusHutang, dtAwal, dtAkhir, userData?.id_mitra]);

  const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr || dateStr.startsWith('0000')) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const initializePage = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) { router.replace("/login"); return; }
      const user = JSON.parse(storedUser);
      setUserData(user);
      await fetchList(user.id_mitra, false);
    } catch (e) { Alert.alert("Error", "Gagal memuat data"); }
    finally { setLoading(false); }
  };

  const fetchList = async (id_mitra: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await getHutangList({
        id_mitra,
        keyword,
        status_hutang: statusHutang,
        tanggal_awal: formatDateDb(dtAwal),
        tanggal_akhir: formatDateDb(dtAkhir),
      });
	  console.log("Response API:", result);

      if (result.success) {
        const data: HutangItem[] = result.data?.items || [];
        setItems(data);
        
        // Hitung Summary Lunas vs Belum Lunas
        const sum = data.reduce((acc, curr) => {
          if (curr.status_hutang === 'lunas') acc.lunas += Number(curr.nominal);
          else acc.belum_lunas += Number(curr.nominal);
          return acc;
        }, { lunas: 0, belum_lunas: 0 });
        setSummary(sum);
      }
    } catch (e) { console.log("Fetch Error", e); }
    finally { setRefreshing(false); }
  };

  const handleLunasi = (id_hutang: number) => {
    Alert.alert("Konfirmasi", "Tandai hutang ini sudah lunas?", [
      { text: "Batal", style: "cancel" },
      { text: "Ya, Lunasi", onPress: async () => {
          try {
            const result = await lunasiHutang({ id_hutang, id_mitra: userData.id_mitra });
            if (result.success) {
              fetchList(userData.id_mitra, false);
              Alert.alert("Sukses", "Data diperbarui");
            }
          } catch (e) { Alert.alert("Error", "Gagal melunasi"); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Hutang Pelanggan</Text>
            <Text style={styles.headerSub}>Dari Transaksi Penjualan Hutang</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(userData?.id_mitra!, true)} />}>
        
        {/* Summary Card */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryItem, { borderLeftColor: '#4CAF50' }]}>
             <Text style={styles.summaryLabel}>TOTAL LUNAS</Text>
             <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>{formatRupiah(summary.lunas)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderLeftColor: Colors.primary, marginTop: 12 }]}>
             <Text style={styles.summaryLabel}>TOTAL BELUM LUNAS</Text>
             <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatRupiah(summary.belum_lunas)}</Text>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterCard}>
          <TextInput 
            style={styles.input} 
            placeholder="Cari nama pelanggan..." 
            value={keyword} 
            onChangeText={setKeyword} 
          />

          <View style={styles.statusFilterRow}>
            {[{l: 'Semua', v: ''}, {l: 'Pending', v: 'belum_lunas'}, {l: 'Lunas', v: 'lunas'}].map((s) => (
              <TouchableOpacity 
                key={s.v} 
                style={[styles.statusTab, statusHutang === s.v && styles.statusTabActive]}
                onPress={() => setStatusHutang(s.v)}
              >
                <Text style={[styles.statusTabText, statusHutang === s.v && styles.statusTabTextActive]}>{s.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List Data */}
        <View style={styles.listContainer}>
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : items.map((item) => (
            <View key={item.id_hutang} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.nama_pelanggan}</Text>
                  <Text style={styles.itemDate}>Dibuat: {formatDateIndo(item.tanggal_hutang)}</Text>
                </View>
                <View style={[styles.badge, item.status_hutang === 'lunas' ? styles.badgeLunas : styles.badgeBelum]}>
                  <Text style={[styles.badgeText, { color: item.status_hutang === 'lunas' ? '#2e7d32' : Colors.primary }]}>
                    {item.status_hutang === 'lunas' ? 'LUNAS' : 'PENDING'}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemNominal}>{formatRupiah(item.nominal)}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="alarm-outline" size={14} color="#d32f2f" />
                <Text style={[styles.infoText, { color: '#d32f2f', fontWeight: 'bold' }]}>
                  Tempo: {formatDateIndo(item.jatuh_tempo)}
                </Text>
              </View>

              {item.catatan && (
                <View style={styles.catatanBox}>
                   <Text style={styles.catatanText}>{item.catatan}</Text>
                </View>
              )}

              {item.status_hutang === "belum_lunas" && (
                <TouchableOpacity style={styles.lunasBtn} onPress={() => handleLunasi(item.id_hutang)}>
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.lunasBtnText}>Set Lunas</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {showPicker.show && (
        <DateTimePicker
          value={showPicker.field === "awal" ? dtAwal : dtAkhir}
          mode="date"
          onChange={(e, d) => {
            setShowPicker({ show: false, field: "" });
            if (d) {
              if (showPicker.field === "awal") setDtAwal(d);
              else setDtAkhir(d);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f7" },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 20 },
  backRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerSub: { color: "#fff", fontSize: 11, opacity: 0.7 },
  summarySection: { backgroundColor: "#fff", margin: 12, borderRadius: 15, padding: 16, elevation: 3 },
  summaryItem: { paddingLeft: 12, borderLeftWidth: 4 },
  summaryLabel: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  summaryValue: { fontSize: 22, fontWeight: 'bold' },
  filterCard: { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 12, padding: 12, elevation: 1 },
  row: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, height: 45, paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  dateInput: { flex: 1, justifyContent: 'center' },
  dateText: { fontSize: 11, color: '#444' },
  statusFilterRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  statusTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0' },
  statusTabActive: { backgroundColor: Colors.primary },
  statusTabText: { fontSize: 11, color: '#666' },
  statusTabTextActive: { color: '#fff', fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 12, marginTop: 10 },
  itemCard: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: 'bold' },
  itemDate: { fontSize: 10, color: '#999' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeLunas: { backgroundColor: '#e8f5e9' },
  badgeBelum: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  itemNominal: { fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 11 },
  catatanBox: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8, marginTop: 8 },
  catatanText: { fontSize: 11, color: '#777', fontStyle: 'italic' },
  lunasBtn: { backgroundColor: '#2e7d32', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, marginTop: 15 },
  lunasBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});