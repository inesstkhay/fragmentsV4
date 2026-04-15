
/***************************************************
 fragments — script.js
 ***************************************************/
/* ==================================================
   0) CONFIGURATION GÉNÉRALE
================================================== */
/* ==================================================
   0.1) Territoires / vues initiales
================================================== */


const montreuilView = [48.8710, 2.4330];
const montreuilZoom = 15;

const toulouseView = [43.5675824, 1.4000176];
const toulouseZoom = 15;


/* ==================================================
  0.2) Paramètres du moteur agencements / patterns
================================================== */

let PERIMETER_DIAMETER_M = 100;
let AG_SIM_THRESHOLD = 0.55;

let MIN_AG_FRAGMENTS = 2;
let ALLOW_SINGLE_FRAGMENT_WITH_BUILDINGS = true;
let MIN_BUILDINGS_FOR_SINGLE_FRAGMENT = 1;
let MAX_AG_OVERLAP = 0.05;
let MIN_PATTERN_OCCURRENCES = 2;


/* ==================================================
0.3)  Paramètres fuzzy hérités
================================================== */

let SIM_THRESHOLD = 0.75;
let COMP_THRESHOLD = 0.60;

let MIN_COMMON_NON_NULL = 3;
let MAX_NULL_MISMATCH_RATIO = 0.20;

/* ==================================================
   0.4) OULEURS POUR LES FONCTIONS DE BÂTIMENTS
================================================== */

const BUILDING_FUNCTION_COLORS = {
  logement: 'rgba(255, 255, 255, 0.80)',
  commerce: 'rgba(255, 182, 182, 0.35)',
  équipement: 'rgba(183, 251, 208, 0.35)',
  associatif: 'rgba(141, 181, 250, 0.35)',
  santé: 'rgba(237, 250, 141, 0.35)',
  culte: 'rgba(235, 141, 250, 0.35)',
  parking: 'rgba(73, 73, 73, 0.42)',
  industriel: 'rgba(255, 190, 130, 0.35)',
  scolaire: 'rgba(230,200,255,0.35)',
  autre: 'rgba(210,210,210,0.28)',
  mixte: 'rgba(210,210,210,0.28)'
};


/* ==================================================
   0.4 bis) CLES FUZZY ET TEXTUELLES
================================================== */

const ALL_FUZZY_KEYS = [
  // Pratiques actives
  "PA_P1_intensitesoin",
  "PA_P1_frequencegestes",
  "PA_P1_degrecooperation",

  "PA_P2_degretransformation",
  "PA_P2_perrenite",
  "PA_P2_autonomie",

  "PA_P3_intensiteusage",
  "PA_P3_frequenceusage",
  "PA_P3_diversitepublic",
  "PA_P3_conflitusage",

  // Dynamiques hybrides
  "DH_P1_degreinformalite",
  "DH_P1_echellepratique",
  "DH_P1_degremutualisation",

  "DH_P2_degreorganisation",
  "DH_P2_porteepolitique",
  "DH_P2_effetspatial",

  "DH_P3_attachement",
  "DH_P4_intensiteflux",

  // Forces structurantes
  "FS_P1_presenceinstitutionnelle",
  "FS_P1_intensitecontrole",
  "FS_P2_abandon",
  "FS_P3_pressionfonciere"
];

const TEXT_KEYS = [
  "usages",
  "acteur_actif",
  "initiateur",
  "elements_spatiaux"
];

const ALL_CRITERIA_KEYS = [
  ...ALL_FUZZY_KEYS,
  ...TEXT_KEYS
];


const FUZZY_GROUPS = {
  PA: [
    "PA_P1_intensitesoin",
    "PA_P1_frequencegestes",
    "PA_P1_degrecooperation",
    "PA_P2_degretransformation",
    "PA_P2_perrenite",
    "PA_P2_autonomie",
    "PA_P3_intensiteusage",
    "PA_P3_frequenceusage",
    "PA_P3_diversitepublic",
    "PA_P3_conflitusage"
  ],
  DH: [
    "DH_P1_degreinformalite",
    "DH_P1_echellepratique",
    "DH_P1_degremutualisation",
    "DH_P2_degreorganisation",
    "DH_P2_porteepolitique",
    "DH_P2_effetspatial",
    "DH_P3_attachement",
    "DH_P4_intensiteflux"
  ],
  FS: [
    "FS_P1_presenceinstitutionnelle",
    "FS_P1_intensitecontrole",
    "FS_P2_abandon",
    "FS_P3_pressionfonciere"
  ]
};


/* ==================================================
   0.4 bis) SATURATION ET LUMINOSITÉ DES COULEURS DE PATTERNS
================================================== */

const SAT_SEQ = [95, 85, 90, 80];
const LIT_SEQ = [58, 70, 50, 64];


/* ==================================================
   0.5) Paramètres des occurrences / doublons
================================================== */

// interdit qu'une occurrence soit presque au même endroit que la graine
let MIN_OCCURRENCE_DISTANCE_FACTOR = 1.5;

// interdit qu'une occurrence reprenne exactement les mêmes fragments
let REJECT_EXACT_SAME_FRAGMENT_SET = true;

// interdit aussi les recouvrements trop forts en fragments
let MAX_FRAGMENT_OVERLAP_WITH_SEED = 0.5;
let MAX_OCCURRENCE_OVERLAP_BETWEEN_CANDIDATES = 0.75;
let MIN_DISTINCT_OCCURRENCE_SIMILARITY = 0.88;

/* ==================================================
   0.6) Paramètres temporalités
================================================== */

let TEMPORAL_STATUS_PENALTY = 0.60;
let TEMPORAL_APP_DIS_STRICT = true;
let TEMPORAL_MIN_MATCH_SCORE = 0.05;

/* ==================================================
   0.7) Clés localStorage
================================================== */

const SAVED_AGENCEMENTS_KEY = 'savedManualAgencementsV1';
const AUTO_AGENCEMENT_NAMES_KEY = 'autoAgencementNamesV1';
const SAVED_PATTERNS_KEY = 'savedPatternsV2';

/* ==================================================
   0.8) Critères actifs et couleurs des patterns
================================================== */

let ACTIVE_CRITERIA_KEYS = new Set(ALL_CRITERIA_KEYS);

const PATTERN_COLORS = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => {
    const hue = Math.round((i * 137.508) % 360);
    const sat = SAT_SEQ[i % SAT_SEQ.length];
    const lit = LIT_SEQ[(Math.floor(i / 4)) % LIT_SEQ.length];
    return [`P${i + 1}`, `hsl(${hue}, ${sat}%, ${lit}%)`];
  })
);



/* ==================================================
   1) ÉTAT GLOBAL DE L’APPLICATION
================================================== */

/* ==================================================
   1.1) Navigation / vue active
================================================== */


let currentView = 'map';
let currentLocation = 'montreuil';

let currentFragmentSub = 'map';
let currentUnitSub = 'map';

let currentPatternMode = 'agencements'; // agencements | patterns
let currentPatternView = 'map';         // map | proxemic | gallery

let currentComparisonLeft = '';
let currentComparisonRight = '';

let SHOW_DIFFRACTIONS = false;

/* ==================================================
   1.2) Données chargées / calculées
================================================== */

let agencements = [];
let fragmentToPatternIds = new Map();
let agencementsById = new Map();

let patterns = {};
let combinedFeatures = [];

let allLayers = [];
let dataGeojson = [];
let datamGeojson = [];

let batimentsMontreuilGeojson = [];
let batimentsToulouseGeojson = [];

let discoursGeojson = [];

let SHOW_DISCOURSES = true;

/* ==================================================
   1.3) Index Discours
================================================== */

let discourseById = new Map();
let discourseByFragmentId = new Map();
let discourseByBuildingId = new Map();

/* ==================================================
   1.4) Index Temporalités
================================================== */


let dataGeojsonT1 = [];
let dataGeojsonT2 = [];
let datamGeojsonT1 = [];
let datamGeojsonT2 = [];

let currentFragmentTimeMode = 'T1';
let currentPatternGalleryTimeMode = 'T1';

let fragmentLayersGroup = null;

let temporalFragmentIndex = {
  montreuil: new Map(),
  mirail: new Map()
};


/* ==================================================
   1.5) Bâtiments
================================================== */

let BUILDINGS_STYLE_MODE = 'etat';

let batimentsLayerMontreuil = null;
let batimentsLayerToulouse = null;
let patternBuildingsLayer = null;
let unitBuildingsLayer = null;


/* ==================================================
   1.6) Unité de projet (plus a jour)
================================================== */

let unitCreation = {
  active: false,
  mode: null,
  ringsVisible: true,
  mouseMoveHandler: null
};

let unitMap = null;
let unitLayerGroup = null;
let unitContextGroup = null;
let unitPatternGroup = null;
let unitContext = null;

/* ==================================================
   1.7) Cartes patterns / couches
================================================== */

let discoursLayer = null;

let patternMap = null;
let patternBaseLayer = null;        // fragments gris
let patternOverlayGroup = null;     // anneaux colorés
let patternPanes = new Map();       // pane par anneau

let patternMembersLayer = null;     // fragments + bâtiments colorés par pattern
let savedAgencementsLayer = null;

/* ==================================================
   1.8) Agencement manuel / caches
================================================== */


let __imgObserver = null;

/*ETAT GLOBAL NV AGENCEMENTS / PATTERNS*/

let agencementCreation = {
  active: false,
  mode: null, // 'map' | 'proxemic'
  selectedFragments: new Map(), // id -> feature
  selectedBuildings: new Map(), // id -> feature
  sourceAgencement: null
};

let allFragmentsByIdCache = null;
let allBuildingsByIdCache = null;

let temporalPairsCache = {
  montreuil: null,
  mirail: null
};

let hydratedSavedAgencementsCache = null;
let hydratedSavedAgencementsCacheKey = '';

let ACTIVE_CRITERIA_CACHE_KEY = Array.from(ALL_CRITERIA_KEYS).sort().join('|');
let lastPatternComputeKey = '';


/* ==================================================
   2) RÉFÉRENCES DOM GLOBALES ET CARTE PRINCIPALE
================================================== */

/* ==================================================
   2.1 Références DOM fréquentes
================================================== */

const proxemicView = document.getElementById('proxemic-view');
const fragmentProxemicView = document.getElementById('fragment-proxemic-view');
const subnavPlaceholderLevel3 = document.getElementById('subnav-placeholder-level3');

/* ==================================================
   2.2 Carte principale — initialisation
================================================== */


let map = L.map('map').setView(montreuilView, montreuilZoom);
/* layer fragment pour la temporalité */
fragmentLayersGroup = L.layerGroup().addTo(map);

map.createPane('pane-discours');
map.getPane('pane-discours').style.zIndex = 650;

map.createPane('pane-batiments');
map.getPane('pane-batiments').style.zIndex = 340;

map.createPane('pane-fragments-polygons');
map.getPane('pane-fragments-polygons').style.zIndex = 350;

map.createPane('pane-fragments-points');
map.getPane('pane-fragments-points').style.zIndex = 500;

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors, © CartoDB'
}).addTo(map);


/* ==================================================
  3) HELPERS 
   Petites fonctions utilitaires réutilisées partout.
   Elles ne pilotent pas l’interface directement :
   elles transforment, calculent ou normalisent
================================================== */

/* ==================================================
   3.1) HELPERS — Texte, formatage, identifiants
================================================== */

function normStr(v) {
  return String(v ?? '').trim().toLowerCase();
}

