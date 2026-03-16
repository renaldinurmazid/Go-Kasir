import api from "./api";

export type LoginPayload = {
  username: string;
  password: string;
};

export async function loginRequest(payload: LoginPayload) {
  const response = await api.post("/auth/login.php", payload);
  return response.data;
}
