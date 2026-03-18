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
    return (
      leftText +
      " ".repeat(width - leftText.length - rightText.length) +
      rightText
    );
  }

  return `${leftText}\n${padLeft(rightText, width)}`;
}

export function buildStrukText(data: any) {
  const lines: string[] = [];
  const W = 32; // Width of common 58mm printer

  const namaToko = safeText(data?.nama_toko) || "GoKasir";
  const alamatToko = safeText(data?.alamat_toko);
  const hpToko = safeText(data?.hp_toko);

  const tanggal = safeText(data?.tanggal) || "-";
  const kasir = safeText(data?.kasir) || "-";
  const namaPelanggan = safeText(data?.nama_pelanggan) || "-";
  const nomorHp = safeText(data?.nomor_hp) || "-";
  const metode = safeText(data?.metode_pembayaran) || "-";
  const items = Array.isArray(data?.items) ? data.items : [];

  // Header Toko (Centered)
  lines.push(
    padLeft(namaToko.toUpperCase(), Math.floor((W + namaToko.length) / 2)),
  );
  if (alamatToko) {
    // Basic multiline for long address
    const words = alamatToko.split(" ");
    let curLine = "";
    words.forEach((w) => {
      if ((curLine + w).length > W) {
        lines.push(
          padLeft(curLine.trim(), Math.floor((W + curLine.trim().length) / 2)),
        );
        curLine = w + " ";
      } else {
        curLine += w + " ";
      }
    });
    if (curLine)
      lines.push(
        padLeft(curLine.trim(), Math.floor((W + curLine.trim().length) / 2)),
      );
  }
  if (hpToko) {
    lines.push(padLeft("Tlp. " + hpToko, Math.floor((W + hpToko.length) / 2)));
  }

  lines.push("");
  lines.push(padLeft("STRUK PEMBAYARAN", Math.floor((W + 16) / 2)));
  lines.push(line(W));

  lines.push(`No.  : #${safeText(data?.id_penjualan) || "-"}`);
  lines.push(`Tgl  : ${tanggal}`);
  lines.push(`Kasir: ${kasir}`);

  if (namaPelanggan !== "-" || nomorHp !== "-") {
    lines.push(`Cust : ${namaPelanggan}`);
    if (nomorHp !== "-") lines.push(`HP   : ${nomorHp}`);
  }

  lines.push(line(W));

  items.forEach((item: any) => {
    const namaProduk = safeText(item?.nama_produk) || "Produk";
    const qty = Number(item?.qty || 0);
    const harga = Number(item?.harga || 0);
    const total = Number(item?.total || 0);

    lines.push(namaProduk);
    lines.push(
      twoCol(
        `${qty} x ${formatRupiahStruk(harga)}`,
        formatRupiahStruk(total),
        W,
      ),
    );
  });

  lines.push(line(W));
  lines.push(twoCol("TOTAL", formatRupiahStruk(Number(data?.total || 0)), W));
  lines.push(twoCol("BAYAR", formatRupiahStruk(Number(data?.bayar || 0)), W));
  lines.push(
    twoCol("KEMBALI", formatRupiahStruk(Number(data?.kembalian || 0)), W),
  );
  lines.push(twoCol("METODE", metode, W));
  lines.push(line(W));

  lines.push("");
  lines.push(padLeft("Terima Kasih", Math.floor((W + 12) / 2)));
  lines.push(padLeft("Atas Kunjungan Anda", Math.floor((W + 19) / 2)));
  lines.push("");
  lines.push("");

  return lines.join("\n");
}
