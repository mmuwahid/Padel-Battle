import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import Icon from "./Icon";

// S069: Avatar crop/zoom modal. User picks a file, this modal opens with the
// image preview, lets them pan + zoom inside a circular 1:1 frame, then on
// Save returns a 200x200 JPEG blob via onCropped(blob). Replaces the previous
// auto center-crop logic in App.jsx uploadAvatar + EditPlayerModal uploadPhoto.

// Helpers — read file → object URL, then crop to a 200x200 JPEG blob using the
// crop coordinates returned by react-easy-crop. We avoid drawing anything until
// onCropComplete has fired at least once (so croppedAreaPixels is defined).
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    200,
    200
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

export function AvatarCropModal({ file, onCancel, onCropped }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!file) return;
    readFileAsDataURL(file).then((src) => {
      if (!cancelled) setImageSrc(src);
    });
    return () => { cancelled = true; };
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setWorking(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onCropped(blob);
    } catch (_err) {
      setWorking(false);
    }
  };

  return (
    <div className="acm-overlay" onClick={onCancel}>
      <div className="acm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="acm-handle" />
        <h2 className="acm-title">Adjust Photo</h2>
        <div className="acm-stage">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="acm-zoom-row">
          <span className="acm-zoom-glyph acm-zoom-sm">A</span>
          <input
            className="acm-zoom"
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
          />
          <span className="acm-zoom-glyph acm-zoom-lg">A</span>
        </div>
        <div className="acm-hint">Drag to reposition · Pinch or use slider to zoom</div>
        <div className="acm-actions">
          <button className="shcancel" onClick={onCancel} disabled={working} style={{flex:1, height:44}}>Cancel</button>
          <button
            className={`savebtn${working ? " off" : " on"}`}
            onClick={handleSave}
            disabled={working || !croppedAreaPixels}
            style={{flex:1.4, padding:"12px 0", fontSize:13}}
          >
            {!working && <Icon name="check" size={14} color="#000" strokeWidth={2.5}/>}
            {working ? "Saving…" : "Save Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCropModal;
