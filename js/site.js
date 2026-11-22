// Showroom page: inventory, filters, car pages (dialog), enquiries and test drives on WhatsApp.
import { getCars, money, km, title, cover, conditionLabel, isNew, monthly, warmUp,
  SHOP, FINANCE, CONDITIONS, MAKES, BODIES, LIVE } from "./store.js";
import { BUDGETS } from "./config.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const PAGE = 12;

warmUp();

/* ---------- WhatsApp ---------- */
const waUrl = (text) => `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
const openWa = (text) => window.open(waUrl(text), "_blank", "noopener");
const hello = `Hello ${SHOP.name}!`;
const carLink = (c) => `${location.origin}${location.pathname}?car=${encodeURIComponent(c.id)}`;

/* ---------- Static bits from config ---------- */
$("sampleStrip").hidden = !SHOP.sample;
$("address").textContent = SHOP.address;
$("ftAddr").textContent = SHOP.address;
$("ftPhone").textContent = SHOP.phoneDisplay;
$("mapBtn").href = SHOP.mapUrl;
$("year").textContent = new Date().getFullYear();
for (const [id, text] of [
  ["hdWa", `${hello} I'd like to ask about your cars.`],
  ["waFloat", `${hello} I'd like to ask about your cars.`],
  ["ftWa", `${hello} I'd like to ask about your cars.`],
  ["visitWa", `${hello} I'd like to visit the yard. When is a good time?`],
  ["emptyWa", `${hello} I'm looking for a car you don't have listed. Can you help me find one?`],
]) $(id).href = waUrl(text);
for (const [id, url] of [["ftIg", SHOP.instagram], ["ftTt", SHOP.tiktok], ["ftFb", SHOP.facebook]]) {
  if (url) { $(id).href = url; $(id).hidden = false; }
}
$("payDeposit").textContent = `${FINANCE.minDepositPct}%`;
$("payMonths").textContent = `${Math.max(...FINANCE.months)} months`;

// Opening hours, with today in bold (Accra is on GMT all year)
const dayRow = (() => { const d = new Date().getUTCDay(); return d === 0 ? 2 : d === 6 ? 1 : 0; })();
$("hours").innerHTML = SHOP.hours.map(([d, h], i) =>
  `<tr${i === dayRow ? ' class="today"' : ""}><th scope="row">${esc(d)}</th><td>${esc(h)}</td></tr>`).join("");

// Header border once scrolled
const hd = document.querySelector(".hd");
addEventListener("scroll", () => hd.classList.toggle("scrolled", scrollY > 8), { passive: true });

/* ---------- Filters ---------- */
const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
for (const sel of [$("fCond")]) sel.insertAdjacentHTML("beforeend", CONDITIONS.map((c) => opt(c.id, c.label)).join(""));
for (const sel of [$("fBudget"), $("budget")]) sel.insertAdjacentHTML("beforeend", BUDGETS.map((b) => opt(b.id, b.label)).join(""));
$("body").insertAdjacentHTML("beforeend", BODIES.map((b) => opt(b, b)).join(""));
$("condSeg").innerHTML = [{ id: "", label: "All" }, ...CONDITIONS].map((c) =>
  `<label><input type="radio" name="cond" value="${c.id}"${c.id === "" ? " checked" : ""} /><span>${esc(c.label)}</span></label>`).join("");

const state = { cars: [], cond: "", make: "", body: "", budget: "", q: "", sort: "new", shown: PAGE };

