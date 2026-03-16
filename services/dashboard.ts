import api from "./api";

export async function getDashboardSummary(id_mitra: number) {
  const response = await api.get("/dashboard/summary.php", {
    params: { id_mitra },
  });

  return response.data;
}