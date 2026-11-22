// Car data (shared by the showroom page and the owner page)
//
// PREVIEW mode (no Firebase config): sample cars; the owner page saves changes
// in this browser's localStorage only, so a visitor never sees them.
// LIVE mode: cars live in Firestore `cars/{id}`. Anyone can read a car that
// isn't hidden; only logins listed in `admins/{uid}` can write.
// The rules that enforce this are in ../backend/firestore.rules.

import { FIREBASE_CONFIG, CLOUDINARY, LIVE, USE_EMULATOR, SHOP, FINANCE, CONDITIONS, MAKES, BODIES, TRANSMISSIONS,
  FUELS, DRIVES, STATUSES, MAX_PHOTOS } from "./config.js";
import { SAMPLE_CARS } from "./sample-cars.js";

export { LIVE, SHOP, FINANCE, CONDITIONS, MAKES, BODIES, TRANSMISSIONS, FUELS, DRIVES, STATUSES, MAX_PHOTOS };

/* ---------- Helpers ---------- */
export const money = (n) => `${SHOP.currency} ${Math.round(Number(n)).toLocaleString("en-GH")}`;
export const km = (n) => `${Number(n).toLocaleString("en-GH")} km`;
export const title = (c) => `${c.year} ${c.make} ${c.model}`;
export const cover = (c) => (c.photos && c.photos[0]) || "";
export const conditionLabel = (id) => CONDITIONS.find((c) => c.id === id)?.label ?? "";
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label ?? "Available";
export const isNew = (c) => Date.now() - (c.createdAt || 0) < 7 * 864e5;
/** Monthly instalment estimate, no interest. */
export const monthly = (price, depositPct = FINANCE.defaultDepositPct, months = FINANCE.defaultMonths) =>
  Math.ceil((Number(price) * (1 - depositPct / 100)) / months / 10) * 10;
const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
const thisYear = new Date().getFullYear();

/** Tidy a car before saving. Throws Error with a friendly message. */
export function cleanCar(c) {
  const model = String(c.model || "").trim();
  if (!MAKES.includes(c.make)) throw new Error("Please pick the make (e.g. Toyota).");
  if (!model) throw new Error("Please write the model (e.g. Land Cruiser Prado VX).");
  if (model.length > 60) throw new Error("Keep the model under 60 letters.");
  const year = Math.round(Number(c.year));
  if (!(year >= 1980 && year <= thisYear + 1)) throw new Error(`Please give a year between 1980 and ${thisYear + 1}.`);
  const price = Math.round(Number(c.price));
  if (!(price > 0 && price <= 100000000)) throw new Error("Please give a price above 0.");
  if (!CONDITIONS.some((x) => x.id === c.condition)) throw new Error("Please pick the condition: brand new, foreign used or Ghana used.");
  const photos = (c.photos || []).filter(Boolean).slice(0, MAX_PHOTOS);
  if (!photos.length) throw new Error("Please add at least one photo.");
  const mileage = c.mileage === "" || c.mileage == null ? 0 : Math.round(Number(c.mileage));
  if (!(mileage >= 0 && mileage <= 2000000)) throw new Error("Mileage should be a number in km, e.g. 85000.");
  const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
  const features = [...new Set((c.features || []).map((f) => String(f).trim().slice(0, 40)).filter(Boolean))].slice(0, 24);
  return {
    make: c.make,
    model,
    year,
    price,
    condition: c.condition,
    body: pick(c.body, BODIES, "SUV"),
    transmission: pick(c.transmission, TRANSMISSIONS, "Automatic"),
    fuel: pick(c.fuel, FUELS, "Petrol"),
    drive: pick(c.drive, DRIVES, "FWD"),
    mileage,
    engine: String(c.engine || "").trim().slice(0, 30),
    colour: String(c.colour || "").trim().slice(0, 30),
    features,
    description: String(c.description || "").trim().slice(0, 1000),
    photos,
    status: STATUSES.some((s) => s.id === c.status) ? c.status : "available",
    featured: Boolean(c.featured),
    hidden: Boolean(c.hidden),
    createdAt: Number(c.createdAt) || Date.now(),
  };
}

/* ---------- Preview store (localStorage) ---------- */
const KEY = "cars-preview-v1";
function readPreview() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return structuredClone(SAMPLE_CARS);
}
function writePreview(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new Error("This browser's storage is full. Use fewer or smaller photos, or reset the preview.");
  }
}
export function resetPreview() {
  try { localStorage.removeItem(KEY); } catch {}
}

