// Simple rate lookup from resources.json + named-resources.json

window.Rates = (function () {
  let resources = null;
  let namedResources = null;

  async function load() {
    if (resources) return resources;
    const cacheBuster = "?v=" + Date.now();
    const res = await fetch("data/resources.json" + cacheBuster, { cache: "no-store" });
    resources = await res.json();
    return resources;
  }

  async function loadNamedResources() {
    if (namedResources) return namedResources;
    try {
      const cacheBuster = "?v=" + Date.now();
      const res = await fetch("data/named-resources.json" + cacheBuster, { cache: "no-store" });
      namedResources = await res.json();
      return namedResources;
    } catch (e) {
      console.warn("Could not load named-resources.json", e);
      return { resources: [] };
    }
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
      const costReg = rateEntry.cost?.reg || 60;
      const costOt = rateEntry.cost?.ot || (costReg * 1.5);
      
      // Use "standard" tier for sell rates by default
      const sellReg = rateEntry.standard?.reg || 120;
      const sellOt = rateEntry.standard?.ot || (sellReg * 1.5);

      return {
        costRegular: costReg,
        costOT: costOt,
        sellRegular: sellReg,
        sellOT: sellOt
      };
    } catch (e) {
      console.warn("Could not load rates from rate tables:", e);
      // Fallback to hardcoded rates from resource object
      const costRegular = r.cost || 60;
      const sellRegular = r.sell || 120;
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
    const actualResourceId = resource.resourceId || resource.id;

    let baseRates = null;
    const hasExplicitCost = Number.isFinite(resource.costRate) && resource.costRate > 0;
    const hasExplicitSell = Number.isFinite(resource.chargeoutRate) && resource.chargeoutRate > 0;
    const otMult = resource.otMultiplier || 1.5;

    if (hasExplicitCost || hasExplicitSell) {
      const costRegular = hasExplicitCost ? resource.costRate : 60;
      const sellRegular = hasExplicitSell ? resource.chargeoutRate : 120;
      baseRates = {
        costRegular,
        costOT: costRegular * otMult,
        sellRegular,
        sellOT: sellRegular * otMult
      };
    } else {
      try {
        baseRates = await getRates(actualResourceId);
      } catch (e) {
        baseRates = null;
      }

      if (!baseRates) {
        const costRegular = resource.costRate || 60;
        const sellRegular = resource.chargeoutRate || 120;
        baseRates = {
          costRegular,
          costOT: costRegular * otMult,
          sellRegular,
          sellOT: sellRegular * otMult
        };
      }
    }

    let costRegular = baseRates.costRegular;
    let costOT = baseRates.costOT;
    let sellRegular = baseRates.sellRegular;
    let sellOT = baseRates.sellOT;

    if (resource.overrideCostReg !== undefined) {
      costRegular = resource.overrideCostReg;
      if (resource.overrideCostOT === undefined) {
        costOT = costRegular * 1.5;
      }
    }

    if (resource.overrideCostOT !== undefined) {
      costOT = resource.overrideCostOT;
    }

    if (resource.overrideSellReg !== undefined) {
      sellRegular = resource.overrideSellReg;
      if (resource.overrideSellOT === undefined) {
        sellOT = sellRegular * 1.5;
      }
    }

    if (resource.overrideSellOT !== undefined) {
      sellOT = resource.overrideSellOT;
    }

    return { costRegular, costOT, sellRegular, sellOT };
  }

  async function listResources() {
    const data = await load();
    const custom = ResourceManager.getCustomResources();
    const importedNamed = ResourceManager.getImportedNamedResources();
    
    // Merge named resources from resources.json with imported employees
    const allNamed = [
      ...(data.named || []),
      ...importedNamed
    ];
    
    return {
      generic: data.generic || [],
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
