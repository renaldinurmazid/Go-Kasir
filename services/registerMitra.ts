import api from "./api";

export type RegisterMitraPayload = {
  nama_toko: string;
  nama_pemilik: string;
  email: string;
  no_hp: string;
  alamat: string;
  username: string;
  password: string;
  konfirmasi_password: string;
};

export async function registerMitraRequest(payload: RegisterMitraPayload) {
  const response = await api.post("/auth/register-mitra.php", payload);
  return response.data;
}
