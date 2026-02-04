// Province mapping for cost rate table lookup

window.ProvinceMapping = (function () {
  // Province display options with their cost rate table mapping
  const PROVINCE_MAP = [
    { display: "NB", mapping: "AT", label: "New Brunswick" },
    { display: "NL", mapping: "AT", label: "Newfoundland and Labrador" },
    { display: "NS", mapping: "AT", label: "Nova Scotia" },
    { display: "PEI", mapping: "AT", label: "Prince Edward Island" },
    { display: "QC", mapping: "QC", label: "Quebec" },
    { display: "ON", mapping: "ON", label: "Ontario" },
    { display: "MB", mapping: "MB", label: "Manitoba" },
    { display: "SK", mapping: "SK", label: "Saskatchewan" },
    { display: "AB", mapping: "AB", label: "Alberta" },
    { display: "BC", mapping: "BC", label: "British Columbia" },
    { display: "YK", mapping: "YT", label: "Yukon" },
    { display: "NWT", mapping: "YT", label: "Northwest Territories" },
    { display: "NU", mapping: "YT", label: "Nunavut" }
  ];

  function getProvinceOptions() {
    return PROVINCE_MAP;
  }

  function getMapping(displayCode) {
    const entry = PROVINCE_MAP.find(p => p.display === displayCode);
    return entry ? entry.mapping : displayCode;
  }

  function getDisplay(displayCode) {
    const entry = PROVINCE_MAP.find(p => p.display === displayCode);
    return entry ? `${entry.display} - ${entry.label}` : displayCode;
  }

  // Lookup cost rate from imported rate tables
  async function lookupCostRate(provinceDisplay, jobLevel) {
    const mappedProvince = getMapping(provinceDisplay);
    console.log(`🔍 Lookup: display="${provinceDisplay}" → mapped="${mappedProvince}" + jobLevel="${jobLevel}"`);

    // Get imported rate tables from localStorage
    const raw = localStorage.getItem("estimator_imported_rate_tables_v1");
    if (!raw) {
      console.log("❌ No imported rate tables found");
      return null;
    }

    // Helper to get a field value by possible names
    function getField(obj, names) {
      for (const n of names) {
        if (obj[n] !== undefined) return obj[n];
      }
      // Try case-insensitive and space-insensitive
      const keys = Object.keys(obj);
      for (const n of names) {
        const found = keys.find(k => k.replace(/\s+/g, '').toLowerCase() === n.replace(/\s+/g, '').toLowerCase());
        if (found) return obj[found];
      }
      return undefined;
    }

    try {
      const rateTables = JSON.parse(raw);
      console.log(`📋 Found ${rateTables.length} rate table entries`);
      if (rateTables.length > 0) {
        console.log("Sample entry:", rateTables[0]);
      }

      // Try all common field names for province and job code/level
      const provinceFields = ["province", "PROVINCE", "Province"];
      const jobFields = ["jobLevel", "jobCode", "JOB LEVEL", "Job Level", "Job Code", "JOB CODE"];
      const costFields = ["costRate", "COST RATE", "Cost Rate", "cost", "COST"];

      let foundMatch = null;
      rateTables.forEach((rt, idx) => {
        const rtProvince = getField(rt, provinceFields);
        const rtJobLevel = getField(rt, jobFields);
        const rtCostRate = getField(rt, costFields);
        const provinceMatch = rtProvince && rtProvince.toString().toUpperCase() === mappedProvince.toUpperCase();
        // Allow match if job code matches, or job level label starts with code (e.g., 'L3' matches 'L3 - Director')
        let jobLevelMatch = false;
        if (rtJobLevel) {
          const val = rtJobLevel.toString().toUpperCase();
          const code = jobLevel.toUpperCase();
          jobLevelMatch = val === code || val.startsWith(code + ' ');
        }
        console.debug(`[Row ${idx}] Province:`, rtProvince, '| Job:', rtJobLevel, '| Cost:', rtCostRate, '| ProvinceMatch:', provinceMatch, '| JobMatch:', jobLevelMatch);
        if (provinceMatch && jobLevelMatch) {
          console.log(`✅ Match found:`, { province: rtProvince, jobLevel: rtJobLevel, costRate: rtCostRate });
          foundMatch = rt;
        }
      });

      if (foundMatch) {
        const costRate = parseFloat(getField(foundMatch, costFields) || 0);
        if (costRate > 0) {
          return {
            costRegular: costRate,
            costOT: costRate * 1.5
          };
        }
      } else {
        console.log(`❌ No match for province="${mappedProvince}" + jobLevel="${jobLevel}"`);
      }
    } catch (e) {
      console.warn("Failed to lookup cost rate", e);
    }

    return null;
  }

  return {
    getProvinceOptions,
    getMapping,
    getDisplay,
    lookupCostRate
  };
})();

console.log("✅ ProvinceMapping ready");
