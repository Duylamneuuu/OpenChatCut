import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { PROMO_FONTS } from './fonts';

function fontBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

let fontsPromise: Promise<void> | null = null;

function loadPromoFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!fontsPromise) {
    fontsPromise = Promise.all(PROMO_FONTS.map(async (font) => {
      const face = new FontFace(font.family, fontBytes(font.base64), { weight: font.weight, style: 'normal' });
      document.fonts.add(await face.load());
    })).then(() => undefined);
  }
  return fontsPromise;
}

/** One delay per mount. Fonts are inlined so the page never fetches them. */
export function usePromoFonts(): void {
  const [handle] = useState(() => delayRender('cutpilot-promo-fonts'));
  useEffect(() => {
    let active = true;
    loadPromoFonts().finally(() => {
      if (active) continueRender(handle);
    });
    return () => {
      active = false;
    };
  }, [handle]);
}
