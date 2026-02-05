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
    container.style.padding = "12px";

    // Instructions
    const instructions = document.createElement("div");
    instructions.style.fontSize = "12px";
    instructions.style.color = "var(--text-muted)";
    instructions.style.marginBottom = "12px";
    instructions.style.lineHeight = "1.5";
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
    statusDiv.style.display = "flex";
    statusDiv.style.justifyContent = "space-between";
    statusDiv.style.alignItems = "center";
    statusDiv.style.marginBottom = "12px";
    statusDiv.style.padding = "8px";
    statusDiv.style.background = "var(--bg-hover)";
    statusDiv.style.borderRadius = "4px";

    const statusText = document.createElement("span");
    statusText.textContent = `${orgUnits.length} organization units loaded`;
    statusText.style.fontSize = "12px";
    statusText.style.color = "var(--text-muted)";

    const controlsDiv = document.createElement("div");
    controlsDiv.style.display = "flex";
    controlsDiv.style.gap = "8px";

    // Import CSV button
    const importBtn = document.createElement("button");
    importBtn.className = "btn btn-secondary";
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
    clearBtn.className = "btn btn-secondary";
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

    // Table header
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "12px";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl1_ID</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl1 Name</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl2_ID</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl2 Name</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl3_ID</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px;">Lvl3 Name</th>
      <th style="padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 12px; width: 40px;"></th>
    </tr>`;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");
    orgUnits.forEach((unit, idx) => {
      const row = document.createElement("tr");
    ["lvl1_id", "lvl1_name", "lvl2_id", "lvl2_name", "lvl3_id", "lvl3_name"].forEach(key => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.value = unit[key] || "";
        input.style.width = "100%";
        input.style.padding = "4px 6px";
        input.style.border = "1px solid var(--border-muted)";
        input.style.borderRadius = "3px";
        input.style.background = "var(--bg)";
        input.style.color = "var(--text)";
        input.style.fontSize = "12px";
        input.oninput = () => { 
          unit[key] = input.value; 
          saveOrgUnits(); // Save changes immediately
        };
        cell.style.padding = "4px 6px";
        cell.appendChild(input);
        row.appendChild(cell);
      });
      // Remove button
      const removeCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-secondary";
      removeBtn.textContent = "×";
      removeBtn.style.width = "28px";
      removeBtn.style.padding = "2px";
      removeBtn.style.fontSize = "14px";
      removeBtn.onclick = () => {
        orgUnits.splice(idx, 1);
        saveOrgUnits(); // Save after removal
        renderManager(container);
      };
      removeCell.style.padding = "4px 6px";
      removeCell.appendChild(removeBtn);
      row.appendChild(removeCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);

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

  return { openManager };
})();