function matches(c, f = state) {
  if (f.cond && c.condition !== f.cond) return false;
  if (f.make && c.make !== f.make) return false;
  if (f.body && c.body !== f.body) return false;
  if (f.budget) {
    const b = BUDGETS.find((x) => x.id === f.budget);
    if (b && !(c.price >= b.min && c.price < b.max)) return false;
  }
  if (f.q) {
    const hay = `${c.year} ${c.make} ${c.model} ${c.body} ${c.colour} ${conditionLabel(c.condition)}`.toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
const sold = (c) => c.status === "sold";
const sorters = {
  // Sold cars always go last; they stay up for a while as proof of sales.
  new: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  plo: (a, b) => a.price - b.price,
  phi: (a, b) => b.price - a.price,
  year: (a, b) => b.year - a.year || b.createdAt - a.createdAt,
  km: (a, b) => a.mileage - b.mileage,
};
const sorted = (list) => [...list].sort((a, b) => (sold(a) - sold(b)) || sorters[state.sort](a, b));

/* ---------- Cards ---------- */
function tagsHtml(c) {
  const t = [];
  if (c.status === "reserved") t.push('<span class="tag tag-res">Reserved</span>');
  if (c.status === "sold") t.push('<span class="tag tag-sold">Sold</span>');
  t.push(`<span class="tag${c.condition === "new" ? " tag-new" : ""}">${esc(conditionLabel(c.condition))}</span>`);
  if (isNew(c) && c.status === "available") t.push('<span class="tag tag-just">Just arrived</span>');
  return t.join("");
}
const metaLine = (c) => [c.condition === "new" ? "0 km" : km(c.mileage), c.transmission, c.fuel].join(" · ");

function cardHtml(c) {
  const n = c.photos.length;
  return `<li class="card reveal${sold(c) ? " is-sold" : ""}">
    <button type="button" class="card-btn" data-open="${esc(c.id)}" aria-label="${esc(title(c))}, ${esc(money(c.price))}">
      <div class="card-img">
        <div class="tags">${tagsHtml(c)}</div>
        <img class="fade" src="${esc(cover(c))}" alt="" loading="lazy" width="1000" height="750" />
        ${n > 1 ? `<span class="photo-count">${n} photos</span>` : ""}
      </div>
      <h3><small>${esc(c.year)} · ${esc(c.body)}</small>${esc(c.make)} ${esc(c.model)}</h3>
      <p class="meta">${esc(metaLine(c))}</p>
      <div class="row">
        <span class="price">${sold(c) ? "Sold" : esc(money(c.price))}</span>
        ${sold(c) ? "" : `<span class="mo">or ${esc(money(monthly(c.price)))}/mo</span>`}
      </div>
    </button>
  </li>`;
}

const io = "IntersectionObserver" in window && !reduceMotion.matches
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px" })
  : null;
function wireCards(root) {
  root.querySelectorAll("img.fade").forEach((img) => {
    if (img.complete && img.naturalWidth) img.classList.add("loaded");
    else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.addEventListener("error", () => img.classList.add("loaded"), { once: true });
  });
  root.querySelectorAll(".card.reveal:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
}

function render() {
  const list = sorted(state.cars.filter((c) => matches(c)));
  const total = list.length;
  $("grid").innerHTML = list.slice(0, state.shown).map(cardHtml).join("");
  wireCards($("grid"));
  const filtered = state.cond || state.make || state.body || state.budget || state.q;
  $("count").textContent = filtered ? `${total} of ${state.cars.length} cars` : `${total} cars`;
  $("empty").hidden = total > 0;
  $("clearAll").hidden = !filtered || total === 0;
  $("moreBtn").hidden = total <= state.shown;
  $("moreBtn").textContent = `Show more cars (${total - state.shown} more)`;
  for (const id of ["make", "body", "budget"]) $(id).classList.toggle("on", Boolean(state[id]));
}

function renderFeatured() {
  const list = state.cars.filter((c) => c.featured && !sold(c));
  $("featured").hidden = list.length === 0;
  $("featTrack").innerHTML = list.map((c) => `<li>
    <button type="button" class="feat-card" data-open="${esc(c.id)}" aria-label="${esc(title(c))}, ${esc(money(c.price))}">
      <div class="feat-img">
        <div class="tags">${tagsHtml(c)}</div>
        <img src="${esc(cover(c))}" alt="" loading="lazy" width="1000" height="750" />
        <div class="feat-cap">
          <h3><small>${esc(c.year)} · ${esc(metaLine(c))}</small>${esc(c.make)} ${esc(c.model)}</h3>
          <span class="price">${esc(money(c.price))}</span>
        </div>
      </div>
    </button></li>`).join("");
  updateFeatNav();
}
const featTrack = $("featTrack");
function updateFeatNav() {
  $("featPrev").disabled = featTrack.scrollLeft < 8;
  $("featNext").disabled = featTrack.scrollLeft + featTrack.clientWidth >= featTrack.scrollWidth - 8;
}
featTrack.addEventListener("scroll", updateFeatNav, { passive: true });
const featStep = () => (featTrack.querySelector("li")?.offsetWidth || 400) + 19;
$("featPrev").addEventListener("click", () => featTrack.scrollBy({ left: -featStep(), behavior: reduceMotion.matches ? "auto" : "smooth" }));
$("featNext").addEventListener("click", () => featTrack.scrollBy({ left: featStep(), behavior: reduceMotion.matches ? "auto" : "smooth" }));

/* ---------- Filter events ---------- */
function setFilter(patch) {
  Object.assign(state, patch, { shown: PAGE });
  $("make").value = state.make; $("body").value = state.body; $("budget").value = state.budget;
  $("sort").value = state.sort; $("q").value = state.q;
  document.querySelector(`#condSeg input[value="${state.cond}"]`).checked = true;
  render();
}
$("condSeg").addEventListener("change", (e) => setFilter({ cond: e.target.value }));
for (const id of ["make", "body", "budget", "sort"]) $(id).addEventListener("change", (e) => setFilter({ [id]: e.target.value }));
let qTimer;
$("q").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => setFilter({ q: e.target.value.trim() }), 150); });
$("moreBtn").addEventListener("click", () => { state.shown += PAGE; render(); });
const clearAll = () => setFilter({ cond: "", make: "", body: "", budget: "", q: "" });
$("clearFilters").addEventListener("click", clearAll);
$("clearAll").addEventListener("click", clearAll);

