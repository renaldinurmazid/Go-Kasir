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
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import { getHutangList, lunasiHutang } from "../../services/hutang";

// --- Types ---
type HutangItem = {
  id_hutang: number;
  nama_pelanggan: string;
  nominal: number;
  tanggal_hutang: string;
  jatuh_tempo: string;
  catatan: string | null;
  status_hutang: string; // lunas / belum_lunas
  tanggal_lunas: string;
  id_user: number;
  id_mitra: number;
  nama_lengkap?: string;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function HutangScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [items, setItems] = useState<HutangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
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

  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr || dateStr.startsWith('0000')) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatDateHeader = (date: Date) => date.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

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
    else setListLoading(true);
    
    try {
      const result = await getHutangList({
        id_mitra,
        keyword,
        status_hutang: statusHutang,
        tanggal_awal: formatDateDb(dtAwal),
        tanggal_akhir: formatDateDb(dtAkhir),
      });

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
    finally { 
        setRefreshing(false);
        setListLoading(false);
    }
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
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hutang Pelanggan</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color={Colors.textSoft} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari pelanggan..."
              placeholderTextColor={Colors.textSoft}
              value={keyword}
              onChangeText={setKeyword}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowPicker({ show: true, field: "awal" })}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {formatDateHeader(dtAwal)}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          {[{l: 'Semua', v: ''}, {l: 'Belum Lunas', v: 'belum_lunas'}, {l: 'Lunas', v: 'lunas'}].map((s) => (
            <TouchableOpacity 
              key={s.v} 
              style={[styles.statusPill, statusHutang === s.v && styles.statusPillActive]} 
              onPress={() => setStatusHutang(s.v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusPillText, statusHutang === s.v && styles.statusPillTextActive]}>
                {s.l}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchList(userData?.id_mitra!, true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary Info Boxes */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Hutang</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatRupiah(summary.belum_lunas)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Telah Dilunasi</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{formatRupiah(summary.lunas)}</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {items.length} Data Pelanggan
          </Text>
          <Text style={styles.listSubHeaderText}>
            Monitoring pembayaran piutang
          </Text>
        </View>

        {loading || (listLoading && items.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => (
            <View key={item.id_hutang} style={styles.debtCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person-outline" size={24} color={item.status_hutang === 'lunas' ? '#16A34A' : Colors.primary} />
                </View>
                
                <View style={styles.cardMainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.customerName}>{item.nama_pelanggan}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: item.status_hutang === 'lunas' ? '#F0FDF4' : '#FEF2F2' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: item.status_hutang === 'lunas' ? '#16A34A' : Colors.primary }
                      ]}>
                        {item.status_hutang === 'lunas' ? 'LUNAS' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubText}>Dibuat: {formatDateIndo(item.tanggal_hutang)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.amountGrid}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Nominal</Text>
                  <Text style={styles.amountValue}>{formatRupiah(item.nominal)}</Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Jatuh Tempo</Text>
                  <Text style={[styles.amountValue, { color: item.status_hutang === 'belum_lunas' ? '#DC2626' : '#64748B' }]}>
                    {formatDateIndo(item.jatuh_tempo)}
                  </Text>
                </View>
              </View>

              {item.catatan && (
                <View style={styles.noteBox}>
                  <Ionicons name="document-text-outline" size={14} color="#94A3B8" />
                  <Text style={styles.noteText}>{item.catatan}</Text>
                </View>
              )}

              {item.status_hutang === "belum_lunas" && (
                <TouchableOpacity 
                  style={styles.payButton} 
                  onPress={() => handleLunasi(item.id_hutang)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                  <Text style={styles.payButtonText}>Lunasi Hutang</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search" size={48} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
            <Text style={styles.emptySub}>Coba cari dengan kata kunci atau filter lain.</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  statusScroll: {
    paddingBottom: 4,
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
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
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  listSubHeaderText: {
    fontSize: 13,
    color: Colors.textSoft,
    marginTop: 2,
  },
  debtCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardMainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardSubText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  amountGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  noteBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
  payButton: {
    backgroundColor: "#16A34A",
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});