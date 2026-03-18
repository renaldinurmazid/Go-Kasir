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
  nama_toko?: string;
};

type PengeluaranItem = {
  id_pengeluaran: number;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  nama_lengkap: string;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function PengeluaranScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [items, setItems] = useState<PengeluaranItem[]>([]);
  const [totalNominal, setTotalNominal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [keyword, setKeyword] = useState("");
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());

  // Form Modal State
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
    else setListLoading(true);
    
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
    finally { 
        setRefreshing(false); 
        setListLoading(false);
    }
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
          try {
            const result = await hapusPengeluaran({ id_pengeluaran: id, id_mitra: userData!.id_mitra });
            if (result.success) fetchList(userData!.id_mitra, false);
          } catch (e) { Alert.alert("Error", "Gagal menghapus"); }
      }}
    ]);
  };

  const resetForm = () => {
    setDtInput(new Date());
    setKategori("");
    setNominal("");
    setKeterangan("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
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
          <Text style={styles.headerTitle}>Biaya Operasional</Text>
          <TouchableOpacity 
            style={styles.headerAddButton} 
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.headerAddButtonText}>Baru</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color={Colors.textSoft} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari biaya..."
              placeholderTextColor={Colors.textSoft}
              value={keyword}
              onChangeText={setKeyword}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setPicker({ show: true, field: "awal" })}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {formatDateIndo(dtAwal)}
            </Text>
          </TouchableOpacity>
        </View>
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
        {/* Summary Box */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatRupiah(totalNominal)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Periode</Text>
            <Text style={styles.summaryValue}>{formatDateIndo(dtAwal)} - {formatDateIndo(dtAkhir)}</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {items.length} Catatan Ditemukan
          </Text>
          <Text style={styles.listSubHeaderText}>
            {userData?.nama_toko || "Operasional Toko"}
          </Text>
        </View>

        {loading || (listLoading && items.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat pengeluaran...</Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => (
            <View key={item.id_pengeluaran} style={styles.expenseCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
                </View>
                
                <View style={styles.cardMainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.expenseKategori} numberOfLines={1}>{item.kategori}</Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id_pengeluaran)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardSubText}>{item.tanggal} • {item.nama_lengkap}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.amountRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.amountLabel}>Nominal Biaya</Text>
                  <Text style={styles.amountValue}>{formatRupiah(item.nominal)}</Text>
                </View>
                {item.keterangan ? (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText} numberOfLines={2}>{item.keterangan}</Text>
                    </View>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search" size={48} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
            <Text style={styles.emptySub}>Coba cari dengan kata kunci atau periode lain.</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Tambah */}
      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pengeluaran</Text>
              <TouchableOpacity onPress={closeModal} style={styles.headerIconButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.formLabel}>Tanggal Biaya</Text>
              <TouchableOpacity 
                style={styles.formInput} 
                onPress={() => setPicker({ show: true, field: "input" })}
              >
                <Text style={{ marginTop: 14, color: Colors.text, fontWeight: '500' }}>
                  {formatDateIndo(dtInput)}
                </Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Kategori / Nama Biaya</Text>
              <TextInput
                style={styles.formInput}
                value={kategori}
                onChangeText={setKategori}
                placeholder="Misal: Listrik, Gaji, Sewa"
                placeholderTextColor={Colors.textSoft}
              />

              <Text style={styles.formLabel}>Nominal (Rp)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={nominal}
                onChangeText={setNominal}
                placeholder="0"
                placeholderTextColor={Colors.textSoft}
              />

              <Text style={styles.formLabel}>Keterangan (Opsional)</Text>
              <TextInput
                style={[styles.formInput, { height: 100, paddingTop: 12, textAlignVertical: 'top' }]}
                multiline
                value={keterangan}
                onChangeText={setKeterangan}
                placeholder="Catatan tambahan..."
                placeholderTextColor={Colors.textSoft}
              />

              <TouchableOpacity 
                style={[styles.submitButton, submitLoading && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Simpan Pengeluaran</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
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
  headerAddButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerAddButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    fontSize: 15,
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
  expenseCard: {
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
    justifyContent: "center",
    alignItems: "center",
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
  expenseKategori: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
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
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  amountLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  noteBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 10,
  },
  noteText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: 'italic',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});