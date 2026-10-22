import "server-only";
import QRCode from "qrcode";

/** QR Code em SVG (sem imagens externas). */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#070b09", light: "#ffffff" } });
}