// Hero finder
const finderFilter = () => ({ cond: $("fCond").value, make: $("fMake").value, budget: $("fBudget").value });
function updateFinder() {
  const n = state.cars.filter((c) => matches(c, { ...finderFilter(), body: "", q: "" })).length;
  $("fGoLabel").textContent = `Show ${n} car${n === 1 ? "" : "s"}`;
}
for (const id of ["fCond", "fMake", "fBudget"]) $(id).addEventListener("change", updateFinder);
$("finder").addEventListener("submit", (e) => {
  e.preventDefault();
  setFilter({ ...finderFilter(), body: "", q: "" });
  $("inventory").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
});

/* ---------- Car dialog ---------- */
const dlg = $("carDlg");
const track = $("cdTrack");
let current = null;

function specRows(c) {
  return [
    ["Year", c.year], ["Mileage", c.condition === "new" ? "0 km (new)" : km(c.mileage)],
    ["Transmission", c.transmission], ["Fuel", c.fuel], ["Engine", c.engine], ["Drive", c.drive],
    ["Body", c.body], ["Colour", c.colour],
  ].filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
}

function fillDialog(c) {
  current = c;
  const photos = c.photos;
  track.innerHTML = photos.map((p, i) => `<img src="${esc(p)}" alt="${esc(title(c))}, photo ${i + 1} of ${photos.length}" ${i ? 'loading="lazy"' : ""} />`).join("");
  track.scrollLeft = 0;
  $("cdThumbs").innerHTML = photos.length > 1 ? photos.map((p, i) =>
    `<button type="button" data-i="${i}" aria-label="Photo ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}><img src="${esc(p)}" alt="" loading="lazy" /></button>`).join("") : "";
  $("cdThumbs").hidden = photos.length < 2;
  $("cdPrev").hidden = $("cdNext").hidden = photos.length < 2;
  updateCounter();

  $("cdTags").innerHTML = tagsHtml(c);
  $("cdTitle").textContent = title(c);
  $("cdPrice").textContent = sold(c) ? "Sold" : money(c.price);
  $("cdMonthly").textContent = sold(c) ? "" : `or about ${money(monthly(c.price))}/month on instalments`;
  $("cdSpecs").innerHTML = specRows(c);
  $("cdFeat").innerHTML = (c.features || []).map((f) => `<li>${esc(f)}</li>`).join("");
  $("cdFeatWrap").hidden = !(c.features || []).length;
  $("cdDesc").textContent = c.description || "";
  $("cdDesc").hidden = !c.description;

  const st = $("cdState");
  st.hidden = c.status === "available";
  st.className = `cd-state${sold(c) ? " sold" : ""}`;
  st.textContent = c.status === "reserved"
    ? "Reserved: a buyer has put down a deposit. Ask us and we'll tell you if it becomes available, or show you something similar."
    : "This car has been sold. Tell us what you're looking for and we'll find you a similar one.";
  $("cdPay").hidden = sold(c);
  $("cdDriveBtn").hidden = sold(c);
  $("cdEnquireLabel").textContent = sold(c) ? "Ask about similar cars" : c.status === "reserved" ? "Ask about this car" : "Enquire on WhatsApp";

  // payment
  document.querySelector('#cdPay input[value="Cash"]').checked = true;
  showPayPanel();
  $("dep").min = FINANCE.minDepositPct; $("dep").max = 80; $("dep").value = FINANCE.defaultDepositPct;
  $("months").innerHTML = FINANCE.months.map((m) => `<option value="${m}"${m === FINANCE.defaultMonths ? " selected" : ""}>${m} months</option>`).join("");
  updateCalc();

  // test drive form
  $("cdDrive").hidden = true;
  $("cdDriveBtn").setAttribute("aria-expanded", "false");
  $("tdErr").textContent = "";
  $("cdShareLabel").textContent = "Share";
  $("cdDrive").closest(".cd-body").scrollTop = 0;
  dlg.querySelector(".cd").scrollTop = 0;
  dlg.scrollTop = 0;
}

