"use client";

import { useEffect, useState } from "react";

let cachedImage: string | null = null;
let imagePromise: Promise<string> | null = null;

function loadPointerImage() {
  if (!imagePromise) {
    imagePromise = import("./render-menu-pen")
      .then(({ renderMenuPen }) => renderMenuPen())
      .then((image) => {
        cachedImage = image;
        return image;
      })
      .catch((error) => {
        imagePromise = null;
        throw error;
      });
  }
  return imagePromise;
}

export function PenPointer() {
  const [image, setImage] = useState(cachedImage);

  useEffect(() => {
    let active = true;
    const mobile = window.matchMedia("(max-width: 760px)");
    const loadForDesktop = () => {
      if (mobile.matches) return;
      void loadPointerImage()
        .then((result) => {
          if (active) setImage(result);
        })
        .catch(() => {
          // The arrow remains available if the decorative preview cannot render.
        });
    };
    loadForDesktop();
    mobile.addEventListener("change", loadForDesktop);
    return () => {
      active = false;
      mobile.removeEventListener("change", loadForDesktop);
    };
  }, []);

  return (
    <span className="pen-pointer" aria-hidden="true">
      {image ? (
        // This data URL is rendered locally from the supplied Matador GLB.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" draggable={false} />
      ) : (
        <span className="paper-arrow">›</span>
      )}
    </span>
  );
}
