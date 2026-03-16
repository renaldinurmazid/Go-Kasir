import api from "./api";

export type ProdukPayload = {
  nama_produk: string;
  kategori: string;
  harga: number;
  diskon: number;
  satuan: string;
  stok: number;
  status_aktif: "aktif" | "nonaktif";
  id_mitra: number;
  gambar?: any;
};

export type ProdukListParams = {
  id_mitra: number;
  keyword?: string;
  kategori?: string;
};

export async function getProdukList(params: ProdukListParams) {
  const response = await api.get("/produk/list.php", { params });
  return response.data;
}

export async function tambahProduk(payload: ProdukPayload) {
  const formData = new FormData();

  formData.append("nama_produk", payload.nama_produk);
  formData.append("kategori", payload.kategori);
  formData.append("harga", String(payload.harga));
  formData.append("diskon", String(payload.diskon));
  formData.append("stok", String(payload.stok));
  formData.append("satuan", payload.satuan);
  formData.append("status_aktif", payload.status_aktif);
  formData.append("id_mitra", String(payload.id_mitra));

  if (payload.gambar) {
    formData.append("gambar", payload.gambar as any);
  }

  const response = await api.post("/produk/tambah.php", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function updateProduk(payload: {
  id_produk: number;
  id_mitra: number;
  nama_produk: string;
  kategori: string;
  harga: number;
  diskon: number;
  satuan: string;
  stok: number;
  status_aktif: "aktif" | "nonaktif";
  gambar?: any;
}) {
  const formData = new FormData();

  formData.append("id_produk", String(payload.id_produk));
  formData.append("id_mitra", String(payload.id_mitra));
  formData.append("nama_produk", payload.nama_produk);
  formData.append("kategori", payload.kategori);
  formData.append("harga", String(payload.harga));
  formData.append("diskon", String(payload.diskon));
  formData.append("stok", String(payload.stok));
  formData.append("satuan", payload.satuan);
  formData.append("status_aktif", payload.status_aktif);

  if (payload.gambar) {
    formData.append("gambar", payload.gambar as any);
  }

  const response = await api.post("/produk/update.php", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function updateStatusProduk(payload: {
  id_produk: number;
  id_mitra: number;
  status_aktif: "aktif" | "nonaktif";
}) {
  const response = await api.post("/produk/update-status.php", payload);
  return response.data;
}

export async function hapusProduk(payload: {
  id_produk: number;
  id_mitra: number;
}) {
  const response = await api.post("/produk/hapus.php", payload);
  return response.data;
}