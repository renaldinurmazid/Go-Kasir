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
  Pressable,
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
  nama_toko?: string;
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
  harga_beli?: number;
  harga_jual?: number;
};

export default function ProdukMasukScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [items, setItems] = useState<ProdukMasukItem[]>([]);
  const [produkList, setProdukList] = useState<ProdukOpsi[]>([]);
  const [filteredProduk, setFilteredProduk] = useState<ProdukOpsi[]>([]);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
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
    else setListLoading(true);
    
    const result = await getProdukMasukList({
      id_mitra, keyword,
      tanggal_awal: formatDateDb(dtAwal),
      tanggal_akhir: formatDateDb(dtAkhir),
    });
    if (result.success) setItems(result.data || []);
    setRefreshing(false);
    setListLoading(false);
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
    setShowProdukDropdown(false);
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
          <Text style={styles.headerTitle}>Produk Masuk</Text>
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
              placeholder="Cari produk..."
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
          <Text style={{ color: Colors.textSoft, fontSize: 12 }}>-</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setPicker({ show: true, field: "akhir" })}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {formatDateIndo(dtAkhir)}
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
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            Total {items.length} Riwayat Masuk
          </Text>
          <Text style={styles.listSubHeaderText}>
            {userData?.nama_toko || "Semua Mitra"}
          </Text>
        </View>

        {loading || (listLoading && items.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Menyiapkan data...</Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => (
            <View key={item.id_produk_masuk} style={styles.productCard}>
              <View style={styles.cardHeader}>
                <View style={styles.imageContainer}>
                  <View style={styles.noImageBox}>
                    <Ionicons name="download-outline" size={24} color="#CBD5E1" />
                  </View>
                </View>
                
                <View style={styles.cardMainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.productName} numberOfLines={1}>{item.nama_produk}</Text>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>+{item.qty_masuk}</Text>
                    </View>
                  </View>
                  <Text style={styles.productKategori}>{item.tanggal_masuk} • {item.nama_lengkap}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Satuan</Text>
                  <Text style={styles.detailValue}>{item.satuan || "-"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Catatan</Text>
                  <Text style={[styles.detailValue, { fontWeight: '500', fontSize: 12 }]} numberOfLines={1}>
                    {item.catatan || "-"}
                  </Text>
                </View>
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

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Stok Masuk</Text>
              <TouchableOpacity onPress={closeModal} style={styles.headerIconButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.formLabel}>Pilih Produk</Text>
              <View style={{ position: "relative", zIndex: 100 }}>
                <TouchableOpacity
                  style={styles.formDropdown}
                  onPress={() => setShowProdukDropdown(!showProdukDropdown)}
                >
                  <Text
                    style={[
                      styles.formDropdownText,
                      !selectedProdukName && { color: Colors.textSoft },
                    ]}
                  >
                    {selectedProdukName || "Cari produk..."}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textSoft} />
                </TouchableOpacity>

                {showProdukDropdown && (
                  <View style={styles.formDropdownList}>
                    <TextInput 
                      style={styles.searchDropdown} 
                      placeholder="Ketik nama produk..." 
                      placeholderTextColor={Colors.textSoft}
                      value={searchProduk}
                      onChangeText={setSearchProduk}
                    />
                    <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                      {filteredProduk.map((p) => (
                        <TouchableOpacity 
                          key={p.id_produk} 
                          style={styles.formDropdownItem}
                          onPress={() => {
                              setSelectedProdukId(p.id_produk);
                              setSelectedProdukName(p.nama_produk);
                              setShowProdukDropdown(false);
                          }}
                        >
                          <Text style={styles.formDropdownItemText}>
                            {p.nama_produk} <Text style={{ color: Colors.textSoft, fontSize: 11 }}>(Stok: {p.stok})</Text>
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {filteredProduk.length === 0 && (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <Text style={{ color: Colors.textSoft, fontSize: 12 }}>Produk tidak ditemukan</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Text style={styles.formLabel}>Tanggal Masuk</Text>
              <TouchableOpacity 
                style={styles.formInput} 
                onPress={() => setPicker({ show: true, field: "masuk" })}
              >
                <Text style={{ marginTop: 14, color: Colors.text, fontWeight: '500' }}>
                  {formatDateIndo(dtMasuk)}
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.formLabel}>Qty Masuk</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={qtyMasuk}
                    onChangeText={setQtyMasuk}
                    placeholder="0"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Satuan</Text>
                  <TextInput
                    style={styles.formInput}
                    value={satuan}
                    onChangeText={setSatuan}
                    placeholder="Pcs/Kg"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Harga Beli</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={hargaBeli}
                    onChangeText={setHargaBeli}
                    placeholder="Rp 0"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Harga Jual Baru</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={hargaJual}
                    onChangeText={setHargaJual}
                    placeholder="Rp 0"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.formInput, { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
                multiline
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Misal: Dari Supplier A"
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
                  <Text style={styles.submitButtonText}>Simpan Data Stok</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {picker.show && (
        <DateTimePicker
          value={picker.field === "awal" ? dtAwal : picker.field === "akhir" ? dtAkhir : dtMasuk}
          mode="date"
          onChange={(e, d) => { 
            setPicker({ show: false, field: "" }); 
            if(d){
              if(picker.field === "awal") setDtAwal(d);
              else if(picker.field === "akhir") setDtAkhir(d);
              else setDtMasuk(d);
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
  listHeader: {
    marginBottom: 20,
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
  productCard: {
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
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
  },
  noImageBox: {
    width: "100%",
    height: "100%",
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
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  qtyBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
  },
  productKategori: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
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
  formDropdown: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formDropdownText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  formDropdownList: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    elevation: 10,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  searchDropdown: {
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#1E293B",
  },
  formDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  formDropdownItemText: {
    fontSize: 14,
    color: "#475569",
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