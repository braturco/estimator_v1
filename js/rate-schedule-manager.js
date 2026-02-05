// Rate Schedule Manager - Create and edit labor rate tables
console.log("🔄 Loading rate-schedule-manager.js");

window.RateScheduleManager = (function () {
  function openManager() {
    console.log("RateScheduleManager.openManager() called");
    if (!window.Modal || typeof Modal.open !== "function") {
      alert("Modal system is not available.");
      return;
    }

    // Load job levels synchronously (fallback to hardcoded data)
    const jobLevels = [
      { id: "E1", code: "E1", label: "Vice President", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "L3", code: "L3", label: "Director", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "L2", code: "L2", label: "Snr. Manager", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "L1", code: "L1", label: "Manager", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P8", code: "P8", label: "Level 8 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P7", code: "P7", label: "Level 7 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P6", code: "P6", label: "Level 6 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P5", code: "P5", label: "Level 5 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P4", code: "P4", label: "Level 4 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P3", code: "P3", label: "Level 3 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P2", code: "P2", label: "Level 2 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P1", code: "P1", label: "Level 1 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "P0", code: "P0", label: "Level 0 Professional", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "T5", code: "T5", label: "Level 5 Tech", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "T4", code: "T4", label: "Level 4 Tech", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "T3", code: "T3", label: "Level 3 Tech", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "T2", code: "T2", label: "Level 2 Tech", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "T1", code: "T1", label: "Level 1 Tech", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "S4", code: "S4", label: "Level 4 Admin", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "S3", code: "S3", label: "Level 3 Admin", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "S2", code: "S2", label: "Level 2 Admin", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } },
      { id: "S1", code: "S1", label: "Level 1 Admin", costRegular: 0, costOT: 0, sellRates: { standard: { reg: 0, ot: 0 }, premium: { reg: 0, ot: 0 }, discount: { reg: 0, ot: 0 } } }
    ];

    Modal.open({
      title: "Rate Schedule Manager",
      content: (container) => renderManager(container, jobLevels),
      onSave: null,
      onClose: () => console.log("Rate Schedule Manager closed")
    });
  }

  function renderManager(container, jobLevels) {
    console.log("renderManager called with container:", container);
    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "16px";
    container.style.minHeight = "600px";

    // Instructions
    const instructions = document.createElement("div");
    instructions.style.fontSize = "12px";
    instructions.style.color = "var(--text-muted)";
    instructions.style.lineHeight = "1.5";
    instructions.style.marginBottom = "12px";
    instructions.innerHTML = `
      <strong>How to use:</strong><br>
      • Click "New Table" to create a rate table<br>
      • Select a location (province) to filter cost rates<br>
      • Define Regular and OT rates for Standard, Premium, and Discount rate sets<br>
      • Job levels are loaded from job-levels-basic.csv
    `;
    container.appendChild(instructions);

    // Tables list
    const tablesList = document.createElement("div");
    tablesList.style.display = "flex";
    tablesList.style.flexDirection = "column";
    tablesList.style.gap = "8px";
    container.appendChild(tablesList);

    // Load existing tables synchronously from localStorage
    let existingTables = [];
    try {
      const customTablesRaw = localStorage.getItem('estimator_custom_rate_tables_v1');
      if (customTablesRaw) {
        const allTables = JSON.parse(customTablesRaw);
        // Filter out factory tables (dummy data)
        const factoryIds = ['table-nb', 'table-on', 'table-bc', 'table-qc', 'table-ab'];
        existingTables = allTables.filter(table => !factoryIds.includes(table.id));
        
        // If we filtered out tables, save the cleaned list back
        if (existingTables.length !== allTables.length) {
          localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(existingTables));
          console.log("🧹 Filtered out", allTables.length - existingTables.length, "factory tables");
        }
      }
      
      // Clear any remaining factory tables (dummy data)
      localStorage.removeItem('estimator_factory_rate_tables_v1');
      
      console.log("Tables loaded:", existingTables.length);
    } catch (error) {
      console.error("Failed to load tables:", error);
      existingTables = [];
    }

    function renderTablesList() {
      tablesList.innerHTML = "";

      if (existingTables.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.style.padding = "40px 20px";
        emptyState.style.textAlign = "center";
        emptyState.style.color = "var(--text-muted)";
        emptyState.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No Rate Tables</div>
          <div style="font-size: 14px;">Create your first rate table to get started</div>
        `;
        tablesList.appendChild(emptyState);
      } else {
        existingTables.forEach((table, index) => {
          const tableCard = document.createElement("div");
          tableCard.style.border = "1px solid var(--border)";
          tableCard.style.borderRadius = "8px";
          tableCard.style.padding = "16px";
          tableCard.style.background = "var(--bg-panel)";
          tableCard.style.cursor = "pointer";
          tableCard.addEventListener("click", () => {
            console.log("Table card clicked for table:", table.label);
            // Open table editor
            console.log("Opening modal for editing table:", table.label);
            Modal.open({
              title: `Edit Rate Table: ${table.label}`,
              content: (editorContainer) => renderTableEditor(editorContainer, table, jobLevels),
              onSave: (editorContainer) => {
                const formData = editorContainer._formData;
                if (!formData) return;

                // Collect current input values
                const inputValues = Array.from(editorContainer._rateInputs).map(input => parseFloat(input.value) || 0);
                let inputIndex = 0;
                jobLevels.forEach(level => {
                  if (!formData.rates) formData.rates = {};
                  formData.rates[level.code] = {
                    cost: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    standard: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    premium: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    discount: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] }
                  };
                });

                // Update existing table
                Object.assign(table, formData);

                // Save to storage (only for custom tables - factory tables are read-only)
                if (!table.id.startsWith('table-') || existingTables.find(t => t.id === table.id && t !== table)) {
                  // This is a factory table or duplicate, don't save
                  console.log("Not saving factory table:", table.id);
                } else {
                  // Save custom tables
                  const customTables = existingTables.filter(t => t.id.startsWith('table-'));
                  localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(customTables));
                }

                renderTablesList();
                Modal.close();
              }
            });
          });

          const tableHeader = document.createElement("div");
          tableHeader.style.display = "flex";
          tableHeader.style.justifyContent = "space-between";
          tableHeader.style.alignItems = "center";
          tableHeader.style.marginBottom = "8px";

          const tableTitle = document.createElement("div");
          tableTitle.style.fontSize = "16px";
          tableTitle.style.fontWeight = "600";
          tableTitle.textContent = table.label || "Untitled Table";
          tableHeader.appendChild(tableTitle);

          const tableActions = document.createElement("div");
          tableActions.style.display = "flex";
          tableActions.style.gap = "8px";

          const editBtn = document.createElement("button");
          editBtn.className = "btn btn-secondary";
          editBtn.textContent = "Edit";
          editBtn.style.fontSize = "11px";
          editBtn.style.padding = "4px 8px";
          editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Open table editor
            Modal.open({
              title: `Edit Rate Table: ${table.label}`,
              content: (editorContainer) => renderTableEditor(editorContainer, table, jobLevels),
              onSave: (editorContainer) => {
                const formData = editorContainer._formData;
                if (!formData) return;

                // Collect current input values
                const inputValues = Array.from(editorContainer._rateInputs).map(input => parseFloat(input.value) || 0);
                let inputIndex = 0;
                jobLevels.forEach(level => {
                  if (!formData.rates) formData.rates = {};
                  formData.rates[level.code] = {
                    cost: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    standard: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    premium: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                    discount: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] }
                  };
                });

                // Update existing table
                Object.assign(table, formData);

                // Save to storage (only for custom tables - factory tables are read-only)
                if (!table.id.startsWith('table-') || existingTables.find(t => t.id === table.id && t !== table)) {
                  // This is a factory table or duplicate, don't save
                  console.log("Not saving factory table:", table.id);
                } else {
                  // Save custom tables
                  const customTables = existingTables.filter(t => t.id.startsWith('table-'));
                  localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(customTables));
                }

                renderTablesList();
                Modal.close();
              }
            });
          });
          tableActions.appendChild(editBtn);

          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-secondary";
          deleteBtn.textContent = "Delete";
          deleteBtn.style.fontSize = "11px";
          deleteBtn.style.padding = "4px 8px";
          deleteBtn.style.color = "#ef4444";
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(`Delete rate table "${table.label}"?`)) {
              // Remove from existingTables array
              existingTables.splice(index, 1);
              
              // Save updated custom tables
              const customTables = existingTables.filter(t => t.id.startsWith('table-'));
              localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(customTables));
              
              renderTablesList();
            }
          });
          tableActions.appendChild(deleteBtn);

          tableHeader.appendChild(tableActions);
          tableCard.appendChild(tableHeader);

          const tableMeta = document.createElement("div");
          tableMeta.style.fontSize = "12px";
          tableMeta.style.color = "var(--text-muted)";
          tableMeta.textContent = `Location: ${table.defaultProv || 'Not set'} • Business Line: ${table.defaultBL || 'Not set'}`;
          tableCard.appendChild(tableMeta);

          tablesList.appendChild(tableCard);
        });
      }

      // Add new table button
      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-primary";
      addBtn.textContent = "+ New Rate Table";
      addBtn.style.marginTop = "16px";
      addBtn.addEventListener("click", () => {
        console.log("New Rate Table button clicked");
        console.log("Opening modal for new table");
        Modal.open({
          title: "Create New Rate Table",
          content: (editorContainer) => renderTableEditor(editorContainer, null, jobLevels),
          onSave: (editorContainer) => {
            const formData = editorContainer._formData;
            if (!formData) return;

            // Collect current input values
            const inputValues = Array.from(editorContainer._rateInputs).map(input => parseFloat(input.value) || 0);
            let inputIndex = 0;
            jobLevels.forEach(level => {
              if (!formData.rates) formData.rates = {};
              formData.rates[level.code] = {
                cost: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                standard: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                premium: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] },
                discount: { reg: inputValues[inputIndex++], ot: inputValues[inputIndex++] }
              };
            });

            // Create new table
            const newTable = {
              id: "table-" + crypto.randomUUID(),
              label: formData.label,
              description: formData.description,
              defaultProv: formData.defaultProv,
              defaultBL: formData.defaultBL,
              rates: formData.rates
            };

            // Add to existing tables
            existingTables.push(newTable);

            // Save to storage
            const customTables = existingTables.filter(t => t.id.startsWith('table-'));
            localStorage.setItem('estimator_custom_rate_tables_v1', JSON.stringify(customTables));

            renderTablesList();
            Modal.close();
          }
        });
      });
      container.appendChild(addBtn);
    }

    renderTablesList();
  }

  function renderTableEditor(container, existingTable, jobLevels) {
    console.log("renderTableEditor called with:", { existingTable, jobLevelsCount: jobLevels?.length });
    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "16px";
    container.style.minHeight = "500px";

    // Table metadata
    const metaSection = document.createElement("div");
    metaSection.style.display = "grid";
    metaSection.style.gridTemplateColumns = "1fr 1fr 1fr";
    metaSection.style.gap = "12px";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Table Name";
    labelInput.value = existingTable?.label || "";
    labelInput.style.width = "100%";
    labelInput.style.padding = "8px";
    labelInput.style.border = "1px solid var(--border)";
    labelInput.style.borderRadius = "4px";
    labelInput.style.background = "var(--bg)";
    labelInput.style.color = "var(--text)";

    const descInput = document.createElement("textarea");
    descInput.placeholder = "Description (optional)";
    descInput.value = existingTable?.description || "";
    descInput.style.width = "100%";
    descInput.style.padding = "8px";
    descInput.style.border = "1px solid var(--border)";
    descInput.style.borderRadius = "4px";
    descInput.style.background = "var(--bg)";
    descInput.style.color = "var(--text)";
    descInput.style.resize = "vertical";
    descInput.style.minHeight = "60px";

    const locationSelect = document.createElement("select");
    locationSelect.style.width = "100%";
    locationSelect.style.padding = "8px";
    locationSelect.style.border = "1px solid var(--border)";
    locationSelect.style.borderRadius = "4px";
    locationSelect.style.background = "var(--bg)";
    locationSelect.style.color = "var(--text)";

    // Add province options
    const provinces = [
      { code: "", display: "All Provinces", label: "All Provinces" },
      { code: "AB", display: "AB - Alberta", label: "Alberta" },
      { code: "BC", display: "BC - British Columbia", label: "British Columbia" },
      { code: "MB", display: "MB - Manitoba", label: "Manitoba" },
      { code: "NB", display: "NB - New Brunswick", label: "New Brunswick" },
      { code: "NL", display: "NL - Newfoundland and Labrador", label: "Newfoundland and Labrador" },
      { code: "NS", display: "NS - Nova Scotia", label: "Nova Scotia" },
      { code: "ON", display: "ON - Ontario", label: "Ontario" },
      { code: "PE", display: "PE - Prince Edward Island", label: "Prince Edward Island" },
      { code: "QC", display: "QC - Quebec", label: "Quebec" },
      { code: "SK", display: "SK - Saskatchewan", label: "Saskatchewan" },
      { code: "NT", display: "NT - Northwest Territories", label: "Northwest Territories" },
      { code: "NU", display: "NU - Nunavut", label: "Nunavut" },
      { code: "YT", display: "YT - Yukon", label: "Yukon" }
    ];

    provinces.forEach(prov => {
      const opt = document.createElement("option");
      opt.value = prov.code;
      opt.textContent = prov.display;
      if (prov.code === (existingTable?.defaultProv || "")) opt.selected = true;
      locationSelect.appendChild(opt);
    });

    metaSection.appendChild(labelInput);
    metaSection.appendChild(descInput);
    metaSection.appendChild(locationSelect);
    container.appendChild(metaSection);

    // Rate table
    const tableContainer = document.createElement("div");
    tableContainer.style.overflow = "auto";
    tableContainer.style.maxHeight = "400px";
    tableContainer.style.border = "1px solid var(--border)";
    tableContainer.style.borderRadius = "4px";

    const rateTable = document.createElement("table");
    rateTable.style.width = "100%";
    rateTable.style.borderCollapse = "collapse";

    // Table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = ["Job Level", "Cost Reg", "Cost OT", "Std Reg", "Std OT", "Prem Reg", "Prem OT", "Disc Reg", "Disc OT"];
    headers.forEach(headerText => {
      const th = document.createElement("th");
      th.textContent = headerText;
      th.style.padding = "8px";
      th.style.border = "1px solid var(--border)";
      th.style.background = "var(--bg-hover)";
      th.style.fontSize = "12px";
      th.style.fontWeight = "600";
      th.style.textAlign = "center";
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    rateTable.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");

    jobLevels.forEach(level => {
      const row = document.createElement("tr");

      // Job level name
      const levelCell = document.createElement("td");
      levelCell.textContent = level.label;
      levelCell.style.padding = "8px";
      levelCell.style.border = "1px solid var(--border)";
      levelCell.style.fontSize = "12px";
      row.appendChild(levelCell);

      // Get existing rates for this level
      const existingRates = existingTable?.rates?.[level.code] || {};

      // Cost rates
      const costRegInput = document.createElement("input");
      costRegInput.type = "number";
      costRegInput.step = "0.01";
      costRegInput.min = "0";
      costRegInput.value = existingRates.cost?.reg || 0;
      costRegInput.style.width = "100%";
      costRegInput.style.padding = "4px";
      costRegInput.style.border = "1px solid var(--border)";
      costRegInput.style.borderRadius = "3px";
      costRegInput.style.background = "var(--bg)";
      costRegInput.style.color = "var(--text)";
      costRegInput.style.textAlign = "center";

      const costRegCell = document.createElement("td");
      costRegCell.style.padding = "4px";
      costRegCell.style.border = "1px solid var(--border)";
      costRegCell.appendChild(costRegInput);
      row.appendChild(costRegCell);

      const costOTInput = document.createElement("input");
      costOTInput.type = "number";
      costOTInput.step = "0.01";
      costOTInput.min = "0";
      costOTInput.value = existingRates.cost?.ot || 0;
      costOTInput.style.width = "100%";
      costOTInput.style.padding = "4px";
      costOTInput.style.border = "1px solid var(--border)";
      costOTInput.style.borderRadius = "3px";
      costOTInput.style.background = "var(--bg)";
      costOTInput.style.color = "var(--text)";
      costOTInput.style.textAlign = "center";

      const costOTCell = document.createElement("td");
      costOTCell.style.padding = "4px";
      costOTCell.style.border = "1px solid var(--border)";
      costOTCell.appendChild(costOTInput);
      row.appendChild(costOTCell);

      // Standard rates
      const stdRegInput = document.createElement("input");
      stdRegInput.type = "number";
      stdRegInput.step = "0.01";
      stdRegInput.min = "0";
      stdRegInput.value = existingRates.standard?.reg || 0;
      stdRegInput.style.width = "100%";
      stdRegInput.style.padding = "4px";
      stdRegInput.style.border = "1px solid var(--border)";
      stdRegInput.style.borderRadius = "3px";
      stdRegInput.style.background = "var(--bg)";
      stdRegInput.style.color = "var(--text)";
      stdRegInput.style.textAlign = "center";

      const stdRegCell = document.createElement("td");
      stdRegCell.style.padding = "4px";
      stdRegCell.style.border = "1px solid var(--border)";
      stdRegCell.appendChild(stdRegInput);
      row.appendChild(stdRegCell);

      const stdOTInput = document.createElement("input");
      stdOTInput.type = "number";
      stdOTInput.step = "0.01";
      stdOTInput.min = "0";
      stdOTInput.value = existingRates.standard?.ot || 0;
      stdOTInput.style.width = "100%";
      stdOTInput.style.padding = "4px";
      stdOTInput.style.border = "1px solid var(--border)";
      stdOTInput.style.borderRadius = "3px";
      stdOTInput.style.background = "var(--bg)";
      stdOTInput.style.color = "var(--text)";
      stdOTInput.style.textAlign = "center";

      const stdOTCell = document.createElement("td");
      stdOTCell.style.padding = "4px";
      stdOTCell.style.border = "1px solid var(--border)";
      stdOTCell.appendChild(stdOTInput);
      row.appendChild(stdOTCell);

      // Premium rates
      const premRegInput = document.createElement("input");
      premRegInput.type = "number";
      premRegInput.step = "0.01";
      premRegInput.min = "0";
      premRegInput.value = existingRates.premium?.reg || 0;
      premRegInput.style.width = "100%";
      premRegInput.style.padding = "4px";
      premRegInput.style.border = "1px solid var(--border)";
      premRegInput.style.borderRadius = "3px";
      premRegInput.style.background = "var(--bg)";
      premRegInput.style.color = "var(--text)";
      premRegInput.style.textAlign = "center";

      const premRegCell = document.createElement("td");
      premRegCell.style.padding = "4px";
      premRegCell.style.border = "1px solid var(--border)";
      premRegCell.appendChild(premRegInput);
      row.appendChild(premRegCell);

      const premOTInput = document.createElement("input");
      premOTInput.type = "number";
      premOTInput.step = "0.01";
      premOTInput.min = "0";
      premOTInput.value = existingRates.premium?.ot || 0;
      premOTInput.style.width = "100%";
      premOTInput.style.padding = "4px";
      premOTInput.style.border = "1px solid var(--border)";
      premOTInput.style.borderRadius = "3px";
      premOTInput.style.background = "var(--bg)";
      premOTInput.style.color = "var(--text)";
      premOTInput.style.textAlign = "center";

      const premOTCell = document.createElement("td");
      premOTCell.style.padding = "4px";
      premOTCell.style.border = "1px solid var(--border)";
      premOTCell.appendChild(premOTInput);
      row.appendChild(premOTCell);

      // Discount rates
      const discRegInput = document.createElement("input");
      discRegInput.type = "number";
      discRegInput.step = "0.01";
      discRegInput.min = "0";
      discRegInput.value = existingRates.discount?.reg || 0;
      discRegInput.style.width = "100%";
      discRegInput.style.padding = "4px";
      discRegInput.style.border = "1px solid var(--border)";
      discRegInput.style.borderRadius = "3px";
      discRegInput.style.background = "var(--bg)";
      discRegInput.style.color = "var(--text)";
      discRegInput.style.textAlign = "center";

      const discRegCell = document.createElement("td");
      discRegCell.style.padding = "4px";
      discRegCell.style.border = "1px solid var(--border)";
      discRegCell.appendChild(discRegInput);
      row.appendChild(discRegCell);

      const discOTInput = document.createElement("input");
      discOTInput.type = "number";
      discOTInput.step = "0.01";
      discOTInput.min = "0";
      discOTInput.value = existingRates.discount?.ot || 0;
      discOTInput.style.width = "100%";
      discOTInput.style.padding = "4px";
      discOTInput.style.border = "1px solid var(--border)";
      discOTInput.style.borderRadius = "3px";
      discOTInput.style.background = "var(--bg)";
      discOTInput.style.color = "var(--text)";
      discOTInput.style.textAlign = "center";

      const discOTCell = document.createElement("td");
      discOTCell.style.padding = "4px";
      discOTCell.style.border = "1px solid var(--border)";
      discOTCell.appendChild(discOTInput);
      row.appendChild(discOTCell);

      tbody.appendChild(row);
    });

    rateTable.appendChild(tbody);
    tableContainer.appendChild(rateTable);
    container.appendChild(tableContainer);

    // Store form data
    container._formData = {
      label: existingTable?.label || "",
      description: existingTable?.description || "",
      defaultProv: existingTable?.defaultProv || "",
      defaultBL: existingTable?.defaultBL || "BL002"
    };

    // Update form data when inputs change
    labelInput.addEventListener("input", () => container._formData.label = labelInput.value);
    descInput.addEventListener("input", () => container._formData.description = descInput.value);
    locationSelect.addEventListener("change", () => container._formData.defaultProv = locationSelect.value);

    // Store references to inputs for later collection
    container._rateInputs = rateTable.querySelectorAll("input[type='number']");
    container._jobLevels = jobLevels;
  }

  return {
    openManager: openManager
  };
})();

console.log("✅ RateScheduleManager loaded");