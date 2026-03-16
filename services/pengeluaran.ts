import api from "./api";

export async function getPengeluaranList(params: {
  id_mitra: number;
  keyword?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const response = await api.get("/pengeluaran/list.php", {
    params,
  });
  return response.data;
}

export async function tambahPengeluaran(payload: {
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  id_user: number;
  id_mitra: number;
}) {
  const response = await api.post("/pengeluaran/tambah.php", payload);
  return response.data;
}

export async function hapusPengeluaran(payload: {
  id_pengeluaran: number;
  id_mitra: number;
}) {
  const response = await api.post("/pengeluaran/hapus.php", payload);
  return response.data;
}