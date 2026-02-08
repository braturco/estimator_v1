// Business Organization Manager Modal
// Allows management of company/division/office/department structure

window.BusinessOrgManager = (function () {
  // In-memory org data
  let orgUnits = [];
  const STORAGE_KEY = "estimator_business_org_v1";

  // Load from localStorage
  function loadOrgUnits() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        orgUnits = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load business org data", e);
    }
  }

  // Save to localStorage
  function saveOrgUnits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orgUnits));
    } catch (e) {
      console.warn("Failed to save business org data", e);
    }
  }

  function openManager() {
    loadOrgUnits(); // Load data when opening
    Modal.open({
      title: "Business Organization Manager",
      content: (container) => renderManager(container),
      onSave: () => {
        saveOrgUnits(); // Save data when closing
        Modal.close();
      },
      onClose: () => {
        saveOrgUnits(); // Save data when closing
        Modal.close();
      }
    });
  }

  function renderManager(container) {
    container.innerHTML = "";
    container.className = "modal-container";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "modal-instructions";
    instructions.innerHTML = `
      <strong>Business Organization Structure:</strong><br>
      • Lvl1: Business Lines (Water, Energy, etc.)<br>
      • Lvl2: Market Sub-Sectors (Drinking Water, Renewables, etc.)<br>
      • Lvl3: Office Locations (Toronto, Montreal, etc.)<br>
      <strong>Expected CSV Columns:</strong> BusinessLine_ID, BusinessLine_Name, MarketSubSector_ID, MarketSubSector_Name, OfficeLocation_ID, OfficeLocation_Name
    `;
    container.appendChild(instructions);

    // Status and controls
    const statusDiv = document.createElement("div");
    statusDiv.className = "status-bar";

    const statusText = document.createElement("span");
    statusText.textContent = `${orgUnits.length} organization units loaded`;

    const controlsDiv = document.createElement("div");
    controlsDiv.style.display = "flex";
    controlsDiv.style.gap = "8px";

    // Import CSV button
    const importBtn = document.createElement("button");
    importBtn.className = "btn btn-secondary btn-small";
    importBtn.textContent = "Import CSV";
    importBtn.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target.result;
          const rows = text.split(/\r?\n/).filter(r => r.trim());

          if (rows.length < 2) {
            alert("CSV file must have at least a header row and one data row");
            return;
          }

          // Parse header row
          const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
          const expectedHeaders = ["businessline_id", "businessline_name", "marketsubsector_id", "marketsubsector_name", "officelocation_id", "officelocation_name"];

          // Check if headers match expected format
          const headerMatch = expectedHeaders.every(expected =>
            headers.includes(expected) ||
            headers.includes(expected.replace(/_/g, "")) ||
            headers.includes(expected.replace(/businessline/g, "business_line").replace(/marketsubsector/g, "market_subsector").replace(/officelocation/g, "office_location"))
          );

          if (!headerMatch) {
            alert(`CSV headers don't match expected format.\n\nExpected: ${expectedHeaders.join(", ")}\n\nFound: ${headers.join(", ")}`);
            return;
          }

          // Parse data rows (skip header)
          const newOrgUnits = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(",").map(c => c.trim());
            if (cols.length >= 6) {
              newOrgUnits.push({
                lvl1_id: cols[0] || "",
                lvl1_name: cols[1] || "",
                lvl2_id: cols[2] || "",
                lvl2_name: cols[3] || "",
                lvl3_id: cols[4] || "",
                lvl3_name: cols[5] || ""
              });
            }
          }

          if (newOrgUnits.length > 0) {
            orgUnits = newOrgUnits;
            saveOrgUnits(); // Save imported data
            alert(`Successfully imported ${newOrgUnits.length} business organization units`);
            renderManager(container); // Refresh the view to show imported data
          } else {
            alert("No valid organization units found in CSV");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
    controlsDiv.appendChild(importBtn);

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn btn-secondary btn-small";
    clearBtn.textContent = "Clear All";
    clearBtn.onclick = () => {
      if (confirm("Clear all business organization data? This cannot be undone.")) {
        orgUnits = [];
        saveOrgUnits();
        renderManager(container);
      }
    };
    controlsDiv.appendChild(clearBtn);

    statusDiv.appendChild(statusText);
    statusDiv.appendChild(controlsDiv);
    container.appendChild(statusDiv);

    // Scrollable table wrapper
    const tableWrap = document.createElement("div");
    tableWrap.style.flex = "1";
    tableWrap.style.minHeight = "0";
    tableWrap.style.overflow = "auto";

    // Table
    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Lvl1_ID", "Lvl1 Name", "Lvl2_ID", "Lvl2 Name", "Lvl3_ID", "Lvl3 Name", ""];
    headers.forEach(headerText => {
      const th = document.createElement("th");
      th.className = "table-header";
      th.textContent = headerText;
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.zIndex = "1";
      th.style.background = "var(--bg-panel)";
      if (headerText === "") th.style.width = "40px";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");
    orgUnits.forEach((unit, idx) => {
      const row = document.createElement("tr");
      row.className = "table-row";

      ["lvl1_id", "lvl1_name", "lvl2_id", "lvl2_name", "lvl3_id", "lvl3_name"].forEach(key => {
        const cell = document.createElement("td");
        cell.className = "table-cell";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-input";
        input.value = unit[key] || "";
        input.style.width = "100%";
        input.style.padding = "4px 6px"; // Table cell inputs need tighter padding
        input.oninput = () => {
          unit[key] = input.value;
          saveOrgUnits(); // Save changes immediately
        };
        cell.appendChild(input);
        row.appendChild(cell);
      });

      // Remove button
      const removeCell = document.createElement("td");
      removeCell.className = "table-cell";
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-secondary btn-micro";
      removeBtn.textContent = "×";
      removeBtn.style.width = "28px";
      removeBtn.onclick = () => {
        orgUnits.splice(idx, 1);
        saveOrgUnits(); // Save after removal
        renderManager(container);
      };
      removeCell.appendChild(removeBtn);
      row.appendChild(removeCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    // Add row button
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.textContent = "+ Add Organization Unit";
    addBtn.style.marginTop = "16px";
    addBtn.onclick = () => {
      orgUnits.push({ lvl1_id: "", lvl1_name: "", lvl2_id: "", lvl2_name: "", lvl3_id: "", lvl3_name: "" });
      saveOrgUnits(); // Save after adding
      renderManager(container);
    };
    container.appendChild(addBtn);
  }

  // Lookup org unit by lvl3_id
  function getOrgByLvl3Id(lvl3Id) {
    loadOrgUnits();
    if (!lvl3Id) return null;
    return orgUnits.find(u => u.lvl3_id === lvl3Id) || null;
  }

  return { openManager, getOrgByLvl3Id };
})();
