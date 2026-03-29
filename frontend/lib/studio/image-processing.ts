/**
 * Client-side image processing utilities for the AI Studio.
 * Uses Canvas API for crop extraction — no server round-trip needed.
 */

import type { Bounds } from "./canvas-math";

/**
 * @deprecated Use `Bounds` from `canvas-math.ts` instead.
 */
export type CropBounds = Bounds;

/**
 * Load an image from a base64 data URL or blob URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Extract a cropped region from an image as a base64 JPEG.
 */
export async function extractCrop(
  imageData: string,
  bounds: CropBounds,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(imageData);

  const canvas = document.createElement("canvas");
  canvas.width = bounds.width;
  canvas.height = bounds.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(
    img,
    bounds.x, bounds.y, bounds.width, bounds.height,
    0, 0, bounds.width, bounds.height,
  );

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Convert a base64 data URL to a File object for form upload.
 */
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const parts = dataUrl.split(",");
  const header = parts[0] ?? "";
  const base64 = parts[1] ?? "";
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new File([arr], fileName, { type: mime });
}

/**
 * Read a File as a base64 data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from a data URL.
 */
export async function getImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