function updateCounter() {
  const n = current?.photos.length || 0;
  const i = Math.round(track.scrollLeft / (track.clientWidth || 1));
  $("cdCounter").textContent = n > 1 ? `${Math.min(i, n - 1) + 1} / ${n}` : "";
  $("cdCounter").hidden = n < 2;
  $("cdThumbs").querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
  $("cdPrev").disabled = i <= 0;
  $("cdNext").disabled = i >= n - 1;
}
let cTimer;
track.addEventListener("scroll", () => { cancelAnimationFrame(cTimer); cTimer = requestAnimationFrame(updateCounter); }, { passive: true });
const goPhoto = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion.matches ? "auto" : "smooth" });
const photoIndex = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
$("cdPrev").addEventListener("click", () => goPhoto(photoIndex() - 1));
$("cdNext").addEventListener("click", () => goPhoto(photoIndex() + 1));
$("cdThumbs").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) goPhoto(Number(b.dataset.i)); });
track.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); goPhoto(photoIndex() + 1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goPhoto(photoIndex() - 1); }
});

// Payment choice
const payChoice = () => document.querySelector('#cdPay input[name="pay"]:checked').value;
function showPayPanel() {
  const v = payChoice();
  $("pCash").hidden = v !== "Cash"; $("pInst").hidden = v !== "Instalments"; $("pHire").hidden = v !== "Hire purchase";
}
function updateCalc() {
  if (!current) return;
  const dep = Number($("dep").value), m = Number($("months").value);
  $("depOut").textContent = `${dep}%`;
  $("depAmt").textContent = money(Math.round(current.price * dep / 100));
  $("moAmt").textContent = money(monthly(current.price, dep, m));
}
$("cdPay").addEventListener("change", (e) => { if (e.target.name === "pay") showPayPanel(); updateCalc(); });
$("dep").addEventListener("input", updateCalc);

function payLine() {
  const v = payChoice();
  if (v !== "Instalments") return `*Payment:* ${v}`;
  const dep = Number($("dep").value), m = Number($("months").value);
  return `*Payment:* Instalments, ${dep}% deposit (${money(Math.round(current.price * dep / 100))}) over ${m} months (about ${money(monthly(current.price, dep, m))}/month)`;
}
function carLines(c) {
  return [`*${title(c)}*`, `${conditionLabel(c.condition)} · ${c.condition === "new" ? "0 km" : km(c.mileage)} · ${c.transmission}`,
    `Price: ${money(c.price)}`, carLink(c)];
}

