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

  // Export to ZIP file (recommended - includes all data files)
  async function exportToZIP(silent = false) {
    if (!silent) console.log("🔄 exportToZIP() called");
    
    if (typeof JSZip === "undefined") {
      console.error("❌ JSZip not loaded");
      if (!silent) alert("JSZip library not loaded. Using JSON export instead.");
      exportToJSON();
      return;
    }

    try {
      const zip = new JSZip();
      const data = gatherExportData();
      
      if (!silent) console.log("📦 Gathering data...", data);
      
      // Main estimate data
      zip.file("estimate.json", JSON.stringify({
        version: data.version,
        exportDate: data.exportDate,
        wbsData: data.wbsData,
        wbsPills: data.wbsPills,
        laborResources: data.laborResources,
        laborActivities: data.laborActivities,
        collapsedNodes: data.collapsedNodes,
        expandedLaborNodes: data.expandedLaborNodes,
        expandedPricingMethods: data.expandedPricingMethods,
        ohRates: data.ohRates,
        currentTheme: data.currentTheme,
        financialMode: data.financialMode,
        showResourceRates: data.showResourceRates
      }, null, 2));
      
      // Rate tables
      zip.file("rate-tables.json", JSON.stringify({ tables: data.rateTables }, null, 2));
      
      // Job levels
      zip.file("job-levels.json", JSON.stringify({ levels: data.jobLevels }, null, 2));
      
      // Rate columns
      zip.file("rate-columns.json", JSON.stringify({ columns: data.rateColumns }, null, 2));
      
      // Resources
      zip.file("resources.json", JSON.stringify({ resources: data.customResources }, null, 2));
      
      // Imported named resources (employees)
      zip.file("imported-resources.json", JSON.stringify({ resources: data.importedNamedResources }, null, 2));
      
      // Imported usages
      zip.file("imported-usages.json", JSON.stringify({ usages: data.importedUsages }, null, 2));
      
      // Imported rate tables
      zip.file("imported-rate-tables.json", JSON.stringify({ rateTables: data.importedRateTables }, null, 2));
      
      if (!silent) console.log("✅ Files added to ZIP, generating blob...");
      
      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      if (!silent) console.log("✅ Blob generated, size:", blob.size, "bytes");
      
      const url = URL.createObjectURL(blob);
      if (!silent) console.log("✅ Object URL created:", url);
      
      const filename = `estimate-${new Date().toISOString().split('T')[0]}.zip`;
      if (!silent) console.log("📥 Triggering download:", filename);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);  // Ensure it's in the DOM
      a.click();
      document.body.removeChild(a);  // Clean up
      
      // Keep URL alive briefly in case browser is slow
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      if (!silent) {
        console.log("✅ Download triggered successfully");
        alert(`✅ Estimate exported to ${filename}`);
      }
    } catch (err) {
      console.error("❌ Export failed:", err);
      if (!silent) alert(`Export failed: ${err.message}`);
    }
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

  // Import from ZIP file
  async function importFromZIP(file) {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip library not loaded");
    }

    const zip = await JSZip.loadAsync(file);
    const data = {};
    
    // Load estimate data
    if (zip.files["estimate.json"]) {
      const content = await zip.files["estimate.json"].async("text");
      const estimateData = JSON.parse(content);
      Object.assign(data, estimateData);
    }
    
    // Load rate tables
    if (zip.files["rate-tables.json"]) {
      const content = await zip.files["rate-tables.json"].async("text");
      const tables = JSON.parse(content);
      data.rateTables = tables.tables;
    }
    
    // Load job levels
    if (zip.files["job-levels.json"]) {
      const content = await zip.files["job-levels.json"].async("text");
      const levels = JSON.parse(content);
      data.jobLevels = levels.levels;
    }
    
    // Load rate columns
    if (zip.files["rate-columns.json"]) {
      const content = await zip.files["rate-columns.json"].async("text");
      const columns = JSON.parse(content);
      data.rateColumns = columns.columns;
    }
    
    // Load resources
    if (zip.files["resources.json"]) {
      const content = await zip.files["resources.json"].async("text");
      const resources = JSON.parse(content);
      data.customResources = resources.resources;
    }
    
    // Load imported named resources
    if (zip.files["imported-resources.json"]) {
      const content = await zip.files["imported-resources.json"].async("text");
      const importedResources = JSON.parse(content);
      data.importedNamedResources = importedResources.resources;
    }
    
    // Load imported usages
    if (zip.files["imported-usages.json"]) {
      const content = await zip.files["imported-usages.json"].async("text");
      const importedUsages = JSON.parse(content);
      data.importedUsages = importedUsages.usages;
    }
    
    // Load imported rate tables
    if (zip.files["imported-rate-tables.json"]) {
      const content = await zip.files["imported-rate-tables.json"].async("text");
      const importedRateTables = JSON.parse(content);
      data.importedRateTables = importedRateTables.rateTables;
    }
    
    applyImportData(data);
    return true;
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
    input.accept = ".json,.zip";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        if (file.name.endsWith(".zip")) {
          await importFromZIP(file);
          alert("Estimate imported successfully from ZIP!");
        } else {
          await importFromJSON(file);
          alert("Estimate imported successfully from JSON!");
        }
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