function normalizeToken(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[’']/g, "'")
    .replace(/^\-+|\-+$/g, '');
}

function parseMultiText(v) {
  if (v === "-" || v === "" || v === null || v === undefined) return null;

  const banned = new Set([
    "aucun", "aucune", "none", "na", "n/a", "null",
    "-", "--", "---",
    "vide", "inconnu",
    "non renseigne", "non renseigné",
    "sans objet"
  ]);

  const raw = String(v)
    .split(/[;,]/)
    .map(s => normalizeToken(s))
    .filter(tok => tok && /[a-z0-9]/i.test(tok));

  if (!raw.length) return null;

  const cleaned = raw.filter(tok => !banned.has(tok));

  return cleaned.length ? cleaned : null;
}

function prettyKey(k) {
  return String(k).replace(/_/g, " ");
}

function fmtFuzzy(v) {
  return (v === null || v === undefined) ? "—" : Number(v).toFixed(2);
}

function fmtAny(v) {
  if (v === null || v === undefined) return "—";

  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    const short = v.slice(0, 4).join(", ");
    return (v.length > 4) ? (short + "…") : short;
  }

  return fmtFuzzy(v);
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

function fmtDate(iso){
  try { const d = new Date(iso); return d.toLocaleString(); } catch(e){ return iso || ''; }
}

function cleanFragmentId(id) {
  return String(id || '').trim().toUpperCase();
}


/* ==================================================
   3.2) HELPERS — Tableaux, comptages, parsing simple
================================================== */


function uniqClean(arr = []) {
  return Array.from(
    new Set(
      (arr || [])
        .map(v => String(v || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function countLabels(arr = []) {
  const out = {};
  (arr || []).forEach(v => {
    const key = String(v || '').trim();
    if (!key) return;
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function entriesSortedByCount(obj = {}) {
  return Object.entries(obj)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
}

function intersectArrays(arrays = []) {
  const clean = arrays
    .map(arr => uniqClean(arr))
    .filter(arr => arr.length);

  if (!clean.length) return [];

  let inter = new Set(clean[0]);
  for (let i = 1; i < clean.length; i++) {
    const cur = new Set(clean[i]);
    inter = new Set([...inter].filter(x => cur.has(x)));
  }

  return [...inter].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function parseGeojsonList(str) {
  const out = [];
  if (str && typeof str === "string") {
    str.split(/[;,]/).forEach(x => {
      const t = x.trim();
      if (t && t !== "-") out.push(t);
    });
  }
  return out;
}

function parseAssociatedIds(str) {
  if (!str || str === '-') return [];

  return String(str)
    .split(/[;,]/)
    .map(s => String(s || '').trim().toUpperCase())
    .filter(Boolean);
}

function addToMapArray(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function getTokenArrayFromSource(obj, key) {
  const raw = obj?.[key];

  if (Array.isArray(raw)) {
    return raw.map(normalizeToken).filter(Boolean);
  }

  return parseMultiText(raw) || [];
}

function diffTokenArrays(arrA = [], arrB = []) {
  const A = new Set(arrA || []);
  const B = new Set(arrB || []);

  const common = [];
  const onlyA = [];
  const onlyB = [];

  A.forEach(x => {
    if (B.has(x)) common.push(x);
    else onlyA.push(x);
  });

  B.forEach(x => {
    if (!A.has(x)) onlyB.push(x);
  });

  common.sort();
  onlyA.sort();
  onlyB.sort();

  return { common, onlyA, onlyB };
}

function fuzzyValuesEqual(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.0001;
}

function getCommonIdSet(idsA = [], idsB = []) {
  const B = new Set((idsB || []).map(x => String(x).trim()));
  return new Set((idsA || []).map(x => String(x).trim()).filter(x => B.has(x)));
}


/* ==================================================
   3.3) HELPERS — Parsing fuzzy et similarités élémentaires
================================================== */

function parseFuzzy(v) {
  if (v === null || v === undefined) return null;

  const s = String(v).trim().replace(',', '.').toLowerCase();

  if (
    s === '' ||
    s === '-' ||
    s === 'null' ||
    s === 'nan' ||
    s === 'undefined'
  ) {
    return null;
  }

  // accepte uniquement un vrai nombre entier ou décimal
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(s)) {
    return null;
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

function jaccardSimilarity(listA, listB) {
  const A = new Set(listA || []);
  const B = new Set(listB || []);
  if (!A.size && !B.size) return 0;

  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter++;
  }

  const uni = A.size + B.size - inter;
  return uni ? (inter / uni) : 0;
}

function average(nums) {
  const vals = (nums || []).filter(v => Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function featureToVector(feature) {
  if (!feature) return [];

  if (
    feature.__vectorCache &&
    feature.__vectorCacheKey === ACTIVE_CRITERIA_CACHE_KEY
  ) {
    return feature.__vectorCache;
  }

  const props = feature.properties || {};

  const vec = ALL_CRITERIA_KEYS.map(k => {
    if (!ACTIVE_CRITERIA_KEYS.has(k)) return null;

    if (TEXT_KEYS.includes(k)) {
      return parseMultiText(props[k]);
    }

    return parseFuzzy(props[k]);
  });

  feature.__vectorCache = vec;
  feature.__vectorCacheKey = ACTIVE_CRITERIA_CACHE_KEY;

  return vec;
}

function similarityFuzzy(vec1, vec2) {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < vec1.length; i++) {
    const a = vec1[i];
    const b = vec2[i];

    if (a === null && b === null) continue;

    let dist;

    if (a === null || b === null) {
      dist = 1;
    } else if (Array.isArray(a) && Array.isArray(b)) {
      const sim = jaccardSimilarity(a, b);
      dist = 1 - sim;
    } else {
      dist = Math.abs(a - b);
    }

    sum += dist;
    count++;
  }

  if (count === 0) return 0;
  return 1 - (sum / count);
}


function topVectorDifferences(vecA, vecB, { topN = 3 } = {}) {
  const diffs = [];

  for (let i = 0; i < ALL_CRITERIA_KEYS.length; i++) {
    const k = ALL_CRITERIA_KEYS[i];
    const a = vecA[i];
    const b = vecB[i];

    if (a === null && b === null) continue;

    if (a === null || b === null) {
      diffs.push({
        key: k,
        a,
        b,
        diff: 1,
        kind: "mismatch"
      });
      continue;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const sim = jaccardSimilarity(a, b);
      const d = 1 - sim;
      diffs.push({
        key: k,
        a,
        b,
        diff: d,
        kind: "text"
      });
      continue;
    }

    const d = Math.abs(a - b);
    diffs.push({
      key: k,
      a,
      b,
      diff: d,
      kind: "common"
    });
  }

  diffs.sort((x, y) => {
    if (y.diff !== x.diff) return y.diff - x.diff;

    if (x.kind !== y.kind) {
      if (x.kind === "mismatch") return -1;
      if (y.kind === "mismatch") return 1;
    }

    return x.key.localeCompare(y.key);
  });

  return diffs.slice(0, Math.max(1, topN));
}

function averageActiveFuzzyForFeature(feature, keys = []) {
  const vals = (keys || [])
    .filter(k => ACTIVE_CRITERIA_KEYS.has(k))
    .map(k => parseFuzzy(feature?.properties?.[k]))
    .filter(v => v !== null && Number.isFinite(v));

  return vals.length ? average(vals) : null;
}


/* ==================================================
   3.4) HELPERS — Géométrie de base
================================================== */

function centroidFromCoordList(coordList) {
  if (!Array.isArray(coordList) || coordList.length === 0) return null;

  let sumLng = 0;
  let sumLat = 0;
  let n = 0;

  for (const pt of coordList) {
    if (!pt || pt.length < 2) continue;

    const lng = Number(pt[0]);
    const lat = Number(pt[1]);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

    sumLng += lng;
    sumLat += lat;
    n++;
  }

  if (!n) return null;
  return L.latLng(sumLat / n, sumLng / n);
}

function getFeatureCenterLatLng(feature) {
  if (!feature) return null;
  if (feature.__centerLatLng) return feature.__centerLatLng;

  const geom = feature.geometry;
  if (!geom) return null;

  const t = geom.type;
  const c = geom.coordinates;

  if (t === "Point") {
    const ll = L.latLng(c[1], c[0]);
    feature.__centerLatLng = ll;
    return ll;
  }

  if (t === "MultiPoint") {
    const ll = centroidFromCoordList(c);
    feature.__centerLatLng = ll;
    return ll;
  }

  if (t === "LineString") {
    const ll = centroidFromCoordList(c);
    feature.__centerLatLng = ll;
    return ll;
  }

  if (t === "MultiLineString") {
    const flat = c.flat(1);
    const ll = centroidFromCoordList(flat);
    feature.__centerLatLng = ll;
    return ll;
  }

  if (t === "Polygon") {
    const ring = Array.isArray(c[0]) ? c[0] : [];
    const ll = centroidFromCoordList(ring);
    feature.__centerLatLng = ll;
    return ll;
  }

  if (t === "MultiPolygon") {
    const flat = [];
    for (const poly of c) {
      const ring = Array.isArray(poly?.[0]) ? poly[0] : [];
      for (const pt of ring) flat.push(pt);
    }
    const ll = centroidFromCoordList(flat);
    feature.__centerLatLng = ll;
    return ll;
  }

  return null;
}


function distanceMeters(a, b) {
  if (!a || !b) return Infinity;

  try {
    if (map && typeof map.distance === "function") {
      return map.distance(a, b);
    }
  } catch (e) {}

  const R = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}


function getGeometryType(feature) {
  return feature?.geometry?.type || '';
}

function isPointGeometry(feature) {
  const t = getGeometryType(feature);
  return t === 'Point' || t === 'MultiPoint';
}

function isPolygonGeometry(feature) {
  const t = getGeometryType(feature);
  return t === 'Polygon' || t === 'MultiPolygon';
}

function isLineGeometry(feature) {
  const t = getGeometryType(feature);
  return t === 'LineString' || t === 'MultiLineString';
}

function approximateFeatureArea(feature) {
  if (!feature) return 0;

  try {
    const layer = L.geoJSON(feature);
    const bounds = layer.getBounds?.();
    if (!bounds || !bounds.isValid()) return 0;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const width = Math.abs(ne.lng - sw.lng);
    const height = Math.abs(ne.lat - sw.lat);

    return width * height;
  } catch (e) {
    return 0;
  }
}

function sortFeaturesForClickPriority(features = []) {
  const arr = [...features];

  arr.sort((a, b) => {
    const aPoint = isPointGeometry(a);
    const bPoint = isPointGeometry(b);

    if (aPoint && !bPoint) return 1;
    if (!aPoint && bPoint) return -1;

    const aPoly = isPolygonGeometry(a);
    const bPoly = isPolygonGeometry(b);

    if (aPoly && bPoly) {
      return approximateFeatureArea(b) - approximateFeatureArea(a);
    }

    return 0;
  });

  return arr;
}

function latLngAverage(latlngs) {
  const pts = (latlngs || []).filter(Boolean);
  if (!pts.length) return null;

  let sumLat = 0;
  let sumLng = 0;

  pts.forEach(ll => {
    sumLat += ll.lat;
    sumLng += ll.lng;
  });

  return L.latLng(sumLat / pts.length, sumLng / pts.length);
}

/* ==================================================
   3.5) HELPERS — Images
================================================== */


function cleanPhotoUrl(u) {
  if (!u) return null;

  let s = String(u).trim().replace(/^http:\/\//i, 'https://');
  const m = s.match(/https?:\/\/[^\s"'<>]+/i);

  return m ? m[0] : null;
}

function normalizePhotos(p) {
  if (!p) return [];
  if (Array.isArray(p)) return p;

  if (typeof p === 'string') {
    return p.split(/[;,]\s*/).filter(Boolean);
  }

  return [];
}

function makeImg(src, alt = 'photo', { priority = 'low', lazy = true } = {}) {
  const url = cleanPhotoUrl(src);
  if (!url) return null;

  const img = document.createElement('img');
  img.alt = alt;
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => {
    img.style.display = 'none';
  };

  img.setAttribute('fetchpriority', priority);
  img.fetchPriority = priority;

  if (lazy) img.loading = 'lazy';

  if (lazy && 'IntersectionObserver' in window) {
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    img.dataset.src = url;
    ensureImgObserver().observe(img);
  } else {
    img.src = url;
  }

  return img;
}

function ensureImgObserver() {
  if (__imgObserver) return __imgObserver;

  __imgObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = entry.target;
      const real = img.dataset.src;

      if (real) {
        img.src = real;
        img.removeAttribute('data-src');
      }

      obs.unobserve(img);
    });
  }, {
    rootMargin: '800px 0px',
    threshold: 0.01
  });

  return __imgObserver;
}

/* ==================================================
   3.6) HELPERS — Temporalités
================================================== */


function getSiteColor(zone) {
  return zone === 'mirail' ? 'blue' : 'red';
}

function getTemporalDatasetsForCurrentMode() {
  if (currentFragmentTimeMode === 'T2') {
    return {
      montreuil: dataGeojsonT2,
      mirail: datamGeojsonT2
    };
  }

  return {
    montreuil: dataGeojsonT1,
    mirail: datamGeojsonT1
  };
}

function getCurrentFragmentDatasets() {
  return getTemporalDatasetsForCurrentMode();
}

function buildTemporalPairsForZone(zone) {
  if (temporalPairsCache[zone]) return temporalPairsCache[zone];

  const t1 = zone === 'montreuil' ? (dataGeojsonT1 || []) : (datamGeojsonT1 || []);
  const t2 = zone === 'montreuil' ? (dataGeojsonT2 || []) : (datamGeojsonT2 || []);

  const map1 = new Map(t1.map(f => [cleanFragmentId(f.properties?.id), f]));
  const map2 = new Map(t2.map(f => [cleanFragmentId(f.properties?.id), f]));

  const ids = new Set([...map1.keys(), ...map2.keys()]);
  const out = [];

  ids.forEach(id => {
    const f1 = map1.get(id) || null;
    const f2 = map2.get(id) || null;

    let status = 'identical';
    if (!f1 && f2) status = 'appeared';
    else if (f1 && !f2) status = 'disappeared';
    else if (f1 && f2) {
      const changed = hasFragmentChangedBetweenT1T2(f1, f2);
      status = changed ? 'modified' : 'identical';
    }

    out.push({ id, zone, t1: f1, t2: f2, status });
  });

  temporalPairsCache[zone] = out;
  return out;
}

function hasFragmentChangedBetweenT1T2(f1, f2) {
  if (!f1 || !f2) return true;

  const p1 = f1.properties || {};
  const p2 = f2.properties || {};

  const keysToCompare = [
    'name',
    'description',
    'usages',
    'acteur_actif',
    'initiateur',
    'elements_spatiaux',
    ...ALL_FUZZY_KEYS
  ];

  for (const k of keysToCompare) {
    const a = String(p1[k] ?? '').trim();
    const b = String(p2[k] ?? '').trim();
    if (a !== b) return true;
  }

  return !areGeometriesEquivalent(f1.geometry, f2.geometry);
}

function areGeometriesEquivalent(g1, g2) {
  try {
    return JSON.stringify(g1 || null) === JSON.stringify(g2 || null);
  } catch (e) {
    return false;
  }
}

function getSiteTemporalPalette(zone) {
  if (zone === 'mirail') {
    return {
      pale: '#9ec5ff',
      base: '#0000ff',
      dark: '#000075'
    };
  }

  return {
    pale: '#ffb0b0',
    base: '#ff0000',
    dark: '#780101'
  };
}

function getTrajectoryStyle(status, zone) {
  const palette = getSiteTemporalPalette(zone);

  if (status === 'identical') {
    return {
      color: palette.base,
      weight: 1.2,
      opacity: 0.95,
      fillColor: palette.base,
      fillOpacity: 0.3,
      radius: 4
    };
  }

  if (status === 'modified') {
    return {
      color: palette.pale,
      weight: 1.2,
      opacity: 1,
      fillColor: palette.pale,
      fillOpacity: 0.5,
      radius: 4
    };
  }

  if (status === 'appeared') {
    return {
      color: palette.dark,
      weight: 1.5,
      opacity: 1,
      fillColor: palette.dark,
      fillOpacity: 0.88,
      radius: 4
    };
  }

  return {
    color: '#d9d9d9',
    weight: 1.1,
    opacity: 0.95,
    fillColor: '#d9d9d9',
    fillOpacity: 0.22,
    radius: 4
  };
}

function getGreyTrajectoryStyle(status) {
  if (status === 'identical' || status === 'stable') {
    return {
      color: '#8a8a8a',
      weight: 1,
      opacity: 0.9,
      fillColor: '#8a8a8a',
      fillOpacity: 0.18,
      radius: 4
    };
  }

  if (status === 'modified') {
    return {
      color: '#b0b0b0',
      weight: 1.1,
      opacity: 0.95,
      fillColor: '#b0b0b0',
      fillOpacity: 0.28,
      radius: 4
    };
  }

  if (status === 'appeared') {
    return {
      color: '#d8d8d8',
      weight: 1.1,
      opacity: 1,
      fillColor: '#d8d8d8',
      fillOpacity: 0.42,
      radius: 4
    };
  }

  return {
    color: '#5f5f5f',
    weight: 1,
    opacity: 0.85,
    fillColor: '#5f5f5f',
    fillOpacity: 0.10,
    radius: 4
  };
}

function getFragmentProxemicSourceFeatures(timeMode = 'T1') {
  if (timeMode === 'T2') {
    return [...(dataGeojsonT2 || []), ...(datamGeojsonT2 || [])];
  }

  if (timeMode === 'trajectories') {
    const out = [];

    ['montreuil', 'mirail'].forEach(zone => {
      const pairs = buildTemporalPairsForZone(zone);

      pairs.forEach(pair => {
        const feature = pair.t2 || pair.t1;
        if (!feature) return;

        out.push({
          ...feature,
          properties: {
            ...(feature.properties || {}),
            __trajectoryStatus: pair.status,
            __trajectoryPair: pair
          }
        });
      });
    });

    return out;
  }

  return [...(dataGeojsonT1 || []), ...(datamGeojsonT1 || [])];
}

function getZoneTemporalArrays(zone) {
  if (zone === 'mirail') {
    return {
      t1: datamGeojsonT1 || [],
      t2: datamGeojsonT2 || []
    };
  }

  return {
    t1: dataGeojsonT1 || [],
    t2: dataGeojsonT2 || []
  };
}

function getTemporalRepresentativeFeature(pair) {
  // choix simple et stable :
  // - si T2 existe, on prend T2 comme état représentatif
  // - sinon on garde T1
  return pair?.t2 || pair?.t1 || null;
}

function buildTemporalFragmentIndex() {
  const zones = ['montreuil', 'mirail'];
  const out = {
    montreuil: new Map(),
    mirail: new Map()
  };

  zones.forEach(zone => {
    const { t1, t2 } = getZoneTemporalArrays(zone);

    const map1 = new Map((t1 || []).map(f => [cleanFragmentId(f.properties?.id), f]));
    const map2 = new Map((t2 || []).map(f => [cleanFragmentId(f.properties?.id), f]));

    const ids = new Set([...map1.keys(), ...map2.keys()]);

    ids.forEach(id => {
      const f1 = map1.get(id) || null;
      const f2 = map2.get(id) || null;

      let status = 'stable';
      let delta = null;

      if (f1 && f2) {
        const vec1 = featureToVector(f1);
        const vec2 = featureToVector(f2);
        const sim = similarityFuzzy(vec1, vec2);
        delta = Math.max(0, 1 - sim);

        status = delta > 0 ? 'modified' : 'stable';
      } else if (f1 && !f2) {
        status = 'disappeared';
      } else if (!f1 && f2) {
        status = 'appeared';
      }

      out[zone].set(id, {
        id,
        zone,
        t1: f1,
        t2: f2,
        status,
        delta,
        representative: getTemporalRepresentativeFeature({ t1: f1, t2: f2 })
      });
    });
  });

  temporalFragmentIndex = out;
  return out;
}

function getTemporalInfoForFragmentId(fragmentId, zone) {
  const z = zone || 'montreuil';
  const id = cleanFragmentId(fragmentId);
  return temporalFragmentIndex?.[z]?.get(id) || null;
}

function getTemporalStatusSimilarity(statusA, statusB) {
  if (!statusA || !statusB) return 0;

  if (statusA === statusB) return 1;

  if (TEMPORAL_APP_DIS_STRICT) {
    if (
      (statusA === 'appeared' && statusB === 'disappeared') ||
      (statusA === 'disappeared' && statusB === 'appeared')
    ) {
      return 0;
    }
  }

  return Math.max(0, 1 - TEMPORAL_STATUS_PENALTY);
}

function getTemporalDeltaSimilarity(infoA, infoB) {
  if (!infoA || !infoB) return 0;

  const statusA = infoA.status;
  const statusB = infoB.status;

  // cas stricts sans delta numérique
  if (statusA === 'appeared' && statusB === 'appeared') return 1;
  if (statusA === 'disappeared' && statusB === 'disappeared') return 1;

  // apparu ≠ disparu : distincts
  if (
    (statusA === 'appeared' && statusB === 'disappeared') ||
    (statusA === 'disappeared' && statusB === 'appeared')
  ) {
    return 0;
  }

  // si statuts différents (ex stable vs modified)
  if (statusA !== statusB) {
    return Math.max(0, 1 - TEMPORAL_STATUS_PENALTY);
  }

  // stable/modifié avec delta numérique
  if (
    (statusA === 'stable' || statusA === 'modified') &&
    (statusB === 'stable' || statusB === 'modified')
  ) {
    const dA = Number.isFinite(infoA.delta) ? infoA.delta : 0;
    const dB = Number.isFinite(infoB.delta) ? infoB.delta : 0;
    return Math.max(0, 1 - Math.abs(dA - dB));
  }

  return 0;
}

function computeFragmentTemporalProfile(feature) {
  const props = feature?.properties || {};
  const id = cleanFragmentId(props.id);
  const zone = props.zone || 'montreuil';

  const info = getTemporalInfoForFragmentId(id, zone);

  return {
    id,
    zone,
    status: info?.status || 'stable',
    delta: info?.delta ?? null
  };
}

function buildTemporalProfilesForAgencement(fragmentsInCircle) {
  return (fragmentsInCircle || [])
    .map(f => computeFragmentTemporalProfile(f))
    .filter(p => p.id);
}

function computeTemporalFragmentPairScore(profileA, profileB) {
  if (!profileA || !profileB) return 0;

  const sStatus = getTemporalStatusSimilarity(profileA.status, profileB.status);
  const sDelta = getTemporalDeltaSimilarity(profileA, profileB);

  // si mêmes statuts "apparu/appa ru" ou "disparu/disparu", sDelta = 1
  // si stable/modified, sDelta compare les deltas
  // si statuts différents, sStatus porte la pénalité
  const score = Math.min(sStatus, sDelta);

  return Math.max(TEMPORAL_MIN_MATCH_SCORE, score);
}


function getPatternBaseFeaturesForCurrentTimeMode() {
  const activeZones = getActiveZones ? getActiveZones() : ['montreuil', 'mirail'];

  if (currentFragmentTimeMode === 'T1') {
    return [
      ...(dataGeojsonT1 || []),
      ...(datamGeojsonT1 || [])
    ].filter(f => isFeatureInActiveZones(f) && featureHasAnyActiveCriterion(f));
  }

  if (currentFragmentTimeMode === 'T2') {
    return [
      ...(dataGeojsonT2 || []),
      ...(datamGeojsonT2 || [])
    ].filter(f => isFeatureInActiveZones(f) && featureHasAnyActiveCriterion(f));
  }

  const out = [];

  ['montreuil', 'mirail'].forEach(zone => {
    if (!activeZones.includes(zone)) return;

    const pairs = buildTemporalPairsForZone(zone);

    pairs.forEach(pair => {
      const feature = pair.t2 || pair.t1;
      if (!feature) return;
      if (!featureHasAnyActiveCriterion(feature)) return;

      out.push({
        ...feature,
        properties: {
          ...(feature.properties || {}),
          zone,
          __trajectoryStatus: pair.status,
          __trajectoryPair: pair
        }
      });
    });
  });

  return out;
}


/* ==================================================
   3.7) HELPERS — BÂTIMENTS
================================================== */

function getPropEtat(props) {
  const v = props?.['état'] ?? props?.['etat'] ?? 'inconnu';
  return normStr(v);
}

function getPropFonction(props) {
  const v = props?.['fonction'] ?? 'inconnu';
  return normStr(v);
}

function ensureBuildingHatchDefs(leafletMap) {
  const pane = leafletMap.getPanes().overlayPane;
  const svg = pane.querySelector('svg');
  if (!svg) return;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  if (defs.querySelector('#hatch-solid')) return;

  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  p1.setAttribute('id', 'hatch-solid');
  p1.setAttribute('patternUnits', 'userSpaceOnUse');
  p1.setAttribute('width', '8');
  p1.setAttribute('height', '8');
  p1.setAttribute('patternTransform', 'rotate(45)');

  const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l1.setAttribute('x1', '0');
  l1.setAttribute('y1', '0');
  l1.setAttribute('x2', '0');
  l1.setAttribute('y2', '8');
  l1.setAttribute('stroke', '#9a9a9a');
  l1.setAttribute('stroke-width', '2');
  p1.appendChild(l1);

  const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  p2.setAttribute('id', 'hatch-light');
  p2.setAttribute('patternUnits', 'userSpaceOnUse');
  p2.setAttribute('width', '10');
  p2.setAttribute('height', '10');
  p2.setAttribute('patternTransform', 'rotate(45)');

  const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l2.setAttribute('x1', '0');
  l2.setAttribute('y1', '0');
  l2.setAttribute('x2', '0');
  l2.setAttribute('y2', '10');
  l2.setAttribute('stroke', '#a8a8a8');
  l2.setAttribute('stroke-width', '1.5');
  p2.appendChild(l2);

  defs.appendChild(p1);
  defs.appendChild(p2);
}

function applyHatchToLeafletLayer(layer, hatchId, fallbackFill = 'none') {
  if (!layer || !layer._path) return;

  if (!hatchId) {
    layer._path.setAttribute('fill', fallbackFill);
    return;
  }

  layer._path.setAttribute('fill', `url(#${hatchId})`);
}

function computeBuildingStyle(props) {
  if (BUILDINGS_STYLE_MODE === 'fonction') {
    const fct = getPropFonction(props);

    if (fct === 'logement') {
      return {
        style: {
          stroke: false,
          fill: true,
          fillColor: '#ffffff',
          fillOpacity: 0.22
        },
        hatch: null
      };
    }

    const c = BUILDING_FUNCTION_COLORS[fct] || BUILDING_FUNCTION_COLORS.autre;

    return {
      style: {
        stroke: false,
        fill: true,
        fillColor: c,
        fillOpacity: 1
      },
      hatch: null
    };
  }

  const etat = getPropEtat(props);
  const GREY = '#8f8f8f';

  let style = {
    stroke: false,
    fill: true,
    fillColor: GREY,
    fillOpacity: 0.75
  };

  let hatch = null;

  if (etat === 'habité' || etat === 'inconnu') {
    style = {
      stroke: false,
      fill: true,
      fillColor: GREY,
      fillOpacity: 0.75
    };
  } else if (etat === 'démoli' || etat === 'demoli') {
    style = {
      stroke: true,
      color: GREY,
      weight: 1,
      dashArray: '4 4',
      fill: false,
      fillOpacity: 0
    };
  } else if (etat === 'vacant') {
    style = {
      stroke: true,
      color: GREY,
      weight: 1,
      dashArray: null,
      fill: false,
      fillOpacity: 0
    };
  } else if (etat === 'condamné' || etat === 'condamne') {
    style = {
      stroke: true,
      color: GREY,
      weight: 1,
      dashArray: null,
      fill: true,
      fillColor: GREY,
      fillOpacity: 0.6
    };
    hatch = 'hatch-solid';
  } else if (
    etat === 'en cours de démolition' ||
    etat === 'en cours de demoliton' ||
    etat === 'en cours de demolition'
  ) {
    style = {
      stroke: true,
      color: GREY,
      weight: 1,
      dashArray: '4 4',
      fill: true,
      fillColor: GREY,
      fillOpacity: 0.6
    };
    hatch = 'hatch-solid';
  } else if (
    etat === 'en cours de rénovation' ||
    etat === 'en cours de renovation'
  ) {
    style = {
      stroke: false,
      fill: true,
      fillColor: GREY,
      fillOpacity: 0.25
    };
  } else {
    style = {
      stroke: false,
      fill: true,
      fillColor: GREY,
      fillOpacity: 0.75
    };
  }

  return { style, hatch };
}

function restyleBuildingsOnFragmentsMap() {
  if (!map) return;

  ensureBuildingHatchDefs(map);

  const candidates = [
    batimentsLayerMontreuil,
    batimentsLayerToulouse
  ].filter(Boolean);

  candidates.forEach(geoLayer => {
    geoLayer.eachLayer(l => {
      const props = l?.feature?.properties || {};
      const { style, hatch } = computeBuildingStyle(props);

      if (l.setStyle) l.setStyle(style);

      requestAnimationFrame(() => {
        if (!l._path) return;

        if (hatch) {
          applyHatchToLeafletLayer(l, hatch);
          l._path.setAttribute('fill-opacity', String(style.fillOpacity ?? 1));
        } else {
          const fallback =
            (style.fill === false || style.fillOpacity === 0)
              ? 'none'
              : (style.fillColor || 'none');

          applyHatchToLeafletLayer(l, null, fallback);
          l._path.setAttribute('fill-opacity', String(style.fillOpacity ?? 1));
        }
      });
    });
  });
}

function extractBuildingProfile(buildings = []) {
  const profile = {
    fonctions: new Set(),
    etats: new Set()
  };

  (buildings || []).forEach(b => {
    const props = b?.properties || {};

    const fonction = getPropFonction(props);
    const etat = getPropEtat(props);

    if (fonction && fonction !== 'inconnu') {
      profile.fonctions.add(fonction);
    }

    if (etat && etat !== 'inconnu') {
      profile.etats.add(etat);
    }
  });

  return profile;
}


/* ==================================================
   3.8) HELPERS — Signatures et similarités d’agencements
================================================== */

function overlapRatioByIds(idsA, idsB) {
  const A = new Set(idsA || []);
  const B = new Set(idsB || []);
  if (!A.size || !B.size) return 0;

  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter++;
  }

  return inter / Math.min(A.size, B.size);
}

function getActiveCriteriaKeysArray() {
  return Array.from(ACTIVE_CRITERIA_KEYS || []);
}

function computeFragmentsUnionFromOccurrences(occIds) {
  const out = new Set();

  (occIds || []).forEach(oid => {
    const ag = agencementsById.get(oid);
    (ag?.fragmentIds || []).forEach(fid => out.add(String(fid).trim()));
  });

  return Array.from(out);
}

function getCurrentPatternParams() {
  return {
    perimeterDiameterM: PERIMETER_DIAMETER_M,
    agSimilarityThreshold: AG_SIM_THRESHOLD,
    zones: getActiveZones ? getActiveZones() : [],
    activeCriteriaKeys: getActiveCriteriaKeysArray()
  };
}


function getFragmentDominantPole(feature) {
  const scores = {
    PA: averageActiveFuzzyForFeature(feature, FUZZY_GROUPS.PA || []),
    DH: averageActiveFuzzyForFeature(feature, FUZZY_GROUPS.DH || []),
    FS: averageActiveFuzzyForFeature(feature, FUZZY_GROUPS.FS || [])
  };

  const ranked = Object.entries(scores)
    .filter(([, v]) => v !== null)
    .sort((a, b) => b[1] - a[1]);

  if (!ranked.length) {
    return { pole: 'OTHER', score: 0 };
  }

  return {
    pole: ranked[0][0],
    score: ranked[0][1]
  };
}

function buildAgencementFragmentSequence(fragments = [], center = null) {
  const poleRank = { PA: 0, DH: 1, FS: 2, OTHER: 3 };
  const c = center || latLngAverage(
    (fragments || []).map(getFeatureCenterLatLng).filter(Boolean)
  );

  return (fragments || [])
    .filter(Boolean)
    .map(f => {
      const ll = getFeatureCenterLatLng(f);
      const poleInfo = getFragmentDominantPole(f);

      return {
        id: cleanFragmentId(f?.properties?.id),
        feature: f,
        vec: featureToVector(f),
        temporal: computeFragmentTemporalProfile(f),
        pole: poleInfo.pole,
        poleScore: poleInfo.score ?? 0,
        distToCenter: (ll && c) ? distanceMeters(ll, c) : Infinity
      };
    })
    .sort((a, b) => {
      const poleDiff = (poleRank[a.pole] ?? 99) - (poleRank[b.pole] ?? 99);
      if (poleDiff !== 0) return poleDiff;

      if (b.poleScore !== a.poleScore) {
        return b.poleScore - a.poleScore;
      }

      if (a.distToCenter !== b.distToCenter) {
        return a.distToCenter - b.distToCenter;
      }

      return String(a.id || '').localeCompare(
        String(b.id || ''),
        undefined,
        { numeric: true }
      );
    });
}

function computeSequentialFragmentPairScore(itemA, itemB, idxA, idxB, lenA, lenB) {
  if (!itemA || !itemB) return 0;

  const sFrag = similarityFuzzy(itemA.vec || [], itemB.vec || []);
  const sTemporal = computeTemporalFragmentPairScore(
    itemA.temporal,
    itemB.temporal
  );

  const posA = lenA <= 1 ? 0 : idxA / (lenA - 1);
  const posB = lenB <= 1 ? 0 : idxB / (lenB - 1);

  // bonus léger d’ordre : on reste permissif
  const sOrder = Math.max(0, 1 - Math.abs(posA - posB) * 1.25);

  return (sFrag * 0.75) + (sTemporal * 0.15) + (sOrder * 0.10);
}

function similarityFragmentSequences(seqA = [], seqB = []) {
  if (!seqA.length || !seqB.length) return 0;

  const small = seqA.length <= seqB.length ? seqA : seqB;
  const large = seqA.length <= seqB.length ? seqB : seqA;

  const used = new Set();
  let sum = 0;
  let count = 0;

  small.forEach((itemA, idxA) => {
    let bestScore = -1;
    let bestIdx = -1;

    large.forEach((itemB, idxB) => {
      if (used.has(idxB)) return;

      const s = computeSequentialFragmentPairScore(
        itemA,
        itemB,
        idxA,
        idxB,
        small.length,
        large.length
      );

      if (s > bestScore) {
        bestScore = s;
        bestIdx = idxB;
      }
    });

    if (bestIdx >= 0) {
      used.add(bestIdx);
      sum += bestScore;
      count++;
    }
  });

  if (!count) return 0;

  // pénalité légère seulement si tailles vraiment différentes
  const coverage = small.length / Math.max(large.length, 1);

  return (sum / count) * (0.85 + 0.15 * coverage);
}

function similarityBuildingProfiles(profileA, profileB) {
  const fonctionsA = [...(profileA?.fonctions || new Set())];
  const fonctionsB = [...(profileB?.fonctions || new Set())];
  const etatsA = [...(profileA?.etats || new Set())];
  const etatsB = [...(profileB?.etats || new Set())];

  const hasAnyInfo =
    fonctionsA.length || fonctionsB.length || etatsA.length || etatsB.length;

  if (!hasAnyInfo) return 0.5;

  const sFonctions =
    (fonctionsA.length || fonctionsB.length)
      ? jaccardSimilarity(fonctionsA, fonctionsB)
      : 0.5;

  const sEtats =
    (etatsA.length || etatsB.length)
      ? jaccardSimilarity(etatsA, etatsB)
      : 0.5;

  return (sFonctions + sEtats) / 2;
}

function computeAgencementRelationalSignature(fragments = [], buildings = []) {
  const fragList = (fragments || []).filter(Boolean);
  const bldList = (buildings || []).filter(Boolean);

  const center = latLngAverage([
    ...fragList.map(getFeatureCenterLatLng),
    ...bldList.map(getFeatureCenterLatLng)
  ].filter(Boolean));

  const fragmentSequence = buildAgencementFragmentSequence(fragList, center);
  const buildingProfile = extractBuildingProfile(bldList);

  return {
    center,
    fragmentSequence,
    buildingProfile
  };
}

function similarityAgencements(agA, agB) {
  if (!agA || !agB) return 0;

  const sigA = agA.fragmentsAgg || {};
  const sigB = agB.fragmentsAgg || {};

  const seqA = sigA.fragmentSequence || [];
  const seqB = sigB.fragmentSequence || [];

  if (!seqA.length || !seqB.length) return 0;

  const sSeq = similarityFragmentSequences(seqA, seqB);

  const sBuildings = similarityBuildingProfiles(
    sigA.buildingProfile,
    sigB.buildingProfile
  );

  const countA = Number(agA?.fragmentsCount || 0);
  const countB = Number(agB?.fragmentsCount || 0);

  const sSize =
    (countA > 0 && countB > 0)
      ? Math.min(countA, countB) / Math.max(countA, countB)
      : 0;

  // La séquence porte presque tout.
  // Le bâti et la taille restent des bonus légers.
  return (sSeq * 0.82) + (sBuildings * 0.10) + (sSize * 0.08);
}

function sameFragmentSet(idsA = [], idsB = []) {
  const a = [...idsA].map(x => String(x).trim()).sort();
  const b = [...idsB].map(x => String(x).trim()).sort();

  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getAgencementCenter(ag) {
  if (ag?.center) return ag.center;

  const pts = [
    ...(ag?.fragments || []).map(getFeatureCenterLatLng),
    ...(ag?.buildings || []).map(getFeatureCenterLatLng)
  ].filter(Boolean);

  return latLngAverage(pts);
}

function areAgencementsTooClose(seed, candidate) {
  const c1 = getAgencementCenter(seed);
  const c2 = getAgencementCenter(candidate);

  if (!c1 || !c2) return false;

  const d = distanceMeters(c1, c2);
  const r1 = Number(seed?.radiusM) || (PERIMETER_DIAMETER_M / 2);
  const r2 = Number(candidate?.radiusM) || (PERIMETER_DIAMETER_M / 2);

  const minD = Math.max(r1, r2) * MIN_OCCURRENCE_DISTANCE_FACTOR;
  return d < minD;
}

function isCandidateValidForSeed(seed, candidate) {
  if (!seed || !candidate) return false;
  if (seed.id === candidate.id) return false;

  const seedFragIds = seed.fragmentIds || [];
  const candFragIds = candidate.fragmentIds || [];

  // 1) interdit exactement les mêmes fragments
  if (REJECT_EXACT_SAME_FRAGMENT_SET && sameFragmentSet(seedFragIds, candFragIds)) {
    return false;
  }

  // 2) interdit les candidats trop proches spatialement
  if (areAgencementsTooClose(seed, candidate)) {
    return false;
  }

  // 3) interdit les recouvrements trop forts en fragments
  const overlap = overlapRatioByIds(seedFragIds, candFragIds);
  if (overlap > MAX_FRAGMENT_OVERLAP_WITH_SEED) {
    return false;
  }

  return true;
}

function sortAgencementsById(a, b) {
  return String(a?.id || '').localeCompare(
    String(b?.id || ''),
    undefined,
    { numeric: true }
  );
}


/* ==================================================
   3.9) HELPERS — Composition analytique d’un agencement (sidebar)
================================================== */


function getAgencementTemporalComposition(ag) {
  return (ag?.fragments || [])
    .map(f => {
      const id = cleanFragmentId(f?.properties?.id);
      const zone = f?.properties?.zone || 'montreuil';
      const info = getTemporalInfoForFragmentId(id, zone);

      return {
        id,
        status: info?.status || 'stable',
        delta: info?.delta ?? null
      };
    })
    .filter(x => x.id)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function computePatternGroupingLogic(occs = []) {
  const fragmentCounts = occs.map(ag => Number(ag?.fragmentsCount || 0));
  const buildingCounts = occs.map(ag => Number(ag?.buildingsCount || 0));

  const textPerOccurrence = {};
  TEXT_KEYS.forEach(key => {
    textPerOccurrence[key] = occs.map(ag => {
      const values = [];
      (ag?.fragments || []).forEach(f => {
        const toks = parseMultiText(f?.properties?.[key]) || [];
        values.push(...toks);
      });
      return uniqClean(values);
    });
  });

  const recurringTexts = {};
  TEXT_KEYS.forEach(key => {
    const counts = {};
    textPerOccurrence[key].forEach(arr => {
      arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    });

    recurringTexts[key] = entriesSortedByCount(counts)
      .filter(([, count]) => count >= 2)
      .map(([label, count]) => ({ label, count }));
  });

  const buildingFunctionsPerOcc = occs.map(ag =>
    uniqClean((ag?.buildings || []).map(b => b?.properties?.fonction || b?.properties?.['fonction'] || ''))
  );

  const buildingStatesPerOcc = occs.map(ag =>
    uniqClean((ag?.buildings || []).map(b => b?.properties?.['état'] || b?.properties?.etat || ''))
  );

  const recurringBuildingFunctions = entriesSortedByCount(
    countLabels(buildingFunctionsPerOcc.flat())
  ).filter(([, count]) => count >= 2)
   .map(([label, count]) => ({ label, count }));

  const recurringBuildingStates = entriesSortedByCount(
    countLabels(buildingStatesPerOcc.flat())
  ).filter(([, count]) => count >= 2)
   .map(([label, count]) => ({ label, count }));

  const temporalStatusPerOcc = occs.map(ag =>
    uniqClean(
      getAgencementTemporalComposition(ag)
        .map(x => x.status)
    )
  );

  const recurringTemporalStatuses = entriesSortedByCount(
    countLabels(temporalStatusPerOcc.flat())
  ).filter(([, count]) => count >= 2)
   .map(([label, count]) => ({ label, count }));

  const recurringFragmentCounts = entriesSortedByCount(countLabels(fragmentCounts))
    .filter(([, count]) => count >= 2)
    .map(([label, count]) => ({ label, count }));

  const recurringBuildingCounts = entriesSortedByCount(countLabels(buildingCounts))
    .filter(([, count]) => count >= 2)
    .map(([label, count]) => ({ label, count }));

  return {
    recurringFragmentCounts,
    recurringBuildingCounts,
    recurringTexts,
    recurringBuildingFunctions,
    recurringBuildingStates,
    recurringTemporalStatuses
  };
}


/* ==================================================
   3.10) HELPERS - Contours / convex hull / géométrie avancée
================================================== */
/* CONTOUR */

function extractFeatureLatLngs(feature) {
  const out = [];
  const geom = feature?.geometry;
  if (!geom) return out;

  function walk(coords) {
    if (!Array.isArray(coords)) return;

    // cas [lng, lat]
    if (
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number'
    ) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        out.push(L.latLng(lat, lng));
      }
      return;
    }

    coords.forEach(walk);
  }

  walk(geom.coordinates);
  return out;
}

function dedupeLatLngs(latlngs, precision = 6) {
  const seen = new Set();
  const out = [];

  (latlngs || []).forEach(ll => {
    if (!ll) return;
    const key = `${Number(ll.lat).toFixed(precision)},${Number(ll.lng).toFixed(precision)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ll);
  });

  return out;
}

function cross2D(o, a, b) {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
}

function computeConvexHullLatLng(latlngs) {
  const pts = dedupeLatLngs(latlngs).slice();

  if (pts.length < 3) return pts;

  pts.sort((p1, p2) => {
    if (p1.lng !== p2.lng) return p1.lng - p2.lng;
    return p1.lat - p2.lat;
  });

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

function buildAgencementBoundsLatLngs(ag) {
  const pts = [];

  (ag.fragments || []).forEach(f => {
    pts.push(...extractFeatureLatLngs(f));
  });

  (ag.buildings || []).forEach(b => {
    pts.push(...extractFeatureLatLngs(b));
  });

  const uniquePts = dedupeLatLngs(pts);

  if (!uniquePts.length) return null;

  // 1 seul point
  if (uniquePts.length === 1) {
    const c = uniquePts[0];
    const d = 0.00004;
    return [
      L.latLng(c.lat + d, c.lng - d),
      L.latLng(c.lat + d, c.lng + d),
      L.latLng(c.lat - d, c.lng + d),
      L.latLng(c.lat - d, c.lng - d)
    ];
  }

  // 2 points -> petit losange allongé
  if (uniquePts.length === 2) {
    const a = uniquePts[0];
    const b = uniquePts[1];

    const midLat = (a.lat + b.lat) / 2;
    const midLng = (a.lng + b.lng) / 2;

    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const pad = 0.00005;

    return [
      L.latLng(a.lat + ny * pad, a.lng + nx * pad),
      L.latLng(b.lat + ny * pad, b.lng + nx * pad),
      L.latLng(b.lat - ny * pad, b.lng - nx * pad),
      L.latLng(a.lat - ny * pad, a.lng - nx * pad)
    ];
  }

  return computeConvexHullLatLng(uniquePts);
}

/* ==================================================
   4) INDEX, MÉTADONNÉES LOCALES ET PERSISTANCE
================================================== */

/* ==================================================
   4.1) Métadonnées locales de fragments
================================================== */

function getFragMetaKey(id){ return `fragmeta:${id}`; }
function loadFragmentMeta(fragmentId) {
  try {
    return JSON.parse(localStorage.getItem(getFragMetaKey(fragmentId)) || 'null') || { usages: [], discours: [] };
  } catch(e) { return { usages: [], discours: [] }; }
}
function saveFragmentMeta(fragmentId, meta) {
  localStorage.setItem(getFragMetaKey(fragmentId), JSON.stringify(meta));
  window.dispatchEvent(new CustomEvent('fragmeta:updated', { detail: { fragmentId, meta } }));
}
function uid(){ return Math.random().toString(36).slice(2,9); }

/* ==================================================
   4.2) Index discours
================================================== */


function buildDiscourseIndexes(features) {
  discourseById = new Map();
  discourseByFragmentId = new Map();
  discourseByBuildingId = new Map();

  (features || []).forEach(feature => {
    const props = feature?.properties || {};
    const id = String(props.id || '').trim().toUpperCase();

    if (id) {
      discourseById.set(id, feature);
    }

    const fragIds = parseAssociatedIds(props.fragment_associe);
    fragIds.forEach(fid => addToMapArray(discourseByFragmentId, fid, feature));

    const buildingIds = parseAssociatedIds(props.batiment_associe);
    buildingIds.forEach(bid => addToMapArray(discourseByBuildingId, bid, feature));
  });
}

function getDiscoursesForFragment(fragmentId) {
  const id = String(fragmentId || '').trim().toUpperCase();
  return discourseByFragmentId.get(id) || [];
}

function getDiscoursesForBuilding(buildingId) {
  const id = String(buildingId || '').trim().toUpperCase();
  return discourseByBuildingId.get(id) || [];
}


function getDiscoursesForAgencement(ag) {
  const discourseMap = new Map();

  (ag?.fragmentIds || []).forEach(fid => {
    getDiscoursesForFragment(fid).forEach(feature => {
      const did = String(feature?.properties?.id || '').trim().toUpperCase();
      if (did) discourseMap.set(did, feature);
    });
  });

  (ag?.buildingIds || []).forEach(bid => {
    getDiscoursesForBuilding(bid).forEach(feature => {
      const did = String(feature?.properties?.id || '').trim().toUpperCase();
      if (did) discourseMap.set(did, feature);
    });
  });

  return Array.from(discourseMap.values()).sort((a, b) => {
    const aId = String(a?.properties?.id || '');
    const bId = String(b?.properties?.id || '');
    return aId.localeCompare(bId, undefined, { numeric: true });
  });
}

function getDiscoursesForFragmentFeature(feature) {
  if (!feature?.properties?.id) return [];
  return getDiscoursesForFragment(feature.properties.id) || [];
}

function getDiscoursesForBuildingFeature(feature) {
  if (!feature?.properties?.id) return [];
  return getDiscoursesForBuilding(feature.properties.id) || [];
}


/* ==================================================
   4.3) Noms automatiques des agencements calculés
================================================== */


function loadAutoAgencementNames() {
  try {
    return JSON.parse(localStorage.getItem(AUTO_AGENCEMENT_NAMES_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function getAutoAgencementName(agId, fallback = '') {
  const names = loadAutoAgencementNames();
  const val = String(names[agId] || '').trim();
  return val || fallback;
}

function setAutoAgencementName(agId, name) {
  const names = loadAutoAgencementNames();
  const clean = String(name || '').trim();

  if (clean) names[agId] = clean;
  else delete names[agId];

  localStorage.setItem(AUTO_AGENCEMENT_NAMES_KEY, JSON.stringify(names));
}

/* ==================================================
  4.4) Sauvegarde des agencements
================================================== */


function loadSavedAgencements() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_AGENCEMENTS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveSavedAgencements(arr) {
  localStorage.setItem(SAVED_AGENCEMENTS_KEY, JSON.stringify(arr));
}

function addSavedAgencement(rec) {
  const arr = loadSavedAgencements();
  arr.push(rec);
  saveSavedAgencements(arr);
  hydratedSavedAgencementsCache = null;
hydratedSavedAgencementsCacheKey = '';
}

function updateSavedAgencement(uid, patch) {
  const arr = loadSavedAgencements();
  const i = arr.findIndex(x => x.uid === uid);
  if (i >= 0) {
    arr[i] = {
      ...arr[i],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    saveSavedAgencements(arr);
    hydratedSavedAgencementsCache = null;
hydratedSavedAgencementsCacheKey = '';
    recomputeAgencementPatterns();
  }
}

function deleteSavedAgencement(uid) {
  saveSavedAgencements(loadSavedAgencements().filter(x => x.uid !== uid));
  recomputeAgencementPatterns();

  if (currentPatternMode === 'patterns' && currentView === 'patterns-map') {
    renderPatternBaseGrey();
    hydratedSavedAgencementsCache = null;
hydratedSavedAgencementsCacheKey = '';
    refreshPatternsMap();
  }
}

function saveGeneratedAgencement(ag) {
  if (!ag) return;

  const existing = loadSavedAgencements().find(x =>
    x.origin === 'generated' &&
    sameFragmentSet(x.fragmentIds || [], ag.fragmentIds || []) &&
    sameFragmentSet(x.buildingIds || [], ag.buildingIds || [])
  );

  if (existing) {
    openSavedAgencementPanel(existing.uid);
    return;
  }

  const contourLatLngs =
    getAgencementContourLatLngs(ag) ||
    buildAgencementBoundsLatLngs(ag);

  const generatedCount = loadSavedAgencements()
    .filter(x => x.origin === 'generated').length;

  const saved = {
    uid: 'ag_saved_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    id: ag.id || `AX${generatedCount + 1}`,
    name: ag.name || ag.id || `AX${generatedCount + 1}`,
    description: '',
    createdAt: new Date().toISOString(),

    fragmentIds: (ag.fragmentIds || []).slice(),
    buildingIds: (ag.buildingIds || []).slice(),
    fragmentsCount: ag.fragmentsCount || (ag.fragmentIds || []).length,
    buildingsCount: ag.buildingsCount || (ag.buildingIds || []).length,

    contour: contourLatLngs
      ? contourLatLngs.map(ll => [ll.lat, ll.lng])
      : null,

    origin: 'generated',
    seedable: false,
    sourceSeedId: ag.sourceSeedId || null
  };

  addSavedAgencement(saved);
  refreshAgencementDisplays();
  renderSavedAgencementsOnMap();
  openSavedAgencementPanel(saved.uid);
}


/* ==================================================
  4.5) Sauvegarde des patterns
================================================== */


function loadSavedPatterns(){
  try { return JSON.parse(localStorage.getItem(SAVED_PATTERNS_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveSavedPatterns(arr){
  localStorage.setItem(SAVED_PATTERNS_KEY, JSON.stringify(arr));
}
function addSavedPattern(rec){
  const arr = loadSavedPatterns();
  arr.push(rec);
  saveSavedPatterns(arr);
}
function updateSavedPattern(uid, patch){
  const arr = loadSavedPatterns();
  const i = arr.findIndex(x => x.uid === uid);
  if (i >= 0) { arr[i] = { ...arr[i], ...patch, updatedAt: new Date().toISOString() }; saveSavedPatterns(arr); }
}
function deleteSavedPattern(uid){
  saveSavedPatterns(loadSavedPatterns().filter(x => x.uid !== uid));
}

/* ==================================================
  4.6) Hydratation, caches, reconstruction
================================================== */

/*==================================================
=     HYDRATATION DES AGENCEMENTS SAUVEGARDÉS      =
==================================================*/

function getAllFragmentsById() {
  if (allFragmentsByIdCache) return allFragmentsByIdCache;

  const all = [
    ...(dataGeojson || []),
    ...(datamGeojson || []),
    ...(dataGeojsonT1 || []),
    ...(dataGeojsonT2 || []),
    ...(datamGeojsonT1 || []),
    ...(datamGeojsonT2 || [])
  ];

  const byId = new Map();

  all.forEach(f => {
    const id = cleanFragmentId(f?.properties?.id);
    if (!id) return;
    if (!byId.has(id)) byId.set(id, f);
  });

  allFragmentsByIdCache = byId;
  return allFragmentsByIdCache;
}

function getAllBuildingsById() {
  if (allBuildingsByIdCache) return allBuildingsByIdCache;

  const all = [
    ...(batimentsMontreuilGeojson || []),
    ...(batimentsToulouseGeojson || [])
  ];

  allBuildingsByIdCache = new Map(
    all
      .map(b => [cleanFragmentId(b?.properties?.id), b])
      .filter(([id]) => id)
  );

  return allBuildingsByIdCache;
}

function getAgencementContourLatLngs(ag) {
  if (Array.isArray(ag?.contour) && ag.contour.length >= 3) {
    return ag.contour.map(pt => L.latLng(pt[0], pt[1]));
  }

  if (Array.isArray(ag?.contourLatLngs) && ag.contourLatLngs.length >= 3) {
    return ag.contourLatLngs;
  }

  if (ag?.fragments || ag?.buildings) {
    return buildAgencementBoundsLatLngs(ag);
  }

  return null;
}

function estimateAgencementRadiusFromContour(latlngs, center) {
  if (!latlngs?.length || !center) return 0;

  const ds = latlngs.map(ll => distanceMeters(center, ll)).filter(Number.isFinite);
  return ds.length ? Math.max(...ds) : 0;
}

function hydrateSavedAgencement(rec) {
  const byFragId = getAllFragmentsById();
  const byBldId = getAllBuildingsById();

  const fragments = (rec.fragmentIds || [])
    .map(id => byFragId.get(String(id).trim()))
    .filter(Boolean);

  const buildings = (rec.buildingIds || [])
    .map(id => byBldId.get(String(id).trim()))
    .filter(Boolean);

  const contourLatLngs = getAgencementContourLatLngs(rec);
  const center =
    contourLatLngs?.length
      ? latLngAverage(contourLatLngs)
      : latLngAverage([
          ...fragments.map(getFeatureCenterLatLng),
          ...buildings.map(getFeatureCenterLatLng)
        ].filter(Boolean));

  const radiusM = estimateAgencementRadiusFromContour(contourLatLngs, center);

  const relational = computeAgencementRelationalSignature(
    fragments,
    buildings,
    radiusM || 1
  );

  return {
    uid: rec.uid,
    id: rec.id || rec.uid,
    name: rec.name || rec.id || rec.uid,
    description: rec.description || '',
    createdAt: rec.createdAt || null,

    fragments,
    buildings,

    fragmentIds: (rec.fragmentIds || []).map(x => cleanFragmentId(x)).sort(),
    buildingIds: (rec.buildingIds || []).map(x => cleanFragmentId(x)).sort(),

    fragmentsCount: fragments.length,
    buildingsCount: buildings.length,

    contour: rec.contour || null,
    contourLatLngs,
    center,
    radiusM,

    fragmentsAgg: relational,
    temporalProfiles: buildTemporalProfilesForAgencement(fragments),

    patternIds: []
  };
}

function getSelectedAgencementsForPatterns() {
  const savedRaw = localStorage.getItem(SAVED_AGENCEMENTS_KEY) || '[]';
  const criteriaKey = Array.from(ACTIVE_CRITERIA_KEYS || []).sort().join('|');
  const cacheKey = savedRaw + '||' + criteriaKey;

  if (
    hydratedSavedAgencementsCache &&
    hydratedSavedAgencementsCacheKey === cacheKey
  ) {
    return hydratedSavedAgencementsCache;
  }

  const saved = (loadSavedAgencements() || []).filter(rec => rec.seedable !== false);

  hydratedSavedAgencementsCache = saved
    .map(hydrateSavedAgencement)
    .filter(ag => ag.fragmentsCount > 0 || ag.buildingsCount > 0);

  hydratedSavedAgencementsCacheKey = cacheKey;

  return hydratedSavedAgencementsCache;
}

function buildSavedPatternOccurrenceSnapshot(ag, patternKey = '') {
  if (!ag) return null;

  const contourLatLngs =
    getAgencementContourLatLngs(ag) ||
    buildAgencementBoundsLatLngs(ag);

  return {
    uid: `spocc_${patternKey}_${ag.id}`,
    id: ag.id || '',
    name: ag.name || ag.id || '',
    description: '',
    createdAt: new Date().toISOString(),

    fragmentIds: (ag.fragmentIds || []).map(x => cleanFragmentId(x)).filter(Boolean),
    buildingIds: (ag.buildingIds || []).map(x => cleanFragmentId(x)).filter(Boolean),

    fragmentsCount: Number(ag.fragmentsCount || (ag.fragmentIds || []).length || 0),
    buildingsCount: Number(ag.buildingsCount || (ag.buildingIds || []).length || 0),

    contour: contourLatLngs
      ? contourLatLngs.map(ll => [ll.lat, ll.lng])
      : null,

    origin: 'saved-pattern-occurrence',
    seedable: false,
    sourceSeedId: ag.sourceSeedId || null,
    patternIds: (ag.patternIds || []).slice()
  };
}

function getSavedPatternOccurrences(rec) {
  if (!rec) return [];

  const snapshots = Array.isArray(rec.occurrenceSnapshots)
    ? rec.occurrenceSnapshots
    : [];

  let occs = snapshots
    .map(snap => hydrateSavedAgencement({
      uid: snap.uid || snap.id || `spocc_${Math.random().toString(36).slice(2)}`,
      id: snap.id || '',
      name: snap.name || snap.id || '',
      description: snap.description || '',
      createdAt: snap.createdAt || rec.savedAt || null,

      fragmentIds: Array.isArray(snap.fragmentIds) ? snap.fragmentIds.slice() : [],
      buildingIds: Array.isArray(snap.buildingIds) ? snap.buildingIds.slice() : [],

      fragmentsCount: snap.fragmentsCount || 0,
      buildingsCount: snap.buildingsCount || 0,

      contour: snap.contour || null,
      origin: 'saved-pattern-occurrence',
      seedable: false
    }))
    .filter(ag => ag && (ag.fragmentsCount > 0 || ag.buildingsCount > 0))
    .sort(sortAgencementsById);

  // compatibilité avec anciens patterns déjà enregistrés
  if (!occs.length) {
    occs = (rec.occurrences || [])
      .map(id => agencementsById.get(id))
      .filter(Boolean)
      .sort(sortAgencementsById);
  }

  occs.forEach(ag => {
    ag.patternIds = [rec.patternKey];
  });

  return occs;
}




/* ==================================================
  5) FILTRES, CRITÈRES ET VISIBILITÉ GLOBALE
================================================== */

/* Zones actives (Montreuil/Mirail) */
function getActiveZones() {
  return Array.from(document.querySelectorAll('.filter-zone:checked')).map(cb => cb.value);
}
function isFeatureInActiveZones(f) {
  const zones = getActiveZones();
  const zone = f.properties?.zone || f.zone || null;
  if (!zone) return true; // fallback

  return zones.includes(zone);
}

function featureHasAnyActiveCriterion(feature) {
  const props = feature?.properties || {};
  if (!ACTIVE_CRITERIA_KEYS || ACTIVE_CRITERIA_KEYS.size === 0) return false;

  for (const k of ALL_FUZZY_KEYS) {
    if (!ACTIVE_CRITERIA_KEYS.has(k)) continue;
    const v = parseFuzzy(props[k]);
    if (v !== null) return true;
  }

  for (const k of TEXT_KEYS) {
    if (!ACTIVE_CRITERIA_KEYS.has(k)) continue;
    const arr = parseMultiText(props[k]);
    if (arr && arr.length > 0) return true;
  }

  return false;
}

function getVisibleSpatialFeaturesForPatterns() {
  const fragmentSource = getPatternBaseFeaturesForCurrentTimeMode()
    .filter(f => !f?.properties?.isDiscourse && !f?.properties?.isBuilding);

  const buildingSource = [
    ...(batimentsMontreuilGeojson || []),
    ...(batimentsToulouseGeojson || [])
  ];

  const visibleFragments = fragmentSource.filter(f =>
    isFeatureInActiveZones(f) && featureHasAnyActiveCriterion(f)
  );

  const visibleBuildings = buildingSource.filter(f =>
    !!f?.properties?.isBuilding && isFeatureInActiveZones(f)
  );

  return { visibleFragments, visibleBuildings };
}

/* Patterns auxquels appartient un fragment */
function getPatternsForFragment(fragmentId) {
  const id = cleanFragmentId(fragmentId);
  return fragmentToPatternIds.get(id) || [];
}

function toggleLocation() {
  const locationButton = document.getElementById('toggle-location-btn');
  let targetMap = map;

  if (currentView === 'patterns-map') {
    initPatternMapOnce();
    if (patternMap) targetMap = patternMap;
  } else if (currentView === 'unit' || currentView === 'unit-view') {
    ensureUnitMap();
    if (unitMap) targetMap = unitMap;
  }

  if (currentLocation === 'montreuil') {
    targetMap.setView(toulouseView, toulouseZoom);
    currentLocation = 'toulouse';
    if (locationButton) locationButton.textContent = 'Voir Montreuil';
  } else {
    targetMap.setView(montreuilView, montreuilZoom);
    currentLocation = 'montreuil';
    if (locationButton) locationButton.textContent = 'Voir Toulouse';
  }

  if (currentView === 'map') {
    restyleBuildingsOnFragmentsMap();
  }
}

/*  Filtres  1) masque / affiche les couches selon les zones    2) recalcule les agencements et patterns visibles    3) rafraîchit la vue active */

function applyFilters() {
  const toggleDiscoursesEl = document.getElementById('toggle-discourses');
  SHOW_DISCOURSES = toggleDiscoursesEl ? toggleDiscoursesEl.checked : true;

  const activeZones = getActiveZones();

  allLayers.forEach(layer => {
    const props = layer?.feature?.properties || {};
    const isDiscourse = !!props.isDiscourse;
    const showLayer = isDiscourse ? SHOW_DISCOURSES : activeZones.includes(layer.zone);

    if (showLayer) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  });

  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();

if (currentPatternMode === 'patterns') {
  recomputeAgencementPatterns({
    fragments: visibleFragments,
    buildings: visibleBuildings
  });
}

    if (currentView === 'map') {
  renderFragmentsMapByTimeMode();
  restyleBuildingsOnFragmentsMap();
} else if (currentView === 'fragment-proxemic') {
  showFragmentProxemicView();
} else if (currentView === 'proxemic') {
  showProxemicView();
} else if (currentView === 'gallery') {
  showGalleryView();
} else if (currentView === 'patterns-map') {
  renderPatternBaseGrey();

  if (currentPatternMode === 'patterns') {
    refreshPatternsMap();
  } else if (currentPatternMode === 'agencements') {
    refreshAgencementSelectionMap();
  }
} else if (currentView === 'comparison') {
  renderComparisonView();
}

  if (discoursLayer && SHOW_DISCOURSES) discoursLayer.bringToFront();
}

/* ==================================================
  6) SIDEBAR À ONGLETS — INFRASTRUCTURE
================================================== */

const Tabbed = {
  el: null, tabsBar: null, content: null,
  openTabs: new Map(),     // id -> {btn, panel, kind}
  activeId: null
};

function ensureTabbedSidebar() {
  if (Tabbed.el) return;
  Tabbed.el      = document.getElementById('tabbed-sidebar');
  Tabbed.tabsBar = document.getElementById('tabbed-sidebar-tabs');
  Tabbed.content = document.getElementById('tabbed-sidebar-content');
}

function showTabbedSidebar() {
  ensureTabbedSidebar();
  Tabbed.el.style.display = 'block';
}
function hideTabbedSidebarIfEmpty() {
  if (Tabbed.openTabs.size === 0) {
    Tabbed.el.style.display = 'none';
    Tabbed.activeId = null;
  }
}

function clearAllTabbedTabs() {
  ensureTabbedSidebar();
  Array.from(Tabbed.openTabs.keys()).forEach(id => closeTab(id));
  Tabbed.tabsBar.innerHTML = '';
  Tabbed.content.innerHTML = '';
  Tabbed.activeId = null;
  Tabbed.el.style.display = 'none';
}

function focusTab(id) {
  if (!Tabbed.openTabs.has(id)) return;
  Tabbed.activeId = id;
  Tabbed.openTabs.forEach((rec, key) => {
    rec.btn.style.background = (key === id) ? '#222' : '#000';
    rec.btn.style.color      = '#fff';
    rec.panel.style.display  = (key === id) ? 'block' : 'none';
  });
}

function closeTab(id) {
  const rec = Tabbed.openTabs.get(id);
  if (!rec) return;
  rec.btn.remove();
  rec.panel.remove();
  Tabbed.openTabs.delete(id);
  if (Tabbed.activeId === id) {
    const last = Array.from(Tabbed.openTabs.keys()).pop();
    if (last) focusTab(last);
  }
  hideTabbedSidebarIfEmpty();
}

function makeTabButton(title, id) {
  const btn = document.createElement('button');
  btn.textContent = title;
  btn.title = title;
  btn.style.cssText = 'border:1px solid #333; background:#000; color:#fff; padding:6px 8px; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px; border-radius:4px;';
  btn.addEventListener('click', () => focusTab(id));

  const x = document.createElement('span');
  x.textContent = '×';
  x.style.cssText = 'display:inline-block; padding:0 4px; border-left:1px solid #333; cursor:pointer; opacity:.85;';
  x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
  btn.appendChild(x);

  return btn;
}

function makePanelContainer(id) {
  const panel = document.createElement('div');
  panel.id = `panel-${id}`;
  panel.style.display = 'none';
  return panel;
}

function openTab({ id, title, kind, render }) {
  ensureTabbedSidebar();

  // Si onglet déjà ouvert → focus et sortir
  if (Tabbed.openTabs.has(id)) {
    focusTab(id);
    Tabbed.content.scrollTop = 0;
    return;
  }

  // Bouton onglet
  const btn   = makeTabButton(title, id);
  // Contenu
  const panel = makePanelContainer(id);

  // Injection dans le DOM
  Tabbed.tabsBar.appendChild(btn);
  Tabbed.content.appendChild(panel);

  // Rendu
  render(panel);

  // Enregistrement
  Tabbed.openTabs.set(id, { btn, panel, kind });

  // Afficher la sidebar si cachée
  showTabbedSidebar();

  // Focus sur l’onglet
  focusTab(id);
  Tabbed.content.scrollTop = 0;
}

/* ==================================================
  7) OUVERTURE DES PANNEAUX ET PETITS BUILDERS DE SIDEBAR
================================================== */


function appendMetaBox(panel, title, items, emptyText) {
  const box = document.createElement('div');
  box.className = 'meta-box';

  const head = document.createElement('div');
  head.className = 'meta-head';
  head.innerHTML = `<strong>${title}</strong>`;
  box.appendChild(head);

  const list = document.createElement('div');
  list.className = 'meta-list';

  if (items && items.length) {
    items.forEach(txt => {
      const row = document.createElement('div');
      row.className = 'meta-item';
      row.innerHTML = `<div class="meta-item-text">${txt}</div>`;
      list.appendChild(row);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'meta-empty';
    empty.textContent = emptyText || "—";
    list.appendChild(empty);
  }

  box.appendChild(list);
  panel.appendChild(box);
}

function appendSimpleBlock(panel, title, rows = []) {
  const box = document.createElement('div');
  box.className = 'pattern-crit-block';

  const h = document.createElement('h3');
  h.textContent = title;
  box.appendChild(h);

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.style.color = '#aaa';
    empty.textContent = '—';
    box.appendChild(empty);
    panel.appendChild(box);
    return;
  }

  rows.forEach(item => {
    const line = document.createElement('div');
    line.className = 'crit-line';

    const lab = document.createElement('span');
    lab.className = 'crit-label';
    lab.textContent = item.label;

    const val = document.createElement('span');
    val.className = 'crit-value';
    val.textContent = item.value;

    line.append(lab, val);
    box.appendChild(line);
  });

  panel.appendChild(box);
}


function showDetails(props) {
  clearAllTabbedTabs(); // exclusif : 1 clic = 1 set d’infos (fonction en Partie 2)

  if (props.isPattern) {
    const key = props.patternKey || 'Pattern';
    openTab({                         // openTab / renderPatternPanel en Partie 2
      id: `pattern-${key}`,
      title: key,
      kind: 'pattern',
      render: (panel) => renderPatternPanel(panel, key, patterns[key] || {})
    });
  } else if (props.isDiscourse) {
    openTab({                         // renderDiscoursePanel en Partie 2
      id: `disc-${props.id || Math.random().toString(36).slice(2)}`,
      title: props.id || 'Discours',
      kind: 'discourse',
      render: (panel) => renderDiscoursePanel(panel, props)
    });
 } else if (props.isBuilding) {
    const bid = props.id || Math.random().toString(36).slice(2);
    openTab({
      id: `bat-${bid}`,
      title: props.id || 'Bâtiment',
      kind: 'building',
      render: (panel) => renderBuildingPanel(panel, props)
    });
  } else {
    const fid = props.id || Math.random().toString(36).slice(2);
    openTab({                         // renderFragmentPanel en Partie 2
      id: `frag-${fid}`,
      title: props.id || 'Fragment',
      kind: 'fragment',
      render: (panel) => renderFragmentPanel(panel, props)
    });
  }

  // masque les anciennes sidebars (sécurité)
  const sb1 = document.getElementById('spatial-sidebar');
  const sb2 = document.getElementById('discourse-sidebar');
  if (sb1) sb1.style.display = 'none';
  if (sb2) sb2.style.display = 'none';
}

function closeSidebars() {
  const sb1 = document.getElementById('spatial-sidebar');
  const sb2 = document.getElementById('discourse-sidebar');
  if (sb1) sb1.style.display = 'none';
  if (sb2) sb2.style.display = 'none';
  clearAllTabbedTabs(); // (Partie 2)
}

function openDiscourseFromFeature(feature) {
  if (!feature || !feature.properties) return;

  const props = {
    ...feature.properties,
    isDiscourse: true
  };

  showDetails(props);
}


/* ==================================================
  8) CHARGEMENT DES DONNÉES GEOJSON
================================================== */

// Contours (non interactifs)
fetch('data/contour.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color:'#919090', weight:2, opacity:0.8, fillOpacity:0 },
      interactive: false
    }).addTo(map);
  });

// Fragments Montreuil + Mirail, T1 + T2
Promise.all([
  fetch('data/data.geojson').then(r => r.json()),
  fetch('data/data2.geojson').then(r => r.json()),
  fetch('data/datam.geojson').then(r => r.json()),
  fetch('data/datam2.geojson').then(r => r.json())
]).then(([dataT1, dataT2, dataMT1, dataMT2]) => {
  dataGeojsonT1  = dataT1.features || [];
  dataGeojsonT2  = dataT2.features || [];
  datamGeojsonT1 = dataMT1.features || [];
  datamGeojsonT2 = dataMT2.features || [];

  dataGeojsonT1.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'montreuil';
    f.properties.__timeState = 'T1';
  });

  dataGeojsonT2.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'montreuil';
    f.properties.__timeState = 'T2';
  });

  datamGeojsonT1.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'mirail';
    f.properties.__timeState = 'T1';
  });

  datamGeojsonT2.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'mirail';
    f.properties.__timeState = 'T2';
  });

temporalPairsCache.montreuil = null;
temporalPairsCache.mirail = null;
allFragmentsByIdCache = null;
hydratedSavedAgencementsCache = null;
hydratedSavedAgencementsCacheKey = '';

  buildTemporalFragmentIndex();

  const canonicalMontreuil = [];
  temporalFragmentIndex.montreuil.forEach(info => {
    if (info.representative) canonicalMontreuil.push(info.representative);
  });

  const canonicalMirail = [];
  temporalFragmentIndex.mirail.forEach(info => {
    if (info.representative) canonicalMirail.push(info.representative);
  });

  dataGeojson = canonicalMontreuil;
  datamGeojson = canonicalMirail;

  combinedFeatures = [...dataGeojson, ...datamGeojson];

renderFragmentsMapByTimeMode();

const shouldPreparePatternsNow =
  currentView === 'patterns-map' ||
  currentView === 'proxemic' ||
  currentView === 'gallery';

if (shouldPreparePatternsNow) {
  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
  recomputeAgencementPatterns({
    fragments: visibleFragments,
    buildings: visibleBuildings
  });

  initPatternMapOnce();
  renderPatternBaseGrey();
  refreshPatternsMap();
}

  if (currentView === 'patterns-map') {
    initPatternMapOnce();
    renderPatternBaseGrey();
    refreshPatternsMap();
  }
});

// Discours 
fetch('data/discours.geojson')
  .then(res => res.json())
  .then(data => {
    discoursGeojson = (data && data.features) ? data.features : [];

    discoursGeojson.forEach(f => {
      f.properties = f.properties || {};
      f.properties.isDiscourse = true;

      // si ton GeoJSON contient déjà zone, on la garde.
      // sinon tu peux laisser null.
      f.properties.zone = f.properties.zone || null;
    });

    buildDiscourseIndexes(discoursGeojson);

    discoursLayer = L.geoJSON(
      { type: 'FeatureCollection', features: discoursGeojson },
      {
        pane: 'pane-discours',
        pointToLayer: (feature, latlng) => {
          const visible = L.circleMarker(latlng, {
            radius: 5,
            fillColor: 'white',
            color: 'white',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
            pane: 'pane-discours'
          });

          const clickableArea = L.circle(latlng, {
            radius: 30,
            color: 'transparent',
            fillColor: 'transparent',
            weight: 0,
            fillOpacity: 0,
            pane: 'pane-discours'
          });

          clickableArea.on('click', () => openDiscourseFromFeature(feature));
          visible.on('click', () => openDiscourseFromFeature(feature));

          return L.layerGroup([clickableArea, visible]);
        },
        onEachFeature: (feature, layerGroup) => {
          layerGroup.feature = feature;
          layerGroup.zone = feature.properties?.zone || null;
          allLayers.push(layerGroup);
        }
      }
    );

    discoursLayer.addTo(map);
    applyFilters();
  });

  // Bâtiments Montreuil + Toulouse
Promise.all([
  fetch('data/batimentsmontreuil.geojson').then(r => r.json()),
  fetch('data/batimenttoulouse.geojson').then(r => r.json())
]).then(([bM, bT]) => {

  batimentsMontreuilGeojson = (bM && bM.features) ? bM.features : [];
  batimentsToulouseGeojson  = (bT && bT.features) ? bT.features : [];

  // IMPORTANT : on pose une "zone" dans les properties pour que les filtres marchent
  batimentsMontreuilGeojson.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'montreuil';
    f.properties.isBuilding = true; // pour ne pas polluer les patterns pour l’instant
  });

  batimentsToulouseGeojson.forEach(f => {
    f.properties = f.properties || {};
    f.properties.zone = 'mirail';   // chez toi "Toulouse" est filtré via la checkbox "mirail"
    f.properties.isBuilding = true;
  });

  allBuildingsByIdCache = null;
hydratedSavedAgencementsCache = null;
hydratedSavedAgencementsCacheKey = '';

  const buildingStyle = (feature) => {
    // style simple (tu pourras coder par état/fonction ensuite)
    return {
      color: '#ffffff',
      weight: 1,
      opacity: 0.8,
      fillColor: '#ffffff',
      fillOpacity: 0.08
    };
  };

  // Montreuil
  batimentsLayerMontreuil = L.geoJSON(
    { type: 'FeatureCollection', features: batimentsMontreuilGeojson },
    {
      pane: 'pane-batiments',
      style: buildingStyle,
      onEachFeature: (feature, layer) => {
        layer.zone = 'montreuil';       // cohérent avec applyFilters()
        layer.feature = feature;        // sécurité
        allLayers.push(layer);          // pour que applyFilters() masque/affiche
layer.on('click', (ev) => {
  L.DomEvent.stopPropagation(ev);
  showDetails(feature.properties);
});      }
    }
  ).addTo(map);
  restyleBuildingsOnFragmentsMap();


  // Toulouse/Mirail
  batimentsLayerToulouse = L.geoJSON(
    { type: 'FeatureCollection', features: batimentsToulouseGeojson },
    {
      pane: 'pane-batiments',
      style: buildingStyle,
      onEachFeature: (feature, layer) => {
        layer.zone = 'mirail';
        layer.feature = feature;
        allLayers.push(layer);
layer.on('click', (ev) => {
  L.DomEvent.stopPropagation(ev);
  showDetails(feature.properties);
});      }
    }
  ).addTo(map);
  restyleBuildingsOnFragmentsMap();


  // Applique l'état des checkboxes (zones)
  applyFilters();

}).catch(err => {
  console.error("Erreur chargement bâtiments:", err);
});


/* ==================================================
  9) MOTEUR DE CALCUL DES AGENCEMENTS / PATTERNS
================================================== */

function agencementTouchesActiveZones(ag) {
  const activeZones = new Set((getActiveZones && getActiveZones()) || []);
  if (!activeZones.size) return true;

  const features = [
    ...(ag?.fragments || []),
    ...(ag?.buildings || [])
  ];

  return features.some(f => activeZones.has(f?.properties?.zone));
}

function buildCandidateAgencementAroundPivot(
  pivotFeature,
  {
    index = 0,
    radiusM,
    fragments = [],
    buildings = [],
    seedId = 'SEED',
    seedBuildingProfile = null,
    maxSeedBuildings = null
  } = {}
) {
  const pivot = pivotFeature?.feature || pivotFeature;
  const center = pivotFeature?.ll || getFeatureCenterLatLng(pivot);
  if (!center) return null;

  const nearbyFragments = [];
  const nearbyBuildingsRaw = [];

  for (let i = 0; i < fragments.length; i++) {
    const item = fragments[i];
    const feature = item?.feature || item;
    const ll = item?.ll || getFeatureCenterLatLng(feature);

    if (ll && distanceMeters(center, ll) <= radiusM) {
      nearbyFragments.push(feature);
    }
  }

  for (let i = 0; i < buildings.length; i++) {
    const item = buildings[i];
    const feature = item?.feature || item;
    const ll = item?.ll || getFeatureCenterLatLng(feature);
    if (!ll) continue;

    const d = distanceMeters(center, ll);
    if (d <= radiusM) {
      nearbyBuildingsRaw.push({
        feature,
        distance: d
      });
    }
  }

  let nearbyBuildings = nearbyBuildingsRaw.map(x => x.feature);

  if (maxSeedBuildings !== null) {
    const limit = Math.max(0, Number(maxSeedBuildings) || 0);

    if (limit === 0) {
      nearbyBuildings = [];
    } else {
      const hasFonctions = !!seedBuildingProfile?.fonctions?.size;
      const hasEtats = !!seedBuildingProfile?.etats?.size;

      let filtered = nearbyBuildingsRaw;

      if (hasFonctions || hasEtats) {
        filtered = nearbyBuildingsRaw
          .map(item => {
            const props = item.feature?.properties || {};

            const sameFonction =
              hasFonctions && seedBuildingProfile.fonctions.has(getPropFonction(props));

            const sameEtat =
              hasEtats && seedBuildingProfile.etats.has(getPropEtat(props));

            return {
              ...item,
              score: (sameFonction ? 2 : 0) + (sameEtat ? 1 : 0)
            };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.distance - b.distance;
          });
      } else {
        filtered = nearbyBuildingsRaw.sort((a, b) => a.distance - b.distance);
      }

      nearbyBuildings = filtered
        .slice(0, limit)
        .map(item => item.feature);
    }
  }

  const enoughFragments = nearbyFragments.length >= MIN_AG_FRAGMENTS;

  const singleFragmentWithBuildings =
    ALLOW_SINGLE_FRAGMENT_WITH_BUILDINGS &&
    nearbyFragments.length === 1 &&
    nearbyBuildings.length >= MIN_BUILDINGS_FOR_SINGLE_FRAGMENT;

  if (!enoughFragments && !singleFragmentWithBuildings) return null;

  const fragmentIds = nearbyFragments
    .map(f => cleanFragmentId(f?.properties?.id))
    .filter(Boolean)
    .sort();

  const buildingIds = nearbyBuildings
    .map(b => cleanFragmentId(b?.properties?.id))
    .filter(Boolean)
    .sort();

  if (!fragmentIds.length && !buildingIds.length) return null;

  const id = `${seedId}__O${index + 1}`;

  return {
    uid: id,
    id,
    name: '',
    mode: 'auto',
    sourceSeedId: seedId,

    center,
    radiusM,

    fragments: nearbyFragments,
    buildings: nearbyBuildings,

    fragmentIds,
    buildingIds,

    fragmentsCount: nearbyFragments.length,
    buildingsCount: nearbyBuildings.length,

    patternIds: []
  };
}

function buildOccurrencesForSeed(
  seed,
  {
    fragments = [],
    buildings = []
  } = {}
) {

  const radiusM = PERIMETER_DIAMETER_M / 2;

  const seedBuildingProfile = extractBuildingProfile(seed?.buildings || []);
  const maxSeedBuildings = Number(
    seed?.buildingsCount ?? seed?.buildingIds?.length ?? 0
  );

  const occurrences = [seed];
  const seenFragmentSets = new Set();

  const seedFragmentKey = (seed?.fragmentIds || [])
    .map(cleanFragmentId)
    .sort()
    .join('|');

  if (seedFragmentKey) {
    seenFragmentSets.add(seedFragmentKey);
  }

  (fragments || []).forEach((pivot, idx) => {
    const candidate = buildCandidateAgencementAroundPivot(pivot, {
      index: idx,
      radiusM,
      fragments,
      buildings,
      seedId: seed.id,
      seedBuildingProfile,
      maxSeedBuildings
    });

    if (!candidate) return;

    const sigKey = (candidate.fragmentIds || []).join('|');
    if (!sigKey) return;
    if (seenFragmentSets.has(sigKey)) return;

    if (!isCandidateValidForSeed(seed, candidate)) return;

    seenFragmentSets.add(sigKey);

    candidate.fragmentsAgg = computeAgencementRelationalSignature(
      candidate.fragments,
      candidate.buildings,
      radiusM
    );
    candidate.temporalProfiles = buildTemporalProfilesForAgencement(candidate.fragments);
    candidate.contourLatLngs = buildAgencementBoundsLatLngs({
      fragments: candidate.fragments,
      buildings: candidate.buildings
    });

        const sim = similarityAgencements(seed, candidate);
    if (sim < AG_SIM_THRESHOLD) return;

    // filtre anti quasi-doublons parmi les occurrences déjà retenues
    let shouldSkip = false;
    let replaceIndex = -1;

    for (let i = 1; i < occurrences.length; i++) {
      const kept = occurrences[i];
      if (!kept) continue;

      const fragOverlap = overlapRatioByIds(
        candidate.fragmentIds || [],
        kept.fragmentIds || []
      );

      const bldOverlap = overlapRatioByIds(
        candidate.buildingIds || [],
        kept.buildingIds || []
      );

      const occSim = similarityAgencements(candidate, kept);

      const almostSame =
        fragOverlap >= MAX_OCCURRENCE_OVERLAP_BETWEEN_CANDIDATES &&
        occSim >= MIN_DISTINCT_OCCURRENCE_SIMILARITY;

      const sameBuiltContext =
        bldOverlap >= 0.66 &&
        occSim >= MIN_DISTINCT_OCCURRENCE_SIMILARITY;

      if (almostSame || sameBuiltContext) {
        const keptScore = similarityAgencements(seed, kept);
        const candScore = sim;

        // on garde le meilleur des deux
        if (candScore > keptScore) {
          replaceIndex = i;
        } else {
          shouldSkip = true;
        }
        break;
      }
    }

    if (shouldSkip) return;

    if (replaceIndex >= 0) {
      occurrences[replaceIndex] = candidate;
    } else {
      occurrences.push(candidate);
    }
  });

  const sorted = occurrences.sort(sortAgencementsById);

  let autoIndex = 1;

  sorted.forEach(ag => {
    if (ag.id === seed.id) {
      ag.name = seed.name || seed.id;
      return;
    }

    ag.name = getAutoAgencementName(ag.id, `A${autoIndex}`);
    autoIndex++;
  });

  return sorted;
}

function rebuildFragmentToPatternIndex() {
  fragmentToPatternIds = new Map();

  Object.entries(patterns || {}).forEach(([pKey, pData]) => {
    (pData?.occurrences || []).forEach(agId => {
      const ag = agencementsById.get(agId);
      if (!ag) return;

      (ag.fragmentIds || []).forEach(fid => {
        const cleanId = cleanFragmentId(fid);
        if (!cleanId) return;

        if (!fragmentToPatternIds.has(cleanId)) {
          fragmentToPatternIds.set(cleanId, []);
        }

        const list = fragmentToPatternIds.get(cleanId);
        if (!list.includes(pKey)) {
          list.push(pKey);
        }
      });
    });
  });

  fragmentToPatternIds.forEach(list => {
    list.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  });
}

function filterSeedAgencementToVisibleMembers(
  ag,
  visibleFragments = [],
  visibleBuildings = []
) {
  if (!ag) return null;

  const visibleFragmentsById = new Map(
    (visibleFragments || [])
      .map(f => [cleanFragmentId(f?.properties?.id), f])
      .filter(([id]) => id)
  );

  const visibleBuildingsById = new Map(
    (visibleBuildings || [])
      .map(b => [cleanFragmentId(b?.properties?.id), b])
      .filter(([id]) => id)
  );

  const fragments = (ag.fragmentIds || [])
    .map(id => visibleFragmentsById.get(cleanFragmentId(id)))
    .filter(Boolean);

  const buildings = (ag.buildingIds || [])
    .map(id => visibleBuildingsById.get(cleanFragmentId(id)))
    .filter(Boolean);

  const fragmentsCount = fragments.length;
  const buildingsCount = buildings.length;

  const enoughFragments = fragmentsCount >= MIN_AG_FRAGMENTS;

  const singleFragmentWithBuildings =
    ALLOW_SINGLE_FRAGMENT_WITH_BUILDINGS &&
    fragmentsCount === 1 &&
    buildingsCount >= MIN_BUILDINGS_FOR_SINGLE_FRAGMENT;

  if (!enoughFragments && !singleFragmentWithBuildings) return null;

  const radiusM = Number(ag.radiusM) || (PERIMETER_DIAMETER_M / 2);

  const relational = computeAgencementRelationalSignature(
    fragments,
    buildings,
    radiusM
  );

  return {
    ...ag,
    fragments,
    buildings,
    fragmentIds: fragments.map(f => cleanFragmentId(f?.properties?.id)).filter(Boolean).sort(),
    buildingIds: buildings.map(b => cleanFragmentId(b?.properties?.id)).filter(Boolean).sort(),
    fragmentsCount,
    buildingsCount,
    center: latLngAverage([
      ...fragments.map(getFeatureCenterLatLng),
      ...buildings.map(getFeatureCenterLatLng)
    ].filter(Boolean)),
    fragmentsAgg: relational,
    temporalProfiles: buildTemporalProfilesForAgencement(fragments),
    contourLatLngs: buildAgencementBoundsLatLngs({ fragments, buildings })
  };
}

function recomputeAgencementPatterns({ fragments, buildings } = {}) {
  const visible = getVisibleSpatialFeaturesForPatterns();

  const visibleFragments = fragments || visible.visibleFragments || [];
  const visibleBuildings = buildings || visible.visibleBuildings || [];

  const fragIdsKey = visibleFragments
    .map(f => cleanFragmentId(f?.properties?.id))
    .filter(Boolean)
    .join('|');

  const bldIdsKey = visibleBuildings
    .map(b => cleanFragmentId(b?.properties?.id))
    .filter(Boolean)
    .join('|');

  const zonesKey = ((getActiveZones && getActiveZones()) || []).slice().sort().join('|');
  const savedKey = localStorage.getItem(SAVED_AGENCEMENTS_KEY) || '[]';

const computeKey = [
  zonesKey,
  currentFragmentTimeMode,
  ACTIVE_CRITERIA_CACHE_KEY,
  String(AG_SIM_THRESHOLD),
  String(PERIMETER_DIAMETER_M),
  savedKey,
  fragIdsKey,
  bldIdsKey
].join('§');

  if (computeKey === lastPatternComputeKey) return;
  lastPatternComputeKey = computeKey;

  const visibleFragmentsIndexed = visibleFragments
    .map(f => ({ feature: f, ll: getFeatureCenterLatLng(f) }))
    .filter(x => x.ll);

  const visibleBuildingsIndexed = visibleBuildings
    .map(b => ({ feature: b, ll: getFeatureCenterLatLng(b) }))
    .filter(x => x.ll);

const seeds = getSelectedAgencementsForPatterns()
  .map(ag => filterSeedAgencementToVisibleMembers(ag, visibleFragments, visibleBuildings))
  .filter(Boolean)
  .filter(ag => agencementTouchesActiveZones(ag));

  patterns = {};
  agencements = [];
  agencementsById = new Map();
  fragmentToPatternIds = new Map();

  if (!seeds.length) return;

  let pIndex = 1;

  seeds.forEach(seed => {
    seed.patternIds = [];

    const occurrences = buildOccurrencesForSeed(seed, {
      fragments: visibleFragmentsIndexed,
      buildings: visibleBuildingsIndexed
    });

    if (occurrences.length < MIN_PATTERN_OCCURRENCES) return;

    const pKey = `P${pIndex++}`;

    patterns[pKey] = {
      name: pKey,
      sourceAgencementId: seed.id,
      occurrences: occurrences.map(ag => ag.id),
      size: occurrences.length
    };

    occurrences.forEach(ag => {
      if (!ag.patternIds) ag.patternIds = [];
      if (!ag.patternIds.includes(pKey)) {
        ag.patternIds.push(pKey);
      }
      agencementsById.set(ag.id, ag);
    });
  });

  agencements = Array.from(agencementsById.values()).sort(sortAgencementsById);

  rebuildFragmentToPatternIndex();
}

function computeInternalDiffractionEdges() {
  return [];
}


/* ==================================================
  10) RENDU DES PANNEAUX LATÉRAUX
================================================== */

/* ==================================================
  10.1 Panneaux objets simples
================================================== */

/*BATIMENTS*/
function renderBuildingPanel(panel, props) {
  panel.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = props.id || 'Bâtiment';

  const pId = document.createElement('p');
  pId.innerHTML = `<strong>ID :</strong> ${props.id || '—'}`;

  const pFonction = document.createElement('p');
  pFonction.innerHTML = `<strong>Fonction :</strong> ${props.fonction || '—'}`;

  // Attention : dans ton GeoJSON tu as "état" avec accent
  const etat = props['état'] || props.etat || '—';
  const pEtat = document.createElement('p');
  pEtat.innerHTML = `<strong>État :</strong> ${etat}`;

  panel.append(h2, pId, pFonction, pEtat);
}

/*FRAGMENTS*/
function renderFragmentPanel(panel, props) {
  panel.innerHTML = '';

  const fragId = props.id || '—';

  /* ------------------------------
     En-tête du fragment
  ------------------------------ */
  const h2 = document.createElement('h2');
  h2.textContent = props.name || fragId || 'Fragment';

  const pId = document.createElement('p');
  pId.innerHTML = `<strong>ID :</strong> ${fragId}`;

  const pDesc = document.createElement('p');
  pDesc.textContent = props.description || '';

  /* ------------------------------
     Photos
  ------------------------------ */
  const photos = document.createElement('div');
  const photoList = normalizePhotos(props.photos);
  if (photoList.length) {
    photoList.forEach(src => {
      const img = makeImg(src, props.name || fragId || 'photo');
      if (img) {
        img.style.width = '100%';
        img.style.marginBottom = '8px';
        photos.appendChild(img);
      }
    });
  }

  panel.append(h2, pId, pDesc, photos);


/* ======================================================
   1) MÉTADONNÉES issues du GeoJSON (listes)
   - Initiateur
   - Acteurs actifs
   - Usages issus du terrain
====================================================== */
const existingInitiateur = parseGeojsonList(props.initiateur);
const existingActeurs    = parseGeojsonList(props.acteur_actif);
const existingUsages     = parseGeojsonList(props.usages);
const existingElementsSpatiaux = parseGeojsonList(props.elements_spatiaux);

// ordre demandé
appendMetaBox(panel, "Initiateur", existingInitiateur, "— Aucun initiateur renseigné dans le GeoJSON.");
appendMetaBox(panel, "Acteurs actifs", existingActeurs, "— Aucun acteur actif renseigné dans le GeoJSON.");
appendMetaBox(panel, "Usages issus du terrain", existingUsages, "— Aucun usage renseigné dans le GeoJSON.");
appendMetaBox(panel, "Éléments spatiaux", existingElementsSpatiaux, "— Aucun élément spatial renseigné dans le GeoJSON.");


  /* ======================================================
     2) USAGES ajoutés localement par l’utilisateur
     ====================================================== */
  const meta = loadFragmentMeta(fragId);

  function makeEditorBlock(title, listKey, placeholder) {
    const box = document.createElement('div');
    box.className = 'meta-box';

    const head = document.createElement('div');
    head.className = 'meta-head';
    head.innerHTML = `<strong>${title}</strong>`;
    box.appendChild(head);

    const addRow = document.createElement('div');
    addRow.className = 'meta-add-row';

    const ta = document.createElement('textarea');
    ta.className = 'meta-ta';
    ta.rows = 3;
    ta.placeholder = placeholder;

    const addBtn = document.createElement('button');
    addBtn.className = 'tab-btn btn-sm';
    addBtn.textContent = 'Ajouter';

    addBtn.addEventListener('click', () => {
      const txt = ta.value.trim();
      if (!txt) return;
      meta[listKey].push({ id: uid(), text: txt });
      saveFragmentMeta(fragId, meta);
      ta.value = '';
      renderList();
    });

    addRow.append(ta, addBtn);
    box.appendChild(addRow);

    const list = document.createElement('div');
    list.className = 'meta-list';
    box.appendChild(list);

    function renderList() {
      list.innerHTML = '';
      meta[listKey].forEach(item => {
        const row = document.createElement('div');
        row.className = 'meta-item';

        const left = document.createElement('div');
        left.className = 'meta-item-left';

        const txt = document.createElement('div');
        txt.className = 'meta-item-text';
        txt.textContent = item.text;
        txt.title = 'Cliquer pour éditer';

        // Édition
        txt.addEventListener('click', () => {
          if (row.querySelector('textarea')) return;
          const editor = document.createElement('textarea');
          editor.className = 'meta-edit';
          editor.value = item.text;

          const saveBtn = document.createElement('button');
          saveBtn.className = 'tab-btn btn-xs primary';
          saveBtn.textContent = 'OK';

          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'tab-btn btn-xs';
          cancelBtn.textContent = 'Annuler';

          const editRow = document.createElement('div');
          editRow.className = 'meta-edit-row';
          editRow.append(editor, saveBtn, cancelBtn);

          left.replaceChild(editRow, txt);

          saveBtn.addEventListener('click', () => {
            const newTxt = editor.value.trim();
            if (newTxt) {
              item.text = newTxt;
              saveFragmentMeta(fragId, meta);
            }
            renderList();
          });

          cancelBtn.addEventListener('click', renderList);
        });

        left.appendChild(txt);

        const right = document.createElement('div');
        right.className = 'meta-item-right';

        const delBtn = document.createElement('button');
        delBtn.className = 'tab-btn btn-xs danger';
        delBtn.textContent = 'Suppr.';

        delBtn.addEventListener('click', () => {
          meta[listKey] = meta[listKey].filter(x => x.id !== item.id);
          saveFragmentMeta(fragId, meta);
          renderList();
        });

        right.appendChild(delBtn);

        row.append(left, right);
        list.appendChild(row);
      });

      if (!meta[listKey].length) {
        const empty = document.createElement('div');
        empty.className = 'meta-empty';
        empty.textContent = '— Aucun élément pour le moment.';
        list.appendChild(empty);
      }
    }

    renderList();
    return box;
  }

  const usagesBlock = makeEditorBlock('Usages ajoutés', 'usages', 'Ex : « Lieu de réunion… »');
  const discoursBlock = makeEditorBlock('Discours', 'discours', 'Ex : « L’institution prévoit… »');

  panel.append(usagesBlock, discoursBlock);

  /* ======================================================
     3) CRITÈRES FUZZY
     ====================================================== */
  const fuzzyBlock = document.createElement('div');
  fuzzyBlock.className = 'fuzzy-criteria';

  const hFuzzy = document.createElement('h3');
  hFuzzy.textContent = "Critères";
  fuzzyBlock.appendChild(hFuzzy);

  ALL_FUZZY_KEYS.forEach(k => {
    const raw = props[k];
    const val = parseFuzzy(raw);

    const row = document.createElement('div');
    row.className = 'crit-line';

    const label = document.createElement('span');
    label.className = 'crit-label';
    label.textContent = k;

    const value = document.createElement('span');
    value.className = 'crit-value';
    value.textContent = (val !== null ? val : "—");

    row.append(label, value);
    fuzzyBlock.appendChild(row);
  });

  panel.append(fuzzyBlock);
}

/*DISCOURS*/
function renderDiscoursePanel(panel, props) {
  panel.innerHTML = '';
  const h2 = document.createElement('h2'); h2.textContent = props.id || 'Discours';
  const pA = document.createElement('p'); pA.innerHTML = `<strong>Auteur :</strong> ${props.auteur || ''}`;
  const pD = document.createElement('p'); pD.innerHTML = `<strong>Date :</strong> ${props.date || ''}`;
  const pS = document.createElement('p');
  const src = props.source || '';
  pS.innerHTML = `<strong>Source :</strong> ${ src && String(src).startsWith('http') ? `<a href="${src}" target="_blank">${src}</a>` : src }`;
  const pT = document.createElement('p'); pT.textContent = props.contenu || '';
  panel.append(h2, pA, pD, pS, pT);
}

/* ==================================================
  10.2 Panneaux pattern / agencement
================================================== */
/*PATTERNS*/
function renderPatternPanel(panel, patternKey, patternData) {
  panel.innerHTML = '';

  const occIds = (patternData?.occurrences || []).slice();
  const occs = occIds
    .map(id => agencementsById.get(id))
    .filter(Boolean)
    .sort(sortAgencementsById);

  const h2 = document.createElement('h2');
  h2.textContent = patternKey;
  panel.appendChild(h2);

  const pMeta = document.createElement('p');
  pMeta.className = 'pattern-meta';
  pMeta.textContent = `${occs.length} occurrences`;
  panel.appendChild(pMeta);

  if (!occs.length) {
    const msg = document.createElement('div');
    msg.style.color = '#aaa';
    msg.style.padding = '8px 0';
    msg.textContent = "Aucune occurrence disponible.";
    panel.appendChild(msg);
    return;
  }

  const grouping = computePatternGroupingLogic(occs);

  function compactRecurringList(items = [], {
    minCount = 2,
    maxItems = 5
  } = {}) {
    return (items || [])
      .filter(item => Number(item.count || 0) >= minCount)
      .slice(0, maxItems)
      .map(item => item.label);
  }

  function compactCountRange(values = []) {
    const nums = (values || [])
      .map(v => Number(v))
      .filter(Number.isFinite);

    if (!nums.length) return '—';

    const min = Math.min(...nums);
    const max = Math.max(...nums);

    return min === max ? `${min}` : `${min}–${max}`;
  }

  const fragmentCounts = occs.map(ag => ag.fragmentsCount);
  const buildingCounts = occs.map(ag => ag.buildingsCount);

  appendSimpleBlock(panel, 'Structure récurrente', [
    {
      label: 'Fragments',
      value: compactCountRange(fragmentCounts)
    },
    {
      label: 'Bâtiments',
      value: compactCountRange(buildingCounts)
    },
    {
      label: 'Base',
      value: patternData?.sourceAgencementId || '—'
    }
  ]);

  appendSimpleBlock(panel, 'Grappes récurrentes', [
    {
      label: 'Usages',
      value: compactRecurringList(grouping.recurringTexts.usages).join(', ') || '—'
    },
    {
      label: 'Acteurs',
      value: compactRecurringList(grouping.recurringTexts.acteur_actif).join(', ') || '—'
    },
    {
      label: 'Initiateurs',
      value: compactRecurringList(grouping.recurringTexts.initiateur).join(', ') || '—'
    },
    {
      label: 'Éléments',
      value: compactRecurringList(grouping.recurringTexts.elements_spatiaux).join(', ') || '—'
    }
  ]);

  appendSimpleBlock(panel, 'Contexte / temporalités', [
    {
      label: 'Bâti',
      value: compactRecurringList(grouping.recurringBuildingStates, { maxItems: 3 }).join(', ') || '—'
    },
    {
      label: 'Fonctions',
      value: compactRecurringList(grouping.recurringBuildingFunctions, { maxItems: 3 }).join(', ') || '—'
    },
    {
      label: 'Temporalités',
      value: compactRecurringList(grouping.recurringTemporalStatuses, { maxItems: 3 }).join(', ') || '—'
    }
  ]);

  const list = document.createElement('div');
  list.className = 'pattern-members';

  const hList = document.createElement('h3');
  hList.textContent = 'Occurrences';
  list.appendChild(hList);

  const byFragId = getGalleryFragmentsById();
  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(
    allBlds.map(b => [cleanFragmentId(b.properties?.id), b])
  );

  occs.forEach(ag => {
    const row = document.createElement('div');
    row.className = 'member-row';

    const thumb = document.createElement('div');
    thumb.className = 'member-thumb';

    let foundPhoto = null;
    for (const fid of (ag.fragmentIds || [])) {
      const f = byFragId.get(cleanFragmentId(fid));
      if (!f) continue;
      const p = normalizePhotos(f.properties?.photos)[0];
      if (p) {
        foundPhoto = p;
        break;
      }
    }
    if (foundPhoto) thumb.style.backgroundImage = `url("${foundPhoto}")`;

    const right = document.createElement('div');
    right.className = 'member-right';

    const title = document.createElement('div');
    title.className = 'member-title';
    title.textContent = ag.name || ag.id;

    const info = document.createElement('div');
    info.className = 'member-info';
    info.textContent = `${ag.fragmentsCount} fragments • ${ag.buildingsCount} bâtiments`;

    right.append(title, info);
    row.append(thumb, right);

    row.addEventListener('click', () => {
      openTab({
        id: `ag-${ag.id}`,
        title: ag.name || ag.id,
        kind: 'agencement',
        render: (p) => renderAgencementPanel(p, ag, { byFragId, byBldId })
      });
    });

    list.appendChild(row);
  });

  panel.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'btn-row';

  const btnSave = document.createElement('button');
  btnSave.className = 'tab-btn btn-sm primary';
  btnSave.textContent = 'Enregistrer ce pattern';
  btnSave.onclick = () => {
    if (typeof openSavePatternModal === 'function') openSavePatternModal(patternKey, patternData);
  };

  actions.appendChild(btnSave);
  panel.appendChild(actions);
}

/*AGENCEMENTS*/
function renderAgencementPanel(panel, ag, { byFragId, byBldId } = {}) {
  panel.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = ag.name || ag.id;
  panel.appendChild(h2);

  if ((ag.name || '').trim() && ag.name !== ag.id) {
    const pId = document.createElement('p');
    pId.innerHTML = `<strong>ID :</strong> ${ag.id}`;
    panel.appendChild(pId);
  }

  const meta = document.createElement('p');
  meta.innerHTML = `<strong>${ag.fragmentsCount}</strong> fragments • <strong>${ag.buildingsCount}</strong> bâtiments • rayon ${(ag.radiusM || 0).toFixed(0)} m`;
  panel.appendChild(meta);

  const pP = document.createElement('p');
  const pList = (ag.patternIds || [])
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  pP.innerHTML = `<strong>Patterns :</strong> ${pList.length ? pList.join(', ') : '—'}`;
  panel.appendChild(pP);

  const hF = document.createElement('h3');
  hF.textContent = 'Fragments inclus';
  panel.appendChild(hF);

  const fragBox = document.createElement('div');

  if (!(ag.fragmentIds || []).length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun fragment';
    fragBox.appendChild(empty);
  } else {
    (ag.fragmentIds || []).forEach(fid => {
      const f = byFragId?.get(String(fid).trim());

      const row = document.createElement('div');
      row.className = 'member-row';

      const thumb = document.createElement('div');
      thumb.className = 'member-thumb';

      const photoUrl = f ? normalizePhotos(f.properties?.photos)[0] : null;
      if (photoUrl) {
        thumb.style.backgroundImage = `url("${photoUrl}")`;
      }

      const right = document.createElement('div');
      right.className = 'member-right';

      const title = document.createElement('div');
      title.className = 'member-title';
      title.textContent = f ? (f.properties?.name || fid) : fid;

      const info = document.createElement('div');
      info.className = 'member-info';
      info.textContent = f ? (f.properties?.id || fid) : fid;

      right.append(title, info);
      row.append(thumb, right);

      row.addEventListener('click', () => {
        if (f) openFragmentWithPatternsTabs(f.properties);
      });

      fragBox.appendChild(row);
    });
  }

  panel.appendChild(fragBox);

  const hB = document.createElement('h3');
  hB.textContent = 'Bâtiments inclus';
  panel.appendChild(hB);

  const bBox = document.createElement('div');

  if (!(ag.buildingIds || []).length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun bâtiment';
    bBox.appendChild(empty);
  } else {
    (ag.buildingIds || []).forEach(bid => {
      const b = byBldId?.get(String(bid).trim());
      const props = b?.properties || {};

      const line = document.createElement('div');
      line.className = 'crit-line';

      const label = document.createElement('span');
      label.className = 'crit-label';
      label.textContent = bid || 'Bâtiment';

      const value = document.createElement('span');
      value.className = 'crit-value';
      value.textContent = `${props.fonction || props['fonction'] || '—'} • ${props['état'] || props.etat || '—'}`;

      line.append(label, value);
      bBox.appendChild(line);
    });
  }

  panel.appendChild(bBox);

  const actions = document.createElement('div');
  actions.className = 'btn-row';

  if (ag.mode === 'auto') {
    const bSave = document.createElement('button');
    bSave.className = 'tab-btn btn-sm primary';
    bSave.textContent = 'Enregistrer';
    bSave.onclick = () => {
      saveGeneratedAgencement(ag);
    };
    actions.appendChild(bSave);
  }

  const bEdit = document.createElement('button');
  bEdit.className = 'tab-btn btn-sm';
  bEdit.textContent = 'Modifier';
  bEdit.onclick = () => {
    if (ag.uid) openEditSavedAgencementModal(ag.uid);
    else openEditComputedAgencementModal(ag);
  };

  actions.appendChild(bEdit);
  panel.appendChild(actions);
}

/* ==================================================
  10.3 Panneaux d’objets sauvegardés
================================================== */

function openSavedAgencementPanel(uid) {
  const items = loadSavedAgencements();
  const ag = items.find(x => x.uid === uid);
  if (!ag) return;

  openTab({
    id: `saved-ag-${uid}`,
    title: ag.name || ag.id,
    kind: 'saved-agencement',
    render: panel => renderSavedAgencementPanel(panel, ag)
  });
}

function renderSavedAgencementPanel(panel, ag) {
  panel.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = ag.name || ag.id;
  panel.appendChild(h2);

  const meta = document.createElement('div');
  meta.style.cssText = 'color:#aaa;font-size:12px;margin-bottom:8px';
  const labelOrigin = ag.origin === 'generated'
  ? 'Agencement enregistré'
  : 'Agencement créé';

meta.textContent =
  `${labelOrigin} • Créé : ${fmtDate(ag.createdAt)} • Fragments : ${ag.fragmentsCount} • Bâtiments : ${ag.buildingsCount}` +
  (ag.updatedAt ? ` • Modifié : ${fmtDate(ag.updatedAt)}` : '');
  panel.appendChild(meta);

  const desc = document.createElement('p');
  desc.textContent = ag.description || '—';
  panel.appendChild(desc);

  const hF = document.createElement('h3');
  hF.textContent = 'Fragments';
  panel.appendChild(hF);

  const allFrags = [...(dataGeojson || []), ...(datamGeojson || [])];
  const byFragId = new Map(allFrags.map(f => [String(f.properties?.id || '').trim(), f]));

  if (!ag.fragmentIds?.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun fragment';
    panel.appendChild(empty);
  } else {
    ag.fragmentIds.forEach(fid => {
      const f = byFragId.get(String(fid).trim());

      const row = document.createElement('div');
      row.className = 'member-row';

      const thumb = document.createElement('div');
      thumb.className = 'member-thumb';

      const p = normalizePhotos(f?.properties?.photos)[0];
      if (p) thumb.style.backgroundImage = `url("${p}")`;

      const right = document.createElement('div');
      right.className = 'member-right';

      const title = document.createElement('div');
      title.className = 'member-title';
      title.textContent = f?.properties?.name || fid;

      const info = document.createElement('div');
      info.className = 'member-info';
      info.textContent = fid;

      right.append(title, info);
      row.append(thumb, right);

      row.addEventListener('click', () => {
        if (f) openFragmentWithPatternsTabs(f.properties || {});
      });

      panel.appendChild(row);
    });
  }

  const hB = document.createElement('h3');
  hB.textContent = 'Bâtiments';
  panel.appendChild(hB);

  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(allBlds.map(b => [String(b.properties?.id || '').trim(), b]));

  if (!ag.buildingIds?.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun bâtiment';
    panel.appendChild(empty);
  } else {
    ag.buildingIds.forEach(bid => {
      const b = byBldId.get(String(bid).trim());
      const props = b?.properties || {};

      const line = document.createElement('div');
      line.className = 'crit-line';

      const label = document.createElement('span');
      label.className = 'crit-label';
      label.textContent = bid;

      const value = document.createElement('span');
      value.className = 'crit-value';
      value.textContent = `${props.fonction || props['fonction'] || '—'} • ${props['état'] || props.etat || '—'}`;

      line.append(label, value);
      panel.appendChild(line);
    });
  }

  const actions = document.createElement('div');
  actions.className = 'btn-row';

  const bRename = document.createElement('button');
bRename.className = 'tab-btn btn-sm';
bRename.textContent = 'Modifier';
bRename.onclick = () => {
  openEditSavedAgencementModal(ag.uid);
};

  const bDelete = document.createElement('button');
  bDelete.className = 'tab-btn btn-sm danger';
  bDelete.textContent = 'Supprimer';
  bDelete.onclick = () => {
    deleteSavedAgencement(ag.uid);
    renderSavedAgencementsOnMap();
    const tabId = `saved-ag-${ag.uid}`;
    if (Tabbed?.openTabs?.has(tabId)) closeTab(tabId);
  };

  actions.append(bRename, bDelete);
  panel.appendChild(actions);
}

function openSavedPatternPanel(uid) {
  const items = loadSavedPatterns();
  const rec = items.find(x => x.uid === uid);
  if (!rec) return;

  openTab({
    id: `saved-${uid}`,
    title: rec.name || rec.patternKey,
    kind: 'saved-pattern',
    render: panel => renderSavedPatternPanel(panel, rec)
  });
}

function renderSavedPatternPanel(panel, rec) {
  panel.innerHTML = '';

  const occs = getSavedPatternOccurrences(rec);

  const h2 = document.createElement('h2');
  h2.textContent = rec.name || rec.patternKey || 'Pattern enregistré';
  panel.appendChild(h2);

  const pMeta = document.createElement('p');
  pMeta.className = 'pattern-meta';
  pMeta.textContent =
    `ID : ${rec.patternKey || '—'} • ${occs.length} occurrences • ` +
    `enregistré le ${fmtDate(rec.savedAt)}` +
    (rec.updatedAt ? ` • modifié le ${fmtDate(rec.updatedAt)}` : '');
  panel.appendChild(pMeta);

  const params = rec.params || {};
  appendSimpleBlock(panel, 'Enregistrement / paramètres', [
    {
      label: 'Agencement de base',
      value: rec.sourceAgencementId || '—'
    },
    {
      label: 'Diamètre',
      value: Number.isFinite(params.perimeterDiameterM)
        ? `${params.perimeterDiameterM} m`
        : '—'
    },
    {
      label: 'Seuil similarité',
      value: Number.isFinite(params.agSimilarityThreshold)
        ? Number(params.agSimilarityThreshold).toFixed(2)
        : '—'
    },
    {
      label: 'Zones',
      value: Array.isArray(params.zones) && params.zones.length
        ? params.zones.join(', ')
        : '—'
    },
    {
      label: 'Critères actifs',
      value: Array.isArray(params.activeCriteriaKeys)
        ? String(params.activeCriteriaKeys.length)
        : '—'
    }
  ]);

  if (!occs.length) {
    const msg = document.createElement('div');
    msg.style.color = '#aaa';
    msg.style.padding = '8px 0';
    msg.textContent = "Aucune occurrence disponible pour ce snapshot.";
    panel.appendChild(msg);

    const actions = document.createElement('div');
    actions.className = 'btn-row';

    const bEdit = document.createElement('button');
    bEdit.className = 'tab-btn btn-sm';
    bEdit.textContent = 'Modifier';
    bEdit.onclick = () => openEditSavedPatternModal(rec.uid);

    const bDel = document.createElement('button');
    bDel.className = 'tab-btn btn-sm danger';
    bDel.textContent = 'Supprimer';
    bDel.onclick = () => {
      deleteSavedPattern(rec.uid);

      const tabId = `saved-${rec.uid}`;
      if (Tabbed?.openTabs?.has(tabId)) closeTab(tabId);

      const listModal = document.getElementById('saved-patterns-list-modal');
      if (listModal && listModal.style.display === 'block') {
        openSavedPatternsListModal();
      }
    };

    actions.append(bEdit, bDel);
    panel.appendChild(actions);
    return;
  }

  function compactRecurringList(items = [], { minCount = 2, maxItems = 5 } = {}) {
    return (items || [])
      .filter(item => Number(item.count || 0) >= minCount)
      .slice(0, maxItems)
      .map(item => item.label);
  }

  function compactCountRange(values = []) {
    const nums = (values || [])
      .map(v => Number(v))
      .filter(Number.isFinite);

    if (!nums.length) return '—';

    const min = Math.min(...nums);
    const max = Math.max(...nums);

    return min === max ? `${min}` : `${min}–${max}`;
  }

  const grouping = computePatternGroupingLogic(occs);
  const fragmentCounts = occs.map(ag => Number(ag.fragmentsCount || 0));
  const buildingCounts = occs.map(ag => Number(ag.buildingsCount || 0));

  appendSimpleBlock(panel, 'Structure récurrente', [
    {
      label: 'Fragments',
      value: compactCountRange(fragmentCounts)
    },
    {
      label: 'Bâtiments',
      value: compactCountRange(buildingCounts)
    },
    {
      label: 'Base',
      value: rec.sourceAgencementId || '—'
    }
  ]);

  appendSimpleBlock(panel, 'Grappes récurrentes', [
    {
      label: 'Usages',
      value: compactRecurringList(grouping.recurringTexts.usages).join(', ') || '—'
    },
    {
      label: 'Acteurs',
      value: compactRecurringList(grouping.recurringTexts.acteur_actif).join(', ') || '—'
    },
    {
      label: 'Initiateurs',
      value: compactRecurringList(grouping.recurringTexts.initiateur).join(', ') || '—'
    },
    {
      label: 'Éléments',
      value: compactRecurringList(grouping.recurringTexts.elements_spatiaux).join(', ') || '—'
    }
  ]);

  appendSimpleBlock(panel, 'Contexte / temporalités', [
    {
      label: 'Bâti',
      value: compactRecurringList(grouping.recurringBuildingStates, { maxItems: 3 }).join(', ') || '—'
    },
    {
      label: 'Fonctions',
      value: compactRecurringList(grouping.recurringBuildingFunctions, { maxItems: 3 }).join(', ') || '—'
    },
    {
      label: 'Temporalités',
      value: compactRecurringList(grouping.recurringTemporalStatuses, { maxItems: 3 }).join(', ') || '—'
    }
  ]);

  const list = document.createElement('div');
  list.className = 'pattern-members';

  const hList = document.createElement('h3');
  hList.textContent = 'Occurrences';
  list.appendChild(hList);

  const byFragId = getGalleryFragmentsById();
  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(
    allBlds.map(b => [cleanFragmentId(b.properties?.id), b])
  );

  occs.forEach(ag => {
    const row = document.createElement('div');
    row.className = 'member-row';

    const liveAg = agencementsById.get(ag.id);

    if (liveAg) {
      row.style.cursor = 'pointer';
    }

    const thumb = document.createElement('div');
    thumb.className = 'member-thumb';

    let foundPhoto = null;
    for (const fid of (ag.fragmentIds || [])) {
      const f = byFragId.get(cleanFragmentId(fid));
      if (!f) continue;

      const p = normalizePhotos(f.properties?.photos)[0];
      if (p) {
        foundPhoto = p;
        break;
      }
    }

    if (foundPhoto) {
      thumb.style.backgroundImage = `url("${foundPhoto}")`;
    }

    const right = document.createElement('div');
    right.className = 'member-right';

    const title = document.createElement('div');
    title.className = 'member-title';
    title.textContent = ag.name || ag.id;

    const info = document.createElement('div');
    info.className = 'member-info';
    info.textContent = `${ag.fragmentsCount} fragments • ${ag.buildingsCount} bâtiments`;

    right.append(title, info);
    row.append(thumb, right);

    if (liveAg) {
      row.addEventListener('click', () => {
        openTab({
          id: `ag-${liveAg.id}`,
          title: liveAg.name || liveAg.id,
          kind: 'agencement',
          render: (p) => renderAgencementPanel(p, liveAg, { byFragId, byBldId })
        });
      });
    }

    list.appendChild(row);
  });

  panel.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'btn-row';

  const bEdit = document.createElement('button');
  bEdit.className = 'tab-btn btn-sm';
  bEdit.textContent = 'Modifier';
  bEdit.onclick = () => openEditSavedPatternModal(rec.uid);

  const bDel = document.createElement('button');
  bDel.className = 'tab-btn btn-sm danger';
  bDel.textContent = 'Supprimer';
  bDel.onclick = () => {
    deleteSavedPattern(rec.uid);

    const tabId = `saved-${rec.uid}`;
    if (Tabbed?.openTabs?.has(tabId)) closeTab(tabId);

    const listModal = document.getElementById('saved-patterns-list-modal');
    if (listModal && listModal.style.display === 'block') {
      openSavedPatternsListModal();
    }
  };

  actions.append(bEdit, bDel);
  panel.appendChild(actions);
}

function openSavedAgencementsListInPanel(panel) {
  const items = loadSavedAgencements()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  panel.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = 'Agencements';
  panel.appendChild(h2);

  if (!items.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'Aucun agencement enregistré.';
    panel.appendChild(empty);
    return;
  }

  const manualItems = items.filter(x => x.origin !== 'generated');
  const generatedItems = items.filter(x => x.origin === 'generated');

  function renderSection(titleText, arr) {
    const title = document.createElement('h3');
    title.textContent = titleText;
    title.style.marginTop = '14px';
    panel.appendChild(title);

    if (!arr.length) {
      const empty = document.createElement('div');
      empty.style.color = '#888';
      empty.textContent = '— Aucun';
      panel.appendChild(empty);
      return;
    }

    arr.forEach(ag => {
      const row = document.createElement('div');
      row.className = 'member-row';

      const right = document.createElement('div');
      right.className = 'member-right';

      const title = document.createElement('div');
      title.className = 'member-title';
      title.textContent = ag.name || ag.id;

      const info = document.createElement('div');
      info.className = 'member-info';
      info.textContent = `${ag.fragmentsCount} fragments • ${ag.buildingsCount} bâtiments • ${fmtDate(ag.createdAt)}`;

      const actions = document.createElement('div');
      actions.className = 'btn-row';
      actions.style.marginTop = '6px';

      const bOpen = document.createElement('button');
      bOpen.className = 'tab-btn btn-sm primary';
      bOpen.textContent = 'Consulter';
      bOpen.onclick = (e) => {
        e.stopPropagation();
        openSavedAgencementPanel(ag.uid);
      };

      const bEdit = document.createElement('button');
      bEdit.className = 'tab-btn btn-sm';
      bEdit.textContent = 'Modifier';
      bEdit.onclick = (e) => {
        e.stopPropagation();
        openEditSavedAgencementModal(ag.uid);
      };

      const bDel = document.createElement('button');
      bDel.className = 'tab-btn btn-sm danger';
      bDel.textContent = 'Supprimer';
      bDel.onclick = (e) => {
        e.stopPropagation();
        deleteSavedAgencement(ag.uid);
        openSavedAgencementsListInPanel(panel);
        renderSavedAgencementsOnMap();

        const tabId = `saved-ag-${ag.uid}`;
        if (Tabbed?.openTabs?.has(tabId)) closeTab(tabId);
      };

      actions.append(bOpen, bEdit, bDel);
      right.append(title, info, actions);
      row.append(right);

      row.addEventListener('click', () => {
        openSavedAgencementPanel(ag.uid);
      });

      panel.appendChild(row);
    });
  }

  renderSection('Agencements créés', manualItems);
  renderSection('Agencements enregistrés', generatedItems);
}

/* ==================================================
  11) VUES FRAGMENTS
================================================== */

/* ==================================================
  11.1 Carte fragments
================================================== */

function renderFragmentsMapByTimeMode() {
  if (!fragmentLayersGroup) return;

  fragmentLayersGroup.clearLayers();
  allLayers = allLayers.filter(layer => {
    return !(layer && layer.__isFragmentLayer);
  });

  const activeZones = getActiveZones ? getActiveZones() : ['montreuil', 'mirail'];

  if (currentFragmentTimeMode === 'trajectories') {
    ['montreuil', 'mirail'].forEach(zone => {
      if (!activeZones.includes(zone)) return;

      const pairs = buildTemporalPairsForZone(zone);

      pairs.forEach(pair => {
        const featureForDisplay = pair.t2 || pair.t1;
if (!featureForDisplay) return;
if (!featureHasAnyActiveCriterion(featureForDisplay)) return;

        const styleObj = getTrajectoryStyle(pair.status, zone);

        const isPoint = isPointGeometry(featureForDisplay);

const layer = L.geoJSON(featureForDisplay, {
  pane: isPoint ? 'pane-fragments-points' : 'pane-fragments-polygons',
  pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
    pane: 'pane-fragments-points',
    radius: styleObj.radius,
    color: styleObj.color,
    weight: styleObj.weight,
    opacity: styleObj.opacity,
    fillColor: styleObj.fillColor,
    fillOpacity: styleObj.fillOpacity
  }),
  style: () => ({
    color: styleObj.color,
    weight: styleObj.weight,
    opacity: styleObj.opacity,
    fillColor: styleObj.fillColor,
    fillOpacity: styleObj.fillOpacity
  }),
  onEachFeature: (_feature, sublayer) => {
    sublayer.zone = zone;
    sublayer.__isFragmentLayer = true;
    sublayer.feature = featureForDisplay;

    allLayers.push(sublayer);

    sublayer.on('click', (ev) => {
      L.DomEvent.stopPropagation(ev);
      openTrajectoryFragmentTabs(pair);
    });
  }
});

        layer.eachLayer(l => fragmentLayersGroup.addLayer(l));
      });
    });
  } else {
  const datasets = getCurrentFragmentDatasets();

  ['montreuil', 'mirail'].forEach(zone => {
    if (!activeZones.includes(zone)) return;

    const rawFeatures = zone === 'montreuil' ? datasets.montreuil : datasets.mirail;
const features = rawFeatures.filter(featureHasAnyActiveCriterion);
    const color = getSiteColor(zone);

    const sorted = sortFeaturesForClickPriority(features);
    const pointFeatures = sorted.filter(isPointGeometry);
    const otherFeatures = sorted.filter(f => !isPointGeometry(f));

    if (otherFeatures.length) {
      const polygonsLayer = L.geoJSON(
        { type: 'FeatureCollection', features: otherFeatures },
        {
          pane: 'pane-fragments-polygons',
          style: () => ({
            color,
            weight: 0.9,
            opacity: 1,
            fillColor: color,
            fillOpacity: 0.3
          }),
          onEachFeature: (feature, sublayer) => {
            sublayer.zone = zone;
            sublayer.__isFragmentLayer = true;
            sublayer.feature = feature;

            allLayers.push(sublayer);

            sublayer.on('click', (ev) => {
              L.DomEvent.stopPropagation(ev);
              showDetails(feature.properties);
            });
          }
        }
      );

      polygonsLayer.eachLayer(l => fragmentLayersGroup.addLayer(l));
    }

    if (pointFeatures.length) {
      const pointsLayer = L.geoJSON(
        { type: 'FeatureCollection', features: pointFeatures },
        {
          pane: 'pane-fragments-points',
          pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            pane: 'pane-fragments-points',
            radius: 4,
            color,
            weight: 1,
            opacity: 1,
            fillColor: color,
            fillOpacity: 0.8
          }),
          onEachFeature: (feature, sublayer) => {
            sublayer.zone = zone;
            sublayer.__isFragmentLayer = true;
            sublayer.feature = feature;

            allLayers.push(sublayer);

            sublayer.on('click', (ev) => {
              L.DomEvent.stopPropagation(ev);
              showDetails(feature.properties);
            });
          }
        }
      );

      pointsLayer.eachLayer(l => fragmentLayersGroup.addLayer(l));
    }
  });
}
}

/* ==================================================
  11.2 Proxémie commune fragments
================================================== */


function buildSharedProxemicLayout(containerEl) {
  const rect = containerEl.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  const CX = W * 0.50;
  const CY = H * 0.53;

  const R_BASE  = Math.min(W, H) * 0.42;
  const R_INNER = R_BASE * 0.15;
  const R_OUTER = R_BASE * 0.95;

  const TWO_PI = Math.PI * 2;

  const GROUP_DETAILS = {
    PA: {
      entretien: [
        "PA_P1_intensitesoin", "PA_P1_frequencegestes", "PA_P1_degrecooperation"
      ],
      appr_spatiale: [
        "PA_P2_degretransformation", "PA_P2_perrenite", "PA_P2_autonomie"
      ],
      appr_sociale: [
        "PA_P3_intensiteusage", "PA_P3_frequenceusage", "PA_P3_diversitepublic", "PA_P3_conflitusage"
      ]
    },
    DH: {
      econ_subs: [
        "DH_P1_degreinformalite", "DH_P1_echellepratique", "DH_P1_degremutualisation"
      ],
      contest: [
        "DH_P2_degreorganisation", "DH_P2_porteepolitique", "DH_P2_effetspatial"
      ],
      symbolique: [
        "DH_P3_attachement"
      ],
      mobilites: [
        "DH_P4_intensiteflux"
      ]
    },
    FS: {
      gouvernance: [
        "FS_P1_presenceinstitutionnelle", "FS_P1_intensitecontrole"
      ],
      vacance: [
        "FS_P2_abandon"
      ],
      marche: [
        "FS_P3_pressionfonciere"
      ]
    }
  };

  const SUB_ORDER = {
    PA: ["entretien", "appr_spatiale", "appr_sociale"],
    DH: ["econ_subs", "contest", "symbolique", "mobilites"],
    FS: ["gouvernance", "vacance", "marche"]
  };

  const SUB_LABELS = {
    entretien: "Entretien / care",
    appr_spatiale: "Appropriation spatiale",
    appr_sociale: "Appropriation sociale",
    econ_subs: "Éco. de subsistance",
    contest: "Contestation / militantisme",
    symbolique: "Symbolique",
    mobilites: "Mobilités",
    gouvernance: "Cadres de gouvernance",
    vacance: "Vacance",
    marche: "Économie de marché"
  };

  const SECTORS = {
    PA: { start: -Math.PI/2, end: -Math.PI/2 + TWO_PI/3 },
    FS: { start: -Math.PI/2 + TWO_PI/3, end: -Math.PI/2 + 2*TWO_PI/3 },
    DH: { start: -Math.PI/2 + 2*TWO_PI/3, end: -Math.PI/2 + TWO_PI }
  };

  function poleCategory(sub) {
    if (SUB_ORDER.PA.includes(sub)) return "PA";
    if (SUB_ORDER.FS.includes(sub)) return "FS";
    if (SUB_ORDER.DH.includes(sub)) return "DH";
    return null;
  }

  function computeSubScores(feature) {
    const scores = {};
    for (const [zone, subs] of Object.entries(GROUP_DETAILS)) {
      for (const [subName, keys] of Object.entries(subs)) {
        let sum = 0, n = 0;
        for (const k of keys) {
          if (!ACTIVE_CRITERIA_KEYS.has(k)) continue;
          const v = parseFuzzy(feature.properties[k]);
          if (v !== null) {
            sum += v;
            n++;
          }
        }
        scores[subName] = n ? (sum / n) : null;
      }
    }
    return scores;
  }

  function angleForSub(cat, sub) {
    const order = SUB_ORDER[cat];
    const idx = order.indexOf(sub);

    if (idx === -1) {
      const s = SECTORS[cat].start, e = SECTORS[cat].end;
      return (s + e) / 2;
    }

    const s = SECTORS[cat].start;
    const e = SECTORS[cat].end;
    const slice = (e - s) / order.length;
    const subStart = s + idx * slice;
    const subEnd = subStart + slice;

    return (subStart + subEnd) / 2;
  }

  function hasAnyActiveCriterion(feature) {
    for (const k of ALL_FUZZY_KEYS) {
      if (!ACTIVE_CRITERIA_KEYS.has(k)) continue;
      if (parseFuzzy(feature.properties[k]) !== null) return true;
    }
    return false;
  }

return {
  W, H, CX, CY, R_BASE, R_INNER, R_OUTER,
  GROUP_DETAILS, SUB_ORDER, SUB_LABELS, SECTORS,
  poleCategory, computeSubScores, angleForSub
};
}


function buildFragmentProxemicNodes(
  layout,
  {
    includePatterns = false,
    sourceFeatures = null
  } = {}
) {
  const {
  CX, CY, R_INNER, R_OUTER,
  poleCategory, computeSubScores, angleForSub
} = layout;

  function getBestSubInfo(feature) {
    if (!feature || !feature.properties) return null;

    const subScores = computeSubScores(feature);

    let bestSub = null;
    let bestScore = -Infinity;

    Object.entries(subScores).forEach(([sub, val]) => {
      if (val !== null && val > bestScore) {
        bestScore = val;
        bestSub = sub;
      }
    });

    if (!bestSub) return null;

    const category = poleCategory(bestSub);
    if (!category) return null;

    return { bestSub, bestScore, category };
  }

  const raw = Array.isArray(sourceFeatures)
    ? sourceFeatures
    : [...(dataGeojson || []), ...(datamGeojson || [])];

  let features = raw
    .filter(f => f?.properties?.id)
    .filter(f => !f.properties?.isDiscourse && !f.properties?.isBuilding)
    .filter(f => isFeatureInActiveZones(f))
    .map(f => {
      f.properties = f.properties || {};
      f.properties.id = cleanFragmentId(f.properties.id);
      return f;
    })
    .filter(f => featureHasAnyActiveCriterion(f));

  if (!features.length) return [];

  const proxData = [];
  let minScore = Infinity;
  let maxScore = -Infinity;

  features.forEach(f => {
    const bestInfo = getBestSubInfo(f);
    if (!bestInfo) return;

    minScore = Math.min(minScore, bestInfo.bestScore);
    maxScore = Math.max(maxScore, bestInfo.bestScore);

    proxData.push({
      id: f.properties.id,
      feature: f,
      bestSub: bestInfo.bestSub,
      bestScore: bestInfo.bestScore,
      category: bestInfo.category,
      patterns: includePatterns ? getPatternsForFragment(f.properties.id) : [],
      trajectoryStatus: f.properties?.__trajectoryStatus || null,
      trajectoryPair: f.properties?.__trajectoryPair || null
    });
  });

  if (!proxData.length) return [];
  if (minScore === maxScore) minScore = maxScore - 1;

  proxData.forEach(d => {
    const n = (d.bestScore - minScore) / (maxScore - minScore || 1);
    const radius = R_INNER + n * (R_OUTER - R_INNER);
    const theta = angleForSub(d.category, d.bestSub);

    d.targetRadius = radius;
    d.targetTheta = theta;
    d.x = CX + radius * Math.cos(theta);
    d.y = CY + radius * Math.sin(theta);
  });

  const sim = d3.forceSimulation(proxData)
    .force("x", d3.forceX(d => d.x).strength(1))
    .force("y", d3.forceY(d => d.y).strength(1))
    .force("collide", d3.forceCollide(15))
    .stop();

  for (let i = 0; i < 200; i++) sim.tick();

  proxData.forEach(d => {
    d.x = d.x + (d.vx || 0);
    d.y = d.y + (d.vy || 0);
  });

  const hasTrajectoryData = proxData.some(d => d.trajectoryPair || d.trajectoryStatus);

  if (hasTrajectoryData) {
    proxData.forEach(d => {
      if (d.trajectoryStatus !== 'modified') return;

      const pair = d.trajectoryPair;
      const f1 = pair?.t1 || null;
      if (!f1 || !featureHasAnyActiveCriterion(f1)) return;

      const bestInfoT1 = getBestSubInfo(f1);
      if (!bestInfoT1) return;

      const n1 = (bestInfoT1.bestScore - minScore) / (maxScore - minScore || 1);
      const radius1 = R_INNER + n1 * (R_OUTER - R_INNER);
      const theta1 = angleForSub(bestInfoT1.category, bestInfoT1.bestSub);

      d.ghostX = CX + radius1 * Math.cos(theta1);
      d.ghostY = CY + radius1 * Math.sin(theta1);
      d.hasGhost = true;
    });
  }

  return proxData;
}

function drawSharedProxemicBackground(slicesLayer, labelsLayer, layout) {
  const { CX, CY, R_BASE, SUB_ORDER, SUB_LABELS, SECTORS } = layout;

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(R_BASE);

  const sectors = [
    { key: "PA", label: "Pratiques actives" },
    { key: "FS", label: "Forces structurantes" },
    { key: "DH", label: "Dynamiques hybrides" }
  ];

  slicesLayer.selectAll("path.sector")
    .data(sectors)
    .join("path")
    .attr("class", "sector")
    .attr("d", d => arc({
      startAngle: SECTORS[d.key].start + Math.PI / 2,
      endAngle: SECTORS[d.key].end + Math.PI / 2
    }))
    .attr("transform", `translate(${CX},${CY})`)
    .style("fill", "none")
    .style("stroke", "rgba(255,255,255,0.45)")
    .style("stroke-width", 2);

  sectors.forEach(s => {
    const cat = s.key;
    const list = SUB_ORDER[cat];
    if (!list) return;

    const slice = (SECTORS[cat].end - SECTORS[cat].start) / list.length;

    for (let i = 1; i < list.length; i++) {
      const ang = SECTORS[cat].start + i * slice;

      slicesLayer.append("line")
        .attr("x1", CX)
        .attr("y1", CY)
        .attr("x2", CX + R_BASE * Math.cos(ang))
        .attr("y2", CY + R_BASE * Math.sin(ang))
        .style("stroke", "rgba(255,255,255,0.25)")
        .style("stroke-width", 1);
    }
  });

  const R_LABEL = R_BASE * 1.12;
  const R_LABEL_MAIN = R_BASE * 1.32;

  sectors.forEach(s => {
    const ang = (SECTORS[s.key].start + SECTORS[s.key].end) / 2;
    const x = CX + R_LABEL_MAIN * Math.cos(ang);
    const y = CY + R_LABEL_MAIN * Math.sin(ang);

    let deg = (ang * 180 / Math.PI) + 90;
    if (deg > 90 && deg < 270) deg += 180;

    labelsLayer.append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("transform", `rotate(${deg}, ${x}, ${y})`)
      .text(s.label)
      .style("fill", "#fff")
      .style("font-size", "22px")
      .style("font-weight", "900")
      .style("text-anchor", "middle")
      .style("pointer-events", "none");
  });

  Object.entries(SUB_ORDER).forEach(([cat, subs]) => {
    subs.forEach(sub => {
      const ang = layout.angleForSub(cat, sub);
      const x = CX + R_LABEL * Math.cos(ang);
      const y = CY + R_LABEL * Math.sin(ang);

      let deg = (ang * 180 / Math.PI) + 90;
      if (deg > 90 && deg < 270) deg += 180;

      labelsLayer.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("transform", `rotate(${deg}, ${x}, ${y})`)
        .text(SUB_LABELS[sub] || sub)
        .style("fill", "#fff")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("text-anchor", "middle")
        .style("pointer-events", "none");
    });
  });

  return { slicesLayer, labelsLayer };
}

function createSharedProxemicScene(
  containerEl,
  {
    includePatterns = false,
    sourceFeatures = null,
    layerOrder = ['slicesLayer', 'nodesLayer', 'labelsLayer']
  } = {}
) {
  const layout = buildSharedProxemicLayout(containerEl);

  const proxData = buildFragmentProxemicNodes(layout, {
    includePatterns,
    sourceFeatures
  });

  if (!proxData.length) {
    return {
      layout,
      proxData: [],
      svg: null,
      world: null,
      layers: {}
    };
  }

  const { W, H } = layout;

  const svg = d3.select(containerEl)
    .append("svg")
    .attr("width", W)
    .attr("height", H);

  const world = svg.append("g");
  const layers = {};

  layerOrder.forEach(name => {
    layers[name] = world.append("g");
  });

  if (!layers.slicesLayer) {
    layers.slicesLayer = world.insert("g", ":first-child");
  }

  if (!layers.labelsLayer) {
    layers.labelsLayer = world.append("g");
  }

  drawSharedProxemicBackground(
    layers.slicesLayer,
    layers.labelsLayer,
    layout
  );

  svg.call(
    d3.zoom()
      .scaleExtent([0.4, 4])
      .on("zoom", ev => world.attr("transform", ev.transform))
  );

  return {
    layout,
    proxData,
    svg,
    world,
    layers
  };
}

/* ==================================================
  11.3 Proxémie fragments seule
================================================== */

function showFragmentProxemicView() {
  fragmentProxemicView.innerHTML = "";

  const sourceFeatures = getFragmentProxemicSourceFeatures(currentFragmentTimeMode);

  const scene = createSharedProxemicScene(fragmentProxemicView, {
    includePatterns: false,
    sourceFeatures,
    layerOrder: ['slicesLayer', 'trajectoryLayer', 'nodesLayer', 'labelsLayer']
  });

  const { proxData, svg, layers } = scene;
  const { trajectoryLayer, nodesLayer } = layers;

  if (!proxData.length) {
    fragmentProxemicView.innerHTML = "<div style='color:#aaa;padding:10px'>Aucun fragment.</div>";
    return;
  }

  function getProxemicNodeStyle(d) {
    if (currentFragmentTimeMode !== 'trajectories') {
      return {
        fill: '#fff',
        fillOpacity: 1,
        stroke: '#222',
        strokeOpacity: 1
      };
    }

    const zone = d?.feature?.properties?.zone || d?.trajectoryPair?.zone || 'montreuil';
    const status = d?.trajectoryStatus || 'identical';
    const style = getTrajectoryStyle(status, zone);

    return {
      fill: style.fillColor,
      fillOpacity: style.fillOpacity,
      stroke: style.color,
      strokeOpacity: style.opacity
    };
  }

  if (currentFragmentTimeMode === 'trajectories') {
    const ghostData = proxData.filter(d => d.hasGhost);

    trajectoryLayer.selectAll("line.fragment-trajectory")
      .data(ghostData)
      .join("line")
      .attr("class", "fragment-trajectory")
      .attr("x1", d => d.ghostX)
      .attr("y1", d => d.ghostY)
      .attr("x2", d => d.x)
      .attr("y2", d => d.y)
      .style("stroke", d => {
        const zone = d?.feature?.properties?.zone || 'montreuil';
        return getTrajectoryStyle('modified', zone).color;
      })
      .style("stroke-width", 1.5)
      .style("stroke-dasharray", "4 4")
      .style("opacity", 0.9)
      .style("pointer-events", "none");

    trajectoryLayer.selectAll("circle.fragment-ghost")
      .data(ghostData)
      .join("circle")
      .attr("class", "fragment-ghost")
      .attr("cx", d => d.ghostX)
      .attr("cy", d => d.ghostY)
      .attr("r", 8)
      .style("fill", "none")
      .style("stroke", d => {
        const zone = d?.feature?.properties?.zone || 'montreuil';
        return getTrajectoryStyle('modified', zone).color;
      })
      .style("stroke-width", 1.4)
      .style("stroke-opacity", 0.65)
      .style("pointer-events", "none");
  }

  const nodes = nodesLayer.selectAll("g.node")
    .data(proxData)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  nodes.append("circle")
    .attr("r", 8)
    .style("fill", d => getProxemicNodeStyle(d).fill)
    .style("fill-opacity", d => getProxemicNodeStyle(d).fillOpacity)
    .style("stroke", d => getProxemicNodeStyle(d).stroke)
    .style("stroke-opacity", d => getProxemicNodeStyle(d).strokeOpacity)
    .style("stroke-width", 1.2)
    .style("cursor", "pointer");

  nodes.append("text")
    .text(d => d.id)
    .attr("dy", "0.35em")
    .style("text-anchor", "middle")
    .style("font-size", "7px")
    .style("font-weight", "bold")
    .style("pointer-events", "none");

  let selected = null;

  function highlight(id) {
    nodes.style("opacity", n => n.id === id ? 1 : 0.15);

    if (currentFragmentTimeMode === 'trajectories') {
      trajectoryLayer.selectAll("line.fragment-trajectory, circle.fragment-ghost")
        .style("opacity", d => d.id === id ? 1 : 0.12);
    }
  }

  function reset() {
    if (selected) return;
    nodes.style("opacity", 1);

    if (currentFragmentTimeMode === 'trajectories') {
      trajectoryLayer.selectAll("line.fragment-trajectory")
        .style("opacity", 0.9);

      trajectoryLayer.selectAll("circle.fragment-ghost")
        .style("opacity", 1);
    }
  }

  nodes
    .on("mouseenter", function(ev, d) {
      if (selected) return;
      highlight(d.id);
    })
    .on("mouseleave", function() {
      if (selected) return;
      reset();
    })
    .on("click", (ev, d) => {
      ev.stopPropagation();

      if (unitCreation.active && unitCreation.mode === 'proxemic') {
        const fragId = d?.feature?.properties?.id || d?.id;
        const list = d?.patterns?.length ? d.patterns : getPatternsForFragment(fragId);

        const chosen = choosePatternKeyFromList(
          list,
          'Choisis le pattern à isoler dans Unité de projet :'
        );

        if (!chosen) return;

        handleUnitSelection(d.feature, chosen);
        return;
      }

      if (selected === d.id) {
        selected = null;
        reset();
      } else {
        selected = d.id;
        highlight(d.id);
      }

      if (currentFragmentTimeMode === 'trajectories' && d.trajectoryPair) {
        openTrajectoryFragmentTabs(d.trajectoryPair);
      } else {
        openFragmentWithPatternsTabs(d.feature.properties);
      }
    });

  svg.on("click", () => {
    selected = null;
    reset();
  });
}

function openTrajectoryFragmentTabs(pair) {
  if (!pair) return;

  clearAllTabbedTabs();
  closeSidebars();

  if (pair.t1) {
    openTab({
      id: `frag-${pair.id}-T1`,
      title: `${pair.id} · T1`,
      kind: 'fragment',
      render: (panel) => renderFragmentPanel(panel, pair.t1.properties)
    });
  }

  if (pair.t2) {
    openTab({
      id: `frag-${pair.id}-T2`,
      title: `${pair.id} · T2`,
      kind: 'fragment',
      render: (panel) => renderFragmentPanel(panel, pair.t2.properties)
    });
  }

  if (pair.t1) focusTab(`frag-${pair.id}-T1`);
  else if (pair.t2) focusTab(`frag-${pair.id}-T2`);
}

/* ==================================================
  12) VUE GALERIE
================================================== */

function getGalleryFragmentsById() {
  const source =
    currentPatternGalleryTimeMode === 'T2'
      ? [...(dataGeojsonT2 || []), ...(datamGeojsonT2 || [])]
      : [...(dataGeojsonT1 || []), ...(datamGeojsonT1 || [])];

  return new Map(
    source
      .filter(f => !f.properties?.isDiscourse && !f.properties?.isBuilding)
      .map(f => [cleanFragmentId(f.properties?.id), f])
  );
}

function getAgencementFragments(ag, byFragId) {
  return (ag?.fragmentIds || [])
    .map(fid => byFragId.get(cleanFragmentId(fid)))
    .filter(Boolean);
}

function getAgencementBuildings(ag, byBldId) {
  return (ag?.buildingIds || [])
    .map(bid => byBldId.get(String(bid).trim()))
    .filter(Boolean);
}

function buildGalleryFragmentCard(f, ag, byFragId, byBldId) {
  const card = document.createElement('div');
  card.className = 'gallery-fragment-card';

  const photos = normalizePhotos(f?.properties?.photos);
  const firstPhoto = photos[0] || null;

  const media = document.createElement('div');
  media.className = 'gallery-fragment-media';

  if (firstPhoto) {
    const img = makeImg(firstPhoto, f?.properties?.name || f?.properties?.id || 'fragment');
    if (img) media.appendChild(img);
  } else {
    media.classList.add('is-empty');
    media.textContent = 'Sans image';
  }

  const caption = document.createElement('div');
  caption.className = 'gallery-fragment-caption';

  const fragTitle = document.createElement('div');
  fragTitle.className = 'gallery-fragment-title';
  fragTitle.textContent = f?.properties?.id || 'Fragment';

  const fragName = document.createElement('div');
  fragName.className = 'gallery-fragment-name';
  fragName.textContent = f?.properties?.name || '';

  caption.append(fragTitle, fragName);
  card.append(media, caption);

  card.addEventListener('click', () => {
    openTab({
      id: `ag-${ag.id}`,
      title: ag.name || ag.id,      kind: 'agencement',
      render: (p) => renderAgencementPanel(p, ag, { byFragId, byBldId })
    });
  });

  return card;
}

function buildGalleryBuildingsCell(ag, byBldId) {
  const cell = document.createElement('div');
  cell.className = 'gallery-buildings-cell';

  const title = document.createElement('div');
  title.className = 'gallery-buildings-title';
  title.textContent = 'Bâtiments';

  const list = document.createElement('div');
  list.className = 'gallery-buildings-list';

  const buildings = getAgencementBuildings(ag, byBldId);

  if (!buildings.length) {
    const empty = document.createElement('div');
    empty.className = 'gallery-building-line is-empty';
    empty.textContent = '— Aucun bâtiment';
    list.appendChild(empty);
  } else {
    buildings.forEach(b => {
      const props = b?.properties || {};
      const line = document.createElement('div');
      line.className = 'gallery-building-line';

      const bid = props.id || '—';
      const fonction = props.fonction || props['fonction'] || '—';
      const etat = props['état'] || props.etat || '—';

      line.textContent = `${bid} — ${fonction} — ${etat}`;
      list.appendChild(line);
    });
  }

  cell.append(title, list);
  return cell;
}

function buildGalleryDiscoursesCell(ag) {
  const cell = document.createElement('div');
  cell.className = 'gallery-buildings-cell';

  const title = document.createElement('div');
  title.className = 'gallery-buildings-title';
  title.textContent = 'Discours associés';

  const list = document.createElement('div');
  list.className = 'gallery-buildings-list';

  const discourseMap = new Map();

  (ag?.fragmentIds || []).forEach(fid => {
    getDiscoursesForFragment(fid).forEach(feature => {
      const did = String(feature?.properties?.id || '').trim().toUpperCase();
      if (did) discourseMap.set(did, feature);
    });
  });

  (ag?.buildingIds || []).forEach(bid => {
    getDiscoursesForBuilding(bid).forEach(feature => {
      const did = String(feature?.properties?.id || '').trim().toUpperCase();
      if (did) discourseMap.set(did, feature);
    });
  });

  const discourses = Array.from(discourseMap.values()).sort((a, b) => {
    const aId = String(a?.properties?.id || '');
    const bId = String(b?.properties?.id || '');
    return aId.localeCompare(bId, undefined, { numeric: true });
  });

  if (!discourses.length) {
    const empty = document.createElement('div');
    empty.className = 'gallery-building-line is-empty';
    empty.textContent = '— Aucun discours';
    list.appendChild(empty);
  } else {
    discourses.forEach(feature => {
      const props = feature?.properties || {};

      const line = document.createElement('div');
      line.className = 'gallery-building-line';
      line.style.cursor = 'pointer';
      line.textContent = `${props.id || '—'} — ${props.auteur || '—'} — ${props.source || '—'}`;

      line.addEventListener('click', () => {
        openDiscourseFromFeature(feature);
      });

      list.appendChild(line);
    });
  }

  cell.append(title, list);
  return cell;
}

function getFragmentSimilarityScore(fa, fb) {
  if (!fa || !fb) return -1;
  const va = featureToVector(fa);
  const vb = featureToVector(fb);
  return similarityFuzzy(va, vb);
}

function orderFragmentsByReference(referenceFrags, candidateFrags) {
  const remaining = [...candidateFrags];
  const ordered = [];

  // 1) on aligne d'abord sur les fragments de référence
  referenceFrags.forEach(refFrag => {
    if (!remaining.length) {
      ordered.push(null);
      return;
    }

    let bestIdx = -1;
    let bestScore = -1;

    remaining.forEach((candFrag, idx) => {
      const s = getFragmentSimilarityScore(refFrag, candFrag);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = idx;
      }
    });

    if (bestIdx >= 0) {
      ordered.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    } else {
      ordered.push(null);
    }
  });

  // 2) puis on ajoute les fragments restants à la fin
  return ordered.concat(remaining);
}

function buildAlignedFragmentsByAgencement(occs, byFragId) {
  const rawLists = occs.map(ag => getAgencementFragments(ag, byFragId));

  if (!rawLists.length) return [];

  // colonne de référence = premier agencement du pattern
  const reference = rawLists[0] || [];

  return rawLists.map((fragList, idx) => {
    if (idx === 0) return [...fragList]; // la référence garde son ordre
    return orderFragmentsByReference(reference, fragList);
  });
}

function showGalleryView() {
  const gallery = document.getElementById('gallery-view');
  gallery.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'gallery-wrapper';
  gallery.appendChild(wrapper);

  const patternsEntries = Object.entries(patterns || {});
  if (!patternsEntries.length) {
    const msg = document.createElement('div');
    msg.style.color = '#aaa';
    msg.style.padding = '10px';
    msg.textContent = "Aucun pattern trouvé avec le seuil de similarité actuel.";
    gallery.appendChild(msg);
    return;
  }

  const byFragId = getGalleryFragmentsById();

  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(
    allBlds.map(b => [cleanFragmentId(b.properties?.id), b])
  );

  patternsEntries.forEach(([pKey, pData]) => {
    const occIds = (pData?.occurrences || []).slice();
    const occs = occIds
      .map(id => agencementsById.get(id))
      .filter(Boolean)
      .sort(sortAgencementsById);

    if (!occs.length) return;

    const block = document.createElement('section');
    block.className = 'pattern-block';

    const title = document.createElement('h3');
    title.className = 'pattern-title';
    title.textContent = `${pKey} — ${occs.length} agencements`;

    const table = document.createElement('div');
    table.className = 'gallery-table';

    // En-tête colonnes
    const head = document.createElement('div');
    head.className = 'gallery-head';

    occs.forEach(ag => {
      const headCell = document.createElement('div');
      headCell.className = 'gallery-head-cell';
      headCell.innerHTML = `<strong>${ag.name || ag.id}</strong><br>${ag.fragmentsCount} fragments`;      head.appendChild(headCell);
    });

    table.appendChild(head);

    // Prépare fragments par agencement
 const fragmentsByAg = buildAlignedFragmentsByAgencement(occs, byFragId);
const maxRows = Math.max(...fragmentsByAg.map(arr => arr.filter(Boolean).length), 0);

const colTemplate = `repeat(${occs.length}, minmax(240px, 320px))`;
head.style.gridTemplateColumns = colTemplate;

const body = document.createElement('div');
body.className = 'gallery-body';

for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
  const row = document.createElement('div');
  row.className = 'gallery-row';
  row.style.gridTemplateColumns = colTemplate;

  occs.forEach((ag, colIndex) => {
    const cell = document.createElement('div');
    cell.className = 'gallery-cell';

    const frag = fragmentsByAg[colIndex][rowIndex];

    if (frag) {
      cell.appendChild(buildGalleryFragmentCard(frag, ag, byFragId, byBldId));
    } else {
      cell.classList.add('is-empty');
    }

    row.appendChild(cell);
  });

  body.appendChild(row);
}

table.appendChild(body);

// Ligne bâtiments
const buildingsRow = document.createElement('div');
buildingsRow.className = 'gallery-buildings-row';
buildingsRow.style.gridTemplateColumns = colTemplate;

occs.forEach(ag => {
  const bCellWrap = document.createElement('div');
  bCellWrap.className = 'gallery-buildings-wrap';
  bCellWrap.appendChild(buildGalleryBuildingsCell(ag, byBldId));
  buildingsRow.appendChild(bCellWrap);
});

table.appendChild(buildingsRow);

// Ligne discours
const discoursesRow = document.createElement('div');
discoursesRow.className = 'gallery-buildings-row';
discoursesRow.style.gridTemplateColumns = colTemplate;

occs.forEach(ag => {
  const dCellWrap = document.createElement('div');
  dCellWrap.className = 'gallery-buildings-wrap';
  dCellWrap.appendChild(buildGalleryDiscoursesCell(ag));
  discoursesRow.appendChild(dCellWrap);
});

table.appendChild(discoursesRow);

    block.append(title, table);
    wrapper.appendChild(block);
  });
}


/* ==================================================
  13) VUES PATTERNS — PROXÉMIE ET CARTE 
================================================== */

/* ==================================================
  13.1 Ouverture croisée fragment / pattern
================================================== */

// Ouvre l’onglet fragment + tous ses patterns associés
function openFragmentWithPatternsTabs(fProps) {
  if (!fProps) return;

  closeSidebars();

  const fragId = fProps.id || Math.random().toString(36).slice(2);
  const fragTabId = `frag-${fragId}`;

  // 1) Onglet fragment
  openTab({
    id: fragTabId,
    title: fProps.id || 'Fragment',
    kind: 'fragment',
    render: (panel) => renderFragmentPanel(panel, fProps)
  });

  // 2) Onglets patterns associés
  const pList = getPatternsForFragment(fragId);
  pList.forEach(pName => {
    const pData = patterns[pName];
    if (!pData) return;
    openTab({
      id: `pattern-${pName}`,
      title: pName,
      kind: 'pattern',
      render: (panel) => renderPatternPanel(panel, pName, pData)
    });
  });

  // 3) On remet le focus sur le fragment
  focusTab(fragTabId);
}

function choosePatternKeyFromList(list, messagePrefix = 'Ce fragment appartient à plusieurs patterns :') {
  if (!list || list.length === 0) return null;
  if (list.length === 1) return list[0];

  const msg = messagePrefix + '\n' + list.map((p,i)=>`${i+1}) ${p}`).join('\n') + '\nTape le numéro :';
  const ans = window.prompt(msg, '1');
  const idx = parseInt(ans, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > list.length) return null;
  return list[idx - 1];
}

/* ==================================================
  13.2 Proxémie patterns
================================================== */

function showProxemicView() {
  if (currentPatternMode === 'agencements') {
    return showAgencementSelectionProxemicView();
  }

  proxemicView.innerHTML = "";
  proxemicView.style.position = proxemicView.style.position || "relative";

const sourceFeatures = getFragmentProxemicSourceFeatures(currentFragmentTimeMode);

const scene = createSharedProxemicScene(proxemicView, {
  includePatterns: true,
  sourceFeatures,
  layerOrder: ['slicesLayer', 'trajectoryLayer', 'contoursLayer', 'linksLayer', 'nodesLayer', 'labelsLayer']
});

const { proxData, svg, layers } = scene;
const { trajectoryLayer, contoursLayer, linksLayer, nodesLayer } = layers;

  if (!proxData.length) {
    proxemicView.innerHTML = "<div style='color:#aaa;padding:10px'>Aucun fragment.</div>";
    return;
  }


  function getProxemicNodeStyle(d) {
  if (currentFragmentTimeMode !== 'trajectories') {
    return {
      fill: '#fff',
      fillOpacity: 1,
      stroke: '#222',
      strokeOpacity: 1
    };
  }

  const zone = d?.feature?.properties?.zone || d?.trajectoryPair?.zone || 'montreuil';
  const status = d?.trajectoryStatus || 'identical';
  const style = getTrajectoryStyle(status, zone);

  return {
    fill: style.fillColor,
    fillOpacity: style.fillOpacity,
    stroke: style.color,
    strokeOpacity: style.opacity
  };
}

if (currentFragmentTimeMode === 'trajectories') {
  const ghostData = proxData.filter(d => d.hasGhost);

  trajectoryLayer.selectAll("line.fragment-trajectory")
    .data(ghostData)
    .join("line")
    .attr("class", "fragment-trajectory")
    .attr("x1", d => d.ghostX)
    .attr("y1", d => d.ghostY)
    .attr("x2", d => d.x)
    .attr("y2", d => d.y)
    .style("stroke", d => {
      const zone = d?.feature?.properties?.zone || 'montreuil';
      return getTrajectoryStyle('modified', zone).color;
    })
    .style("stroke-width", 1.5)
    .style("stroke-dasharray", "4 4")
    .style("opacity", 0.9)
    .style("pointer-events", "none");

  trajectoryLayer.selectAll("circle.fragment-ghost")
    .data(ghostData)
    .join("circle")
    .attr("class", "fragment-ghost")
    .attr("cx", d => d.ghostX)
    .attr("cy", d => d.ghostY)
    .attr("r", 8)
    .style("fill", "none")
    .style("stroke", d => {
      const zone = d?.feature?.properties?.zone || 'montreuil';
      return getTrajectoryStyle('modified', zone).color;
    })
    .style("stroke-width", 1.4)
    .style("stroke-opacity", 0.65)
    .style("pointer-events", "none");
}


  const diffTip = d3.select(proxemicView)
    .append("div")
    .attr("class", "diff-tooltip")
    .style("position", "absolute")
    .style("display", "none")
    .style("pointer-events", "none")
    .style("z-index", "9999");

  function moveDiffTip(ev) {
    const rect = proxemicView.getBoundingClientRect();
    let x = (ev.clientX - rect.left) + 12;
    let y = (ev.clientY - rect.top) + 12;

    const maxX = rect.width - 340;
    if (x > maxX) x = Math.max(8, maxX);

    diffTip.style("left", x + "px").style("top", y + "px");
  }

  const TOOLTIP_MIN_DIVERGENCE = 0.20;

  function showDiffTip(ev, d) {
    const aId = d.source?.id || "—";
    const bId = d.target?.id || "—";

    const diffs = (d.topDiffs || []).filter(item => {
      const delta = (item.delta != null)
        ? item.delta
        : (() => {
            if (item.a == null && item.b == null) return 0;
            if (item.a == null || item.b == null) return 1;

            if (Array.isArray(item.a) && Array.isArray(item.b)) {
              return 1 - jaccardSimilarity(item.a, item.b);
            }

            return Math.abs(item.a - item.b);
          })();

      return delta >= TOOLTIP_MIN_DIVERGENCE;
    });

    const listHtml = diffs.map(item => {
      const label = prettyKey(item.key);
      const a = fmtAny(item.a);
      const b = fmtAny(item.b);
      return `<li><span class="k">${label}</span> : <span class="v">${a}</span> vs <span class="v">${b}</span></li>`;
    }).join("");

    diffTip.html(`
      <div class="dt-title">Diffraction : ${aId} ↔ ${bId}</div>
      <div class="dt-sub">Pattern ${d.pattern || "—"}</div>
      <ul class="dt-list">${listHtml || "<li>—</li>"}</ul>
    `);

    diffTip.style("display", "block");
    moveDiffTip(ev);
  }

  function hideDiffTip() {
    diffTip.style("display", "none");
  }

  const nodeById = new Map(
    proxData.map(d => [cleanFragmentId(d.id), d])
  );

  drawPatternOccurrenceContoursInProxemic(contoursLayer, nodeById);

const linksData = [];
const linkSeen = new Set();
const nodesByPattern = new Map();

proxData.forEach(node => {
  (node.patterns || []).forEach(p => {
    if (!nodesByPattern.has(p)) nodesByPattern.set(p, []);
    nodesByPattern.get(p).push(node);
  });
});

nodesByPattern.forEach((nodesInPattern, pKey) => {
  for (let i = 0; i < nodesInPattern.length; i++) {
    for (let j = i + 1; j < nodesInPattern.length; j++) {
      const A = nodesInPattern[i];
      const B = nodesInPattern[j];

      const pairKey =
        A.id < B.id ? `${A.id}__${B.id}` : `${B.id}__${A.id}`;

      if (linkSeen.has(pairKey)) continue;
      linkSeen.add(pairKey);

      linksData.push({
        source: A,
        target: B,
        color: colorForPattern ? colorForPattern(pKey) : "#888",
        dashed: false,
        opacity: 0.25
      });
    }
  }
});

  if (SHOW_DIFFRACTIONS) {
    const all = [...(dataGeojson || []), ...(datamGeojson || [])];
    const byId = new Map(all.map(f => [String(f.properties.id).trim().toUpperCase(), f]));
    const byIdNode = new Map(proxData.map(n => [n.id, n]));

    const diffEdges = computeInternalDiffractionEdges(patterns, byId, { topK: 1 });

    diffEdges.forEach(e => {
      const A = byIdNode.get(e.a);
      const B = byIdNode.get(e.b);
      if (!A || !B) return;

      const vecA = featureToVector(A.feature);
      const vecB = featureToVector(B.feature);
      const topDiffs = topVectorDifferences(vecA, vecB, { topN: 3 });

      linksData.push({
        source: A,
        target: B,
        color: colorForPattern ? colorForPattern(e.pattern) : "#fff",
        dashed: true,
        opacity: 0.45,
        pattern: e.pattern,
        opposition: e.opposition,
        comparability: e.comparability,
        common: e.common,
        mismatch: e.mismatch,
        topDiffs
      });
    });
  }

  const HIT_WIDTH_DASHED = 14;
  const HIT_WIDTH_NORMAL = 0;

  const hitSel = linksLayer.selectAll("line.link-hit")
    .data(linksData)
    .join("line")
    .attr("class", "link-hit")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .style("stroke", "transparent")
    .style("stroke-width", d => d.dashed ? HIT_WIDTH_DASHED : HIT_WIDTH_NORMAL)
    .style("pointer-events", d => d.dashed ? "stroke" : "none");

  linksLayer.selectAll("line.link")
    .data(linksData)
    .join("line")
    .attr("class", "link")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .style("stroke", d => d.color)
    .style("stroke-width", d => d.dashed ? 2.5 : 2)
    .style("opacity", d => (d.opacity != null ? d.opacity : 0.25))
    .style("stroke-dasharray", d => d.dashed ? "6 6" : null)
    .style("pointer-events", "none");

  hitSel
    .on("mouseenter", (ev, d) => {
      if (!SHOW_DIFFRACTIONS || !d.dashed) return;
      showDiffTip(ev, d);
    })
    .on("mousemove", (ev, d) => {
      if (!SHOW_DIFFRACTIONS || !d.dashed) return;
      moveDiffTip(ev);
    })
    .on("mouseleave", (ev, d) => {
      if (!d.dashed) return;
      hideDiffTip();
    });

  const nodes = nodesLayer.selectAll("g.node")
    .data(proxData)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

  nodes.each(function(d) {
    if (!d.patterns) return;

    d.patterns.slice()
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
      .forEach((p, i) => {
        d3.select(this).append("circle")
          .attr("r", 11 + i * 3)
          .style("fill", "none")
          .style("stroke", colorForPattern ? colorForPattern(p) : "#999")
          .style("stroke-width", 2)
          .style("pointer-events", "none");
      });
  });

  nodes.append("circle")
  .attr("r", 8)
  .style("fill", d => getProxemicNodeStyle(d).fill)
  .style("fill-opacity", d => getProxemicNodeStyle(d).fillOpacity)
  .style("stroke", d => getProxemicNodeStyle(d).stroke)
  .style("stroke-opacity", d => getProxemicNodeStyle(d).strokeOpacity)
  .style("stroke-width", 1.2)
  .style("cursor", "pointer")
    .on("click", (ev, d) => {
      ev.stopPropagation();
      openFragmentWithPatternsTabs(d.feature.properties);
    });

  nodes.append("text")
    .text(d => d.id)
    .attr("dy", "0.35em")
    .style("text-anchor", "middle")
    .style("font-size", "7px")
    .style("font-weight", "bold")
    .style("pointer-events", "none");

  let selected = null;

function highlight(id) {
  linksLayer.selectAll("line.link")
    .style("opacity", d => (d.source.id === id || d.target.id === id) ? 0.9 : 0.05);

  const connected = new Set([id]);
  linksData.forEach(L => {
    if (L.source.id === id) connected.add(L.target.id);
    if (L.target.id === id) connected.add(L.source.id);
  });

  nodes.style("opacity", n => connected.has(n.id) ? 1 : 0.1);

  if (currentFragmentTimeMode === 'trajectories') {
    trajectoryLayer.selectAll("line.fragment-trajectory, circle.fragment-ghost")
      .style("opacity", d => d.id === id ? 1 : 0.12);
  }
}

function reset() {
  if (selected) return;
  nodes.style("opacity", 1);
  linksLayer.selectAll("line.link")
    .style("opacity", 0.25);

  if (currentFragmentTimeMode === 'trajectories') {
    trajectoryLayer.selectAll("line.fragment-trajectory")
      .style("opacity", 0.9);

    trajectoryLayer.selectAll("circle.fragment-ghost")
      .style("opacity", 1);
  }
}

  nodes
    .on("mouseenter", function(ev, d) {
      if (selected) return;
      highlight(d.id);
    })
    .on("mouseleave", function() {
      if (selected) return;
      reset();
    })
    .on("click", function(ev, d) {
      ev.stopPropagation();

      if (selected === d.id) {
        selected = null;
        reset();
      } else {
        selected = d.id;
        highlight(d.id);
      }

      openFragmentWithPatternsTabs(d.feature.properties);
    });

  svg.on("click", () => {
    selected = null;
    reset();
  });
}

/* ==================================================
  13.3 Carte patterns — couleur, init, rendu
================================================== */

function colorForPattern(pName) {
  const key = String(pName || '').trim().toUpperCase();

  // 1) Couleur explicitement déclarée (prioritaire)
  if (PATTERN_COLORS[key]) return PATTERN_COLORS[key];

  // 2) Support P12 / D12 (numérique stable)
  const m = key.match(/^([PD])(\d+)$/);
  if (m) {
    const prefix = m[1];              // 'P' ou 'D'
    const n = parseInt(m[2], 10);     // numéro
    if (Number.isFinite(n)) {
      // Option A (recommandée) : décaler D pour ne pas réutiliser exactement les mêmes couleurs que P
      const offset = (prefix === 'D') ? 50 : 0;  // ajuste 50 si tu veux plus/moins d’écart
      const idx = (((n - 1 + offset) % 100) + 1);
      const pKey = `P${idx}`; // on réutilise le nuancier P existant
      return PATTERN_COLORS[pKey] || `hsl(${(idx * 37) % 360}, 90%, 55%)`;
    }
  }

  // 3) Fallback hash (stable)
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 90%, 55%)`;
}
window.colorForPattern = colorForPattern;


function initPatternMapOnce() {
  if (patternMap) return;

  patternMap = L.map('patterns-map', { zoomControl: true, attributionControl: true })
    .setView(montreuilView, montreuilZoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, © CartoDB'
  }).addTo(patternMap);

  // panes : TOUJOURS les créer avant getPane(...)
patternMap.createPane('pane-pattern-buildings');
patternMap.getPane('pane-pattern-buildings').style.zIndex = 410;

patternMap.createPane('pane-pattern-base-polygons');
patternMap.getPane('pane-pattern-base-polygons').style.zIndex = 420;

patternMap.createPane('pane-pattern-base-points');
patternMap.getPane('pane-pattern-base-points').style.zIndex = 430;

  patternMap.createPane('pane-pattern-members-buildings');
  patternMap.getPane('pane-pattern-members-buildings').style.zIndex = 500;

  patternMap.createPane('pane-pattern-members-polygons');
  patternMap.getPane('pane-pattern-members-polygons').style.zIndex = 560;

  patternMap.createPane('pane-pattern-members-points');
  patternMap.getPane('pane-pattern-members-points').style.zIndex = 620;

  patternMap.createPane('pane-pattern-contours');
  patternMap.getPane('pane-pattern-contours').style.zIndex = 650;

  patternBaseLayer = L.layerGroup().addTo(patternMap);
  patternBuildingsLayer = L.layerGroup().addTo(patternMap);
  patternMembersLayer = L.layerGroup().addTo(patternMap);
  patternOverlayGroup = L.layerGroup().addTo(patternMap);
  savedAgencementsLayer = L.layerGroup().addTo(patternMap);

  fetch('data/contour.geojson')
  .then(r => r.json())
  .then(contour => {
    L.geoJSON(contour, {
      style: { color: '#919090', weight: 2, opacity: 0.8, fillOpacity: 0 },
      pane: 'pane-pattern-base-polygons',
      interactive: false
    }).addTo(patternMap);
  });
}

function renderSavedAgencementsOnMap() {
  if (!patternMap || !savedAgencementsLayer) return;

  // IMPORTANT : si la couche a été retirée auparavant, on la remet
  if (!patternMap.hasLayer(savedAgencementsLayer)) {
    savedAgencementsLayer.addTo(patternMap);
  }

  savedAgencementsLayer.clearLayers();

  const items = loadSavedAgencements();

  items.forEach(ag => {
    if (ag.contour && ag.contour.length >= 4) {
      const latlngs = ag.contour.map(([lat, lng]) => L.latLng(lat, lng));

      const poly = L.polygon(latlngs, {
        pane: 'pane-pattern-contours',
        color: '#ffffff',
        weight: 2,
        opacity: 0.95,
        fillColor: '#ffffff',
        fillOpacity: 0.05,
        dashArray: '6 4'
      });

      poly.on('click', () => {
        openSavedAgencementPanel(ag.uid);
      });

      poly.bindTooltip(
        `<strong>${ag.name}</strong><br>${ag.fragmentsCount} fragments • ${ag.buildingsCount} bâtiments`,
        {
          sticky: true,
          direction: 'top',
          opacity: 1
        }
      );

      poly.addTo(savedAgencementsLayer);
    }
  });
}

function hidePatternLayers() {
  if (!patternMap) return;

  if (patternOverlayGroup) {
    patternOverlayGroup.clearLayers();
    if (patternMap.hasLayer(patternOverlayGroup)) {
      patternMap.removeLayer(patternOverlayGroup);
    }
  }

  if (patternMembersLayer) {
    patternMembersLayer.clearLayers();
    if (patternMap.hasLayer(patternMembersLayer)) {
      patternMap.removeLayer(patternMembersLayer);
    }
  }
}

function hideAgencementLayers() {
  if (!patternMap) return;

  if (savedAgencementsLayer) {
    savedAgencementsLayer.clearLayers();
    if (patternMap.hasLayer(savedAgencementsLayer)) {
      patternMap.removeLayer(savedAgencementsLayer);
    }
  }

  if (window.manualAgencementLayer) {
    window.manualAgencementLayer.clearLayers();
    if (patternMap.hasLayer(window.manualAgencementLayer)) {
      patternMap.removeLayer(window.manualAgencementLayer);
    }
  }
}


/* Fond gris : fragments visibles */
function renderPatternBaseGrey() {
  if (!patternMap) return;

  patternBaseLayer.clearLayers();
  if (patternBuildingsLayer) patternBuildingsLayer.clearLayers();

  const baseFeatures = getPatternBaseFeaturesForCurrentTimeMode();

  const pointFeatures  = baseFeatures.filter(isPointGeometry);
  const otherFeatures  = baseFeatures.filter(f => !isPointGeometry(f));

  /* --------------------------------------------------
     1) Fragments polygones / lignes
        → pane-pattern-base-polygons (z=410)
        → pointer-events: stroke pour laisser passer
          les clics sur le remplissage vers les bâtiments
  -------------------------------------------------- */
  if (otherFeatures.length) {
    const polygonGeoJSON = L.geoJSON(
      { type: 'FeatureCollection', features: otherFeatures },
      {
        pane: 'pane-pattern-base-polygons',

        style: feature => {
          if (currentFragmentTimeMode === 'trajectories') {
            const s = getGreyTrajectoryStyle(feature.properties?.__trajectoryStatus);
            return {
              color: s.color, weight: s.weight,
              opacity: s.opacity,
              fillColor: s.fillColor, fillOpacity: s.fillOpacity
            };
          }
          return {
            color: '#777', weight: 1, opacity: 1,
            fillColor: '#777', fillOpacity: 0.25
          };
        },

        onEachFeature: (feature, sublayer) => {
          sublayer.on('click', ev => {
            L.DomEvent.stopPropagation(ev);
            onPatternsMapFragmentClick(feature);
          });
        }
      }
    );

    // Ajouter couche par couche et appliquer pointer-events: stroke
polygonGeoJSON.eachLayer(sublayer => {
  patternBaseLayer.addLayer(sublayer);
});
  }

  /* --------------------------------------------------
     2) Fragments points
        → pane-pattern-base-points (z=430)
        → pointer-events normal (cercle plein cliquable)
  -------------------------------------------------- */
  if (pointFeatures.length) {
    const pointGeoJSON = L.geoJSON(
      { type: 'FeatureCollection', features: pointFeatures },
      {
        pane: 'pane-pattern-base-points',

        pointToLayer: (feature, latlng) => {
          if (currentFragmentTimeMode === 'trajectories') {
            const s = getGreyTrajectoryStyle(feature.properties?.__trajectoryStatus);
            return L.circleMarker(latlng, {
              pane: 'pane-pattern-base-points',
              radius: s.radius,
              color: s.color, weight: s.weight, opacity: s.opacity,
              fillColor: s.fillColor, fillOpacity: s.fillOpacity
            });
          }
          return L.circleMarker(latlng, {
            pane: 'pane-pattern-base-points',
            radius: 4,
            color: '#777', weight: 1, opacity: 1,
            fillColor: '#777', fillOpacity: 0.80
          });
        },

        onEachFeature: (feature, sublayer) => {
          sublayer.on('click', ev => {
            L.DomEvent.stopPropagation(ev);
            onPatternsMapFragmentClick(feature);
          });
        }
      }
    );

    pointGeoJSON.eachLayer(sublayer => {
      patternBaseLayer.addLayer(sublayer);
    });
  }

  /* --------------------------------------------------
     3) Bâtiments
        → pane-pattern-buildings (z=420)
        → entre les polygones-fragments et les points-fragments
  -------------------------------------------------- */
  const bStyle = {
    stroke: false,
    fill: true,
    fillColor: '#b5b5b5',
    fillOpacity: 0.22
  };

  const buildingsVisible = [
    ...(batimentsMontreuilGeojson || []),
    ...(batimentsToulouseGeojson  || [])
  ].filter(f => isFeatureInActiveZones(f));

  if (patternBuildingsLayer && buildingsVisible.length) {
    L.geoJSON(
      { type: 'FeatureCollection', features: buildingsVisible },
      {
        pane: 'pane-pattern-buildings',
        style: () => bStyle,
        interactive: true,

        onEachFeature: (feature, layer) => {
          layer.on('click', ev => {
            L.DomEvent.stopPropagation(ev);

            if (agencementCreation.active && currentPatternMode === 'agencements') {
              toggleBuildingInManualAgencement(feature);
              return;
            }

            showDetails(feature.properties || {});
          });
        }
      }
    ).addTo(patternBuildingsLayer);
  }
}

function addPatternMemberToMap(feature, color, patternKey) {
  if (!patternMembersLayer || !feature) return;

  const items = Array.isArray(feature) ? feature.filter(Boolean) : [feature];
  if (!items.length) return;

  const fragmentItems = items.filter(f => !f?.properties?.isBuilding);
  const buildingItems = items.filter(f => !!f?.properties?.isBuilding);

  function drawSubset(subset, paneName) {
    if (!subset.length) return;

    L.geoJSON(
      { type: 'FeatureCollection', features: subset },
      {
        pane: paneName,

        pointToLayer: (feat, latlng) => {
          const isBuilding = !!feat?.properties?.isBuilding;

          return L.circleMarker(latlng, {
            radius: isBuilding ? 7 : 6,
            stroke: false,
            fill: true,
            fillColor: color,
            fillOpacity: isBuilding ? 0.20 : 0.55
          });
        },

        style: feat => {
          const isBuilding = !!feat?.properties?.isBuilding;
          const geomType = feat?.geometry?.type || '';

          if (geomType === 'LineString' || geomType === 'MultiLineString') {
            return {
              color: color,
              weight: 3,
              opacity: isBuilding ? 0.35 : 0.7
            };
          }

          return {
            stroke: false,
            fill: true,
            fillColor: color,
            fillOpacity: isBuilding ? 0.10 : 0.18
          };
        },

        interactive: true,

        onEachFeature: (feat, layer) => {
          layer.bindTooltip(
            `<strong>${patternKey}</strong><br>${feat.properties?.id || 'objet'}`,
            {
              className: 'pattern-tip',
              direction: 'top',
              sticky: true,
              opacity: 1
            }
          );

          layer.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);

            if (feat.properties?.isBuilding) {
              showDetails(feat.properties || {});
            } else {
              openFragmentWithPatternsTabs(feat.properties || {});
            }
          });
        }
      }
    ).addTo(patternMembersLayer);
  }

  drawSubset(buildingItems, 'pane-pattern-members-buildings');

const fragmentPoints = fragmentItems.filter(f => f?.geometry?.type === 'Point');
const fragmentOthers = fragmentItems.filter(f => f?.geometry?.type !== 'Point');

drawSubset(fragmentOthers, 'pane-pattern-members-polygons');
drawSubset(fragmentPoints, 'pane-pattern-members-points');
}

function refreshPatternsMap() {
  if (!patternMap || !patternOverlayGroup) return;

  // IMPORTANT : en mode patterns, on masque les couches des agencements
  if (savedAgencementsLayer) {
    savedAgencementsLayer.clearLayers();
    if (patternMap.hasLayer(savedAgencementsLayer)) {
      patternMap.removeLayer(savedAgencementsLayer);
    }
  }

  if (window.manualAgencementLayer) {
    window.manualAgencementLayer.clearLayers();
    if (patternMap.hasLayer(window.manualAgencementLayer)) {
      patternMap.removeLayer(window.manualAgencementLayer);
    }
  }

  if (patternMembersLayer && !patternMap.hasLayer(patternMembersLayer)) {
    patternMembersLayer.addTo(patternMap);
  }

  if (patternOverlayGroup && !patternMap.hasLayer(patternOverlayGroup)) {
    patternOverlayGroup.addTo(patternMap);
  }

  patternOverlayGroup.clearLayers();
  if (patternMembersLayer) patternMembersLayer.clearLayers();


  Object.entries(patterns || {}).forEach(([pKey, pData]) => {
    const occIds = (pData?.occurrences || []).slice();
    const color = colorForPattern(pKey);

    occIds.forEach((agId) => {
      const ag = agencementsById.get(agId);
      if (!ag) return;

      // 1) On récupère les membres réellement visibles
      const visibleFragments = (ag.fragments || []).filter(f =>
  isFeatureInActiveZones(f) && featureHasAnyActiveCriterion(f)
);

const visibleBuildings = (ag.buildings || []).filter(b =>
  isFeatureInActiveZones(b)
);

      if (!visibleFragments.length && !visibleBuildings.length) return;

      // 2) On dessine les membres avec la couleur du pattern
addPatternMemberToMap(
  [...visibleFragments, ...visibleBuildings],
  color,
  pKey
);

      // 3) IMPORTANT :
      // on reconstruit le contour à partir des membres visibles,
      // au lieu de faire confiance à un ancien contour potentiellement faux
      let contour = buildAgencementBoundsLatLngs({
        fragments: visibleFragments,
        buildings: visibleBuildings
      });

      // 4) Fallback si jamais la reconstruction échoue
      if (!contour || contour.length < 3) {
        contour = getAgencementContourLatLngs(ag);
      }

      if (!contour || contour.length < 3) return;

      const isBaseOccurrence = agId === pData.sourceAgencementId;

      const overlay = L.polygon(contour, {
        pane: 'pane-pattern-contours',
        color: color,
        weight: 3,
        opacity: 1,
        fill: false,
        dashArray: isBaseOccurrence ? '8 6' : null,
        lineJoin: 'round'
      });

      overlay.bindTooltip(
        `<strong>${ag.name || ag.id}</strong><br>${pKey}${isBaseOccurrence ? ' — agencement de base' : ''}<br>${ag.fragmentsCount} fragments • ${ag.buildingsCount} bâtiments`,
        {
          className: 'pattern-tip',
          direction: 'top',
          sticky: true,
          opacity: 1
        }
      );

      overlay.on('click', () => {
        showDetails({
          isPattern: true,
          patternKey: pKey
        });
      });

      overlay.addTo(patternOverlayGroup);

    });
  });

  if (patternMembersLayer) {
    patternMembersLayer.eachLayer(layer => {
      if (layer.bringToFront) layer.bringToFront();
    });
  }

  patternOverlayGroup.eachLayer(layer => {
    if (layer.bringToFront) layer.bringToFront();
  });
}

function onPatternsMapFragmentClick(feature, patternKey) {
  if (unitCreation.active) {
    handleUnitSelection(feature, patternKey);
    return;
  }

  if (agencementCreation.active && currentPatternMode === 'agencements') {
    toggleFragmentInManualAgencement(feature);
    return;
  }

  openFragmentWithPatternsTabs(feature.properties || {});
}


/* ==================================================
  14) MODE COMPARAISON
================================================== */

/* ==================================================
 14.1 Builders comparaison
================================================== */

function comparisonBadgeHtml(text, tone = 'neutral') {
  const styles = {
    neutral: { bg: '#f3f3f3', color: '#111', border: '#d7d7d7' },
    common:  { bg: '#dff5e3', color: '#135c2a', border: '#7bc88b' },
    onlyA:   { bg: '#ffe4e4', color: '#8b1e1e', border: '#e6a0a0' },
    onlyB:   { bg: '#e4efff', color: '#1f4f9f', border: '#9fc0f3' }
  };

  const s = styles[tone] || styles.neutral;

  return `<span style="
    display:inline-block;
    padding:4px 8px;
    border-radius:999px;
    background:${s.bg};
    color:${s.color};
    border:1px solid ${s.border};
    font-size:12px;
    margin:0 6px 6px 0;
    line-height:1.2;
    vertical-align:top;
  ">${escapeHtml(text)}</span>`;
}

function buildComparisonSelect(labelText, currentRef, candidates, onChange) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '6px';
  wrap.style.minWidth = '280px';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.fontSize = '12px';
  label.style.color = '#666';

  const select = document.createElement('select');
  select.style.padding = '10px';
  select.style.border = '1px solid #ccc';
  select.style.background = '#fff';
  select.style.fontFamily = 'Consolas, monospace';
  select.style.fontSize = '13px';

  const groups = {};
  candidates.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  Object.entries(groups).forEach(([groupName, items]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;

    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.ref;
      opt.textContent = item.label;
      opt.selected = item.ref === currentRef;
      optgroup.appendChild(opt);
    });

    select.appendChild(optgroup);
  });

  select.addEventListener('change', onChange);

  wrap.append(label, select);
  return wrap;
}

function buildIdBadgeList(ids = [], otherIds = [], side = 'A', emptyText = '—') {
  const wrap = document.createElement('div');

  const common = getCommonIdSet(ids, otherIds);
  const ordered = (ids || []).map(id => {
    const txt = String(id).trim();
    return {
      text: txt,
      tone: common.has(txt) ? 'common' : (side === 'A' ? 'onlyA' : 'onlyB')
    };
  });

  if (!ordered.length) {
    wrap.innerHTML = comparisonBadgeHtml(emptyText, 'neutral');
    return wrap;
  }

  wrap.innerHTML = ordered.map(x => comparisonBadgeHtml(x.text, x.tone)).join('');
  return wrap;
}


function buildComparisonSectionTitle(text) {
  const h = document.createElement('h2');
  h.textContent = text;
  h.style.margin = '0 0 16px 0';
  h.style.fontSize = '22px';
  return h;
}

function buildComparisonTwoColumnsShell() {
  const grid = document.createElement('div');
  grid.style.cssText = `
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:18px;
    align-items:start;
  `;
  return grid;
}

function buildComparisonColumnCard(titleText, sideTone = 'A') {
  const toneBorder = sideTone === 'A' ? '#c33' : '#2563eb';

  const card = document.createElement('div');
  card.style.cssText = `
    border:1px solid #ddd;
    border-top:4px solid ${toneBorder};
    background:#fff;
    padding:16px;
  `;

  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = `
    font-size:18px;
    font-weight:700;
    margin-bottom:14px;
  `;

  card.appendChild(title);
  return card;
}

function buildParallelFieldRow(labelText, nodeLeft, nodeRight) {
  const row = document.createElement('div');
  row.style.cssText = `
    display:grid;
    grid-template-columns: 170px minmax(0, 1fr) minmax(0, 1fr);
    gap:10px;
    align-items:start;
    padding:8px 0;
    border-top:1px solid #eee;
  `;

  const label = document.createElement('div');
  label.textContent = labelText;
  label.style.cssText = 'font-size:12px;font-weight:700;color:#444;';

  const safeLeft = nodeLeft || document.createElement('div');
  const safeRight = nodeRight || document.createElement('div');

  row.append(label, safeLeft, safeRight);
  return row;
}


/* ==================================================
 14.2 Données comparaison
================================================== */

function getComparisonCandidates() {
  const out = [];

  const saved = (loadSavedAgencements() || [])
    .map(hydrateSavedAgencement)
    .filter(ag => ag.fragmentsCount > 0 || ag.buildingsCount > 0)
    .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), undefined, { numeric: true }));

  saved.forEach(ag => {
    out.push({
      ref: `saved:${ag.uid}`,
      label: ag.name || ag.id,
      group: ag.origin === 'generated' ? 'Agencements enregistrés' : 'Agencements créés',
      ag
    });
  });

  (agencements || [])
    .filter(ag => ag.mode === 'auto')
    .sort(sortAgencementsById)
    .forEach(ag => {
      out.push({
        ref: `generated:${ag.id}`,
        label: ag.name || ag.id,
        group: 'Agencements générés',
        ag
      });
    });

  return out;
}

function getComparisonFragmentsById() {
  const source =
    currentPatternGalleryTimeMode === 'T2'
      ? [...(dataGeojsonT2 || []), ...(datamGeojsonT2 || [])]
      : [...(dataGeojsonT1 || []), ...(datamGeojsonT1 || [])];

  return new Map(
    source
      .filter(f => !f.properties?.isDiscourse && !f.properties?.isBuilding)
      .map(f => [cleanFragmentId(f.properties?.id), f])
  );
}

function getAgencementFragmentsForComparison(ag, byFragId) {
  return (ag?.fragmentIds || [])
    .map(fid => byFragId.get(cleanFragmentId(fid)))
    .filter(Boolean);
}

function buildLooseAlignedFragmentRows(fragsA, fragsB) {
  const orderedA = [...(fragsA || [])];
  const orderedB = orderFragmentsByReference(fragsA || [], fragsB || []);

  const maxLen = Math.max(orderedA.length, orderedB.length);

  while (orderedA.length < maxLen) orderedA.push(null);
  while (orderedB.length < maxLen) orderedB.push(null);

  return orderedA.map((left, i) => ({
    left,
    right: orderedB[i] || null
  }));
}

/* ==================================================
 14.3 Discours comparaison
================================================== */

function buildDiscourseContentCard(feature, otherFeatures = [], side = 'A') {
  const props = feature?.properties || {};
  const otherIds = new Set(
    (otherFeatures || [])
      .map(f => String(f?.properties?.id || '').trim())
      .filter(Boolean)
  );

  const id = String(props.id || '').trim();

  const card = document.createElement('div');
  card.style.cssText = `
    border:1px solid #e5e5e5;
    background:#fff;
    padding:10px;
    margin-bottom:10px;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;margin-bottom:6px;';
  title.innerHTML = comparisonBadgeHtml(
    id || '—',
    otherIds.has(id) ? 'common' : (side === 'A' ? 'onlyA' : 'onlyB')
  );

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:#444;line-height:1.45;margin-bottom:8px;';
  meta.innerHTML = `
    <div><strong>Auteur :</strong> ${escapeHtml(props.auteur || '—')}</div>
    <div><strong>Date :</strong> ${escapeHtml(props.date || '—')}</div>
    <div><strong>Source :</strong> ${escapeHtml(props.source || '—')}</div>
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    font-size:13px;
    line-height:1.5;
    color:#222;
    white-space:pre-wrap;
    border-top:1px solid #f0f0f0;
    padding-top:8px;
  `;
  content.textContent = props.contenu || '—';

  card.append(title, meta, content);
  return card;
}

function buildParallelDiscoursesBlock(featuresA = [], featuresB = [], titleText = 'Discours / témoignages associés') {
  const block = document.createElement('div');
  block.style.cssText = `
    border:1px solid #ddd;
    background:#fff;
    padding:14px;
    margin-top:12px;
  `;

  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:12px;';
  block.appendChild(title);

  const grid = document.createElement('div');
  grid.style.cssText = `
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:14px;
  `;

  const left = document.createElement('div');
  const right = document.createElement('div');

  if (!featuresA.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun discours';
    left.appendChild(empty);
  } else {
    featuresA.forEach(f => left.appendChild(buildDiscourseContentCard(f, featuresB, 'A')));
  }

  if (!featuresB.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun discours';
    right.appendChild(empty);
  } else {
    featuresB.forEach(f => right.appendChild(buildDiscourseContentCard(f, featuresA, 'B')));
  }

  grid.append(left, right);
  block.appendChild(grid);

  return block;
}

/* ==================================================
 14.4 Colonnes et sections comparaison
================================================== */

function buildComparisonGeneralColumn(ag, otherAg, side = 'A') {
  const card = buildComparisonColumnCard(ag?.name || ag?.id || '—', side);

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:13px;line-height:1.5;margin-bottom:14px;';
  meta.innerHTML = `
    <div><strong>ID :</strong> ${escapeHtml(ag?.id || '—')}</div>
    <div><strong>Fragments :</strong> ${ag?.fragmentsCount ?? 0}</div>
    <div><strong>Bâtiments :</strong> ${ag?.buildingsCount ?? 0}</div>
    <div><strong>Rayon :</strong> ${Number(ag?.radiusM || 0).toFixed(0)} m</div>
    <div><strong>Patterns :</strong> ${escapeHtml((ag?.patternIds || []).join(', ') || '—')}</div>
  `;
  card.appendChild(meta);

  const blocks = [
    {
      title: 'Fragments',
      node: buildIdBadgeList(ag?.fragmentIds || [], otherAg?.fragmentIds || [], side, 'aucun')
    },
    {
      title: 'Bâtiments',
      node: buildIdBadgeList(ag?.buildingIds || [], otherAg?.buildingIds || [], side, 'aucun')
    },
    {
      title: 'Patterns',
      node: buildIdBadgeList(ag?.patternIds || [], otherAg?.patternIds || [], side, 'aucun')
    }
  ];

  blocks.forEach(block => {
    const sec = document.createElement('div');
    sec.style.marginBottom = '14px';

    const head = document.createElement('div');
    head.textContent = block.title;
    head.style.cssText = 'font-weight:700;font-size:13px;margin-bottom:8px;';

    sec.append(head, block.node);
    card.appendChild(sec);
  });

  return card;
}

function buildComparisonGeneralSection(agA, agB) {
  const section = document.createElement('section');
  section.style.marginBottom = '28px';

  section.appendChild(buildComparisonSectionTitle('Synthèse des deux agencements'));

  const grid = buildComparisonTwoColumnsShell();
  grid.appendChild(buildComparisonGeneralColumn(agA, agB, 'A'));
  grid.appendChild(buildComparisonGeneralColumn(agB, agA, 'B'));

  section.appendChild(grid);

  section.appendChild(
    buildParallelDiscoursesBlock(
      getDiscoursesForAgencement(agA),
      getDiscoursesForAgencement(agB),
      'Discours / témoignages associés aux agencements'
    )
  );

  return section;
}

function buildParallelTextComparisonBlock(featureA, featureB, titleText = 'Champs textuels') {
  const block = document.createElement('div');
  block.style.cssText = `
    border:1px solid #ddd;
    background:#fff;
    padding:14px;
    margin-top:12px;
  `;

  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;';
  block.appendChild(title);

  const propsA = featureA?.properties || {};
  const propsB = featureB?.properties || {};

  let hasAnyRow = false;

  TEXT_KEYS
    .filter(k => ACTIVE_CRITERIA_KEYS.has(k))
    .forEach(k => {
      const itemsA = getTokenArrayFromSource(propsA, k);
      const itemsB = getTokenArrayFromSource(propsB, k);

      if (!itemsA.length && !itemsB.length) return;

      hasAnyRow = true;

      const diff = diffTokenArrays(itemsA, itemsB);

      const leftEntries = [
        ...diff.common.map(x => ({ text: x, tone: 'common' })),
        ...diff.onlyA.map(x => ({ text: x, tone: 'onlyA' }))
      ];

      const rightEntries = [
        ...diff.common.map(x => ({ text: x, tone: 'common' })),
        ...diff.onlyB.map(x => ({ text: x, tone: 'onlyB' }))
      ];

      const leftNode = document.createElement('div');
      leftNode.innerHTML = leftEntries.length
        ? leftEntries.map(x => comparisonBadgeHtml(x.text, x.tone)).join('')
        : comparisonBadgeHtml('—', 'neutral');

      const rightNode = document.createElement('div');
      rightNode.innerHTML = rightEntries.length
        ? rightEntries.map(x => comparisonBadgeHtml(x.text, x.tone)).join('')
        : comparisonBadgeHtml('—', 'neutral');

      block.appendChild(
        buildParallelFieldRow(
          prettyKey(k),
          leftNode,
          rightNode
        )
      );
    });

  if (!hasAnyRow) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun champ textuel renseigné';
    block.appendChild(empty);
  }

  return block;
}

function buildParallelFuzzyComparisonBlock(featureA, featureB, titleText = 'Critères fuzzy') {
  const block = document.createElement('div');
  block.style.cssText = `
    border:1px solid #ddd;
    background:#fff;
    padding:14px;
    margin-top:12px;
  `;

  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;';
  block.appendChild(title);

  const propsA = featureA?.properties || {};
  const propsB = featureB?.properties || {};

  let hasAnyRow = false;

  ALL_FUZZY_KEYS
    .filter(k => ACTIVE_CRITERIA_KEYS.has(k))
    .forEach(k => {
      const a = parseFuzzy(propsA?.[k]);
      const b = parseFuzzy(propsB?.[k]);

      if (a === null && b === null) return;

      hasAnyRow = true;

      const leftNode = document.createElement('div');
      const rightNode = document.createElement('div');

      if (a === null) leftNode.innerHTML = comparisonBadgeHtml('—', 'neutral');
      else {
        leftNode.innerHTML = comparisonBadgeHtml(
          Number(a).toFixed(2),
          fuzzyValuesEqual(a, b) ? 'common' : 'onlyA'
        );
      }

      if (b === null) rightNode.innerHTML = comparisonBadgeHtml('—', 'neutral');
      else {
        rightNode.innerHTML = comparisonBadgeHtml(
          Number(b).toFixed(2),
          fuzzyValuesEqual(a, b) ? 'common' : 'onlyB'
        );
      }

      block.appendChild(
        buildParallelFieldRow(
          prettyKey(k),
          leftNode,
          rightNode
        )
      );    });

  if (!hasAnyRow) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun critère fuzzy renseigné';
    block.appendChild(empty);
  }

  return block;
}

function buildFragmentIdentityCard(feature, side = 'A') {
  const toneBorder = side === 'A' ? '#c33' : '#2563eb';

  const card = document.createElement('div');
  card.style.cssText = `
    border:1px solid #ddd;
    border-top:4px solid ${toneBorder};
    background:#fff;
    padding:12px;
  `;

  if (!feature) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      min-height:220px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#888;
      font-size:14px;
      background:#fafafa;
      border:1px dashed #ddd;
    `;
empty.textContent = `Aucun fragment vis-à-vis côté ${side}`;    card.appendChild(empty);
    return card;
  }

  const props = feature.properties || {};

  const header = document.createElement('div');
  header.style.marginBottom = '12px';


  const title = document.createElement('div');
  title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:4px;';
  title.textContent = props.name || props.id || 'Fragment';

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:13px;color:#444;';
  sub.innerHTML = `
    <div><strong>ID :</strong> ${escapeHtml(props.id || '—')}</div>
    <div><strong>Zone :</strong> ${escapeHtml(props.zone || '—')}</div>
  `;

  header.append(title, sub);

const media = document.createElement('div');
media.style.cssText = `
  height:190px;
  border:1px solid #eee;
  background:#f8f8f8;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  margin-bottom:12px;
  padding:10px;
`;

  const photos = normalizePhotos(props.photos);
  const firstPhoto = photos[0];

if (firstPhoto) {
  const img = makeImg(firstPhoto, props.name || props.id || 'fragment', {
    priority: 'low',
    lazy: true
  });
  if (img) {
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    media.appendChild(img);
  } else {
    media.textContent = 'Sans image';
    media.style.color = '#777';
  }
} else {
  media.textContent = 'Sans image';
  media.style.color = '#777';
}
  card.append(header, media);
  return card;
}

