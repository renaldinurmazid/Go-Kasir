import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
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
  getProdukMasukList,
  getProdukOpsi,
  tambahProdukMasuk,
} from "../../services/produkMasuk";

// --- Types ---
type UserData = {
  id_user: number;
  nama_lengkap: string;
  id_mitra: number;
};

type ProdukOpsi = {
  id_produk: number;
  nama_produk: string;
  stok: number;
};

type ProdukMasukItem = {
  id_produk_masuk: number;
  qty_masuk: number;
  tanggal_masuk: string;
  catatan: string;
  nama_produk: string;
  nama_lengkap: string;
  satuan?: string;
};

export default function ProdukMasukScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [items, setItems] = useState<ProdukMasukItem[]>([]);
  const [produkList, setProdukList] = useState<ProdukOpsi[]>([]);
  const [filteredProduk, setFilteredProduk] = useState<ProdukOpsi[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter List State
  const [keyword, setKeyword] = useState("");
  const [dtAwal, setDtAwal] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dtAkhir, setDtAkhir] = useState(new Date());

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [showProdukDropdown, setShowProdukDropdown] = useState(false);
  const [searchProduk, setSearchProduk] = useState("");
  
  const [selectedProdukId, setSelectedProdukId] = useState<number | null>(null);
  const [selectedProdukName, setSelectedProdukName] = useState("");
  const [qtyMasuk, setQtyMasuk] = useState("");
  const [dtMasuk, setDtMasuk] = useState(new Date());
  const [satuan, setSatuan] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [catatan, setCatatan] = useState("");

  const [picker, setPicker] = useState({ show: false, field: "" });

  useEffect(() => {
    initializePage();
  }, []);

  // Debounce Filter Utama
  useEffect(() => {
    if (!userData?.id_mitra) return;
    const timer = setTimeout(() => fetchList(userData.id_mitra, false), 350);
    return () => clearTimeout(timer);
  }, [keyword, dtAwal, dtAkhir]);

  // Filter Search di Dalam Dropdown
  useEffect(() => {
    const filtered = produkList.filter(p => 
      p.nama_produk.toLowerCase().includes(searchProduk.toLowerCase())
    );
    setFilteredProduk(filtered);
  }, [searchProduk, produkList]);

  const formatDateIndo = (date: Date) => {
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateDb = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const initializePage = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) { router.replace("/login"); return; }
      const user = JSON.parse(storedUser);
      setUserData(user);
      await Promise.all([fetchList(user.id_mitra, false), fetchProdukOpsi(user.id_mitra)]);
    } catch (e) { Alert.alert("Error", "Gagal memuat data"); }
    finally { setLoading(false); }
  };

  const fetchList = async (id_mitra: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    const result = await getProdukMasukList({
      id_mitra, keyword,
      tanggal_awal: formatDateDb(dtAwal),
      tanggal_akhir: formatDateDb(dtAkhir),
    });
    if (result.success) setItems(result.data || []);
    setRefreshing(false);
  };

  const fetchProdukOpsi = async (id_mitra: number) => {
    const result = await getProdukOpsi(id_mitra);
    if (result.success) {
        setProdukList(result.data || []);
        setFilteredProduk(result.data || []);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProdukId || !qtyMasuk || !userData) {
      Alert.alert("Validasi", "Pilih produk dan isi quantity");
      return;
    }
    setSubmitLoading(true);
    try {
      const result = await tambahProdukMasuk({
        id_produk: selectedProdukId,
        qty_masuk: Number(qtyMasuk),
        tanggal_masuk: formatDateDb(dtMasuk),
        satuan,
        harga_beli: Number(hargaBeli),
        harga_jual: Number(hargaJual),
        catatan,
        id_user: userData.id_user,
        id_mitra: userData.id_mitra,
      });
      if (result.success) {
        setShowModal(false);
        resetForm();
        fetchList(userData.id_mitra, false);
        Alert.alert("Sukses", "Data stok berhasil ditambah");
      }
    } catch (e) { Alert.alert("Error", "Gagal menyimpan"); }
    finally { setSubmitLoading(false); }
  };

  const resetForm = () => {
    setSelectedProdukId(null); setSelectedProdukName(""); setQtyMasuk("");
    setDtMasuk(new Date()); setSatuan(""); setHargaBeli(""); setHargaJual("");
    setCatatan(""); setSearchProduk("");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Produk Masuk</Text>
            <Text style={styles.headerSub}>Kelola stok masuk & harga</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(userData?.id_mitra!, true)} />}
      >
        {/* Filter */}
        <View style={styles.filterCard}>
          <TextInput style={styles.input} placeholder="Cari nama produk..." value={keyword} onChangeText={setKeyword} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[styles.input, styles.dateBox]} onPress={() => setPicker({ show: true, field: "awal" })}>
              <Text style={styles.dateText}>Dari: {formatDateIndo(dtAwal)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.input, styles.dateBox]} onPress={() => setPicker({ show: true, field: "akhir" })}>
              <Text style={styles.dateText}>Ke: {formatDateIndo(dtAkhir)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <View style={styles.listContainer}>
          {loading ? <ActivityIndicator color={Colors.primary} /> : 
            items.map((item) => (
              <View key={item.id_produk_masuk} style={styles.itemCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.itemTitle}>{item.nama_produk}</Text>
                    <Text style={styles.qtyText}>+{item.qty_masuk}</Text>
                </View>
                <Text style={styles.itemText}>Tanggal: {item.tanggal_masuk} | {item.nama_lengkap}</Text>
                {item.satuan && <Text style={styles.itemSubText}>Satuan: {item.satuan}</Text>}
              </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal Tambah */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Stok Masuk</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.label}>Produk</Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowProdukDropdown(!showProdukDropdown)}>
                <Text style={{color: selectedProdukName ? '#000' : '#999'}}>
                    {selectedProdukName || "Pilih Produk..."}
                </Text>
                <Ionicons name="chevron-down" size={18} />
              </TouchableOpacity>

              {showProdukDropdown && (
                <View style={styles.dropdownListContainer}>
                  <TextInput 
                    style={styles.searchDropdown} 
                    placeholder="Cari produk..." 
                    value={searchProduk}
                    onChangeText={setSearchProduk}
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {filteredProduk.map((p) => (
                      <TouchableOpacity 
                        key={p.id_produk} 
                        style={styles.dropdownItem}
                        onPress={() => {
                            setSelectedProdukId(p.id_produk);
                            setSelectedProdukName(p.nama_produk);
                            setShowProdukDropdown(false);
                        }}
                      >
                        <Text>{p.nama_produk} (Stok: {p.stok})</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>Tanggal Masuk</Text>
              <TouchableOpacity style={styles.input} onPress={() => setPicker({ show: true, field: "masuk" })}>
                <Text style={{ marginTop: 12 }}>{formatDateIndo(dtMasuk)}</Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1.5 }}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={qtyMasuk} onChangeText={setQtyMasuk} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Satuan</Text>
                    <TextInput style={styles.input} value={satuan} onChangeText={setSatuan} placeholder="Pcs/Kg" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Harga Beli</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={hargaBeli} onChangeText={setHargaBeli} placeholder="Rp" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Harga Jual Baru</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={hargaJual} onChangeText={setHargaJual} placeholder="Rp" />
                </View>
              </View>

              <Text style={styles.label}>Catatan</Text>
              <TextInput style={[styles.input, { height: 60 }]} multiline value={catatan} onChangeText={setCatatan} />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitLoading}>
                {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Simpan Data</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {picker.show && (
        <DateTimePicker
          value={picker.field === "awal" ? dtAwal : picker.field === "akhir" ? dtAkhir : dtMasuk}
          mode="date"
          onChange={(e, d) => { setPicker({ show: false, field: "" }); if(d){
            if(picker.field === "awal") setDtAwal(d);
            else if(picker.field === "akhir") setDtAkhir(d);
            else setDtMasuk(d);
          }}}
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
  filterCard: { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.1, elevation: 3 },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, height: 45, paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#fcfcfc' },
  dateBox: { flex: 1, justifyContent: 'center' },
  dateText: { fontSize: 12, color: '#555' },
  listContainer: { paddingHorizontal: 12 },
  itemCard: { backgroundColor: "#fff", borderRadius: 10, padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: Colors.primary, elevation: 1 },
  itemTitle: { fontSize: 14, fontWeight: "bold", color: "#333" },
  qtyText: { fontWeight: "bold", color: Colors.primary },
  itemText: { fontSize: 12, color: "#777", marginTop: 4 },
  itemSubText: { fontSize: 11, color: "#999" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 16, fontWeight: "bold" },
  label: { fontSize: 12, fontWeight: "bold", marginBottom: 5, color: "#666" },
  row: { flexDirection: 'row', gap: 10 },
  dropdownBtn: { borderWidth: 1, borderColor: "#eee", height: 45, borderRadius: 8, justifyContent: "space-between", alignItems: "center", flexDirection: "row", paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#fcfcfc' },
  dropdownListContainer: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, marginBottom: 10, backgroundColor: '#fff', overflow: 'hidden' },
  searchDropdown: { height: 40, borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 10, fontSize: 13, backgroundColor: '#f9f9f9' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 15 },
  submitBtnText: { color: "#fff", fontWeight: "bold" }
});