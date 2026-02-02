// Resource Manager — CRUD for labor resources with categories (standard/named/custom)

window.ResourceManager = (function () {
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

  async function renderManager(container) {
    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";

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
          tableMeta.style.gridTemplateColumns = "1.5fr 1fr 1fr 1fr";
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

          const tableProvInput = document.createElement("input");
          tableProvInput.placeholder = "Default Prov";
          tableProvInput.style.padding = "6px";
          tableProvInput.style.border = "1px solid var(--border)";
          tableProvInput.style.borderRadius = "4px";
          tableProvInput.style.background = "var(--bg)";
          tableProvInput.style.color = "var(--text)";

          tableMeta.appendChild(tableLabelInput);
          tableMeta.appendChild(tableDescInput);
          tableMeta.appendChild(tableBLInput);
          tableMeta.appendChild(tableProvInput);

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
              tableProvInput.value = table.defaultProv || "";

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

            // Rate column headers
            rateColumns.forEach((col, idx) => {
              const colHeader = document.createElement("div");
              colHeader.textContent = col.label;
              colHeader.style.textAlign = "center";
              colHeader.style.gridColumn = `${4 + idx * 2} / span 2`;
              if (idx % 2 === 1) {
                colHeader.style.background = "rgba(96, 165, 250, 0.08)";
              }
              headerRowPrimary.appendChild(colHeader);
            });

            gridContainer.appendChild(headerRowPrimary);

            // Create secondary header row (Reg/OT sub-headers)
            const headerRowSecondary = document.createElement("div");
            headerRowSecondary.style.display = "grid";
            headerRowSecondary.style.gridTemplateColumns = `280px ${"1fr ".repeat(2 + rateColumns.length * 2).trim()}`;
            headerRowSecondary.style.gap = "0";
            headerRowSecondary.style.alignItems = "center";
            headerRowSecondary.style.background = "var(--bg)";
            headerRowSecondary.style.borderBottom = "2px solid var(--border)";
            headerRowSecondary.style.fontWeight = "500";
            headerRowSecondary.style.fontSize = "10px";
            headerRowSecondary.style.color = "var(--text-muted)";
            headerRowSecondary.style.padding = "4px 6px";
            headerRowSecondary.style.position = "sticky";
            headerRowSecondary.style.top = "28px";
            headerRowSecondary.style.zIndex = "10";

            const spacerSecondary = document.createElement("div");
            headerRowSecondary.appendChild(spacerSecondary);

            const costRegSub = document.createElement("div");
            costRegSub.textContent = "Reg";
            costRegSub.style.textAlign = "right";
            costRegSub.style.paddingRight = "6px";
            costRegSub.style.background = "rgba(96, 165, 250, 0.18)";
            headerRowSecondary.appendChild(costRegSub);

            const costOTSub = document.createElement("div");
            costOTSub.textContent = "OT";
            costOTSub.style.textAlign = "right";
            costOTSub.style.paddingRight = "6px";
            costOTSub.style.background = "rgba(96, 165, 250, 0.18)";
            headerRowSecondary.appendChild(costOTSub);

            rateColumns.forEach((col, idx) => {
              const regSubHeader = document.createElement("div");
              regSubHeader.textContent = "Reg";
              regSubHeader.style.textAlign = "right";
              regSubHeader.style.paddingRight = "6px";
              if (idx % 2 === 1) {
                regSubHeader.style.background = "rgba(96, 165, 250, 0.18)";
              }
              headerRowSecondary.appendChild(regSubHeader);

              const otSubHeader = document.createElement("div");
              otSubHeader.textContent = "OT";
              otSubHeader.style.textAlign = "right";
              otSubHeader.style.paddingRight = "6px";
              if (idx % 2 === 1) {
                otSubHeader.style.background = "rgba(96, 165, 250, 0.18)";
              }
              headerRowSecondary.appendChild(otSubHeader);
            });

            gridContainer.appendChild(headerRowSecondary);

            // Render grid rows for each rate code (generic job level)
            rateCodes.forEach((rateCode, codeIdx) => {
              const row = document.createElement("div");
              row.style.display = "grid";
              row.style.gridTemplateColumns = `280px ${"1fr ".repeat(2 + rateColumns.length * 2).trim()}`;
              row.style.gap = "0";
              row.style.alignItems = "stretch";
              row.style.background = codeIdx % 2 === 0 ? "var(--bg-panel)" : "rgba(0,0,0,0.15)";
              row.style.borderBottom = "1px solid var(--border-muted)";
              row.style.cursor = "move";
              row.style.transition = "opacity 0.15s";
              row.dataset.rateCode = rateCode;
              row.draggable = true;

              // Drag handlers
              row.addEventListener("dragstart", (e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", rateCode);
                row.style.opacity = "0.5";
              });

              row.addEventListener("dragend", (e) => {
                row.style.opacity = "1";
              });

              row.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                row.style.borderTop = "2px solid var(--accent)";
              });

              row.addEventListener("dragleave", (e) => {
                if (!row.contains(e.relatedTarget)) {
                  row.style.borderTop = "";
                }
              });

              row.addEventListener("drop", async (e) => {
                e.preventDefault();
                row.style.borderTop = "";
                const draggedCode = e.dataTransfer.getData("text/plain");
                console.log("🎯 Drop:", draggedCode, "onto", rateCode);
                if (draggedCode === rateCode) return;
                
                const draggedIdx = rateCodes.indexOf(draggedCode);
                const targetIdx = rateCodes.indexOf(rateCode);
                console.log("Indices:", draggedIdx, "→", targetIdx);
                
                if (draggedIdx === -1 || targetIdx === -1) return;
                
                // Remove the dragged item
                const [moved] = rateCodes.splice(draggedIdx, 1);
                
                // Calculate new insertion index
                // If dragging downward (draggedIdx < targetIdx), target shifts back by 1 after removal
                const insertIdx = draggedIdx < targetIdx ? targetIdx - 1 : targetIdx;
                rateCodes.splice(insertIdx, 0, moved);
                
                console.log("New order:", rateCodes);
                
                // Store the custom order in the table
                currentTable.customOrder = [...rateCodes];
                
                // Rebuild the currentTable.rates object in the new order
                const newRates = {};
                rateCodes.forEach(code => {
                  newRates[code] = currentTable.rates[code];
                });
                currentTable.rates = newRates;
                console.log("Updated table rates keys:", Object.keys(currentTable.rates));
                
                // Re-render with the modified table
                renderTableEditor(currentTable);
              });

              // Job level code cell
              const nameCell = document.createElement("div");
              nameCell.style.padding = "6px";
              nameCell.style.fontSize = "12px";
              nameCell.style.fontWeight = "600";
              nameCell.style.color = "var(--text)";
              nameCell.style.overflow = "hidden";
              nameCell.style.textOverflow = "ellipsis";
              nameCell.style.whiteSpace = "nowrap";
              nameCell.style.minWidth = "0";
              
              // Display code + label (e.g., "L3 - Level 3 Manager")
              const jobLabel = codeToLabel[rateCode] || rateCode;
              const displayText = jobLabel !== rateCode ? `${rateCode} - ${jobLabel}` : rateCode;
              nameCell.textContent = displayText;
              nameCell.title = displayText;
              row.appendChild(nameCell);

              // Get the rate entry for this code
              const rateEntry = table.rates[rateCode] || {};

              // Cost Reg input
              const costRegInput = document.createElement("input");
              costRegInput.type = "text";
              costRegInput.dataset.rateCode = rateCode;
              costRegInput.dataset.type = "costReg";
              costRegInput.value = rateEntry.cost?.reg ? rateEntry.cost.reg.toString() : "";
              costRegInput.placeholder = "0";
              costRegInput.style.width = "100%";
              costRegInput.style.maxWidth = "100%";
              costRegInput.style.minWidth = "0";
              costRegInput.style.padding = "4px 6px";
              costRegInput.style.margin = "2px 1px";
              costRegInput.style.fontSize = "12px";
              costRegInput.style.border = "1px solid var(--border-muted)";
              costRegInput.style.borderRadius = "999px";
              costRegInput.style.background = "rgba(255,255,255,0.02)";
              costRegInput.style.color = "var(--text)";
              costRegInput.style.fontVariantNumeric = "tabular-nums";
              costRegInput.style.textAlign = "right";
              costRegInput.style.boxSizing = "border-box";
              costRegInput.style.background = "rgba(96, 165, 250, 0.18)";

              // Cost OT input
              const costOTInput = document.createElement("input");
              costOTInput.type = "text";
              costOTInput.dataset.rateCode = rateCode;
              costOTInput.dataset.type = "costOT";
              costOTInput.value = rateEntry.cost?.ot ? rateEntry.cost.ot.toString() : "";
              costOTInput.placeholder = "0";
              costOTInput.style.width = "100%";
              costOTInput.style.maxWidth = "100%";
              costOTInput.style.minWidth = "0";
              costOTInput.style.padding = "4px 6px";
              costOTInput.style.margin = "2px 1px";
              costOTInput.style.fontSize = "12px";
              costOTInput.style.border = "1px solid var(--border-muted)";
              costOTInput.style.borderRadius = "999px";
              costOTInput.style.background = "rgba(96, 165, 250, 0.18)";
              costOTInput.style.color = "var(--text)";
              costOTInput.style.fontVariantNumeric = "tabular-nums";
              costOTInput.style.textAlign = "right";
              costOTInput.style.boxSizing = "border-box";

              row.appendChild(costRegInput);
              row.appendChild(costOTInput);
              allInputs.push(costRegInput);
              allInputs.push(costOTInput);

              // Sell inputs per column
              rateColumns.forEach((col, colIdx) => {
                const sellRegInput = document.createElement("input");
                sellRegInput.type = "text";
                sellRegInput.dataset.rateCode = rateCode;
                sellRegInput.dataset.columnId = col.id;
                sellRegInput.dataset.type = "sellReg";
                sellRegInput.value = rateEntry[col.id]?.reg ? rateEntry[col.id].reg.toString() : "";
                sellRegInput.placeholder = "0";
                sellRegInput.style.width = "100%";
                sellRegInput.style.maxWidth = "100%";
                sellRegInput.style.minWidth = "0";
                sellRegInput.style.padding = "4px 6px";
                sellRegInput.style.margin = "2px 1px";
                sellRegInput.style.fontSize = "12px";
                sellRegInput.style.border = "1px solid var(--border-muted)";
                sellRegInput.style.borderRadius = "999px";
                sellRegInput.style.background = "rgba(255,255,255,0.02)";
                sellRegInput.style.color = "var(--text)";
                sellRegInput.style.fontVariantNumeric = "tabular-nums";
                sellRegInput.style.textAlign = "right";
                sellRegInput.style.boxSizing = "border-box";
                if (colIdx % 2 === 1) {
                  sellRegInput.style.background = "rgba(96, 165, 250, 0.18)";
                }

                const sellOTInput = document.createElement("input");
                sellOTInput.type = "text";
                sellOTInput.dataset.rateCode = rateCode;
                sellOTInput.dataset.columnId = col.id;
                sellOTInput.dataset.type = "sellOT";
                sellOTInput.value = rateEntry[col.id]?.ot ? rateEntry[col.id].ot.toString() : "";
                sellOTInput.placeholder = "0";
                sellOTInput.style.width = "100%";
                sellOTInput.style.maxWidth = "100%";
                sellOTInput.style.minWidth = "0";
                sellOTInput.style.padding = "4px 6px";
                sellOTInput.style.margin = "2px 1px";
                sellOTInput.style.fontSize = "12px";
                sellOTInput.style.border = "1px solid var(--border-muted)";
                sellOTInput.style.borderRadius = "999px";
                sellOTInput.style.background = "rgba(255,255,255,0.02)";
                sellOTInput.style.color = "var(--text)";
                sellOTInput.style.fontVariantNumeric = "tabular-nums";
                sellOTInput.style.textAlign = "right";
                sellOTInput.style.boxSizing = "border-box";
                if (colIdx % 2 === 1) {
                  sellOTInput.style.background = "rgba(96, 165, 250, 0.18)";
                }

                row.appendChild(sellRegInput);
                row.appendChild(sellOTInput);
                allInputs.push(sellRegInput);
                allInputs.push(sellOTInput);
              });

              // Event handlers for all inputs in this row
              const saveRow = () => {
                const updated = {
                  cost: {
                    reg: parseFloat(costRegInput.value) || 0,
                    ot: parseFloat(costOTInput.value) || 0
                  }
                };
                rateColumns.forEach(col => {
                  const regVal = row.querySelector(`input[data-column-id="${col.id}"][data-type="sellReg"]`);
                  const otVal = row.querySelector(`input[data-column-id="${col.id}"][data-type="sellOT"]`);
                  updated[col.id] = {
                    reg: parseFloat(regVal.value) || 0,
                    ot: parseFloat(otVal.value) || 0
                  };
                });
                if (table.type === "custom") {
                  RateTables.updateTableRates(table.id, rateCode, updated);
                }
              };

              [costRegInput, costOTInput].forEach(input => {
                input.addEventListener("focus", () => {
                  input.select();
                  row.style.background = "rgba(56, 189, 248, 0.12)";
                  row.style.boxShadow = "inset 0 0 0 1px rgba(56, 189, 248, 0.28)";
                  input.style.borderColor = "var(--accent)";
                  input.style.background = "var(--bg-hover)";
                });

                input.addEventListener("blur", () => {
                  row.style.background = "";
                  row.style.boxShadow = "";
                  input.style.borderColor = "var(--border-muted)";
                  input.style.background = "rgba(255,255,255,0.02)";
                  
                  const raw = input.value.replace(/[^0-9.-]/g, "");
                  const num = raw === "" ? 0 : Number(raw);
                  if (Number.isFinite(num)) {
                    input.value = num === 0 ? "" : num.toString();
                  }
                  saveRow();
                });

                input.addEventListener("keydown", (e) => {
                  const key = e.key;
                  if (key === "Tab" || key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowDown") {
                    e.preventDefault();
                    const currentIndex = allInputs.indexOf(input);
                    if (currentIndex === -1) return;

                    let nextIndex = currentIndex;
                    const inputsPerRow = 2 + (rateColumns.length * 2);

                    if (key === "Tab" || key === "ArrowRight") {
                      nextIndex = currentIndex + 1;
                    } else if (key === "ArrowLeft") {
                      nextIndex = currentIndex - 1;
                    } else if (key === "ArrowDown") {
                      nextIndex = currentIndex + inputsPerRow;
                    } else if (key === "ArrowUp") {
                      nextIndex = currentIndex - inputsPerRow;
                    }

                    if (nextIndex >= 0 && nextIndex < allInputs.length) {
                      allInputs[nextIndex].focus();
                    }
                  }
                });
              });

              rateColumns.forEach(col => {
                const regInput = row.querySelector(`input[data-column-id="${col.id}"][data-type="sellReg"]`);
                const otInput = row.querySelector(`input[data-column-id="${col.id}"][data-type="sellOT"]`);

                [regInput, otInput].forEach(input => {
                  input.addEventListener("focus", () => {
                    input.select();
                    row.style.background = "rgba(56, 189, 248, 0.12)";
                    row.style.boxShadow = "inset 0 0 0 1px rgba(56, 189, 248, 0.28)";
                    input.style.borderColor = "var(--accent)";
                    input.style.background = "var(--bg-hover)";
                  });

                  input.addEventListener("blur", () => {
                    row.style.background = "";
                    row.style.boxShadow = "";
                    input.style.borderColor = "var(--border-muted)";
                    input.style.background = col.id && rateColumns.findIndex(c => c.id === col.id) % 2 === 1 ? "rgba(96, 165, 250, 0.08)" : "rgba(255,255,255,0.02)";
                    
                    const raw = input.value.replace(/[^0-9.-]/g, "");
                    const num = raw === "" ? 0 : Number(raw);
                    if (Number.isFinite(num)) {
                      input.value = num === 0 ? "" : num.toString();
                    }
                    saveRow();
                  });

                  input.addEventListener("keydown", (e) => {
                    const key = e.key;
                    if (key === "Tab" || key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowDown") {
                      e.preventDefault();
                      const currentIndex = allInputs.indexOf(input);
                      if (currentIndex === -1) return;

                      let nextIndex = currentIndex;
                      const inputsPerRow = 2 + (rateColumns.length * 2);

                      if (key === "Tab" || key === "ArrowRight") {
                        nextIndex = currentIndex + 1;
                      } else if (key === "ArrowLeft") {
                        nextIndex = currentIndex - 1;
                      } else if (key === "ArrowDown") {
                        nextIndex = currentIndex + inputsPerRow;
                      } else if (key === "ArrowUp") {
                        nextIndex = currentIndex - inputsPerRow;
                      }

                      if (nextIndex >= 0 && nextIndex < allInputs.length) {
                        allInputs[nextIndex].focus();
                      }
                    }
                  });
                });
              });

              gridContainer.appendChild(row);
            });

            if (pendingRenameLevelId) {
              const pendingRow = gridContainer.querySelector(`[data-level-id="${pendingRenameLevelId}"]`);
              if (pendingRow) {
                const pendingNameCell = pendingRow.children[0];
                pendingRenameLevelId = null;
                if (pendingNameCell) {
                  pendingNameCell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
                }
              } else {
                pendingRenameLevelId = null;
              }
            }

            tableGridWrapper.appendChild(gridContainer);
            }); // End of async getTableById promise
          }

          async function updateTableMeta() {
            const table = await RateTables.getTableById(selectedTableId);
            if (!table) return;
            RateTables.updateCustomTable(table.id, {
              label: tableLabelInput.value.trim(),
              description: tableDescInput.value.trim(),
              defaultBL: tableBLInput.value.trim(),
              defaultProv: tableProvInput.value.trim()
            });
          }

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
          tableProvInput.addEventListener("blur", updateTableMeta);

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
        onSave: () => {
          Modal.close();
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

    toolbar.appendChild(rateScheduleBtn);
    container.appendChild(toolbar);

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

      const table = document.createElement("div");
      table.style.display = "grid";
      table.style.gridTemplateColumns = editable ? "2fr 1.5fr 1fr 1fr 1fr 1fr auto" : "2fr 1.5fr 1fr 1fr 1fr 1fr";
      table.style.gap = "6px";
      table.style.fontSize = "11px";

      // Header
      const headerRow = document.createElement("div");
      headerRow.style.display = "contents";
      headerRow.style.fontWeight = "600";
      headerRow.style.color = "var(--text-muted)";

      const headers = ["Label", "Job Level", "Cost Reg", "Cost OT", "Sell Reg", "Sell OT"];
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
        const jobLevel = await JobLevels.getLevelById(resource.jobLevel || resource.jobLevelId);
        
        const costReg = resource.costRegOverride !== null ? resource.costRegOverride : (jobLevel ? jobLevel.costRegular : "-");
        const costOT = resource.costOTOverride !== null ? resource.costOTOverride : (jobLevel ? jobLevel.costOT : "-");
        
        // Get sell rates from job level using standard column (default)
        let sellReg = "-";
        let sellOT = "-";
        if (resource.sellRegOverride !== null) {
          sellReg = resource.sellRegOverride;
          sellOT = resource.sellOTOverride;
        } else if (jobLevel) {
          const sellRates = JobLevels.getSellRates(jobLevel.id, "standard");
          if (sellRates) {
            sellReg = sellRates.regular;
            sellOT = sellRates.ot;
          }
        }

        const label = document.createElement("div");
        label.textContent = resource.label || resource.name;
        label.style.padding = "6px";
        table.appendChild(label);

        const jl = document.createElement("div");
        jl.textContent = jobLevel ? jobLevel.label : (resource.jobLevel || resource.jobLevelId || "-");
        jl.style.padding = "6px";
        jl.style.fontSize = "10px";
        jl.style.color = "var(--text)";
        table.appendChild(jl);

        const cr = document.createElement("div");
        cr.textContent = typeof costReg === "number" ? costReg.toFixed(2) : costReg;
        cr.style.padding = "6px";
        cr.style.textAlign = "right";
        table.appendChild(cr);

        const cot = document.createElement("div");
        cot.textContent = typeof costOT === "number" ? costOT.toFixed(2) : costOT;
        cot.style.padding = "6px";
        cot.style.textAlign = "right";
        table.appendChild(cot);

        const sr = document.createElement("div");
        sr.textContent = typeof sellReg === "number" ? sellReg.toFixed(2) : sellReg;
        sr.style.padding = "6px";
        sr.style.textAlign = "right";
        table.appendChild(sr);

        const sot = document.createElement("div");
        sot.textContent = typeof sellOT === "number" ? sellOT.toFixed(2) : sellOT;
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
