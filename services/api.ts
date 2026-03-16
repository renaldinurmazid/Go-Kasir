import axios from "axios";

export const API_BASE_URL = "https://gosukses.com/gokasir_api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;