$("cdEnquire").addEventListener("click", () => {
  const c = current;
  const lines = sold(c)
    ? [hello, "", `I saw that this car is sold. Do you have something similar?`, "", ...carLines(c)]
    : [hello, "", "I'm interested in this car:", "", ...carLines(c), "", payLine(), "",
       c.status === "reserved" ? "I see it's reserved. Please let me know if it becomes available." : "Is it still available?"];
  openWa(lines.join("\n"));
});

// Test drive
const todayAccra = new Date().toISOString().slice(0, 10); // Accra = UTC
$("tdDate").min = todayAccra;
$("cdDriveBtn").addEventListener("click", () => {
  const open = $("cdDrive").hidden;
  $("cdDrive").hidden = !open;
  $("cdDriveBtn").setAttribute("aria-expanded", String(open));
  if (open) {
    $("cdDrive").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest" });
    setTimeout(() => $("tdName").focus({ preventScroll: true }), 250);
  }
});
$("cdDrive").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("tdName").value.trim(), date = $("tdDate").value, time = $("tdTime").value;
  const err = !name ? "Please write your name." : !date ? "Please pick a day." : date < todayAccra ? "Please pick today or a later day."
    : !time ? "Please pick a time." : "";
  $("tdErr").textContent = err;
  if (err) return;
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  openWa([hello, "", "I'd like to book a test drive:", "", ...carLines(current), "",
    `*Day:* ${day}`, `*Time:* ${time}`, `*Name:* ${name}`, "", "Please confirm if this works. Thank you!"].join("\n"));
});
$("cdDrive").addEventListener("input", () => { $("tdErr").textContent = ""; });

// Share
$("cdShare").addEventListener("click", async () => {
  const url = carLink(current), text = `${title(current)} · ${money(current.price)}`;
  if (navigator.share) {
    try { await navigator.share({ title: text, text, url }); } catch {}
    return;
  }
  try { await navigator.clipboard.writeText(url); $("cdShareLabel").textContent = "Link copied"; }
  catch { prompt("Copy this link:", url); }
});

// Open / close, with the browser Back button closing the car page
function openCar(id, { push = true } = {}) {
  const c = state.cars.find((x) => x.id === id);
  if (!c) return false;
  fillDialog(c);
  if (!dlg.open) dlg.showModal();
  document.body.classList.add("dlg-open");
  if (push) history.pushState({ car: id }, "", `?car=${encodeURIComponent(id)}`);
  requestAnimationFrame(() => { track.scrollLeft = 0; updateCounter(); });
  return true;
}
function closeCar({ pop = false } = {}) {
  if (dlg.open) dlg.close();
  document.body.classList.remove("dlg-open");
  if (!pop && history.state?.car) history.back();
  else if (!pop && new URLSearchParams(location.search).has("car")) history.replaceState(null, "", location.pathname);
}
dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeCar(); });
$("cdClose").addEventListener("click", () => closeCar());
dlg.addEventListener("click", (e) => { if (e.target === dlg) closeCar(); }); // click on the dark backdrop
addEventListener("popstate", () => {
  const id = new URLSearchParams(location.search).get("car");
  if (id) openCar(id, { push: false }); else closeCar({ pop: true });
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (b) openCar(b.dataset.open);
});
addEventListener("resize", () => { if (dlg.open) goPhoto(photoIndex()); });

/* ---------- Load ---------- */
(async () => {
  try {
    state.cars = await getCars();
  } catch (e) {
    console.warn(e);
    $("grid").innerHTML = `<li class="empty"><p>The cars didn't load. Check your internet and refresh the page.</p></li>`;
    return;
  }
  const makes = MAKES.filter((m) => state.cars.some((c) => c.make === m));
  for (const sel of [$("fMake"), $("make")]) sel.insertAdjacentHTML("beforeend", makes.map((m) => opt(m, m)).join(""));
  $("statCount").textContent = state.cars.filter((c) => !sold(c)).length;
  render();
  renderFeatured();
  updateFinder();
  const id = new URLSearchParams(location.search).get("car");
  if (id && !openCar(id, { push: false })) history.replaceState(null, "", location.pathname);
})();
