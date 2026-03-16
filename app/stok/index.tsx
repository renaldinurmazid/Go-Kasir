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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";

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

type DropdownOption = {
  label: string;
  value: string;
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
  const [kategoriList, setKategoriList] = useState<DropdownOption[]>([
    { label: "Semua Kategori", value: "Semua" },
  ]);

  const [statusStokList] = useState<DropdownOption[]>([
    { label: "Semua Status Stok", value: "" },
    { label: "Aman", value: "aman" },
    { label: "Menipis", value: "menipis" },
    { label: "Habis", value: "habis" },
  ]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [kategori, setKategori] = useState("Semua");
  const [statusStok, setStatusStok] = useState("");

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

        const mappedKategori = rawList
          .map((item: any) => {
            const namaKategori = String(item?.kategori || "").trim();

            if (!namaKategori) return null;

            return {
              label: namaKategori,
              value: namaKategori,
            };
          })
          .filter(Boolean) as DropdownOption[];

        const uniqueKategori = mappedKategori.filter(
          (item, index, self) =>
            index === self.findIndex((x) => x.value === item.value)
        );

        setKategoriList([
          { label: "Semua Kategori", value: "Semua" },
          ...uniqueKategori,
        ]);
      } else {
        setKategoriList([{ label: "Semua Kategori", value: "Semua" }]);
      }
    } catch (error) {
      setKategoriList([{ label: "Semua Kategori", value: "Semua" }]);
    }
  };

  const fetchAll = async (id_mitra: number, isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);

      const [summaryResult, listResult] = await Promise.all([
        getStokSummary(id_mitra),
        getStokList({
          id_mitra,
          keyword,
          kategori,
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
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "habis") {
      return {
        bg: "#FCE8E8",
        color: Colors.primary,
        label: "Habis",
      };
    }

    if (status === "menipis") {
      return {
        bg: "#FFF4D6",
        color: "#B7791F",
        label: "Menipis",
      };
    }

    return {
      bg: "#E8F5EA",
      color: "#2F8F46",
      label: "Aman",
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Stok</Text>
            <Text style={styles.headerSub}>Monitoring stok produk</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              userData?.id_mitra
                ? fetchAll(userData.id_mitra, true)
                : Promise.resolve()
            }
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Produk</Text>
            <Text style={styles.summaryValue}>{summary.total_produk}</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Stok</Text>
            <Text style={styles.summaryValue}>{summary.total_stok}</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Stok Menipis</Text>
            <Text style={styles.summaryValue}>{summary.stok_menipis}</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Stok Habis</Text>
            <Text style={styles.summaryValue}>{summary.stok_habis}</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <TextInput
            style={styles.input}
            placeholder="Cari nama produk"
            placeholderTextColor={Colors.textSoft}
            value={keyword}
            onChangeText={setKeyword}
          />

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={kategori}
              onValueChange={(value) => setKategori(String(value))}
              style={styles.picker}
            >
              {kategoriList.map((item) => (
                <Picker.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={statusStok}
              onValueChange={(value) => setStatusStok(String(value))}
              style={styles.picker}
            >
              {statusStokList.map((item) => (
                <Picker.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.listCard}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat data stok...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Belum ada data stok.</Text>
            </View>
          ) : (
            items.map((item) => {
              const statusStyle = getStatusStyle(item.status_stok);

              return (
                <View key={item.id_produk} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <View style={styles.imageWrap}>
                      {item.gambar ? (
                        <Image
                          source={{ uri: item.gambar }}
                          style={styles.itemImage}
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

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.itemTitle}>{item.nama_produk}</Text>
                      <Text style={styles.itemText}>
                        Kategori: {item.kategori}
                      </Text>
                      <Text style={styles.itemText}>
                        Harga: {formatRupiah(item.harga)}
                      </Text>
                      <Text style={styles.itemText}>Stok: {item.stok}</Text>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                        },
                      ]}
                    >
                      {statusStyle.label}
                    </Text>

                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status_aktif === "aktif"
                              ? "#E8F5EA"
                              : "#E8F0FF",
                          color:
                            item.status_aktif === "aktif"
                              ? "#2F8F46"
                              : "#2563EB",
                        },
                      ]}
                    >
                      {item.status_aktif === "aktif" ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>
              );
            })
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
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
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

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    marginTop: 12,
  },
  summaryBox: {
    width: "46%",
    backgroundColor: "#fff",
    margin: "2%",
    borderRadius: 14,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary,
  },

  filterCard: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 14,
    padding: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    color: Colors.text,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    color: Colors.text,
  },

  listCard: {
    marginHorizontal: 12,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrap: {
    width: 52,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  noImageBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  itemText: {
    fontSize: 13,
    color: Colors.text,
    marginTop: 3,
  },
  itemFooter: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },

  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
});