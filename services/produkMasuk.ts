import api from "./api";

export async function getProdukOpsi(id_mitra: number) {
  const response = await api.get("/produk/opsi.php", {
    params: { id_mitra },
  });
  return response.data;
}

export async function getProdukMasukList(params: {
  id_mitra: number;
  keyword?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const response = await api.get("/produk-masuk/list.php", {
    params,
  });
  return response.data;
}

export async function tambahProdukMasuk(payload: {
  id_produk: number;
  qty_masuk: number;
  tanggal_masuk: string;
  catatan: string;
  id_user: number;
  id_mitra: number;
}) {
  const response = await api.post("/produk-masuk/tambah.php", payload);
  return response.data;
}