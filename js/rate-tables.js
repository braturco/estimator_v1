// Rate Tables Registry — Multiple rate tables with cost/sell rates per job level

window.RateTables = window.RateTables || {};

// One-time cleanup: zero out all rates in all tables in localStorage
window.RateTables.nukeAllRates = function() {
  const tables = window.RateTables.getCustomTables ? window.RateTables.getCustomTables() : [];
  tables.forEach(table => {
    if (table.rates) {
      Object.values(table.rates).forEach(rateEntry => {
        // Zero out cost
        if (rateEntry.cost) {
          rateEntry.cost.reg = 0;
          rateEntry.cost.ot = 0;
        }
        // Zero out all sell columns
        Object.keys(rateEntry).forEach(key => {
          if (key !== 'cost' && typeof rateEntry[key] === 'object') {
            if ('reg' in rateEntry[key]) rateEntry[key].reg = 0;
            if ('ot' in rateEntry[key]) rateEntry[key].ot = 0;
          }
        });
      });
    }
  });
  localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(tables));
  alert('All rates have been zeroed out.');
};

window.RateTables = (function () {
  const CUSTOM_TABLES_KEY = "estimator_custom_rate_tables_v1";
  const FACTORY_TABLES_KEY = "estimator_factory_rate_tables_v1";

  // On first load, ensure localStorage is initialized (no longer import from JSON)
  async function ensureTablesInitialized() {
    // Clear any factory tables (dummy data should be removed)
    localStorage.removeItem(FACTORY_TABLES_KEY);
    // No longer force clearing custom tables - cleanup is handled in rate-schedule-manager.js
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
    await ensureTablesInitialized();
    const customTables = getCustomTables();
    const importedTables = (window.RateTablesManager && window.RateTablesManager.getImportedRateTables) ?
      window.RateTablesManager.getImportedRateTables() : [];

    // Merge: Imported tables take priority over custom tables
    const allTables = [...importedTables, ...customTables];

    // Remove duplicates by ID (imported takes precedence)
    const uniqueTables = allTables.filter((table, index, self) =>
      index === self.findIndex(t => t.id === table.id)
    );

    return uniqueTables;
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
      rates: {}
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

  function getDefaultTable() {
    const tables = getCustomTables();
    return tables.find(t => t.isDefault) || null;
  }

  function setDefaultTable(tableId) {
    const tables = getCustomTables();
    tables.forEach(t => {
      t.isDefault = (t.id === tableId) ? !t.isDefault : false;
    });
    saveCustomTables(tables);
  }

  return {
    getCustomTables,
    getAllTables,
    ensureTablesInitialized,
    getTableById,
    addCustomTable,
    updateCustomTable,
    deleteCustomTable,
    setCostRates,
    setSellRates,
    updateTableRates,
    getDefaultTable,
    setDefaultTable
  };
})();

// console.log("✅ RateTables module ready");
