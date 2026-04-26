import { useState, useRef, useCallback, useEffect } from "react";

const F = "'DM Sans', sans-serif";
const S = "'Instrument Serif', serif";
const DF = { x: 50, y: 35, w: 32, h: 34 };
const mkFrames = (scene) => {
  if (!scene) return [];
  if (scene.frames) return scene.frames;
  if (scene.frame) return [{ ...scene.frame, id: "f1" }];
  return [{ ...DF, id: "f1" }];
};

// ─── Defaults ───
const DEF_HERO = { headline: "Your photos,", headlineLine2: "beautifully printed", subtitle: "Upload a photo, see it on our products, and order in minutes.", ctaText: "Upload Your Photo", bgImage: null, badge: "Transform your memories" };
const DEF_SITE = { logoText: "myphoto", accentColor: "#1a1a1a", freeShipMin: 109, guaranteeText: "100% Smile Guarantee", footerLinks: ["FAQ", "Reviews", "Privacy", "Terms"], adminPassword: "admin123", navItems: [
  { id: "n1", label: "Create", type: "action", action: "create" },
  { id: "n2", label: "Cart", type: "action", action: "cart" },
] };
const DEF_CART = { shippingPrice: 9.95, taxRate: 0, checkoutNote: "Your high-res print file will be generated and added to our production queue." };
const DEF_UPLOAD = {
  headline: "Upload your photo",
  subtitle: "JPG, PNG, or WEBP",
  boxText: "Drag & drop",
  boxSubtext: "or click to browse",
  boxIcon: "⬆",
  bgImage: null,
  bgColor: "",
  boxBorderColor: "",
  boxBgColor: "",
  showProductPreview: true,
  previewPosition: "left",
};
const DEF_PAGES = [
  { id: "about", title: "About Us", slug: "about", showInNav: true, blocks: [{ id: "b1", type: "text", content: "We turn your favorite photos into stunning prints on premium materials. Founded with a simple mission: make photo printing easy, fast, and beautiful." }] },
];
const DEF_PRODUCTS = [
  { id: "acrylic-block", name: "Atrium Acrylic Block", category: "Acrylic", desc: '1" thick, crystal-clear, self-standing HD print', sizes: [{ label: '4×4"', price: 44, sceneLandscape: null, scenePortrait: null }, { label: '6×6"', price: 59, sceneLandscape: null, scenePortrait: null }, { label: '8×8"', price: 79, sceneLandscape: null, scenePortrait: null }, { label: '10×10"', price: 99, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
  { id: "infinity-glass", name: "Infinity Glass", category: "Glass", desc: "Modern glass frame with rounded corners", sizes: [{ label: '5×7"', price: 40, sceneLandscape: null, scenePortrait: null }, { label: '8×10"', price: 65, sceneLandscape: null, scenePortrait: null }, { label: '11×14"', price: 89, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
  { id: "moderna-metal", name: "Moderna Metal", category: "Metal", desc: "Brilliant, glossy aluminum photo print", sizes: [{ label: '4×6"', price: 20, sceneLandscape: null, scenePortrait: null }, { label: '8×10"', price: 45, sceneLandscape: null, scenePortrait: null }, { label: '12×16"', price: 75, sceneLandscape: null, scenePortrait: null }, { label: '16×20"', price: 99, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
  { id: "airglass", name: "AirGlass", category: "Glass", desc: "Stickable, re-stickable — leaves no marks", sizes: [{ label: '6×6"', price: 55, sceneLandscape: null, scenePortrait: null }, { label: '8×8"', price: 75, sceneLandscape: null, scenePortrait: null }, { label: '10×10"', price: 95, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
  { id: "photo-lightbox", name: "Photo Lightbox", category: "Specialty", desc: "Backlit LED photo display", sizes: [{ label: '8×10"', price: 89, sceneLandscape: null, scenePortrait: null }, { label: '11×14"', price: 129, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
  { id: "acrylic-clock", name: "Acrylic Wall Clock", category: "Specialty", desc: "Crystal-clear acrylic clock with your photo", sizes: [{ label: '10×10"', price: 110, sceneLandscape: null, scenePortrait: null }, { label: '12×12"', price: 135, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true },
];
const FILTERS = [
  { id: "none", name: "Original", css: "none" }, { id: "bw", name: "B&W", css: "grayscale(100%)" },
  { id: "warm", name: "Warm", css: "sepia(30%) saturate(140%) brightness(105%)" }, { id: "cool", name: "Cool", css: "hue-rotate(15deg) saturate(90%) brightness(105%)" },
  { id: "vivid", name: "Vivid", css: "saturate(160%) contrast(110%)" }, { id: "fade", name: "Faded", css: "contrast(90%) brightness(110%) saturate(80%)" },
];
const CATS = ["All", "Acrylic", "Glass", "Metal", "Specialty"];
const ORDER_STATUSES = ["pending", "processing", "printed", "shipped", "delivered"];
const STATUS_COLORS = { pending: "#e8a020", processing: "#3088d0", printed: "#8844cc", shipped: "#2a8844", delivered: "#1a1a1a" };

// Parse "8×10"" or "4x4"" into { w, h } in inches
function parseSizeInches(label) {
  const m = label.replace(/["""]/g, "").match(/(\d+\.?\d*)\s*[×xX]\s*(\d+\.?\d*)/);
  return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : { w: 8, h: 10 };
}

// Generate a high-resolution print-ready PDF using canvas
// Renders customer photo at 300 DPI at the exact print dimensions with position/zoom crop
async function generatePrintPDF(item) {
  const DPI = 300;
  const dims = parseSizeInches(item.size);
  const pxW = Math.round(dims.w * DPI);
  const pxH = Math.round(dims.h * DPI);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = item.imageUrl;
  });

  // Apply zoom and position for crop
  const zoomScale = (item.zoom || 100) / 100;
  const px = (item.posX ?? 50) / 100;
  const py = (item.posY ?? 50) / 100;
  const imgRatio = img.width / img.height;
  const canvasRatio = pxW / pxH;
  let cropW, cropH;
  if (imgRatio > canvasRatio) {
    cropH = img.height / zoomScale;
    cropW = cropH * canvasRatio;
  } else {
    cropW = img.width / zoomScale;
    cropH = cropW / canvasRatio;
  }
  const maxOffsetX = img.width - cropW;
  const maxOffsetY = img.height - cropH;
  const sx = Math.max(0, Math.min(maxOffsetX, px * maxOffsetX));
  const sy = Math.max(0, Math.min(maxOffsetY, py * maxOffsetY));
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, pxW, pxH);

  // Convert canvas to JPEG data URL (high quality)
  const jpegData = canvas.toDataURL("image/jpeg", 0.95);

  // Build a minimal PDF with the image embedded
  // PDF coordinate system: 72 points per inch
  const ptW = dims.w * 72;
  const ptH = dims.h * 72;

  // Strip base64 header
  const b64 = jpegData.split(",")[1];
  const binaryLen = atob(b64).length;

  const objects = [];
  let objNum = 0;
  const addObj = (content) => { objNum++; objects.push({ num: objNum, content }); return objNum; };

  // Object 1: Catalog
  const catalogNum = addObj("<< /Type /Catalog /Pages 2 0 R >>");
  // Object 2: Pages
  const pagesNum = addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  // Object 3: Page
  const pageNum = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Contents 5 0 R /Resources << /XObject << /Img 4 0 R >> >> >>`);
  // Object 4: Image XObject
  const imageNum = addObj(`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binaryLen} >>`);
  // Object 5: Page content stream
  const streamContent = `q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Img Do Q`;
  const streamNum = addObj(`<< /Length ${streamContent.length} >>`);

  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets = [];

  for (const obj of objects) {
    offsets[obj.num] = pdf.length;
    pdf += `${obj.num} 0 obj\n${obj.content}\n`;
    if (obj.num === imageNum) {
      pdf += "stream\n";
      // We'll handle binary separately
    } else if (obj.num === streamNum) {
      pdf += "stream\n" + streamContent + "\nendstream\n";
    }
    pdf += "endobj\n";
  }

  // For the image, we need to build a proper binary PDF
  // Use Blob approach for binary safety
  const pdfParts = [];
  let textPdf = "%PDF-1.4\n";
  const offs = [];

  // Obj 1: Catalog
  offs[1] = textPdf.length;
  textPdf += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  // Obj 2: Pages
  offs[2] = textPdf.length;
  textPdf += "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  // Obj 3: Page
  offs[3] = textPdf.length;
  textPdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Contents 5 0 R /Resources << /XObject << /Img 4 0 R >> >> >>\nendobj\n`;
  // Obj 4: Image (header)
  offs[4] = textPdf.length;
  textPdf += `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binaryLen} >>\nstream\n`;

  // Convert text so far to bytes
  const encoder = new TextEncoder();
  pdfParts.push(encoder.encode(textPdf));

  // Add binary JPEG data
  const binaryStr = atob(b64);
  const binaryArr = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) binaryArr[i] = binaryStr.charCodeAt(i);
  pdfParts.push(binaryArr);

  // Continue with endstream/endobj
  let textPdf2 = "\nendstream\nendobj\n";
  // Obj 5: Content stream
  const streamStr = `q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Img Do Q`;
  offs[5] = pdfParts.reduce((a, p) => a + p.length, 0) + textPdf2.length;
  textPdf2 += `5 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj\n`;

  // XRef
  const xrefOffset = pdfParts.reduce((a, p) => a + p.length, 0) + textPdf2.length;
  textPdf2 += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    textPdf2 += `${String(offs[i] || 0).padStart(10, "0")} 00000 n \n`;
  }
  textPdf2 += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  pdfParts.push(encoder.encode(textPdf2));

  const blob = new Blob(pdfParts, { type: "application/pdf" });
  return { blob, dims, dpi: DPI, pxW, pxH };
}

function r2d(file) { return new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); }); }

// Compress image to max dimensions and JPEG quality for storage
function compressImage(dataUrl, maxW = 1200, maxH = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Read file and compress for storage
async function readAndCompress(file, maxW, maxH, quality) {
  const raw = await r2d(file);
  // Don't compress PNGs used as scene overlays (they need transparency)
  if (file.type === "image/png") return raw;
  return compressImage(raw, maxW, maxH, quality);
}
function ytId(u) { const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.+&v=))([^&?\s]{11})/); return m?.[1]; }
function vmId(u) { const m = u.match(/vimeo\.com\/(\d+)/); return m?.[1]; }
function embedUrl(u) { const y = ytId(u); if (y) return `https://www.youtube.com/embed/${y}`; const v = vmId(u); if (v) return `https://player.vimeo.com/video/${v}`; return u; }
function vidThumb(u) { const y = ytId(u); return y ? `https://img.youtube.com/vi/${y}/mqdefault.jpg` : null; }
function isEmbed(u) { return !!ytId(u) || !!vmId(u); }
const uid = () => Math.random().toString(36).slice(2, 9);

// ═══════════════════════════════════════
//  SUPABASE STORAGE
// ═══════════════════════════════════════
const SUPABASE_URL = "https://jghulgtnwjeloewlnykl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnaHVsZ3Rud2plbG9ld2xueWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxODM4OTksImV4cCI6MjA5Mjc1OTg5OX0.md3S3IsdAesV6I2S53vWbzgoRBUYev5S85ZVP-6tXPQ";
const SUPA_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" };

async function loadStore(key, def) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config?key=eq.${encodeURIComponent(key)}&select=value`, { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) throw new Error(res.statusText);
    const rows = await res.json();
    if (rows.length > 0 && rows[0].value != null) return rows[0].value;
    return def;
  } catch (e) {
    console.error("Load failed for", key, e);
    return def;
  }
}

async function saveStore(key, val) {
  try {
    const body = JSON.stringify({ key, value: val, updated_at: new Date().toISOString() });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
      method: "POST",
      headers: { ...SUPA_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
  } catch (e) {
    console.error("Save failed for", key, e);
    alert("Save failed — check your connection. Error: " + e.message);
  }
}

// ═══════════════════════════════════════
//  ADMIN: Size Row with scene
// ═══════════════════════════════════════
function SceneSlot({ label, scene, onUpdate, onRemove }) {
  const ref = useRef();
  const frames = mkFrames(scene);
  const setFrame = (fIdx, k, v) => {
    const nf = frames.map((f, i) => i === fIdx ? { ...f, [k]: Number(v) } : f);
    onUpdate({ ...scene, frames: nf, frame: undefined });
  };
  const addFrame = () => {
    const nf = [...frames, { id: uid(), x: 50, y: 50, w: 20, h: 20 }];
    onUpdate({ ...scene, frames: nf, frame: undefined });
  };
  const removeFrame = (fIdx) => {
    const nf = frames.filter((_, i) => i !== fIdx);
    if (nf.length === 0) { onRemove(); return; }
    onUpdate({ ...scene, frames: nf, frame: undefined });
  };
  const upload = async e => { const f = e.target.files[0]; if (!f) return; const u = await r2d(f); onUpdate({ bgImage: u, frames: [{ ...DF, id: uid() }] }); };
  const colors = ["#7cb5e0", "#e07c7c", "#7ce0a0", "#e0c87c", "#c87ce0", "#7ce0d8"];

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#aaa", marginBottom: 4 }}>{label}</div>
      {scene?.bgImage ? (
        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ position: "relative", backgroundImage: "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)", backgroundSize: "10px 10px", backgroundPosition: "0 0,0 5px,5px -5px,-5px 0" }}>
            <img src={scene.bgImage} alt="" style={{ width: "100%", display: "block", position: "relative", zIndex: 2 }} />
            {frames.map((fr, fi) => (
              <div key={fr.id || fi}>
                <div style={{ position: "absolute", zIndex: 1, left: `${fr.x-fr.w/2}%`, top: `${fr.y-fr.h/2}%`, width: `${fr.w}%`, height: `${fr.h}%`, background: colors[fi % colors.length], opacity: 0.4 }} />
                <div style={{ position: "absolute", zIndex: 3, left: `${fr.x-fr.w/2}%`, top: `${fr.y-fr.h/2}%`, width: `${fr.w}%`, height: `${fr.h}%`, border: `1.5px dashed rgba(255,255,255,0.85)`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 8, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.6)", fontFamily: F }}>#{fi + 1}</span>
                </div>
              </div>
            ))}
            <button onClick={onRemove} style={{ position: "absolute", top: 3, right: 3, zIndex: 4, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, lineHeight: 1 }}>×</button>
          </div>
          {/* Frame controls */}
          {frames.map((fr, fi) => (
            <div key={fr.id || fi} style={{ padding: "6px 8px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: colors[fi % colors.length] }}>Photo #{fi + 1}</span>
                {frames.length > 1 && <button onClick={() => removeFrame(fi)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 10 }}>remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 3 }}>
                {[{ l: "X", k: "x", mn: 5, mx: 95 }, { l: "Y", k: "y", mn: 5, mx: 95 }, { l: "W", k: "w", mn: 5, mx: 80 }, { l: "H", k: "h", mn: 5, mx: 80 }].map(c => (
                  <div key={c.k}><div style={{ fontSize: 7, color: "#aaa", fontWeight: 600 }}>{c.l} {fr[c.k]}%</div><input type="range" min={c.mn} max={c.mx} value={fr[c.k]} onChange={e => setFrame(fi, c.k, e.target.value)} style={{ width: "100%", accentColor: colors[fi % colors.length] }} /></div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={addFrame} style={{ width: "100%", padding: "6px", borderTop: "1px solid rgba(0,0,0,0.04)", background: "transparent", border: "none", cursor: "pointer", fontSize: 10, color: "#888", fontFamily: F }}>+ Add photo slot</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} style={{ width: "100%", padding: "18px 8px", borderRadius: 8, border: "2px dashed rgba(0,0,0,0.06)", background: "transparent", cursor: "pointer", fontSize: 11, color: "#bbb", fontFamily: F, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 16, opacity: 0.3 }}>{label.includes("Landscape") ? "▬" : "▮"}</span>
          <span>+ {label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/png" style={{ display: "none" }} onChange={upload} />
    </div>
  );
}

function SizeRow({ size, onChange, onRemove, canRemove }) {
  // Support legacy `scene` field by mapping to sceneLandscape
  const sL = size.sceneLandscape || size.scene || null;
  const sP = size.scenePortrait || null;

  const updateLandscape = (sc) => onChange({ ...size, sceneLandscape: sc, scene: undefined });
  const updatePortrait = (sc) => onChange({ ...size, scenePortrait: sc, scene: undefined });

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 14, marginBottom: 10, background: "#faf9f7" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input value={size.label} onChange={e => onChange({ ...size, label: e.target.value })} style={{ ...inp, flex: 1 }} placeholder='e.g. 8×10"' />
        <div style={{ position: "relative", flex: 0.5 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
          <input type="number" value={size.price} onChange={e => onChange({ ...size, price: Number(e.target.value) || 0 })} style={{ ...inp, paddingLeft: 24 }} /></div>
        {canRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 18 }}>×</button>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#bbb", marginBottom: 6 }}>Scenes for {size.label || "this size"}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <SceneSlot label="Landscape ▬" scene={sL} onUpdate={updateLandscape} onRemove={() => updateLandscape(null)} />
        <SceneSlot label="Portrait ▮" scene={sP} onUpdate={updatePortrait} onRemove={() => updatePortrait(null)} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  ADMIN: Product Editor
// ═══════════════════════════════════════
function ProductEditor({ product, onSave, onCancel, onDelete }) {
  const [fm, setFm] = useState({ ...product, sizes: product.sizes.map(s => ({
    ...s,
    sceneLandscape: s.sceneLandscape ? { ...s.sceneLandscape, frame: { ...(s.sceneLandscape.frame||DF) } } : (s.scene ? { ...s.scene, frame: { ...(s.scene.frame||DF) } } : null),
    scenePortrait: s.scenePortrait ? { ...s.scenePortrait, frame: { ...(s.scenePortrait.frame||DF) } } : null,
    scene: undefined,
  })), images: [...(product.images||[])], videos: [...(product.videos||[])] });
  const iRef = useRef(); const vRef = useRef(); const [vu, setVu] = useState("");
  const set = (k, v) => setFm(p => ({ ...p, [k]: v }));
  const addImgs = async e => { const fs = Array.from(e.target.files); const us = await Promise.all(fs.map(f => readAndCompress(f, 800, 800, 0.7))); setFm(p => ({ ...p, images: [...p.images, ...us] })); };
  const addVidFiles = async e => { const fs = Array.from(e.target.files); for (const f of fs) { const u = await r2d(f); setFm(p => ({ ...p, videos: [...p.videos, { src: u, type: "file", name: f.name }] })); } };
  const addVidUrl = () => { if (!vu.trim()) return; setFm(p => ({ ...p, videos: [...p.videos, { src: vu.trim(), type: "url", name: vu.trim() }] })); setVu(""); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "92%", maxWidth: 680, maxHeight: "92vh", overflow: "auto", padding: 28, position: "relative" }}>
        <button onClick={onCancel} style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>×</button>
        <h3 style={{ fontFamily: S, fontSize: 24, marginBottom: 18 }}>{product.id ? "Edit Product" : "New Product"}</h3>
        {/* Photos */}
        <div style={{ marginBottom: 20 }}><label style={lbl}>Photos</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {fm.images.map((img, i) => (<div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}><img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button onClick={() => set("images", fm.images.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}>×</button></div>))}
            <button onClick={() => iRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 10, border: "2px dashed rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 24, color: "#ccc" }}>+</button>
            <input ref={iRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addImgs} />
          </div>
        </div>
        {/* Videos */}
        <div style={{ marginBottom: 20 }}><label style={lbl}>Videos</label>
          {fm.videos.map((v, i) => { const vid = typeof v === "string" ? { src: v, type: "url", name: v } : v; return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f5f4f2", marginBottom: 6, border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ width: 52, height: 30, borderRadius: 4, background: vidThumb(vid.src) ? `url(${vidThumb(vid.src)}) center/cover` : "#e0ddd8", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{!vidThumb(vid.src) && <span style={{ fontSize: 12, color: "#bbb" }}>▶</span>}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vid.name}</div>
              <button onClick={() => set("videos", fm.videos.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>); })}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => vRef.current?.click()} style={{ padding: "8px 14px", borderRadius: 8, border: "2px dashed rgba(0,0,0,0.08)", background: "transparent", cursor: "pointer", fontFamily: F, fontSize: 12, color: "#888", flexShrink: 0 }}>⬆ Upload</button>
            <input ref={vRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={e => { addVidFiles(e); e.target.value = ""; }} />
            <input value={vu} onChange={e => setVu(e.target.value)} onKeyDown={e => e.key === "Enter" && addVidUrl()} style={{ ...inp, flex: 1 }} placeholder="or paste URL" />
            <button onClick={addVidUrl} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: vu.trim() ? "#1a1a1a" : "#ddd", color: vu.trim() ? "#fff" : "#999", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Add</button>
          </div>
        </div>
        {/* Name/Cat/Desc */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Name</label><input value={fm.name} onChange={e => set("name", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Category</label><select value={fm.category} onChange={e => set("category", e.target.value)} style={inp}>{["Acrylic","Glass","Metal","Specialty"].map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={lbl}>Short Description (product cards)</label><input value={fm.desc} onChange={e => set("desc", e.target.value)} style={inp} placeholder="One-liner shown on product cards" /></div>
        <div style={{ marginBottom: 16 }}><label style={lbl}>Full Description (product page)</label><textarea value={fm.fullDesc || ""} onChange={e => set("fullDesc", e.target.value)} rows={4} style={{ ...inp, resize: "vertical" }} placeholder="Detailed description shown when customer is customizing their order" /></div>
        {/* Sizes */}
        <div style={{ marginBottom: 20 }}><label style={lbl}>Sizes & Scenes</label>
          <p style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>Each size gets its own preview scene PNG. Customer's photo renders behind the transparent area.</p>
          {fm.sizes.map((s, i) => <SizeRow key={i} size={s} onChange={u => { const ns = [...fm.sizes]; ns[i] = u; set("sizes", ns); }} onRemove={() => set("sizes", fm.sizes.filter((_, j) => j !== i))} canRemove={fm.sizes.length > 1} />)}
          <button onClick={() => set("sizes", [...fm.sizes, { label: "", price: 0, sceneLandscape: null, scenePortrait: null }])} style={{ background: "none", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#888", fontFamily: F }}>+ Add size</button>
        </div>
        {/* Active + Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => set("active", !fm.active)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: fm.active ? "#1a1a1a" : "#ddd", position: "relative" }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: fm.active ? 21 : 3, transition: "left 0.2s" }} /></button>
          <span style={{ fontSize: 13, color: "#666" }}>{fm.active ? "Active" : "Hidden"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>{product.id && onDelete && <button onClick={() => onDelete(product.id)} style={{ background: "none", border: "none", color: "#d44", cursor: "pointer", fontSize: 12, fontFamily: F }}>Delete</button>}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={btnO}>Cancel</button>
            <button onClick={() => onSave(fm)} style={btnP}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  ADMIN: Page Block Editor
// ═══════════════════════════════════════
function BlockEditor({ block, onChange, onRemove, onMoveUp, onMoveDown, products }) {
  const imgRef = useRef(); const vidRef = useRef();
  const addBlockImg = async (e) => { const fs = Array.from(e.target.files); const us = await Promise.all(fs.map(f => readAndCompress(f, 1000, 1000, 0.7))); onChange({ ...block, images: [...(block.images||[]), ...us] }); };
  const addBlockVid = async (e) => { const fs = Array.from(e.target.files); for (const f of fs) { const u = await r2d(f); onChange({ ...block, videos: [...(block.videos||[]), { src: u, type: "file", name: f.name }] }); } };

  const typeLabel = { text: "📝 Text", gallery: "🖼 Image Gallery", video: "🎬 Video", products: "🛍 Product Showcase" }[block.type];

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 16, marginBottom: 10, background: "#faf9f7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>{typeLabel}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onMoveUp} style={smBtn}>↑</button>
          <button onClick={onMoveDown} style={smBtn}>↓</button>
          <button onClick={onRemove} style={{ ...smBtn, color: "#d44" }}>×</button>
        </div>
      </div>

      {block.type === "text" && (
        <textarea value={block.content || ""} onChange={e => onChange({ ...block, content: e.target.value })} rows={4} style={{ ...inp, resize: "vertical", fontSize: 13 }} placeholder="Write your content here..." />
      )}

      {block.type === "gallery" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {(block.images || []).map((img, i) => (
              <div key={i} style={{ position: "relative", width: 70, height: 70, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => onChange({ ...block, images: block.images.filter((_, j) => j !== i) })} style={{ position: "absolute", top: 1, right: 1, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10 }}>×</button>
              </div>
            ))}
            <button onClick={() => imgRef.current?.click()} style={{ width: 70, height: 70, borderRadius: 8, border: "2px dashed rgba(0,0,0,0.08)", background: "transparent", cursor: "pointer", fontSize: 20, color: "#ccc" }}>+</button>
            <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addBlockImg} />
          </div>
          <input value={block.caption || ""} onChange={e => onChange({ ...block, caption: e.target.value })} style={inp} placeholder="Gallery caption (optional)" />
        </div>
      )}

      {block.type === "video" && (
        <div>
          {(block.videos || []).map((v, i) => { const vid = typeof v === "string" ? { src: v, type: "url", name: v } : v; return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f0ede8", marginBottom: 6 }}>
              <span style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#666" }}>{vid.name}</span>
              <button onClick={() => onChange({ ...block, videos: block.videos.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>); })}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => vidRef.current?.click()} style={{ padding: "7px 12px", borderRadius: 8, border: "2px dashed rgba(0,0,0,0.08)", background: "transparent", cursor: "pointer", fontSize: 11, color: "#888", fontFamily: F, flexShrink: 0 }}>⬆ Upload</button>
            <input ref={vidRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={e => { addBlockVid(e); e.target.value = ""; }} />
            <input value={block.videoUrl || ""} onChange={e => onChange({ ...block, videoUrl: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="or paste URL" />
            <button onClick={() => { if (!block.videoUrl?.trim()) return; onChange({ ...block, videos: [...(block.videos||[]), { src: block.videoUrl.trim(), type: "url", name: block.videoUrl.trim() }], videoUrl: "" }); }} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontSize: 11, fontFamily: F, fontWeight: 600, flexShrink: 0 }}>Add</button>
          </div>
        </div>
      )}

      {block.type === "products" && (
        <div>
          <p style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>Select which products to showcase:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {products.filter(p => p.active).map(p => {
              const sel = (block.productIds || []).includes(p.id);
              return (<label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: sel ? "rgba(0,0,0,0.04)" : "transparent", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={sel} onChange={() => { const ids = sel ? (block.productIds||[]).filter(id => id !== p.id) : [...(block.productIds||[]), p.id]; onChange({ ...block, productIds: ids }); }} style={{ accentColor: "#1a1a1a" }} />
                {p.name}
              </label>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
//  ADMIN PANEL
// ═══════════════════════════════════════
function AdminPanel({ products, setProducts, hero, setHero, pages, setPages, site, setSite, cartCfg, setCartCfg, uploadCfg, setUploadCfg, orders, setOrders, save, onExit }) {
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("All");
  const [editPage, setEditPage] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [sortMode, setSortMode] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [genPdf, setGenPdf] = useState(null); // order id currently generating
  const heroRef = useRef();
  const uploadBgRef = useRef();

  const uCfg = uploadCfg || DEF_UPLOAD;
  const setU = (k, v) => { const u = { ...uCfg, [k]: v }; setUploadCfg(u); save("myphoto-upload", u); };

  const filteredOrders = orders.filter(o => orderFilter === "all" || o.status === orderFilter).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.has(o.id));

  const toggleOrder = (id) => setSelectedOrders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allFilteredSelected) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
  };

  // Generate and download PDF for a single order item
  const downloadItemPdf = async (item, orderId) => {
    if (!item.imageUrl || item.imageUrl === "[stored]") { alert("Original photo not available for this order."); return; }
    const { blob } = await generatePrintPDF(item);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${item.product?.name || "print"}-${item.size.replace(/["""]/g, "")}-${orderId}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Generate and download all PDFs for one order
  const downloadOrderPdfs = async (order) => {
    setGenPdf(order.id);
    for (const item of (order.items || [])) {
      if (!item.imageUrl || item.imageUrl === "[stored]") continue;
      await downloadItemPdf(item, order.id);
      await new Promise(r => setTimeout(r, 300)); // small delay between downloads
    }
    setGenPdf(null);
  };

  // Batch download selected orders
  const downloadSelectedPdfs = async () => {
    const sel = orders.filter(o => selectedOrders.has(o.id));
    for (const order of sel) {
      setGenPdf(order.id);
      for (const item of (order.items || [])) {
        if (!item.imageUrl || item.imageUrl === "[stored]") continue;
        await downloadItemPdf(item, order.id);
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setGenPdf(null);
  };

  const filtered = products.filter(p => (fCat === "All" || p.category === fCat) && p.name.toLowerCase().includes(search.toLowerCase()));
  const saveProd = u => { let n; if (!u.id || !products.find(p => p.id === u.id)) { u.id = uid(); n = [...products, u]; } else { n = products.map(p => p.id === u.id ? u : p); } setProducts(n); setEditing(null); save("myphoto-products", n); };
  const delProd = id => { const n = products.filter(p => p.id !== id); setProducts(n); setEditing(null); save("myphoto-products", n); };

  const tabBtns = [
    { id: "orders", label: `Orders (${orders.length})` }, { id: "products", label: "Products" }, { id: "hero", label: "Hero" },
    { id: "upload", label: "Upload Screen" }, { id: "nav", label: "Navigation" }, { id: "pages", label: "Pages" }, { id: "cart", label: "Cart" }, { id: "site", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f2" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#1a1a1a", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: S, fontSize: 20, fontStyle: "italic" }}>my</span><span style={{ fontFamily: S, fontSize: 20 }}>photo</span>
          <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Admin</span>
        </div>
        <button onClick={onExit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500 }}>← Shop</button>
      </nav>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: "12px 24px 0", background: "#f5f4f2", borderBottom: "1px solid rgba(0,0,0,0.06)", overflowX: "auto" }}>
        {tabBtns.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 600, background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#1a1a1a" : "#999", transition: "all 0.2s", borderBottom: tab === t.id ? "2px solid #1a1a1a" : "2px solid transparent" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ─── ORDERS TAB ─── */}
        {tab === "orders" && (<>
          <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 16 }}>Orders</h2>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { l: "Total", v: orders.length, c: "#1a1a1a" },
              { l: "Pending", v: orders.filter(o => o.status === "pending").length, c: STATUS_COLORS.pending },
              { l: "Processing", v: orders.filter(o => o.status === "processing").length, c: STATUS_COLORS.processing },
              { l: "Shipped", v: orders.filter(o => o.status === "shipped").length, c: STATUS_COLORS.shipped },
              { l: "Revenue", v: `$${orders.reduce((s, o) => s + parseFloat(o.total || 0), 0).toFixed(0)}`, c: "#2a8" },
            ].map(s => (
              <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 22, fontFamily: S, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* Filter */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {["all", ...ORDER_STATUSES].map(s => (
              <button key={s} onClick={() => setOrderFilter(s)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, background: orderFilter === s ? "#1a1a1a" : "#e8e6e2", color: orderFilter === s ? "#fff" : "#666", textTransform: "capitalize" }}>{s}</button>
            ))}
          </div>

          {/* Batch action bar */}
          {selectedOrders.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: "#1a1a1a", color: "#fff", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedOrders.size} order{selectedOrders.size !== 1 ? "s" : ""} selected</span>
              <button onClick={downloadSelectedPdfs} disabled={!!genPdf} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, border: "none", background: "#fff", color: "#1a1a1a", cursor: genPdf ? "wait" : "pointer", fontFamily: F, fontSize: 12, fontWeight: 600 }}>
                {genPdf ? "Generating..." : `Download ${selectedOrders.size} Order PDF${selectedOrders.size !== 1 ? "s" : ""}`}
              </button>
              <button onClick={() => setSelectedOrders(new Set())} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
          )}

          {/* Select all header */}
          {filteredOrders.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 4 }}>
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} style={{ accentColor: "#1a1a1a", width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "#999" }}>Select all ({filteredOrders.length})</span>
            </div>
          )}

          {/* Order list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredOrders.map(order => (
              <div key={order.id} style={{ background: "#fff", borderRadius: 14, border: selectedOrders.has(order.id) ? "2px solid #1a1a1a" : "1px solid rgba(0,0,0,0.06)", overflow: "hidden", transition: "border 0.2s" }}>
                {/* Order header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleOrder(order.id)} style={{ accentColor: "#1a1a1a", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>#{order.id}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${STATUS_COLORS[order.status] || "#999"}18`, color: STATUS_COLORS[order.status] || "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>{order.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#999" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {order.itemCount || order.items?.length || 0} item{(order.itemCount || order.items?.length || 0) !== 1 ? "s" : ""}
                    </div>
                    {order.customer && (
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                        {order.customer.firstName} {order.customer.lastName} · {order.customer.email}
                        {order.payment?.cardLast4 && <span style={{ color: "#aaa" }}> · •••• {order.payment.cardLast4}</span>}
                      </div>
                    )}
                    {order.customer?.address && (
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                        {order.customer.address}, {order.customer.city}, {order.customer.state} {order.customer.zip}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div style={{ fontFamily: S, fontSize: 20 }}>${order.total}</div>
                    <button onClick={() => downloadOrderPdfs(order)} disabled={!!genPdf} style={{
                      padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 11, fontFamily: F, fontWeight: 600, cursor: genPdf ? "wait" : "pointer",
                      background: genPdf === order.id ? "#999" : "#1a1a1a", color: "#fff",
                    }}>{genPdf === order.id ? "Generating..." : "⬇ All PDFs"}</button>
                  </div>
                </div>
                {/* Order items with per-item download */}
                <div style={{ padding: "8px 18px" }}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, borderBottom: i < (order.items?.length || 0) - 1 ? "1px solid rgba(0,0,0,0.03)" : "none" }}>
                      <span style={{ color: "#888" }}>•</span>
                      <span style={{ fontWeight: 500 }}>{item.product?.name || "Product"}</span>
                      <span style={{ color: "#aaa" }}>{item.size}</span>
                      {item.zoom && item.zoom !== 100 && <span style={{ color: "#aaa" }}>· Zoom {item.zoom}%</span>}
                      {item.pdfDims && <span style={{ color: "#bbb", fontSize: 11 }}>· {item.pdfPx?.w}×{item.pdfPx?.h}px</span>}
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: S }}>${item.price}</span>
                        <button onClick={() => downloadItemPdf(item, order.id)} disabled={!!genPdf} style={{
                          padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: genPdf ? "wait" : "pointer",
                          fontSize: 10, fontFamily: F, fontWeight: 600, color: "#555",
                        }}>⬇ PDF</button>
                      </span>
                    </div>
                  ))}
                </div>
                {/* Status changer + totals */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: "1px solid rgba(0,0,0,0.04)", background: "#faf9f7" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Status:</span>
                    <select value={order.status} onChange={e => {
                      const updated = orders.map(o => o.id === order.id ? { ...o, status: e.target.value } : o);
                      setOrders(updated); save("myphoto-orders", updated);
                    }} style={{ ...inp, width: "auto", padding: "4px 8px", fontSize: 12, fontWeight: 600 }}>
                      {ORDER_STATUSES.map(s => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    Subtotal ${order.subtotal} · Tax ${order.tax} · Ship ${order.shipping}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {orders.length === 0 && <div style={{ textAlign: "center", padding: "52px 0", color: "#aaa" }}><div style={{ fontSize: 32, opacity: 0.2, marginBottom: 10 }}>📦</div>No orders yet</div>}
        </>)}

        {/* ─── PRODUCTS TAB ─── */}
        {tab === "products" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontFamily: S, fontSize: 26, margin: 0 }}>Products</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSortMode(!sortMode)} style={{ padding: "8px 16px", borderRadius: 9, border: sortMode ? "2px solid #1a1a1a" : "1px solid rgba(0,0,0,0.12)", background: sortMode ? "#1a1a1a" : "#fff", color: sortMode ? "#fff" : "#555", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 600 }}>{sortMode ? "✓ Done Sorting" : "↕ Sort"}</button>
              {!sortMode && <button onClick={() => setEditing({ id: "", name: "", category: "Acrylic", desc: "", sizes: [{ label: "", price: 0, sceneLandscape: null, scenePortrait: null }], images: [], videos: [], active: true })} style={btnP}>+ Add</button>}
            </div>
          </div>

          {sortMode ? (
            <>
              <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>Drag products or use the arrows to set the order they appear in your shop.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {products.map((p, i) => (
                  <div key={p.id}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx === null || dragIdx === i) return;
                      const n = [...products];
                      const [moved] = n.splice(dragIdx, 1);
                      n.splice(i, 0, moved);
                      setProducts(n); save("myphoto-products", n);
                      setDragIdx(null);
                    }}
                    onDragEnd={() => setDragIdx(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: dragIdx === i ? "#f0ede8" : "#fff",
                      borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", cursor: "grab", opacity: p.active ? 1 : 0.5,
                      transition: "background 0.15s",
                    }}>
                    {/* Drag handle */}
                    <span style={{ fontSize: 14, color: "#ccc", cursor: "grab", flexShrink: 0, userSelect: "none" }}>⠿</span>
                    {/* Position number */}
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#bbb", width: 20, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                    {/* Thumbnail */}
                    <div style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : "#e8e6e2", border: "1px solid rgba(0,0,0,0.06)" }} />
                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{p.category}</div>
                    </div>
                    {/* Up/Down buttons */}
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); if (i === 0) return; const n = [...products]; [n[i-1], n[i]] = [n[i], n[i-1]]; setProducts(n); save("myphoto-products", n); }}
                        disabled={i === 0} style={{ ...smBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={e => { e.stopPropagation(); if (i === products.length - 1) return; const n = [...products]; [n[i], n[i+1]] = [n[i+1], n[i]]; setProducts(n); save("myphoto-products", n); }}
                        disabled={i === products.length - 1} style={{ ...smBtn, opacity: i === products.length - 1 ? 0.3 : 1 }}>↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inp, flex: 1, minWidth: 160 }} />
                <div style={{ display: "flex", gap: 4 }}>{CATS.map(c => <button key={c} onClick={() => setFCat(c)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, background: fCat === c ? "#1a1a1a" : "#e8e6e2", color: fCat === c ? "#fff" : "#666" }}>{c}</button>)}</div>
              </div>
              {filtered.map(p => (<div key={p.id} onClick={() => setEditing(p)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)", cursor: "pointer", marginBottom: 8, opacity: p.active ? 1 : 0.5 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : "#e8e6e2", border: "1px solid rgba(0,0,0,0.06)" }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div><div style={{ fontSize: 12, color: "#999" }}>{p.category} · {p.sizes.length} sizes · {p.sizes.filter(s => s.sceneLandscape?.bgImage || s.scenePortrait?.bgImage || s.scene?.bgImage).length}/{p.sizes.length} scenes</div></div>
                <div style={{ fontFamily: S, fontSize: 16 }}>${Math.min(...p.sizes.map(s => s.price))}+</div><div style={{ color: "#ccc" }}>›</div>
              </div>))}
            </>
          )}
          {editing && <ProductEditor product={editing} onSave={saveProd} onCancel={() => setEditing(null)} onDelete={delProd} />}
        </>)}

        {/* ─── HERO TAB ─── */}
        {tab === "hero" && (<>
          <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 16 }}>Hero Section</h2>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Badge Text</label><input value={hero.badge} onChange={e => { const h = { ...hero, badge: e.target.value }; setHero(h); save("myphoto-hero", h); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Headline (Line 1)</label><input value={hero.headline} onChange={e => { const h = { ...hero, headline: e.target.value }; setHero(h); save("myphoto-hero", h); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Headline (Line 2 — italic)</label><input value={hero.headlineLine2} onChange={e => { const h = { ...hero, headlineLine2: e.target.value }; setHero(h); save("myphoto-hero", h); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Subtitle</label><textarea value={hero.subtitle} onChange={e => { const h = { ...hero, subtitle: e.target.value }; setHero(h); save("myphoto-hero", h); }} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>CTA Button Text</label><input value={hero.ctaText} onChange={e => { const h = { ...hero, ctaText: e.target.value }; setHero(h); save("myphoto-hero", h); }} style={inp} /></div>
            <div><label style={lbl}>Background Image</label>
              {hero.bgImage ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                  <img src={hero.bgImage} alt="" style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "cover" }} />
                  <button onClick={() => { const h = { ...hero, bgImage: null }; setHero(h); save("myphoto-hero", h); }} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13 }}>×</button>
                </div>
              ) : null}
              <button onClick={() => heroRef.current?.click()} style={{ padding: "10px 18px", borderRadius: 10, border: "2px dashed rgba(0,0,0,0.08)", background: "transparent", cursor: "pointer", fontSize: 12, color: "#888", fontFamily: F }}>{hero.bgImage ? "Change image" : "Upload hero image"}</button>
              <input ref={heroRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (!f) return; const u = await readAndCompress(f, 1600, 900, 0.75); const h = { ...hero, bgImage: u }; setHero(h); save("myphoto-hero", h); }} />
            </div>
          </div>
        </>)}

        {/* ─── UPLOAD SCREEN TAB ─── */}
        {tab === "upload" && (<>
          <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 16 }}>Upload Screen</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            {/* Controls */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Headline</label><input value={uCfg.headline} onChange={e => setU("headline", e.target.value)} style={inp} /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Subtitle</label><input value={uCfg.subtitle} onChange={e => setU("subtitle", e.target.value)} style={inp} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><label style={lbl}>Box Main Text</label><input value={uCfg.boxText} onChange={e => setU("boxText", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Box Sub Text</label><input value={uCfg.boxSubtext} onChange={e => setU("boxSubtext", e.target.value)} style={inp} /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Box Icon (emoji or text)</label><input value={uCfg.boxIcon} onChange={e => setU("boxIcon", e.target.value)} style={inp} maxLength={4} /></div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Background</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <div><div style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>Color</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="color" value={uCfg.bgColor || "#faf9f7"} onChange={e => setU("bgColor", e.target.value)} style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }} />
                      <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{uCfg.bgColor || "default"}</span>
                      {uCfg.bgColor && <button onClick={() => setU("bgColor", "")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 12 }}>×</button>}
                    </div>
                  </div>
                </div>
                <div>
                  {uCfg.bgImage ? (
                    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
                      <img src={uCfg.bgImage} alt="" style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }} />
                      <button onClick={() => setU("bgImage", null)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}>×</button>
                    </div>
                  ) : null}
                  <button onClick={() => uploadBgRef.current?.click()} style={{ padding: "8px 14px", borderRadius: 8, border: "2px dashed rgba(0,0,0,0.08)", background: "transparent", cursor: "pointer", fontSize: 11, color: "#888", fontFamily: F }}>{uCfg.bgImage ? "Change bg image" : "Upload bg image"}</button>
                  <input ref={uploadBgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (!f) return; const u = await readAndCompress(f, 1600, 900, 0.75); setU("bgImage", u); }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><label style={lbl}>Box Border Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="color" value={uCfg.boxBorderColor || "#cccccc"} onChange={e => setU("boxBorderColor", e.target.value)} style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }} />
                    {uCfg.boxBorderColor && <button onClick={() => setU("boxBorderColor", "")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 12 }}>×</button>}
                  </div>
                </div>
                <div><label style={lbl}>Box Background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="color" value={uCfg.boxBgColor || "#ffffff"} onChange={e => setU("boxBgColor", e.target.value)} style={{ width: 32, height: 28, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }} />
                    {uCfg.boxBgColor && <button onClick={() => setU("boxBgColor", "")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 12 }}>×</button>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setU("showProductPreview", !uCfg.showProductPreview)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: uCfg.showProductPreview ? "#1a1a1a" : "#ddd", position: "relative" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: uCfg.showProductPreview ? 19 : 3, transition: "left 0.2s" }} /></button>
                <span style={{ fontSize: 12, color: "#666" }}>Show product preview image alongside upload</span>
              </div>

              {uCfg.showProductPreview && (
                <div><label style={lbl}>Preview Position</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["left", "right", "top"].map(pos => (
                      <button key={pos} onClick={() => setU("previewPosition", pos)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, background: uCfg.previewPosition === pos ? "#1a1a1a" : "#e8e6e2", color: uCfg.previewPosition === pos ? "#fff" : "#666", textTransform: "capitalize" }}>{pos}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live preview */}
            <div>
              <label style={lbl}>Live Preview</label>
              <div style={{
                borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)",
                background: uCfg.bgImage ? `url(${uCfg.bgImage}) center/cover` : (uCfg.bgColor || "#faf9f7"),
                padding: "32px 20px", position: "relative",
              }}>
                {uCfg.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />}
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: uCfg.showProductPreview && uCfg.previewPosition === "top" ? "column" : "row", gap: 16, alignItems: "center" }}>
                  {uCfg.showProductPreview && uCfg.previewPosition === "left" && (
                    <div style={{ width: 80, height: 80, borderRadius: 10, background: "#e8e6e2", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc", border: "1px solid rgba(0,0,0,0.06)" }}>📷</div>
                  )}
                  {uCfg.showProductPreview && uCfg.previewPosition === "top" && (
                    <div style={{ width: 100, height: 70, borderRadius: 10, background: "#e8e6e2", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc", border: "1px solid rgba(0,0,0,0.06)" }}>📷</div>
                  )}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <h3 style={{ fontFamily: S, fontSize: 18, marginBottom: 3, color: uCfg.bgImage ? "#fff" : "#1a1a1a" }}>{uCfg.headline}</h3>
                    <p style={{ fontSize: 10, color: uCfg.bgImage ? "rgba(255,255,255,0.7)" : "#999", marginBottom: 12 }}>{uCfg.subtitle}</p>
                    <div style={{
                      border: `2px dashed ${uCfg.boxBorderColor || "rgba(0,0,0,0.1)"}`,
                      borderRadius: 12, padding: "24px 16px",
                      background: uCfg.boxBgColor || "transparent",
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.2 }}>{uCfg.boxIcon}</div>
                      <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, color: uCfg.bgImage ? "#fff" : "#1a1a1a" }}>{uCfg.boxText}</div>
                      <div style={{ color: uCfg.bgImage ? "rgba(255,255,255,0.6)" : "#aaa", fontSize: 9 }}>{uCfg.boxSubtext}</div>
                    </div>
                  </div>
                  {uCfg.showProductPreview && uCfg.previewPosition === "right" && (
                    <div style={{ width: 80, height: 80, borderRadius: 10, background: "#e8e6e2", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc", border: "1px solid rgba(0,0,0,0.06)" }}>📷</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>)}

        {/* ─── NAVIGATION TAB ─── */}
        {tab === "nav" && (() => {
          const items = site.navItems || DEF_SITE.navItems;
          const saveNav = (newItems) => { const s = { ...site, navItems: newItems }; setSite(s); save("myphoto-site", s); };
          const addItem = (item) => saveNav([...items, { ...item, id: uid() }]);
          const removeItem = (id) => saveNav(items.filter(n => n.id !== id));
          const moveItem = (i, dir) => { const n = [...items]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; saveNav(n); };
          const updateItem = (id, updates) => saveNav(items.map(n => n.id === id ? { ...n, ...updates } : n));

          return (<>
            <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 6 }}>Navigation</h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Configure the links that appear in your site's navigation bar. Drag to reorder.</p>

            {/* Current nav items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {items.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ ...smBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} style={{ ...smBtn, opacity: i === items.length - 1 ? 0.3 : 1 }}>↓</button>
                  </div>
                  <input value={item.label} onChange={e => updateItem(item.id, { label: e.target.value })} style={{ ...inp, flex: 1, fontWeight: 600 }} />
                  <select value={item.type} onChange={e => updateItem(item.id, { type: e.target.value, action: e.target.value === "action" ? "create" : undefined, pageId: e.target.value === "page" ? pages[0]?.id : undefined, url: e.target.value === "url" ? "" : undefined })}
                    style={{ ...inp, width: "auto", flex: 0.6 }}>
                    <option value="action">Action</option>
                    <option value="page">Page</option>
                    <option value="url">External URL</option>
                  </select>
                  {item.type === "action" && (
                    <select value={item.action || "create"} onChange={e => updateItem(item.id, { action: e.target.value })} style={{ ...inp, width: "auto", flex: 0.5 }}>
                      <option value="create">Create (Upload)</option>
                      <option value="cart">Cart</option>
                      <option value="home">Home</option>
                    </select>
                  )}
                  {item.type === "page" && (
                    <select value={item.pageId || ""} onChange={e => updateItem(item.id, { pageId: e.target.value })} style={{ ...inp, width: "auto", flex: 0.6 }}>
                      {pages.map(pg => <option key={pg.id} value={pg.id}>{pg.title}</option>)}
                    </select>
                  )}
                  {item.type === "url" && (
                    <input value={item.url || ""} onChange={e => updateItem(item.id, { url: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="https://..." />
                  )}
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => addItem({ label: "New Link", type: "action", action: "create" })} style={{ ...btnO, fontSize: 12 }}>+ Action Link</button>
              <button onClick={() => addItem({ label: pages[0]?.title || "Page", type: "page", pageId: pages[0]?.id })} style={{ ...btnO, fontSize: 12 }}>+ Page Link</button>
              <button onClick={() => addItem({ label: "External", type: "url", url: "" })} style={{ ...btnO, fontSize: 12 }}>+ External URL</button>
            </div>

            {/* Live preview */}
            <div style={{ marginTop: 24 }}>
              <label style={lbl}>Preview</label>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontFamily: S, fontSize: 20, fontStyle: "italic", color: site.accentColor || "#1a1a1a" }}>{site.logoText.slice(0, 2)}</span>
                  <span style={{ fontFamily: S, fontSize: 20 }}>{site.logoText.slice(2)}</span>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {items.map(item => (
                    <span key={item.id} style={{ fontSize: 13, color: "#555", fontWeight: 500, fontFamily: F }}>
                      {item.label}
                      {item.type === "action" && item.action === "cart" && <span style={{ marginLeft: 2, fontSize: 9, background: site.accentColor || "#1a1a1a", color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>0</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>);
        })()}

        {/* ─── PAGES TAB ─── */}
        {tab === "pages" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: S, fontSize: 26, margin: 0 }}>Pages</h2>
            <button onClick={() => { const np = { id: uid(), title: "New Page", slug: "new-page", showInNav: true, blocks: [] }; const n = [...pages, np]; setPages(n); save("myphoto-pages", n); setEditPage(np); }} style={btnP}>+ Add Page</button>
          </div>
          {!editPage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pages.map(pg => (
                <div key={pg.id} onClick={() => setEditPage(pg)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)", cursor: "pointer" }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{pg.title}</div><div style={{ fontSize: 12, color: "#999" }}>/{pg.slug} · {pg.blocks.length} blocks · {pg.showInNav ? "In nav" : "Hidden"}</div></div>
                  <div style={{ color: "#ccc" }}>›</div>
                </div>
              ))}
              {pages.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>No pages yet</div>}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => setEditPage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F, fontSize: 13, color: "#888" }}>← Back to pages</button>
                <button onClick={() => { const n = pages.filter(p => p.id !== editPage.id); setPages(n); save("myphoto-pages", n); setEditPage(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, color: "#d44" }}>Delete page</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Page Title</label><input value={editPage.title} onChange={e => { const u = { ...editPage, title: e.target.value }; setEditPage(u); const n = pages.map(p => p.id === u.id ? u : p); setPages(n); save("myphoto-pages", n); }} style={inp} /></div>
                <div><label style={lbl}>URL Slug</label><input value={editPage.slug} onChange={e => { const u = { ...editPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }; setEditPage(u); const n = pages.map(p => p.id === u.id ? u : p); setPages(n); save("myphoto-pages", n); }} style={inp} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <button onClick={() => { const u = { ...editPage, showInNav: !editPage.showInNav }; setEditPage(u); const n = pages.map(p => p.id === u.id ? u : p); setPages(n); save("myphoto-pages", n); }} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: editPage.showInNav ? "#1a1a1a" : "#ddd", position: "relative" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: editPage.showInNav ? 19 : 3, transition: "left 0.2s" }} /></button>
                <span style={{ fontSize: 12, color: "#666" }}>Show in navigation</span>
              </div>
              {/* Blocks */}
              <label style={lbl}>Content Blocks</label>
              {editPage.blocks.map((block, i) => (
                <BlockEditor key={block.id} block={block} products={products}
                  onChange={u => { const bs = [...editPage.blocks]; bs[i] = u; const pg = { ...editPage, blocks: bs }; setEditPage(pg); const n = pages.map(p => p.id === pg.id ? pg : p); setPages(n); save("myphoto-pages", n); }}
                  onRemove={() => { const bs = editPage.blocks.filter((_, j) => j !== i); const pg = { ...editPage, blocks: bs }; setEditPage(pg); const n = pages.map(p => p.id === pg.id ? pg : p); setPages(n); save("myphoto-pages", n); }}
                  onMoveUp={() => { if (i === 0) return; const bs = [...editPage.blocks]; [bs[i-1], bs[i]] = [bs[i], bs[i-1]]; const pg = { ...editPage, blocks: bs }; setEditPage(pg); const n = pages.map(p => p.id === pg.id ? pg : p); setPages(n); save("myphoto-pages", n); }}
                  onMoveDown={() => { if (i === editPage.blocks.length-1) return; const bs = [...editPage.blocks]; [bs[i], bs[i+1]] = [bs[i+1], bs[i]]; const pg = { ...editPage, blocks: bs }; setEditPage(pg); const n = pages.map(p => p.id === pg.id ? pg : p); setPages(n); save("myphoto-pages", n); }}
                />
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[{ type: "text", label: "📝 Text" }, { type: "gallery", label: "🖼 Gallery" }, { type: "video", label: "🎬 Video" }, { type: "products", label: "🛍 Products" }].map(t => (
                  <button key={t.type} onClick={() => { const nb = { id: uid(), type: t.type, content: "", images: [], videos: [], productIds: [], caption: "", videoUrl: "" }; const pg = { ...editPage, blocks: [...editPage.blocks, nb] }; setEditPage(pg); const n = pages.map(p => p.id === pg.id ? pg : p); setPages(n); save("myphoto-pages", n); }}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px dashed rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: F, color: "#888" }}>{t.label}</button>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* ─── CART TAB ─── */}
        {tab === "cart" && (<>
          <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 16 }}>Cart & Checkout</h2>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Shipping Price ($)</label><input type="number" value={cartCfg.shippingPrice} onChange={e => { const c = { ...cartCfg, shippingPrice: Number(e.target.value) || 0 }; setCartCfg(c); save("myphoto-cart", c); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Free Shipping Minimum ($)</label><input type="number" value={site.freeShipMin} onChange={e => { const s = { ...site, freeShipMin: Number(e.target.value) || 0 }; setSite(s); save("myphoto-site", s); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Tax Rate (%)</label><input type="number" step="0.01" value={cartCfg.taxRate} onChange={e => { const c = { ...cartCfg, taxRate: Number(e.target.value) || 0 }; setCartCfg(c); save("myphoto-cart", c); }} style={inp} /></div>
            <div><label style={lbl}>Order Confirmation Note</label><textarea value={cartCfg.checkoutNote} onChange={e => { const c = { ...cartCfg, checkoutNote: e.target.value }; setCartCfg(c); save("myphoto-cart", c); }} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
          </div>
        </>)}

        {/* ─── SITE SETTINGS TAB ─── */}
        {tab === "site" && (<>
          <h2 style={{ fontFamily: S, fontSize: 26, marginBottom: 16 }}>Site Settings</h2>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Logo Text</label><input value={site.logoText} onChange={e => { const s = { ...site, logoText: e.target.value }; setSite(s); save("myphoto-site", s); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Accent Color</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={site.accentColor} onChange={e => { const s = { ...site, accentColor: e.target.value }; setSite(s); save("myphoto-site", s); }} style={{ width: 40, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>{site.accentColor}</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Guarantee Text</label><input value={site.guaranteeText} onChange={e => { const s = { ...site, guaranteeText: e.target.value }; setSite(s); save("myphoto-site", s); }} style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Footer Links (comma-separated)</label><input value={site.footerLinks.join(", ")} onChange={e => { const s = { ...site, footerLinks: e.target.value.split(",").map(l => l.trim()).filter(Boolean) }; setSite(s); save("myphoto-site", s); }} style={inp} /></div>
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
              <label style={lbl}>Admin Password</label>
              <p style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>Access admin at <strong>yoursite.com/#admin</strong></p>
              <input type="text" value={site.adminPassword || ""} onChange={e => { const s = { ...site, adminPassword: e.target.value }; setSite(s); save("myphoto-site", s); }} style={inp} placeholder="Set admin password" />
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  PRODUCT PREVIEW (customer)
// ═══════════════════════════════════════
function ProductPreview({ imageUrl, photos, product, sizeIdx, posX, posY, zoom, onPosChange, interactive, orientation, activeFrame, onFrameSelect }) {
  // photos: array of { url, posX, posY, zoom } for multi-photo. Falls back to single imageUrl.
  const allPhotos = photos && photos.length > 0 ? photos : (imageUrl ? [{ url: imageUrl, posX: posX || 50, posY: posY || 50, zoom: zoom || 100 }] : []);
  const sz = product.sizes[sizeIdx];
  const isPortrait = orientation === "portrait";
  const sc = isPortrait
    ? (sz?.scenePortrait || sz?.sceneLandscape || sz?.scene || null)
    : (sz?.sceneLandscape || sz?.scene || sz?.scenePortrait || null);
  const frames = mkFrames(sc);
  const [dragging, setDragging] = useState(false);
  const colors = ["#7cb5e0", "#e07c7c", "#7ce0a0", "#e0c87c", "#c87ce0", "#7ce0d8"];

  const startDrag = (e, frameIdx) => {
    if (!interactive || !onPosChange) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    if (onFrameSelect) onFrameSelect(frameIdx);
    const photo = allPhotos[frameIdx] || { posX: 50, posY: 50, zoom: 100 };
    const startX = e.clientX ?? e.touches?.[0]?.clientX;
    const startY = e.clientY ?? e.touches?.[0]?.clientY;
    const startPosX = photo.posX; const startPosY = photo.posY;
    const rect = e.currentTarget.getBoundingClientRect();
    const sensX = 100 / rect.width;
    const sensY = 100 / rect.height;
    const onMove = (ev) => {
      ev.preventDefault();
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX;
      const cy = ev.clientY ?? ev.touches?.[0]?.clientY;
      onPosChange({ frameIdx, posX: Math.max(0, Math.min(100, startPosX - (cx - startX) * sensX)), posY: Math.max(0, Math.min(100, startPosY - (cy - startY) * sensY)) });
    };
    const onUp = () => { setDragging(false); document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.removeEventListener("touchmove", onMove); document.removeEventListener("touchend", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false }); document.addEventListener("touchend", onUp);
  };

  const onWheel = (e, frameIdx) => {
    if (!interactive || !onPosChange) return;
    e.preventDefault();
    const photo = allPhotos[frameIdx] || { zoom: 100 };
    onPosChange({ frameIdx, zoom: Math.max(100, Math.min(300, (photo.zoom || 100) + (e.deltaY > 0 ? -8 : 8))) });
  };

  const renderPhoto = (fr, fi) => {
    const photo = allPhotos[fi];
    if (!photo?.url) {
      // Empty slot
      return (
        <div key={fr.id || fi} onClick={() => onFrameSelect?.(fi)}
          style={{ position: "absolute", zIndex: 1, left: `${fr.x-fr.w/2}%`, top: `${fr.y-fr.h/2}%`, width: `${fr.w}%`, height: `${fr.h}%`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.05)", cursor: interactive ? "pointer" : "default", border: activeFrame === fi ? `2px solid ${colors[fi % colors.length]}` : "1px dashed rgba(255,255,255,0.4)" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.4)", fontFamily: F }}>Photo #{fi + 1}</span>
        </div>
      );
    }
    const zs = (photo.zoom || 100) / 100;
    return (
      <div key={fr.id || fi}
        onMouseDown={e => startDrag(e, fi)} onTouchStart={e => startDrag(e, fi)} onWheel={e => onWheel(e, fi)}
        onClick={() => onFrameSelect?.(fi)}
        style={{ position: "absolute", zIndex: 1, left: `${fr.x-fr.w/2}%`, top: `${fr.y-fr.h/2}%`, width: `${fr.w}%`, height: `${fr.h}%`, overflow: "hidden", cursor: interactive ? (dragging ? "grabbing" : "grab") : "default", touchAction: "none", border: activeFrame === fi ? `2px solid ${colors[fi % colors.length]}` : "none" }}>
        <img src={photo.url} alt="" draggable={false} style={{
          position: "absolute", inset: 0, width: `${zs * 100}%`, height: `${zs * 100}%`, maxWidth: "none",
          objectFit: "cover", objectPosition: `${photo.posX}% ${photo.posY}%`,
          left: `${-(zs - 1) * photo.posX}%`, top: `${-(zs - 1) * photo.posY}%`,
          display: "block", userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none",
        }} />
      </div>
    );
  };

  if (sc?.bgImage) {
    return (
      <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", background: "#f0ede8" }}>
        <img src={sc.bgImage} alt="" style={{ width: "100%", display: "block", position: "relative", zIndex: 2, pointerEvents: "none" }} />
        {frames.map((fr, fi) => renderPhoto(fr, fi))}
        <div style={{ position: "absolute", bottom: 10, right: 12, zIndex: 3, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: F, fontWeight: 500 }}>{sz.label}</div>
        {interactive && !dragging && (
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 3, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "5px 14px", borderRadius: 20, fontSize: 11, fontFamily: F, fontWeight: 500, pointerEvents: "none" }}>
            {frames.length > 1 ? `${frames.length} photos · Drag to position` : "✋ Drag to position · Scroll to zoom"}
          </div>
        )}
        {interactive && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 3, background: "rgba(0,0,0,0.45)", color: "#fff", padding: "3px 8px", borderRadius: 12, fontSize: 9, fontFamily: F, fontWeight: 600, pointerEvents: "none" }}>
            {orientation === "portrait" ? "▮ Portrait" : "▬ Landscape"}
          </div>
        )}
      </div>
    );
  }

  // Fallback
  const photo0 = allPhotos[0] || { url: imageUrl, posX: 50, posY: 50, zoom: 100 };
  const zs0 = (photo0.zoom || 100) / 100;
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", height: 300, background: "linear-gradient(135deg,#f0ebe4,#e0d8ce)" }}>
      <div style={{ position: "absolute", inset: 0, background: "#ece8e0", height: "60%" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to bottom,#d8d0c6,#cac0b4)" }} />
      {photo0.url && <div onMouseDown={e => startDrag(e, 0)} onTouchStart={e => startDrag(e, 0)} onWheel={e => onWheel(e, 0)}
        style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: "34%", height: "38%", borderRadius: 4, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,0.2)", border: "3px solid rgba(255,255,255,0.7)", cursor: interactive ? (dragging ? "grabbing" : "grab") : "default", touchAction: "none" }}>
        <img src={photo0.url} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: `${zs0 * 100}%`, height: `${zs0 * 100}%`, maxWidth: "none", objectFit: "cover", objectPosition: `${photo0.posX}% ${photo0.posY}%`, left: `${-(zs0 - 1) * photo0.posX}%`, top: `${-(zs0 - 1) * photo0.posY}%`, display: "block", userSelect: "none" }} />
      </div>}
      <div style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: F, fontWeight: 500 }}>{sz?.label}</div>
    </div>
  );
}

// ═══════════════════════════════════════
//  CUSTOMER: Page Renderer
// ═══════════════════════════════════════
function PageRenderer({ page, products, onProductClick }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontFamily: S, fontSize: 36, marginBottom: 32 }}>{page.title}</h1>
      {page.blocks.map(block => (
        <div key={block.id} style={{ marginBottom: 32 }}>
          {block.type === "text" && <div style={{ fontSize: 16, lineHeight: 1.8, color: "#444", whiteSpace: "pre-wrap" }}>{block.content}</div>}
          {block.type === "gallery" && (<div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {(block.images||[]).map((img, i) => <div key={i} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "1", background: `url(${img}) center/cover` }} />)}
            </div>
            {block.caption && <p style={{ fontSize: 13, color: "#999", marginTop: 8, textAlign: "center" }}>{block.caption}</p>}
          </div>)}
          {block.type === "video" && (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(block.videos||[]).map((v, i) => { const vid = typeof v === "string" ? { src: v, type: "url" } : v; return (
              <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                {vid.type === "file" ? <video src={vid.src} controls style={{ width: "100%", display: "block", background: "#000" }} />
                : isEmbed(vid.src) ? <div style={{ position: "relative", paddingBottom: "56.25%" }}><iframe src={embedUrl(vid.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen title="Video" /></div>
                : <video src={vid.src} controls style={{ width: "100%", display: "block", background: "#000" }} />}
              </div>); })}
          </div>)}
          {block.type === "products" && (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {products.filter(p => p.active && (block.productIds||[]).includes(p.id)).map(p => (
              <div key={p.id} onClick={() => onProductClick(p)} style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer", background: "#fff", border: "1px solid rgba(0,0,0,0.05)", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ height: 140, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : "#ece9e4", display: "flex", alignItems: "center", justifyContent: "center" }}>{(!p.images||!p.images.length) && <span style={{ fontSize: 28, opacity: 0.15 }}>📷</span>}</div>
                <div style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.name}</div><div style={{ fontFamily: S, fontSize: 16 }}>From ${Math.min(...p.sizes.map(s => s.price))}</div></div>
              </div>))}
          </div>)}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════
export default function MyPhotoApp() {
  const [mode, setMode] = useState("shop");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [products, setProducts] = useState(DEF_PRODUCTS);
  const [hero, setHero] = useState(DEF_HERO);
  const [pages, setPages] = useState(DEF_PAGES);
  const [site, setSite] = useState(DEF_SITE);
  const [cartCfg, setCartCfg] = useState(DEF_CART);
  const [uploadCfg, setUploadCfg] = useState(DEF_UPLOAD);
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState(0); // 0=home,1=upload,2=customize,3=cart,4=done,5=page
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState("");
  const [photos, setPhotos] = useState([]); // [{ url, name, posX, posY, zoom, orientation }]
  const [activeFrame, setActiveFrame] = useState(0);
  const [selProd, setSelProd] = useState(null);
  const [selSize, setSelSize] = useState(0);
  const [selFilter, setSelFilter] = useState("none");
  const [posX, setPosX] = useState(50); // 0-100, 50 = centered
  const [posY, setPosY] = useState(50);
  const [zoom, setZoom] = useState(100); // 100 = fit, 200 = 2x zoom
  const [cart, setCart] = useState([]);
  const [dragO, setDragO] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [shopCat, setShopCat] = useState("All");
  const [selImg, setSelImg] = useState(0);
  const [curPage, setCurPage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [photoOrientation, setPhotoOrientation] = useState("landscape"); // "landscape" | "portrait"
  const [checkout, setCheckout] = useState({ email: "", firstName: "", lastName: "", address: "", city: "", state: "", zip: "", phone: "", cardName: "", cardNumber: "", cardExp: "", cardCvc: "" });
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const fileRef = useRef(); const chgRef = useRef();

  useEffect(() => {
    (async () => {
      setProducts(await loadStore("myphoto-products", DEF_PRODUCTS));
      setHero(await loadStore("myphoto-hero", DEF_HERO));
      setPages(await loadStore("myphoto-pages", DEF_PAGES));
      setSite(await loadStore("myphoto-site", DEF_SITE));
      setCartCfg(await loadStore("myphoto-cart", DEF_CART));
      setUploadCfg(await loadStore("myphoto-upload", DEF_UPLOAD));
      setOrders(await loadStore("myphoto-orders", []));
      setLoaded(true);
    })();
  }, []);

  // Listen for #admin in URL
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#admin") {
        if (adminAuth) {
          setMode("admin");
        } else {
          setAdminPrompt(true);
        }
      } else {
        if (mode === "admin") setMode("shop");
        setAdminPrompt(false);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [adminAuth, mode]);

  useEffect(() => { setFadeIn(false); const t = setTimeout(() => setFadeIn(true), 50); return () => clearTimeout(t); }, [step, mode]);

  const detectOrientation = useCallback((dataUrl, cb) => {
    const img = document.createElement("img");
    img.onload = function() { cb(this.naturalWidth >= this.naturalHeight ? "landscape" : "portrait"); };
    img.onerror = function() { cb("landscape"); };
    img.src = dataUrl;
  }, []);

  const handleFile = useCallback(f => {
    if (!f||!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => {
      const url = e.target.result;
      detectOrientation(url, (o) => {
        setImageUrl(url);
        setImageName(f.name);
        setPhotoOrientation(o);
        // Add to photos array at active frame position
        setPhotos(prev => {
          const n = [...prev];
          n[activeFrame] = { url, name: f.name, posX: 50, posY: 50, zoom: 100, orientation: o };
          return n;
        });
        setStep(2);
      });
    };
    r.readAsDataURL(f);
  }, [detectOrientation, activeFrame]);

  const handleDrop = useCallback(e => { e.preventDefault(); setDragO(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const chgPhoto = useCallback((f, frameIdx) => {
    if (!f||!f.type.startsWith("image/")) return;
    const fi = frameIdx ?? activeFrame;
    const r = new FileReader();
    r.onload = e => {
      const url = e.target.result;
      detectOrientation(url, (o) => {
        setPhotos(prev => {
          const n = [...prev];
          n[fi] = { url, name: f.name, posX: 50, posY: 50, zoom: 100, orientation: o };
          return n;
        });
        if (fi === 0) { setImageUrl(url); setImageName(f.name); setPhotoOrientation(o); }
      });
    };
    r.readAsDataURL(f);
  }, [detectOrientation, activeFrame]);

  const active = products.filter(p => p.active);
  const filtP = shopCat === "All" ? active : active.filter(p => p.category === shopCat);
  const price = selProd?.sizes[selSize]?.price || 0;
  const cartTot = cart.reduce((s, i) => s + i.price, 0);
  const tax = cartTot * (cartCfg.taxRate / 100);
  const freeShip = cartTot >= site.freeShipMin;
  const shipCost = freeShip ? 0 : cartCfg.shippingPrice;
  const navPages = pages.filter(p => p.showInNav);
  const ac = site.accentColor || "#1a1a1a";

  const addToCart = () => { setCart(p => [...p, { id: Date.now(), imageUrl, imageName, photos: [...photos], product: selProd, size: selProd.sizes[selSize].label, filter: "none", price, posX, posY, zoom }]); setStep(3); };
  const reset = () => { setImageUrl(null); setSelFilter("none"); setPosX(50); setPosY(50); setZoom(100); setSelSize(0); setPhotos([]); setActiveFrame(0); };
  const save = async (k, v) => saveStore(k, v);

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, color: "#aaa" }}>Loading...</div>;

  // Admin password prompt
  if (adminPrompt && !adminAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, background: "#f5f4f2" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1a1a1a", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff" }}>🔒</div>
        <h2 style={{ fontFamily: S, fontSize: 24, marginBottom: 6 }}>Admin Access</h2>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Enter your admin password to continue</p>
        <input type="password" value={adminPwInput} onChange={e => { setAdminPwInput(e.target.value); setAdminPwError(false); }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              if (adminPwInput === (site.adminPassword || DEF_SITE.adminPassword)) { setAdminAuth(true); setAdminPrompt(false); setMode("admin"); }
              else setAdminPwError(true);
            }
          }}
          style={{ ...inp, textAlign: "center", fontSize: 16, marginBottom: 8, borderColor: adminPwError ? "#d44" : undefined }} placeholder="Password" autoFocus />
        {adminPwError && <p style={{ fontSize: 12, color: "#d44", marginBottom: 8 }}>Incorrect password</p>}
        <button onClick={() => {
          if (adminPwInput === (site.adminPassword || DEF_SITE.adminPassword)) { setAdminAuth(true); setAdminPrompt(false); setMode("admin"); }
          else setAdminPwError(true);
        }} style={{ ...btnP, width: "100%", marginBottom: 8 }}>Enter</button>
        <button onClick={() => { setAdminPrompt(false); window.location.hash = ""; }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, color: "#999" }}>Cancel</button>
      </div>
    </div>
  );

  if (mode === "admin" && adminAuth) return <AdminPanel products={products} setProducts={setProducts} hero={hero} setHero={setHero} pages={pages} setPages={setPages} site={site} setSite={setSite} cartCfg={cartCfg} setCartCfg={setCartCfg} uploadCfg={uploadCfg} setUploadCfg={setUploadCfg} orders={orders} setOrders={setOrders} save={save} onExit={() => { setMode("shop"); window.location.hash = ""; }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", fontFamily: F, color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <style>{`
        * { box-sizing: border-box; }
        .grid-customize { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .grid-checkout { display: grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start; }
        .grid-products { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .nav-links { display: flex; align-items: center; gap: 16px; }
        .nav-menu-btn { display: none; background: none; border: none; cursor: pointer; font-size: 22px; color: #555; }
        .mobile-sizes { display: none; }
        .desktop-sizes { display: block; }
        @media (max-width: 768px) {
          .grid-customize { grid-template-columns: 1fr !important; gap: 16px !important; }
          .grid-checkout { grid-template-columns: 1fr !important; }
          .grid-products { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
          .nav-links { display: none; }
          .nav-links.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: rgba(250,249,247,0.98); backdrop-filter: blur(12px); padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,0.06); gap: 12px; z-index: 99; }
          .nav-menu-btn { display: block; }
          .mobile-sizes { display: block; }
          .desktop-sizes { display: none; }
        }
        @media (max-width: 480px) {
          .grid-products { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(250,249,247,0.92)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, position: "relative" }}>
        <div onClick={() => { setStep(0); reset(); setSelProd(null); setCurPage(null); setMobileNav(false); }} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontFamily: S, fontSize: 24, fontStyle: "italic", color: ac }}>{site.logoText.slice(0, 2)}</span>
          <span style={{ fontFamily: S, fontSize: 24 }}>{site.logoText.slice(2)}</span>
        </div>
        <button className="nav-menu-btn" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? "✕" : "☰"}</button>
        <div className={`nav-links${mobileNav ? " open" : ""}`}>
          {(site.navItems || DEF_SITE.navItems).map(item => {
            if (item.type === "action" && item.action === "cart") {
              return <button key={item.id} onClick={() => { setStep(3); setMobileNav(false); }} style={{ ...navB, position: "relative" }}>{item.label}{cart.length > 0 && <span style={{ position: "absolute", top: -5, right: -10, background: ac, color: "#fff", width: 16, height: 16, borderRadius: "50%", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{cart.length}</span>}</button>;
            }
            if (item.type === "action" && item.action === "create") {
              return <button key={item.id} onClick={() => { setStep(1); setMobileNav(false); }} style={navB}>{item.label}</button>;
            }
            if (item.type === "action" && item.action === "home") {
              return <button key={item.id} onClick={() => { setStep(0); reset(); setSelProd(null); setCurPage(null); setMobileNav(false); }} style={navB}>{item.label}</button>;
            }
            if (item.type === "page") {
              const pg = pages.find(p => p.id === item.pageId);
              if (!pg) return null;
              return <button key={item.id} onClick={() => { setCurPage(pg); setStep(5); setMobileNav(false); }} style={navB}>{item.label}</button>;
            }
            if (item.type === "url") {
              return <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...navB, textDecoration: "none" }}>{item.label}</a>;
            }
            return null;
          })}
        </div>
      </nav>

      <div style={{ opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(8px)", transition: "all 0.5s ease" }}>

        {/* HOME */}
        {step === 0 && (<div>
          <div style={{ padding: "72px 24px 56px", textAlign: "center", position: "relative", overflow: "hidden", background: hero.bgImage ? `url(${hero.bgImage}) center/cover` : "linear-gradient(180deg,#faf9f7,#f0ede8)" }}>
            {hero.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />}
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: hero.bgImage ? "rgba(255,255,255,0.7)" : "#aaa", marginBottom: 16, fontWeight: 500 }}>{hero.badge}</p>
              <h1 style={{ fontFamily: S, fontSize: "clamp(32px,6vw,56px)", fontWeight: 400, lineHeight: 1.1, margin: "0 auto 16px", maxWidth: 520, color: hero.bgImage ? "#fff" : "#1a1a1a" }}>{hero.headline}<br /><span style={{ fontStyle: "italic" }}>{hero.headlineLine2}</span></h1>
              <p style={{ fontSize: 15, color: hero.bgImage ? "rgba(255,255,255,0.85)" : "#777", maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.6 }}>{hero.subtitle}</p>
              <button onClick={() => setStep(1)} style={{ background: ac, color: "#fff", border: "none", padding: "14px 40px", borderRadius: 50, fontSize: 14, fontFamily: F, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{hero.ctaText}</button>
              <p style={{ fontSize: 11, color: hero.bgImage ? "rgba(255,255,255,0.5)" : "#bbb", marginTop: 12 }}>Free shipping on orders ${site.freeShipMin}+ · {site.guaranteeText}</p>
            </div>
          </div>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px 72px" }}>
            <h2 style={{ fontFamily: S, fontSize: 28, textAlign: "center", marginBottom: 24 }}>Our Products</h2>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
              {CATS.map(c => <button key={c} onClick={() => setShopCat(c)} style={{ padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, background: shopCat === c ? ac : "rgba(0,0,0,0.04)", color: shopCat === c ? "#fff" : "#888" }}>{c}</button>)}
            </div>
            <div className="grid-products">
              {filtP.map(p => (<div key={p.id} onClick={() => { setSelProd(p); setSelSize(0); setSelImg(0); setStep(2); }} style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer", background: "#fff", border: "1px solid rgba(0,0,0,0.05)", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ height: 170, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : "linear-gradient(135deg,#ece9e4,#ddd8d0)", display: "flex", alignItems: "center", justifyContent: "center" }}>{(!p.images||!p.images.length) && <span style={{ fontSize: 32, opacity: 0.15 }}>📷</span>}</div>
                <div style={{ padding: "14px 16px" }}><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.name}</div><div style={{ fontSize: 12, color: "#999", marginBottom: 6, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.desc}</div><div style={{ fontFamily: S, fontSize: 17 }}>From ${Math.min(...p.sizes.map(s => s.price))}</div></div>
              </div>))}
            </div>
          </div>
        </div>)}

        {/* UPLOAD */}
        {step === 1 && (() => { const uc = uploadCfg || DEF_UPLOAD; const hasBg = !!uc.bgImage; return (
          <div style={{ position: "relative", overflow: "hidden" }}>
            {hasBg && <div style={{ position: "absolute", inset: 0, background: `url(${uc.bgImage}) center/cover` }} />}
            {hasBg && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />}
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "44px 24px", position: "relative", zIndex: 1, display: "flex", flexDirection: uc.showProductPreview && uc.previewPosition === "left" ? "row" : uc.showProductPreview && uc.previewPosition === "right" ? "row-reverse" : "column", gap: 24, alignItems: "center" }}>
              {uc.showProductPreview && selProd?.images?.[0] && uc.previewPosition === "top" && (
                <div style={{ width: 140, height: 140, borderRadius: 14, background: `url(${selProd.images[0]}) center/cover`, border: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }} />
              )}
              {uc.showProductPreview && selProd?.images?.[0] && (uc.previewPosition === "left" || uc.previewPosition === "right") && (
                <div style={{ width: 160, height: 200, borderRadius: 14, background: `url(${selProd.images[0]}) center/cover`, border: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, textAlign: "center", background: uc.bgColor && !hasBg ? uc.bgColor : undefined }}>
                {selProd && <div style={{ marginBottom: 16 }}><p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: hasBg ? "rgba(255,255,255,0.6)" : "#aaa", marginBottom: 3 }}>Creating on</p><h3 style={{ fontFamily: S, fontSize: 24, color: hasBg ? "#fff" : "#1a1a1a" }}>{selProd.name}</h3></div>}
                <h2 style={{ fontFamily: S, fontSize: 30, marginBottom: 6, color: hasBg ? "#fff" : "#1a1a1a" }}>{uc.headline}</h2>
                <p style={{ color: hasBg ? "rgba(255,255,255,0.7)" : "#999", fontSize: 13, marginBottom: 28 }}>{uc.subtitle}</p>
                <div onDragOver={e => { e.preventDefault(); setDragO(true); }} onDragLeave={() => setDragO(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragO ? (hasBg ? "rgba(255,255,255,0.6)" : "#1a1a1a") : (uc.boxBorderColor || "rgba(0,0,0,0.1)")}`, borderRadius: 18, padding: "56px 28px", textAlign: "center", cursor: "pointer", background: uc.boxBgColor || (dragO ? "rgba(0,0,0,0.015)" : "transparent"), transition: "all 0.2s" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.2 }}>{uc.boxIcon}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: hasBg ? "#fff" : "#1a1a1a" }}>{uc.boxText}</div>
                  <div style={{ color: hasBg ? "rgba(255,255,255,0.6)" : "#aaa", fontSize: 12 }}>{uc.boxSubtext}</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              </div>
            </div>
          </div>
        ); })()}

        {/* PRODUCT PAGE / CUSTOMIZE */}
        {step === 2 && (<div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 24px 56px" }}>
          {selProd && !imageUrl && (() => {
            const media = [...(selProd.images||[]).map((img) => ({ k: "img", src: img })), ...(selProd.videos||[]).map(v => { const vid = typeof v === "string" ? { src: v, type: "url", name: v } : v; return { k: "vid", ...vid }; })];
            const selMedia = media[selImg] || null;
            return (
            <div className="grid-customize">
              {/* Left: Product media */}
              <div>
                {selProd.images?.[0] ? (
                  <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                    <img src={selProd.images[0]} alt="" style={{ width: "100%", display: "block" }} />
                  </div>
                ) : (
                  <div style={{ borderRadius: 16, height: 300, background: "linear-gradient(135deg,#f0ebe4,#e0d8ce)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, opacity: 0.15 }}>📷</div>
                )}
                {media.length > 1 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
                    {media.map((m, i) => (
                      <div key={i} onClick={() => setSelImg(i)} style={{ width: 52, height: 52, borderRadius: 7, overflow: "hidden", cursor: "pointer", flexShrink: 0, border: selImg === i ? `2px solid ${ac}` : "1px solid rgba(0,0,0,0.06)", background: m.k === "img" ? `url(${m.src}) center/cover` : (vidThumb(m.src) ? `url(${vidThumb(m.src)}) center/cover` : "#e8e6e2"), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {m.k === "vid" && <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><span style={{ color: "#fff", fontSize: 7, marginLeft: 1 }}>▶</span></div>}
                      </div>
                    ))}
                  </div>
                )}
                {selMedia && selImg > 0 && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                    {selMedia.k === "img" ? <img src={selMedia.src} alt="" style={{ width: "100%", display: "block" }} />
                    : selMedia.type === "file" ? <video src={selMedia.src} controls style={{ width: "100%", display: "block", background: "#000" }} />
                    : isEmbed(selMedia.src) ? <div style={{ position: "relative", paddingBottom: "56.25%" }}><iframe src={embedUrl(selMedia.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen title="Video" /></div>
                    : <video src={selMedia.src} controls style={{ width: "100%", display: "block", background: "#000" }} />}
                  </div>
                )}
              </div>
              {/* Right: Product info + upload CTA */}
              <div>
                <h2 style={{ fontFamily: S, fontSize: 28, marginBottom: 6 }}>{selProd.name}</h2>
                <div style={{ fontFamily: S, fontSize: 22, color: ac, marginBottom: 12 }}>From ${Math.min(...selProd.sizes.map(s => s.price))}</div>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, marginBottom: 20, whiteSpace: "pre-wrap" }}>{selProd.fullDesc || selProd.desc}</p>
                {/* Sizes */}
                <div style={{ marginBottom: 20 }}>
                  <p style={secL}>Available Sizes</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selProd.sizes.map((s, i) => <span key={i} style={{ padding: "6px 12px", borderRadius: 7, background: "#f0ede8", fontSize: 12, color: "#555", fontFamily: F }}>{s.label} — ${s.price}</span>)}
                  </div>
                </div>
                {/* Upload CTA */}
                <div onDragOver={e => { e.preventDefault(); setDragO(true); }} onDragLeave={() => setDragO(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragO ? ac : "rgba(0,0,0,0.12)"}`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragO ? "rgba(0,0,0,0.01)" : "transparent", transition: "all 0.2s", marginBottom: 16 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.2 }}>⬆</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Upload your photo to get started</div>
                  <div style={{ color: "#aaa", fontSize: 12 }}>JPG, PNG, or WEBP</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                </div>
                {/* Switch product */}
                <div>
                  <p style={secL}>More Products</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {active.filter(p => p.id !== selProd.id).map(p => <button key={p.id} onClick={() => { setSelProd(p); setSelSize(0); setSelImg(0); }} style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: F, fontSize: 11, fontWeight: 500, border: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>{p.name}</button>)}
                  </div>
                </div>
              </div>
            </div>);
          })()}
          {selProd && imageUrl && (() => {
            const media = [...(selProd.images||[]).map((img) => ({ k: "img", src: img })), ...(selProd.videos||[]).map(v => { const vid = typeof v === "string" ? { src: v, type: "url", name: v } : v; return { k: "vid", ...vid }; })];
            const selMedia = media[selImg] || null;
            return (
            <div className="grid-customize">
              {/* Left column: Preview + Zoom + Carousel */}
              <div>
                {/* Preview */}
                <ProductPreview imageUrl={imageUrl} photos={photos} product={selProd} sizeIdx={selSize} posX={posX} posY={posY} zoom={zoom} interactive orientation={photoOrientation} activeFrame={activeFrame} onFrameSelect={setActiveFrame}
                  onPosChange={({ frameIdx, posX: px, posY: py, zoom: z }) => {
                    const fi = frameIdx ?? activeFrame;
                    setPhotos(prev => {
                      const n = [...prev];
                      if (!n[fi]) return n;
                      if (px !== undefined) n[fi] = { ...n[fi], posX: px };
                      if (py !== undefined) n[fi] = { ...n[fi], posY: py };
                      if (z !== undefined) n[fi] = { ...n[fi], zoom: z };
                      return n;
                    });
                    if (fi === 0) { if (px !== undefined) setPosX(px); if (py !== undefined) setPosY(py); if (z !== undefined) setZoom(z); }
                  }} />

                {/* Photo slots for multi-photo products */}
                {(() => {
                  const sc2 = (() => { const sz2 = selProd.sizes[selSize]; const isP = photoOrientation === "portrait"; return isP ? (sz2?.scenePortrait || sz2?.sceneLandscape || sz2?.scene || null) : (sz2?.sceneLandscape || sz2?.scene || sz2?.scenePortrait || null); })();
                  const frames2 = mkFrames(sc2);
                  if (frames2.length <= 1) return null;
                  const colors2 = ["#7cb5e0", "#e07c7c", "#7ce0a0", "#e0c87c", "#c87ce0"];
                  return (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {frames2.map((fr, fi) => {
                        const photo = photos[fi];
                        return (
                          <div key={fr.id || fi} onClick={() => { setActiveFrame(fi); if (!photo) fileRef.current?.click(); }}
                            style={{ flex: 1, minWidth: 60, padding: "8px", borderRadius: 8, border: activeFrame === fi ? `2px solid ${colors2[fi % colors2.length]}` : "1px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", textAlign: "center" }}>
                            {photo?.url ? (
                              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 6, overflow: "hidden", marginBottom: 4, background: `url(${photo.url}) center/cover` }} />
                            ) : (
                              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 6, marginBottom: 4, background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#ccc" }}>+</div>
                            )}
                            <div style={{ fontSize: 10, fontWeight: 600, color: colors2[fi % colors2.length] }}>Photo #{fi + 1}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Zoom control */}
                {(() => {
                  const curPhoto = photos[activeFrame];
                  const curZoom = curPhoto?.zoom || 100;
                  const curPx = curPhoto?.posX ?? 50;
                  const curPy = curPhoto?.posY ?? 50;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "#f0ede8" }}>
                      <span style={{ fontSize: 13 }}>−</span>
                      <input type="range" min="100" max="300" value={curZoom} onChange={e => {
                        const z = Number(e.target.value);
                        setPhotos(prev => { const n = [...prev]; if (n[activeFrame]) n[activeFrame] = { ...n[activeFrame], zoom: z }; return n; });
                        if (activeFrame === 0) setZoom(z);
                      }} style={{ flex: 1, accentColor: ac }} />
                      <span style={{ fontSize: 13 }}>+</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#555", minWidth: 32 }}>{curZoom}%</span>
                      {(curPx !== 50 || curPy !== 50 || curZoom !== 100) && <button onClick={() => {
                        setPhotos(prev => { const n = [...prev]; if (n[activeFrame]) n[activeFrame] = { ...n[activeFrame], posX: 50, posY: 50, zoom: 100 }; return n; });
                        if (activeFrame === 0) { setPosX(50); setPosY(50); setZoom(100); }
                      }} style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: F, fontSize: 10, color: "#888" }}>Reset</button>}
                    </div>
                  );
                })()}

                {/* Media carousel — thumbnail strip */}
                {media.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
                    {media.map((m, i) => (
                      <div key={i} onClick={() => setSelImg(i)} style={{
                        width: 52, height: 52, borderRadius: 7, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                        border: selImg === i ? `2px solid ${ac}` : "1px solid rgba(0,0,0,0.06)",
                        background: m.k === "img" ? `url(${m.src}) center/cover` : (vidThumb(m.src) ? `url(${vidThumb(m.src)}) center/cover` : "#e8e6e2"),
                        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                      }}>
                        {m.k === "vid" && <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><span style={{ color: "#fff", fontSize: 7, marginLeft: 1 }}>▶</span></div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded media view — only show if a media item is selected and it's not the first load */}
                {selMedia && selImg > 0 && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                    {selMedia.k === "img" ? <img src={selMedia.src} alt="" style={{ width: "100%", display: "block" }} />
                    : selMedia.type === "file" ? <video src={selMedia.src} controls style={{ width: "100%", display: "block", background: "#000" }} />
                    : isEmbed(selMedia.src) ? <div style={{ position: "relative", paddingBottom: "56.25%" }}><iframe src={embedUrl(selMedia.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen title="Video" /></div>
                    : <video src={selMedia.src} controls style={{ width: "100%", display: "block", background: "#000" }} />}
                  </div>
                )}

                {/* Sizes — shown here on mobile (via CSS order), on right column for desktop */}
                <div className="mobile-sizes" style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selProd.sizes.map((s, i) => { const hasScene = s.sceneLandscape?.bgImage || s.scenePortrait?.bgImage || s.scene?.bgImage; return <button key={i} onClick={() => setSelSize(i)} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, border: selSize === i ? `2px solid ${ac}` : "1px solid rgba(0,0,0,0.1)", background: selSize === i ? ac : "#fff", color: selSize === i ? "#fff" : "#555", position: "relative" }}>{s.label} — ${s.price}{hasScene && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#2a8", border: "2px solid #fff" }} />}</button>; })}
                  </div>
                </div>
              </div>

              {/* Right column: Product info + controls + CTA */}
              <div>
                {/* Photo change strip */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 10px", borderRadius: 8, background: "#f0ede8" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: `url(${imageUrl}) center/cover`, border: "2px solid rgba(255,255,255,0.8)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imageName}</div></div>
                  <button onClick={() => chgRef.current?.click()} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontFamily: F, fontSize: 10, fontWeight: 500, color: "#555" }}>Change</button>
                  <button onClick={() => { setImageUrl(null); setImageName(""); setStep(1); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#bbb" }}>×</button>
                  <input ref={chgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { chgPhoto(e.target.files[0]); e.target.value = ""; }} />
                </div>

                <h3 style={{ fontFamily: S, fontSize: 24, marginBottom: 2 }}>{selProd.name}</h3>
                <p style={{ color: "#999", fontSize: 12, marginBottom: 16, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selProd.fullDesc || selProd.desc}</p>

                {/* Sizes — desktop only (hidden on mobile via CSS) */}
                <div className="desktop-sizes" style={{ marginBottom: 14 }}>
                  <p style={secL}>Size</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selProd.sizes.map((s, i) => { const hasScene = s.sceneLandscape?.bgImage || s.scenePortrait?.bgImage || s.scene?.bgImage; return <button key={i} onClick={() => setSelSize(i)} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 500, border: selSize === i ? `2px solid ${ac}` : "1px solid rgba(0,0,0,0.1)", background: selSize === i ? ac : "#fff", color: selSize === i ? "#fff" : "#555", position: "relative" }}>{s.label} — ${s.price}{hasScene && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#2a8", border: "2px solid #fff" }} />}</button>; })}
                  </div>
                </div>

                {/* Switch product */}
                <div style={{ marginBottom: 14 }}>
                  <p style={secL}>Product</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {active.map(p => <button key={p.id} onClick={() => { setSelProd(p); setSelSize(0); setSelImg(0); }} style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: F, fontSize: 11, fontWeight: 500, border: selProd.id === p.id ? `2px solid ${ac}` : "1px solid rgba(0,0,0,0.08)", background: selProd.id === p.id ? "#faf9f7" : "#fff" }}>{p.name}</button>)}
                  </div>
                </div>

                {/* Price + CTA */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#999" }}>{selProd.name} · {selProd.sizes[selSize]?.label}</span>
                    <span style={{ fontFamily: S, fontSize: 24 }}>${price}</span>
                  </div>
                  <button onClick={addToCart} style={{ width: "100%", background: ac, color: "#fff", border: "none", padding: 13, borderRadius: 10, fontSize: 14, fontFamily: F, fontWeight: 600, cursor: "pointer" }}>Add to Cart</button>
                </div>
              </div>
            </div>);
          })()}
          {!selProd && <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#aaa", marginBottom: 16 }}>Select a product to get started</p>
            <button onClick={() => setStep(0)} style={{ ...btnP }}>Browse Products</button>
          </div>}
        </div>)}

        {/* CART */}
        {step === 3 && (<div style={{ maxWidth: 500, margin: "0 auto", padding: "44px 24px" }}>
          <h2 style={{ fontFamily: S, fontSize: 28, marginBottom: 24 }}>Your cart</h2>
          {cart.length === 0 ? (<div style={{ textAlign: "center", padding: "52px 0" }}><p style={{ color: "#aaa", marginBottom: 18 }}>Your cart is empty</p><button onClick={() => setStep(1)} style={{ background: ac, color: "#fff", border: "none", padding: "13px 36px", borderRadius: 50, fontFamily: F, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Start Creating</button></div>) : (<>
            {cart.map((item, i) => (<div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 7, flexShrink: 0, background: `url(${item.imageUrl}) center/cover` }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{item.product.name}</div><div style={{ fontSize: 11, color: "#999" }}>{item.size}</div></div>
              <div style={{ fontFamily: S, fontSize: 15 }}>${item.price}</div>
              <button onClick={() => setCart(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16 }}>×</button>
            </div>))}
            {!freeShip && <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "rgba(232,216,152,0.1)", fontSize: 12, color: "#999" }}>Add ${(site.freeShipMin - cartTot).toFixed(2)} more for free shipping<div style={{ marginTop: 5, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.05)" }}><div style={{ height: "100%", borderRadius: 2, background: ac, width: `${Math.min(100, (cartTot/site.freeShipMin)*100)}%` }} /></div></div>}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${ac}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#999", marginBottom: 3 }}><span>Subtotal</span><span>${cartTot.toFixed(2)}</span></div>
              {cartCfg.taxRate > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#999", marginBottom: 3 }}><span>Tax ({cartCfg.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: freeShip ? "#2a8" : "#999", marginBottom: 12 }}><span>Shipping</span><span>{freeShip ? "Free" : `$${shipCost.toFixed(2)}`}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 600, marginBottom: 20 }}><span>Total</span><span style={{ fontFamily: S, fontSize: 24 }}>${(cartTot + tax + shipCost).toFixed(2)}</span></div>
              <button onClick={() => setStep(6)} style={{ width: "100%", background: ac, color: "#fff", border: "none", padding: 14, borderRadius: 10, fontSize: 14, fontFamily: F, fontWeight: 600, cursor: "pointer" }}>Proceed to Checkout</button>
              <button onClick={() => setStep(1)} style={{ width: "100%", background: "none", border: "none", padding: 9, fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: F, marginTop: 3 }}>+ Add another</button>
            </div>
          </>)}
        </div>)}

        {/* CHECKOUT */}
        {step === 6 && (<div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 60px" }}>
          <button onClick={() => setStep(3)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F, fontSize: 13, color: "#888", marginBottom: 16 }}>← Back to cart</button>
          <h2 style={{ fontFamily: S, fontSize: 28, marginBottom: 24 }}>Checkout</h2>
          <div className="grid-checkout">
            {/* Left: Forms */}
            <div>
              {/* Contact */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <h3 style={{ fontFamily: S, fontSize: 20, marginBottom: 14 }}>Contact</h3>
                <div style={{ marginBottom: 10 }}>
                  <input value={checkout.email} onChange={e => setCheckout(p => ({ ...p, email: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.email ? "#d44" : undefined }} placeholder="Email address" />
                  {checkoutErrors.email && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.email}</span>}
                </div>
                <input value={checkout.phone} onChange={e => setCheckout(p => ({ ...p, phone: e.target.value }))} style={inp} placeholder="Phone (optional)" />
              </div>

              {/* Shipping */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <h3 style={{ fontFamily: S, fontSize: 20, marginBottom: 14 }}>Shipping Address</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <input value={checkout.firstName} onChange={e => setCheckout(p => ({ ...p, firstName: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.firstName ? "#d44" : undefined }} placeholder="First name" />
                    {checkoutErrors.firstName && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.firstName}</span>}
                  </div>
                  <div>
                    <input value={checkout.lastName} onChange={e => setCheckout(p => ({ ...p, lastName: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.lastName ? "#d44" : undefined }} placeholder="Last name" />
                    {checkoutErrors.lastName && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.lastName}</span>}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <input value={checkout.address} onChange={e => setCheckout(p => ({ ...p, address: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.address ? "#d44" : undefined }} placeholder="Street address" />
                  {checkoutErrors.address && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.address}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <input value={checkout.city} onChange={e => setCheckout(p => ({ ...p, city: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.city ? "#d44" : undefined }} placeholder="City" />
                    {checkoutErrors.city && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.city}</span>}
                  </div>
                  <div>
                    <input value={checkout.state} onChange={e => setCheckout(p => ({ ...p, state: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.state ? "#d44" : undefined }} placeholder="State" maxLength={2} />
                    {checkoutErrors.state && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.state}</span>}
                  </div>
                  <div>
                    <input value={checkout.zip} onChange={e => setCheckout(p => ({ ...p, zip: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.zip ? "#d44" : undefined }} placeholder="ZIP" />
                    {checkoutErrors.zip && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.zip}</span>}
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontFamily: S, fontSize: 20, marginBottom: 14 }}>Payment</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {["Visa", "Mastercard", "Amex", "Discover"].map(c => (
                    <span key={c} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", fontSize: 11, color: "#888", fontWeight: 500 }}>{c}</span>
                  ))}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <input value={checkout.cardName} onChange={e => setCheckout(p => ({ ...p, cardName: e.target.value }))} style={{ ...inp, borderColor: checkoutErrors.cardName ? "#d44" : undefined }} placeholder="Name on card" />
                  {checkoutErrors.cardName && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.cardName}</span>}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <input value={checkout.cardNumber} onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    const formatted = v.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCheckout(p => ({ ...p, cardNumber: formatted }));
                  }} style={{ ...inp, fontFamily: "monospace", letterSpacing: 2, borderColor: checkoutErrors.cardNumber ? "#d44" : undefined }} placeholder="Card number" />
                  {checkoutErrors.cardNumber && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.cardNumber}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <input value={checkout.cardExp} onChange={e => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                      setCheckout(p => ({ ...p, cardExp: v }));
                    }} style={{ ...inp, borderColor: checkoutErrors.cardExp ? "#d44" : undefined }} placeholder="MM/YY" maxLength={5} />
                    {checkoutErrors.cardExp && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.cardExp}</span>}
                  </div>
                  <div>
                    <input value={checkout.cardCvc} onChange={e => setCheckout(p => ({ ...p, cardCvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))} style={{ ...inp, borderColor: checkoutErrors.cardCvc ? "#d44" : undefined }} placeholder="CVC" maxLength={4} type="password" />
                    {checkoutErrors.cardCvc && <span style={{ fontSize: 11, color: "#d44" }}>{checkoutErrors.cardCvc}</span>}
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(42,136,68,0.06)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2a8844" }}>
                  <span>🔒</span> Your payment info is encrypted and secure
                </div>
              </div>
            </div>

            {/* Right: Order summary */}
            <div style={{ position: "sticky", top: 70 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontFamily: S, fontSize: 18, marginBottom: 14 }}>Order Summary</h3>
                {cart.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < cart.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0, background: `url(${item.imageUrl}) center/cover` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{item.size}</div>
                    </div>
                    <div style={{ fontFamily: S, fontSize: 14 }}>${item.price}</div>
                  </div>
                ))}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#999", marginBottom: 4 }}><span>Subtotal</span><span>${cartTot.toFixed(2)}</span></div>
                  {cartCfg.taxRate > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#999", marginBottom: 4 }}><span>Tax ({cartCfg.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: freeShip ? "#2a8" : "#999", marginBottom: 8 }}><span>Shipping</span><span>{freeShip ? "Free" : `$${shipCost.toFixed(2)}`}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.06)" }}><span>Total</span><span style={{ fontFamily: S, fontSize: 22 }}>${(cartTot + tax + shipCost).toFixed(2)}</span></div>
                </div>
                <button onClick={async () => {
                  // Validate
                  const errs = {};
                  if (!checkout.email.includes("@")) errs.email = "Valid email required";
                  if (!checkout.firstName.trim()) errs.firstName = "Required";
                  if (!checkout.lastName.trim()) errs.lastName = "Required";
                  if (!checkout.address.trim()) errs.address = "Required";
                  if (!checkout.city.trim()) errs.city = "Required";
                  if (!checkout.state.trim()) errs.state = "Required";
                  if (!checkout.zip.trim()) errs.zip = "Required";
                  if (!checkout.cardName.trim()) errs.cardName = "Required";
                  const cardDigits = checkout.cardNumber.replace(/\D/g, "");
                  if (cardDigits.length < 13) errs.cardNumber = "Valid card number required";
                  if (!/^\d{2}\/\d{2}$/.test(checkout.cardExp)) errs.cardExp = "MM/YY format";
                  if (checkout.cardCvc.length < 3) errs.cardCvc = "3-4 digits";
                  setCheckoutErrors(errs);
                  if (Object.keys(errs).length > 0) return;

                  setGenerating(true);
                  try {
                    const orderId = uid().toUpperCase();
                    const orderItems = [];
                    for (const item of cart) {
                      const { blob, dims, dpi, pxW, pxH } = await generatePrintPDF(item);
                      const pdfUrl = URL.createObjectURL(blob);
                      orderItems.push({ ...item, pdfUrl, pdfDims: dims, pdfDpi: dpi, pdfPx: { w: pxW, h: pxH }, product: { id: item.product.id, name: item.product.name, category: item.product.category } });
                    }
                    const order = {
                      id: orderId,
                      customer: { email: checkout.email, firstName: checkout.firstName, lastName: checkout.lastName, phone: checkout.phone, address: checkout.address, city: checkout.city, state: checkout.state, zip: checkout.zip },
                      payment: { cardLast4: cardDigits.slice(-4), cardName: checkout.cardName },
                      items: orderItems.map(it => ({ imageName: it.imageName, imageUrl: it.imageUrl, size: it.size, filter: "none", price: it.price, posX: it.posX, posY: it.posY, zoom: it.zoom, pdfDims: it.pdfDims, pdfDpi: it.pdfDpi, pdfPx: it.pdfPx, product: { id: it.product.id, name: it.product.name, category: it.product.category } })),
                      total: (cartTot + tax + shipCost).toFixed(2), subtotal: cartTot.toFixed(2), tax: tax.toFixed(2), shipping: shipCost.toFixed(2),
                      status: "pending", createdAt: new Date().toISOString(), itemCount: cart.length,
                    };
                    const newOrders = [...orders, order];
                    setOrders(newOrders);
                    await saveStore("myphoto-orders", newOrders);
                    window._lastOrderPdfs = orderItems.map(it => ({ name: `${it.product.name}-${it.size.replace(/["""]/g, "")}-${orderId}.pdf`, url: it.pdfUrl, size: it.size, product: it.product.name, dims: it.pdfDims, dpi: it.pdfDpi, px: it.pdfPx }));
                    window._lastOrderId = orderId;
                    setStep(4); setCart([]);
                    setCheckout({ email: "", firstName: "", lastName: "", address: "", city: "", state: "", zip: "", phone: "", cardName: "", cardNumber: "", cardExp: "", cardCvc: "" });
                  } catch (err) { console.error("Order failed:", err); alert("Error processing order. Please try again."); }
                  setGenerating(false);
                }} disabled={generating} style={{ width: "100%", marginTop: 16, background: generating ? "#999" : ac, color: "#fff", border: "none", padding: 15, borderRadius: 10, fontSize: 15, fontFamily: F, fontWeight: 700, cursor: generating ? "wait" : "pointer", letterSpacing: 0.3 }}>
                  {generating ? "Processing..." : `Pay $${(cartTot + tax + shipCost).toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>)}

        {/* CONFIRMED */}
        {step === 4 && (<div style={{ maxWidth: 500, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: ac, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>✓</div>
          <h2 style={{ fontFamily: S, fontSize: 32, marginBottom: 8 }}>Order placed!</h2>
          <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{cartCfg.checkoutNote}</p>
          <p style={{ color: "#bbb", fontSize: 12, marginBottom: 24 }}>Order #{window._lastOrderId || uid().toUpperCase()}</p>

          {/* PDF Downloads */}
          {window._lastOrderPdfs?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, textAlign: "left", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 24 }}>
              <p style={{ ...secL, marginBottom: 12 }}>Print-Ready PDFs Generated</p>
              {window._lastOrderPdfs.map((pdf, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < window._lastOrderPdfs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pdf.product} — {pdf.size}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>{pdf.px.w}×{pdf.px.h}px · {pdf.dpi} DPI · {pdf.dims.w}×{pdf.dims.h} inches</div>
                  </div>
                  <a href={pdf.url} download={pdf.name} style={{ padding: "6px 14px", borderRadius: 8, background: ac, color: "#fff", textDecoration: "none", fontSize: 12, fontFamily: F, fontWeight: 600, flexShrink: 0 }}>Download</a>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 14, padding: 20, textAlign: "left", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 24 }}>
            <p style={{ ...secL, marginBottom: 12 }}>What happens next</p>
            {[{ i: "📄", t: "High-res PDF generated at 300 DPI" }, { i: "🏭", t: "Queued for batch printing & quality check" }, { i: "📦", t: "Carefully packed and shipped" }].map((s, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}><span style={{ fontSize: 16 }}>{s.i}</span><span style={{ fontSize: 13, color: "#666" }}>{s.t}</span></div>
            ))}
          </div>
          <button onClick={() => { setStep(0); reset(); setSelProd(null); window._lastOrderPdfs = null; window._lastOrderId = null; }} style={{ background: ac, color: "#fff", border: "none", padding: "13px 36px", borderRadius: 50, fontFamily: F, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Back to Home</button>
        </div>)}

        {/* CUSTOM PAGE */}
        {step === 5 && curPage && <PageRenderer page={curPage} products={products} onProductClick={p => { setSelProd(p); setSelSize(0); setSelImg(0); setStep(2); }} />}

      </div>

      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#bbb" }}>
        <span>© 2026 {site.logoText}</span>
        <div style={{ display: "flex", gap: 14 }}>{site.footerLinks.map(l => <span key={l} style={{ cursor: "pointer" }}>{l}</span>)}</div>
        <span>{site.guaranteeText}</span>
      </footer>
    </div>
  );
}

const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.12)", fontFamily: F, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#999", marginBottom: 6 };
const secL = { fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", marginBottom: 8 };
const navB = { background: "none", border: "none", cursor: "pointer", fontFamily: F, fontSize: 13, color: "#555", fontWeight: 500 };
const btnP = { padding: "10px 22px", borderRadius: 9, border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 600 };
const btnO = { padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13 };
const smBtn = { background: "none", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 12, color: "#999", display: "flex", alignItems: "center", justifyContent: "center" };
