import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import Colors from "../../constants/colors";
import {
  getProdukList,
  tambahProduk,
  updateProduk,
  updateStatusProduk,
  hapusProduk,
} from "../../services/produk";
import { getProdukKategoriList } from "../../services/produkKategori";

type ProductStatus = "aktif" | "nonaktif";

type ProductItem = {
  id_produk: number;
  nama_produk: string;
  kategori: string;
  harga: number;
  diskon: number;
  stok: number;
  satuan: string;
  status_aktif: ProductStatus;
  gambar?: string | null;
  id_mitra?: number;
  created_at?: string;
};

type UserData = {
  id_user: number;
  nama_lengkap: string;
  username: string;
  role: string;
  id_mitra: number;
  nama_toko?: string;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function ProdukScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("Semua Kategori");
  const [showKategoriDropdown, setShowKategoriDropdown] = useState(false);
  const [kategoriList, setKategoriList] = useState<string[]>(["Semua Kategori"]);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProdukId, setSelectedProdukId] = useState<number | null>(null);

  const [namaProduk, setNamaProduk] = useState("");
  const [kategori, setKategori] = useState("");
  const [harga, setHarga] = useState("");
  const [diskon, setDiskon] = useState("0");
  const [stok, setStok] = useState("0");
  const [satuan, setSatuan] = useState("");
  const [statusAktif, setStatusAktif] = useState<ProductStatus>("aktif");
  const [showModalKategoriDropdown, setShowModalKategoriDropdown] =
    useState(false);
  const [showModalStatusDropdown, setShowModalStatusDropdown] = useState(false);

  const [gambarFile, setGambarFile] = useState<any>(null);
  const [gambarPreview, setGambarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [idMitra, setIdMitra] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!idMitra) return;

    const delayDebounce = setTimeout(() => {
      fetchProduk(false);
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [keyword, selectedKategori, idMitra]);

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
      const mitraId = Number(user?.id_mitra || 0);

      if (!mitraId) {
        Alert.alert("Error", "ID mitra tidak ditemukan.");
        return;
      }

      setUserData(user);
      setIdMitra(mitraId);

      await fetchKategori(mitraId);
      await fetchProdukByMitra(mitraId, false);
    } catch (error: any) {
      console.log("INIT PRODUK ERROR:", error?.message || error);
      Alert.alert("Error", "Gagal memuat halaman produk.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKategori = async (mitraId: number) => {
    try {
      const result = await getProdukKategoriList(mitraId);

      if (result.success) {
        const apiKategori: string[] = (result.data || [])
          .map((item: any) => String(item.kategori || "").trim())
          .filter((item: string) => item !== "");

        const uniqueKategori = [...new Set(apiKategori)];
        setKategoriList(["Semua Kategori", ...uniqueKategori]);
      } else {
        setKategoriList(["Semua Kategori"]);
      }
    } catch (error: any) {
      console.log(
        "FETCH KATEGORI ERROR:",
        error?.response?.data || error?.message
      );
      setKategoriList(["Semua Kategori"]);
    }
  };

  const fetchProdukByMitra = async (
    mitraId: number,
    isRefresh: boolean = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setListLoading(true);
      }

      const result = await getProdukList({
        id_mitra: mitraId,
        keyword,
        kategori: selectedKategori,
      });

      if (!result.success) {
        Alert.alert("Gagal", result.message || "Gagal memuat data produk");
        return;
      }

      setProducts(result.data || []);
    } catch (error: any) {
      console.log("FETCH PRODUK ERROR:", error?.response?.data || error?.message);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal memuat data produk"
      );
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProduk = async (isRefresh: boolean = false) => {
    if (!idMitra) return;
    await fetchProdukByMitra(idMitra, isRefresh);
  };

  const resetForm = () => {
    setNamaProduk("");
    setKategori("");
    setHarga("");
    setDiskon("0");
    setStok("0");
    setSatuan("");
    setStatusAktif("aktif");
    setShowModalKategoriDropdown(false);
    setShowModalStatusDropdown(false);
    setEditMode(false);
    setSelectedProdukId(null);
    setGambarFile(null);
    setGambarPreview(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Izin Ditolak", "Akses galeri dibutuhkan untuk upload gambar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        setGambarPreview(asset.uri);
        setGambarFile({
          uri: asset.uri,
          name: asset.fileName || `produk_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memilih gambar.");
    }
  };

  const handleOpenTambah = () => {
    resetForm();
    setEditMode(false);
    setShowModal(true);
  };

  const handleOpenEdit = (item: ProductItem) => {
    setEditMode(true);
    setSelectedProdukId(item.id_produk);
    setNamaProduk(item.nama_produk);
    setKategori(item.kategori);
    setHarga(String(item.harga));
    setDiskon(String(item.diskon));
    setStok(String(item.stok));
    setSatuan(item.satuan || "");
    setStatusAktif(item.status_aktif);
    setGambarPreview(item.gambar || null);
    setGambarFile(null);
    setShowModal(true);
  };

  const handleSubmitProduk = async () => {
    if (!namaProduk.trim()) {
      Alert.alert("Validasi", "Nama produk wajib diisi.");
      return;
    }

    if (!kategori.trim()) {
      Alert.alert("Validasi", "Kategori wajib dipilih.");
      return;
    }

    if (!harga.trim() || isNaN(Number(harga))) {
      Alert.alert("Validasi", "Harga harus berupa angka.");
      return;
    }

    if (!diskon.trim() || isNaN(Number(diskon))) {
      Alert.alert("Validasi", "Diskon harus berupa angka.");
      return;
    }

    if (!stok.trim() || isNaN(Number(stok))) {
      Alert.alert("Validasi", "Stok harus berupa angka.");
      return;
    }

    if (!satuan.trim()) {
      Alert.alert("Validasi", "Satuan wajib diisi.");
      return;
    }

    if (Number(diskon) < 0 || Number(diskon) > 100) {
      Alert.alert("Validasi", "Diskon harus 0 sampai 100.");
      return;
    }

    if (Number(harga) < 0) {
      Alert.alert("Validasi", "Harga tidak boleh negatif.");
      return;
    }

    if (Number(stok) < 0) {
      Alert.alert("Validasi", "Stok tidak boleh negatif.");
      return;
    }

    if (!idMitra) {
      Alert.alert("Error", "ID mitra tidak ditemukan.");
      return;
    }

    try {
      setSubmitLoading(true);

      let result;

      if (editMode && selectedProdukId) {
        result = await updateProduk({
          id_produk: selectedProdukId,
          id_mitra: idMitra,
          nama_produk: namaProduk.trim(),
          kategori,
          harga: Number(harga),
          diskon: Number(diskon),
          stok: Number(stok),
          satuan:satuan.trim(),
          status_aktif: statusAktif,
          gambar: gambarFile,
        });
      } else {
        result = await tambahProduk({
          nama_produk: namaProduk.trim(),
          kategori,
          harga: Number(harga),
          diskon: Number(diskon),
          stok: Number(stok),
          satuan:satuan.trim(),
          status_aktif: statusAktif,
          id_mitra: idMitra,
          gambar: gambarFile,
        });
      }

      if (!result.success) {
        Alert.alert("Gagal", result.message || "Gagal menyimpan produk.");
        return;
      }

      closeModal();
      await fetchProduk(false);

      Alert.alert(
        "Sukses",
        result.message ||
          (editMode
            ? "Produk berhasil diperbarui."
            : "Produk berhasil ditambahkan.")
      );
    } catch (error: any) {
      console.log("SUBMIT PRODUK ERROR:", error?.response?.data || error?.message);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal menyimpan produk"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleStatus = async (
    id_produk: number,
    currentStatus: ProductStatus
  ) => {
    if (!idMitra) return;

    try {
      setListLoading(true);

      const nextStatus: ProductStatus =
        currentStatus === "aktif" ? "nonaktif" : "aktif";

      const result = await updateStatusProduk({
        id_produk,
        id_mitra: idMitra,
        status_aktif: nextStatus,
      });

      if (!result.success) {
        Alert.alert("Gagal", result.message || "Gagal mengubah status.");
        return;
      }

      await fetchProduk(false);
    } catch (error: any) {
      console.log("UPDATE STATUS ERROR:", error?.response?.data || error?.message);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal mengubah status produk"
      );
    } finally {
      setListLoading(false);
    }
  };

  const handleDelete = (id_produk: number) => {
    if (!idMitra) return;

    Alert.alert("Konfirmasi", "Hapus produk ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            setListLoading(true);

            const result = await hapusProduk({
              id_produk,
              id_mitra: idMitra,
            });

            if (!result.success) {
              Alert.alert("Gagal", result.message || "Gagal menghapus produk.");
              return;
            }

            await fetchProduk(false);
            Alert.alert("Sukses", result.message || "Produk berhasil dihapus.");
          } catch (error: any) {
            console.log("HAPUS PRODUK ERROR:", error?.response?.data || error?.message);
            Alert.alert(
              "Error",
              error?.response?.data?.message || "Gagal menghapus produk"
            );
          } finally {
            setListLoading(false);
          }
        },
      },
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
          <Text style={styles.headerTitle}>Daftar Produk</Text>
          <TouchableOpacity 
            style={styles.headerAddButton} 
            onPress={handleOpenTambah}
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
            onPress={() => setShowKategoriDropdown((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {selectedKategori === "Semua Kategori" ? "Kategori" : selectedKategori}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.textSoft} />
          </TouchableOpacity>
        </View>

        {showKategoriDropdown && (
          <View style={styles.dropdownOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowKategoriDropdown(false)} />
            <View style={styles.dropdownContents}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {kategoriList.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryPill,
                      selectedKategori === item && styles.categoryPillActive,
                    ]}
                    onPress={() => {
                      setSelectedKategori(item);
                      setShowKategoriDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedKategori === item && styles.categoryPillTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProduk(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            Total {products.length} Produk
          </Text>
          <Text style={styles.listSubHeaderText}>
            {userData?.nama_toko || "Semua Mitra"}
          </Text>
        </View>

        {loading || (listLoading && products.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Menyiapkan data...</Text>
          </View>
        ) : products.length > 0 ? (
          products.map((item) => (
            <View key={item.id_produk} style={styles.productCard}>
              <View style={styles.cardHeader}>
                <View style={styles.imageContainer}>
                  {item.gambar ? (
                    <Image source={{ uri: item.gambar }} style={styles.productImage} />
                  ) : (
                    <View style={styles.noImageBox}>
                      <Ionicons name="cube-outline" size={24} color="#CBD5E1" />
                    </View>
                  )}
                </View>
                
                <View style={styles.cardMainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.productName} numberOfLines={1}>{item.nama_produk}</Text>
                    <View style={[
                      styles.statusBadge,
                      item.status_aktif === "aktif" ? styles.statusActive : styles.statusInactive
                    ]}>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: item.status_aktif === "aktif" ? "#22C55E" : "#94A3B8" }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: item.status_aktif === "aktif" ? "#166534" : "#475569" }
                      ]}>
                        {item.status_aktif === "aktif" ? "Aktif" : "Nonaktif"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.productKategori}>{item.kategori}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Harga</Text>
                  <Text style={styles.detailValue}>{formatRupiah(item.harga)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Stok</Text>
                  <Text style={styles.detailValue}>{item.stok} <Text style={styles.detailUnit}>{item.satuan}</Text></Text>
                </View>
                {item.diskon > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Diskon</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{item.diskon}% OFF</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnOutline]} 
                  onPress={() => handleToggleStatus(item.id_produk, item.status_aktif)}
                >
                  <Ionicons 
                    name={item.status_aktif === "aktif" ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.btnOutlineText}>
                    {item.status_aktif === "aktif" ? "Matikan" : "Aktifkan"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionRight}>
                  <TouchableOpacity 
                    style={styles.iconActionBtn} 
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Ionicons name="create-outline" size={20} color="#0EA5E9" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.iconActionBtn} 
                    onPress={() => handleDelete(item.id_produk)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search" size={48} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>Produk Tidak Ditemukan</Text>
            <Text style={styles.emptySub}>Coba cari dengan kata kunci lain atau tambah produk baru.</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Produk" : "Tambah Produk Baru"}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.headerIconButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.formLabel}>Nama Produk</Text>
              <TextInput
                style={styles.formInput}
                value={namaProduk}
                onChangeText={setNamaProduk}
                placeholder="Misal: Kopi Susu Aren"
                placeholderTextColor={Colors.textSoft}
              />

              <Text style={styles.formLabel}>Kategori</Text>
              <View style={{ position: "relative", zIndex: 30 }}>
                <TouchableOpacity
                  style={styles.formDropdown}
                  onPress={() => {
                    setShowModalKategoriDropdown((prev) => !prev);
                    setShowModalStatusDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.formDropdownText,
                      !kategori && { color: Colors.textSoft },
                    ]}
                  >
                    {kategori || "Pilih kategori"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textSoft} />
                </TouchableOpacity>

                {showModalKategoriDropdown && (
                  <View style={styles.formDropdownList}>
                    {kategoriList
                      .filter((item) => item !== "Semua Kategori")
                      .map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.formDropdownItem}
                          onPress={() => {
                            setKategori(item);
                            setShowModalKategoriDropdown(false);
                          }}
                        >
                          <Text style={styles.formDropdownItemText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Harga</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={harga}
                    onChangeText={setHarga}
                    placeholder="0"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Diskon (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={diskon}
                    onChangeText={setDiskon}
                    placeholder="0"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Stok</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={stok}
                    onChangeText={setStok}
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
                    placeholder="Misal: Pcs"
                    placeholderTextColor={Colors.textSoft}
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Status</Text>
              <View style={{ position: "relative", zIndex: 20 }}>
                <TouchableOpacity
                  style={styles.formDropdown}
                  onPress={() => {
                    setShowModalStatusDropdown((prev) => !prev);
                    setShowModalKategoriDropdown(false);
                  }}
                >
                  <Text style={styles.formDropdownText}>
                    {statusAktif === "aktif" ? "Aktif (Tampil)" : "Nonaktif (Sembunyi)"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textSoft} />
                </TouchableOpacity>

                {showModalStatusDropdown && (
                  <View style={styles.formDropdownList}>
                    {["aktif", "nonaktif"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.formDropdownItem}
                        onPress={() => {
                          setStatusAktif(item as ProductStatus);
                          setShowModalStatusDropdown(false);
                        }}
                      >
                        <Text style={styles.formDropdownItemText}>
                          {item === "aktif" ? "Aktif" : "Nonaktif"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.formLabel}>Gambar Produk</Text>
              <TouchableOpacity
                style={styles.fakeUploadBox}
                onPress={handlePickImage}
              >
                <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
                <Text style={styles.fakeUploadText}>Pilih Foto Produk</Text>
                <Text style={styles.fakeUploadSub}>
                  {gambarFile ? "Gambar dipilih" : "Saran: Rasio 1:1, Maks 2MB"}
                </Text>
              </TouchableOpacity>

              {gambarPreview ? (
                <Image
                  source={{ uri: gambarPreview }}
                  style={styles.previewImage}
                />
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitLoading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitProduk}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editMode ? "Simpan Perubahan" : "Tambahkan Produk"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 100,
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerAddButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  headerAddButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  searchSection: {
    flexDirection: "row",
    gap: 12,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
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
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
    maxWidth: 140,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 170,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dropdownContents: {
    paddingHorizontal: 20,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryPillActive: {
    backgroundColor: "#FEF2F2",
    borderColor: Colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryPillTextActive: {
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  listSubHeaderText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImageBox: {
    flex: 1,
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
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  productKategori: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  detailUnit: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  discountBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  discountText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  actionRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
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
    elevation: 4,
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
  fakeUploadBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fakeUploadText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  fakeUploadSub: {
    fontSize: 12,
    color: "#94A3B8",
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginTop: 16,
    alignSelf: "center",
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