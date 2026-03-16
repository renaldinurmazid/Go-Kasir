import api from "./api";

export async function getLaporanSummary(params: {
  id_mitra: number;
  tanggal_awal?: string;
  tanggal_akhir?: string;
}) {
  const response = await api.get("/laporan/summary.php", {
    params,
  });
  return response.data;
}