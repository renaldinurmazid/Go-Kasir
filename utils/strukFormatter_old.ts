export function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export function buildStrukText(data: any) {
  const lines: string[] = [];

  lines.push("GO KASIR");
  lines.push(data.nama_toko || "-");
  lines.push("--------------------------------");
  lines.push(`No. Transaksi : #${data.id_penjualan}`);
  lines.push(`Tanggal       : ${data.tanggal}`);
  lines.push(`Kasir         : ${data.kasir}`);
  lines.push(`Pelanggan     : ${data.nama_pelanggan || "-"}`);
  lines.push(`No. HP        : ${data.nomor_hp || "-"}`);
  lines.push("--------------------------------");

  (data.items || []).forEach((item: any) => {
    lines.push(item.nama_produk);
    lines.push(
      `${item.qty} x ${formatRupiah(item.harga)}   ${formatRupiah(item.total)}`
    );
  });

  lines.push("--------------------------------");
  lines.push(`TOTAL      : ${formatRupiah(data.total)}`);
  lines.push(`BAYAR      : ${formatRupiah(data.bayar)}`);
  lines.push(`KEMBALIAN  : ${formatRupiah(data.kembalian)}`);
  lines.push(`METODE     : ${data.metode_pembayaran}`);
  lines.push("");
  lines.push("Terima Kasih");
  lines.push("");
  lines.push("");

  return lines.join("\n");
}