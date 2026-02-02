// Labor Time-Task-Matrix Form

console.log("🔄 Loading form-labor-ttm.js VERSION 5 with Change button");

window.LaborTTMForm = (function () {
  
  function openForNode(wbsNodeId) {
    const existing = (wbsPills[wbsNodeId] && wbsPills[wbsNodeId].laborData) || {
      tasks: [],
      resources: [],
      resourceRates: {}
    };

    let state = JSON.parse(JSON.stringify(existing));

    // Load child tasks from WBS if empty
    if (state.tasks.length === 0) {
      state.tasks = loadTasksFromWBS(wbsNodeId);
    }

    Modal.open({
      title: `Labor Time-Task-Matrix — WBS ${wbsNodeId}`,
      content: (container) => renderForm(container, state),
      onSave: () => {
        if (!wbsPills[wbsNodeId]) {
          wbsPills[wbsNodeId] = { estimateType: [], tag: [], unit: [] };
        }
        wbsPills[wbsNodeId].laborData = state;
        Modal.close();
      }
    });
  }

  function loadTasksFromWBS(parentNodeId) {
    const tasks = [];
    
    function findNode(list, id) {
      for (const node of list) {
        if (node.id === id) return node;
        if (node.children && node.children.length) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    }
    
    const parent = findNode(WBS_DATA, parentNodeId);
    if (!parent || !parent.children || parent.children.length === 0) {
      return tasks;
    }

    parent.children.forEach(child => {
      tasks.push({
        id: child.id,
        wbsCode: child.code,
        name: child.name,
        activities: []
      });
    });

    return tasks;
  }

  function renderForm(container, state) {
    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";
    
    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.style.padding = "8px 0 12px 0";
    toolbar.style.borderBottom = "1px solid var(--border)";
    
    const addResourceBtn = document.createElement("button");
    addResourceBtn.className = "btn btn-primary";
    addResourceBtn.textContent = "+ Add Resource";
    addResourceBtn.addEventListener("click", () => {
      const nextIndex = state.resources.length + 1;
      state.resources.push({
        id: "resource-" + Date.now(),
        label: `Resource ${nextIndex}`,
        resourceId: null, // Will be set when user picks from list
        chargeoutRate: 100,
        costRate: 60
      });
      renderForm(container, state);
    });
    toolbar.appendChild(addResourceBtn);
    container.appendChild(toolbar);
    
    // Content area
    const content = document.createElement("div");
    content.style.overflow = "auto";
    content.style.flex = "1";
    content.style.padding = "20px";
    
    if (state.tasks.length === 0) {
      content.innerHTML = "<div style='color: var(--text-muted);'>No tasks in this scope.</div>";
      container.appendChild(content);
      return;
    }

    // Summary
    const summary = document.createElement("div");
    summary.style.marginBottom = "16px";
    summary.style.fontSize = "12px";
    summary.innerHTML = `
      <div style="margin-bottom: 8px;"><strong>Tasks:</strong> ${state.tasks.length}</div>
      <div style="margin-bottom: 16px;"><strong>Resources:</strong> ${state.resources.length}</div>
    `;
    
    // Resources list with editable names
    if (state.resources.length > 0) {
      const resourcesSection = document.createElement("div");
      resourcesSection.style.marginTop = "16px";
      
      const resourcesLabel = document.createElement("div");
      resourcesLabel.textContent = "Resources:";
      resourcesLabel.style.fontWeight = "600";
      resourcesLabel.style.marginBottom = "8px";
      resourcesSection.appendChild(resourcesLabel);
      
      state.resources.forEach((resource, idx) => {
        const resourceRow = document.createElement("div");
        resourceRow.style.display = "flex";
        resourceRow.style.gap = "8px";
        resourceRow.style.alignItems = "center";
        resourceRow.style.marginBottom = "8px";
        resourceRow.style.padding = "8px";
        resourceRow.style.background = "var(--bg-hover)";
        resourceRow.style.borderRadius = "4px";
        
        const nameLabel = document.createElement("div");
        nameLabel.textContent = resource.label;
        nameLabel.style.flex = "1";
        nameLabel.style.padding = "4px 8px";
        nameLabel.style.fontWeight = "500";
        
        // Edit button - much more reliable than double-click
        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-secondary";
        editBtn.textContent = "Change...";
        editBtn.style.fontSize = "11px";
        editBtn.style.padding = "4px 12px";
        editBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          console.log("🔍 Opening resource picker for:", resource.label);
          
          // Load available resources
          const resourcesData = await Rates.listResources();
          console.log("📦 Loaded resources:", resourcesData);
          const allOptions = [
            ...resourcesData.generic.map(r => ({ ...r, type: "generic" })),
            ...resourcesData.named.map(r => ({ ...r, type: "named" }))
          ];
          console.log("✅ Total options:", allOptions.length);
          
          // Create searchable input
          const input = document.createElement("input");
          input.type = "text";
          input.value = resource.label;
          input.style.flex = "1";
          input.style.padding = "4px 8px";
          input.style.border = "1px solid var(--accent)";
          input.style.borderRadius = "4px";
          input.style.background = "var(--bg)";
          input.style.color = "var(--text)";
          input.style.fontSize = "12px";
          
          // Dropdown for options
          const dropdown = document.createElement("div");
          dropdown.style.position = "absolute";
          dropdown.style.background = "var(--bg-panel)";
          dropdown.style.border = "1px solid var(--border)";
          dropdown.style.borderRadius = "4px";
          dropdown.style.maxHeight = "200px";
          dropdown.style.overflowY = "auto";
          dropdown.style.zIndex = "1000";
          dropdown.style.minWidth = "300px";
          dropdown.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
          
          function updateDropdown(filter) {
            dropdown.innerHTML = "";
            const filtered = allOptions.filter(opt => 
              opt.label.toLowerCase().includes(filter.toLowerCase())
            );
            
            if (filtered.length === 0) {
              const noResult = document.createElement("div");
              noResult.textContent = "No results";
              noResult.style.padding = "8px";
              noResult.style.color = "var(--text-muted)";
              dropdown.appendChild(noResult);
              return;
            }
            
            filtered.forEach(opt => {
              const item = document.createElement("div");
              item.textContent = opt.label + (opt.type === "named" ? " (Named)" : " (Generic)");
              item.style.padding = "8px";
              item.style.cursor = "pointer";
              item.style.fontSize = "12px";
              item.addEventListener("mouseenter", () => {
                item.style.background = "var(--accent)";
                item.style.color = "white";
              });
              item.addEventListener("mouseleave", () => {
                item.style.background = "";
                item.style.color = "";
              });
              item.addEventListener("click", () => {
                resource.label = opt.label;
                resource.resourceId = opt.id;
                resource.chargeoutRate = opt.sell || 100;
                resource.costRate = opt.cost || 60;
                cleanup();
                renderForm(container, state);
              });
              dropdown.appendChild(item);
            });
          }
          
          function cleanup() {
            if (dropdown.parentNode) dropdown.remove();
            if (input.parentNode) {
              nameLabel.textContent = resource.label;
              resourceRow.replaceChild(nameLabel, input);
            }
          }
          
          input.addEventListener("input", () => {
            updateDropdown(input.value);
          });
          
          input.addEventListener("blur", () => {
            setTimeout(cleanup, 200); // Delay to allow click
          });
          
          input.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
              cleanup();
            }
          });
          
          // Position dropdown
          const rect = resourceRow.getBoundingClientRect();
          dropdown.style.top = rect.bottom + 4 + "px";
          dropdown.style.left = rect.left + "px";
          
          resourceRow.replaceChild(input, nameLabel);
          document.body.appendChild(dropdown);
          input.focus();
          input.select();
          updateDropdown("");
        });
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn";
        removeBtn.textContent = "×";
        removeBtn.style.width = "28px";
        removeBtn.style.padding = "4px";
        removeBtn.addEventListener("click", () => {
          state.resources.splice(idx, 1);
          renderForm(container, state);
        });
        
        resourceRow.appendChild(nameLabel);
        resourceRow.appendChild(editBtn);
        resourceRow.appendChild(removeBtn);
        resourcesSection.appendChild(resourceRow);
      });
      
      summary.appendChild(resourcesSection);
    }
    
    state.tasks.forEach(task => {
      const line = document.createElement("div");
      line.style.fontSize = "11px";
      line.style.color = "var(--text-muted)";
      line.style.marginBottom = "4px";
      line.textContent = `${task.wbsCode}: ${task.name}`;
      summary.appendChild(line);
    });

    content.appendChild(summary);
    container.appendChild(content);
  }

  return { openForNode };
})();
