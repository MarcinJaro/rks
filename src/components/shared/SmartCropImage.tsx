"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * object-cover z kotwicą zależną od orientacji zdjęcia: pionowe kadrujemy od
 * góry (twarze są niemal zawsze w górnej 1/3 - domyślny środek ścina głowy),
 * poziome i kwadratowe od środka jak dotychczas. Orientację znamy dopiero po
 * załadowaniu pliku, stąd komponent kliencki z onLoad.
 */
export function SmartCropImage({ style, onLoad, ...props }: ImageProps) {
  const [portrait, setPortrait] = useState(false);

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt przychodzi w props (ImageProps wymaga go w typach)
    <Image
      {...props}
      style={portrait ? { ...style, objectPosition: "50% 12%" } : style}
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalHeight > img.naturalWidth * 1.05) setPortrait(true);
        onLoad?.(event);
      }}
    />
  );
}
