import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import Colors from "../../constants/colors";
import {
  getPengeluaranList,
  tambahPengeluaran,
  hapusPengeluaran,
} from "../../services/pengeluaran";

// --- Types ---
type UserData = {
  id_user: number;
  nama_lengkap: string;
  id_mitra: number;
};

type PengeluaranItem = {
  id_pengeluaran: number;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  nama_lengkap: string;
};

export default function PengeluaranScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [items, setItems] = useState<PengeluaranItem[]>([]);
  const [totalNominal, setTotalNominal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [keyword, setKeyword] = useState("");
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [dtInput, setDtInput] = useState(new Date());
  const [kategori, setKategori] = useState("");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [picker, setPicker] = useState({ show: false, field: "" });

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!userData?.id_mitra) return;
    const timer = setTimeout(() => fetchList(userData.id_mitra, false), 350);
    return () => clearTimeout(timer);
  }, [keyword, dtAwal, dtAkhir]);

  const formatRupiah = (val: number) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];
  const formatDateIndo = (date: Date) => date.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

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
      const result = await getPengeluaranList({
        id_mitra,
        keyword,
        tanggal_awal: formatDateDb(dtAwal),
        tanggal_akhir: formatDateDb(dtAkhir),
      });
      if (result.success) {
        setItems(result.data?.items || []);
        setTotalNominal(Number(result.data?.total_nominal || 0));
      }
    } catch (e) { console.log("Fetch Error"); }
    finally { setRefreshing(false); }
  };

  const handleSubmit = async () => {
    if (!kategori || !nominal || !userData) {
      Alert.alert("Validasi", "Kategori dan Nominal wajib diisi");
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await tambahPengeluaran({
        tanggal: formatDateDb(dtInput),
        kategori,
        nominal: Number(nominal),
        keterangan,
        id_user: userData.id_user,
        id_mitra: userData.id_mitra,
      });

      if (result.success) {
        setShowModal(false);
        resetForm();
        fetchList(userData.id_mitra, false);
        Alert.alert("Sukses", "Pengeluaran berhasil dicatat");
      }
    } catch (e) { Alert.alert("Error", "Gagal menyimpan data"); }
    finally { setSubmitLoading(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Konfirmasi", "Hapus catatan pengeluaran ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
          const result = await hapusPengeluaran({ id_pengeluaran: id, id_mitra: userData!.id_mitra });
          if (result.success) fetchList(userData!.id_mitra, false);
      }}
    ]);
  };

  const resetForm = () => {
    setDtInput(new Date());
    setKategori("");
    setNominal("");
    setKeterangan("");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Pengeluaran</Text>
            <Text style={styles.headerSub}>Catat biaya operasional toko</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(userData?.id_mitra!, true)} />}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Pengeluaran Periode Ini</Text>
            <Text style={styles.summaryValue}>{formatRupiah(totalNominal)}</Text>
          </View>
          <Ionicons name="stats-chart" size={40} color="rgba(255,255,255,0.3)" style={styles.summaryIcon} />
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <TextInput style={styles.input} placeholder="Cari kategori atau keterangan..." value={keyword} onChangeText={setKeyword} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setPicker({ show: true, field: "awal" })}>
              <Text style={styles.dateText}>Dari: {formatDateIndo(dtAwal)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setPicker({ show: true, field: "akhir" })}>
              <Text style={styles.dateText}>Ke: {formatDateIndo(dtAkhir)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List Data */}
        <View style={styles.listContainer}>
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : items.map((item) => (
            <View key={item.id_pengeluaran} style={styles.itemCard}>
              <View style={styles.itemTopRow}>
                <View>
                  <Text style={styles.itemKategori}>{item.kategori}</Text>
                  <Text style={styles.itemTanggal}>{item.tanggal} • {item.nama_lengkap}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id_pengeluaran)}>
                  <Ionicons name="trash-outline" size={20} color="#ff5252" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemNominal}>{formatRupiah(item.nominal)}</Text>
              {item.keterangan ? <Text style={styles.itemKet}>{item.keterangan}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal Tambah */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pengeluaran</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Tanggal</Text>
              <TouchableOpacity style={styles.input} onPress={() => setPicker({ show: true, field: "input" })}>
                <Text style={{ marginTop: 12 }}>{formatDateIndo(dtInput)}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Kategori</Text>
              <TextInput style={styles.input} placeholder="Contoh: Listrik, Gaji, ATK" value={kategori} onChangeText={setKategori} />

              <Text style={styles.label}>Nominal (Rp)</Text>
              <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={nominal} onChangeText={setNominal} />

              <Text style={styles.label}>Keterangan</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} multiline placeholder="Catatan tambahan..." value={keterangan} onChangeText={setKeterangan} />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitLoading}>
                {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Simpan Pengeluaran</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {picker.show && (
        <DateTimePicker
          value={picker.field === "awal" ? dtAwal : picker.field === "akhir" ? dtAkhir : dtInput}
          mode="date"
          onChange={(e, d) => {
            setPicker({ show: false, field: "" });
            if (d) {
              if (picker.field === "awal") setDtAwal(d);
              else if (picker.field === "akhir") setDtAkhir(d);
              else setDtInput(d);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerSub: { color: "#fff", fontSize: 11, opacity: 0.8 },
  addBtn: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  addBtnText: { color: Colors.primary, fontWeight: "bold", fontSize: 12 },

  summaryCard: { backgroundColor: Colors.primary, margin: 12, borderRadius: 15, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  summaryInfo: { flex: 1, zIndex: 2 },
  summaryLabel: { color: '#fff', fontSize: 12, opacity: 0.9 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 5 },
  summaryIcon: { position: 'absolute', right: -10, bottom: -10 },

  filterCard: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 12, borderRadius: 12, padding: 12, elevation: 2 },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, height: 45, paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#fcfcfc' },
  dateText: { fontSize: 12, color: '#555' },

  listContainer: { paddingHorizontal: 12 },
  itemCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 10, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#ff5252' },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'flex-start' },
  itemKategori: { fontSize: 14, fontWeight: "bold", color: "#333" },
  itemTanggal: { fontSize: 11, color: "#999", marginTop: 2 },
  itemNominal: { fontSize: 18, fontWeight: "bold", color: "#ff5252", marginTop: 8 },
  itemKet: { fontSize: 12, color: "#666", marginTop: 5, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: "bold" },
  label: { fontSize: 12, fontWeight: "bold", marginBottom: 5, color: "#666" },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 15 },
  submitBtnText: { color: "#fff", fontWeight: "bold" }
});