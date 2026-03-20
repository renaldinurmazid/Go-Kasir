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
  Modal,
  Pressable,
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
  const [showCartDetail, setShowCartDetail] = useState(false);

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
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>Transaksi Baru</Text>
            <Text style={styles.headerSub}>Kasir: {userData?.nama_lengkap || "Admin"}</Text>
          </View>
          <TouchableOpacity 
            style={styles.cartClearBtn} 
            onPress={handleClearCart}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk / scan..."
              placeholderTextColor="#94A3B8"
              value={keyword}
              onChangeText={setKeyword}
            />
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScroll}
        >
          {kategoriList.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryPill,
                selectedKategori === item && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedKategori(item)}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produk Tersedia</Text>
          <Text style={styles.sectionBadge}>{products.length} Item</Text>
        </View>

        <View style={styles.productGrid}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Menyiapkan produk...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>Produk Kosong</Text>
              <Text style={styles.emptySub}>Tidak ada produk aktif dengan stok tersedia.</Text>
            </View>
          ) : (
            products.map((item) => (
              <TouchableOpacity 
                key={item.id_produk} 
                style={styles.productCard}
                activeOpacity={0.9}
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
                <View style={styles.productImageContainer}>
                  {item.gambar ? (
                    <Image source={{ uri: item.gambar }} style={styles.productImage} />
                  ) : (
                    <View style={styles.noImageBox}>
                      <Ionicons name="image-outline" size={24} color="#CBD5E1" />
                    </View>
                  )}
                  {item.diskon > 0 && (
                    <View style={styles.productDiscountBadge}>
                      <Text style={styles.productDiscountText}>{item.diskon}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{item.nama_produk}</Text>
                  <Text style={styles.productPrice}>{formatRupiah(item.harga)}</Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productStock}>Stok: {item.stok}</Text>
                    <View style={styles.addBtnCircle}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Cart Summary Panel */}
      {items.length > 0 && (
        <View style={styles.bottomCheckoutBar}>
          <TouchableOpacity 
            style={styles.cartSummaryTrigger}
            onPress={() => setShowCartDetail(true)}
          >
            <View style={styles.cartBadgeWrapper}>
              <View style={styles.cartIconCircle}>
                <Ionicons name="cart" size={20} color={Colors.primary} />
              </View>
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{totalQty()}</Text>
              </View>
            </View>
            <View style={styles.cartPrices}>
              <Text style={styles.cartTotalLabel}>{totalItems()} Item Terpilih</Text>
              <Text style={styles.cartTotalPrice}>{formatRupiah(totalAmount())}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.checkoutBtn} 
            onPress={handleBayar}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutBtnText}>Bayar Sekarang</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Detail Bottom Sheet */}
      <Modal
        visible={showCartDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCartDetail(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowCartDetail(false)}
        >
          <View 
            style={styles.sheetContainer}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Detail Pesanan</Text>
                <Text style={styles.sheetSubTitle}>{totalItems()} Item Terpilih</Text>
              </View>
              <TouchableOpacity 
                style={styles.sheetCloseBtn}
                onPress={() => setShowCartDetail(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {items.map((item) => (
                <View key={item.id_produk} style={styles.cartItemRow}>
                  <View style={styles.cartItemIconBox}>
                    {item.gambar ? (
                      <Image source={{ uri: item.gambar }} style={styles.cartItemImg} />
                    ) : (
                      <Ionicons name="cube-outline" size={20} color="#94A3B8" />
                    )}
                  </View>

                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.nama_produk}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      {formatRupiah(item.harga)}
                    </Text>
                  </View>

                  <View style={styles.cartItemActions}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity 
                        style={styles.qtyBtn}
                        onPress={() => decreaseQty(item.id_produk)}
                      >
                        <Ionicons name="remove" size={16} color="#1E293B" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                      <TouchableOpacity 
                        style={styles.qtyBtn}
                        onPress={() => increaseQty(item.id_produk)}
                      >
                        <Ionicons name="add" size={16} color="#1E293B" />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.itemRemoveBtn}
                      onPress={() => removeItem(item.id_produk)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <View style={styles.sheetTotalRow}>
                <Text style={styles.sheetTotalLabel}>Total Tagihan</Text>
                <Text style={styles.sheetTotalValue}>{formatRupiah(totalAmount())}</Text>
              </View>
              <TouchableOpacity 
                style={styles.sheetCheckoutBtn}
                onPress={() => {
                  setShowCartDetail(false);
                  handleBayar();
                }}
              >
                <Text style={styles.sheetCheckoutBtnText}>Lanjut Pembayaran</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 16,
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
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cartClearBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBarWrapper: {
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    backgroundColor: "#fff",
    width: "48%",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  productImageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  noImageBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  productDiscountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productDiscountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    height: 36,
    lineHeight: 18,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productStock: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  addBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomCheckoutBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    height: 80,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cartSummaryTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cartBadgeWrapper: {
    position: "relative",
    marginRight: 12,
  },
  cartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  cartCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cartCountText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  cartPrices: {
    flex: 1,
  },
  cartTotalLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  cartTotalPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingBox: {
    width: "100%",
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyContainer: {
    width: "100%",
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: "40%",
    maxHeight: "80%",
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  sheetSubTitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
  },
  cartItemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cartItemImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    minWidth: 24,
    textAlign: "center",
  },
  itemRemoveBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sheetTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTotalLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  sheetTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  sheetCheckoutBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetCheckoutBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});