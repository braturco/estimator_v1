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

  // On first load, import all tables from JSON if not present in localStorage
  async function ensureTablesInitialized() {
    const existing = localStorage.getItem(CUSTOM_TABLES_KEY);
    if (!existing) {
      try {
        const response = await fetch("data/rate-tables.json");
        if (response.ok) {
          const data = await response.json();
          if (data.tables && Array.isArray(data.tables)) {
            // Remove 'type' property and set all as editable
            const editableTables = data.tables.map(tbl => {
              const t = { ...tbl };
              delete t.type;
              return t;
            });
            localStorage.setItem(CUSTOM_TABLES_KEY, JSON.stringify(editableTables));
            // Optionally store a factory backup for reset
            localStorage.setItem(FACTORY_TABLES_KEY, JSON.stringify(editableTables));
            console.log("✅ Imported factory rate tables into localStorage");
          }
        }
      } catch (e) {
        console.warn("Failed to import rate tables from JSON", e);
      }
    }
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
    return getCustomTables();
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

  // Optional: Add a reset function to restore factory tables
  function resetToFactoryDefaults() {
    const raw = localStorage.getItem(FACTORY_TABLES_KEY);
    if (raw) {
      localStorage.setItem(CUSTOM_TABLES_KEY, raw);
      return true;
    }
    return false;
  }

  return {
    getCustomTables,
    getAllTables,
    getTableById,
    addCustomTable,
    updateCustomTable,
    deleteCustomTable,
    setCostRates,
    setSellRates,
    updateTableRates,
    resetToFactoryDefaults
  };
})();

console.log("✅ RateTables module ready");
