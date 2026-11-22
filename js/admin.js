// Owner page: add, edit, reserve, sell, feature and hide cars.
import { getCars, saveCar, setFlags, deleteCar, uploadPhoto, photoLimit, cloudPhotos, onOwner, signIn, signOut,
  resetPreview, money, km, title, cover, conditionLabel, LIVE, CONDITIONS, MAKES, BODIES, TRANSMISSIONS, FUELS, DRIVES,
  STATUSES } from "./store.js";
import { COMMON_FEATURES } from "./config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opt = (v, label = v) => `<option value="${esc(v)}">${esc(label)}</option>`;

let cars = [];
let filter = "all";
let query = "";

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Sign in ---------- */
$("previewStrip").hidden = LIVE;
function show(section) {
  for (const id of ["signin", "notAdmin", "owner"]) $(id).hidden = id !== section;
  $("signOut").hidden = !LIVE || section === "signin";
}
onOwner((who) => {
  if (!who) return show("signin");
  if (!who.preview && !who.admin) return show("notAdmin");
  show("owner");
  reload();
});
$("signinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("signinErr").textContent = "";
  const btn = e.submitter; btn.disabled = true;
  try { await signIn($("email").value, $("password").value); }
  catch (err) { $("signinErr").textContent = err.message; }
  finally { btn.disabled = false; }
});
$("signOut").addEventListener("click", () => signOut());
$("reset").addEventListener("click", async () => {
  if (!confirm("Remove your changes and go back to the starting cars?")) return;
  resetPreview(); await reload(); toast("Back to the starting cars");
});

/* ---------- List ---------- */
const FILTERS = [["all", "All"], ["available", "Available"], ["reserved", "Reserved"], ["sold", "Sold"], ["featured", "Featured"], ["hidden", "Hidden"]];
$("ofilter").innerHTML = FILTERS.map(([v, l]) =>
  `<label><input type="radio" name="of" value="${v}"${v === "all" ? " checked" : ""} /><span>${l}</span></label>`).join("");
$("ofilter").addEventListener("change", (e) => { filter = e.target.value; render(); });
$("oq").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });

async function reload() {
  try { cars = await getCars({ all: true }); }
  catch (e) { console.warn(e); $("clist").innerHTML = `<li class="muted">Couldn't load the cars. Check your internet and refresh.</li>`; return; }
  render();
}

function visible(c) {
  if (filter === "featured" && !c.featured) return false;
  if (filter === "hidden" && !c.hidden) return false;
  if (["available", "reserved", "sold"].includes(filter) && c.status !== filter) return false;
  if (query && !`${c.year} ${c.make} ${c.model} ${c.colour}`.toLowerCase().includes(query)) return false;
  return true;
}

function render() {
  const n = (s) => cars.filter((c) => c.status === s).length;
  $("stats").textContent = `${cars.length} cars · ${n("available")} available · ${n("reserved")} reserved · ${n("sold")} sold`;
  const list = cars.filter(visible);
  if (!list.length) {
    $("clist").innerHTML = `<li class="empty"><p>${cars.length ? "No cars here." : "No cars yet. Tap “+ Add a car” to add your first one."}</p></li>`;
    return;
  }
  $("clist").innerHTML = list.map((c) => {
    const badges = [
      c.status === "reserved" ? '<i class="b-res">Reserved</i>' : "",
      c.status === "sold" ? '<i class="b-sold">Sold</i>' : "",
      c.featured ? '<i class="b-feat">Featured</i>' : "",
      c.hidden ? "<i>Hidden</i>" : "",
      `<i>${esc(conditionLabel(c.condition))}</i>`,
    ].join("");
    return `<li class="crow${c.hidden ? " is-hidden" : ""}">
      <button type="button" class="crow-main" data-edit="${esc(c.id)}">
        <img src="${esc(cover(c))}" alt="" loading="lazy" />
        <span class="crow-info">
          <b>${esc(title(c))}</b>
          <span>${esc(money(c.price))} · ${esc(c.condition === "new" ? "0 km" : km(c.mileage))} · ${c.photos.length} photo${c.photos.length === 1 ? "" : "s"}</span>
          <span class="badges">${badges}</span>
        </span>
        <span class="edit-hint">Edit</span>
      </button>
      <div class="crow-tools">
        <div class="seg" role="radiogroup" aria-label="Status of ${esc(title(c))}">
          ${STATUSES.map((s) => `<label><input type="radio" name="st-${esc(c.id)}" value="${s.id}" data-status data-id="${esc(c.id)}"${c.status === s.id ? " checked" : ""} /><span>${s.label}</span></label>`).join("")}
        </div>
        <label class="switch"><input type="checkbox" data-flag="featured" data-id="${esc(c.id)}"${c.featured ? " checked" : ""} /><span></span> Featured</label>
        <label class="switch"><input type="checkbox" data-flag="show" data-id="${esc(c.id)}"${c.hidden ? "" : " checked"} /><span></span> On site</label>
      </div>
    </li>`;
  }).join("");
}

