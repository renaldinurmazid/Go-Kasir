import api, { API_BASE_URL } from "./api";

export async function getHistoryPenjualan(params: {
  id_mitra: number;
  keyword?: string;
  metode_pembayaran?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const response = await api.get("/penjualan/list.php", {
    params,
  });
  return response.data;
}

export async function getDetailPenjualan(params: {
  id_penjualan: number;
  id_mitra: number;
}) {
  const response = await api.get("/penjualan/detail.php", {
    params,
  });
  return response.data;
}

export function getExportHistoryPenjualanUrl(params: {
  id_mitra: number;
  keyword?: string;
  metode_pembayaran?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const query = new URLSearchParams();

  query.append("id_mitra", String(params.id_mitra));

  if (params.keyword) query.append("keyword", params.keyword);
  if (params.metode_pembayaran) {
    query.append("metode_pembayaran", params.metode_pembayaran);
  }
  if (params.tanggal_awal) query.append("tanggal_awal", params.tanggal_awal);
  if (params.tanggal_akhir) query.append("tanggal_akhir", params.tanggal_akhir);

  return `${API_BASE_URL}/penjualan/export-excel.php?${query.toString()}`;
}