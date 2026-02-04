// In-memory WBS data for Phase 1.
// Later this will load from /data/wbs-sample.json.

window.WBS_DATA = [
  {
    id: "1",
    code: "1",
    name: "Task 1",
    children: []
  },
  {
    id: "2",
    code: "2",
    name: "Task 2",
    children: [
      { id: "2.1", code: "2.1", name: "Subtask 2.1", children: [] },
      { id: "2.2", code: "2.2", name: "Subtask 2.2", children: [] }
    ]
  }
];

// Pills attached to WBS nodes:
// { [wbsNodeId]: { estimateType: [...], tag: [...], unit: [...] } }
window.wbsPills = {};

// Track collapsed WBS nodes
window.collapsedNodes = new Set();

// Track which nodes have labor estimation expanded
window.expandedLaborNodes = new Set();

// Track if resource rates are expanded (boolean)
window.showResourceRates = false;

// Financial column mode
window.financialMode = "detailed"; // "detailed" or "simple"

// Theme preference
window.currentTheme = "dark"; // "dark" or "light"

// Pricing method visibility (column expanders)
window.expandedPricingMethods = {
  labor: false,
  expense: false,
  usages: false,
  schedule: false,
  taskProps: false
};

window.laborResources = [];  // Global resource list for labor pricing
window.laborActivities = {};  // [taskId] = [ { id, name, hours: { resourceId_reg, resourceId_ot } } ]

// OH/Burden rates (as percentages/multipliers on direct labor)
// Three components: Labor Fringe, Operating Costs, and Operating OH
window.ohRates = {
  regular: {
    laborFringe: 0.35,     // 35% for labor fringe (benefits, etc.)
    operatingCosts: 0.45,  // 45% for operating costs
    operatingOH: 0.30      // 30% for operating OH
  },
  overtime: {
    laborFringe: 0.35,     // 35% for labor fringe
    operatingCosts: 0.45,  // 45% for operating costs
    operatingOH: 0.30      // 30% for operating OH
  }
};

// Helper to get total OH rate (sum of components)
window.getTotalOHRate = function(type) {
  const rates = window.ohRates[type] || window.ohRates.regular;
  return rates.laborFringe + rates.operatingCosts + rates.operatingOH;
};

// wbsPills[wbsNodeId].laborData will hold labor estimate details per node
// laborData = { activities: [...], resources: [...] }

// ---------------------- persistence ----------------------
const STATE_KEY = "estimator_state_v1";
const BACKUP_KEY = "estimator_state_backup_v1";
const MAX_BACKUPS = 5;

function getAppState() {
  return {
    WBS_DATA,
    wbsPills,
    laborResources,
    laborActivities,
    expandedPricingMethods,
    ohRates,
    currentTheme,
    financialMode,
    collapsedNodes: Array.from(collapsedNodes || []),
    expandedLaborNodes: Array.from(expandedLaborNodes || [])
  };
}

function applyAppState(state) {
  if (!state || typeof state !== "object") return;
  if (Array.isArray(state.WBS_DATA)) window.WBS_DATA = state.WBS_DATA;
  if (state.wbsPills && typeof state.wbsPills === "object") window.wbsPills = state.wbsPills;
  if (Array.isArray(state.laborResources)) window.laborResources = state.laborResources;
  if (state.laborActivities && typeof state.laborActivities === "object") window.laborActivities = state.laborActivities;
  if (state.expandedPricingMethods && typeof state.expandedPricingMethods === "object") {
    window.expandedPricingMethods = state.expandedPricingMethods;
  } else if (typeof state.laborMode === "boolean") {
    // Migrate old laborMode to new structure
    window.expandedPricingMethods.labor = state.laborMode;
  }
  if (state.ohRates && typeof state.ohRates === "object") window.ohRates = state.ohRates;
  if (state.currentTheme) window.currentTheme = state.currentTheme;
  if (state.financialMode) window.financialMode = state.financialMode;
  if (Array.isArray(state.collapsedNodes)) window.collapsedNodes = new Set(state.collapsedNodes);
  if (Array.isArray(state.expandedLaborNodes)) window.expandedLaborNodes = new Set(state.expandedLaborNodes);
}

window.loadAppState = function () {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    applyAppState(state);
    return true;
  } catch (e) {
    console.warn("Failed to load saved state", e);
    return false;
  }
};

window.saveAppState = function () {
  try {
    const payload = JSON.stringify(getAppState());
    localStorage.setItem(STATE_KEY, payload);
    return true;
  } catch (e) {
    console.warn("Failed to save state", e);
    return false;
  }
};

function saveBackup() {
  try {
    const payload = JSON.stringify({
      ts: new Date().toISOString(),
      state: getAppState()
    });
    const existing = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    existing.unshift(payload);
    const trimmed = existing.slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Failed to save backup", e);
  }
}

let autosaveTimer = null;
window.scheduleAutosave = function () {
  if (autosaveTimer) return;
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    saveAppState();
  }, 500);
};

window.forceBackupSave = function () {
  saveBackup();
};
