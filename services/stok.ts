import api from "./api";

export async function getStokSummary(id_mitra: number) {
  const response = await api.get("/stok/summary.php", {
    params: { id_mitra },
  });
  return response.data;
}

export async function getStokList(params: {
  id_mitra: number;
  keyword?: string;
  kategori?: string;
  status_stok?: string;
}) {
  const response = await api.get("/stok/list.php", {
    params,
  });
  return response.data;
}