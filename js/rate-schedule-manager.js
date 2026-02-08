// Rate Schedule Manager - Create and edit labor rate tables
// console.log("🔄 Loading rate-schedule-manager.js");

window.RateScheduleManager = (function () {
  function openManager() {
    // console.log("RateScheduleManager.openManager() called");
    if (!window.Modal || typeof Modal.open !== "function") {
      alert("Modal system is not available.");
      return;
    }

    // Load job levels dynamically from JobLevels registry
    if (window.JobLevels && typeof JobLevels.getAllLevels === "function") {
      JobLevels.getAllLevels()
        .then(levels => {
          // Ensure code property exists (map id to code if missing)
          const jobLevels = levels.map(l => ({ ...l, code: l.code || l.id }));

          Modal.open({
            title: "Rate Schedule Manager",
            content: (container) => renderManager(container, jobLevels),
            onSave: null,
            onClose: () => console.log("Rate Schedule Manager closed")
          });
        })
        .catch(err => {
          console.error("Failed to load job levels:", err);
          alert("Failed to load job levels. Please check the console for details.");
        });
    } else {
      alert("Job Levels module is not available.");
    }
  }

  function renderManager(container, jobLevels) {
    // console.log("🔄 renderManager called, container:", container);
    // console.log("renderManager called with container:", container);
    container.innerHTML = "";
    container.className = "modal-container";
    container.style.minHeight = "600px";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "modal-instructions";
    instructions.innerHTML = `
      <strong>How to use:</strong><br>
      • Import cost rates first via Setup → 💰 Cost Rate Table Mgmt<br>
      • Click "New Table" to create a rate table<br>
      • Enter table name and select a province<br>
      • Cost rates will auto-populate based on Province + Job Level lookup<br>
      • Define Regular and OT rates for Standard, Premium, and Discount rate sets
    `;
    container.appendChild(instructions);

    // Action buttons
    const actionButtons = document.createElement("div");
    actionButtons.className = "toolbar";
    actionButtons.style.marginBottom = "16px";
    container.appendChild(actionButtons);

    // Rate Schedule button
    const rateScheduleBtn = document.createElement("button");
    rateScheduleBtn.className = "btn btn-primary";
    rateScheduleBtn.textContent = "🧮 Rate Schedule";
    rateScheduleBtn.addEventListener("click", () => {
      // Open Resource Manager which has the rate schedule functionality
      if (window.ResourceManager && typeof window.ResourceManager.openManager === "function") {
        window.ResourceManager.openManager();
        // Close current modal
        Modal.close();
      } else {
        alert("Resource Manager is not available.");
      }
    });
    actionButtons.appendChild(rateScheduleBtn);

    // Import Employees button
    const importEmployeesBtn = document.createElement("button");
    importEmployeesBtn.className = "btn btn-secondary";
    importEmployeesBtn.textContent = "📥 Import Employees";
    importEmployeesBtn.addEventListener("click", () => {
      // Open Resource Manager which has the employee import functionality
      if (window.ResourceManager && typeof window.ResourceManager.openManager === "function") {
        window.ResourceManager.openManager();
        // Close current modal
        Modal.close();
      } else {
        alert("Resource Manager is not available.");
      }
    });
    actionButtons.appendChild(importEmployeesBtn);

    // console.log("✅ Action buttons created and appended:", actionButtons.children.length);

    // Tables list
    const tablesList = document.createElement("div");
    tablesList.className = "modal-container";
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
      
      // console.log("Tables loaded:", existingTables.length);
    } catch (error) {
      console.error("Failed to load tables:", error);
      existingTables = [];
    }

    function renderTablesList() {
      tablesList.innerHTML = "";

      if (existingTables.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <div class="empty-state-title">No Rate Tables</div>
          <div class="empty-state-subtitle">Create your first rate table to get started</div>
        `;
        tablesList.appendChild(emptyState);
      } else {
        existingTables.forEach((table, index) => {
          const tableCard = document.createElement("div");
          tableCard.className = "card";
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
          tableHeader.className = "card-title";

          const tableTitle = document.createElement("div");
          tableTitle.textContent = table.label || "Untitled Table";
          tableHeader.appendChild(tableTitle);

          const tableActions = document.createElement("div");
          tableActions.className = "card-actions";

          const starBtn = document.createElement("button");
          starBtn.className = "btn-star" + (table.isDefault ? " active" : "");
          starBtn.textContent = "\u2605";
          starBtn.title = table.isDefault ? "Remove as default" : "Set as default";
          starBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            RateTables.setDefaultTable(table.id);
            // Refresh existingTables from storage and re-render
            existingTables.length = 0;
            existingTables.push(...RateTables.getCustomTables());
            renderTablesList();
          });
          tableActions.appendChild(starBtn);

          const editBtn = document.createElement("button");
          editBtn.className = "btn btn-secondary btn-small";
          editBtn.textContent = "Edit";
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
          deleteBtn.className = "btn btn-secondary btn-small";
          deleteBtn.textContent = "Delete";
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
          tableMeta.className = "modal-instructions";
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
        // console.log("New Rate Table button clicked");
        // console.log("Opening modal for new table");
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
      tablesList.appendChild(addBtn);
    }

    renderTablesList();
  }

  function renderTableEditor(container, existingTable, jobLevels) {
    // console.log("renderTableEditor called with:", { existingTable, jobLevelsCount: jobLevels?.length });
    container.innerHTML = "";
    container.className = "modal-container";
    container.style.minHeight = "500px";

    // Table metadata
    const metaSection = document.createElement("div");
    metaSection.style.display = "grid";
    metaSection.style.gridTemplateColumns = "1fr 1fr 1fr";
    metaSection.style.gap = "12px";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "form-input";
    labelInput.placeholder = "Table Name";
    labelInput.value = existingTable?.label || "";
    labelInput.style.width = "100%";

    const descInput = document.createElement("textarea");
    descInput.className = "form-input";
    descInput.placeholder = "Description (optional)";
    descInput.value = existingTable?.description || "";
    descInput.style.width = "100%";
    descInput.style.resize = "vertical";
    descInput.style.minHeight = "60px";

    const locationSelect = document.createElement("select");
    locationSelect.className = "form-input";
    locationSelect.style.width = "100%";

    const blankOpt = document.createElement("option");
    blankOpt.value = "";
    blankOpt.textContent = "All Provinces";
    locationSelect.appendChild(blankOpt);

    if (window.ProvinceMapping && typeof window.ProvinceMapping.getProvinceOptions === "function") {
      const provinceOptions = window.ProvinceMapping.getProvinceOptions();
      provinceOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.display;
        option.textContent = opt.display + (opt.label ? ` - ${opt.label}` : "");
        if (opt.display === (existingTable?.defaultProv || "")) option.selected = true;
        locationSelect.appendChild(option);
      });
    }

    metaSection.appendChild(labelInput);
    metaSection.appendChild(descInput);
    metaSection.appendChild(locationSelect);
    container.appendChild(metaSection);

    // Rate table
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";

    const rateTable = document.createElement("table");
    rateTable.className = "data-table";

    // Table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = ["Job Level", "Cost Reg", "Cost OT", "Std Reg", "Std OT", "Prem Reg", "Prem OT", "Disc Reg", "Disc OT"];
    headers.forEach(headerText => {
      const th = document.createElement("th");
      th.className = "table-header";
      th.textContent = headerText;
      th.style.textAlign = "center";
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    rateTable.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");

    jobLevels.forEach(level => {
      const row = document.createElement("tr");
      row.className = "table-row";

      // Job level name
      const levelCell = document.createElement("td");
      levelCell.className = "table-cell";
      levelCell.textContent = `${level.code} - ${level.label}`;
      row.appendChild(levelCell);

      // Get existing rates for this level
      const existingRates = existingTable?.rates?.[level.code] || {};

      // Cost rates
      const costRegInput = document.createElement("input");
      costRegInput.type = "number";
      costRegInput.className = "form-input";
      costRegInput.step = "0.01";
      costRegInput.min = "0";
      costRegInput.dataset.levelCode = level.code;
      costRegInput.dataset.type = "costReg";
      costRegInput.value = existingRates.cost?.reg || 0;
      costRegInput.style.width = "100%";
      costRegInput.style.padding = "4px";
      costRegInput.style.textAlign = "center";

      const costRegCell = document.createElement("td");
      costRegCell.className = "table-cell";
      costRegCell.style.padding = "4px";
      costRegCell.appendChild(costRegInput);
      row.appendChild(costRegCell);

      const costOTInput = document.createElement("input");
      costOTInput.type = "number";
      costOTInput.className = "form-input";
      costOTInput.step = "0.01";
      costOTInput.min = "0";
      costOTInput.dataset.levelCode = level.code;
      costOTInput.dataset.type = "costOT";
      costOTInput.value = existingRates.cost?.ot || 0;
      costOTInput.style.width = "100%";
      costOTInput.style.padding = "4px";
      costOTInput.style.textAlign = "center";

      const costOTCell = document.createElement("td");
      costOTCell.className = "table-cell";
      costOTCell.style.padding = "4px";
      costOTCell.appendChild(costOTInput);
      row.appendChild(costOTCell);

      // Standard rates
      const stdRegInput = document.createElement("input");
      stdRegInput.type = "number";
      stdRegInput.className = "form-input";
      stdRegInput.step = "0.01";
      stdRegInput.min = "0";
      stdRegInput.value = existingRates.standard?.reg || 0;
      stdRegInput.style.width = "100%";
      stdRegInput.style.padding = "4px";
      stdRegInput.style.textAlign = "center";

      const stdRegCell = document.createElement("td");
      stdRegCell.className = "table-cell";
      stdRegCell.style.padding = "4px";
      stdRegCell.appendChild(stdRegInput);
      row.appendChild(stdRegCell);

      const stdOTInput = document.createElement("input");
      stdOTInput.type = "number";
      stdOTInput.className = "form-input";
      stdOTInput.step = "0.01";
      stdOTInput.min = "0";
      stdOTInput.value = existingRates.standard?.ot || 0;
      stdOTInput.style.width = "100%";
      stdOTInput.style.padding = "4px";
      stdOTInput.style.textAlign = "center";

      const stdOTCell = document.createElement("td");
      stdOTCell.className = "table-cell";
      stdOTCell.style.padding = "4px";
      stdOTCell.appendChild(stdOTInput);
      row.appendChild(stdOTCell);

      // Premium rates
      const premRegInput = document.createElement("input");
      premRegInput.type = "number";
      premRegInput.className = "form-input";
      premRegInput.step = "0.01";
      premRegInput.min = "0";
      premRegInput.value = existingRates.premium?.reg || 0;
      premRegInput.style.width = "100%";
      premRegInput.style.padding = "4px";
      premRegInput.style.textAlign = "center";

      const premRegCell = document.createElement("td");
      premRegCell.className = "table-cell";
      premRegCell.style.padding = "4px";
      premRegCell.appendChild(premRegInput);
      row.appendChild(premRegCell);

      const premOTInput = document.createElement("input");
      premOTInput.type = "number";
      premOTInput.className = "form-input";
      premOTInput.step = "0.01";
      premOTInput.min = "0";
      premOTInput.value = existingRates.premium?.ot || 0;
      premOTInput.style.width = "100%";
      premOTInput.style.padding = "4px";
      premOTInput.style.textAlign = "center";

      const premOTCell = document.createElement("td");
      premOTCell.className = "table-cell";
      premOTCell.style.padding = "4px";
      premOTCell.appendChild(premOTInput);
      row.appendChild(premOTCell);

      // Discount rates
      const discRegInput = document.createElement("input");
      discRegInput.type = "number";
      discRegInput.className = "form-input";
      discRegInput.step = "0.01";
      discRegInput.min = "0";
      discRegInput.value = existingRates.discount?.reg || 0;
      discRegInput.style.width = "100%";
      discRegInput.style.padding = "4px";
      discRegInput.style.textAlign = "center";

      const discRegCell = document.createElement("td");
      discRegCell.className = "table-cell";
      discRegCell.style.padding = "4px";
      discRegCell.appendChild(discRegInput);
      row.appendChild(discRegCell);

      const discOTInput = document.createElement("input");
      discOTInput.type = "number";
      discOTInput.className = "form-input";
      discOTInput.step = "0.01";
      discOTInput.min = "0";
      discOTInput.value = existingRates.discount?.ot || 0;
      discOTInput.style.width = "100%";
      discOTInput.style.padding = "4px";
      discOTInput.style.textAlign = "center";

      const discOTCell = document.createElement("td");
      discOTCell.className = "table-cell";
      discOTCell.style.padding = "4px";
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
    
    locationSelect.addEventListener("change", async () => {
      container._formData.defaultProv = locationSelect.value;
      
      // Auto-populate rates based on selected province
      const province = locationSelect.value;
      if (province && window.ProvinceMapping && typeof window.ProvinceMapping.lookupCostRate === "function") {
        console.log(`🔄 Auto-populating rates for ${province}...`);
        
        for (const level of jobLevels) {
          const rates = await window.ProvinceMapping.lookupCostRate(province, level.code);
          
          if (rates) {
            const regInput = rateTable.querySelector(`input[data-level-code="${level.code}"][data-type="costReg"]`);
            const otInput = rateTable.querySelector(`input[data-level-code="${level.code}"][data-type="costOT"]`);
            
            if (regInput) {
              regInput.value = rates.costRegular;
              regInput.style.background = "rgba(16, 185, 129, 0.2)"; // Green flash
              setTimeout(() => regInput.style.background = "var(--bg)", 1000);
            }
            
            if (otInput) {
              otInput.value = rates.costOT;
              otInput.style.background = "rgba(16, 185, 129, 0.2)"; // Green flash
              setTimeout(() => otInput.style.background = "var(--bg)", 1000);
            }
          }
        }
      }
    });

    // Store references to inputs for later collection
    container._rateInputs = rateTable.querySelectorAll("input[type='number']");
    container._jobLevels = jobLevels;
  }

  return {
    openManager: openManager
  };
})();

// console.log("✅ RateScheduleManager loaded");