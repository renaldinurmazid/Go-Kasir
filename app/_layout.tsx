import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login/index" />
      <Stack.Screen name="register-mitra/index" />
      <Stack.Screen name="dashboard/index" />
      <Stack.Screen name="produk/index" />
      <Stack.Screen name="produk-masuk/index" />
      <Stack.Screen name="penjualan/index" />
      <Stack.Screen name="pembayaran/index" />
      <Stack.Screen name="pembayaran/sukses" />
      <Stack.Screen name="history-penjualan/index" />
      <Stack.Screen name="laporan/index" />
      <Stack.Screen name="pengeluaran/index" />
      <Stack.Screen name="hutang/index" />
      <Stack.Screen name="stok/index" />
      <Stack.Screen name="settings/printer" />
    </Stack>
  );
}
