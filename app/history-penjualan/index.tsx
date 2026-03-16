import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import {
  getDetailPenjualan,
  getHistoryPenjualan,
} from "../../services/historyPenjualan";

// Service Tambahan untuk Cetak
import { buildStrukText } from "../../utils/strukFormatter";
import { printStruk } from "../../services/printerService";

// --- Types ---
type UserData = {
  id_user: number;
  nama_lengkap: string;
  id_mitra: number;
};

type HistoryItem = {
  id_penjualan: number;
  tanggal: string;
  nama_lengkap: string;
  metode_pembayaran: string;
  total: number;
  bayar: number;
  kembalian: number;
};

type DetailItem = {
  id_detail: number;
  nama_produk: string;
  harga: number;
  qty: number;
  diskon: number;
  total: number;
};

export default function HistoryPenjualanScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [keyword, setKeyword] = useState("");
  const [metode, setMetode] = useState("");
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, field: "" });

  const [items, setItems] = useState<HistoryItem[]>([]);

  // Summary State
  const [summary, setSummary] = useState({ tunai: 0, bank: 0, qris: 0, total: 0 });

  // Detail State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailHeader, setDetailHeader] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!userData?.id_mitra) return;
    const timer = setTimeout(() => fetchHistory(userData.id_mitra, false), 350);
    return () => clearTimeout(timer);
  }, [keyword, metode, dtAwal, dtAkhir]);

  const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];
  const formatDateIndo = (date: Date) => date.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

  const initializePage = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) { router.replace("/login"); return; }
      setUserData(JSON.parse(storedUser));
      await fetchHistory(JSON.parse(storedUser).id_mitra, false);
    } catch (e) { Alert.alert("Error", "Gagal memuat data"); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (id_mitra: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await getHistoryPenjualan({
        id_mitra,
        keyword,
        metode_pembayaran: metode,
        tanggal_awal: formatDateDb(dtAwal),
        tanggal_akhir: formatDateDb(dtAkhir),
      });

      if (result.success) {
        const data: HistoryItem[] = result.data || [];
        setItems(data);

        // Hitung Summary per Cara Bayar
        const sum = data.reduce((acc, curr) => {
          const m = curr.metode_pembayaran.toLowerCase();
          if (m === 'tunai') acc.tunai += curr.total;
          else if (m === 'bank') acc.bank += curr.total;
          else if (m === 'qris') acc.qris += curr.total;
          acc.total += curr.total;
          return acc;
        }, { tunai: 0, bank: 0, qris: 0, total: 0 });
        
        setSummary(sum);
      }
    } catch (e) { console.log("Fetch Error"); }
    finally { setRefreshing(false); }
  };

  const handleOpenDetail = async (id_penjualan: number) => {
    if (!userData?.id_mitra) return;
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const result = await getDetailPenjualan({ id_penjualan, id_mitra: userData.id_mitra });
      if (result.success) {
        setDetailHeader(result.data?.header || null);
        setDetailItems(result.data?.items || []);
      }
    } catch (e) { setShowDetailModal(false); }
    finally { setDetailLoading(false); }
  };

  const handlePrintUlang = async () => {
    try {
      if (!detailHeader) return;
      const dataStruk = { ...detailHeader, items: detailItems, kasir: detailHeader.nama_lengkap };
      const text = buildStrukText(dataStruk);
      const result = await printStruk(text);
      if (result.success) Alert.alert("Preview Struk", result.preview);
    } catch (error) { Alert.alert("Error", "Printer tidak merespon"); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>History Penjualan</Text>
            <Text style={styles.headerSub}>Ringkasan & riwayat transaksi</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(userData?.id_mitra!, true)} />}>
        
        {/* Summary Per Cara Bayar */}
        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
             <Text style={styles.summaryLabel}>TUNAI</Text>
             <Text style={styles.summaryValue}>{formatRupiah(summary.tunai)}</Text>
          </View>
          <View style={styles.summaryItem}>
             <Text style={styles.summaryLabel}>BANK/QRIS</Text>
             <Text style={styles.summaryValue}>{formatRupiah(summary.bank + summary.qris)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderBottomWidth: 0, marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#eee' }]}>
             <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: Colors.primary }]}>TOTAL</Text>
             <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatRupiah(summary.total)}</Text>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterCard}>
          <TextInput style={styles.input} placeholder="Cari No. Transaksi..." value={keyword} onChangeText={setKeyword} />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => setShowPicker({ show: true, field: "awal" })}>
              <Text style={styles.dateText}>{formatDateIndo(dtAwal)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => setShowPicker({ show: true, field: "akhir" })}>
              <Text style={styles.dateText}>{formatDateIndo(dtAkhir)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metodeContainer}>
            {['', 'tunai', 'bank', 'qris'].map((m) => (
              <TouchableOpacity 
                key={m} 
                style={[styles.metodeBadge, metode === m && styles.metodeActive]} 
                onPress={() => setMetode(m)}
              >
                <Text style={[styles.metodeText, metode === m && styles.metodeTextActive]}>
                    {m === '' ? 'Semua' : m.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List Section */}
        <View style={styles.listCard}>
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : items.map((item) => (
            <TouchableOpacity key={item.id_penjualan} style={styles.itemCard} onPress={() => handleOpenDetail(item.id_penjualan)}>
              <View style={styles.itemTopRow}>
                <Text style={styles.invoiceText}>#{item.id_penjualan}</Text>
                <Text style={styles.methodBadge}>{item.metode_pembayaran.toUpperCase()}</Text>
              </View>
              <Text style={styles.itemText}>{item.tanggal} • {item.nama_lengkap}</Text>
              <Text style={styles.itemTotalText}>{formatRupiah(item.total)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal Detail */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>

            {detailLoading ? <ActivityIndicator color={Colors.primary} /> : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {detailHeader && (
                  <View style={styles.detailHeaderBox}>
                    <Text style={styles.detailText}>No: #{detailHeader.id_penjualan}</Text>
                    <Text style={styles.detailText}>Kasir: {detailHeader.nama_lengkap}</Text>
                    <Text style={[styles.detailText, { fontWeight: 'bold', color: Colors.primary }]}>Total: {formatRupiah(detailHeader.total)}</Text>
                  </View>
                )}
                <View style={{ marginTop: 15 }}>
                  {detailItems.map((item) => (
                    <View key={item.id_detail} style={styles.detailItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailItemName}>{item.nama_produk}</Text>
                        <Text style={styles.detailItemSub}>{item.qty} x {formatRupiah(item.harga)}</Text>
                      </View>
                      <Text style={styles.detailItemTotal}>{formatRupiah(item.total)}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.printBtn} onPress={handlePrintUlang}>
                  <Ionicons name="print" size={20} color="#fff" />
                  <Text style={styles.printBtnText}>Cetak Ulang Struk</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 20 },
  backRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "#fff", fontSize: 12, opacity: 0.8 },
  
  summarySection: { backgroundColor: "#fff", margin: 12, borderRadius: 15, padding: 15, elevation: 2 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 12, color: '#666' },
  summaryValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },

  filterCard: { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 15, padding: 15, elevation: 1 },
  row: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, height: 45, paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  dateInput: { flex: 1, justifyContent: 'center' },
  dateText: { fontSize: 12, color: '#444' },
  
  metodeContainer: { flexDirection: 'row', gap: 8, marginTop: 5 },
  metodeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0' },
  metodeActive: { backgroundColor: Colors.primary },
  metodeText: { fontSize: 11, color: '#666' },
  metodeTextActive: { color: '#fff', fontWeight: 'bold' },

  listCard: { paddingHorizontal: 12, marginTop: 10 },
  itemCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 10, elevation: 1 },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  invoiceText: { fontSize: 14, fontWeight: "bold" },
  methodBadge: { fontSize: 10, color: Colors.primary, backgroundColor: '#fff0f0', paddingHorizontal: 8, borderRadius: 5, overflow: 'hidden' },
  itemText: { color: "#888", fontSize: 11 },
  itemTotalText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 5 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  modalTitle: { fontSize: 17, fontWeight: "bold" },
  detailHeaderBox: { backgroundColor: "#f8f9fa", padding: 12, borderRadius: 10 },
  detailText: { fontSize: 13, marginBottom: 3 },
  detailItemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailItemName: { fontSize: 13, fontWeight: '600' },
  detailItemSub: { fontSize: 11, color: '#888' },
  detailItemTotal: { fontSize: 13, fontWeight: 'bold' },
  printBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  printBtnText: { color: "#fff", fontWeight: "bold" }
});