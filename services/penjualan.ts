import api from "./api";

export type SimpanPenjualanPayload = {
  id_mitra: number;
  id_user: number;
  metode_pembayaran: string;
  total: number;
  bayar: number;
  kembalian: number;
  nama_pelanggan?: string;
  nomor_hp?: string;
  items: Array<{
    id_produk: number;
    nama_produk: string;
    harga: number;
    qty: number;
    diskon: number;
    total: number;
  }>;
};

export async function simpanPenjualan(payload: SimpanPenjualanPayload) {
  const response = await api.post("/penjualan/simpan.php", payload);
  return response.data;
}

export async function getDetailPenjualan(id_penjualan: number, id_mitra: number) {
  const response = await api.get("/penjualan/detail.php", {
    params: { id_penjualan, id_mitra },
  });
  return response.data;
}