function buildFragmentComparisonRow(featureA, featureB, index) {
  const rowWrap = document.createElement('div');
  rowWrap.style.marginBottom = '24px';

  const label = document.createElement('div');
  label.style.cssText = `
    font-size:13px;
    font-weight:700;
    color:#666;
    margin-bottom:10px;
  `;

  const topGrid = buildComparisonTwoColumnsShell();
  topGrid.appendChild(buildFragmentIdentityCard(featureA, 'A'));
  topGrid.appendChild(buildFragmentIdentityCard(featureB, 'B'));

  const discoursesA = featureA ? getDiscoursesForFragmentFeature(featureA) : [];
  const discoursesB = featureB ? getDiscoursesForFragmentFeature(featureB) : [];

  rowWrap.append(label, topGrid);
  rowWrap.appendChild(buildParallelTextComparisonBlock(featureA, featureB, 'Comparaison textuelle'));
  rowWrap.appendChild(buildParallelFuzzyComparisonBlock(featureA, featureB, 'Comparaison fuzzy'));
  rowWrap.appendChild(buildParallelDiscoursesBlock(discoursesA, discoursesB, 'Discours / témoignages liés à ces fragments'));

  return rowWrap;
}

function buildComparisonFragmentsSection(agA, agB) {
  const section = document.createElement('section');
  section.style.marginBottom = '28px';

  section.appendChild(buildComparisonSectionTitle(`Fragments — ${currentPatternGalleryTimeMode}`));

  const byFragId = getComparisonFragmentsById();

  const fragsA = getAgencementFragmentsForComparison(agA, byFragId);
  const fragsB = getAgencementFragmentsForComparison(agB, byFragId);

  const rows = buildLooseAlignedFragmentRows(fragsA, fragsB);

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'Aucun fragment disponible pour cette temporalité.';
    section.appendChild(empty);
    return section;
  }

  rows.forEach((row, idx) => {
    section.appendChild(buildFragmentComparisonRow(row.left, row.right, idx));
  });

  return section;
}

