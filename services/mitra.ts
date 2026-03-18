import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MitraInfo = {
  id_mitra: number;
  nama_toko: string;
  nama_pemilik: string;
  email: string;
  no_hp: string;
  alamat: string;
  logo?: string | null;
};

export async function getMitraInfo(id_mitra: number) {
  const response = await api.get("/toko/get-info.php", {
    params: { id_mitra },
  });
  return response.data;
}

export async function updateMitraInfo(payload: {
  id_mitra: number;
  nama_toko: string;
  email: string;
  no_hp: string;
  alamat: string;
  logo?: any;
}) {
  const formData = new FormData();
  formData.append("id_mitra", String(payload.id_mitra));
  formData.append("nama_toko", payload.nama_toko);
  formData.append("email", payload.email);
  formData.append("no_hp", payload.no_hp);
  formData.append("alamat", payload.alamat);

  if (payload.logo && typeof payload.logo !== "string") {
    formData.append("logo", payload.logo);
  }

  const response = await api.post("/toko/info.php", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getCachedMitraInfo(id_mitra: number) {
  try {
    const cacheKey = `mitra_info_${id_mitra}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    const now = Date.now();

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 5 minutes
      if (now - timestamp < 5 * 60 * 1000) {
        return { success: true, data };
      }
    }

    const result = await getMitraInfo(id_mitra);
    if (result.success && result.data) {
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ data: result.data, timestamp: now }),
      );
    }
    return result;
  } catch (error) {
    console.error("GET CACHED MITRA INFO ERROR:", error);
    return { success: false, message: "Gagal mengambil info toko" };
  }
}
