// Simple rate lookup from resources.json + named-resources.json

window.Rates = (function () {
  let resources = null;
  let namedResources = null;

  // Look up cost rate from imported cost rates table by CostRate_ID (e.g., "ONP6")
  // Look up sell rates from a rate schedule by rateScheduleId + jobLevel
  function lookupSellFromSchedule(rateScheduleId, jobLevel) {
    if (!rateScheduleId || !jobLevel || !window.RateTables) return null;
    try {
      const tables = RateTables.getCustomTables();
      const table = tables.find(t => t.id === rateScheduleId);
      if (!table || !table.rates) return null;
      const entry = table.rates[jobLevel];
      if (!entry || !entry.standard) return null;
      const reg = parseFloat(entry.standard.reg) || 0;
      const ot = parseFloat(entry.standard.ot) || 0;
      if (reg > 0 || ot > 0) return { reg, ot };
    } catch (e) { /* ignore */ }
    return null;
  }

  function lookupCostByCostRateId(costRateId) {
    if (!costRateId) return null;
    try {
      const raw = localStorage.getItem("estimator_imported_rate_tables_v1");
      if (!raw) return null;
      const rateTables = JSON.parse(raw);
      const match = rateTables.find(rt => rt.costRateId && rt.costRateId.toUpperCase() === costRateId.toUpperCase());
      if (match && match.costRate > 0) return parseFloat(match.costRate);
    } catch (e) { /* ignore */ }
    return null;
  }

  async function load() {
    if (resources) return resources;
    
    // Check for imported CSV data first
    const importedKey = "estimator_imported_resources_csv";
    const importedData = localStorage.getItem(importedKey);
    if (importedData) {
      try {
        const parsed = JSON.parse(importedData);
        resources = { generic: parsed, named: [] };
        return resources;
      } catch (e) {
        console.warn("Failed to parse imported resources CSV data", e);
      }
    }
    
    // Try to load from embedded data, then fall back to fetch
    if (typeof embeddedResources !== 'undefined') {
      resources = embeddedResources;
    } else {
      try {
        const cacheBuster = "?v=" + Date.now();
        const res = await fetch("data/resources.json" + cacheBuster, { cache: "no-store" });
        resources = await res.json();
      } catch (e) {
        console.warn("Could not load resources.json, using empty data");
        resources = { generic: [], named: [] };
      }
    }
    return resources;
  }

  async function loadNamedResources() {
    if (namedResources) return namedResources;
    // Try embedded data first, then fetch
    if (typeof embeddedNamedResources !== 'undefined') {
      namedResources = embeddedNamedResources;
    } else {
      try {
        const cacheBuster = "?v=" + Date.now();
        const res = await fetch("data/named-resources.json" + cacheBuster, { cache: "no-store" });
        namedResources = await res.json();
      } catch (e) {
        console.warn("Could not load named-resources.json, using empty data");
        namedResources = { resources: [] };
      }
    }
    return namedResources;
  }

  async function getResourceById(resourceId) {
    const data = await load();
    const all = [...data.generic, ...data.named];
    return all.find(r => r.id === resourceId) || null;
  }

  async function getRates(resourceId) {
    const r = await getResourceById(resourceId);
    if (!r) return null;

    try {
      const tables = await RateTables.getAllTables();
      if (!tables || tables.length === 0) {
        throw new Error("No rate tables available");
      }

      // Get the job level code (e.g., "L3", "P6", "T3")
      const jobLevelCode = r.jobLevel || r.jobLevelCode;
      
      if (!jobLevelCode) {
        throw new Error("No job level specified for resource");
      }

      // Determine which rate table to use
      // Named resources have a location field (NB, ON, BC, QC, AB)
      // Rate table IDs are like "table-nb", "table-on", etc.
      let locationCode = r.location || "NB";
      let tableId = `table-${locationCode.toLowerCase()}`;
      
      // Find the rate table matching this location
      let rateTable = tables.find(t => t.id === tableId);
      
      // If exact match not found, try fallback
      if (!rateTable) {
        rateTable = tables.find(t => t.defaultProv === locationCode);
      }
      
      // If still not found, use the first table as last resort
      if (!rateTable) {
        rateTable = tables[0];
      }

      if (!rateTable || !rateTable.rates) {
        throw new Error("Rate table has no rates object");
      }

      // Find the rate entry for this job level code
      // The rates object has job codes as keys: "L3", "P6", "T3", etc.
      const rateEntry = rateTable.rates[jobLevelCode];

      if (!rateEntry) {
        console.warn(`Job level code ${jobLevelCode} not found in ${tableId} table`);
        throw new Error(`Job level ${jobLevelCode} not found in rate table`);
      }

      // Extract cost and sell rates from the entry structure
      // Structure: { cost: { reg: X, ot: Y }, standard: { reg: X, ot: Y }, ... }
      let costReg = rateEntry.cost?.reg || 60;
      let costOt = rateEntry.cost?.ot || (costReg * 1.5);
      
      // Check for imported cost rate overrides
      if (window.RateTablesManager && window.RateTablesManager.getImportedRateTables) {
        const importedRates = window.RateTablesManager.getImportedRateTables();
        const overrideRate = importedRates.find(r => r.costRateId === jobLevelCode);
        if (overrideRate && overrideRate.costRate > 0) {
          costReg = overrideRate.costRate;
          costOt = costReg * 1.5; // Apply standard OT multiplier
          console.log(`✅ Using imported cost rate for ${jobLevelCode}: $${costReg}/hr`);
        }
      }
      
      // Use "standard" tier for sell rates by default
      const sellReg = rateEntry.standard?.reg || 0;
      const sellOt = rateEntry.standard?.ot || 0;

      return {
        costRegular: costReg,
        costOT: costOt,
        sellRegular: sellReg,
        sellOT: sellOt
      };
    } catch (e) {
      console.warn("Could not load rates from rate tables:", e);
      // Fallback to hardcoded rates from resource object
      const costRegular = r.cost || 0;
      const sellRegular = r.sell || 0;
      const otMult = r.otMultiplier || 1.5;
      return {
        costRegular,
        sellRegular,
        costOT: costRegular * otMult,
        sellOT: sellRegular * otMult
      };
    }
  }

  async function resolveRates(resource) {
    if (!resource) return null;
    const otMult = resource.otMultiplier || 1.5;

    // --- Cost: imported cost rates table → resource.costRate → 0 ---
    const lookedUpCost = lookupCostByCostRateId(resource.costRateId);
    let costRegular = resource.costRate || lookedUpCost || 0;
    let costOT = costRegular * otMult;

    // --- Sell: rate schedule (by jobLevel) → 0 ---
    const scheduleSell = lookupSellFromSchedule(resource.rateScheduleId, resource.jobLevel);
    let sellRegular = scheduleSell ? scheduleSell.reg : 0;
    let sellOT = scheduleSell ? scheduleSell.ot : 0;

    // --- Overrides take priority ---
    if (resource.overrideCostReg !== undefined) {
      costRegular = resource.overrideCostReg;
      if (resource.overrideCostOT === undefined) costOT = costRegular * 1.5;
    }
    if (resource.overrideCostOT !== undefined) costOT = resource.overrideCostOT;

    if (resource.overrideSellReg !== undefined) {
      sellRegular = resource.overrideSellReg;
      if (resource.overrideSellOT === undefined) sellOT = sellRegular * 1.5;
    }
    if (resource.overrideSellOT !== undefined) sellOT = resource.overrideSellOT;

    return { costRegular, costOT, sellRegular, sellOT };
  }

  async function listResources() {
    const data = await load();
    const custom = ResourceManager.getCustomResources();
    const importedNamed = ResourceManager.getImportedNamedResources();

    // Priority: Imported CSV data first, then JSON defaults
    const allNamed = [
      ...importedNamed,  // CSV data takes priority
      ...(data.named || [])  // JSON fallback
    ];

    // If we have imported data, use it for generic too, otherwise use JSON
    const generic = importedNamed.length > 0 ?
      importedNamed.filter(r => r.type === 'generic') :
      (data.generic || []);

    return {
      generic: generic,
      named: allNamed,
      custom: custom || []
    };
  }

  function clearCache() {
    resources = null;
    namedResources = null;
  }

  return { getRates, resolveRates, listResources, getResourceById, load, loadNamedResources, clearCache };
})();
