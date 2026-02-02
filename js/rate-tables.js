// Rate Tables Registry — Multiple rate tables with cost/sell rates per job level

window.RateTables = (function () {
  const CUSTOM_TABLES_KEY = "estimator_custom_rate_tables_v1";

  let DEFAULT_TABLES = [];
  let defaultTablesLoaded = false;

  // Load default tables from JSON file
  async function loadDefaultTables() {
    if (defaultTablesLoaded) return;
    
    try {
      const response = await fetch("data/rate-tables.json");
      if (response.ok) {
        const data = await response.json();
        if (data.tables && Array.isArray(data.tables)) {
          DEFAULT_TABLES = data.tables;
          console.log("✅ Loaded", DEFAULT_TABLES.length, "rate tables from JSON");
        }
      }
    } catch (e) {
      console.warn("Failed to load rate tables from JSON, using empty defaults", e);
      DEFAULT_TABLES = [];
    }
    
    defaultTablesLoaded = true;
  }

  function getDefaultTables() {
    return JSON.parse(JSON.stringify(DEFAULT_TABLES));
  }

  function getCustomTables() {
    try {
      const raw = localStorage.getItem(CUSTOM_TABLES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load custom rate tables", e);
      return [];
    }
  }

  function saveCustomTables(tables) {
    try {
      localStorage.setItem(CUSTOM_TABLES_KEY, JSON.stringify(tables));
      return true;
    } catch (e) {
      console.warn("Failed to save custom rate tables", e);
      return false;
    }
  }

  async function getAllTables() {
    await loadDefaultTables();
    return [...getDefaultTables(), ...getCustomTables()];
  }

  async function getTableById(id) {
    const tables = await getAllTables();
    return tables.find(t => t.id === id);
  }

  function addCustomTable(label, description = "", defaultBL = "", defaultProv = "") {
    const tables = getCustomTables();
    const newTable = {
      id: "table-" + crypto.randomUUID(),
      label,
      description,
      defaultBL,
      defaultProv,
      rates: {},
      type: "custom"
    };
    tables.push(newTable);
    saveCustomTables(tables);
    return newTable;
  }

  function updateCustomTable(id, updates) {
    const tables = getCustomTables();
    const idx = tables.findIndex(t => t.id === id);
    if (idx !== -1) {
      tables[idx] = { ...tables[idx], ...updates };
      saveCustomTables(tables);
      return tables[idx];
    }
    return null;
  }

  function deleteCustomTable(id) {
    const tables = getCustomTables();
    const filtered = tables.filter(t => t.id !== id);
    saveCustomTables(filtered);
    return filtered.length < tables.length;
  }

  function ensureRateEntry(table, levelId) {
    if (!table.rates) table.rates = {};
    if (!table.rates[levelId]) {
      table.rates[levelId] = { costReg: 0, costOT: 0, sell: {} };
    }
    if (!table.rates[levelId].sell) table.rates[levelId].sell = {};
    return table.rates[levelId];
  }

  function setCostRates(tableId, levelId, costReg, costOT) {
    const tables = getCustomTables();
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return null;
    const entry = ensureRateEntry(tables[idx], levelId);
    entry.costReg = parseFloat(costReg) || 0;
    entry.costOT = parseFloat(costOT) || 0;
    saveCustomTables(tables);
    return entry;
  }

  function setSellRates(tableId, levelId, columnId, reg, ot) {
    const tables = getCustomTables();
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return null;
    const entry = ensureRateEntry(tables[idx], levelId);
    entry.sell[columnId] = {
      reg: parseFloat(reg) || 0,
      ot: parseFloat(ot) || 0
    };
    saveCustomTables(tables);
    return entry;
  }

  function updateTableRates(tableId, levelId, rates) {
    const tables = getCustomTables();
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return null;
    tables[idx].rates = tables[idx].rates || {};
    tables[idx].rates[levelId] = rates;
    saveCustomTables(tables);
    return tables[idx];
  }

  return {
    loadDefaultTables,
    getDefaultTables,
    getCustomTables,
    getAllTables,
    getTableById,
    addCustomTable,
    updateCustomTable,
    deleteCustomTable,
    setCostRates,
    setSellRates,
    updateTableRates
  };
})();

console.log("✅ RateTables module ready");
