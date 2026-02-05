// Export/Import — Bundle complete estimates into ZIP files

window.EstimateExport = (function () {

  // Gather all data for export
  function gatherExportData() {
    return {
      version: "2.0",
      exportDate: new Date().toISOString(),
      wbsData: window.WBS_DATA || [],
      wbsPills: window.wbsPills || {},
      laborResources: window.laborResources || [],
      laborActivities: window.laborActivities || {},
      collapsedNodes: Array.from(window.collapsedNodes || []),
      expandedLaborNodes: Array.from(window.expandedLaborNodes || []),
      expandedPricingMethods: window.expandedPricingMethods || {},
      ohRates: window.ohRates || {},
      currentTheme: window.currentTheme || "dark",
      financialMode: window.financialMode || "detailed",
      showResourceRates: window.showResourceRates || false,
      rateTables: RateTables.getAllTables(),
      jobLevels: JobLevels.getAllLevels(),
      rateColumns: RateColumns.getAllColumns(),
      customResources: ResourceManager ? ResourceManager.getCustomResources() : [],
      importedNamedResources: ResourceManager ? ResourceManager.getImportedNamedResources() : [],
      importedUsages: localStorage.getItem("estimator_imported_usages_v1") ? JSON.parse(localStorage.getItem("estimator_imported_usages_v1")) : [],
      importedRateTables: localStorage.getItem("estimator_imported_rate_tables_v1") ? JSON.parse(localStorage.getItem("estimator_imported_rate_tables_v1")) : []
    };
  }

  // Export to JSON file (single file option)
  function exportToJSON() {
    const data = gatherExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimate-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export to ZIP file (now just calls JSON export for local operation)
  async function exportToZIP(silent = false) {
    if (!silent) console.log("🔄 exportToZIP() called - using JSON export");
    
    // Always use JSON export for local operation (no JSZip dependency)
    exportToJSON();
  }

  // Import from JSON file
  function importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          applyImportData(data);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Import from ZIP file (disabled for local operation)
  async function importFromZIP(file) {
    throw new Error("ZIP import is disabled for local operation. Please use JSON import instead.");
  }

  // Apply imported data to application
  function applyImportData(data) {
    if (!data) throw new Error("No data to import");
    
    // Restore WBS data
    if (data.wbsData) window.WBS_DATA = data.wbsData;
    if (data.wbsPills) window.wbsPills = data.wbsPills;
    if (data.laborResources) window.laborResources = data.laborResources;
    if (data.laborActivities) window.laborActivities = data.laborActivities;
    if (data.collapsedNodes) window.collapsedNodes = new Set(data.collapsedNodes);
    if (data.expandedLaborNodes) window.expandedLaborNodes = new Set(data.expandedLaborNodes);
    if (data.expandedPricingMethods) window.expandedPricingMethods = data.expandedPricingMethods;
    if (data.ohRates) window.ohRates = data.ohRates;
    if (data.currentTheme) window.currentTheme = data.currentTheme;
    if (data.financialMode) window.financialMode = data.financialMode;
    if (typeof data.showResourceRates === "boolean") window.showResourceRates = data.showResourceRates;
    
    // Restore imported data
    if (data.importedNamedResources && ResourceManager) {
      ResourceManager.saveImportedNamedResources(data.importedNamedResources);
    }
    if (data.importedUsages) {
      localStorage.setItem("estimator_imported_usages_v1", JSON.stringify(data.importedUsages));
    }
    if (data.importedRateTables) {
      localStorage.setItem("estimator_imported_rate_tables_v1", JSON.stringify(data.importedRateTables));
    }
    
    // Restore rate tables
    if (data.rateTables && Array.isArray(data.rateTables)) {
      const customTables = data.rateTables.filter(t => t.type === "custom");
      customTables.forEach(table => {
        RateTables.updateCustomTable(table.id, table);
      });
    }
    
    // Restore job levels
    if (data.jobLevels && Array.isArray(data.jobLevels)) {
      const customLevels = data.jobLevels.filter(l => l.type === "custom");
      customLevels.forEach(level => {
        JobLevels.updateCustomLevel(level.id, level.label, level.costRegular, level.costOT, level.sellRates);
      });
    }
    
    // Restore rate columns
    if (data.rateColumns && Array.isArray(data.rateColumns)) {
      const customColumns = data.rateColumns.filter(c => c.custom === true);
      customColumns.forEach(col => {
        RateColumns.addCustomColumn(col.label, col.description);
      });
    }
    
    // Restore resources
    if (data.customResources && Array.isArray(data.customResources)) {
      // ResourceManager handles this
    }
    
    // Save to localStorage
    if (typeof saveAppState === "function") {
      saveAppState();
    }
    
    // Re-render UI
    if (typeof renderWBS === "function") {
      renderWBS();
    }
    
    console.log("✅ Import successful");
  }

  // Show import dialog
  function showImportDialog() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        await importFromJSON(file);
        alert("Estimate imported successfully from JSON!");
      } catch (err) {
        alert(`Import failed: ${err.message}`);
        console.error("Import error:", err);
      }
    };
    input.click();
  }

  return {
    exportToJSON,
    exportToZIP,
    importFromJSON,
    importFromZIP,
    showImportDialog,
    gatherExportData
  };
})();

console.log("✅ EstimateExport ready");
