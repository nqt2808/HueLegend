import { QRCode, ErrorCorrectLevel } from "../../vendor/qr-code.js";
export function drawQR(canvas, value) {
  // URL da percent-encode nen du lieu dua vao thu vien QR la ASCII.
  if (!/^[\x00-\x7f]*$/.test(value)) throw new Error("QR cần dữ liệu URL đã mã hoá.");
  if (value.length > 1500) throw new Error("Liên kết quá dài để in QR rõ nét.");
  const qr = new QRCode(-1, ErrorCorrectLevel.M); qr.addData(value); qr.make();
  const size = qr.getModuleCount(), margin = 4, scale = 8;
  canvas.width = canvas.height = (size + 2 * margin) * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#211d29";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (qr.isDark(y, x)) ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
  }
}
