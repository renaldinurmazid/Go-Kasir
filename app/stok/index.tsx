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
  RefreshControl,
  Image,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Colors from "../../constants/colors";
import { getProdukKategoriList } from "../../services/produkKategori";
import { getStokList, getStokSummary } from "../../services/stok";

type UserData = {
  id_user: number;
  nama_lengkap: string;
  username: string;
  role: string;
  id_mitra: number;
  nama_toko?: string;
};

type StokItem = {
  id_produk: number;
  nama_produk: string;
  kategori: string;
  harga: number;
  diskon: number;
  gambar?: string | null;
  stok: number;
  satuan?: string;
  status_aktif: "aktif" | "nonaktif";
  status_stok: "aman" | "menipis" | "habis";
  created_at?: string;
};

type StokSummary = {
  total_produk: number;
  total_stok: number;
  stok_menipis: number;
  stok_habis: number;
};

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function StokScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);

  const [summary, setSummary] = useState<StokSummary>({
    total_produk: 0,
    total_stok: 0,
    stok_menipis: 0,
    stok_habis: 0,
  });

  const [items, setItems] = useState<StokItem[]>([]);
  const [kategoriList, setKategoriList] = useState<string[]>(["Semua Kategori"]);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [kategori, setKategori] = useState("Semua Kategori");
  const [statusStok, setStatusStok] = useState("");
  
  const [showKategoriDropdown, setShowKategoriDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!userData?.id_mitra) return;

    const timer = setTimeout(() => {
      fetchAll(userData.id_mitra, false);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, kategori, statusStok, userData?.id_mitra]);

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
        fetchAll(user.id_mitra, false),
      ]);
    } catch (error) {
      Alert.alert("Error", "Gagal memuat halaman stok.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKategori = async (id_mitra: number) => {
    try {
      const result = await getProdukKategoriList(id_mitra);

      if (result.success) {
        const rawList = Array.isArray(result.data) ? result.data : [];
        const apiKategori: string[] = rawList
          .map((item: any) => String(item.kategori || "").trim())
          .filter((item: string) => item !== "");

        const uniqueKategori = ["Semua Kategori", ...new Set(apiKategori)];
        setKategoriList(uniqueKategori);
      } else {
        setKategoriList(["Semua Kategori"]);
      }
    } catch (error) {
      setKategoriList(["Semua Kategori"]);
    }
  };

  const fetchAll = async (id_mitra: number, isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setListLoading(true);

      const [summaryResult, listResult] = await Promise.all([
        getStokSummary(id_mitra),
        getStokList({
          id_mitra,
          keyword,
          kategori: kategori === "Semua Kategori" ? "" : kategori,
          status_stok: statusStok,
        }),
      ]);

      if (summaryResult.success) {
        setSummary(
          summaryResult.data || {
            total_produk: 0,
            total_stok: 0,
            stok_menipis: 0,
            stok_habis: 0,
          }
        );
      }

      if (listResult.success) {
        setItems(listResult.data || []);
      } else {
        setItems([]);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Gagal memuat data stok"
      );
    } finally {
      setRefreshing(false);
      setListLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
        case "habis": return { label: "Habis", color: Colors.primary, bg: "#FEF2F2" };
        case "menipis": return { label: "Menipis", color: "#B45309", bg: "#FFFBEB" };
        default: return { label: "Aman", color: "#059669", bg: "#ECFDF5" };
    }
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
          <Text style={styles.headerTitle}>Monitoring Stok</Text>
          <View style={{ width: 40 }} />
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
            onPress={() => setShowKategoriDropdown(!showKategoriDropdown)}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {kategori === "Semua Kategori" ? "Kategori" : kategori}
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
                      kategori === item && styles.categoryPillActive,
                    ]}
                    onPress={() => {
                      setKategori(item);
                      setShowKategoriDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        kategori === item && styles.categoryPillTextActive,
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
            onRefresh={() => userData?.id_mitra && fetchAll(userData.id_mitra, true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary Grid */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Varian</Text>
            <Text style={styles.summaryValue}>{summary.total_produk}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Qty</Text>
            <Text style={styles.summaryValue}>{summary.total_stok}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Stok Menipis</Text>
            <Text style={[styles.summaryValue, { color: '#B45309' }]}>{summary.stok_menipis}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Habis</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{summary.stok_habis}</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.listHeaderText}>Detail Persediaan</Text>
              <Text style={styles.listSubHeaderText}>{userData?.nama_toko || "Semua Cabang"}</Text>
            </View>
            <TouchableOpacity 
                style={styles.statusFilterBtn}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
                <Text style={styles.statusFilterText}>
                    {statusStok === "" ? "Semua Status" : statusStok.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {showStatusDropdown && (
              <View style={styles.statusDropdown}>
                  {[
                      {label: 'Semua Status', v: ''},
                      {label: 'Aman', v: 'aman'},
                      {label: 'Menipis', v: 'menipis'},
                      {label: 'Habis', v: 'habis'}
                  ].map((s) => (
                      <TouchableOpacity 
                        key={s.v} 
                        style={styles.statusDropdownItem}
                        onPress={() => { setStatusStok(s.v); setShowStatusDropdown(false); }}
                      >
                          <Text style={[styles.statusDropdownText, statusStok === s.v && { color: Colors.primary, fontWeight: '700' }]}>
                             {s.label}
                          </Text>
                      </TouchableOpacity>
                  ))}
              </View>
          )}
        </View>

        {loading || (listLoading && items.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat persediaan...</Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => {
            const status = getStatusInfo(item.status_stok);
            return (
              <View key={item.id_produk} style={styles.stockCard}>
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
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.productKategori}>{item.kategori}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Stok Saat Ini</Text>
                    <Text style={[styles.detailValue, { color: status.color }]}>
                      {item.stok} <Text style={styles.detailUnit}>{item.satuan || 'Item'}</Text>
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Harga Jual</Text>
                    <Text style={styles.detailValue}>{formatRupiah(item.harga)}</Text>
                  </View>
                </View>
                
                <View style={styles.cardFooter}>
                    <Ionicons 
                        name={item.status_aktif === 'aktif' ? 'checkmark-circle' : 'close-circle'} 
                        size={14} 
                        color={item.status_aktif === 'aktif' ? '#16A34A' : '#EF4444'} 
                    />
                    <Text style={[styles.footerText, { color: item.status_aktif === 'aktif' ? '#16A34A' : '#EF4444' }]}>
                        Produk {item.status_aktif === 'aktif' ? 'masih aktif di katalog' : 'disembunyikan'}
                    </Text>
                </View>
              </View>
            );
          })
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
    width: 140,
  },
  filterButtonText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    flex: 1,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 110,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  dropdownContents: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  categoryPillTextActive: {
    color: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  summaryBox: {
    flex: 1,
    minWidth: '45%',
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
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  listHeader: {
    marginBottom: 16,
    zIndex: 5,
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
  statusFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusDropdown: {
      position: 'absolute',
      top: 40,
      right: 0,
      backgroundColor: '#fff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      width: 150,
      zIndex: 100,
  },
  statusDropdownItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
  },
  statusDropdownText: {
      fontSize: 13,
      color: '#475569',
  },
  stockCard: {
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
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
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
    alignItems: "baseline",
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
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
    flex: 0.5,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  detailUnit: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '500',
  },
  cardFooter: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#FDFDFD',
  },
  footerText: {
      fontSize: 11,
      fontWeight: '500',
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