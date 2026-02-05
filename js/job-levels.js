// Job Levels Registry — default rate schedules
// Each job level has Reg/OT cost rates
// Sell rates are per rate column (Standard, Premium, Discount, etc.)
// Resources can inherit from a job level and override as needed

const embeddedJobLevels = {
  "levels": [
    {
      "id": "E1",
      "label": "Vice President",
      "jobFamily": "Executive",
      "costRegular": 120,
      "costOT": 180,
      "sellRates": {
        "standard": 200,
        "premium": 240,
        "discount": 160
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "L3",
      "label": "Director",
      "jobFamily": "Management",
      "costRegular": 100,
      "costOT": 150,
      "sellRates": {
        "standard": 170,
        "premium": 200,
        "discount": 140
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "L2",
      "label": "Snr. Manager",
      "jobFamily": "Management",
      "costRegular": 85,
      "costOT": 127.5,
      "sellRates": {
        "standard": 150,
        "premium": 180,
        "discount": 120
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "L1",
      "label": "Manager",
      "jobFamily": "Management",
      "costRegular": 70,
      "costOT": 105,
      "sellRates": {
        "standard": 130,
        "premium": 160,
        "discount": 100
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P8",
      "label": "Level 8 Professional",
      "jobFamily": "Professional",
      "costRegular": 75,
      "costOT": 112.5,
      "sellRates": {
        "standard": 140,
        "premium": 170,
        "discount": 110
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P7",
      "label": "Level 7 Professional",
      "jobFamily": "Professional",
      "costRegular": 70,
      "costOT": 105,
      "sellRates": {
        "standard": 135,
        "premium": 160,
        "discount": 105
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P6",
      "label": "Level 6 Professional",
      "jobFamily": "Professional",
      "costRegular": 65,
      "costOT": 97.5,
      "sellRates": {
        "standard": 130,
        "premium": 155,
        "discount": 100
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P5",
      "label": "Level 5 Professional",
      "jobFamily": "Professional",
      "costRegular": 60,
      "costOT": 90,
      "sellRates": {
        "standard": 120,
        "premium": 145,
        "discount": 95
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P4",
      "label": "Level 4 Professional",
      "jobFamily": "Professional",
      "costRegular": 55,
      "costOT": 82.5,
      "sellRates": {
        "standard": 110,
        "premium": 135,
        "discount": 85
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P3",
      "label": "Level 3 Professional",
      "jobFamily": "Professional",
      "costRegular": 50,
      "costOT": 75,
      "sellRates": {
        "standard": 100,
        "premium": 125,
        "discount": 75
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P2",
      "label": "Level 2 Professional",
      "jobFamily": "Professional",
      "costRegular": 45,
      "costOT": 67.5,
      "sellRates": {
        "standard": 90,
        "premium": 115,
        "discount": 65
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P1",
      "label": "Level 1 Professional",
      "jobFamily": "Professional",
      "costRegular": 40,
      "costOT": 60,
      "sellRates": {
        "standard": 80,
        "premium": 105,
        "discount": 55
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "P0",
      "label": "Level 0 Professional",
      "jobFamily": "Professional",
      "costRegular": 35,
      "costOT": 52.5,
      "sellRates": {
        "standard": 70,
        "premium": 95,
        "discount": 45
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "T5",
      "label": "Level 5 Tech",
      "jobFamily": "Technician",
      "costRegular": 50,
      "costOT": 75,
      "sellRates": {
        "standard": 100,
        "premium": 125,
        "discount": 75
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "T4",
      "label": "Level 4 Tech",
      "jobFamily": "Technician",
      "costRegular": 45,
      "costOT": 67.5,
      "sellRates": {
        "standard": 90,
        "premium": 115,
        "discount": 65
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "T3",
      "label": "Level 3 Tech",
      "jobFamily": "Technician",
      "costRegular": 40,
      "costOT": 60,
      "sellRates": {
        "standard": 80,
        "premium": 105,
        "discount": 55
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "T2",
      "label": "Level 2 Tech",
      "jobFamily": "Technician",
      "costRegular": 35,
      "costOT": 52.5,
      "sellRates": {
        "standard": 70,
        "premium": 95,
        "discount": 45
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "T1",
      "label": "Level 1 Tech",
      "jobFamily": "Technician",
      "costRegular": 30,
      "costOT": 45,
      "sellRates": {
        "standard": 60,
        "premium": 85,
        "discount": 35
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "S4",
      "label": "Level 4 Admin",
      "jobFamily": "Admin",
      "costRegular": 35,
      "costOT": 52.5,
      "sellRates": {
        "standard": 70,
        "premium": 95,
        "discount": 45
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "S3",
      "label": "Level 3 Admin",
      "jobFamily": "Admin",
      "costRegular": 30,
      "costOT": 45,
      "sellRates": {
        "standard": 60,
        "premium": 85,
        "discount": 35
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "S2",
      "label": "Level 2 Admin",
      "jobFamily": "Admin",
      "costRegular": 25,
      "costOT": 37.5,
      "sellRates": {
        "standard": 50,
        "premium": 75,
        "discount": 25
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "S1",
      "label": "Level 1 Admin",
      "jobFamily": "Admin",
      "costRegular": 22,
      "costOT": 33,
      "sellRates": {
        "standard": 45,
        "premium": 65,
        "discount": 20
      },
      "otMultiplier": 1.5,
      "type": "generic"
    },
    {
      "id": "brandon-turcotte",
      "label": "Brandon Turcotte",
      "jobFamily": "Management",
      "jobLevel": "L3",
      "location": "NB",
      "businessLine": "BL002",
      "costCentre": "Executive",
      "costRegular": 105,
      "costOT": 157.5,
      "sellRates": {
        "standard": 180,
        "premium": 210,
        "discount": 150
      },
      "otMultiplier": 1.5,
      "type": "named"
    },
    {
      "id": "nikki-belanger-turcotte",
      "label": "Nikki Belanger-Turcotte",
      "jobFamily": "Professional",
      "jobLevel": "P6",
      "location": "ON",
      "businessLine": "BL002",
      "costCentre": "ONAC",
      "costRegular": 68,
      "costOT": 102,
      "sellRates": {
        "standard": 135,
        "premium": 160,
        "discount": 105
      },
      "otMultiplier": 1.5,
      "type": "named"
    },
    {
      "id": "isaac-turcotte",
      "label": "Isaac Turcotte",
      "jobFamily": "Technician",
      "jobLevel": "T3",
      "location": "ON",
      "businessLine": "BL002",
      "costCentre": "ONAC",
      "costRegular": 42,
      "costOT": 63,
      "sellRates": {
        "standard": 85,
        "premium": 110,
        "discount": 60
      },
      "otMultiplier": 1.5,
      "type": "named"
    },
    {
      "id": "noah-turcotte",
      "label": "Noah Turcotte",
      "jobFamily": "Admin",
      "jobLevel": "S2",
      "location": "BC",
      "businessLine": "BL002",
      "costCentre": "British Columbia",
      "costRegular": 26,
      "costOT": 39,
      "sellRates": {
        "standard": 52,
        "premium": 78,
        "discount": 28
      },
      "otMultiplier": 1.5,
      "type": "named"
    },
    {
      "id": "olivia-turcotte",
      "label": "Olivia Turcotte",
      "jobFamily": "Professional",
      "jobLevel": "P4",
      "location": "QC",
      "businessLine": "BL001",
      "costCentre": "Quebec-GEM",
      "costRegular": 58,
      "costOT": 87,
      "sellRates": {
        "standard": 115,
        "premium": 140,
        "discount": 90
      },
      "otMultiplier": 1.5,
      "type": "named"
    },
    {
      "id": "sophia-turcotte",
      "label": "Sophia Turcotte",
      "jobFamily": "Professional",
      "jobLevel": "P2",
      "location": "AB",
      "businessLine": "BL002",
      "costCentre": "P&N Ground",
      "costRegular": 48,
      "costOT": 72,
      "sellRates": {
        "standard": 95,
        "premium": 120,
        "discount": 70
      },
      "otMultiplier": 1.5,
      "type": "named"
    }
  ]
};

window.JobLevels = (function () {
  // Will be loaded from job-levels.json
  let DEFAULT_LEVELS = [];
  let defaultLevelsLoaded = false;

  const CUSTOM_LEVELS_KEY = "estimator_custom_job_levels_v1";
  const LEVEL_ORDER_KEY = "estimator_level_order_v1";

  // Load default job levels from JSON file
  async function loadDefaultLevels() {
    if (defaultLevelsLoaded) return;
    
    DEFAULT_LEVELS = embeddedJobLevels.levels;
    defaultLevelsLoaded = true;
    console.log("✅ Loaded", DEFAULT_LEVELS.length, "job levels from embedded data");
    
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
