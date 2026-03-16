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
        const apiKategori = (result.data || [])
          .map((item: any) => String(item.kategori || "").trim())
          .filter((item: string) => item !== "");

        const uniqueKategori = Array.from(new Set(apiKategori));
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProduk(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.headerTitle}>Manajemen Produk</Text>
          </TouchableOpacity>

          <View style={styles.headerBottomRow}>
            <Text style={styles.headerSub}>
              Kelola produk per mitra - {userData?.role || "Admin"}
            </Text>

            <TouchableOpacity style={styles.addButton} onPress={handleOpenTambah}>
              <Text style={styles.addButtonText}>+ Produk</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama produk..."
            placeholderTextColor={Colors.textSoft}
            value={keyword}
            onChangeText={setKeyword}
          />

          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowKategoriDropdown((prev) => !prev)}
            >
              <Text
                style={styles.dropdownButtonText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedKategori}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.text} />
            </TouchableOpacity>

            {showKategoriDropdown && (
              <View style={styles.dropdownList}>
                {kategoriList.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.dropdownItem,
                      selectedKategori === item && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedKategori(item);
                      setShowKategoriDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedKategori === item &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Gambar</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Produk</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.3 }]}>Kategori</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Harga</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Stok</Text>
        </View>

        <View style={styles.listContainer}>
          {loading || (listLoading && products.length === 0) ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat produk...</Text>
            </View>
          ) : products.length > 0 ? (
            products.map((item) => (
              <View key={item.id_produk} style={styles.productCard}>
                <View style={styles.productRowTop}>
                  <View style={[styles.productCell, { flex: 1.2 }]}>
                    {item.gambar ? (
                      <Image
                        source={{ uri: item.gambar }}
                        style={styles.productImage}
                      />
                    ) : (
                      <View style={styles.noImageBox}>
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color="#aaa"
                        />
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.productCell,
                      { flex: 2, alignItems: "flex-start" },
                    ]}
                  >
                    <Text style={styles.productName}>{item.nama_produk}</Text>
                    <Text style={styles.productDiscount}>
                      Diskon {item.diskon}%
                    </Text>
                    <Text
                      style={[
                        styles.productStatus,
                        item.status_aktif === "aktif"
                          ? styles.productStatusActive
                          : styles.productStatusInactive,
                      ]}
                    >
                      {item.status_aktif === "aktif" ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>

                  <View style={[styles.productCell, { flex: 1.3 }]}>
                    <Text style={styles.productSmall}>{item.kategori}</Text>
                  </View>

                  <View style={[styles.productCell, { flex: 1.2 }]}>
                    <Text style={styles.productSmall}>
                      {formatRupiah(item.harga)}
                    </Text>
                  </View>

                  <View style={[styles.productCell, { flex: 0.8 }]}>
                    <Text style={styles.productSmall}>{item.stok}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      item.status_aktif === "aktif"
                        ? styles.activeBtn
                        : styles.inactiveBtn
                    }
                    onPress={() =>
                      handleToggleStatus(item.id_produk, item.status_aktif)
                    }
                  >
                    <Text
                      style={
                        item.status_aktif === "aktif"
                          ? styles.activeBtnText
                          : styles.inactiveBtnText
                      }
                    >
                      {item.status_aktif === "aktif"
                        ? "Aktif"
                        : "Nonaktifkan"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id_produk)}
                  >
                    <Text style={styles.deleteBtnText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={38} color="#B0B0B0" />
              <Text style={styles.emptyText}>Produk tidak ditemukan.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Produk" : "Tambah Produk"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.formLabel}>Nama Produk</Text>
              <TextInput
                style={styles.formInput}
                value={namaProduk}
                onChangeText={setNamaProduk}
                placeholder="Masukkan nama produk"
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
                  <Ionicons name="chevron-down" size={18} color={Colors.text} />
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

              <Text style={styles.formLabel}>Harga</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={harga}
                onChangeText={setHarga}
                placeholder="Masukkan harga"
                placeholderTextColor={Colors.textSoft}
              />

              <Text style={styles.formLabel}>Diskon (%)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={diskon}
                onChangeText={setDiskon}
                placeholder="0"
                placeholderTextColor={Colors.textSoft}
              />

              <Text style={styles.formLabel}>Stok</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={stok}
                onChangeText={setStok}
                placeholder="0"
                placeholderTextColor={Colors.textSoft}
              />
              <Text style={styles.formLabel}>Satuan</Text>
              <TextInput
                style={styles.formInput}
                value={satuan}
                onChangeText={setSatuan}
                placeholder="Masukkan satuan"
                placeholderTextColor={Colors.textSoft}
              />
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
                    {statusAktif === "aktif" ? "Aktif" : "Nonaktif"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.text} />
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
                <Text style={styles.fakeUploadText}>Choose File</Text>
                <Text style={styles.fakeUploadSub}>
                  {gambarPreview ? "1 file selected" : "No file chosen"}
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
                    {editMode ? "Update Produk" : "Simpan Produk"}
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
    backgroundColor: Colors.background,
  },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 44,
    paddingHorizontal: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  headerBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSub: {
    color: "#fff",
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 10,
    zIndex: 100,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    height: 42,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  dropdownWrapper: {
    width: 160,
    position: "relative",
  },
  dropdownButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    height: 42,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownButtonText: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  dropdownList: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    zIndex: 999,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: "#1E6BD6",
  },
  dropdownItemText: {
    color: Colors.text,
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: "#fff",
  },

  tableHeader: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    marginHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  listContainer: {
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: "hidden",
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  productCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  productRowTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  productCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  productImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  noImageBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  productDiscount: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  productStatus: {
    fontSize: 10,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  productStatusActive: {
    backgroundColor: "#E8F5EA",
    color: "#2F8F46",
  },
  productStatusInactive: {
    backgroundColor: "#E8F0FF",
    color: "#2563EB",
  },
  productSmall: {
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },

  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  editBtn: {
    backgroundColor: "#F7E2A9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editBtnText: {
    color: "#9B6B00",
    fontSize: 12,
    fontWeight: "600",
  },
  activeBtn: {
    backgroundColor: "#E5F6E7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeBtnText: {
    color: "#2F8F46",
    fontSize: 12,
    fontWeight: "600",
  },
  inactiveBtn: {
    backgroundColor: "#E8F0FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  inactiveBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#FCE8E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  deleteBtnText: {
    color: "#E12525",
    fontSize: 12,
    fontWeight: "600",
  },

  emptyBox: {
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyText: {
    color: "#777",
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  modalBox: {
    width: "100%",
    maxHeight: "86%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    color: Colors.text,
    backgroundColor: "#fff",
  },
  formDropdown: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  formDropdownText: {
    color: Colors.text,
    fontSize: 14,
  },
  formDropdownList: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    zIndex: 999,
  },
  formDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formDropdownItemText: {
    color: Colors.text,
    fontSize: 14,
  },

  fakeUploadBox: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fakeUploadText: {
    fontSize: 12,
    color: Colors.text,
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fakeUploadSub: {
    fontSize: 12,
    color: "#666",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginTop: 10,
  },

  submitButton: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});