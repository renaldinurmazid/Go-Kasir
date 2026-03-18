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
  Pressable,
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
import { getCachedMitraInfo } from "../../services/mitra";

// --- Types ---
type UserData = {
  id_user: number;
  nama_lengkap: string;
  id_mitra: number;
  nama_toko?: string;
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

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function HistoryPenjualanScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [keyword, setKeyword] = useState("");
  const [metode, setMetode] = useState("");
  const [dtAwal, setDtAwal] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [dtAkhir, setDtAkhir] = useState(new Date());
  const [showPicker, setShowPicker] = useState({ show: false, field: "" });

  const [items, setItems] = useState<HistoryItem[]>([]);

  // Summary State
  const [summary, setSummary] = useState({
    tunai: 0,
    bank: 0,
    qris: 0,
    total: 0,
  });

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

  const formatDateDb = (date: Date) => date.toISOString().split("T")[0];
  const formatDateIndo = (date: Date) =>
    date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const initializePage = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user_data");
      if (!storedUser) {
        router.replace("/login");
        return;
      }
      const user = JSON.parse(storedUser);
      setUserData(user);
      await fetchHistory(user.id_mitra, false);
    } catch (e) {
      Alert.alert("Error", "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id_mitra: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setListLoading(true);

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
        const sum = data.reduce(
          (acc, curr) => {
            const m = curr.metode_pembayaran.toLowerCase();
            if (m === "tunai") acc.tunai += curr.total;
            else if (m === "bank") acc.bank += curr.total;
            else if (m === "qris") acc.qris += curr.total;
            acc.total += curr.total;
            return acc;
          },
          { tunai: 0, bank: 0, qris: 0, total: 0 },
        );

        setSummary(sum);
      }
    } catch (e) {
      console.log("Fetch Error");
    } finally {
      setRefreshing(false);
      setListLoading(false);
    }
  };

  const handleOpenDetail = async (id_penjualan: number) => {
    if (!userData?.id_mitra) return;
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const result = await getDetailPenjualan({
        id_penjualan,
        id_mitra: userData.id_mitra,
      });
      if (result.success) {
        setDetailHeader(result.data?.header || null);
        setDetailItems(result.data?.items || []);
      }
    } catch (e) {
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrintUlang = async () => {
    try {
      if (!detailHeader || !userData?.id_mitra) return;

      // Fetch Store Info
      const mitraResult = await getCachedMitraInfo(userData.id_mitra);
      const storeData = mitraResult.success ? mitraResult.data : {};

      const dataStruk = {
        ...detailHeader,
        items: detailItems,
        kasir: detailHeader.nama_lengkap,
        nama_toko: storeData.nama_toko || detailHeader.nama_toko,
        alamat_toko: storeData.alamat,
        hp_toko: storeData.no_hp,
      };

      const text = buildStrukText(dataStruk);
      const result = await printStruk(
        text,
        storeData.logo || detailHeader?.logo || null,
      );

      if (result.success) Alert.alert("Selesai", "Struk berhasil dicetak");
      else Alert.alert("Printer", result.message);
    } catch (error) {
      Alert.alert("Error", "Printer tidak merespon");
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
          <Text style={styles.headerTitle}>History Penjualan</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBarWrapper}>
            <Ionicons
              name="search"
              size={20}
              color={Colors.textSoft}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari transaksi..."
              placeholderTextColor={Colors.textSoft}
              value={keyword}
              onChangeText={setKeyword}
            />
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowPicker({ show: true, field: "awal" })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {formatDateIndo(dtAwal)}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metodeScroll}
        >
          {["", "tunai", "bank", "qris"].map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.metodePill,
                metode === m && styles.metodePillActive,
              ]}
              onPress={() => setMetode(m)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.metodePillText,
                  metode === m && styles.metodePillTextActive,
                ]}
              >
                {m === "" ? "Semua" : m.toUpperCase()}
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
            onRefresh={() => fetchHistory(userData?.id_mitra!, true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary Info Boxes */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Omzet</Text>
            <Text style={styles.summaryValue}>
              {formatRupiah(summary.total)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Tunai</Text>
            <Text style={[styles.summaryValue, { color: "#16A34A" }]}>
              {formatRupiah(summary.tunai)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Non-Tunai</Text>
            <Text style={[styles.summaryValue, { color: "#2563EB" }]}>
              {formatRupiah(summary.bank + summary.qris)}
            </Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {items.length} Transaksi Ditemukan
          </Text>
          <Text style={styles.listSubHeaderText}>
            {userData?.nama_toko || "Semua Mitra"}
          </Text>
        </View>

        {loading || (listLoading && items.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat history...</Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => (
            <TouchableOpacity
              key={item.id_penjualan}
              style={styles.transactionCard}
              onPress={() => handleOpenDetail(item.id_penjualan)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="receipt-outline"
                    size={24}
                    color={Colors.primary}
                  />
                </View>

                <View style={styles.cardMainInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.invoiceNo}>#{item.id_penjualan}</Text>
                    <View
                      style={[
                        styles.methodBadge,
                        {
                          backgroundColor:
                            item.metode_pembayaran.toLowerCase() === "tunai"
                              ? "#F0FDF4"
                              : "#EFF6FF",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.methodBadgeText,
                          {
                            color:
                              item.metode_pembayaran.toLowerCase() === "tunai"
                                ? "#16A34A"
                                : "#2563EB",
                          },
                        ]}
                      >
                        {item.metode_pembayaran.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubText}>
                    {item.tanggal} • {item.nama_lengkap}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Total Pembayaran</Text>
                <Text style={styles.amountValue}>
                  {formatRupiah(item.total)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search" size={48} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>Transaksi Tidak Ditemukan</Text>
            <Text style={styles.emptySub}>
              Coba cari dengan kata kunci atau periode lain.
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Detail */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDetailModal(false)}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.headerIconButton}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {detailHeader && (
                  <View style={styles.detailHeaderSection}>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailLabel}>No. Invoice</Text>
                      <Text style={styles.detailValue}>
                        #{detailHeader.id_penjualan}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailLabel}>Tanggal</Text>
                      <Text style={styles.detailValue}>
                        {detailHeader.tanggal}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailLabel}>Kasir</Text>
                      <Text style={styles.detailValue}>
                        {detailHeader.nama_lengkap}
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Item Terjual</Text>
                {detailItems.map((item) => (
                  <View key={item.id_detail} style={styles.detailItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.nama_produk}</Text>
                      <Text style={styles.itemSub}>
                        {item.qty} x {formatRupiah(item.harga)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatRupiah(item.total)}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalValue}>
                      {formatRupiah(detailHeader?.total)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.paymentLabel}>Metode Bayar</Text>
                    <Text style={styles.paymentValue}>
                      {detailHeader?.metode_pembayaran?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handlePrintUlang}
                >
                  <Ionicons
                    name="print"
                    size={22}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>Cetak Ulang Struk</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    marginBottom: 16,
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
  metodeScroll: {
    paddingBottom: 4,
    gap: 8,
  },
  metodePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  metodePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  metodePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  metodePillTextActive: {
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
    minWidth: "45%",
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
    fontSize: 16,
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
  transactionCard: {
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
    backgroundColor: "#FEF2F2",
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
  invoiceNo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: "800",
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
  },
  amountLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
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
  detailHeaderSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  detailInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  itemSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  totalSection: {
    marginTop: 20,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
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
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
