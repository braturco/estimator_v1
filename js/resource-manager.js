// Resource Manager — CRUD for labor resources with categories (standard/named/custom)
// DEBUG: resource-manager.js loaded
console.log('[Resource Import] resource-manager.js loaded');
// Resource Manager — CRUD for labor resources with categories (standard/named/custom)
// DEBUG: resource-manager.js loaded
console.log('[Resource Import] resource-manager.js loaded');

window.ResourceManager = (function () {
  // DEBUG: ResourceManager assigned
  console.log('[Resource Import] window.ResourceManager assigned');
  const CUSTOM_RESOURCES_KEY = "estimator_custom_resources_v1";
  const IMPORTED_NAMED_RESOURCES_KEY = "estimator_imported_named_resources_v1";

  function getCustomResources() {
    try {
      const raw = localStorage.getItem(CUSTOM_RESOURCES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load custom resources", e);
      return [];
    }
  }

  function saveCustomResources(resources) {
    try {
      localStorage.setItem(CUSTOM_RESOURCES_KEY, JSON.stringify(resources));
      return true;
    } catch (e) {
      console.warn("Failed to save custom resources", e);
      return false;
    }
  }

  function addCustomResource(label, jobLevelId, costRegOverride = null, costOTOverride = null, sellRegOverride = null, sellOTOverride = null) {
    const resources = getCustomResources();
    const newResource = {
      id: "custom-" + crypto.randomUUID(),
      label,
      jobLevelId,
      costRegOverride: costRegOverride !== null ? parseFloat(costRegOverride) : null,
      costOTOverride: costOTOverride !== null ? parseFloat(costOTOverride) : null,
      sellRegOverride: sellRegOverride !== null ? parseFloat(sellRegOverride) : null,
      sellOTOverride: sellOTOverride !== null ? parseFloat(sellOTOverride) : null,
      type: "custom"
    };
    resources.push(newResource);
    saveCustomResources(resources);
    return newResource;
  }

  function updateCustomResource(id, label, jobLevelId, costRegOverride = null, costOTOverride = null, sellRegOverride = null, sellOTOverride = null) {
    const resources = getCustomResources();
    const idx = resources.findIndex(r => r.id === id);
    if (idx !== -1) {
      resources[idx] = {
        ...resources[idx],
        label,
        jobLevelId,
        costRegOverride: costRegOverride !== null ? parseFloat(costRegOverride) : null,
        costOTOverride: costOTOverride !== null ? parseFloat(costOTOverride) : null,
        sellRegOverride: sellRegOverride !== null ? parseFloat(sellRegOverride) : null,
        sellOTOverride: sellOTOverride !== null ? parseFloat(sellOTOverride) : null
      };
      saveCustomResources(resources);
      return resources[idx];
    }
    return null;
  }

  function deleteCustomResource(id) {
    const resources = getCustomResources();
    const filtered = resources.filter(r => r.id !== id);
    saveCustomResources(filtered);
    return filtered.length < resources.length;
  }

  function getImportedNamedResources() {
    try {
      const raw = localStorage.getItem(IMPORTED_NAMED_RESOURCES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load imported named resources", e);
      return [];
    }
  }

  function saveImportedNamedResources(resources) {
    try {
      localStorage.setItem(IMPORTED_NAMED_RESOURCES_KEY, JSON.stringify(resources));
      return true;
    } catch (e) {
      console.warn("Failed to save imported named resources", e);
      return false;
    }
  }

  // Parse employee CSV with new column structure
  function parseEmployeeCSV(csvText) {
      // DEBUG: Confirm function entry and show raw CSV
      console.log('[Resource Import] parseEmployeeCSV called');
      console.log('[Resource Import] raw csv:', csvText);
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Remove BOM if present
    let headerLine = lines[0].replace(/^\uFEFF/, '').trim();
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    console.log('[Resource Import] Parsed headers:', headers);
    const costRateIdx = headers.findIndex(h => h === 'rate lookup');
    const employeeIdIdx = headers.findIndex(h => h === 'employee id');
    const nameIdx = headers.findIndex(h => h === 'name');
    const jobLevelIdx = headers.findIndex(h => h === 'job level');
    const roleIdx = headers.findIndex(h => h === 'role');
    const lvl3Idx = headers.findIndex(h => h === 'lvl3');
    console.log('[Resource Import] Indices:', {costRateIdx, employeeIdIdx, nameIdx, jobLevelIdx, roleIdx, lvl3Idx});
    const resources = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));

      const costRateId = costRateIdx >= 0 ? cells[costRateIdx] : '';
      const employeeId = employeeIdIdx >= 0 ? cells[employeeIdIdx] : '';
      const name = nameIdx >= 0 ? cells[nameIdx] : '';
      const jobLevel = jobLevelIdx >= 0 ? cells[jobLevelIdx] : '';
      const role = roleIdx >= 0 ? cells[roleIdx] : '';
      const lvl3Id = lvl3Idx >= 0 ? cells[lvl3Idx] : '';

      if (!employeeId && !name) {
        console.warn('[Resource Import] Skipping row', {i, line, cells, costRateId, employeeId, name});
        continue;
      }

      // Log if any required index is -1
      if (costRateIdx === -1 || employeeIdIdx === -1 || nameIdx === -1 || jobLevelIdx === -1 || roleIdx === -1 || lvl3Idx === -1) {
        console.error('[Resource Import] Missing required column index', {
          costRateIdx, employeeIdIdx, nameIdx, jobLevelIdx, roleIdx, lvl3Idx, headers
        });
      }

      resources.push({
        id: `employee-${employeeId || crypto.randomUUID()}`,
        costRateId,
        employeeId,
        name,
        jobLevel,
        role,
        lvl3Id,
        type: "named"
      });
    }

    return resources;
  }

  // Import from SharePoint URL
  async function importFromSharePoint(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const csvText = await response.text();
      const resources = parseEmployeeCSV(csvText);
      if (resources.length > 0) {
        saveImportedNamedResources(resources);
        return { success: true, count: resources.length };
      }
      return { success: false, error: "No valid resources found in CSV" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Import from file upload
  function importFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const resources = parseEmployeeCSV(csvText);
          if (resources.length > 0) {
            saveImportedNamedResources(resources);
            resolve({ success: true, count: resources.length });
          } else {
            resolve({ success: false, error: "No valid resources found in CSV" });
          }
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, error: "Failed to read file" });
      };
      reader.readAsText(file);
    });
  }

  async function getAllResources() {
    const standardData = await Rates.listResources();
    const custom = getCustomResources();
    const imported = getImportedNamedResources();
    return {
      standard: standardData.generic || [],
      named: imported.length > 0 ? imported : (standardData.named || []),
      custom
    };
  }

  function openManager() {
    // DEBUG: Modal opened
    console.log('[Resource Manager] openManager called');
    Modal.open({
      title: "Labor Resource Manager",
      content: (container) => renderManager(container),
      onSave: () => {
        Modal.close();
        if (typeof renderWBS === "function") {
          renderWBS();
        }
      }
    });
  }

  function openRateScheduleManager() {
    openManager();
    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      const btn = document.querySelector(".modal [data-action='open-rate-schedule']");
      if (btn) {
        btn.click();
        return;
      }
      if (attempts < 12) {
        setTimeout(tryOpen, 50);
      }
    };
    setTimeout(tryOpen, 0);
  }

  function showEmployeeImportDialog() {
    Modal.open({
      title: "Import Employee Resources",
      content: (container) => {
        container.innerHTML = "";
        container.style.padding = "16px";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "20px";

        // Instructions
        const instructions = document.createElement("div");
        instructions.style.fontSize = "12px";
        instructions.style.color = "var(--text-muted)";
        instructions.style.lineHeight = "1.6";
        instructions.innerHTML = `
          <strong>Expected CSV Columns:</strong><br>
          Rate Lookup, Employee ID, Name, Job Level, Role, Lvl3
        `;
        container.appendChild(instructions);

        // SharePoint URL section

        // DEBUG: Add file upload handler log
        setTimeout(() => {
          const fileInput = container.querySelector('input[type="file"]');
          if (fileInput) {
            fileInput.addEventListener('change', (e) => {
              console.log('[Resource Import] File input changed', e.target.files);
            });
          }
        }, 100);
        const urlSection = document.createElement("div");
        urlSection.style.display = "flex";
        urlSection.style.flexDirection = "column";
        urlSection.style.gap = "8px";

        const urlLabel = document.createElement("label");
        urlLabel.textContent = "SharePoint URL";
        urlLabel.style.fontSize = "12px";
        urlLabel.style.fontWeight = "600";

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.placeholder = "https://sharepoint.com/path/to/employees.csv";
        urlInput.style.padding = "8px";
        urlInput.style.border = "1px solid var(--border)";
        urlInput.style.borderRadius = "4px";
        urlInput.style.background = "var(--bg)";
        urlInput.style.color = "var(--text)";
        urlInput.style.fontSize = "12px";

        const urlBtn = document.createElement("button");
        urlBtn.className = "btn btn-primary";
        urlBtn.textContent = "Import from URL";
        urlBtn.style.width = "fit-content";
        urlBtn.addEventListener("click", async () => {
          const url = urlInput.value.trim();
          if (!url) {
            alert("Please enter a SharePoint URL");
            return;
          }
          urlBtn.disabled = true;
          urlBtn.textContent = "Importing...";
          const result = await importFromSharePoint(url);
          if (result.success) {
            alert(`Successfully imported ${result.count} employee resources`);
            renderManager(container.closest(".modal-body"));
          } else {
            alert(`Import failed: ${result.error}`);
            urlBtn.disabled = false;
            urlBtn.textContent = "Import from URL";
          }
        });

        urlSection.appendChild(urlLabel);
        urlSection.appendChild(urlInput);
        urlSection.appendChild(urlBtn);
        container.appendChild(urlSection);

        // Divider
        const divider = document.createElement("div");
        divider.textContent = "OR";
        divider.style.textAlign = "center";
        divider.style.color = "var(--text-muted)";
        divider.style.fontSize = "12px";
        divider.style.fontWeight = "600";
        container.appendChild(divider);

        // File upload section
        const fileSection = document.createElement("div");
        fileSection.style.display = "flex";
        fileSection.style.flexDirection = "column";
        fileSection.style.gap = "8px";

        const fileLabel = document.createElement("label");
        fileLabel.textContent = "Upload CSV File";
        fileLabel.style.fontSize = "12px";
        fileLabel.style.fontWeight = "600";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".csv";
        fileInput.style.padding = "8px";
        fileInput.style.border = "1px solid var(--border)";
        fileInput.style.borderRadius = "4px";
        fileInput.style.background = "var(--bg)";
        fileInput.style.color = "var(--text)";
        fileInput.style.fontSize = "12px";

        fileInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const result = await importFromFile(file);
          if (result.success) {
            alert(`Successfully imported ${result.count} employee resources`);
            renderManager(container.closest(".modal-body"));
          } else {
            alert(`Import failed: ${result.error}`);
          }
        });

        fileSection.appendChild(fileLabel);
        fileSection.appendChild(fileInput);
        container.appendChild(fileSection);
      },
      onSave: null,
      onClose: () => Modal.close()
    });
  }

  async function renderManager(container) {
    console.log('[Resource Manager] renderManager called');
    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.flex = "1";
    container.style.minHeight = "0";

    const allResources = await getAllResources();

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.style.padding = "12px 0";
    toolbar.style.borderBottom = "1px solid var(--border)";
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";

    const showRateScheduleDialog = async () => {
      let selectedTableId = null;
      const tables = await RateTables.getAllTables();
      if (tables && tables.length > 0) {
        selectedTableId = tables[0].id;
      }

      let pendingRenameLevelId = null;

      Modal.open({
        title: "Rate Schedule Manager",
        content: (formContainer) => {
          // Load all required data synchronously from passed variables
          RateTables.getAllTables().then(async (rateTablesAll) => {
            formContainer.style.display = "flex";
            formContainer.style.flexDirection = "column";
            formContainer.style.gap = "16px";
            formContainer.style.minHeight = "500px";

            const tablesSection = document.createElement("div");

            const tableHeaderRow = document.createElement("div");
            tableHeaderRow.style.display = "flex";
            tableHeaderRow.style.justifyContent = "space-between";
            tableHeaderRow.style.alignItems = "center";
            tableHeaderRow.style.gap = "8px";
            tableHeaderRow.style.marginBottom = "8px";

            const tableSelectLabel = document.createElement("div");
            tableSelectLabel.textContent = "Rate Table";
            tableSelectLabel.style.fontSize = "12px";
            tableSelectLabel.style.color = "var(--text-muted)";

            const tableSelect = document.createElement("select");
            tableSelect.style.padding = "6px 8px";
            tableSelect.style.border = "1px solid var(--border)";
            tableSelect.style.borderRadius = "4px";
            tableSelect.style.background = "var(--bg)";
            tableSelect.style.color = "var(--text)";
            tableSelect.style.fontSize = "12px";
            tableSelect.style.flex = "1";

            rateTablesAll.forEach(tbl => {
              const opt = document.createElement("option");
              opt.value = tbl.id;
              opt.textContent = tbl.label;
              if (tbl.id === selectedTableId) opt.selected = true;
              tableSelect.appendChild(opt);
            });

          const addTableBtn = document.createElement("button");
          addTableBtn.className = "btn btn-primary";
          addTableBtn.textContent = "+ Add Table";

          const delTableBtn = document.createElement("button");
          delTableBtn.className = "btn btn-secondary";
          delTableBtn.textContent = "Delete";

          tableHeaderRow.appendChild(tableSelectLabel);
          tableHeaderRow.appendChild(tableSelect);
          tableHeaderRow.appendChild(addTableBtn);
          tableHeaderRow.appendChild(delTableBtn);

          const jobLevelBtnRow = document.createElement("div");
          jobLevelBtnRow.style.display = "flex";
          jobLevelBtnRow.style.justifyContent = "space-between";
          jobLevelBtnRow.style.alignItems = "center";
          jobLevelBtnRow.style.marginBottom = "8px";

          const jobLevelLabel = document.createElement("div");
          jobLevelLabel.textContent = "Job Levels";
          jobLevelLabel.style.fontWeight = "600";

            const addJobLevelBtn = document.createElement("button");
            addJobLevelBtn.className = "btn btn-primary";
            addJobLevelBtn.textContent = "+ Add Level";
            addJobLevelBtn.addEventListener("click", () => {
              const columns = RateColumns.getAllColumns();
              const sellRatesMap = {};
              columns.forEach(col => {
                sellRatesMap[col.id] = { regular: 0, ot: 0 };
              });
              const nextIndex = JobLevels.getCustomLevels().length + 1;
              const newLevel = JobLevels.addCustomLevel(`New Level ${nextIndex}`, 0, 0, sellRatesMap);
              pendingRenameLevelId = newLevel.id;
              renderTableEditor();
            });

            jobLevelBtnRow.appendChild(jobLevelLabel);
            jobLevelBtnRow.appendChild(addJobLevelBtn);

          const tableMeta = document.createElement("div");
          tableMeta.style.display = "grid";
          tableMeta.style.gridTemplateColumns = "1.5fr 1fr 1fr 110px";
          tableMeta.style.gap = "8px";
          tableMeta.style.marginTop = "8px";

          const tableLabelInput = document.createElement("input");
          tableLabelInput.placeholder = "Table label";
          tableLabelInput.style.padding = "6px";
          tableLabelInput.style.border = "1px solid var(--border)";
          tableLabelInput.style.borderRadius = "4px";
          tableLabelInput.style.background = "var(--bg)";
          tableLabelInput.style.color = "var(--text)";

          const tableDescInput = document.createElement("input");
          tableDescInput.placeholder = "Description";
          tableDescInput.style.padding = "6px";
          tableDescInput.style.border = "1px solid var(--border)";
          tableDescInput.style.borderRadius = "4px";
          tableDescInput.style.background = "var(--bg)";
          tableDescInput.style.color = "var(--text)";

          const tableBLInput = document.createElement("input");
          tableBLInput.placeholder = "Default BL";
          tableBLInput.style.padding = "6px";
          tableBLInput.style.border = "1px solid var(--border)";
          tableBLInput.style.borderRadius = "4px";
          tableBLInput.style.background = "var(--bg)";
          tableBLInput.style.color = "var(--text)";

          const tableProvSelect = document.createElement("select");
          tableProvSelect.style.padding = "6px";
          tableProvSelect.style.border = "1px solid var(--border)";
          tableProvSelect.style.borderRadius = "4px";
          tableProvSelect.style.background = "var(--bg)";
          tableProvSelect.style.color = "var(--text)";
          tableProvSelect.style.fontSize = "12px";

          // Add blank option
          const blankProvOpt = document.createElement("option");
          blankProvOpt.value = "";
          blankProvOpt.textContent = "Province";
          blankProvOpt.disabled = true;
          blankProvOpt.selected = true;
          tableProvSelect.appendChild(blankProvOpt);

          // Add province options
          if (window.ProvinceMapping && typeof window.ProvinceMapping.getProvinceOptions === "function") {
            const provinceOptions = window.ProvinceMapping.getProvinceOptions();
            provinceOptions.forEach(opt => {
              const option = document.createElement("option");
              option.value = opt.display;
              option.textContent = opt.display;
              tableProvSelect.appendChild(option);
            });
          }

          tableMeta.appendChild(tableLabelInput);
          tableMeta.appendChild(tableDescInput);
          tableMeta.appendChild(tableBLInput);
          tableMeta.appendChild(tableProvSelect);

          // Wrap table grid in a scrollable container
          const tableGridWrapper = document.createElement("div");
          tableGridWrapper.style.marginTop = "12px";
          tableGridWrapper.style.overflowY = "auto";
          tableGridWrapper.style.overflowX = "hidden";
          tableGridWrapper.style.maxHeight = "500px";
          tableGridWrapper.style.border = "1px solid var(--border)";
          tableGridWrapper.style.borderRadius = "4px";
          tableGridWrapper.style.position = "relative";

          let currentTable = null; // Keep current table in memory

          function renderTableEditor(tableOverride = null) {
            tableGridWrapper.innerHTML = "";
            const tablePromise = tableOverride ? Promise.resolve(tableOverride) : RateTables.getTableById(selectedTableId);
            tablePromise.then(async table => {
              currentTable = table; // Store current table
              // Update all metadata inputs
              tableLabelInput.value = table.label || "";
              tableDescInput.value = table.description || "";
              tableBLInput.value = table.defaultBL || "";
              tableProvSelect.value = table.defaultProv || "";

              // Also sync the dropdown to match
              const option = Array.from(tableSelect.options).find(opt => opt.value === selectedTableId);
              if (option && table.label) {
                option.textContent = table.label;
            }

            const rateColumns = RateColumns.getAllColumns();
            const levels = await JobLevels.getAllLevels();

            // Create grid container
            const gridContainer = document.createElement("div");
            gridContainer.style.display = "flex";
            gridContainer.style.flexDirection = "column";
            gridContainer.style.gap = "0";

            const allInputs = [];

            // Get the list of generic rate codes from the table
            // If customOrder exists on the table, use it; otherwise sort by job family
            let rateCodes;
            if (table.customOrder && Array.isArray(table.customOrder)) {
              rateCodes = table.customOrder;
            } else {
              rateCodes = Object.keys(table.rates || {}).sort((a, b) => {
                // Sort by job family order: E, L, P, T, S
                const familyOrder = { E: 0, L: 1, P: 2, T: 3, S: 4 };
                const familyA = a.charAt(0);
                const familyB = b.charAt(0);
                const familyDiff = (familyOrder[familyA] || 99) - (familyOrder[familyB] || 99);
                if (familyDiff !== 0) return familyDiff;
                // Within same family, sort numerically descending (E1, L3->L1, P8->P0, etc.)
                return parseInt(b.slice(1)) - parseInt(a.slice(1));
              });
            }

            // Create a lookup from rate code to job level label
            const codeToLabel = {};
            
            // Hardcoded fallback mapping
            const fallbackLabels = {
              "E1": "Vice President",
              "L3": "Director",
              "L2": "Snr. Manager",
              "L1": "Manager",
              "P8": "Level 8 Professional",
              "P7": "Level 7 Professional",
              "P6": "Level 6 Professional",
              "P5": "Level 5 Professional",
              "P4": "Level 4 Professional",
              "P3": "Level 3 Professional",
              "P2": "Level 2 Professional",
              "P1": "Level 1 Professional",
              "P0": "Level 0 Professional",
              "T5": "Level 5 Tech",
              "T4": "Level 4 Tech",
              "T3": "Level 3 Tech",
              "T2": "Level 2 Tech",
              "T1": "Level 1 Tech",
              "S4": "Level 4 Admin",
              "S3": "Level 3 Admin",
              "S2": "Level 2 Admin",
              "S1": "Level 1 Admin"
            };
            
            // Build from loaded levels if available
            if (levels && Array.isArray(levels) && levels.length > 0) {
              levels.forEach(level => {
                const code = level.code || level.id;
                if (code && level.label) {
                  codeToLabel[code] = level.label;
                }
              });
            }
            
            // Fill in any missing codes with fallback
            Object.keys(fallbackLabels).forEach(code => {
              if (!codeToLabel[code]) {
                codeToLabel[code] = fallbackLabels[code];
              }
            });

            // Create primary header row (category names)
            const headerRowPrimary = document.createElement("div");
            headerRowPrimary.style.display = "grid";
            headerRowPrimary.style.gridTemplateColumns = `280px ${"1fr ".repeat(2 + rateColumns.length * 2).trim()}`;
            headerRowPrimary.style.gap = "0";
            headerRowPrimary.style.alignItems = "center";
            headerRowPrimary.style.background = "var(--bg)";
            headerRowPrimary.style.fontWeight = "600";
            headerRowPrimary.style.fontSize = "11px";
            headerRowPrimary.style.color = "var(--text)";
            headerRowPrimary.style.padding = "8px 6px";
            headerRowPrimary.style.position = "sticky";
            headerRowPrimary.style.top = "0";
            headerRowPrimary.style.zIndex = "11";
            headerRowPrimary.style.borderBottom = "1px solid var(--border)";

            // Job Level column header
            const jobLevelHeaderPrimary = document.createElement("div");
            jobLevelHeaderPrimary.textContent = "Job Level";
            jobLevelHeaderPrimary.style.gridColumn = "1";
            jobLevelHeaderPrimary.style.textAlign = "left";
            headerRowPrimary.appendChild(jobLevelHeaderPrimary);

            // Cost header
            const costHeader = document.createElement("div");
            costHeader.textContent = "Cost";
            costHeader.style.textAlign = "center";
            costHeader.style.gridColumn = "2 / span 2";
            headerRowPrimary.appendChild(costHeader);

            // Table: Imported Employees (NEW SCHEMA)
            const importedSection = document.createElement("div");
            importedSection.style.marginTop = "18px";
            importedSection.style.marginBottom = "8px";
            importedSection.style.fontWeight = "600";
            importedSection.style.fontSize = "15px";
            importedSection.textContent = `Imported Employees (${allResources.length})`;
            container.appendChild(importedSection);

            // Only declare 'table' once in this scope
            table = document.createElement("div");
            table.className = "resource-table";
            table.style.display = "grid";
            table.style.gridTemplateColumns = "120px 1.5fr 1fr 1fr 1fr 1fr";
            table.style.gap = "0";
            table.style.border = "1px solid var(--border)";
            table.style.borderRadius = "4px";
            table.style.overflow = "hidden";
            table.style.background = "var(--bg-panel)";
            table.style.marginBottom = "12px";
            table.style.maxHeight = "340px";
            table.style.overflowY = "auto";

            // Header row (NEW SCHEMA)
            const headerRow = document.createElement("div");
            headerRow.className = "resource-table-header";
            headerRow.style.display = "contents";
            ["Rate Lookup", "Employee ID", "Name", "Job Level", "Role", "Lvl3"].forEach(label => {
              const cell = document.createElement("div");
              cell.textContent = label;
              cell.style.fontWeight = "600";
              cell.style.fontSize = "12px";
              cell.style.padding = "8px 6px";
              cell.style.background = "var(--bg)";
              cell.style.borderBottom = "1px solid var(--border-muted)";
              cell.style.color = "var(--text-muted)";
              table.appendChild(cell);
            });

            // Data rows (NEW SCHEMA)
            allResources.forEach(resource => {
              const row = document.createElement("div");
              row.className = "resource-table-row";
              row.style.display = "contents";
              [resource.costRateId, resource.employeeId, resource.name, resource.jobLevel, resource.role, resource.lvl3Id].forEach((val, idx) => {
                const cell = document.createElement("div");
                cell.textContent = val || "";
                cell.style.fontSize = "12px";
                cell.style.padding = "6px 6px";
                cell.style.borderBottom = "1px solid var(--border-muted)";
                cell.style.color = "var(--text)";
                table.appendChild(cell);
              });
            });

            container.appendChild(table);
            }); // End of async getTableById promise
          }

          async function updateTableMeta() {
            const table = await RateTables.getTableById(selectedTableId);
            if (!table) return;
            RateTables.updateCustomTable(table.id, {
              label: tableLabelInput.value.trim(),
              description: tableDescInput.value.trim(),
              defaultBL: tableBLInput.value.trim(),
              defaultProv: tableProvSelect.value
            });
          }

          // Province change handler - auto-populate ALL cost rates
          tableProvSelect.addEventListener("change", async () => {
            const selectedProvince = tableProvSelect.value;
            await updateTableMeta();
            
            if (!selectedProvince) {
              // No province - clear all cost rates
              const allInputs = tableGridWrapper.querySelectorAll('input[data-type="costReg"], input[data-type="costOT"]');
              allInputs.forEach(input => {
                input.value = "";
                const rateCode = input.dataset.rateCode;
                const table = currentTable;
                if (table && table.rates[rateCode]) {
                  table.rates[rateCode].cost = { reg: 0, ot: 0 };
                  RateTables.updateTableRates(table.id, rateCode, table.rates[rateCode]);
                }
              });
              return;
            }

            // Auto-lookup cost rates for ALL job levels
            if (window.ProvinceMapping && typeof window.ProvinceMapping.lookupCostRate === "function") {
              const costRegInputs = tableGridWrapper.querySelectorAll('input[data-type="costReg"]');
              for (const costRegInput of costRegInputs) {
                const rateCode = costRegInput.dataset.rateCode;
                const costOTInput = tableGridWrapper.querySelector(`input[data-rate-code="${rateCode}"][data-type="costOT"]`);
                
                // Clear first
                costRegInput.value = "";
                costOTInput.value = "";
                
                // Lookup rates
                const rates = await window.ProvinceMapping.lookupCostRate(selectedProvince, rateCode);
                if (rates) {
                  // Match found - populate and save
                  costRegInput.value = rates.costRegular.toString();
                  costOTInput.value = rates.costOT.toString();
                  costRegInput.style.background = "rgba(96, 250, 165, 0.25)";
                  costOTInput.style.background = "rgba(96, 250, 165, 0.25)";
                  
                  const table = currentTable;
                  if (table && table.rates[rateCode]) {
                    table.rates[rateCode].cost = {
                      reg: rates.costRegular,
                      ot: rates.costOT
                    };
                    RateTables.updateTableRates(table.id, rateCode, table.rates[rateCode]);
                  }
                } else {
                  // No match - clear stored values
                  const table = currentTable;
                  if (table && table.rates[rateCode]) {
                    table.rates[rateCode].cost = { reg: 0, ot: 0 };
                    RateTables.updateTableRates(table.id, rateCode, table.rates[rateCode]);
                  }
                }
              }
              
              // Clear green highlights after 2 seconds
              setTimeout(() => {
                const allCostInputs = tableGridWrapper.querySelectorAll('input[data-type="costReg"], input[data-type="costOT"]');
                allCostInputs.forEach(input => {
                  input.style.background = "rgba(96, 165, 250, 0.18)";
                });
              }, 2000);
            }
          });

          function syncTableSelectLabel() {
            const option = Array.from(tableSelect.options).find(opt => opt.value === selectedTableId);
            if (option) {
              option.textContent = tableLabelInput.value.trim() || option.textContent;
            }
          }

          tableLabelInput.addEventListener("input", () => {
            updateTableMeta();
            syncTableSelectLabel();
          });
          tableLabelInput.addEventListener("blur", () => {
            updateTableMeta();
            syncTableSelectLabel();
          });
          tableDescInput.addEventListener("blur", updateTableMeta);
          tableBLInput.addEventListener("blur", updateTableMeta);

          tableSelect.addEventListener("change", () => {
            selectedTableId = tableSelect.value;
            renderTableEditor();
          });

          addTableBtn.addEventListener("click", () => {
            const newTable = RateTables.addCustomTable("New Rate Table", "", "", "");
            selectedTableId = newTable.id;
            Modal.close();
            showRateScheduleDialog();
          });

          delTableBtn.addEventListener("click", async () => {
            const table = await RateTables.getTableById(selectedTableId);
            if (!table || table.type !== "custom") return;
            if (confirm(`Delete rate table "${table.label}"?`)) {
              RateTables.deleteCustomTable(table.id);
              Modal.close();
              showRateScheduleDialog();
            }
          });

          tablesSection.appendChild(tableHeaderRow);
          tablesSection.appendChild(jobLevelBtnRow);
          tablesSection.appendChild(tableMeta);
          tablesSection.appendChild(tableGridWrapper);

          renderTableEditor();

          formContainer.appendChild(tablesSection);
          }); // End of RateTables.getAllTables().then()
        },
        onSave: async () => {
          Modal.close();
          // Reload the latest tables from storage to ensure persistence
          if (typeof RateTables !== 'undefined' && typeof RateTables.getAllTables === 'function') {
            await RateTables.getAllTables();
          }
          renderManager(container);
        }
      });
    };

    const rateScheduleBtn = document.createElement("button");
    rateScheduleBtn.className = "btn btn-primary";
    rateScheduleBtn.textContent = "🧮 Rate Schedule";
    rateScheduleBtn.dataset.action = "open-rate-schedule";
    rateScheduleBtn.addEventListener("click", () => {
      showRateScheduleDialog();
    });

    const importEmployeesBtn = document.createElement("button");
    importEmployeesBtn.className = "btn btn-secondary";
    importEmployeesBtn.textContent = "📥 Import Employees";
    importEmployeesBtn.addEventListener("click", () => {
      showEmployeeImportDialog();
    });

    toolbar.appendChild(rateScheduleBtn);
    toolbar.appendChild(importEmployeesBtn);
    container.appendChild(toolbar);

    console.log("✅ Resource Manager toolbar appended with buttons:", toolbar.children.length);

    // Display imported employees section
    const importedEmployees = getImportedNamedResources();
    if (importedEmployees.length > 0) {
      const employeeSection = document.createElement("div");
      employeeSection.style.display = "flex";
      employeeSection.style.flexDirection = "column";
      employeeSection.style.gap = "12px";
      employeeSection.style.padding = "12px 0";
      employeeSection.style.borderBottom = "1px solid var(--border)";

      const sectionHeader = document.createElement("div");
      sectionHeader.style.display = "flex";
      sectionHeader.style.justifyContent = "space-between";
      sectionHeader.style.alignItems = "center";

      const sectionTitle = document.createElement("div");
      sectionTitle.textContent = `Imported Employees (${importedEmployees.length})`;
      sectionTitle.style.fontSize = "14px";
      sectionTitle.style.fontWeight = "600";

      const clearBtn = document.createElement("button");
      clearBtn.className = "btn btn-secondary";
      clearBtn.textContent = "Clear All";
      clearBtn.style.fontSize = "11px";
      clearBtn.style.padding = "4px 8px";
      clearBtn.addEventListener("click", () => {
        if (confirm(`Clear all ${importedEmployees.length} imported employees?`)) {
          saveImportedNamedResources([]);
          renderManager(container);
        }
      });

      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(clearBtn);
      employeeSection.appendChild(sectionHeader);

      // Table container with scroll
      const tableContainer = document.createElement("div");
      tableContainer.style.maxHeight = "300px";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.border = "1px solid var(--border)";
      tableContainer.style.borderRadius = "4px";

      // Table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "11px";

      // Header row (CSV columns only)
      const thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.background = "var(--bg-panel)";
      thead.style.zIndex = "1";
      
      const headerRow = document.createElement("tr");
      const headers = ["Rate Lookup", "Employee ID", "Name", "Job Level", "Role", "Lvl3"];
      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.padding = "8px 6px";
        th.style.textAlign = "left";
        th.style.borderBottom = "1px solid var(--border)";
        th.style.fontWeight = "600";
        th.style.color = "var(--text-muted)";
        th.style.whiteSpace = "nowrap";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body rows (CSV columns only)
      const tbody = document.createElement("tbody");
      importedEmployees.forEach((emp, idx) => {
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid var(--border-muted)";
        if (idx % 2 === 1) {
          row.style.background = "var(--bg-hover)";
        }

        const cells = [
          emp.costRateId || "",
          emp.employeeId || "",
          emp.name || "",
          emp.jobLevel || "",
          emp.role || "",
          emp.lvl3Id || ""
        ];

        cells.forEach(cellText => {
          const td = document.createElement("td");
          td.textContent = cellText;
          td.style.padding = "6px";
          td.style.whiteSpace = "nowrap";
          td.style.overflow = "hidden";
          td.style.textOverflow = "ellipsis";
          td.style.maxWidth = "150px";
          row.appendChild(td);
        });

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      employeeSection.appendChild(tableContainer);
      container.appendChild(employeeSection);
    }

    function buildSellRatesInputs(columns, existingSellRates) {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.gap = "8px";

      const inputs = {};

      columns.forEach(col => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 1fr 1fr";
        row.style.gap = "6px";

        const label = document.createElement("div");
        label.textContent = col.label;

        const reg = document.createElement("input");
        reg.type = "number";
        reg.step = "0.01";
        reg.placeholder = "Sell Reg";
        reg.value = existingSellRates && existingSellRates[col.id] ? existingSellRates[col.id].regular : "";
        reg.style.padding = "6px";
        reg.style.border = "1px solid var(--border)";
        reg.style.borderRadius = "4px";
        reg.style.background = "var(--bg)";
        reg.style.color = "var(--text)";

        const ot = document.createElement("input");
        ot.type = "number";
        ot.step = "0.01";
        ot.placeholder = "Sell OT";
        ot.value = existingSellRates && existingSellRates[col.id] ? existingSellRates[col.id].ot : "";
        ot.style.padding = "6px";
        ot.style.border = "1px solid var(--border)";
        ot.style.borderRadius = "4px";
        ot.style.background = "var(--bg)";
        ot.style.color = "var(--text)";

        inputs[col.id] = { reg, ot };

        row.appendChild(label);
        row.appendChild(reg);
        row.appendChild(ot);
        wrapper.appendChild(row);
      });

      return { wrapper, inputs };
    }

    function showAddJobLevelDialog(onSuccess) {
      Modal.open({
        title: "Add Job Level",
        content: (formContainer) => {
          const columns = RateColumns.getAllColumns();

          const labelInput = document.createElement("input");
          labelInput.placeholder = "Job Level Label";
          labelInput.style.padding = "6px";
          labelInput.style.border = "1px solid var(--border)";
          labelInput.style.borderRadius = "4px";
          labelInput.style.background = "var(--bg)";
          labelInput.style.color = "var(--text)";
          labelInput.style.width = "100%";

          const costRegInput = document.createElement("input");
          costRegInput.type = "number";
          costRegInput.step = "0.01";
          costRegInput.placeholder = "Cost Reg";
          costRegInput.style.padding = "6px";
          costRegInput.style.border = "1px solid var(--border)";
          costRegInput.style.borderRadius = "4px";
          costRegInput.style.background = "var(--bg)";
          costRegInput.style.color = "var(--text)";

          const costOTInput = document.createElement("input");
          costOTInput.type = "number";
          costOTInput.step = "0.01";
          costOTInput.placeholder = "Cost OT";
          costOTInput.style.padding = "6px";
          costOTInput.style.border = "1px solid var(--border)";
          costOTInput.style.borderRadius = "4px";
          costOTInput.style.background = "var(--bg)";
          costOTInput.style.color = "var(--text)";

          const costsRow = document.createElement("div");
          costsRow.style.display = "grid";
          costsRow.style.gridTemplateColumns = "1fr 1fr";
          costsRow.style.gap = "8px";

          costsRow.appendChild(costRegInput);
          costsRow.appendChild(costOTInput);

          const sellRates = buildSellRatesInputs(columns);

          formContainer.appendChild(labelInput);
          formContainer.appendChild(costsRow);
          formContainer.appendChild(document.createElement("hr"));
          formContainer.appendChild(sellRates.wrapper);

          formContainer._rateInputs = { labelInput, costRegInput, costOTInput, sellRates };
        },
        onSave: () => {
          const { labelInput, costRegInput, costOTInput, sellRates } = document.querySelector(".modal-body")._rateInputs || {};
          if (!labelInput || !labelInput.value.trim()) return;

          const sellRatesMap = {};
          Object.keys(sellRates.inputs).forEach(colId => {
            const regVal = parseFloat(sellRates.inputs[colId].reg.value) || 0;
            const otVal = parseFloat(sellRates.inputs[colId].ot.value) || 0;
            sellRatesMap[colId] = { regular: regVal, ot: otVal };
          });

          JobLevels.addCustomLevel(
            labelInput.value.trim(),
            costRegInput.value,
            costOTInput.value,
            sellRatesMap
          );
          Modal.close();
          if (onSuccess) onSuccess();
          else showRateScheduleDialog();
        }
      });
    }

    function showEditJobLevelDialog(level) {
      Modal.open({
        title: "Edit Job Level",
        content: (formContainer) => {
          const columns = RateColumns.getAllColumns();

          const labelInput = document.createElement("input");
          labelInput.value = level.label;
          labelInput.style.padding = "6px";
          labelInput.style.border = "1px solid var(--border)";
          labelInput.style.borderRadius = "4px";
          labelInput.style.background = "var(--bg)";
          labelInput.style.color = "var(--text)";
          labelInput.style.width = "100%";

          const costRegInput = document.createElement("input");
          costRegInput.type = "number";
          costRegInput.step = "0.01";
          costRegInput.value = level.costRegular;
          costRegInput.style.padding = "6px";
          costRegInput.style.border = "1px solid var(--border)";
          costRegInput.style.borderRadius = "4px";
          costRegInput.style.background = "var(--bg)";
          costRegInput.style.color = "var(--text)";

          const costOTInput = document.createElement("input");
          costOTInput.type = "number";
          costOTInput.step = "0.01";
          costOTInput.value = level.costOT;
          costOTInput.style.padding = "6px";
          costOTInput.style.border = "1px solid var(--border)";
          costOTInput.style.borderRadius = "4px";
          costOTInput.style.background = "var(--bg)";
          costOTInput.style.color = "var(--text)";

          const costsRow = document.createElement("div");
          costsRow.style.display = "grid";
          costsRow.style.gridTemplateColumns = "1fr 1fr";
          costsRow.style.gap = "8px";
          costsRow.appendChild(costRegInput);
          costsRow.appendChild(costOTInput);

          const sellRates = buildSellRatesInputs(columns, level.sellRates || { standard: { regular: level.sellRegular || 0, ot: level.sellOT || 0 } });

          formContainer.appendChild(labelInput);
          formContainer.appendChild(costsRow);
          formContainer.appendChild(document.createElement("hr"));
          formContainer.appendChild(sellRates.wrapper);

          formContainer._rateInputs = { labelInput, costRegInput, costOTInput, sellRates };
        },
        onSave: () => {
          const { labelInput, costRegInput, costOTInput, sellRates } = document.querySelector(".modal-body")._rateInputs || {};
          if (!labelInput || !labelInput.value.trim()) return;

          const sellRatesMap = {};
          Object.keys(sellRates.inputs).forEach(colId => {
            const regVal = parseFloat(sellRates.inputs[colId].reg.value) || 0;
            const otVal = parseFloat(sellRates.inputs[colId].ot.value) || 0;
            sellRatesMap[colId] = { regular: regVal, ot: otVal };
          });

          JobLevels.updateCustomLevel(
            level.id,
            labelInput.value.trim(),
            costRegInput.value,
            costOTInput.value,
            sellRatesMap
          );
          Modal.close();
          showRateScheduleDialog();
        }
      });
    }

    function showAddResourceDialog() {
      Modal.open({
        title: "Add Custom Resource",
        content: (formContainer) => {
          JobLevels.getAllLevels().then(levels => {
            const levelOptions = levels.map(l => `<option value="${l.id}">${l.label}</option>`).join("");
            
            formContainer.innerHTML = `
              <div style="display: grid; grid-template-columns: 1fr; gap: 12px; padding: 12px 0;">
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Label</label>
                  <input type="text" id="resourceLabel" placeholder="e.g., John Smith" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Job Level</label>
                <select id="jobLevel" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;">
                  <option value="">-- Select Job Level --</option>
                  ${levelOptions}
                </select>
              </div>
              <div style="padding: 10px; background: var(--bg-hover); border-radius: 4px; font-size: 11px; color: var(--text-muted);">
                <strong>Rate Overrides (leave blank to use Job Level defaults)</strong>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Cost Reg ($/hr)</label>
                  <input type="number" id="costReg" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Cost OT ($/hr)</label>
                  <input type="number" id="costOT" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Sell Reg ($/hr)</label>
                  <input type="number" id="sellReg" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Sell OT ($/hr)</label>
                  <input type="number" id="sellOT" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
              </div>
            </div>
          `;
          });
        },
        onSave: () => {
          const label = document.getElementById("resourceLabel").value.trim();
          const jobLevelId = document.getElementById("jobLevel").value;
          const costReg = document.getElementById("costReg").value;
          const costOT = document.getElementById("costOT").value;
          const sellReg = document.getElementById("sellReg").value;
          const sellOT = document.getElementById("sellOT").value;

          if (!label) {
            alert("Label is required");
            return;
          }
          if (!jobLevelId) {
            alert("Job Level is required");
            return;
          }

          addCustomResource(label, jobLevelId, costReg, costOT, sellReg, sellOT);
          Modal.close();
          renderManager(container);
        }
      });
    }

    async function renderResourceSection(title, resources, editable) {
      const section = document.createElement("div");
      section.style.padding = "0 12px";

      const heading = document.createElement("h3");
      heading.style.margin = "0 0 8px 0";
      heading.style.fontSize = "12px";
      heading.style.textTransform = "uppercase";
      heading.style.color = "var(--text-muted)";
      heading.textContent = title;
      section.appendChild(heading);


      table = document.createElement("div");
      table.style.display = "grid";
      // Add Province column after Label
      table.style.gridTemplateColumns = editable ? "2fr 0.8fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr auto" : "2fr 0.8fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr";
      table.style.gap = "4px";
      table.style.fontSize = "11px";

      // Header
      const headerRow = document.createElement("div");
      headerRow.style.display = "contents";
      headerRow.style.fontWeight = "600";
      headerRow.style.color = "var(--text-muted)";

      const headers = ["Label", "Province", "Job Level", "Cost Reg", "Cost OT", "Sell Reg", "Sell OT"];
      if (editable) headers.push("Actions");

      headers.forEach(h => {
        const cell = document.createElement("div");
        cell.textContent = h;
        cell.style.padding = "6px";
        cell.style.borderBottom = "1px solid var(--border)";
        headerRow.appendChild(cell);
      });

      table.appendChild(headerRow);

      // Data rows
      for (const resource of resources) {


        // Use Province for rate mapping (default NB if not set)
        const province = resource.province || resource.location || "NB";
        // Pass province as location to Rates.resolveRates
        const resourceWithProv = { ...resource, location: province };
        let resolvedRates = { costRegular: '-', costOT: '-', sellRegular: '-', sellOT: '-' };
        try {
          resolvedRates = await Rates.resolveRates(resourceWithProv) || resolvedRates;
        } catch (e) {
          // fallback: leave as '-'
        }

        const label = document.createElement("div");
        label.textContent = resource.label || resource.name;
        label.style.padding = "6px";
        table.appendChild(label);

        // Province cell
        const provCell = document.createElement("div");
        provCell.textContent = province;
        provCell.style.padding = "6px";
        provCell.style.textAlign = "center";
        table.appendChild(provCell);

        // Show job level label if available
        let jobLevelLabel = resource.jobLevel || resource.jobLevelId || "-";
        const jobLevel = await JobLevels.getLevelById(resource.jobLevel || resource.jobLevelId);
        if (jobLevel && jobLevel.label) jobLevelLabel = jobLevel.label;
        const jl = document.createElement("div");
        jl.textContent = jobLevelLabel;
        jl.style.padding = "6px";
        jl.style.fontSize = "10px";
        jl.style.color = "var(--text)";
        table.appendChild(jl);

        const cr = document.createElement("div");
        cr.textContent = typeof resolvedRates.costRegular === "number" ? resolvedRates.costRegular.toFixed(2) : resolvedRates.costRegular;
        cr.style.padding = "6px";
        cr.style.textAlign = "right";
        table.appendChild(cr);

        const cot = document.createElement("div");
        cot.textContent = typeof resolvedRates.costOT === "number" ? resolvedRates.costOT.toFixed(2) : resolvedRates.costOT;
        cot.style.padding = "6px";
        cot.style.textAlign = "right";
        table.appendChild(cot);

        const sr = document.createElement("div");
        sr.textContent = typeof resolvedRates.sellRegular === "number" ? resolvedRates.sellRegular.toFixed(2) : resolvedRates.sellRegular;
        sr.style.padding = "6px";
        sr.style.textAlign = "right";
        table.appendChild(sr);

        const sot = document.createElement("div");
        sot.textContent = typeof resolvedRates.sellOT === "number" ? resolvedRates.sellOT.toFixed(2) : resolvedRates.sellOT;
        sot.style.padding = "6px";
        sot.style.textAlign = "right";
        table.appendChild(sot);

        if (editable && resource.type === "custom") {
          const actions = document.createElement("div");
          actions.style.padding = "6px";
          actions.style.display = "flex";
          actions.style.gap = "4px";

          const editBtn = document.createElement("button");
          editBtn.className = "btn";
          editBtn.textContent = "Edit";
          editBtn.style.padding = "2px 8px";
          editBtn.style.fontSize = "10px";
          editBtn.addEventListener("click", () => {
            showEditResourceDialog(resource);
          });
          actions.appendChild(editBtn);

          const delBtn = document.createElement("button");
          delBtn.className = "btn";
          delBtn.textContent = "Delete";
          delBtn.style.padding = "2px 8px";
          delBtn.style.fontSize = "10px";
          delBtn.addEventListener("click", () => {
            if (confirm(`Delete "${resource.label}"?`)) {
              deleteCustomResource(resource.id);
              renderManager(container);
            }
          });
          actions.appendChild(delBtn);

          table.appendChild(actions);
        }
      }

      section.appendChild(table);
      return section;
    }

    function showEditResourceDialog(resource) {
      Modal.open({
        title: "Edit Resource",
        content: (formContainer) => {
          JobLevels.getAllLevels().then(levels => {
            const levelOptions = levels.map(l => `<option value="${l.id}" ${l.id === resource.jobLevelId ? "selected" : ""}>${l.label}</option>`).join("");
            
            formContainer.innerHTML = `
              <div style="display: grid; grid-template-columns: 1fr; gap: 12px; padding: 12px 0;">
                <div>
                <label style="font-size: 12px; color: var(--text-muted);">Label</label>
                <input type="text" id="resourceLabel" value="${resource.label}" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
              </div>
              <div>
                <label style="font-size: 12px; color: var(--text-muted);">Job Level</label>
                <select id="jobLevel" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;">
                  <option value="">-- Select Job Level --</option>
                  ${levelOptions}
                </select>
              </div>
              <div style="padding: 10px; background: var(--bg-hover); border-radius: 4px; font-size: 11px; color: var(--text-muted);">
                <strong>Rate Overrides (leave blank to use Job Level defaults)</strong>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Cost Reg ($/hr)</label>
                  <input type="number" id="costReg" value="${resource.costRegOverride !== null ? resource.costRegOverride : ""}" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Cost OT ($/hr)</label>
                  <input type="number" id="costOT" value="${resource.costOTOverride !== null ? resource.costOTOverride : ""}" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Sell Reg ($/hr)</label>
                  <input type="number" id="sellReg" value="${resource.sellRegOverride !== null ? resource.sellRegOverride : ""}" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
                <div>
                  <label style="font-size: 12px; color: var(--text-muted);">Sell OT ($/hr)</label>
                  <input type="number" id="sellOT" value="${resource.sellOTOverride !== null ? resource.sellOTOverride : ""}" placeholder="auto" step="0.01" style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); box-sizing: border-box;" />
                </div>
              </div>
            </div>
          `;
          });
        },
        onSave: () => {
          const label = document.getElementById("resourceLabel").value.trim();
          const jobLevelId = document.getElementById("jobLevel").value;
          const costReg = document.getElementById("costReg").value;
          const costOT = document.getElementById("costOT").value;
          const sellReg = document.getElementById("sellReg").value;
          const sellOT = document.getElementById("sellOT").value;

          if (!label) {
            alert("Label is required");
            return;
          }
          if (!jobLevelId) {
            alert("Job Level is required");
            return;
          }

          updateCustomResource(resource.id, label, jobLevelId, costReg, costOT, sellReg, sellOT);
          Modal.close();
          renderManager(container);
        }
      });
    }
  }

  async function parseNamedResourcesCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.trim().split('\n');
          if (lines.length < 2) {
            reject(new Error("CSV must have header row and at least one data row"));
            return;
          }

          // Parse header
          const header = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Find column indices (case-insensitive, flexible matching)
          const findColumn = (pattern) => header.findIndex(h => h.includes(pattern.toLowerCase()));
          
          const nameIdx = findColumn('name');
          const empIdIdx = findColumn('employee');
          const jobLevelIdx = findColumn('job level');
          const blIdx = findColumn('business line');
          const ccIdx = findColumn('cost center');
          const mgridx = findColumn('manager');
          const locIdx = findColumn('location');
          const jtIdx = findColumn('job title');
          const bctIdx = findColumn('business card');

          if (nameIdx === -1) {
            reject(new Error("CSV must have 'Name' column"));
            return;
          }
          if (jobLevelIdx === -1) {
            reject(new Error("CSV must have 'Job Level' column"));
            return;
          }

          // Parse data rows
          const resources = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // skip empty lines

            const cols = line.split(',').map(c => c.trim());
            const name = cols[nameIdx];
            if (!name) continue; // skip rows without name

            const resource = {
              id: "imported-" + crypto.randomUUID(),
              name: name,
              employeeId: empIdIdx >= 0 ? cols[empIdIdx] : "",
              jobLevel: jobLevelIdx >= 0 ? cols[jobLevelIdx] : "",
              businessLine: blIdx >= 0 ? cols[blIdx] : "",
              costCenter: ccIdx >= 0 ? cols[ccIdx] : "",
              manager: mgridx >= 0 ? cols[mgridx] : "",
              locations: locIdx >= 0 ? cols[locIdx] : "",
              jobTitle: jtIdx >= 0 ? cols[jtIdx] : "",
              businessCardTitle: bctIdx >= 0 ? cols[bctIdx] : "",
              type: "named"
            };
            resources.push(resource);
          }

          resolve(resources);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  return {
    getCustomResources,
    addCustomResource,
    updateCustomResource,
    deleteCustomResource,
    getAllResources,
    openManager,
    openRateScheduleManager,
    getImportedNamedResources,
    saveImportedNamedResources
  };
})();

console.log("✅ ResourceManager loaded");
