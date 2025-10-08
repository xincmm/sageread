import { Font, woff2 } from "fonteditor-core";

let woff2Initialized = false;

async function initWoff2() {
  if (woff2Initialized) return;
  try {
    await woff2.init("/woff2.wasm");
    woff2Initialized = true;
    console.log("[FontConverter] woff2 initialized");
  } catch (error) {
    console.error("[FontConverter] Failed to initialize woff2:", error);
    throw error;
  }
}

export async function convertTtfToWoff2(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  await initWoff2();

  await new Promise((resolve) => setTimeout(resolve, 50));

  const font = Font.create(arrayBuffer, { type: "ttf" });
  const woff2Buffer = font.write({ type: "woff2", hinting: true });

  return woff2Buffer as ArrayBuffer;
}

export async function convertTtfFileToWoff2(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const woff2Buffer = await convertTtfToWoff2(arrayBuffer);

  const woff2Filename = file.name.replace(/\.ttf$/i, ".woff2");
  return new File([woff2Buffer], woff2Filename, { type: "font/woff2" });
}
