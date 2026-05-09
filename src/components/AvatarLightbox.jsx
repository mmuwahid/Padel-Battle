import React, { useEffect } from "react";

// S069: WhatsApp/Instagram-style avatar lightbox. Tap an avatar → expand
// to fill the screen. Tap anywhere or press Esc to dismiss. The image is
// rendered at object-fit:contain inside a centered bounded box so it never
// overflows the viewport.
export function AvatarLightbox({ src, alt = "", onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="alb-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button className="alb-close" onClick={onClose} aria-label="Close">×</button>
      <img className="alb-img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export default AvatarLightbox;
