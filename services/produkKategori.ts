import api from "./api";

export async function getProdukKategoriList(id_mitra: number) {
  const response = await api.get("/produk-kategori/list.php", {
    params: { id_mitra },
  });
  return response.data;
}