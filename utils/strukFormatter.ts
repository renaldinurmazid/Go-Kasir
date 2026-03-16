export function formatRupiahStruk(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function safeText(value: any) {
  return String(value ?? "").trim();
}

function line(width = 32) {
  return "-".repeat(width);
}

function padRight(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

function twoCol(left: string, right: string, width = 32) {
  const leftText = safeText(left);
  const rightText = safeText(right);

  if (leftText.length + rightText.length + 1 <= width) {
    return leftText + " ".repeat(width - leftText.length - rightText.length) + rightText;
  }

  return `${leftText}\n${padLeft(rightText, width)}`;
}

export function buildStrukText(data: any) {
  const lines: string[] = [];

  const namaToko = safeText(data?.nama_toko) || "GoKasir";
  const tanggal = safeText(data?.tanggal) || "-";
  const kasir = safeText(data?.kasir) || "-";
  const namaPelanggan = safeText(data?.nama_pelanggan) || "-";
  const nomorHp = safeText(data?.nomor_hp) || "-";
  const metode = safeText(data?.metode_pembayaran) || "-";
  const items = Array.isArray(data?.items) ? data.items : [];

  lines.push(namaToko.toUpperCase());
  lines.push("STRUK PEMBAYARAN");
  lines.push(line());

  lines.push(`No.  : #${safeText(data?.id_penjualan) || "-"}`);
  lines.push(`Tgl  : ${tanggal}`);
  lines.push(`Kasir: ${kasir}`);
  lines.push(`Cust : ${namaPelanggan}`);
  lines.push(`HP   : ${nomorHp}`);
  lines.push(line());

  items.forEach((item: any) => {
    const namaProduk = safeText(item?.nama_produk) || "Produk";
    const qty = Number(item?.qty || 0);
    const harga = Number(item?.harga || 0);
    const total = Number(item?.total || 0);

    lines.push(namaProduk);
    lines.push(twoCol(`${qty} x ${formatRupiahStruk(harga)}`, formatRupiahStruk(total)));
  });

  lines.push(line());
  lines.push(twoCol("TOTAL", formatRupiahStruk(Number(data?.total || 0))));
  lines.push(twoCol("BAYAR", formatRupiahStruk(Number(data?.bayar || 0))));
  lines.push(twoCol("KEMBALI", formatRupiahStruk(Number(data?.kembalian || 0))));
  lines.push(twoCol("METODE", metode));
  lines.push(line());
  lines.push("Terima kasih");
  lines.push("");
  lines.push("");

  return lines.join("\n");
}