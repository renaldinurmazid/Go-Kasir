import { BLEPrinter } from "react-native-thermal-receipt-printer";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function printStruk(text: string) {
  try {
    const savedPrinter = await AsyncStorage.getItem("selected_printer");
    
    if (!savedPrinter) {
      return {
        success: false,
        message: "Printer belum terhubung. Silakan atur printer di Dashboard.",
        preview: text
      };
    }

    const printer = JSON.parse(savedPrinter);
    
    // Inisialisasi dan koneksi ulang jika perlu (beberapa library butuh ini)
    await BLEPrinter.init();
    await BLEPrinter.connectPrinter(printer.inner_mac_address);
    
    // Kirim perintah print
    await BLEPrinter.printText(text + "\n\n\n\n"); 
    
    return {
      success: true,
      message: "Berhasil mencetak struk.",
      preview: text,
    };
  } catch (error: any) {
    console.log("PRINT ERROR:", error);
    return {
      success: false,
      message: "Gagal mencetak struk: " + (error?.message || "Kesalahan Bluetooth"),
      preview: text,
    };
  }
}