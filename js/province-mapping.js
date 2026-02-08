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
    const lookupKey = `${mappedProvince}${jobLevel}`.toUpperCase();
    console.log(`🔍 Lookup: display="${provinceDisplay}" → mapped="${mappedProvince}" + jobLevel="${jobLevel}"`);
    console.log(`🔑 SEARCHING FOR LOOKUP KEY: "${lookupKey}"`);

    // Get imported rate tables from localStorage
    const raw = localStorage.getItem("estimator_imported_rate_tables_v1");
    console.log(`📦 Raw localStorage data:`, raw ? `${raw.length} chars` : 'null');
    if (!raw) {
      console.log("❌ No imported rate tables found in localStorage");
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
        console.log("All keys in sample entry:", Object.keys(rateTables[0]));

        // Show first few entries to see what data we have
        const previewCount = Math.min(3, rateTables.length);
        console.log(`📊 First ${previewCount} rate table entries:`);
        for (let i = 0; i < previewCount; i++) {
          console.log(`  [${i}]:`, rateTables[i]);
        }
      }

      // Try all common field names for province and job code/level
      const provinceFields = ["province", "PROVINCE", "Province"];
      const jobFields = ["jobLevel", "jobCode", "JOB LEVEL", "Job Level", "Job Code", "JOB CODE"];
      const costFields = ["costRate", "COST RATE", "Cost Rate", "cost", "COST"];

      console.log(`🔎 Looking for combined key: "${lookupKey}"`);
      console.log(`📋 Field name options - Province: [${provinceFields.join(', ')}], Job: [${jobFields.join(', ')}], Cost: [${costFields.join(', ')}]`);

      // First, try to match using the combined lookup key (Province + JobLevel)
      // This handles the format: CostRate_ID = "ONP6", Cost_Rate = 95
      const costRateIdFields = ["costRateId", "costRateID", "CostRateId", "costRate_id"];
      const directByCostId = rateTables.find(rt => {
        const rtId = getField(rt, costRateIdFields);
        return rtId && rtId.toString().toUpperCase() === lookupKey;
      });

      if (directByCostId) {
        const directCost = parseFloat(getField(directByCostId, costFields) || directByCostId.costRate || 0);
        if (directCost > 0) {
          console.log(`✅ Combined key match found for "${lookupKey}": ${directCost}`);
          return { costRegular: directCost, costOT: directCost * 1.5 };
        }
      }

      let foundMatch = null;
      rateTables.forEach((rt, idx) => {
        const rtProvince = getField(rt, provinceFields);
        const rtJobLevel = getField(rt, jobFields);
        const rtCostRate = getField(rt, costFields) || rt.costRate;
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
        const costRate = parseFloat(getField(foundMatch, costFields) || foundMatch.costRate || 0);
        if (costRate > 0) {
          console.log(`✅ RETURNING RATES: costRegular=${costRate}, costOT=${costRate * 1.5}`);
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

    console.log(`🚫 RETURNING NULL for lookup key "${mappedProvince}${jobLevel}"`);
    return null;
  }

  return {
    getProvinceOptions,
    getMapping,
    getDisplay,
    lookupCostRate
  };
})();

console.log("✅ ProvinceMapping ready - available functions:", Object.keys(window.ProvinceMapping));
