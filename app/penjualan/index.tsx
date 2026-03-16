import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../constants/colors";
import { getProdukList } from "../../services/produk";
import { getProdukKategoriList } from "../../services/produkKategori";
import { useCartStore } from "../../store/cartStore";

type UserData = {
  id_user: number;
  nama_lengkap: string;
  username: string;
  role: string;
  id_mitra: number;
  nama_toko?: string;
};

type ProductItem = {
  id_produk: number;
  nama_produk: string;
  kategori: string;
  harga: number;
  diskon: number;
  stok: number;
  status_aktif: "aktif" | "nonaktif";
  gambar?: string | null;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function PenjualanScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("Semua");
  const [kategoriList, setKategoriList] = useState<string[]>(["Semua"]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    items,
    addItem,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
    totalItems,
    totalQty,
    totalAmount,
  } = useCartStore();

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!userData?.id_mitra) return;

    const timer = setTimeout(() => {
      fetchProduk(userData.id_mitra, false);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, selectedKategori, userData?.id_mitra]);

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
      setUserData(user);

      await Promise.all([
        fetchKategori(user.id_mitra),
        fetchProduk(user.id_mitra, false),
      ]);
    } catch (error) {
      Alert.alert("Error", "Gagal memuat halaman penjualan.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKategori = async (id_mitra: number) => {
    try {
      const result = await getProdukKategoriList(id_mitra);

      if (result.success) {
        const rawList = Array.isArray(result.data) ? result.data : [];

        const apiKategori = rawList
          .map((item: any) => String(item?.kategori || "").trim())
          .filter((item: string) => item !== "");

        const uniqueKategori = Array.from(new Set(apiKategori));

        setKategoriList(["Semua", ...uniqueKategori]);
      } else {
        setKategoriList(["Semua"]);
      }
    } catch (error) {
      setKategoriList(["Semua"]);
    }
  };

  const fetchProduk = async (id_mitra: number, isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);

      const result = await getProdukList({
        id_mitra,
        keyword,
        kategori: selectedKategori === "Semua" ? "" : selectedKategori,
      });

      if (result.success) {
        const filtered = (result.data || []).filter(
          (item: ProductItem) =>
            item.status_aktif === "aktif" && Number(item.stok || 0) > 0
        );
        setProducts(filtered);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal memuat produk"
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleBayar = () => {
    if (items.length === 0) {
      Alert.alert("Info", "Keranjang masih kosong.");
      return;
    }

    router.push("/pembayaran");
  };

  const handleClearCart = () => {
    if (items.length === 0) return;

    Alert.alert("Konfirmasi", "Kosongkan keranjang?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Kosongkan",
        style: "destructive",
        onPress: () => clearCart(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Penjualan</Text>
            <Text style={styles.headerSub}>
              Kasir: {userData?.nama_lengkap || "Admin"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.payButton} onPress={handleBayar}>
          <Text style={styles.payButtonText}>
            Bayar {formatRupiah(totalAmount())} →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              userData?.id_mitra
                ? Promise.all([
                    fetchKategori(userData.id_mitra),
                    fetchProduk(userData.id_mitra, true),
                  ]).then(() => undefined)
                : Promise.resolve()
            }
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.cartBox}>
          <View style={styles.cartHeader}>
            <Text style={[styles.cartHeaderText, { flex: 2.2 }]}>Produk</Text>
            <Text style={[styles.cartHeaderText, { flex: 1.4 }]}>Jumlah</Text>
            <Text style={[styles.cartHeaderText, { flex: 1 }]}>Diskon</Text>
            <Text style={[styles.cartHeaderText, { flex: 1.5 }]}>Total</Text>
            <Text style={[styles.cartHeaderText, { flex: 0.8 }]}>Aksi</Text>
          </View>

          <View style={styles.cartBody}>
            {items.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <Text style={styles.emptyCartText}>Keranjang masih kosong</Text>
              </View>
            ) : (
              <ScrollView nestedScrollEnabled>
                {items.map((item) => (
                  <View key={item.id_produk} style={styles.cartRow}>
                    <View style={{ flex: 2.2 }}>
                      <Text style={styles.cartProductName}>{item.nama_produk}</Text>
                      <Text style={styles.cartProductSub}>
                        Harga: {formatRupiah(item.harga)}
                      </Text>
                    </View>

                    <View style={[styles.cartCenter, { flex: 1.4 }]}>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => decreaseQty(item.id_produk)}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>

                        <Text style={styles.qtyValue}>{item.qty}</Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => increaseQty(item.id_produk)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.cartCenter, { flex: 1 }]}>
                      <Text style={styles.cartProductSub}>{item.diskon}%</Text>
                    </View>

                    <View style={[styles.cartCenter, { flex: 1.5 }]}>
                      <Text style={styles.cartProductTotal}>
                        {formatRupiah(item.total)}
                      </Text>
                    </View>

                    <View style={[styles.cartCenter, { flex: 0.8 }]}>
                      <TouchableOpacity
                        onPress={() => removeItem(item.id_produk)}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.cartFooter}>
            <Text style={styles.cartFooterText}>
              Item / Jumlah: {totalItems()} / {totalQty()}
            </Text>

            <View style={styles.cartFooterRight}>
              <Text style={styles.cartFooterTotal}>{formatRupiah(totalAmount())}</Text>
              <TouchableOpacity onPress={handleClearCart}>
                <Ionicons name="trash-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk / scan barcode"
            placeholderTextColor={Colors.textSoft}
            value={keyword}
            onChangeText={setKeyword}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {kategoriList.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryChip,
                selectedKategori === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedKategori(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedKategori === item && styles.categoryChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productGrid}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat produk...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Produk tidak ditemukan.</Text>
            </View>
          ) : (
            products.map((item) => (
              <View key={item.id_produk} style={styles.productCard}>
                {item.gambar ? (
                  <Image source={{ uri: item.gambar }} style={styles.productImage} />
                ) : (
                  <View style={styles.noImageBox}>
                    <Ionicons name="image-outline" size={20} color="#aaa" />
                  </View>
                )}

                <Text style={styles.productName}>{item.nama_produk}</Text>
                <Text style={styles.productPrice}>{formatRupiah(item.harga)}</Text>
                <Text style={styles.productCategory}>{item.kategori || "-"}</Text>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() =>
                    addItem({
                      id_produk: item.id_produk,
                      nama_produk: item.nama_produk,
                      harga: item.harga,
                      diskon: item.diskon,
                      gambar: item.gambar,
                      kategori: item.kategori,
                    })
                  }
                >
                  <Text style={styles.addBtnText}>Tambah</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 44,
    paddingHorizontal: 14,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  payButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
  },
  payButtonText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  cartBox: {
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  cartHeader: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cartHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  cartBody: {
    height: 220,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyCartBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCartText: {
    color: "#777",
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cartProductName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  cartProductSub: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  cartProductTotal: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  cartCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  qtyValue: {
    width: 28,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartFooterText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },
  cartFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartFooterTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },

  searchRow: {
    paddingHorizontal: 12,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    height: 44,
    paddingHorizontal: 14,
    color: Colors.text,
  },

  categoryRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#fff",
  },

  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  productCard: {
    width: "46%",
    backgroundColor: "#fff",
    margin: "2%",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 10,
  },
  noImageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.text,
    minHeight: 34,
  },
  productPrice: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: "700",
  },
  productCategory: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  addBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  loadingBox: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
});