$("clist").addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (b) openEditor(cars.find((c) => c.id === b.dataset.edit));
});
$("clist").addEventListener("change", async (e) => {
  const el = e.target;
  const car = cars.find((c) => c.id === el.dataset.id);
  if (!car) return;
  let flags, msg;
  if (el.hasAttribute("data-status")) { flags = { status: el.value }; msg = `Marked ${el.value}`; }
  else if (el.dataset.flag === "featured") { flags = { featured: el.checked }; msg = el.checked ? "Featured" : "No longer featured"; }
  else if (el.dataset.flag === "show") { flags = { hidden: !el.checked }; msg = el.checked ? "Back on the site" : "Hidden from the site"; }
  else return;
  el.disabled = true;
  try {
    const saved = await setFlags(car, flags);
    Object.assign(car, saved);
    toast(msg);
  } catch (err) {
    alert(err.message || "Couldn't save. Check your internet and try again.");
  }
  render();
});

/* ---------- Editor ---------- */
const ed = $("editor");
let editing = null; // car being edited, or null for new
let photos = [];
let busy = false;
let dirty = false;

$("edMake").innerHTML = opt("", "Choose…") + MAKES.map((m) => opt(m)).join("");
$("edBody").innerHTML = BODIES.map((b) => opt(b)).join("");
$("edTrans").innerHTML = TRANSMISSIONS.map((t) => opt(t)).join("");
$("edFuel").innerHTML = FUELS.map((f) => opt(f)).join("");
$("edDrive").innerHTML = DRIVES.map((d) => opt(d)).join("");
$("edYear").max = new Date().getFullYear() + 1;
$("edCond").innerHTML = CONDITIONS.map((c) => `<label><input type="radio" name="edCond" value="${c.id}" /><span>${c.label}</span></label>`).join("");
$("edStatus").innerHTML = STATUSES.map((s) => `<label><input type="radio" name="edStatus" value="${s.id}" /><span>${s.label}</span></label>`).join("");

function renderFeatures(selected) {
  const all = [...new Set([...COMMON_FEATURES, ...selected])];
  $("edFeat").innerHTML = all.map((f) =>
    `<label><input type="checkbox" value="${esc(f)}"${selected.includes(f) ? " checked" : ""} /><span>${esc(f)}</span></label>`).join("");
}
const checkedFeatures = () => [...$("edFeat").querySelectorAll("input:checked")].map((i) => i.value);
$("addFeat").addEventListener("click", () => {
  const v = $("edFeatInput").value.trim().slice(0, 40);
  if (!v) return;
  renderFeatures([...checkedFeatures(), v]);
  $("edFeatInput").value = "";
  dirty = true;
});
$("edFeatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("addFeat").click(); } });

function renderPhotos() {
  const limit = photoLimit();
  $("edPhotos").innerHTML = photos.map((p, i) => `<div class="ph">
      <img src="${esc(p)}" alt="Photo ${i + 1}" />
      <button type="button" class="rm" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button>
      ${i > 0 ? `<button type="button" class="mv" data-cover="${i}">Make cover</button>` : ""}
    </div>`).join("");
  const full = photos.length >= limit;
  $("photoBtn").classList.toggle("full", full);
  $("photoLabel").textContent = full ? `${limit} photos (the most for one car)` : photos.length ? `📷 Add more photos (${photos.length} of ${limit})` : `📷 Add photos (up to ${limit})`;
}
$("edPhotos").addEventListener("click", (e) => {
  const rm = e.target.closest("[data-rm]"), cv = e.target.closest("[data-cover]");
  if (rm) photos.splice(Number(rm.dataset.rm), 1);
  else if (cv) { const [p] = photos.splice(Number(cv.dataset.cover), 1); photos.unshift(p); }
  else return;
  dirty = true;
  renderPhotos();
});
$("edFile").addEventListener("change", async (e) => {
  const files = [...e.target.files].slice(0, photoLimit() - photos.length);
  e.target.value = "";
  if (!files.length) return;
  busy = true; $("edSave").disabled = true; $("edErr").textContent = "";
  try {
    for (const [i, f] of files.entries()) {
      $("photoLabel").textContent = `Adding photo ${i + 1} of ${files.length}…`;
      photos.push(await uploadPhoto(f));
      dirty = true;
      renderPhotos();
    }
  } catch (err) {
    $("edErr").textContent = err.message;
  } finally {
    busy = false; $("edSave").disabled = false; renderPhotos();
  }
});

function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}
const radio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || "";