function getBuildingSignatureList(buildings = []) {
  return (buildings || []).map(b => {
    const props = b?.properties || {};
    return {
      feature: b,
      id: String(props.id || '').trim(),
      fonction: getPropFonction(props),
      etat: getPropEtat(props)
    };
  });
}

function buildBuildingComparisonCard(item, allOtherItems = [], side = 'A') {
  const toneBorder = side === 'A' ? '#c33' : '#2563eb';

  const card = document.createElement('div');
  card.style.cssText = `
    border:1px solid #ddd;
    border-top:4px solid ${toneBorder};
    background:#fff;
    padding:12px;
    margin-bottom:12px;
  `;

  const otherFonctions = allOtherItems.map(x => x.fonction).filter(Boolean);
  const otherEtats = allOtherItems.map(x => x.etat).filter(Boolean);

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;';
  title.textContent = item.id || 'Bâtiment';

  const fonctionWrap = document.createElement('div');
  fonctionWrap.style.marginBottom = '8px';
  fonctionWrap.innerHTML = `<strong>Fonction :</strong><br>` + comparisonBadgeHtml(
    item.fonction || '—',
    otherFonctions.includes(item.fonction) ? 'common' : (side === 'A' ? 'onlyA' : 'onlyB')
  );

  const etatWrap = document.createElement('div');
  etatWrap.style.marginBottom = '8px';
  etatWrap.innerHTML = `<strong>État :</strong><br>` + comparisonBadgeHtml(
    item.etat || '—',
    otherEtats.includes(item.etat) ? 'common' : (side === 'A' ? 'onlyA' : 'onlyB')
  );

  const discoursesThis = getDiscoursesForBuildingFeature(item.feature);
  const discoursesOther = [];
  allOtherItems.forEach(x => {
    getDiscoursesForBuildingFeature(x.feature).forEach(d => discoursesOther.push(d));
  });

  const dTitle = document.createElement('div');
  dTitle.style.cssText = 'font-weight:700;font-size:13px;margin:10px 0 8px 0;';
  dTitle.textContent = 'Discours / témoignages liés';

  card.append(title, fonctionWrap, etatWrap, dTitle);

  if (!discoursesThis.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun discours';
    card.appendChild(empty);
  } else {
    discoursesThis.forEach(d => {
      card.appendChild(buildDiscourseContentCard(d, discoursesOther, side));
    });
  }

  return card;
}

