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
  DeviceEventEmitter,
  NativeModules,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../constants/colors";

const { BluetoothManager } = NativeModules;

interface BluetoothDevice {
  name: string;
  address: string;
}

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);

  useEffect(() => {
    checkConnection();
    const listeners: any[] = [];

    if (BluetoothManager) {
      if (BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED) {
        listeners.push(
          DeviceEventEmitter.addListener(
            BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
            (rsp: any) => {
              try {
                const raw = rsp?.devices ?? rsp?.device ?? rsp;
                const arr: any[] =
                  typeof raw === "string" ? JSON.parse(raw) : raw;
                if (Array.isArray(arr) && arr.length > 0) {
                  const cleaned = arr
                    .map((d: any) =>
                      typeof d === "string" ? JSON.parse(d) : d,
                    )
                    .filter((d: any) => d && d.address);
                  setDevices((prev) => {
                    const combined = [...prev, ...cleaned];
                    return combined.filter(
                      (v, i, a) =>
                        a.findIndex((t) => t.address === v.address) === i,
                    );
                  });
                }
              } catch (e) {
                console.log("EVENT_DEVICE_ALREADY_PAIRED parse error:", e);
              }
            },
          ),
        );
      }

      if (BluetoothManager.EVENT_DEVICE_FOUND) {
        listeners.push(
          DeviceEventEmitter.addListener(
            BluetoothManager.EVENT_DEVICE_FOUND,
            (rsp: any) => {
              try {
                const raw = rsp?.device ?? rsp?.devices ?? rsp;
                const device: any =
                  typeof raw === "string" ? JSON.parse(raw) : raw;
                if (device && device.address) {
                  setDevices((prev) => {
                    if (prev.find((d) => d.address === device.address))
                      return prev;
                    return [...prev, device];
                  });
                }
              } catch (e) {
                console.log("EVENT_DEVICE_FOUND parse error:", e);
              }
            },
          ),
        );
      }
    }

    return () => {
      listeners.forEach((l) => l.remove());
    };
  }, []);

  const checkConnection = async () => {
    try {
      const savedPrinter = await AsyncStorage.getItem("selected_printer");
      if (savedPrinter) {
        setConnectedDevice(JSON.parse(savedPrinter));
      }
    } catch (error) {
      console.log("checkConnection error:", error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      const apiLevel = Number(Platform.Version);
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const scanStatus = granted["android.permission.BLUETOOTH_SCAN"];
        const connectStatus = granted["android.permission.BLUETOOTH_CONNECT"];

        const permanentlyDenied =
          scanStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          connectStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (permanentlyDenied) {
          Alert.alert(
            "Izin Bluetooth Diperlukan",
            "Anda telah menolak izin Bluetooth secara permanen. Silakan aktifkan di Pengaturan Aplikasi.",
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Buka Pengaturan",
                onPress: () => Linking.openSettings(),
              },
            ],
          );
          return false;
        }

        return (
          scanStatus === PermissionsAndroid.RESULTS.GRANTED &&
          connectStatus === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted["android.permission.ACCESS_COARSE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          granted["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } catch (err) {
      console.warn("requestPermissions error:", err);
      return false;
    }
  };

  const scanDevices = async () => {
    if (!BluetoothManager) {
      Alert.alert("Error", "Bluetooth Manager tidak termuat.");
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      setDevices([]);

      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        if (Platform.OS === "android") {
          await BluetoothManager.enableBluetooth();
          // Give system some time to actually turn on the radio
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          Alert.alert(
            "Bluetooth Tidak Aktif",
            "Silakan aktifkan Bluetooth terlebih dahulu.",
          );
          setLoading(false);
          return;
        }
      }

      // Sometimes scanDevices throws NOT_STARTED if called too quickly or if another scan is pending
      const resultStr = await BluetoothManager.scanDevices().catch((e: any) => {
        if (e?.message?.includes("NOT_STARTED")) {
          // If NOT_STARTED, it often means it timed out or was interrupted.
          // We can try to just return empty or throw a cleaner error.
          return JSON.stringify({ paired: [], found: [] });
        }
        throw e;
      });

      if (resultStr) {
        const result =
          typeof resultStr === "string" ? JSON.parse(resultStr) : resultStr;
        const paired: any[] = Array.isArray(result.paired) ? result.paired : [];
        const found: any[] = Array.isArray(result.found) ? result.found : [];

        const parseDevice = (d: any): BluetoothDevice | null => {
          try {
            const obj = typeof d === "string" ? JSON.parse(d) : d;
            if (obj && obj.address) return obj;
            return null;
          } catch {
            return null;
          }
        };

        const all = [
          ...paired.map(parseDevice),
          ...found.map(parseDevice),
        ].filter(Boolean) as BluetoothDevice[];
        if (all.length > 0) {
          setDevices((prev) => {
            const combined = [...prev, ...all];
            return combined.filter(
              (v, i, a) => a.findIndex((t) => t.address === v.address) === i,
            );
          });
        }
      }
    } catch (error: any) {
      console.error("Scan Error Detail:", error);
      if (error?.message?.includes("NOT_STARTED")) {
        Alert.alert(
          "Scan Timeout",
          "Pencarian perangkat berhenti. Pastikan Bluetooth aktif dan coba scan ulang.",
        );
      } else {
        Alert.alert("Scan Gagal", "Terjadi kesalahan saat mencari perangkat.");
      }
    } finally {
      setLoading(false);
    }
  };

  const connectToPrinter = async (device: BluetoothDevice) => {
    try {
      setLoading(true);
      await BluetoothManager.connect(device.address);
      setConnectedDevice(device);
      await AsyncStorage.setItem("selected_printer", JSON.stringify(device));
      Alert.alert("Sukses", `Terhubung ke ${device.name || "Printer"}`);
    } catch (error: any) {
      Alert.alert("Gagal Terhubung", "Pastikan printer menyala.");
    } finally {
      setLoading(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (connectedDevice) {
        if (BluetoothManager.unpaire)
          await BluetoothManager.unpaire(connectedDevice.address);
        else if (BluetoothManager.unpair)
          await BluetoothManager.unpair(connectedDevice.address);
      }
      setConnectedDevice(null);
      await AsyncStorage.removeItem("selected_printer");
      Alert.alert("Info", "Printer diputuskan.");
    } catch (error) {
      setConnectedDevice(null);
      await AsyncStorage.removeItem("selected_printer");
    }
  };

  const renderItem = ({ item }: { item: BluetoothDevice }) => {
    const isConnected = connectedDevice?.address === item.address;
    return (
      <TouchableOpacity
        style={[styles.deviceCard, isConnected && styles.deviceCardActive]}
        onPress={() => connectToPrinter(item)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceInfo}>
          <View
            style={[
              styles.iconBox,
              isConnected && { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
          >
            <Ionicons
              name="print-outline"
              size={24}
              color={isConnected ? "#fff" : Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.deviceName, isConnected && { color: "#fff" }]}
              numberOfLines={1}
            >
              {item.name || "Unknown Device"}
            </Text>
            <Text
              style={[
                styles.deviceMac,
                isConnected && { color: "rgba(255,255,255,0.7)" },
              ]}
            >
              {item.address}
            </Text>
          </View>
        </View>
        {isConnected ? (
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        )}
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Pengaturan Printer</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Connection Card */}
        <View
          style={[
            styles.statusBanner,
            connectedDevice
              ? styles.statusConnected
              : styles.statusDisconnected,
          ]}
        >
          <View style={styles.statusInfo}>
            <Ionicons
              name={connectedDevice ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={connectedDevice ? "#16A34A" : "#EF4444"}
            />
            <Text
              style={[
                styles.statusText,
                { color: connectedDevice ? "#16A34A" : "#EF4444" },
              ]}
            >
              {connectedDevice
                ? `Terhubung: ${connectedDevice.name}`
                : "Printer Belum Terhubung"}
            </Text>
          </View>
          {connectedDevice && (
            <TouchableOpacity
              onPress={disconnectPrinter}
              style={styles.disconnectLink}
            >
              <Text style={styles.disconnectLinkText}>Putuskan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.listTitle}>Daftar Perangkat</Text>
            <Text style={styles.listSubTitle}>
              Cari dan pilih printer bluetooth
            </Text>
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={scanDevices}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="reload" size={16} color={Colors.primary} />
                <Text style={styles.scanButtonText}>Scan Ulang</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.address}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCircle}>
                <Ionicons name="bluetooth-outline" size={48} color="#E2E8F0" />
              </View>
              <Text style={styles.emptyTitle}>
                {loading ? "Sedang Mencari..." : "Belum Ada Perangkat"}
              </Text>
              <Text style={styles.emptySub}>
                Pastikan printer Bluetooth menyala dan sudah dipairing di
                pengaturan HP.
              </Text>
            </View>
          }
        />
      </View>

      <View style={styles.infoFooter}>
        <Ionicons name="information-circle-outline" size={16} color="#64748B" />
        <Text style={styles.infoFooterText}>
          Bluetooth Manager memerlukan izin Lokasi untuk memindai perangkat di
          sekitar.
        </Text>
      </View>
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusConnected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  statusDisconnected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  disconnectLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  disconnectLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EF4444",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  listSubTitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  scanButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  listContainer: {
    paddingBottom: 20,
  },
  deviceCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  deviceCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  deviceMac: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 60,
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
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  infoFooter: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  infoFooterText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
});