/* ---------- Firebase (loaded only when configured) ---------- */
const V = "10.12.2";
let fbPromise, authPromise;
function firebase() {
  fbPromise ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const db = fs.getFirestore(app);
    if (USE_EMULATOR) fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    return { app, fs, db };
  })();
  fbPromise.catch(() => (fbPromise = null));
  return fbPromise;
}
function firebaseAuth() {
  authPromise ??= (async () => {
    const [{ app, fs, db }, au] = await Promise.all([
      firebase(),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    ]);
    const auth = au.getAuth(app);
    if (USE_EMULATOR) au.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    return { fs, db, au, auth };
  })();
  authPromise.catch(() => (authPromise = null));
  return authPromise;
}

/* ---------- Cars ---------- */
/** Showroom: visible cars. Owner page: pass { all: true } to include hidden ones. */
export async function getCars({ all = false } = {}) {
  if (!LIVE) return readPreview().filter((c) => all || !c.hidden).sort(byNewest);
  const { fs, db } = all ? await firebaseAuth() : await firebase();
  const col = fs.collection(db, "cars");
  const snap = await fs.getDocs(all ? col : fs.query(col, fs.where("hidden", "==", false)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}

/** Create (no id) or update (with id). Returns the saved car. */
export async function saveCar(c) {
  const data = cleanCar(c);
  if (!LIVE) {
    const list = readPreview();
    const id = c.id || `c-${Date.now().toString(36)}`;
    const i = list.findIndex((x) => x.id === id);
    const saved = { ...data, id };
    if (i >= 0) list[i] = saved; else list.push(saved);
    writePreview(list);
    return saved;
  }
  const { fs, db } = await firebaseAuth();
  const ref = c.id ? fs.doc(db, "cars", c.id) : fs.doc(fs.collection(db, "cars"));
  await fs.setDoc(ref, { ...data, updatedAt: fs.serverTimestamp() });
  return { ...data, id: ref.id };
}

/** Quick changes from the car list (status / featured / hidden). */
export async function setFlags(car, flags) {
  return saveCar({ ...car, ...flags });
}

export async function deleteCar(id) {
  if (!LIVE) return writePreview(readPreview().filter((c) => c.id !== id));
  const { fs, db } = await firebaseAuth();
  await fs.deleteDoc(fs.doc(db, "cars", id));
}

/* ---------- Photos ---------- */
/** Shrink a photo from the phone camera to a JPEG data URL. */
export function shrinkPhoto(file, maxSide = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * scale);
      cv.height = Math.round(img.naturalHeight * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a photo we can read. Try a JPG or PNG.")); };
    img.src = url;
  });
}

/** True when photos go to Cloudinary (then up to 10 per car fit). */
export const cloudPhotos = () => Boolean(LIVE && CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);
/** Without Cloudinary, photos are stored inside the car (Firestore doc max 1MB). */
export const photoLimit = () => (cloudPhotos() ? MAX_PHOTOS : LIVE ? 8 : 6);

/** Returns the URL to store on the car. */
export async function uploadPhoto(file) {
  if (!cloudPhotos()) return shrinkPhoto(file, LIVE ? 900 : 760, LIVE ? 0.7 : 0.66);
  const body = new FormData();
  body.append("file", await shrinkPhoto(file, 2000, 0.86));
  body.append("upload_preset", CLOUDINARY.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: "POST", body });
  if (!res.ok) throw new Error("The photo didn't upload. Check your internet and try again.");
  const { secure_url } = await res.json();
  // Ask Cloudinary for a web-sized, auto-format copy.
  return secure_url.replace("/upload/", "/upload/f_auto,q_auto,w_1400/");
}

/* ---------- Owner sign-in (live mode) ---------- */
export async function onOwner(cb) {
  if (!LIVE) return cb({ preview: true });
  const { fs, db, au, auth } = await firebaseAuth();
  au.onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    let admin = false;
    try { admin = (await fs.getDoc(fs.doc(db, "admins", user.uid))).exists(); } catch {}
    cb({ user, admin });
  });
}
export async function signIn(email, password) {
  const { au, auth } = await firebaseAuth();
  try {
    await au.signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    const bad = ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"];
    throw new Error(bad.includes(e.code) ? "Wrong email or password." :
      e.code === "auth/too-many-requests" ? "Too many tries. Wait a few minutes and try again." :
      "Couldn't sign in. Check your internet and try again.");
  }
}
export async function signOut() {
  const { au, auth } = await firebaseAuth();
  await au.signOut(auth);
}

/** Start downloading the database code early. */
export function warmUp() { if (LIVE) firebase().catch(() => {}); }