function buildBuildingsColumn(ag, otherAg, side = 'A') {
  const col = buildComparisonColumnCard(
    `${ag?.name || ag?.id || '—'} — bâtiments`,
    side
  );

  const items = getBuildingSignatureList(ag?.buildings || []);
  const otherItems = getBuildingSignatureList(otherAg?.buildings || []);

  if (!items.length) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = '— Aucun bâtiment';
    col.appendChild(empty);
    return col;
  }

  items.forEach(item => {
    col.appendChild(buildBuildingComparisonCard(item, otherItems, side));
  });

  return col;
}

function buildComparisonBuildingsSection(agA, agB) {
  const section = document.createElement('section');
  section.style.marginBottom = '28px';

  section.appendChild(buildComparisonSectionTitle('Bâtiments'));

  const grid = buildComparisonTwoColumnsShell();
  grid.appendChild(buildBuildingsColumn(agA, agB, 'A'));
  grid.appendChild(buildBuildingsColumn(agB, agA, 'B'));

  section.appendChild(grid);
  return section;
}

/* ==================================================
 14.5 Rendu final
================================================== */

function renderComparisonView() {
  const view = document.getElementById('comparison-view');
  if (!view) return;

  view.innerHTML = '';

  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
  recomputeAgencementPatterns({
    fragments: visibleFragments,
    buildings: visibleBuildings
  });

  const candidates = getComparisonCandidates();

  if (!candidates.length) {
    view.innerHTML = `<div style="color:#777;font-family:Consolas,monospace;">Aucun agencement disponible pour la comparaison.</div>`;
    return;
  }

  const byRef = new Map(candidates.map(x => [x.ref, x.ag]));
  const validRefs = new Set(candidates.map(x => x.ref));

  if (!validRefs.has(currentComparisonLeft)) {
    currentComparisonLeft = candidates[0].ref;
  }

  if (!validRefs.has(currentComparisonRight)) {
    currentComparisonRight = candidates.find(x => x.ref !== currentComparisonLeft)?.ref || candidates[0].ref;
  }

  const agA = byRef.get(currentComparisonLeft) || null;
  const agB = byRef.get(currentComparisonRight) || null;

  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    align-items:end;
    margin-bottom:28px;
    padding:16px;
    border:1px solid #ddd;
    background:#fafafa;
  `;

  toolbar.appendChild(
    buildComparisonSelect('Agencement A', currentComparisonLeft, candidates, (e) => {
      currentComparisonLeft = e.target.value;
      renderComparisonView();
    })
  );

  toolbar.appendChild(
    buildComparisonSelect('Agencement B', currentComparisonRight, candidates, (e) => {
      currentComparisonRight = e.target.value;
      renderComparisonView();
    })
  );

  const swapBtn = document.createElement('button');
  swapBtn.className = 'tab-btn';
  swapBtn.textContent = 'Inverser A / B';
  swapBtn.addEventListener('click', () => {
    const tmp = currentComparisonLeft;
    currentComparisonLeft = currentComparisonRight;
    currentComparisonRight = tmp;
    renderComparisonView();
  });

  toolbar.appendChild(swapBtn);
  view.appendChild(toolbar);

  if (!agA || !agB) {
    const msg = document.createElement('div');
    msg.style.color = '#888';
    msg.textContent = 'Impossible de résoudre les deux agencements sélectionnés.';
    view.appendChild(msg);
    return;
  }

  view.appendChild(buildComparisonGeneralSection(agA, agB));
  view.appendChild(buildComparisonFragmentsSection(agA, agB));
  view.appendChild(buildComparisonBuildingsSection(agA, agB));
}


/* ==================================================
 15) MODE AGENCEMENT MANUEL
================================================== */
/* ==================================================
 Général
================================================== */

function resetAgencementCreation() {
  agencementCreation.active = false;
  agencementCreation.mode = null;
  agencementCreation.selectedFragments.clear();
  agencementCreation.selectedBuildings.clear();
  agencementCreation.sourceAgencement = null;
}

function getCurrentManualAgencement() {
  const fragments = Array.from(agencementCreation.selectedFragments.values());
  const buildings = Array.from(agencementCreation.selectedBuildings.values());

  return {
    id: 'AG_MANUAL_1',
    mode: 'manual',
    fragments,
    buildings,
    fragmentIds: fragments.map(f => String(f.properties?.id || '').trim()).sort(),
    buildingIds: buildings.map(b => String(b.properties?.id || '').trim()).sort(),
    fragmentsCount: fragments.length,
    buildingsCount: buildings.length
  };
}


function updateAgencementCreationButtons(ag) {
  const clearBtn = document.getElementById('clear-agencement-btn');
  const validateBtn = document.getElementById('validate-agencement-btn');

  const fragCount = ag?.fragmentsCount || 0;
  const bldCount = ag?.buildingsCount || 0;
  const hasSelection = (fragCount + bldCount) > 0;

  if (clearBtn) {
    clearBtn.style.display = agencementCreation.active ? 'inline-flex' : 'none';
    clearBtn.disabled = !hasSelection;
    clearBtn.style.opacity = hasSelection ? '1' : '0.5';
  }

  if (validateBtn) {
    validateBtn.style.display = agencementCreation.active ? 'inline-flex' : 'none';
    validateBtn.disabled = !hasSelection;
    validateBtn.style.opacity = hasSelection ? '1' : '0.5';
    validateBtn.textContent = hasSelection
      ? `Valider l’agencement (${fragCount} fragments, ${bldCount} bâtiments)`
      : 'Valider l’agencement';
  }
}

function stopAgencementCreation() {
  // IMPORTANT : on vide vraiment l’état de création
  resetAgencementCreation();

  const btn = document.getElementById('create-agencement-btn');
  if (btn) {
    btn.textContent = 'Créer un agencement';
    btn.classList.remove('is-armed');
    btn.setAttribute('aria-pressed', 'false');
  }

  const clearBtn = document.getElementById('clear-agencement-btn');
  const validateBtn = document.getElementById('validate-agencement-btn');

  if (clearBtn) clearBtn.style.display = 'none';
  if (validateBtn) validateBtn.style.display = 'none';

  patternMap?.getContainer()?.classList.remove('patterns-creating');

  if (window.manualAgencementLayer) {
    window.manualAgencementLayer.clearLayers();
    if (patternMap?.hasLayer(window.manualAgencementLayer)) {
      patternMap.removeLayer(window.manualAgencementLayer);
    }
  }

  if (currentPatternMode === 'patterns') {
    if (patternMembersLayer && !patternMap?.hasLayer(patternMembersLayer)) {
      patternMembersLayer.addTo(patternMap);
    }
    if (patternOverlayGroup && !patternMap?.hasLayer(patternOverlayGroup)) {
      patternOverlayGroup.addTo(patternMap);
    }
  } else {
    if (patternMembersLayer) {
      patternMembersLayer.clearLayers();
      if (patternMap?.hasLayer(patternMembersLayer)) {
        patternMap.removeLayer(patternMembersLayer);
      }
    }

    if (patternOverlayGroup) {
      patternOverlayGroup.clearLayers();
      if (patternMap?.hasLayer(patternOverlayGroup)) {
        patternMap.removeLayer(patternOverlayGroup);
      }
    }
  }

  refreshManualAgencementEverywhere();
}

function startAgencementCreation() {
  setTopTab('patterns');
  setPatternModeTab('agencements');

  // IMPORTANT : on repart toujours d’un état propre
  resetAgencementCreation();

  agencementCreation.active = true;
  agencementCreation.mode = currentPatternView === 'proxemic' ? 'proxemic' : 'map';

  const btn = document.getElementById('create-agencement-btn');
  if (btn) {
    btn.textContent = 'Annuler l’agencement';
    btn.classList.add('is-armed');
    btn.setAttribute('aria-pressed', 'true');
  }

  const clearBtn = document.getElementById('clear-agencement-btn');
  const validateBtn = document.getElementById('validate-agencement-btn');
  if (clearBtn) clearBtn.style.display = 'inline-flex';
  if (validateBtn) validateBtn.style.display = 'inline-flex';

  if (agencementCreation.mode === 'map') {
    patternMap?.getContainer()?.classList.add('patterns-creating');
  }

  refreshManualAgencementEverywhere();
}

function clearAgencementSelection() {
  agencementCreation.selectedFragments.clear();
  agencementCreation.selectedBuildings.clear();
  agencementCreation.sourceAgencement = null;
  refreshManualAgencementEverywhere();
}

function toggleFragmentInManualAgencement(feature) {
  const id = String(feature?.properties?.id || '').trim();
  if (!id) return;

  if (agencementCreation.selectedFragments.has(id)) {
    agencementCreation.selectedFragments.delete(id);
  } else {
    agencementCreation.selectedFragments.set(id, feature);
  }

  refreshManualAgencementEverywhere();
}

function toggleBuildingInManualAgencement(feature) {
  const id = String(feature?.properties?.id || '').trim();
  if (!id) return;

  if (agencementCreation.selectedBuildings.has(id)) {
    agencementCreation.selectedBuildings.delete(id);
  } else {
    agencementCreation.selectedBuildings.set(id, feature);
  }

  refreshManualAgencementEverywhere();
}

function refreshAgencementSelectionMap() {
  if (!patternMap) return;

  if (patternOverlayGroup) {
    patternOverlayGroup.clearLayers();
    if (patternMap.hasLayer(patternOverlayGroup)) {
      patternMap.removeLayer(patternOverlayGroup);
    }
  }

  if (patternMembersLayer) {
    patternMembersLayer.clearLayers();
    if (patternMap.hasLayer(patternMembersLayer)) {
      patternMap.removeLayer(patternMembersLayer);
    }
  }

  if (!window.manualAgencementLayer) {
    window.manualAgencementLayer = L.layerGroup().addTo(patternMap);
  } else if (!patternMap.hasLayer(window.manualAgencementLayer)) {
    window.manualAgencementLayer.addTo(patternMap);
  }

  window.manualAgencementLayer.clearLayers();

  const ag = getCurrentManualAgencement();
  updateAgencementCreationButtons(ag);

  if (!agencementCreation.active) return;

  const contourLatLngs = buildAgencementBoundsLatLngs(ag);
  if (contourLatLngs && contourLatLngs.length >= 3) {
    L.polygon(contourLatLngs, {
      pane: 'pane-pattern-contours',
      color: '#ffffff',
      weight: 2.5,
      opacity: 0.95,
      fillColor: '#ffffff',
      fillOpacity: 0.04,
      dashArray: '6 4',
      interactive: false
    }).addTo(window.manualAgencementLayer);
  }

  const selectedFrags = Array.from(agencementCreation.selectedFragments.values());
  selectedFrags.forEach(f => {
    const geomType = f?.geometry?.type;

    if (geomType === 'Point') {
      const c = getFeatureCenterLatLng(f);
      if (!c) return;

      L.circleMarker(c, {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#ffffff',
        fillOpacity: 0.95
      }).addTo(window.manualAgencementLayer);
    } else {
      L.geoJSON(f, {
        style: {
          color: '#ffffff',
          weight: 3,
          fillColor: '#ffffff',
          fillOpacity: 0.20
        },
        pointToLayer: (_feat, latlng) => L.circleMarker(latlng, {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: '#ffffff',
          fillOpacity: 0.95
        })
      }).addTo(window.manualAgencementLayer);
    }
  });

  const selectedBlds = Array.from(agencementCreation.selectedBuildings.values());
  selectedBlds.forEach(b => {
    L.geoJSON(b, {
      style: {
        color: '#00ffff',
        weight: 2,
        fillColor: '#00ffff',
        fillOpacity: 0.18
      },
      pointToLayer: (_feat, latlng) => L.circleMarker(latlng, {
        radius: 8,
        color: '#00ffff',
        weight: 2,
        fillColor: '#00ffff',
        fillOpacity: 0.8
      })
    }).addTo(window.manualAgencementLayer);
  });
}

function validateCurrentManualAgencement() {
  const ag = getCurrentManualAgencement();

  if (!ag.fragmentsCount && !ag.buildingsCount) {
    alert("L’agencement est vide.");
    return;
  }

  const uid = 'ag_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const defaultName = `A${loadSavedAgencements().length + 1}`;
  const contourLatLngs = buildAgencementBoundsLatLngs(ag);

const saved = {
  uid,
  id: uid.toUpperCase(),
  name: defaultName,
  description: '',
  createdAt: new Date().toISOString(),

  fragmentIds: ag.fragmentIds.slice(),
  buildingIds: ag.buildingIds.slice(),
  fragmentsCount: ag.fragmentsCount,
  buildingsCount: ag.buildingsCount,

  contour: contourLatLngs
    ? contourLatLngs.map(ll => [ll.lat, ll.lng])
    : null,

  origin: 'manual',
  seedable: true
};

  addSavedAgencement(saved);
  recomputeAgencementPatterns();

  agencementCreation.sourceAgencement = saved;

  stopAgencementCreation();
  renderSavedAgencementsOnMap();

  if (currentPatternMode === 'patterns' && currentView === 'patterns-map') {
  renderPatternBaseGrey();
  refreshPatternsMap();
}
  openSavedAgencementPanel(saved.uid);
}


function showAgencementSelectionProxemicView() {
  proxemicView.innerHTML = '';

const layout = buildSharedProxemicLayout(proxemicView);
const sourceFeatures = getFragmentProxemicSourceFeatures(currentFragmentTimeMode);

const proxData = buildFragmentProxemicNodes(layout, {
  includePatterns: false,
  sourceFeatures
});

  if (!proxData.length) {
    proxemicView.innerHTML = "<div style='color:#aaa;padding:10px'>Aucun fragment.</div>";
    return;
  }

  const { W, H } = layout;

  const svg = d3.select("#proxemic-view")
    .append("svg")
    .attr("width", W)
    .attr("height", H);

const world = svg.append("g");
const slicesLayer = world.append("g");
const trajectoryLayer = world.append("g");
const contourLayer = world.append("g");
const nodesLayer = world.append("g");
const labelsLayer = world.append("g");

drawSharedProxemicBackground(slicesLayer, labelsLayer, layout);

  svg.call(
    d3.zoom()
      .scaleExtent([0.4, 4])
      .on("zoom", ev => world.attr("transform", ev.transform))
  );

const nodeById = new Map(proxData.map(d => [cleanFragmentId(d.id), d]));

  drawExistingAgencementContoursInProxemic(contourLayer, nodeById);
  drawManualAgencementContourInProxemic(contourLayer, nodeById);

  function getProxemicNodeStyle(d) {
  if (currentFragmentTimeMode !== 'trajectories') {
    return {
      fill: '#fff',
      fillOpacity: 1,
      stroke: '#222',
      strokeOpacity: 1
    };
  }

  const zone = d?.feature?.properties?.zone || d?.trajectoryPair?.zone || 'montreuil';
  const status = d?.trajectoryStatus || 'identical';
  const style = getTrajectoryStyle(status, zone);

  return {
    fill: style.fillColor,
    fillOpacity: style.fillOpacity,
    stroke: style.color,
    strokeOpacity: style.opacity
  };
}

if (currentFragmentTimeMode === 'trajectories') {
  const ghostData = proxData.filter(d => d.hasGhost);

  trajectoryLayer.selectAll("line.fragment-trajectory")
    .data(ghostData)
    .join("line")
    .attr("class", "fragment-trajectory")
    .attr("x1", d => d.ghostX)
    .attr("y1", d => d.ghostY)
    .attr("x2", d => d.x)
    .attr("y2", d => d.y)
    .style("stroke", d => {
      const zone = d?.feature?.properties?.zone || 'montreuil';
      return getTrajectoryStyle('modified', zone).color;
    })
    .style("stroke-width", 1.5)
    .style("stroke-dasharray", "4 4")
    .style("opacity", 0.9)
    .style("pointer-events", "none");

  trajectoryLayer.selectAll("circle.fragment-ghost")
    .data(ghostData)
    .join("circle")
    .attr("class", "fragment-ghost")
    .attr("cx", d => d.ghostX)
    .attr("cy", d => d.ghostY)
    .attr("r", 8)
    .style("fill", "none")
    .style("stroke", d => {
      const zone = d?.feature?.properties?.zone || 'montreuil';
      return getTrajectoryStyle('modified', zone).color;
    })
    .style("stroke-width", 1.4)
    .style("stroke-opacity", 0.65)
    .style("pointer-events", "none");
}

  const nodes = nodesLayer.selectAll("g.node")
    .data(proxData)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("cursor", "pointer");


nodes.append("circle")
  .attr("r", d => agencementCreation.selectedFragments.has(String(d.id).trim()) ? 11 : 8)
  .style("fill", d => getProxemicNodeStyle(d).fill)
  .style("fill-opacity", d => getProxemicNodeStyle(d).fillOpacity)
  .style("stroke", d =>
    agencementCreation.selectedFragments.has(String(d.id).trim())
      ? "#ffffff"
      : getProxemicNodeStyle(d).stroke
  )
  .style("stroke-opacity", d => getProxemicNodeStyle(d).strokeOpacity)
  .style("stroke-width", d =>
    agencementCreation.selectedFragments.has(String(d.id).trim()) ? 3 : 1.2
  );

  nodes.append("text")
    .text(d => d.id)
    .attr("dy", "0.35em")
    .style("text-anchor", "middle")
    .style("font-size", "7px")
    .style("font-weight", "bold")
    .style("fill", "#000")
    .style("pointer-events", "none");

  let selected = null;

function highlight(id) {
  nodes.style("opacity", n => n.id === id ? 1 : 0.15);

  if (currentFragmentTimeMode === 'trajectories') {
    trajectoryLayer.selectAll("line.fragment-trajectory, circle.fragment-ghost")
      .style("opacity", d => d.id === id ? 1 : 0.12);
  }
}

function reset() {
  if (selected) return;
  nodes.style("opacity", 1);

  if (currentFragmentTimeMode === 'trajectories') {
    trajectoryLayer.selectAll("line.fragment-trajectory")
      .style("opacity", 0.9);

    trajectoryLayer.selectAll("circle.fragment-ghost")
      .style("opacity", 1);
  }
}

  nodes
    .on("mouseenter", function(ev, d) {
      if (selected) return;
      highlight(d.id);
    })
    .on("mouseleave", function() {
      if (selected) return;
      reset();
    })
    .on("click", function(ev, d) {
      ev.stopPropagation();

      if (agencementCreation.active && currentPatternMode === 'agencements') {
        toggleFragmentInManualAgencement(d.feature);
        return;
      }

      if (selected === d.id) {
        selected = null;
        reset();
      } else {
        selected = d.id;
        highlight(d.id);
      }

      openFragmentWithPatternsTabs(d.feature.properties || {});
    });

  svg.on("click", () => {
    selected = null;
    reset();
  });
}

function getScreenPointsForAgencementInProxemic(ag, nodeById) {
  const pts = [];

  (ag.fragmentIds || []).forEach(fid => {
    const key = cleanFragmentId(fid); // ou cleanId(fid), mais une seule fonction partout
    const node = nodeById.get(key);
    if (node) pts.push([node.x, node.y]);
  });

  return pts;
}

function computeHullScreenPoints(points) {
  if (!points || points.length < 3) return points || [];

  const pts = points
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper).map(p => [p.x, p.y]);
}

function hullToSvgPath(hull) {
  if (!hull || !hull.length) return '';
  return 'M' + hull.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
}

function drawExistingAgencementContoursInProxemic(contourLayer, nodeById) {
  const saved = loadSavedAgencements ? loadSavedAgencements() : [];

  saved.forEach(ag => {
    const pts = getScreenPointsForAgencementInProxemic(ag, nodeById);
    if (pts.length < 2) return;

    let hull = computeHullScreenPoints(pts);

    if (pts.length === 2) {
      const [a, b] = pts;
      hull = [a, [a[0] + 8, a[1] + 8], b, [b[0] - 8, b[1] - 8]];
    }

    contourLayer.append("path")
      .attr("class", "existing-agencement-contour")
      .attr("d", hullToSvgPath(hull))
      .style("fill", "none")
      .style("stroke", "#ffffff")
      .style("stroke-width", 2)
      .style("stroke-dasharray", "6 4")
      .style("opacity", 0.9)
      .style("pointer-events", "stroke")
      .on("click", (ev) => {
        ev.stopPropagation();
        if (ag.uid) openSavedAgencementPanel(ag.uid);
      });
  });
}

function drawManualAgencementContourInProxemic(contourLayer, nodeById) {
  const manualAg = getCurrentManualAgencement();
  if (!manualAg.fragmentsCount) return;

  const pts = manualAg.fragmentIds
    .map(fid => nodeById.get(String(fid).trim()))
    .filter(Boolean)
    .map(node => [node.x, node.y]);

  if (pts.length < 2) return;

  let hull = computeHullScreenPoints(pts);

  if (pts.length === 2) {
    const [a, b] = pts;
    hull = [a, [a[0] + 10, a[1] + 10], b, [b[0] - 10, b[1] - 10]];
  }

  contourLayer.append("path")
  .attr("class", "manual-agencement-contour")
    .attr("d", hullToSvgPath(hull))
    .style("fill", "rgba(255,255,255,0.04)")
    .style("stroke", "#ffffff")
    .style("stroke-width", 3)
    .style("stroke-dasharray", "6 4")
    .style("opacity", 0.95)
    .style("pointer-events", "none");
}

function drawPatternOccurrenceContoursInProxemic(contoursLayer, nodeById) {
  if (!contoursLayer || !nodeById) return;

  Object.entries(patterns || {}).forEach(([pKey, pData]) => {
    const occIds = (pData?.occurrences || []).slice();

    occIds.forEach((agId) => {
      const ag = agencementsById.get(agId);
      if (!ag) return;

      const pts = getScreenPointsForAgencementInProxemic(ag, nodeById);
      if (!pts.length) return;

      let hull = null;

      if (pts.length >= 3) {
        hull = computeHullScreenPoints(pts);
      } else if (pts.length === 2) {
        const [a, b] = pts;
        hull = [
          [a[0], a[1]],
          [a[0] + 10, a[1] + 10],
          [b[0], b[1]],
          [b[0] - 10, b[1] - 10]
        ];
      } else if (pts.length === 1) {
        const [x, y] = pts[0];
        hull = [
          [x - 12, y - 12],
          [x + 12, y - 12],
          [x + 12, y + 12],
          [x - 12, y + 12]
        ];
      }

      if (!hull || hull.length < 3) return;

      const isBaseOccurrence = agId === pData.sourceAgencementId;

      contoursLayer.append("path")
        .attr("class", "pattern-occurrence-contour")
        .attr("d", hullToSvgPath(hull))
        .style("fill", "none")
        .style("stroke", colorForPattern ? colorForPattern(pKey) : "#999")
        .style("stroke-width", 2.5)
        .style("stroke-dasharray", isBaseOccurrence ? "8 6" : null)
        .style("opacity", 0.95)
        .style("pointer-events", "none");
    });
  });
}

function refreshManualAgencementEverywhere() {
  refreshAgencementSelectionMap();

  if (currentView === 'proxemic' && currentPatternMode === 'agencements') {
    showAgencementSelectionProxemicView();
  }
}

/* ==================================================
 16) MODALES ET ÉDITEURS
================================================== */

/* ==================================================
 16.1 Édition agencements
================================================== */

function openAgencementEditor(options) {
  const {
    mode = 'edit',
    agencement = null,
    onSave = () => {},
    headerText,
    saveText
  } = options || {};

  if (!agencement) return;

  const modal = document.getElementById('save-pattern-modal');
  if (!modal) return;

  modal.style.zIndex = '6000';
  document.body.appendChild(modal);

  const keyEl   = document.getElementById('sp-key');
  const nameEl  = document.getElementById('sp-name');
  const descEl  = document.getElementById('sp-desc');
  const listEl  = document.getElementById('sp-fragments');
  const countEl = document.getElementById('sp-frag-count');
  const btnSave   = document.getElementById('sp-save');
  const btnCancel = document.getElementById('sp-cancel');

  const headTitle = modal.querySelector('.modal__head strong');

  headTitle.textContent = headerText || (
    mode === 'edit' ? 'Modifier cet agencement' : 'Enregistrer cet agencement'
  );
  btnSave.textContent = saveText || (
    mode === 'edit' ? 'Enregistrer les modifications' : 'Enregistrer'
  );

  // Ici on détourne le champ "clé pattern" pour afficher l’ID de l’agencement
  keyEl.value = agencement.id || '';
  nameEl.value = (agencement.name || agencement.id || '').trim();
  descEl.value = agencement.description || '';

  // Liste des éléments
  const allFrags = [...(dataGeojson || []), ...(datamGeojson || [])];
  const byFragId = new Map(allFrags.map(f => [String(f.properties?.id || '').trim(), f]));

  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(allBlds.map(b => [String(b.properties?.id || '').trim(), b]));

  const fragIds = agencement.fragmentIds || [];
  const bldIds  = agencement.buildingIds || [];

  countEl.textContent = String(fragIds.length + bldIds.length);
  listEl.innerHTML = '';

  fragIds.forEach(id => {
    const f = byFragId.get(String(id).trim());
    const line = document.createElement('div');
    line.textContent = `${id}${f?.properties?.name ? ' — ' + f.properties.name : ''}`;
    listEl.appendChild(line);
  });

  bldIds.forEach(id => {
    const b = byBldId.get(String(id).trim());
    const props = b?.properties || {};
    const line = document.createElement('div');
    line.textContent = `${id} — ${props.fonction || props['fonction'] || '—'} — ${props['état'] || props.etat || '—'}`;
    listEl.appendChild(line);
  });

  function close() {
    modal.style.display = 'none';
    cleanup();
  }

  function cleanup() {
    const backdrop = modal.querySelector('.modal__backdrop');
    if (backdrop) backdrop.onclick = null;
    btnCancel.onclick = null;
    btnSave.onclick = null;
  }

  const backdrop = modal.querySelector('.modal__backdrop');
  if (backdrop) backdrop.onclick = close;
  btnCancel.onclick = close;

  btnSave.onclick = () => {
    const payload = {
      uid: agencement.uid,
      id: agencement.id,
      name: (nameEl.value || agencement.name || agencement.id || '').trim(),
      description: (descEl.value || '').trim()
    };

    onSave(payload);
    close();
  };

  modal.style.display = 'block';
}

function openEditSavedAgencementModal(uid) {
  const items = loadSavedAgencements();
  const ag = items.find(x => x.uid === uid);
  if (!ag) return;

  openAgencementEditor({
    mode: 'edit',
    agencement: ag,
    headerText: 'Modifier cet agencement',
    saveText: 'Enregistrer les modifications',
        onSave: (payload) => {
      updateSavedAgencement(uid, {
        name: payload.name,
        description: payload.description
      });

      refreshAgencementDisplays();
    }
  });
}

function openEditComputedAgencementModal(ag) {
  if (!ag?.id) return;

  openAgencementEditor({
    mode: 'edit',
    agencement: ag,
    headerText: 'Modifier cet agencement',
    saveText: 'Enregistrer les modifications',
    onSave: (payload) => {
      setAutoAgencementName(ag.id, payload.name);
      refreshAgencementDisplays();
    }
  });
}

function openSavedAgencementsListModal() {
  clearAllTabbedTabs();

  openTab({
    id: 'saved-agencements-list',
    title: 'Agencements',
    kind: 'saved-agencements-list',
    render: panel => openSavedAgencementsListInPanel(panel)
  });
}

/* ==================================================
 16.2 Édition patterns
================================================== */


function openPatternEditor(options) {
  const {
    mode = 'create',
    patternKey = '',
    elements = [],
    name = patternKey,
    description = '',
    onSave = () => {},
    headerText,
    saveText
  } = options || {};

  const modal   = document.getElementById('save-pattern-modal');
  modal.style.zIndex = '6000';
  document.body.appendChild(modal);

  const keyEl   = document.getElementById('sp-key');
  const nameEl  = document.getElementById('sp-name');
  const descEl  = document.getElementById('sp-desc');
  const listEl  = document.getElementById('sp-fragments');
  const countEl = document.getElementById('sp-frag-count');
  const btnSave   = document.getElementById('sp-save');
  const btnCancel = document.getElementById('sp-cancel');

  // Titre & labels
  const headTitle = modal.querySelector('.modal__head strong');
  headTitle.textContent = headerText || (mode === 'edit' ? 'Modifier ce pattern' : 'Enregistrer ce pattern');
  btnSave.textContent   = saveText   || (mode === 'edit' ? 'Enregistrer les modifications' : 'Enregistrer');

  // Champs
  keyEl.value   = patternKey;
  nameEl.value  = (name || patternKey).trim();
  descEl.value  = description || '';

  // Liste des fragments membres
  countEl.textContent = String(elements.length);
  const all = [...(dataGeojson || []), ...(datamGeojson || [])];
  const byId = new Map(all.map(f => [f.properties.id, f]));
  listEl.innerHTML = '';
  elements.forEach(id => {
    const f = byId.get(id);
    const line = document.createElement('div');
    line.textContent = `${id}${f?.properties?.name ? ' — ' + f.properties.name : ''}`;
    listEl.appendChild(line);
  });

  function close() {
    modal.style.display = 'none';
    cleanup();
  }
  function cleanup() {
    document.querySelector('#save-pattern-modal .modal__backdrop').onclick = null;
    btnCancel.onclick = null;
    btnSave.onclick = null;
  }

  document.querySelector('#save-pattern-modal .modal__backdrop').onclick = close;
  btnCancel.onclick = close;

  btnSave.onclick = () => {
    const payload = {
      patternKey,
      name: (nameEl.value || patternKey).trim(),
      description: (descEl.value || '').trim(),
      elements: elements.slice(),
    };
    onSave(payload);
    close();
  };

  modal.style.display = 'block';
}

function openSavePatternModal(patternKey, patternData) {
  const occIds = (patternData?.occurrences || []).slice();
  const occs = occIds
    .map(id => agencementsById.get(id))
    .filter(Boolean)
    .sort(sortAgencementsById);

  const elements = computeFragmentsUnionFromOccurrences(occIds);

  const occurrenceSnapshots = occs
    .map(ag => buildSavedPatternOccurrenceSnapshot(ag, patternKey))
    .filter(Boolean);

  openPatternEditor({
    mode: 'create',
    patternKey,
    elements,
    name: patternKey,
    description: '',
    headerText: 'Enregistrer ce pattern',
    onSave: (payload) => {
      const rec = {
        uid: 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),

        patternKey,
        name: payload.name,
        description: payload.description,

        occurrences: occIds.slice(),
        occurrenceSnapshots: occurrenceSnapshots.slice(),

        elements: elements.slice(),

        sourceAgencementId: patternData?.sourceAgencementId || null,
        size: occIds.length,

        params: getCurrentPatternParams(),

        savedAt: new Date().toISOString()
      };

      addSavedPattern(rec);
      openSavedPatternPanel(rec.uid);
    }
  });
}

function openEditSavedPatternModal(uid) {
  const items = loadSavedPatterns();
  const rec = items.find(x => x.uid === uid);
  if (!rec) return;

  openPatternEditor({
    mode: 'edit',
    patternKey: rec.patternKey,
    elements: rec.elements || [],
    criteria: rec.criteria || {},      // ⇐ on garde les critères fuzzy
    name: rec.name || rec.patternKey,
    description: rec.description || '',
    onSave: (payload) => {
      // On ne modifie ici que nom + description (les critères peuvent rester)
      updateSavedPattern(uid, {
        name: payload.name,
        description: payload.description
      });

      // rafraîchir la fiche ouverte si elle existe
      const tabId = `saved-${uid}`;
      const updated = loadSavedPatterns().find(x => x.uid === uid);
      if (Tabbed?.openTabs?.has(tabId)) {
        const panel = Tabbed.openTabs.get(tabId).panel;
        renderSavedPatternPanel(panel, updated);
        // mettre à jour le titre de l'onglet
        Tabbed.openTabs.get(tabId).btn.firstChild.nodeValue = (updated.name || updated.patternKey);
      }

      // rafraîchir la liste si la modale est ouverte
      const listModal = document.getElementById('saved-patterns-list-modal');
      if (listModal && listModal.style.display === 'block') {
        openSavedPatternsListModal();
      }
    }
  });
}

function openSavedPatternsListModal() {
  const modal = document.getElementById('saved-patterns-list-modal');
  const body = document.getElementById('splist-body');
  const closeBtn = document.getElementById('splist-close');

  body.innerHTML = '';

  const items = loadSavedPatterns()
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  if (!items.length) {
    body.innerHTML = '<div style="color:#aaa">Aucun pattern enregistré pour le moment.</div>';
  } else {
    items.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'saved-item';

      const h = document.createElement('h4');
      h.textContent = `${rec.name || rec.patternKey} (${rec.patternKey || '—'})`;

      const meta = document.createElement('div');
      meta.className = 'meta';

      const occCount = Array.isArray(rec.occurrenceSnapshots)
        ? rec.occurrenceSnapshots.length
        : (rec.occurrences?.length || 0);

      meta.textContent =
        `Enregistré : ${fmtDate(rec.savedAt)}` +
        (rec.updatedAt ? ` • Modifié : ${fmtDate(rec.updatedAt)}` : '') +
        ` • Occurrences : ${occCount}` +
        ` • Fragments : ${rec.elements?.length || 0}`;

      const params = document.createElement('div');
      params.style.cssText = 'margin-top:6px;color:#bbb;font-size:12px;';
      params.textContent =
        `Diamètre : ${rec.params?.perimeterDiameterM ?? '—'} m • ` +
        `Seuil : ${Number.isFinite(rec.params?.agSimilarityThreshold) ? Number(rec.params.agSimilarityThreshold).toFixed(2) : '—'}`;

      const row = document.createElement('div');
      row.className = 'row';

      const bOpen = document.createElement('button');
      bOpen.className = 'tab-btn btn-sm primary';
      bOpen.textContent = 'Consulter';
      bOpen.onclick = () => {
        modal.style.display = 'none';
        openSavedPatternPanel(rec.uid);
      };

      const bEdit = document.createElement('button');
      bEdit.className = 'tab-btn btn-sm';
      bEdit.textContent = 'Modifier';
      bEdit.onclick = () => openEditSavedPatternModal(rec.uid);

      const bDel = document.createElement('button');
      bDel.className = 'tab-btn btn-sm danger';
      bDel.textContent = 'Supprimer';
      bDel.onclick = () => {
        deleteSavedPattern(rec.uid);
        openSavedPatternsListModal();

        const tabId = `saved-${rec.uid}`;
        if (Tabbed?.openTabs?.has(tabId)) closeTab(tabId);
      };

      row.append(bOpen, bEdit, bDel);

      const p = document.createElement('div');
      p.style.cssText = 'margin-top:6px;color:#ccc;white-space:pre-wrap';
      p.textContent = rec.description || '—';

      card.append(h, meta, params, row, p);
      body.appendChild(card);
    });
  }

  function close() {
    modal.style.display = 'none';
    cleanup();
  }

  function cleanup() {
    document.querySelector('#saved-patterns-list-modal .modal__backdrop').onclick = null;
    closeBtn.onclick = null;
  }

  document.querySelector('#saved-patterns-list-modal .modal__backdrop').onclick = close;
  closeBtn.onclick = close;

  modal.style.display = 'block';
}


/* ==================================================
 17) NAVIGATION GÉNÉRALE ET SHELL DE L’APPLICATION
================================================== */

/* ==================================================
 17.1 UI générale
================================================== */

function updateInterfaceElements(viewId) {
  const legendBtn   = document.getElementById('toggle-legend-btn');
  const locationBtn = document.getElementById('toggle-location-btn');
  const discoursesToggleBox = document.getElementById('discourses-toggle-box');
  const diffToggleBtn = document.getElementById('toggle-diffractions-btn');

  if (diffToggleBtn) {
    diffToggleBtn.style.display = (viewId === 'proxemic') ? 'block' : 'none';
  }

  const buildingsBox = document.getElementById('buildings-style-box');
  if (buildingsBox) {
    buildingsBox.style.display = (viewId === 'map') ? 'block' : 'none';
  }

  if (discoursesToggleBox) {
    const showDiscoursesToggle =
      viewId === 'map';

    discoursesToggleBox.style.display = showDiscoursesToggle ? 'block' : 'none';
  }

  const wantsLegend =
    viewId === 'fragment-proxemic' ||
    viewId === 'proxemic' ||
    viewId === 'gallery' ||
    viewId === 'patterns-map';

  if (legendBtn) {
    legendBtn.style.display = wantsLegend ? 'block' : 'none';
  }

  if (locationBtn) {
    locationBtn.style.display =
      (viewId === 'map' || viewId === 'patterns-map' || viewId === 'unit') ? 'block' : 'none';
  }


    const savedPatternsBtn = document.getElementById('saved-patterns-list-btn');
      if (savedPatternsBtn) {
    const showSavedPatternsBtn =
      currentPatternMode === 'patterns';

    savedPatternsBtn.style.display = showSavedPatternsBtn ? 'inline-flex' : 'none';
  }

    const zonesFilterBox = document.getElementById('filters');
      if (zonesFilterBox) {
    const showZonesFilters =
      viewId === 'map' ||
      viewId === 'fragment-proxemic' ||
      viewId === 'patterns-map' ||
      viewId === 'proxemic' ||
      viewId === 'gallery';

    zonesFilterBox.style.display = showZonesFilters ? 'block' : 'none';
  }

  updateFragmentTimeButtonsUI();
}

/* ==================================================
 17.2 Radios bâtiments — IIFE
================================================== */

(function initBuildingsStyleRadiosOnce(){
  const radios = document.querySelectorAll('input[name="buildings-style"]');
  if (!radios.length) return;

  radios.forEach(r => {
    r.addEventListener('change', () => {
      BUILDINGS_STYLE_MODE = r.value;
      restyleBuildingsOnFragmentsMap();
    });
  });
})();

/* ==================================================
 17.3 Références DOM de navigation
================================================== */

const topTabs = document.querySelectorAll('.top-tab');
const subnav = document.getElementById('subnav-patterns');
const subnavUnit = document.getElementById('subnav-unit');
const subnavFragments = document.getElementById('subnav-fragments');
const patternModeTabs = document.querySelectorAll('.pattern-mode-tab');
const patternViewTabs = document.querySelectorAll('.pattern-view-tab');
const subnavPatternsLevel3 = document.getElementById('subnav-patterns-level3');
const fragmentSubTabs = document.querySelectorAll('.sub-tab-fragment');


const PATTERN_VIEW_TO_DOM = {
  map: 'patterns-map',
  proxemic: 'proxemic-view',
  gallery: 'gallery-view'
};

/* ==================================================
 17.4 Fonctions de navigation
================================================== */

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    if (!v) return;
    v.style.display = 'none';
    v.classList.remove('active');
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }

  if (viewId === 'map' && map?.invalidateSize) {
    setTimeout(() => map.invalidateSize(), 0);
  }

  if (viewId === 'patterns-map' && patternMap?.invalidateSize) {
    setTimeout(() => patternMap.invalidateSize(), 0);
  }

  if (viewId === 'unit-view' && unitMap?.invalidateSize) {
    setTimeout(() => unitMap.invalidateSize(), 0);
  }
}

function setFragmentSubTab(name) {
  currentFragmentSub = name;

  fragmentSubTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fragmentSub === name);
  });

  if (name === 'map') {
    currentView = 'map';
    showView('map');
  } else if (name === 'proxemic') {
    currentView = 'fragment-proxemic';
    showView('fragment-proxemic-view');
    showFragmentProxemicView();
  }

  updateInterfaceElements(currentView);
}

function setTopTab(name) {
  topTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.top === name));

  if (subnavFragments) {
    subnavFragments.classList.toggle('subnav--inactive', name !== 'fragments');
  }

  if (name === 'fragments') {
  subnav.classList.add('subnav--inactive');
  if (subnavUnit) subnavUnit.classList.add('subnav--inactive');
  if (subnavPatternsLevel3) subnavPatternsLevel3.classList.add('subnav--inactive');
  if (subnavPlaceholderLevel3) subnavPlaceholderLevel3.classList.remove('subnav--inactive');

  setFragmentSubTab(currentFragmentSub || 'map');
}

  else if (name === 'patterns') {
  subnav.classList.remove('subnav--inactive');
  if (subnavPatternsLevel3) subnavPatternsLevel3.classList.remove('subnav--inactive');
  if (subnavPlaceholderLevel3) subnavPlaceholderLevel3.classList.add('subnav--inactive');
  if (subnavUnit) subnavUnit.classList.add('subnav--inactive');
  if (subnavFragments) subnavFragments.classList.add('subnav--inactive');

  setPatternModeTab(currentPatternMode || 'agencements');
}

  else if (name === 'unit') {
  subnav.classList.add('subnav--inactive');
  if (subnavFragments) subnavFragments.classList.add('subnav--inactive');
  if (subnavUnit) subnavUnit.classList.remove('subnav--inactive');
  if (subnavPatternsLevel3) subnavPatternsLevel3.classList.add('subnav--inactive');
  if (subnavPlaceholderLevel3) subnavPlaceholderLevel3.classList.remove('subnav--inactive');

  currentView = 'unit';
  showView('unit-view');
  ensureUnitMap();
  if (!unitContext) renderAllUnits();

  setUnitSubTab(currentUnitSub || 'map');
  updateInterfaceElements(currentView);
}

  if (unitCreation.active && name !== 'patterns') stopUnitCreation();
}

function setPatternModeTab(mode) {
  currentPatternMode = mode;

  patternModeTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.patternMode === mode);
  });

  const agencementControls = document.getElementById('agencement-controls');

  // ----- CAS COMPARAISON : vue autonome, sans niveau 3 -----
if (mode === 'comparison') {
  if (subnavPatternsLevel3) {
    subnavPatternsLevel3.classList.add('subnav--inactive');
  }

  if (subnavPlaceholderLevel3) {
    subnavPlaceholderLevel3.classList.add('subnav--inactive');
  }

  document.querySelectorAll('.pattern-gallery-tab').forEach(btn => {
    btn.style.display = 'none';
  });

  if (agencementControls) {
    agencementControls.style.display = 'none';
  }

  currentView = 'comparison';
  showView('comparison-view');
  renderComparisonView();
  updateInterfaceElements(currentView);
  return;
}

  // ----- AUTRES MODES : logique existante -----
  if (subnavPatternsLevel3) subnavPatternsLevel3.classList.remove('subnav--inactive');
  if (subnavPlaceholderLevel3) subnavPlaceholderLevel3.classList.add('subnav--inactive');

  document.querySelectorAll('.pattern-gallery-tab').forEach(btn => {
    btn.style.display = (mode === 'patterns') ? 'inline-flex' : 'none';
  });

  if (mode === 'patterns') {
    const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
    recomputeAgencementPatterns({
      fragments: visibleFragments,
      buildings: visibleBuildings
    });
  }

  if (mode !== 'patterns' && currentPatternView === 'gallery') {
    currentPatternView = 'map';
  }

  if (agencementControls) {
    agencementControls.style.display =
      (mode === 'patterns' || mode === 'agencements') ? 'block' : 'none';
  }

  setPatternViewTab(currentPatternView || 'map');
}

function setPatternViewTab(viewName) {
  if (currentPatternMode === 'comparison') return;
  currentPatternView = viewName;

  patternViewTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.patternView === viewName);
  });

  const domView = PATTERN_VIEW_TO_DOM[viewName];
  if (!domView) return;

  // comparaison : pour l'instant on réutilise la carte/proxémie existantes, galerie vide/inaccessible
  if (currentPatternMode === 'comparison' && viewName === 'gallery') {
    currentPatternView = 'map';
    return setPatternViewTab('map');
  }

  if (unitCreation.active) {
    const ok =
      (unitCreation.mode === 'map' && viewName === 'map') ||
      (unitCreation.mode === 'proxemic' && viewName === 'proxemic');

    if (!ok) stopUnitCreation();
  }

  if (viewName === 'map') currentView = 'patterns-map';
  else if (viewName === 'proxemic') currentView = 'proxemic';
  else if (viewName === 'gallery') currentView = 'gallery';

  showView(domView);

if (viewName === 'map') {
  initPatternMapOnce();
  setTimeout(() => patternMap?.invalidateSize?.(), 0);

  renderPatternBaseGrey();

  if (currentPatternMode === 'patterns') {
    hideAgencementLayers();
    refreshPatternsMap();
  } else if (currentPatternMode === 'agencements') {
    hidePatternLayers();
    refreshAgencementSelectionMap();
    renderSavedAgencementsOnMap();
  }
}

if (viewName === 'proxemic') {
  showProxemicView();
} else if (viewName === 'gallery') {
  if (currentPatternMode === 'patterns') {
    showGalleryView();
  } else {
    const gallery = document.getElementById('gallery-view');
    if (gallery) gallery.innerHTML = "<div style='padding:24px;font-family:Consolas,monospace;'>Vide pour l’instant.</div>";
  }
}
  updateInterfaceElements(currentView);
}

function setUnitSubTab(name) {
  currentUnitSub = name;

  const subBtns = document.querySelectorAll('.sub-tab-unit');
  subBtns.forEach(b => b.classList.toggle('active', b.dataset.unitSub === name));

  const elMap = document.getElementById('unit-map');
  const elProx = document.getElementById('unit-proxemic');

  if (!elMap || !elProx) return;

  elMap.style.display = (name === 'map') ? 'block' : 'none';
  elProx.style.display = (name === 'proxemic') ? 'block' : 'none';

  if (name === 'map') {
    ensureUnitMap();
    setTimeout(() => unitMap?.invalidateSize?.(), 0);
    // si on a un contexte, on le (re)rend
    if (unitContext) renderUnitPatternContextOnUnitMap(unitContext.patternKey, unitContext.sourceFragmentId);
  } else {
    if (unitContext) renderUnitProxemicPattern(unitContext.patternKey, unitContext.sourceFragmentId);
  }
}

/* ==================================================
 17.5 Sous-navigation unité — IIFE
================================================== */

(function initUnitSubnavOnce(){
  const subnavUnit = document.getElementById('subnav-unit');
  if (!subnavUnit) return;

  subnavUnit.querySelectorAll('.sub-tab-unit').forEach(btn => {
    btn.addEventListener('click', () => setUnitSubTab(btn.dataset.unitSub));
  });
})();

/* ==================================================
 17.6 Initialisation visuelle immédiate
================================================== */

// État initial
setTopTab('fragments');
setFragmentSubTab('map');
restyleBuildingsOnFragmentsMap();

/* ==================================================
 18) RAFRAÎCHISSEMENTS GLOBAUX ET UTILITAIRES UI
================================================== */


function refreshAgencementDisplays() {
  hydratedSavedAgencementsCache = null;
  hydratedSavedAgencementsCacheKey = '';
  lastPatternComputeKey = '';

  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
  recomputeAgencementPatterns({
    fragments: visibleFragments,
    buildings: visibleBuildings
  });

  if (currentView === 'patterns-map') {
    renderPatternBaseGrey();

    if (currentPatternMode === 'patterns') {
      refreshPatternsMap();
    } else if (currentPatternMode === 'agencements') {
      refreshAgencementSelectionMap();
      renderSavedAgencementsOnMap();
    }
  } else if (currentView === 'proxemic') {
    if (currentPatternMode === 'patterns') showProxemicView();
    else showAgencementSelectionProxemicView();
  } else if (currentView === 'gallery') {
    showGalleryView();
  }

  const allFrags = [...(dataGeojson || []), ...(datamGeojson || [])]
    .filter(f => !f.properties?.isDiscourse && !f.properties?.isBuilding);

  const byFragId = new Map(
    allFrags.map(f => [String(f.properties?.id || '').trim(), f])
  );

  const allBlds = [...(batimentsMontreuilGeojson || []), ...(batimentsToulouseGeojson || [])];
  const byBldId = new Map(
    allBlds.map(b => [String(b.properties?.id || '').trim(), b])
  );

  Tabbed.openTabs.forEach((rec, tabId) => {
    if (rec.kind === 'agencement') {
      const agId = tabId.replace(/^ag-/, '');
      const ag = agencementsById.get(agId);
      if (!ag) return;

      renderAgencementPanel(rec.panel, ag, { byFragId, byBldId });
      rec.btn.firstChild.nodeValue = ag.name || ag.id;
    }

    if (rec.kind === 'pattern') {
      const pKey = tabId.replace(/^pattern-/, '');
      renderPatternPanel(rec.panel, pKey, patterns[pKey] || {});
    }

    if (rec.kind === 'saved-agencement') {
      const uid = tabId.replace(/^saved-ag-/, '');
      const saved = loadSavedAgencements().find(x => x.uid === uid);
      if (!saved) return;

      renderSavedAgencementPanel(rec.panel, saved);
      rec.btn.firstChild.nodeValue = saved.name || saved.id;
    }

    if (rec.kind === 'saved-agencements-list') {
      openSavedAgencementsListInPanel(rec.panel);
    }
  });

  if (currentView === 'comparison') {
  renderComparisonView();
}
}


function updateFragmentTimeButtonsUI() {
  document.querySelectorAll('.fragment-time-btn[data-fragment-time]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fragmentTime === currentFragmentTimeMode);
  });

  document.querySelectorAll('.pattern-gallery-time-btn').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.patternGalleryTime === currentPatternGalleryTimeMode
    );
  });

  const fragmentControls = document.getElementById('fragment-time-controls');
  if (fragmentControls) {
    const showFragmentControls =
      currentView === 'map' ||
      currentView === 'fragment-proxemic' ||
      currentView === 'proxemic' ||
      currentView === 'patterns-map';

    fragmentControls.style.display = showFragmentControls ? 'flex' : 'none';
  }

const galleryControls = document.getElementById('pattern-gallery-time-controls');
if (galleryControls) {
  galleryControls.style.display =
    (currentView === 'gallery' || currentView === 'comparison') ? 'flex' : 'none';
}

  const legend = document.getElementById('fragment-time-legend');
  if (legend) {
    const showLegend =
      currentFragmentTimeMode === 'trajectories' &&
      (
        currentView === 'map' ||
        currentView === 'fragment-proxemic' ||
        currentView === 'proxemic' ||
        currentView === 'patterns-map'
      );

    legend.style.display = showLegend ? 'block' : 'none';
  }
}

function setFragmentTimeMode(mode) {
  currentFragmentTimeMode = mode;
  updateInterfaceElements(currentView);

  if (currentPatternMode === 'patterns') {
    const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
    recomputeAgencementPatterns({
      fragments: visibleFragments,
      buildings: visibleBuildings
    });
  }

  if (currentView === 'map') {
    renderFragmentsMapByTimeMode();
    restyleBuildingsOnFragmentsMap();
  } else if (currentView === 'fragment-proxemic') {
    showFragmentProxemicView();
  } else if (currentView === 'proxemic') {
    showProxemicView();
  } else if (currentView === 'patterns-map') {
    renderPatternBaseGrey();

    if (currentPatternMode === 'patterns') {
      refreshPatternsMap();
    } else if (currentPatternMode === 'agencements') {
      refreshAgencementSelectionMap();
    }
  }
}

function refreshProxemicPreserveTransform() {
  if (currentView !== "proxemic") return;

  const svg = d3.select("#proxemic-view svg");
  const world = svg.empty() ? null : svg.select("g");
  const oldTransform = world ? world.attr("transform") : null;

  showProxemicView();

  if (oldTransform) {
    const newSvg = d3.select("#proxemic-view svg");
    const newWorld = newSvg.select("g");
    if (!newWorld.empty()) newWorld.attr("transform", oldTransform);
  }
}

const diffToggleBtn = document.getElementById("toggle-diffractions-btn");

function syncDiffToggleUI() {
  if (!diffToggleBtn) return;
  diffToggleBtn.textContent = SHOW_DIFFRACTIONS ? "Masquer les diffractions" : "Afficher les diffractions";
}

/* ==================================================
 19) BINDINGS FINAUX ET ÉVÉNEMENTS
================================================== */

/* ==================================================
 19.1 DOMContentLoaded + clavier
================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const infoBtn = document.getElementById('info-btn');
  const aboutBox = document.getElementById('about');

  function toggleAbout() {
    const isOpen = aboutBox.style.display === 'block';
    aboutBox.style.display = isOpen ? 'none' : 'block';
    if (infoBtn) {
      infoBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    }
  }

  if (infoBtn) {
    infoBtn.addEventListener('click', toggleAbout);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutBox.style.display === 'block') {
      toggleAbout();
    }
  });

  document.querySelectorAll('.filter-zone').forEach(cb => {
    cb.checked = true;
  });

  document.querySelectorAll('.crit-key').forEach(cb => {
    cb.checked = true;
  });

  ACTIVE_CRITERIA_KEYS = new Set(ALL_CRITERIA_KEYS);
  ACTIVE_CRITERIA_CACHE_KEY = Array.from(ACTIVE_CRITERIA_KEYS).sort().join('|');
lastPatternComputeKey = '';
  applyFilters();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && agencementCreation.active) {
    stopAgencementCreation();
  }
});

/* ==================================================
 19.2 Listeners de navigation
================================================== */

topTabs.forEach(btn => btn.addEventListener('click', () => setTopTab(btn.dataset.top)));
patternModeTabs.forEach(btn => {
  btn.addEventListener('click', () => setPatternModeTab(btn.dataset.patternMode));
});

patternViewTabs.forEach(btn => {
  btn.addEventListener('click', () => setPatternViewTab(btn.dataset.patternView));
});
fragmentSubTabs.forEach(btn => {
  btn.addEventListener('click', () => setFragmentSubTab(btn.dataset.fragmentSub));
});

/* ==================================================
 19.3 Sliders
================================================== */

const sliderEl = document.getElementById('similarity-slider');
const sliderValueEl = document.getElementById('slider-value');

if (sliderEl && sliderValueEl) {
  const initial = parseInt(sliderEl.value, 10) / 100;
  AG_SIM_THRESHOLD = initial;
  sliderValueEl.textContent = initial.toFixed(2);

  sliderEl.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    AG_SIM_THRESHOLD = v / 100;
    sliderValueEl.textContent = AG_SIM_THRESHOLD.toFixed(2);
  });

sliderEl.addEventListener('change', () => {
  if (currentPatternMode !== 'patterns') return;

  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
  recomputeAgencementPatterns({ fragments: visibleFragments, buildings: visibleBuildings });

  if (currentView === 'patterns-map') {
    refreshPatternsMap();
  } else if (currentView === 'proxemic') {
    showProxemicView();
  } else if (currentView === 'gallery') {
    showGalleryView();
  }
});
}

/*périmètre*/
const perimeterEl = document.getElementById('perimeter-slider');
const perimeterValueEl = document.getElementById('perimeter-value');

if (perimeterEl && perimeterValueEl) {
  PERIMETER_DIAMETER_M = parseInt(perimeterEl.value, 10) || PERIMETER_DIAMETER_M;
  perimeterValueEl.textContent = String(PERIMETER_DIAMETER_M);

  perimeterEl.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v)) return;

    PERIMETER_DIAMETER_M = v;
    perimeterValueEl.textContent = String(PERIMETER_DIAMETER_M);
  });

perimeterEl.addEventListener('change', () => {
  lastPatternComputeKey = '';

  const { visibleFragments, visibleBuildings } = getVisibleSpatialFeaturesForPatterns();
  recomputeAgencementPatterns({ fragments: visibleFragments, buildings: visibleBuildings });

  if (currentView === 'patterns-map') {
    renderPatternBaseGrey();
    if (currentPatternMode === 'patterns') {
      refreshPatternsMap();
    } else if (currentPatternMode === 'agencements') {
      refreshAgencementSelectionMap();
      renderSavedAgencementsOnMap();
    }
  } else if (currentView === 'proxemic') {
    showProxemicView();
  } else if (currentView === 'gallery') {
    showGalleryView();
  }
});
}

/* ==================================================
19.4 Diffractions
================================================== */

if (diffToggleBtn) {
  diffToggleBtn.addEventListener("click", () => {
    SHOW_DIFFRACTIONS = !SHOW_DIFFRACTIONS;
    syncDiffToggleUI();
    refreshProxemicPreserveTransform(); // tu l’as déjà
  });
}
syncDiffToggleUI();

/* ==================================================
19.5 Contrôles de temps
================================================== */

document.querySelectorAll('.fragment-time-btn[data-fragment-time]').forEach(btn => {
  btn.addEventListener('click', () => {
    setFragmentTimeMode(btn.dataset.fragmentTime);
  });
});

document.querySelectorAll('.pattern-gallery-time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentPatternGalleryTimeMode = btn.dataset.patternGalleryTime;
    updateInterfaceElements(currentView);

    if (currentView === 'gallery') {
      showGalleryView();
    } else if (currentView === 'comparison') {
      renderComparisonView();
    }
  });
});

/* ==================================================
19.6 Légende, critères, filtres
================================================== */

document.getElementById('toggle-legend-btn').addEventListener('click', () => {
  const legend = document.getElementById('criteria-legend');
  legend.style.display = (legend.style.display === 'none' || legend.style.display === '') ? 'block' : 'none';
});

document.querySelectorAll('.crit-key').forEach(cb => {
  cb.addEventListener('change', () => {
    const key = cb.dataset.key;
    if (!key) return;

    if (cb.checked) ACTIVE_CRITERIA_KEYS.add(key);
    else ACTIVE_CRITERIA_KEYS.delete(key);

    ACTIVE_CRITERIA_CACHE_KEY = Array.from(ACTIVE_CRITERIA_KEYS).sort().join('|');
    lastPatternComputeKey = '';

    // caches dépendants des critères
    hydratedSavedAgencementsCache = null;
    hydratedSavedAgencementsCacheKey = '';

    temporalPairsCache.montreuil = null;
    temporalPairsCache.mirail = null;

    // IMPORTANT : reconstruire l’index temporel avec les nouveaux critères actifs
    buildTemporalFragmentIndex();

    // IMPORTANT : réinjecter les features canoniques si tu veux que tout reste cohérent
    const canonicalMontreuil = [];
    temporalFragmentIndex.montreuil.forEach(info => {
      if (info.representative) canonicalMontreuil.push(info.representative);
    });

    const canonicalMirail = [];
    temporalFragmentIndex.mirail.forEach(info => {
      if (info.representative) canonicalMirail.push(info.representative);
    });

    dataGeojson = canonicalMontreuil;
    datamGeojson = canonicalMirail;
    combinedFeatures = [...dataGeojson, ...datamGeojson];

    applyFilters();
  });
});

document.querySelectorAll('.filter-zone').forEach(cb => {
  cb.addEventListener('change', () => {
    lastPatternComputeKey = '';
    applyFilters();
  });
});

/* ==================================================
19.7 Boutons agencements / patterns sauvegardés
================================================== */

const savedListBtn = document.getElementById('saved-patterns-list-btn');
if (savedListBtn) savedListBtn.addEventListener('click', () => openSavedPatternsListModal());


const createAgencementBtn = document.getElementById('create-agencement-btn');
const clearAgencementBtn = document.getElementById('clear-agencement-btn');
const validateAgencementBtn = document.getElementById('validate-agencement-btn');

if (createAgencementBtn) {
  createAgencementBtn.addEventListener('click', () => {
    if (agencementCreation.active) {
      stopAgencementCreation();
      return;
    }
    startAgencementCreation();
  });
}

if (clearAgencementBtn) {
  clearAgencementBtn.addEventListener('click', () => {
    clearAgencementSelection();
  });
}

if (validateAgencementBtn) {
  validateAgencementBtn.addEventListener('click', () => {
    validateCurrentManualAgencement();
  });
}

const savedAgencementsListBtn = document.getElementById('saved-agencements-list-btn');
if (savedAgencementsListBtn) {
  savedAgencementsListBtn.addEventListener('click', () => {
    openSavedAgencementsListModal();
  });
}

/* ==================================================
19.8 Checkbox discours
================================================== */

const toggleDiscoursesCheckbox = document.getElementById('toggle-discourses');
if (toggleDiscoursesCheckbox) {
  toggleDiscoursesCheckbox.addEventListener('change', () => {
    applyFilters();
  });
}
