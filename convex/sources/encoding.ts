// Górna połowa ISO-8859-2 (0xA0-0xFF). Nie polegamy na TextDecoder,
// bo runtime Convexa nie gwarantuje pełnej tablicy kodowań ICU.
const HIGH_RANGE =
  " Ą˘Ł¤ĽŚ§¨ŠŞŤŹ­ŽŻ" +
  "°ą˛ł´ľśˇ¸šşťź˝žż" +
  "ŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎ" +
  "ĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢß" +
  "ŕáâăäĺćçčéęëěíîď" +
  "đńňóôőö÷řůúűüýţ˙";

export function decodeIso88592(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte < 0xa0 ? String.fromCharCode(byte) : HIGH_RANGE[byte - 0xa0];
  }
  return out;
}

export function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, " ");
}

export function htmlDecode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function cleanText(value = "") {
  return htmlDecode(stripTags(value)).replace(/\s+/g, " ").trim();
}
