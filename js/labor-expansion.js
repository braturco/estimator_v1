// Labor expansion - inline task expansion for labor estimation

window.LaborExpansion = (function () {
  
  // Render the labor expansion UI for a task
  function renderExpansion(container, wbsNodeId, taskNode) {
    console.log(`📂 LaborExpansion.renderExpansion called for node ${wbsNodeId}`);
    container.innerHTML = "";
    container.style.gridColumn = "1 / -1"; // Span all columns
    container.style.padding = "12px";
    container.style.background = "var(--bg-hover)";
    container.style.borderRadius = "4px";
    container.style.marginTop = "4px";
    
    const laborData = (wbsPills[wbsNodeId] && wbsPills[wbsNodeId].laborData) || {
      activities: [],
      resources: []
    };

    // Toolbar with Add Activity and Add Resource buttons
    const toolbar = document.createElement("div");
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";
    toolbar.style.marginBottom = "12px";
    
    const addActivityBtn = document.createElement("button");
    addActivityBtn.className = "btn btn-secondary";
    addActivityBtn.textContent = "+ Activity";
    addActivityBtn.addEventListener("click", () => {
      const name = prompt("Activity name:");
      if (name) {
        if (!laborData.activities) laborData.activities = [];
        laborData.activities.push({
          id: crypto.randomUUID(),
          name: name,
          hours: {} // Will have resource-id: {reg, ot} entries
        });
        if (!wbsPills[wbsNodeId].laborData) wbsPills[wbsNodeId].laborData = laborData;
        renderWBS();
      }
    });
    toolbar.appendChild(addActivityBtn);
    
    const addResourceBtn = document.createElement("button");
    addResourceBtn.className = "btn btn-secondary";
    addResourceBtn.textContent = "+ Resource";
    addResourceBtn.addEventListener("click", () => {
      // TODO: Show pill selector or resource picker
      // For now, prompt for resource name
      const name = prompt("Resource name:");
      if (name) {
        if (!laborData.resources) laborData.resources = [];
        laborData.resources.push({
          id: crypto.randomUUID(),
          name: name,
          chargeoutRate: 100,
          costRate: 60
        });
        if (!wbsPills[wbsNodeId].laborData) wbsPills[wbsNodeId].laborData = laborData;
        renderWBS();
      }
    });
    toolbar.appendChild(addResourceBtn);
    
    container.appendChild(toolbar);
    
    if (laborData.activities.length === 0) {
      const msg = document.createElement("div");
      msg.style.padding = "12px";
      msg.style.color = "var(--text-muted)";
      msg.style.fontSize = "12px";
      msg.textContent = "No activities yet. Click '+ Activity' to add one.";
      container.appendChild(msg);
      return;
    }
    
    // Activities table with resource columns
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "11px";
    
    // Header row
    const headerRow = document.createElement("tr");
    headerRow.style.borderBottom = "1px solid var(--border)";
    
    const actNameHeader = document.createElement("th");
    actNameHeader.style.textAlign = "left";
    actNameHeader.style.padding = "6px";
    actNameHeader.style.fontWeight = "600";
    actNameHeader.textContent = "Activity";
    headerRow.appendChild(actNameHeader);
    
    if (laborData.resources && laborData.resources.length > 0) {
      laborData.resources.forEach(res => {
        const header = document.createElement("th");
        header.style.textAlign = "center";
        header.style.padding = "6px";
        header.style.fontWeight = "600";
        header.style.minWidth = "100px";
        header.style.borderLeft = "1px solid var(--border)";
        header.innerHTML = `<div>${res.name}</div><div style="font-size: 10px; font-weight: 400; color: var(--text-muted);">Reg/OT</div>`;
        headerRow.appendChild(header);
      });
    }
    
    table.appendChild(headerRow);
    
    // Activity rows
    laborData.activities.forEach(activity => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid var(--bg)";
      
      const nameCell = document.createElement("td");
      nameCell.style.padding = "6px";
      nameCell.style.paddingLeft = "12px";
      nameCell.textContent = activity.name;
      row.appendChild(nameCell);
      
      if (laborData.resources && laborData.resources.length > 0) {
        laborData.resources.forEach(res => {
          const cell = document.createElement("td");
          cell.style.padding = "4px";
          cell.style.textAlign = "center";
          cell.style.borderLeft = "1px solid var(--bg)";
          
          const wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.gap = "4px";
          
          // Regular hours input
          const regInput = document.createElement("input");
          regInput.type = "number";
          regInput.min = "0";
          regInput.step = "0.5";
          regInput.style.width = "40px";
          regInput.style.padding = "2px 4px";
          regInput.style.fontSize = "11px";
          regInput.style.background = "var(--bg)";
          regInput.style.border = "1px solid var(--border)";
          regInput.style.color = "var(--text)";
          regInput.placeholder = "Reg";
          regInput.value = (activity.hours && activity.hours[res.id + "_reg"]) || "";
          regInput.addEventListener("change", () => {
            if (!activity.hours) activity.hours = {};
            activity.hours[res.id + "_reg"] = parseFloat(regInput.value) || 0;
            if (!wbsPills[wbsNodeId].laborData) wbsPills[wbsNodeId].laborData = laborData;
          });
          wrapper.appendChild(regInput);
          
          // OT hours input
          const otInput = document.createElement("input");
          otInput.type = "number";
          otInput.min = "0";
          otInput.step = "0.5";
          otInput.style.width = "40px";
          otInput.style.padding = "2px 4px";
          otInput.style.fontSize = "11px";
          otInput.style.background = "var(--bg)";
          otInput.style.border = "1px solid var(--border)";
          otInput.style.color = "var(--text)";
          otInput.placeholder = "OT";
          otInput.value = (activity.hours && activity.hours[res.id + "_ot"]) || "";
          otInput.addEventListener("change", () => {
            if (!activity.hours) activity.hours = {};
            activity.hours[res.id + "_ot"] = parseFloat(otInput.value) || 0;
            if (!wbsPills[wbsNodeId].laborData) wbsPills[wbsNodeId].laborData = laborData;
          });
          wrapper.appendChild(otInput);
          
          cell.appendChild(wrapper);
          row.appendChild(cell);
        });
      }
      
      table.appendChild(row);
    });
    
    container.appendChild(table);
  }
  
  return { renderExpansion };
})();

// console.log("✅ LaborExpansion module loaded");
