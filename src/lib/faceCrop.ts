import type { CSSProperties } from "react";

/**
 * CSS that shows a square crop around a face, from the whole photo used as a
 * background. box = [x1, y1, x2, y2] as fractions of the photo; aspect = width / height.
 */
export function faceCropStyle(src: string, box: number[], aspect: number): CSSProperties {
  const [x1, y1, x2, y2] = box;
  // Work in units where the photo is `aspect` wide and 1 high, so the crop is truly square.
  const cx = ((x1 + x2) / 2) * aspect;
  const cy = (y1 + y2) / 2;
  const side = Math.min(Math.max((x2 - x1) * aspect, y2 - y1) * 1.8, aspect, 1);
  const left = Math.min(Math.max(cx - side / 2, 0), aspect - side);
  const top = Math.min(Math.max(cy - side / 2, 0), 1 - side);
  const fx = side / aspect; // crop width as a fraction of the photo width
  const fy = side;
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${100 / fx}% ${100 / fy}%`,
    backgroundPosition: `${fx < 1 ? (left / aspect / (1 - fx)) * 100 : 0}% ${fy < 1 ? (top / (1 - fy)) * 100 : 0}%`,
    backgroundRepeat: "no-repeat",
  };
}
