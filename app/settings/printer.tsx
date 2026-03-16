import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BLEPrinter, IBLEPrinter } from "react-native-thermal-receipt-printer";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../constants/colors";

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<IBLEPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<IBLEPrinter | null>(null);

  useEffect(() => {
    // Inisialisasi library saat mounting
    BLEPrinter.init().catch(err => console.log("Init library error:", err));
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const savedPrinter = await AsyncStorage.getItem("selected_printer");
      if (savedPrinter) {
        setConnectedDevice(JSON.parse(savedPrinter));
      }
    } catch (error) {
      console.log("Check connection error:", error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const apiLevel = Number(Platform.Version);
        if (apiLevel >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const isGranted = 
            granted["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED &&
            granted["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.GRANTED;
          
          if (!isGranted) {
            console.log("Permissions missing:", granted);
          }
          return isGranted;
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          return (
            granted["android.permission.ACCESS_FINE_LOCATION"] === PermissionsAndroid.RESULTS.GRANTED ||
            granted["android.permission.ACCESS_COARSE_LOCATION"] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const scanDevices = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Izin Ditolak", "Izin Bluetooth diperlukan untuk mencari printer.");
      return;
    }

    try {
      setLoading(true);
      console.log("Starting scan...");
      await BLEPrinter.init();
      
      // Tunggu lebih lama agar adapter benar-benar siap
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = await BLEPrinter.getDeviceList();
      console.log("Raw scan results:", results);
      
      if (results && results.length > 0) {
        setDevices(results);
      } else {
        Alert.alert(
          "Tidak Ada Perangkat", 
          "Pastikan printer sudah menyala dan sudah di-PAIRING (disandingkan) melalui Pengaturan Bluetooth HP Anda terlebih dahulu."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memindai. Pastikan Bluetooth & Lokasi aktif.");
      console.error("Scan Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectToPrinter = async (printer: IBLEPrinter) => {
    try {
      setLoading(true);
      await BLEPrinter.connectPrinter(printer.inner_mac_address);
      setConnectedDevice(printer);
      await AsyncStorage.setItem("selected_printer", JSON.stringify(printer));
      Alert.alert("Sukses", `Berhasil terhubung ke ${printer.device_name}`);
    } catch (error) {
      Alert.alert("Error", "Gagal terhubung ke printer.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      // Library typically doesn't have a direct "close" that clears state, 
      // but we can clear our local state.
      setConnectedDevice(null);
      await AsyncStorage.removeItem("selected_printer");
      Alert.alert("Info", "Printer diciduk (diputuskan).");
    } catch (error) {
      console.error(error);
    }
  };

  const renderItem = ({ item }: { item: IBLEPrinter }) => {
    const isConnected = connectedDevice?.inner_mac_address === item.inner_mac_address;
    
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isConnected && styles.deviceItemActive]}
        onPress={() => connectToPrinter(item)}
      >
        <View style={styles.deviceInfo}>
          <Ionicons
            name="print-outline"
            size={24}
            color={isConnected ? "#fff" : Colors.text}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.deviceName, isConnected && styles.textWhite]}>
              {item.device_name || "Unknown Device"}
            </Text>
            <Text style={[styles.deviceMac, isConnected && styles.textWhite]}>
              {item.inner_mac_address}
            </Text>
          </View>
        </View>
        {isConnected ? (
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Printer</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status Koneksi:</Text>
          {connectedDevice ? (
            <View style={styles.connectedRow}>
              <View style={styles.statusDotActive} />
              <Text style={styles.statusTextActive}>
                Terhubung ke {connectedDevice.device_name}
              </Text>
            </View>
          ) : (
            <View style={styles.connectedRow}>
              <View style={styles.statusDotInactive} />
              <Text style={styles.statusTextInactive}>Belum Terhubung</Text>
            </View>
          )}

          {connectedDevice && (
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={disconnectPrinter}
            >
              <Text style={styles.disconnectBtnText}>Putuskan</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Daftar Perangkat</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={scanDevices} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.scanBtnText}>Scan Ulang</Text>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.inner_mac_address}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="bluetooth-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {loading ? "Mencari perangkat..." : "Belum ada perangkat ditemukan.\nKlik scan untuk mencari."}
              </Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerInfo}>
          Pastikan Bluetooth printer Anda aktif dan dalam mode pairing.
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 8,
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  statusDotInactive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f44336",
    marginRight: 8,
  },
  statusTextActive: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
    flex: 1,
  },
  statusTextInactive: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f44336",
    flex: 1,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: "#f44336",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  disconnectBtnText: {
    color: "#f44336",
    fontWeight: "600",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  scanBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  scanBtnText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
  },
  deviceItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  deviceMac: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  textWhite: {
    color: "#fff",
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerInfo: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
