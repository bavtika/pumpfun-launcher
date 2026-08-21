import figlet from "figlet";
import Standard from "figlet/fonts/Standard";
import Slant from "figlet/fonts/Slant";
import Big from "figlet/fonts/Big";
import Small from "figlet/fonts/Small";
import Doom from "figlet/fonts/Doom";
import AnsiShadow from "figlet/fonts/ANSI Shadow";
import Block from "figlet/fonts/Block";
import Banner from "figlet/fonts/Banner";
import ThreeDAscii from "figlet/fonts/3D-ASCII";
import Larry3D from "figlet/fonts/Larry 3D";
import Speed from "figlet/fonts/Speed";
import Bloody from "figlet/fonts/Bloody";

export type AsciiFontId =
  | "Standard"
  | "Slant"
  | "Big"
  | "Small"
  | "Doom"
  | "ANSI Shadow"
  | "Block"
  | "Banner"
  | "3D-ASCII"
  | "Larry 3D"
  | "Speed"
  | "Bloody";

export const ASCII_FONTS: { id: AsciiFontId; label: string }[] = [
  { id: "Standard", label: "Standard" },
  { id: "Slant", label: "Slant" },
  { id: "Big", label: "Big" },
  { id: "Small", label: "Small" },
  { id: "Doom", label: "Doom" },
  { id: "ANSI Shadow", label: "ANSI Shadow" },
  { id: "Block", label: "Block" },
  { id: "Banner", label: "Banner" },
  { id: "3D-ASCII", label: "3D ASCII" },
  { id: "Larry 3D", label: "Larry 3D" },
  { id: "Speed", label: "Speed" },
  { id: "Bloody", label: "Bloody" },
];

const FONT_DATA: Record<AsciiFontId, string> = {
  Standard,
  Slant,
  Big,
  Small,
  Doom,
  "ANSI Shadow": AnsiShadow,
  Block,
  Banner,
  "3D-ASCII": ThreeDAscii,
  "Larry 3D": Larry3D,
  Speed,
  Bloody,
};

let fontsReady = false;

function ensureFonts(): void {
  if (fontsReady) return;
  figlet.defaults({ fetchFontIfMissing: false });
  for (const [name, data] of Object.entries(FONT_DATA)) {
    figlet.parseFont(name, data);
  }
  fontsReady = true;
}

export function generateAsciiArt(
  text: string,
  font: AsciiFontId = "Standard"
): string {
  const input = text.trim();
  if (!input) return "";
  ensureFonts();
  try {
    return figlet.textSync(input, {
      font,
      horizontalLayout: "default",
      verticalLayout: "default",
      whitespaceBreak: true,
      width: 60,
    });
  } catch {
    return "";
  }
}

export interface AsciiRenderOptions {
  fg?: string;
  bg?: string;
  /** Output square size in px (pump.fun likes square images). */
  size?: number;
}

/**
 * Renders ASCII art onto a square PNG canvas (letterboxed / fitted).
 */
export function asciiToPngBlob(
  art: string,
  opts: AsciiRenderOptions = {}
): Promise<Blob | null> {
  const lines = art.replace(/\t/g, "  ").replace(/\r/g, "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return Promise.resolve(null);

  const fg = opts.fg ?? "#fafafa";
  const bg = opts.bg ?? "#0a0a0a";
  const size = opts.size ?? 1024;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Measure with a probe font size, then scale to fit the square with padding.
  const probe = 32;
  const probeFont = `${probe}px "Courier New", "Cascadia Mono", ui-monospace, monospace`;
  ctx.font = probeFont;
  const charW = ctx.measureText("M").width || probe * 0.6;
  const lineH = probe * 1.2;
  const maxCols = Math.max(...lines.map((l) => l.length), 1);
  const textW = charW * maxCols;
  const textH = lineH * lines.length;

  const pad = size * 0.08;
  const fit = Math.min((size - pad * 2) / textW, (size - pad * 2) / textH);
  const fontSize = Math.max(8, Math.floor(probe * fit));
  const font = `${fontSize}px "Courier New", "Cascadia Mono", ui-monospace, monospace`;
  ctx.font = font;
  const finalCharW = ctx.measureText("M").width || fontSize * 0.6;
  const finalLineH = fontSize * 1.2;
  const drawW = finalCharW * maxCols;
  const drawH = finalLineH * lines.length;
  const originX = (size - drawW) / 2;
  const originY = (size - drawH) / 2;

  ctx.textBaseline = "top";
  ctx.fillStyle = fg;
  // Soft glow so thin ASCII reads on dark backgrounds
  ctx.shadowColor = fg;
  ctx.shadowBlur = Math.max(0, fontSize * 0.08);

  lines.forEach((line, i) => {
    ctx.fillText(line, originX, originY + i * finalLineH);
  });

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

export async function asciiPreviewUrl(
  art: string,
  opts?: AsciiRenderOptions
): Promise<string | null> {
  const blob = await asciiToPngBlob(art, opts);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
