// Car dealership · site settings
// ------------------------------------------------------------------
// SAMPLE SITE: the name, address, hours, cars, prices and finance terms below
// are placeholders until the dealership sends its real details.
//
// 1) FIREBASE: paste the web-app config from the Firebase console.
//    While apiKey is empty the site runs in PREVIEW MODE: sample cars, and
//    owner-page changes are saved in that browser only.
//    Backend files (database rules, tests, setup steps) live in ../backend/.
// 2) CLOUDINARY (strongly recommended for cars: up to 10 photos each): free
//    photo hosting. Empty = photos are shrunk and stored inside the car.
// 3) SHOP / FINANCE: contact details, hours and instalment settings.
// ------------------------------------------------------------------

export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const CLOUDINARY = {
  cloudName: "",
  uploadPreset: "", // UNSIGNED preset, limited to a "cars" folder
};

export const SHOP = {
  sample: true, // shows the "sample site" strip; set false once real details are in
  name: "Crestline Motors",
  short: "Crestline",
  // DEMO: Salim's number until the dealership sends theirs.
  whatsapp: "233577428684",
  phoneDisplay: "057 742 8684",
  currency: "GH₵",
  area: "East Legon",
  address: "East Legon, near A&C Mall, Accra",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=A%26C+Mall+East+Legon+Accra",
  hours: [
    ["Monday – Friday", "8:00 am – 6:00 pm"],
    ["Saturday", "9:00 am – 5:00 pm"],
    ["Sunday", "By appointment"],
  ],
  instagram: "", // empty = hidden
  tiktok: "",
  facebook: "",
};

// Instalment estimate shown on each car (no interest: final terms come from the dealer).
export const FINANCE = {
  minDepositPct: 30,
  defaultDepositPct: 40,
  months: [6, 12, 18, 24],
  defaultMonths: 12,
};

export const CONDITIONS = [
  { id: "new", label: "Brand new" },
  { id: "foreign", label: "Foreign used" },
  { id: "ghana", label: "Ghana used" },
];

export const MAKES = ["Toyota", "Lexus", "Mercedes-Benz", "BMW", "Land Rover", "Audi", "Porsche", "Hyundai", "Kia",
  "Honda", "Nissan", "Ford", "Volkswagen", "Mitsubishi", "Other"];
export const BODIES = ["SUV", "Sedan", "Pickup", "Hatchback", "Van", "Coupe"];
export const TRANSMISSIONS = ["Automatic", "Manual"];
export const FUELS = ["Petrol", "Diesel", "Hybrid", "Electric"];
export const DRIVES = ["FWD", "RWD", "AWD", "4WD"];
export const STATUSES = [
  { id: "available", label: "Available" },
  { id: "reserved", label: "Reserved" },
  { id: "sold", label: "Sold" },
];
export const COMMON_FEATURES = ["Leather seats", "Sunroof", "Panoramic roof", "Reverse camera", "360° camera",
  "Push start", "Keyless entry", "Apple CarPlay / Android Auto", "Navigation", "Cruise control", "Third-row seats",
  "Cooled seats", "Premium sound", "Alloy wheels", "Parking sensors", "Power tailgate"];

export const BUDGETS = [
  { id: "u200", label: "Under 200k", min: 0, max: 200000 },
  { id: "200-500", label: "200k – 500k", min: 200000, max: 500000 },
  { id: "500-1m", label: "500k – 1M", min: 500000, max: 1000000 },
  { id: "1m+", label: "Over 1M", min: 1000000, max: Infinity },
];

export const MAX_PHOTOS = 10;

// ---- Testing only: http://localhost…/?emulator=1 talks to the local Firebase emulator ----
const params = new URLSearchParams(location.search);
export const USE_EMULATOR =
  params.has("emulator") && ["localhost", "127.0.0.1"].includes(location.hostname);
if (USE_EMULATOR) {
  Object.assign(FIREBASE_CONFIG, { apiKey: "demo-key", authDomain: "demo-cars.firebaseapp.com", projectId: "demo-cars", appId: "demo" });
}

export const LIVE = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
