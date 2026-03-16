import api from "./api";

export async function getHutangList(params: {
  id_mitra: number;
  keyword?: string;
  status_hutang?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const response = await api.get("/hutang/list.php", {
    params,
  });
  return response.data;
}

export async function tambahHutang(payload: {
  nama_pelanggan: string;
  nominal: number;
  tanggal_hutang: string;
  jatuh_tempo?: string | null;
  catatan: string;
  id_user: number;
  id_mitra: number;
}) {
  const response = await api.post("/hutang/tambah.php", payload);
  return response.data;
}

export async function lunasiHutang(payload: {
  id_hutang: number;
  id_mitra: number;
}) {
  const response = await api.post("/hutang/lunasi.php", payload);
  return response.data;
}