function openEditor(car = null) {
  editing = car;
  photos = car ? [...car.photos] : [];
  $("edTitle").textContent = car ? "Edit car" : "Add a car";
  $("edMake").value = car?.make || "";
  $("edYear").value = car?.year || "";
  $("edModel").value = car?.model || "";
  $("edPrice").value = car?.price || "";
  $("edKm").value = car ? car.mileage : "";
  document.querySelectorAll('input[name="edCond"]').forEach((i) => (i.checked = false));
  if (car) setRadio("edCond", car.condition);
  $("edBody").value = car?.body || "SUV";
  $("edTrans").value = car?.transmission || "Automatic";
  $("edFuel").value = car?.fuel || "Petrol";
  $("edDrive").value = car?.drive || "FWD";
  $("edEngine").value = car?.engine || "";
  $("edColour").value = car?.colour || "";
  renderFeatures(car?.features || []);
  $("edDesc").value = car?.description || "";
  setRadio("edStatus", car?.status || "available");
  $("edFeatured").checked = Boolean(car?.featured);
  $("edHidden").checked = Boolean(car?.hidden);
  $("edDelete").hidden = !car;
  $("edErr").textContent = "";
  $("photoMsg").textContent = cloudPhotos() || !LIVE
    ? "Front three-quarter view first (it's the cover), then sides, back, interior, dashboard and engine."
    : "Photos are stored small for now. Front three-quarter view first (it's the cover).";
  renderPhotos();
  dirty = false;
  ed.showModal();
  ed.querySelector(".ed-body").scrollTop = 0;
}
$("addBtn").addEventListener("click", () => openEditor(null));
$("edForm").addEventListener("input", () => { dirty = true; $("edErr").textContent = ""; });
// Brand new → mileage 0
$("edCond").addEventListener("change", () => { if (radio("edCond") === "new" && !$("edKm").value) $("edKm").value = 0; });

function closeEditor() {
  if (busy) return;
  if (dirty && !confirm("Close without saving your changes?")) return;
  ed.close();
}
$("edClose").addEventListener("click", closeEditor);
ed.addEventListener("cancel", (e) => { e.preventDefault(); closeEditor(); });

$("edForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const data = {
    ...(editing || {}),
    make: $("edMake").value,
    year: $("edYear").value,
    model: $("edModel").value,
    price: $("edPrice").value,
    mileage: $("edKm").value,
    condition: radio("edCond"),
    body: $("edBody").value,
    transmission: $("edTrans").value,
    fuel: $("edFuel").value,
    drive: $("edDrive").value,
    engine: $("edEngine").value,
    colour: $("edColour").value,
    features: checkedFeatures(),
    description: $("edDesc").value,
    photos,
    status: radio("edStatus"),
    featured: $("edFeatured").checked,
    hidden: $("edHidden").checked,
  };
  busy = true; $("edSave").disabled = true; $("edSave").textContent = "Saving…";
  try {
    await saveCar(data);
    dirty = false;
    busy = false;
    ed.close();
    toast(editing ? "Saved" : "Car added");
    await reload();
  } catch (err) {
    $("edErr").textContent = err.message || "Couldn't save. Check your internet and try again.";
    $("edErr").scrollIntoView({ block: "nearest" });
  } finally {
    busy = false; $("edSave").disabled = false; $("edSave").textContent = "Save";
  }
});

$("edDelete").addEventListener("click", async () => {
  if (!editing || !confirm(`Delete the ${title(editing)}? This can't be undone. (To keep it but take it off the site, use "Hide" instead.)`)) return;
  try {
    await deleteCar(editing.id);
    dirty = false;
    ed.close();
    toast("Deleted");
    await reload();
  } catch (err) {
    $("edErr").textContent = err.message || "Couldn't delete. Try again.";
  }
});
