import { NativeModules } from "react-native";
const { BluetoothManager, BluetoothEscposPrinter } = NativeModules;
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function printStruk(text: string, logoUrl?: string | null) {
  try {
    if (!BluetoothManager || !BluetoothEscposPrinter) {
      return {
        success: false,
        message: "Printer library tidak termuat. Harap rebuild aplikasi.",
        preview: text
      };
    }

    const savedPrinter = await AsyncStorage.getItem("selected_printer");
    
    if (!savedPrinter) {
      return {
        success: false,
        message: "Printer belum terhubung. Silakan atur printer di Dashboard.",
        preview: text
      };
    }

    const printer = JSON.parse(savedPrinter);
    
    const isEnabled = await BluetoothManager.isBluetoothEnabled();
    if (!isEnabled) {
      return {
        success: false,
        message: "Bluetooth tidak aktif.",
        preview: text
      };
    }

    await BluetoothManager.connect(printer.address);
    
    // Print Logo if available
    if (logoUrl) {
      try {
        // We use printPic which takes base64. 
        // Note: For production, you might need to pre-convert the URL to base64.
        // Assuming the library can handle direct base64 if we fetch it.
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const base64Logo = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        
        // Remove data:image/png;base64, prefix
        const cleanBase64 = (base64Logo as string).split(",")[1];
        
        // printPic(base64, options)
        // Options usually include width and left padding
        await BluetoothEscposPrinter.printPic(cleanBase64, { 
          width: 200, // Adjust size as needed
          left: 50    // Center alignment approximation
        });
      } catch (picError) {
        console.log("LOGO PRINT ERROR:", picError);
        // Continue printing text even if logo fails
      }
    }
    
    await BluetoothEscposPrinter.printText(text + "\n\n\n\n", {}); 
    
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