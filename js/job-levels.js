// Job Levels Registry — default rate schedules
// Each job level has Reg/OT cost rates
// Sell rates are per rate column (Standard, Premium, Discount, etc.)
// Resources can inherit from a job level and override as needed

window.JobLevels = (function () {
  // Will be loaded from job-levels.json
  let DEFAULT_LEVELS = [];
  let defaultLevelsLoaded = false;

  const CUSTOM_LEVELS_KEY = "estimator_custom_job_levels_v1";
  const LEVEL_ORDER_KEY = "estimator_level_order_v1";

  // Load default job levels from JSON file
  async function loadDefaultLevels() {
    if (defaultLevelsLoaded) return;
    
    // Check for imported CSV data first
    const importedKey = "estimator_imported_job_levels_csv";
    const importedData = localStorage.getItem(importedKey);
    if (importedData) {
      try {
        const parsed = JSON.parse(importedData);
        DEFAULT_LEVELS = parsed;
        defaultLevelsLoaded = true;
        console.log("✅ Loaded", DEFAULT_LEVELS.length, "job levels from imported CSV");
        return;
      } catch (e) {
        console.warn("Failed to parse imported job levels CSV data", e);
      }
    }
    
    // Try embedded data first, then fetch
    if (typeof embeddedJobLevels !== 'undefined') {
      DEFAULT_LEVELS = embeddedJobLevels.levels;
      defaultLevelsLoaded = true;
      console.log("✅ Loaded", DEFAULT_LEVELS.length, "job levels from embedded data");
    } else {
      try {
        const response = await fetch("data/job-levels.json");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            DEFAULT_LEVELS = data;
            console.log("✅ Loaded", DEFAULT_LEVELS.length, "job levels from JSON");
          }
        }
      } catch (e) {
        console.warn("Failed to load job levels from JSON, using empty defaults", e);
        DEFAULT_LEVELS = [];
      }
      defaultLevelsLoaded = true;
    }
  }
    
    defaultLevelsLoaded = true;
  }

  function getDefaultLevels() {
    return JSON.parse(JSON.stringify(DEFAULT_LEVELS));
  }

  function getCustomLevels() {
    try {
      const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load custom job levels", e);
      return [];
    }
  }

  function saveCustomLevels(levels) {
    try {
      localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels));
      return true;
    } catch (e) {
      console.warn("Failed to save custom job levels", e);
      return false;
    }
  }

  function getLevelOrder() {
    try {
      const raw = localStorage.getItem(LEVEL_ORDER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveLevelOrder(orderIds) {
    try {
      localStorage.setItem(LEVEL_ORDER_KEY, JSON.stringify(orderIds));
      return true;
    } catch (e) {
      console.warn("Failed to save level order", e);
      return false;
    }
  }

  async function getAllLevels() {
    await loadDefaultLevels();
    // Priority: Custom levels first (including imported), then defaults
    const allLevels = [...getCustomLevels(), ...getDefaultLevels()];
    const order = getLevelOrder();

    if (!order || !Array.isArray(order) || order.length === 0) {
      return allLevels;
    }

    const levelMap = {};
    allLevels.forEach(l => { levelMap[l.id] = l; });

    const ordered = [];
    order.forEach(id => {
      if (levelMap[id]) ordered.push(levelMap[id]);
    });

    allLevels.forEach(l => {
      if (!ordered.find(ol => ol.id === l.id)) ordered.push(l);
    });

    return ordered;
  }

  async function getLevelById(id) {
    const levels = await getAllLevels();
    return levels.find(l => l.id === id);
  }

  function normalizeSellRates(sellRates, sellReg, sellOT) {
    if (sellRates && typeof sellRates === "object") return sellRates;
    return {
      standard: {
        regular: parseFloat(sellReg) || 0,
        ot: parseFloat(sellOT) || 0
      }
    };
  }

  function addCustomLevel(label, costReg, costOT, sellRates, sellReg, sellOT) {
    const levels = getCustomLevels();
    const normalizedSellRates = normalizeSellRates(sellRates, sellReg, sellOT);
    const newLevel = {
      id: "custom-" + crypto.randomUUID(),
      label,
      costRegular: parseFloat(costReg) || 0,
      costOT: parseFloat(costOT) || 0,
      sellRates: normalizedSellRates,
      sellRegular: normalizedSellRates.standard ? normalizedSellRates.standard.regular : (parseFloat(sellReg) || 0),
      sellOT: normalizedSellRates.standard ? normalizedSellRates.standard.ot : (parseFloat(sellOT) || 0),
      type: "custom"
    };
    levels.push(newLevel);
    saveCustomLevels(levels);
    return newLevel;
  }

  function updateCustomLevel(id, label, costReg, costOT, sellRates, sellReg, sellOT) {
    const levels = getCustomLevels();
    const idx = levels.findIndex(l => l.id === id);
    if (idx !== -1) {
      const normalizedSellRates = normalizeSellRates(sellRates, sellReg, sellOT);
      levels[idx] = {
        ...levels[idx],
        label,
        costRegular: parseFloat(costReg) || 0,
        costOT: parseFloat(costOT) || 0,
        sellRates: normalizedSellRates,
        sellRegular: normalizedSellRates.standard ? normalizedSellRates.standard.regular : (parseFloat(sellReg) || 0),
        sellOT: normalizedSellRates.standard ? normalizedSellRates.standard.ot : (parseFloat(sellOT) || 0)
      };
      saveCustomLevels(levels);
      return levels[idx];
    }
    return null;
  }

  function deleteCustomLevel(id) {
    const levels = getCustomLevels();
    const filtered = levels.filter(l => l.id !== id);
    saveCustomLevels(filtered);
    const order = getLevelOrder() || [];
    if (order.length) {
      const nextOrder = order.filter(orderId => orderId !== id);
      if (nextOrder.length !== order.length) {
        saveLevelOrder(nextOrder);
      }
    }
    return filtered.length < levels.length;
  }

  function reorderCustomLevel(fromId, toId, position) {
    reorderAllLevels(fromId, toId, position);
  }

  function reorderAllLevels(fromId, toId, position) {
    const currentOrder = getAllLevels().map(l => l.id);
    const fromIdx = currentOrder.indexOf(fromId);
    const toIdx = currentOrder.indexOf(toId);

    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = currentOrder.splice(fromIdx, 1);
      let insertIdx = toIdx;
      if (position === "after") insertIdx = toIdx + 1;
      if (fromIdx < insertIdx) insertIdx -= 1;
      if (insertIdx < 0) insertIdx = 0;
      if (insertIdx > currentOrder.length) insertIdx = currentOrder.length;
      currentOrder.splice(insertIdx, 0, moved);
      saveLevelOrder(currentOrder);
    }
  }

  function getSellRates(levelId, columnId = "standard") {
    const level = getLevelById(levelId);
    if (!level) return null;

    if (level.sellRates && level.sellRates[columnId]) {
      return {
        regular: level.sellRates[columnId].regular,
        ot: level.sellRates[columnId].ot
      };
    }

    if (level.sellRegular && level.sellOT) {
      return {
        regular: level.sellRegular,
        ot: level.sellOT
      };
    }

    return null;
  }

  return {
    loadDefaultLevels,
    getDefaultLevels,
    getCustomLevels,
    getAllLevels,
    getLevelById,
    getSellRates,
    addCustomLevel,
    updateCustomLevel,
    deleteCustomLevel,
    reorderCustomLevel,
    reorderAllLevels
  };
})();

console.log("✅ JobLevels module ready");

console.log("✅ JobLevels loaded");
