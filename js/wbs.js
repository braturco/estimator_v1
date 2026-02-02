// wbs.js — Phases, Tasks, Work Items with rollups, totals, and top-level buttons

// Ensure expandedLaborNodes is available (should be from datastore.js)
if (typeof window.expandedLaborNodes === 'undefined') {
  window.expandedLaborNodes = new Set();
}

let selectedNodeId = null;

// ---------------------- selection ----------------------
function selectRow(id) {
  selectedNodeId = id;
  document.querySelectorAll(".wbs-row").forEach(row => {
    row.classList.toggle("wbs-row-selected", row.dataset.id === id);
  });
}

// ---------------------- helpers ------------------------
function findNodeById(list, id) {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children && node.children.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findNodeDepth(list, id, depth = 1) {
  for (const node of list) {
    if (node.id === id) return depth;
    if (node.children && node.children.length) {
      const found = findNodeDepth(node.children, id, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function generateWBSCodes(nodes, prefix = "") {
  nodes.forEach((node, index) => {
    node.code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    if (node.children && node.children.length > 0) {
      generateWBSCodes(node.children, node.code);
    }
  });
}

function addChildById(id) {
  const parent = findNodeById(WBS_DATA, id);
  if (!parent) return;

  const parentDepth = findNodeDepth(WBS_DATA, id);
  if (!parentDepth) return;
  
  const newLevel = parentDepth + 1;
  const name = newLevel === 2 ? "New Task" : "New Subtask";

  parent.children = parent.children || [];
  parent.children.push({
    id: crypto.randomUUID(),
    name,
    code: "",
    directLabour: 0,
    expenses: 0,
    burdened: 0,
    netRevenue: 0,
    grossRevenue: 0,
    nm: 0,
    gm: 0,
    dlm: 0,
    children: []
  });

  generateWBSCodes(WBS_DATA);
  renderWBS();
}

function deleteNode(id) {
  const node = findNodeById(WBS_DATA, id);
  if (!node) return;

  // Check if node has non-zero values
  function hasNonZeroValues(n) {
    if (n.directLabour || n.expenses || n.burdened || n.netRevenue || n.grossRevenue) {
      return true;
    }
    if (n.children && n.children.length > 0) {
      return n.children.some(hasNonZeroValues);
    }
    return false;
  }

  if (hasNonZeroValues(node)) {
    const childrenCount = node.children ? node.children.length : 0;
    const childrenText = childrenCount > 0 ? ` and ${childrenCount} child${childrenCount > 1 ? 'ren' : ''}` : '';
    if (!confirm(`Delete "${node.name}"${childrenText}? This node has non-zero values.`)) {
      return;
    }
  }

  function remove(list) {
    const index = list.findIndex(n => n.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      return true;
    }
    for (const node of list) {
      if (node.children && remove(node.children)) return true;
    }
    return false;
  }

  remove(WBS_DATA);
  selectedNodeId = null;
  generateWBSCodes(WBS_DATA);
  renderWBS();
}

// ---------------------- inline rename ------------------
function startInlineRename(labelEl) {
  const container = labelEl.closest(".wbs-name");
  if (!container) return;

  const id = container.dataset.id;
  const node = findNodeById(WBS_DATA, id);
  if (!node) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = node.name;
  input.className = "wbs-inline-edit";

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  function finish(commit) {
    if (commit) {
      const value = input.value.trim();
      node.name = value || "Untitled";
    }
    renderWBS();
  }

  input.onblur = () => finish(true);
  input.onkeydown = e => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  };
}

// ---------------------- formatting ---------------------
function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString();
}

function formatPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return (n * 100).toFixed(1) + "%";
}

// ---------------------- labor rollup -------------------
function calculateLaborRollup(node, resourceId, type) {
  let total = 0;
  
  function sumChildren(n) {
    if (!n.children || n.children.length === 0) {
      // Leaf node - sum activity hours
      const entry = laborActivities[n.id];
      if (entry && Array.isArray(entry.activities)) {
        entry.activities.forEach(activity => {
          if (activity.hours && activity.hours[resourceId]) {
            total += Number(activity.hours[resourceId][type] || 0);
          }
        });
      }
    } else {
      // Rollup node - recurse
      n.children.forEach(sumChildren);
    }
  }
  
  sumChildren(node);
  return total;
}

// ---------------------- totals -------------------------
function calculateTotals() {
  const totals = {
    directLabour: 0,
    expenses: 0,
    burdened: 0,
    netRevenue: 0,
    grossRevenue: 0,
    nm: 0,
    gm: 0,
    dlm: 0
  };

  function walk(node) {
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) {
      totals.directLabour += Number(node.directLabour || 0);
      totals.expenses += Number(node.expenses || 0);
      totals.burdened += Number(node.burdened || 0);
      totals.netRevenue += Number(node.netRevenue || 0);
      totals.grossRevenue += Number(node.grossRevenue || 0);
      totals.dlm += Number(node.dlm || 0);
    } else {
      node.children.forEach(walk);
    }
  }

  WBS_DATA.forEach(walk);

  if (totals.grossRevenue !== 0) {
    totals.gm = (totals.grossRevenue - totals.burdened - totals.expenses) / totals.grossRevenue;
  } else {
    totals.gm = 0;
  }

  if (totals.netRevenue !== 0) {
    totals.nm = (totals.netRevenue - totals.burdened - totals.expenses) / totals.netRevenue;
  } else {
    totals.nm = 0;
  }

  return totals;
}

function renderTotalsRow() {
  const totalsEl = document.getElementById("wbsTotals");
  if (!totalsEl) return;

  const t = calculateTotals();

  totalsEl.className = "wbs-row wbs-totals-row";
  totalsEl.innerHTML = "";
  
  // Code column
  const codeCell = document.createElement("div");
  totalsEl.appendChild(codeCell);
  
  // Total label
  const labelCell = document.createElement("div");
  labelCell.textContent = "Total";
  totalsEl.appendChild(labelCell);
  
  // Labor columns
  if (window.expandedPricingMethods.labor) {
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? ' odd-resource' : '';
      const regTotal = WBS_DATA.reduce((sum, node) => sum + calculateLaborRollup(node, res.id, "reg"), 0);
      const otTotal = WBS_DATA.reduce((sum, node) => sum + calculateLaborRollup(node, res.id, "ot"), 0);
      
      // Reg cell
      const regCell = document.createElement("div");
      regCell.className = `labor-col-cell${oddClass}`;
      const regWrap = document.createElement("div");
      regWrap.className = "labor-input-wrap";
      const regValue = document.createElement("div");
      regValue.className = "wbs-labor-rollup";
      regValue.textContent = regTotal > 0 ? formatNumber(regTotal) : "";
      const regLabel = document.createElement("span");
      regLabel.className = "labor-input-label";
      regLabel.textContent = "Reg";
      regWrap.appendChild(regValue);
      regWrap.appendChild(regLabel);
      regCell.appendChild(regWrap);
      totalsEl.appendChild(regCell);
      
      // OT cell
      const otCell = document.createElement("div");
      otCell.className = `labor-col-cell${oddClass}`;
      const otWrap = document.createElement("div");
      otWrap.className = "labor-input-wrap";
      const otValue = document.createElement("div");
      otValue.className = "wbs-labor-rollup";
      otValue.textContent = otTotal > 0 ? formatNumber(otTotal) : "";
      const otLabel = document.createElement("span");
      otLabel.className = "labor-input-label";
      otLabel.textContent = "OT";
      otWrap.appendChild(otValue);
      otWrap.appendChild(otLabel);
      otCell.appendChild(otWrap);
      totalsEl.appendChild(otCell);
    });
  }
  
  // Tags column
  const tagsCell = document.createElement("div");
  totalsEl.appendChild(tagsCell);
  
  // Financial columns
  const dlCell = document.createElement("div");
  dlCell.className = "wbs-fin-cell";
  dlCell.textContent = formatMoney(t.directLabour);
  totalsEl.appendChild(dlCell);
  
  const expCell = document.createElement("div");
  expCell.className = "wbs-fin-cell";
  expCell.textContent = formatMoney(t.expenses);
  totalsEl.appendChild(expCell);
  
  const burCell = document.createElement("div");
  burCell.className = "wbs-fin-cell";
  burCell.textContent = formatMoney(t.burdened);
  totalsEl.appendChild(burCell);
  
  const netCell = document.createElement("div");
  netCell.className = "wbs-fin-cell";
  netCell.textContent = formatMoney(t.netRevenue);
  totalsEl.appendChild(netCell);
  
  const grossCell = document.createElement("div");
  grossCell.className = "wbs-fin-cell";
  grossCell.textContent = formatMoney(t.grossRevenue);
  totalsEl.appendChild(grossCell);
  
  const nmCell = document.createElement("div");
  nmCell.className = "wbs-fin-cell";
  nmCell.textContent = formatPercent(t.nm);
  totalsEl.appendChild(nmCell);
  
  const gmCell = document.createElement("div");
  gmCell.className = "wbs-fin-cell";
  gmCell.textContent = formatPercent(t.gm);
  totalsEl.appendChild(gmCell);
  
  const dlmCell = document.createElement("div");
  dlmCell.className = "wbs-fin-cell";
  dlmCell.textContent = formatMoney(t.dlm);
  totalsEl.appendChild(dlmCell);
}

// ---------------------- rendering ----------------------
function renderWBSNode(container, node, level = 1) {
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const collapsed = !!node.collapsed;

	const row = document.createElement("div");
	row.className = "wbs-row";
	row.dataset.id = node.id;
	row.classList.add(`wbs-level-${level}`);
	row.classList.add(`level-${level}`);  // make CSS happy
	row.onclick = () => selectRow(node.id);

  // Accept activity drops for reordering/moving
  if (isLeaf && window.expandedPricingMethods.labor) {
    row.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.style.background = "rgba(96, 165, 250, 0.15)";
      }
    });

    row.addEventListener("dragenter", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        
        // Check if dragging activity from same task - if so, don't show top border (it's confusing)
        try {
          const data = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (data.sourceNodeId === node.id) {
            // Same task - only show background, no top border
            row.style.background = "rgba(96, 165, 250, 0.15)";
            return;
          }
        } catch (err) {
          // Can't parse, show both indicators
        }
        
        row.style.borderTop = "2px solid var(--accent)";
      }
    });

    row.addEventListener("dragleave", (e) => {
      const related = e.relatedTarget;
      // Only clear if leaving to outside the row
      if (!related || !row.contains(related)) {
        row.style.background = "";
        row.style.borderTop = "";
      }
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.style.background = "";
      row.style.borderTop = "";
      
      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (!data.activityId || !data.sourceNodeId) return;

        const targetNodeId = node.id;
        const sourceNodeId = data.sourceNodeId;
        const activityId = data.activityId;

        if (sourceNodeId === targetNodeId) {
          // Same task - reorder (move to end)
          const activities = laborActivities[sourceNodeId].activities;
          const actIndex = activities.findIndex(a => a.id === activityId);
          if (actIndex !== -1) {
            const [movedActivity] = activities.splice(actIndex, 1);
            activities.push(movedActivity);
            renderWBS();
          }
        } else {
          // Different task - prompt for copy or move
          Modal.choice({
            title: "Move or Copy Activity?",
            message: "Choose an action for this activity:",
            choices: [
              { label: "Move", value: "move", primary: true },
              { label: "Copy", value: "copy" },
              { label: "Cancel", value: "cancel" }
            ],
            onChoice: (choice) => {
              if (choice === "cancel") return;
              
              const sourceActivities = laborActivities[sourceNodeId].activities;
              const actIndex = sourceActivities.findIndex(a => a.id === activityId);
              if (actIndex === -1) return;

              const sourceActivity = sourceActivities[actIndex];

              if (!laborActivities[targetNodeId]) {
                laborActivities[targetNodeId] = { activities: [] };
              }

              if (choice === "move") {
                const [movedActivity] = sourceActivities.splice(actIndex, 1);
                laborActivities[targetNodeId].activities.push(movedActivity);
              } else if (choice === "copy") {
                const copiedActivity = JSON.parse(JSON.stringify(sourceActivity));
                copiedActivity.id = crypto.randomUUID();
                copiedActivity.name = sourceActivity.name + " (copy)";
                laborActivities[targetNodeId].activities.push(copiedActivity);
              }

              renderWBS();
            }
          });
        }
      } catch (err) {
        console.error("Drop failed:", err);
      }
    });
  }
  let laborCellsHtml = "";
  if (window.expandedPricingMethods.labor) {
    // Render rollup cells for each resource (hours are entered on activity rows)
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? ' odd-resource' : '';
      const regTotal = calculateLaborRollup(node, res.id, 'reg');
      const otTotal = calculateLaborRollup(node, res.id, 'ot');
      laborCellsHtml += `
        <div class="labor-col-cell${oddClass}">
          <div class="labor-input-wrap">
            <div class="wbs-labor-rollup">${regTotal > 0 ? formatNumber(regTotal) : ''}</div>
            <span class="labor-input-label">Reg</span>
          </div>
        </div>
      `;
      laborCellsHtml += `
        <div class="labor-col-cell${oddClass}">
          <div class="labor-input-wrap">
            <div class="wbs-labor-rollup">${otTotal > 0 ? formatNumber(otTotal) : ''}</div>
            <span class="labor-input-label">OT</span>
          </div>
        </div>
      `;
    });
  }

  const nameClass = hasChildren ? (collapsed ? "wbs-name rollup collapsed" : "wbs-name rollup") : "wbs-name";
  const expandIconHtml = hasChildren ? `<span class="wbs-expand-icon">${collapsed ? '[+]' : '[–]'}</span>` : '<span class="wbs-expand-spacer"></span>';

  row.innerHTML = `
    <div class="wbs-code">${node.code || ""}</div>
	<div class="${nameClass} wbs-indent-${level}" data-id="${node.id}">
	  ${expandIconHtml}
	  <span class="wbs-activity-label">${node.name}</span>
	</div>
    ${laborCellsHtml}
    <div></div>
    <div class="wbs-fin-cell">${formatMoney(node.directLabour)}</div>
    <div class="wbs-fin-cell">${formatMoney(node.expenses)}</div>
    <div class="wbs-fin-cell">${formatMoney(node.burdened)}</div>
    <div class="wbs-fin-cell">${formatMoney(node.netRevenue)}</div>
    <div class="wbs-fin-cell">${formatMoney(node.grossRevenue)}</div>
    <div class="wbs-fin-cell">${formatPercent(node.nm)}</div>
    <div class="wbs-fin-cell">${formatPercent(node.gm)}</div>
    <div class="wbs-fin-cell">${formatMoney(node.dlm)}</div>
  `;

  container.appendChild(row);

  // Add delete button for all nodes (phases, tasks, work items)
  const nameContainer = row.querySelector(".wbs-name");
  if (nameContainer) {
    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "× ";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.marginRight = "8px";
    deleteBtn.style.color = "var(--text-muted)";
    deleteBtn.style.fontSize = "14px";
    deleteBtn.style.opacity = "0.6";
    deleteBtn.title = "Delete";
    deleteBtn.onmouseenter = () => deleteBtn.style.opacity = "1";
    deleteBtn.onmouseleave = () => deleteBtn.style.opacity = "0.6";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteNode(node.id);
    };
    nameContainer.insertBefore(deleteBtn, nameContainer.firstChild);
  }

  // Add pill zones for leaf nodes AFTER row is added to DOM
  if (isLeaf) {
    // Find the tags container - it's the empty div after activity name and labor cells
    const allChildren = row.children;
    const laborCellCount = window.expandedPricingMethods.labor ? laborResources.length * 2 : 0;
    const tagZoneContainerIndex = 2 + laborCellCount; // After code, activity, and labor cells
    const tagZoneContainer = allChildren[tagZoneContainerIndex];

    if (tagZoneContainer) {
      const tagZone = createPillZone(node.id, "tag", "Tags");
      tagZoneContainer.appendChild(tagZone);
    }

    // Render activity rows for this node in labor mode
    if (window.expandedPricingMethods.labor && laborActivities[node.id] && Array.isArray(laborActivities[node.id].activities) && laborActivities[node.id].activities.length > 0) {
      const setActiveActivityRow = (rowEl) => {
        document.querySelectorAll(".wbs-row-active").forEach(el => {
          el.classList.remove("wbs-row-active");
        });
        rowEl.classList.add("wbs-row-active");
      };

      const createLaborInput = (rowEl, value, onChange, label, isOddResource, activityId, resourceId, type) => {
        const wrap = document.createElement("div");
        wrap.className = "labor-col-cell" + (isOddResource ? " odd-resource" : "");

        const inner = document.createElement("div");
        inner.className = "labor-input-wrap";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "wbs-labor-input";
        input.value = value || 0;
        input.dataset.nodeId = node.id;
        input.dataset.activityId = activityId;
        input.dataset.resourceId = resourceId;
        input.dataset.type = type;
        input.addEventListener("input", () => {
          onChange(parseFloat(input.value) || 0);
          // Trigger recalculation after a short delay
          if (window.Calculations && window.Calculations.recalculate) {
            clearTimeout(window._calcTimeout);
            window._calcTimeout = setTimeout(() => {
              window.Calculations.recalculate();
            }, 500);
          }
        });
        input.addEventListener("focus", () => {
          setActiveActivityRow(rowEl);
        });

        const labelEl = document.createElement("span");
        labelEl.className = "labor-input-label";
        labelEl.textContent = label;

        inner.appendChild(input);
        inner.appendChild(labelEl);
        wrap.appendChild(inner);
        return wrap;
      };

      laborActivities[node.id].activities.forEach((activity, activityIndex) => {
        const activityRow = document.createElement("div");
        activityRow.className = "wbs-row labor-activity-row";
        activityRow.dataset.id = `${node.id}-${activity.id}`;
        activityRow.dataset.activityId = activity.id;
        activityRow.dataset.nodeId = node.id;
        activityRow.dataset.activityIndex = activityIndex;
        activityRow.draggable = true;

        activityRow.addEventListener("click", (e) => {
          e.stopPropagation();
          setActiveActivityRow(activityRow);
        });

        // Drag to reorder/move activities
        activityRow.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({
            activityId: activity.id,
            sourceNodeId: node.id
          }));
          e.dataTransfer.effectAllowed = "copyMove";
          activityRow.style.opacity = "0.5";
        });

        activityRow.addEventListener("dragend", (e) => {
          activityRow.style.opacity = "1";
        });

        // Accept drops on activity rows for reordering
        activityRow.addEventListener("dragover", (e) => {
          if (e.dataTransfer.types.includes("text/plain")) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }
        });

        activityRow.addEventListener("dragenter", (e) => {
          if (e.dataTransfer.types.includes("text/plain")) {
            e.preventDefault();
            e.stopPropagation();
            
            // Don't show indicator if dragging over self
            try {
              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
              if (data.activityId === activity.id && data.sourceNodeId === node.id) {
                return; // Same activity, no indicator
              }
            } catch (err) {
              // If we can't parse, show indicator anyway
            }
            
            // Determine if dragging from above or below based on Y position
            const rect = activityRow.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
              // Dragging from above - show top border
              activityRow.style.borderTop = "2px solid var(--accent)";
              activityRow.style.borderBottom = "";
            } else {
              // Dragging from below - show bottom border
              activityRow.style.borderBottom = "2px solid var(--accent)";
              activityRow.style.borderTop = "";
            }
          }
        });

        activityRow.addEventListener("dragleave", (e) => {
          const related = e.relatedTarget;
          // Only clear if leaving to outside the row
          if (!related || !activityRow.contains(related)) {
            e.stopPropagation();
            activityRow.style.borderTop = "";
            activityRow.style.borderBottom = "";
          }
        });

        activityRow.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          activityRow.style.borderTop = "";
          activityRow.style.borderBottom = "";
          
          try {
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            if (!data.activityId || !data.sourceNodeId) return;

            const targetNodeId = node.id;
            const sourceNodeId = data.sourceNodeId;
            const draggedActivityId = data.activityId;
            const targetActivityId = activity.id;

            if (sourceNodeId === targetNodeId) {
              // Same task - reorder
              const activities = laborActivities[sourceNodeId].activities;
              const draggedIndex = activities.findIndex(a => a.id === draggedActivityId);
              const targetIndex = activities.findIndex(a => a.id === targetActivityId);
              
              if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                const [movedActivity] = activities.splice(draggedIndex, 1);
                // If dragging down, adjust target index
                const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
                activities.splice(insertIndex, 0, movedActivity);
                renderWBS();
              }
            } else {
              // Different task - prompt for copy or move
              Modal.choice({
                title: "Move or Copy Activity?",
                message: "Choose an action for this activity:",
                choices: [
                  { label: "Move", value: "move", primary: true },
                  { label: "Copy", value: "copy" },
                  { label: "Cancel", value: "cancel" }
                ],
                onChoice: (choice) => {
                  if (choice === "cancel") return;
                  
                  const sourceActivities = laborActivities[sourceNodeId].activities;
                  const draggedIndex = sourceActivities.findIndex(a => a.id === draggedActivityId);
                  if (draggedIndex === -1) return;

                  const sourceActivity = sourceActivities[draggedIndex];

                  if (!laborActivities[targetNodeId]) {
                    laborActivities[targetNodeId] = { activities: [] };
                  }

                  const targetActivities = laborActivities[targetNodeId].activities;
                  const targetIndex = targetActivities.findIndex(a => a.id === targetActivityId);

                  if (choice === "move") {
                    const [movedActivity] = sourceActivities.splice(draggedIndex, 1);
                    targetActivities.splice(targetIndex, 0, movedActivity);
                  } else if (choice === "copy") {
                    const copiedActivity = JSON.parse(JSON.stringify(sourceActivity));
                    copiedActivity.id = crypto.randomUUID();
                    copiedActivity.name = sourceActivity.name + " (copy)";
                    targetActivities.splice(targetIndex, 0, copiedActivity);
                  }

                  renderWBS();
                }
              });
            }
          } catch (err) {
            console.error("Activity drop failed:", err);
          }
        });

        const codeCell = document.createElement("div");
        codeCell.textContent = "";
        activityRow.appendChild(codeCell);

        const nameCell = document.createElement("div");
        nameCell.className = `wbs-name wbs-indent-${level + 1}`;
        nameCell.dataset.activityId = activity.id;
        
        // Add delete button
        const deleteBtn = document.createElement("span");
        deleteBtn.textContent = "× ";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.marginRight = "8px";
        deleteBtn.style.color = "var(--text-muted)";
        deleteBtn.style.fontSize = "14px";
        deleteBtn.style.opacity = "0.6";
        deleteBtn.title = "Delete activity";
        deleteBtn.onmouseenter = () => deleteBtn.style.opacity = "1";
        deleteBtn.onmouseleave = () => deleteBtn.style.opacity = "0.6";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          // Check if activity has non-zero hours
          let hasHours = false;
          for (const resId in activity.hours) {
            if (activity.hours[resId].reg > 0 || activity.hours[resId].ot > 0) {
              hasHours = true;
              break;
            }
          }
          
          if (hasHours) {
            if (!confirm(`Delete "${activity.name}"? This activity has hours entered.`)) {
              return;
            }
          }
          
          // Remove from activities array
          const actIndex = laborActivities[node.id].activities.findIndex(a => a.id === activity.id);
          if (actIndex !== -1) {
            laborActivities[node.id].activities.splice(actIndex, 1);
            renderWBS();
          }
        };
        
        const label = document.createElement("span");
        label.className = "wbs-activity-label";
        label.textContent = activity.name;
        label.ondblclick = (e) => {
          e.stopPropagation();
          const input = document.createElement("input");
          input.type = "text";
          input.value = activity.name;
          input.className = "wbs-inline-edit";
          label.replaceWith(input);
          input.focus();
          input.select();
          const finish = (commit) => {
            if (commit) {
              const value = input.value.trim();
              activity.name = value || "Untitled";
            }
            renderWBS();
          };
          input.onblur = () => finish(true);
          input.onkeydown = e => {
            if (e.key === "Enter") finish(true);
            if (e.key === "Escape") finish(false);
          };
        };
        
        nameCell.appendChild(deleteBtn);
        nameCell.appendChild(label);
        activityRow.appendChild(nameCell);

        laborResources.forEach((res, idx) => {
          if (!activity.hours[res.id]) {
            activity.hours[res.id] = { reg: 0, ot: 0 };
          }

          const isOdd = (idx % 2 === 1);
          const regInput = createLaborInput(activityRow, activity.hours[res.id].reg, (val) => {
            activity.hours[res.id].reg = val;
          }, "Reg", isOdd, activity.id, res.id, "reg");
          const otInput = createLaborInput(activityRow, activity.hours[res.id].ot, (val) => {
            activity.hours[res.id].ot = val;
          }, "OT", isOdd, activity.id, res.id, "ot");

          activityRow.appendChild(regInput);
          activityRow.appendChild(otInput);
        });

        const tagsCell = document.createElement("div");
        activityRow.appendChild(tagsCell);

        // Calculate financial values for this activity
        async function calculateActivityFinancials() {
          let directLaborReg = 0;
          let directLaborOT = 0;
          let revenue = 0;

          for (const columnId in activity.hours) {
            const hours = activity.hours[columnId];
            const regHours = Number(hours.reg || 0);
            const otHours = Number(hours.ot || 0);

            if (regHours === 0 && otHours === 0) continue;

            const resource = laborResources.find(r => r.id === columnId);
            if (!resource) continue;

            // Get rates (check overrides first)
            let costRegular, costOT, sellRegular, sellOT;
            
            if (resource.overrideCostReg !== undefined || resource.overrideSellReg !== undefined) {
              costRegular = resource.overrideCostReg !== undefined ? resource.overrideCostReg : resource.costRate || 60;
              costOT = resource.overrideCostOT !== undefined ? resource.overrideCostOT : (costRegular * 1.5);
              sellRegular = resource.overrideSellReg !== undefined ? resource.overrideSellReg : resource.chargeoutRate || 120;
              sellOT = resource.overrideSellOT !== undefined ? resource.overrideSellOT : (sellRegular * 1.5);
            } else {
              const actualResourceId = resource.resourceId || columnId;
              try {
                const rates = await Rates.getRates(actualResourceId);
                if (rates) {
                  costRegular = rates.costRegular;
                  costOT = rates.costOT;
                  sellRegular = rates.sellRegular;
                  sellOT = rates.sellOT;
                } else {
                  continue;
                }
              } catch (err) {
                continue;
              }
            }

            directLaborReg += regHours * costRegular;
            directLaborOT += otHours * costOT;
            revenue += regHours * sellRegular + otHours * sellOT;
          }

          const directLabor = directLaborReg + directLaborOT;
          
          // Apply OH/burden using component rates
          const ohRegRate = window.getTotalOHRate ? window.getTotalOHRate('regular') : 1.10;
          const ohOTRate = window.getTotalOHRate ? window.getTotalOHRate('overtime') : 1.10;
          const burdenedLabor = directLaborReg * (1 + ohRegRate) + directLaborOT * (1 + ohOTRate);

          const expenses = 0; // Activities don't have expenses
          const netRevenue = revenue;
          const grossRevenue = netRevenue * (node.gmMultiplier || 1.15);
          
          const nm = netRevenue > 0 ? (netRevenue - burdenedLabor - expenses) / netRevenue : 0;
          const gm = grossRevenue > 0 ? (grossRevenue - burdenedLabor - expenses) / grossRevenue : 0;
          const dlm = directLabor > 0 ? (revenue - burdenedLabor) : 0;

          return { directLabor, expenses, burdenedLabor, netRevenue, grossRevenue, nm, gm, dlm };
        }

        // Add financial cells with calculated values
        const finCells = [];
        calculateActivityFinancials().then(financials => {
          finCells[0].textContent = formatMoney(financials.directLabor);
          finCells[1].textContent = formatMoney(financials.expenses);
          finCells[2].textContent = formatMoney(financials.burdenedLabor);
          finCells[3].textContent = formatMoney(financials.netRevenue);
          finCells[4].textContent = formatMoney(financials.grossRevenue);
          finCells[5].textContent = formatPercent(financials.nm);
          finCells[6].textContent = formatPercent(financials.gm);
          finCells[7].textContent = formatMoney(financials.dlm);
        });

        const finCellCount = 8;
        for (let i = 0; i < finCellCount; i++) {
          const finCell = document.createElement("div");
          finCell.className = "wbs-fin-cell";
          finCell.textContent = "";
          finCell.style.fontStyle = "italic";
          finCell.style.color = "var(--text-muted)";
          activityRow.appendChild(finCell);
          finCells.push(finCell);
        }

        container.appendChild(activityRow);
      });
    }
    
    // Check if labor is expanded for this node
    if (expandedLaborNodes.has(node.id) && wbsPills[node.id] && wbsPills[node.id].estimateType && wbsPills[node.id].estimateType.includes("labor")) {
      console.log(`✅ Labor expanded for node ${node.id}, rendering expansion`);
      // Add labor expansion row
      const expansionRow = document.createElement("div");
      expansionRow.className = "wbs-row labor-expansion-row";
      expansionRow.dataset.id = node.id + "-labor-expansion";
      container.appendChild(expansionRow);
      
      // Render the expansion UI
      LaborExpansion.renderExpansion(expansionRow, node.id, node);
    }
  }

  const expandIcon = row.querySelector(".wbs-expand-icon");
  if (expandIcon && hasChildren) {
    expandIcon.onclick = e => {
      e.stopPropagation();
      node.collapsed = !node.collapsed;
      renderWBS();
    };
  }

  const labelEl = row.querySelector(".wbs-activity-label");
  if (labelEl) {
    labelEl.ondblclick = e => {
      e.stopPropagation();
      startInlineRename(labelEl);
    };
  }

  if (hasChildren && !collapsed) {
    node.children.forEach(child => renderWBSNode(container, child, level + 1));
  }
}

function renderWBS() {
  const container = document.getElementById("wbsContainer");
  if (!container) return;

  // Auto-select labor input text on focus
  if (!container._laborFocusHandlerAttached) {
    container.addEventListener("focusin", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const raw = target.value.replace(/[^0-9.-]/g, "");
        if (raw !== target.value) {
          target.value = raw;
        }
        target.select();
      }
    });
    
    container.addEventListener("keydown", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const key = e.key;
        
        // Excel-like navigation
        if (key === "Tab" || key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowDown") {
          e.preventDefault();
          
          const allInputs = Array.from(container.querySelectorAll(".wbs-labor-input"));
          const currentIndex = allInputs.indexOf(target);
          
          let nextIndex = currentIndex;
          const inputsPerRow = laborResources.length * 2; // reg + ot per resource
          
          if (key === "Tab" || key === "ArrowRight") {
            nextIndex = currentIndex + 1;
          } else if (key === "ArrowLeft") {
            nextIndex = currentIndex - 1;
          } else if (key === "ArrowDown") {
            nextIndex = currentIndex + inputsPerRow;
          } else if (key === "ArrowUp") {
            nextIndex = currentIndex - inputsPerRow;
          }
          
          // Bounds check
          if (nextIndex >= 0 && nextIndex < allInputs.length) {
            const nextInput = allInputs[nextIndex];
            container._laborPendingFocus = {
              nodeId: nextInput.dataset.nodeId,
              activityId: nextInput.dataset.activityId || null,
              resourceId: nextInput.dataset.resourceId,
              type: nextInput.dataset.type
            };
            nextInput.focus();
            nextInput.select();
          }
        }
      }
    });
    
    container.addEventListener("focusout", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const raw = target.value.replace(/[^0-9.-]/g, "");
        const num = raw === "" ? 0 : Number(raw);
        
        // Save to data structure
        const nodeId = target.dataset.nodeId;
        const resourceId = target.dataset.resourceId;
        const type = target.dataset.type;
        
        if (nodeId && resourceId && type) {
          const activityId = target.dataset.activityId;
          if (!laborActivities[nodeId]) {
            laborActivities[nodeId] = { activities: [] };
          }
          if (activityId) {
            const activity = laborActivities[nodeId].activities.find(a => a.id === activityId);
            if (activity) {
              if (!activity.hours[resourceId]) {
                activity.hours[resourceId] = { reg: 0, ot: 0 };
              }
              activity.hours[resourceId][type] = num;
            }
          }
        }
        
        if (Number.isFinite(num)) {
          target.value = new Intl.NumberFormat().format(num);
        }
        // Trigger calculations without re-rendering to preserve focus
        if (window.Calculations && window.Calculations.recalculate) {
          clearTimeout(window._calcTimeout);
          window._calcTimeout = setTimeout(() => {
            window.Calculations.recalculate();
          }, 300);
        }
      }
    });
    container._laborFocusHandlerAttached = true;
  }

  container.innerHTML = "";

  // Build column layout based on pricing methods
  let columnTemplate = `
    <div class="col-header" data-col="0">WBS<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="1">Activity<div class="col-resize-handle"></div></div>
  `;

  // Add labor resource columns if expanded
  if (window.expandedPricingMethods.labor) {
    laborResources.forEach((res, idx) => {
      const headerOddClass = (idx % 2 === 1) ? " odd-resource-col" : "";
      const hasOverride = res.overrideCostReg !== undefined || res.overrideCostOT !== undefined || 
                          res.overrideSellReg !== undefined || res.overrideSellOT !== undefined;
      const overrideIndicator = hasOverride ? " <span style='color: var(--accent); font-weight: 700;'>*</span>" : "";
      const titleAttr = hasOverride ? "title='Has rate overrides. Right-click to edit.'" : "title='Double-click to change, right-click for rate overrides'";
      
      // Show expander toggle on each resource
      const expandIcon = showResourceRates ? "▼" : "▶";
      const expanderHtml = `<span class="resourceRateToggle" style="cursor: pointer; margin-right: 6px; font-size: 10px;" title="Toggle rate details">${expandIcon}</span>`;
      
      columnTemplate += `
        <div class="col-header resource-header${headerOddClass}" data-resource-id="${res.id}" draggable="true" style="text-align: center; font-size: 11px; grid-column: span 2; cursor: pointer; user-select: none;" ${titleAttr}>
          ${expanderHtml}${res.name}${overrideIndicator}
        </div>
      `;
    });
    
    if (laborResources.length === 0) {
      columnTemplate += `<div class="col-header" style="text-align: center; font-size: 10px; font-style: italic; color: var(--text-muted);">No resources</div>`;
    }
  }

  columnTemplate += `
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 2 + laborResources.length * 2 : 2}">Tags<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 3 + laborResources.length * 2 : 3}">Direct Labour<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 4 + laborResources.length * 2 : 4}">Expenses<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 5 + laborResources.length * 2 : 5}">Burdened<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 6 + laborResources.length * 2 : 6}">Net Revenue<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 7 + laborResources.length * 2 : 7}">Gross Revenue<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 8 + laborResources.length * 2 : 8}">NM%<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 9 + laborResources.length * 2 : 9}">GM%<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="${window.expandedPricingMethods.labor ? 10 + laborResources.length * 2 : 10}">DLM<div class="col-resize-handle"></div></div>
  `;

  // Build CSS column template
  let columnWidth = "100px 260px"; // WBS, Activity
  if (window.expandedPricingMethods.labor) {
    for (let i = 0; i < laborResources.length; i++) {
      columnWidth += " 75px 75px";
    }
  }
  columnWidth += " 160px 120px 120px 120px 120px 120px 90px 90px 90px";
  container.style.setProperty("--wbs-columns", columnWidth);

  const headerRow = document.createElement("div");
  headerRow.className = "wbs-row wbs-header";
  headerRow.innerHTML = columnTemplate;
  container.appendChild(headerRow);

  // Wire up resource rate toggles - all of them
  if (window.expandedPricingMethods.labor) {
    const rateToggles = headerRow.querySelectorAll(".resourceRateToggle");
    rateToggles.forEach(toggle => {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        showResourceRates = !showResourceRates;
        renderWBS();
      });
    });
  }

  // Add rate detail rows if resources are expanded
  if (window.expandedPricingMethods.labor && showResourceRates) {
    const rateDetailRow = document.createElement("div");
    rateDetailRow.className = "wbs-row wbs-rate-detail-row";
    rateDetailRow.style.fontSize = "10px";
    rateDetailRow.style.background = "var(--bg-hover)";
    rateDetailRow.style.borderBottom = "1px solid var(--border)";
    rateDetailRow.style.position = "sticky";
    rateDetailRow.style.top = "28px";
    rateDetailRow.style.zIndex = "9";
    
    let rateDetailHTML = `
      <div></div>
      <div style="padding-left: 8px; font-style: italic; color: var(--text-muted);">Rates:</div>
    `;
    
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? " odd-resource" : "";
      const hasOverride = res.overrideCostReg !== undefined || res.overrideCostOT !== undefined;
      const overrideStyle = hasOverride ? " color: var(--accent); font-weight: 600;" : "";
      const overrideIndicator = hasOverride ? " *" : "";
      
      const costReg = res.overrideCostReg !== undefined ? res.overrideCostReg : (res.costRate || 0);
      const costOT = res.overrideCostOT !== undefined ? res.overrideCostOT : ((res.costRate || 0) * 1.5);
      
      rateDetailHTML += `
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Cost</div>
          <div style="font-weight: 500;${overrideStyle}">$${costReg.toFixed(0)}${overrideIndicator}</div>
        </div>
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Cost OT</div>
          <div style="font-weight: 500;${overrideStyle}">$${costOT.toFixed(0)}${overrideIndicator}</div>
        </div>
      `;
    });
    
    // Empty cells for remaining columns
    rateDetailHTML += `<div></div>`.repeat(9);
    
    rateDetailRow.innerHTML = rateDetailHTML;
    container.appendChild(rateDetailRow);
    
    // Second row for sell rates
    const sellRateRow = document.createElement("div");
    sellRateRow.className = "wbs-row wbs-rate-detail-row";
    sellRateRow.style.fontSize = "10px";
    sellRateRow.style.background = "var(--bg-hover)";
    sellRateRow.style.borderBottom = "2px solid var(--border)";
    sellRateRow.style.position = "sticky";
    sellRateRow.style.top = "56px";
    sellRateRow.style.zIndex = "9";
    
    let sellRateHTML = `
      <div></div>
      <div></div>
    `;
    
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? " odd-resource" : "";
      const hasOverride = res.overrideSellReg !== undefined || res.overrideSellOT !== undefined;
      const overrideStyle = hasOverride ? " font-weight: 700;" : "";
      const overrideIndicator = hasOverride ? " *" : "";
      
      const sellReg = res.overrideSellReg !== undefined ? res.overrideSellReg : (res.chargeoutRate || 0);
      const sellOT = res.overrideSellOT !== undefined ? res.overrideSellOT : ((res.chargeoutRate || 0) * 1.5);
      
      sellRateHTML += `
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Sell</div>
          <div style="font-weight: 500; color: var(--accent);${overrideStyle}">$${sellReg.toFixed(0)}${overrideIndicator}</div>
        </div>
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Sell OT</div>
          <div style="font-weight: 500; color: var(--accent);${overrideStyle}">$${sellOT.toFixed(0)}${overrideIndicator}</div>
        </div>
      `;
    });
    
    sellRateHTML += `<div></div>`.repeat(9);
    
    sellRateRow.innerHTML = sellRateHTML;
    container.appendChild(sellRateRow);
  }

  if (window.expandedPricingMethods.labor) {
    const headers = Array.from(container.querySelectorAll(".resource-header[data-resource-id]"));
    headers.forEach((header) => {
      // Right-click for rate override
      header.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const resourceId = header.dataset.resourceId;
        const resource = laborResources.find(r => r.id === resourceId);
        if (!resource) return;
        
        openRateOverrideModal(resource);
      });
      
      // Double-click to change resource
      header.addEventListener("dblclick", async (e) => {
        console.log("🔍 Double-click detected on resource header", e.target, e.currentTarget);
        e.preventDefault();
        e.stopPropagation();
        
        // Don't trigger if clicking on the expander
        if (e.target.classList && e.target.classList.contains("resource-expand-toggle")) {
          console.log("❌ Clicked on expander, ignoring");
          return;
        }
        
        // Use currentTarget to get the header element itself
        const resourceId = e.currentTarget.dataset.resourceId;
        console.log("🎯 Opening resource picker for:", resourceId);
        const resourceIndex = laborResources.findIndex(r => r.id === resourceId);
        if (resourceIndex === -1) {
          console.log("❌ Resource not found");
          return;
        }
        
        console.log("✅ Opening modal...");
        
        // Open resource picker
        const resourcesData = await Rates.listResources();
        const allOptions = [
          ...resourcesData.generic.map(r => ({ ...r, type: "generic" })),
          ...resourcesData.named.map(r => ({ ...r, type: "named" }))
        ];
        
        Modal.open({
          title: "Change Resource",
          content: (container) => {
            container.innerHTML = "";
            container.style.padding = "12px";
            
            const searchLabel = document.createElement("div");
            searchLabel.textContent = "Search resources:";
            searchLabel.style.marginBottom = "8px";
            searchLabel.style.fontWeight = "600";
            searchLabel.style.fontSize = "12px";
            
            const searchInput = document.createElement("input");
            searchInput.type = "text";
            searchInput.placeholder = "Type to filter...";
            searchInput.style.width = "100%";
            searchInput.style.padding = "8px";
            searchInput.style.marginBottom = "12px";
            searchInput.style.border = "1px solid var(--border)";
            searchInput.style.borderRadius = "4px";
            searchInput.style.background = "var(--bg)";
            searchInput.style.color = "var(--text)";
            searchInput.style.fontSize = "13px";
            
            const listContainer = document.createElement("div");
            listContainer.style.maxHeight = "400px";
            listContainer.style.overflowY = "auto";
            listContainer.style.border = "1px solid var(--border)";
            listContainer.style.borderRadius = "4px";
            
            function renderList(filter = "") {
              listContainer.innerHTML = "";
              const filtered = allOptions.filter(r => 
                r.label.toLowerCase().includes(filter.toLowerCase())
              );
              
              if (filtered.length === 0) {
                listContainer.innerHTML = "<div style='padding: 20px; text-align: center; color: var(--text-muted);'>No resources found</div>";
                return;
              }
              
              filtered.forEach(resource => {
                const item = document.createElement("div");
                item.style.padding = "10px 12px";
                item.style.borderBottom = "1px solid var(--border-muted)";
                item.style.cursor = "pointer";
                item.style.transition = "background 0.15s";
                
                const name = document.createElement("div");
                name.textContent = resource.label;
                name.style.fontWeight = "500";
                name.style.fontSize = "13px";
                
                const details = document.createElement("div");
                details.textContent = `${resource.type === "generic" ? "Generic" : "Named"} • Cost: $${resource.cost}/hr • Sell: $${resource.sell}/hr`;
                details.style.fontSize = "11px";
                details.style.color = "var(--text-muted)";
                details.style.marginTop = "2px";
                
                item.appendChild(name);
                item.appendChild(details);
                
                item.addEventListener("mouseenter", () => {
                  item.style.background = "var(--bg-hover)";
                });
                
                item.addEventListener("mouseleave", () => {
                  item.style.background = "";
                });
                
                item.addEventListener("click", () => {
                  // Update the resource
                  laborResources[resourceIndex] = {
                    ...laborResources[resourceIndex],
                    name: resource.label,
                    resourceId: resource.id,
                    chargeoutRate: resource.sell,
                    costRate: resource.cost
                  };
                  renderWBS();
                  Modal.close();
                });
                
                listContainer.appendChild(item);
              });
            }
            
            searchInput.addEventListener("input", () => {
              renderList(searchInput.value);
            });
            
            container.appendChild(searchLabel);
            container.appendChild(searchInput);
            container.appendChild(listContainer);
            
            renderList();
            
            // Focus search input
            setTimeout(() => searchInput.focus(), 100);
          },
          onSave: null,
          onClose: () => Modal.close()
        });
      });
      
      header.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", header.dataset.resourceId || "");
        e.dataTransfer.effectAllowed = "move";
      });

      header.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      header.addEventListener("dragenter", (e) => {
        e.preventDefault();
        header.style.borderLeft = "3px solid var(--accent)";
      });

      header.addEventListener("dragleave", (e) => {
        const related = e.relatedTarget;
        // Only clear if leaving to outside the header
        if (!related || !header.contains(related)) {
          header.style.borderLeft = "";
        }
      });

      header.addEventListener("drop", (e) => {
        e.preventDefault();
        header.style.borderLeft = "";
        const fromId = e.dataTransfer.getData("text/plain");
        const toId = header.dataset.resourceId;
        if (!fromId || !toId || fromId === toId) return;
        const fromIndex = laborResources.findIndex(r => r.id === fromId);
        const toIndex = laborResources.findIndex(r => r.id === toId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [moved] = laborResources.splice(fromIndex, 1);
        laborResources.splice(toIndex, 0, moved);
        renderWBS();
      });
    });
  }

  WBS_DATA.forEach(node => renderWBSNode(container, node, 1));

  const totalsRow = document.createElement("div");
  totalsRow.id = "wbsTotals";
  totalsRow.className = "wbs-row wbs-totals-row";
  container.appendChild(totalsRow);

  renderTotalsRow();

  requestAnimationFrame(() => {
    if (typeof enableColumnResizing === "function") {
      enableColumnResizing(".wbs-header");
    }
    const pending = container._laborPendingFocus;
    if (pending) {
      container._laborPendingFocus = null;
      const activitySelector = pending.activityId ? `[data-activity-id="${pending.activityId}"]` : "";
      const selector = `.wbs-labor-input[data-node-id="${pending.nodeId}"]${activitySelector}[data-resource-id="${pending.resourceId}"][data-type="${pending.type}"]`;
      const el = container.querySelector(selector);
      if (el) {
        el.focus();
        el.select();
      }
    }
  });

  if (typeof scheduleAutosave === "function") {
    scheduleAutosave();
  }
}

// ---------------------- top-level buttons --------------
function wireTopButtons() {
  const phaseBtn = document.getElementById("addPhaseBtn");
  const taskBtn = document.getElementById("addTaskBtn");
  const laborResourcesToggle = document.getElementById("laborResourcesToggle");
  const addResourceBtn = document.getElementById("addResourceBtn");
  const addActivityBtn = document.getElementById("addActivityBtn");
  const expensesToggle = document.getElementById("expensesToggle");
  const addExpenseBtn = document.getElementById("addExpenseBtn");
  const usagesToggle = document.getElementById("usagesToggle");
  const addUsageBtn = document.getElementById("addUsageBtn");
  const resourceManagerBtn = document.getElementById("resourceManagerBtn");
  const toolbar = document.querySelector(".wbs-toolbar");

  if (phaseBtn) {
    phaseBtn.onclick = () => {
      WBS_DATA.push({
        id: crypto.randomUUID(),
        name: "New Phase",
        level: 1,
        code: String(WBS_DATA.length + 1),
        directLabour: 0,
        expenses: 0,
        burdened: 0,
        netRevenue: 0,
        grossRevenue: 0,
        nm: 0,
        gm: 0,
        dlm: 0,
        children: []
      });
      renderWBS();
    };
  }

  if (taskBtn) {
    taskBtn.onclick = () => {
      if (!selectedNodeId) return;
      addChildById(selectedNodeId);
    };
  }

  if (laborResourcesToggle) {
    laborResourcesToggle.onclick = () => {
      window.expandedPricingMethods.labor = !window.expandedPricingMethods.labor;
      
      // Update button icon
      laborResourcesToggle.textContent = (window.expandedPricingMethods.labor ? "⊟" : "⊞") + " Labor";
      
      // Initialize labor data if expanding for first time
      if (window.expandedPricingMethods.labor && laborResources.length === 0) {
        laborResources.push({
          id: crypto.randomUUID(),
          name: "Resource 1",
          resourceId: "p5-professional",
          chargeoutRate: 100,
          costRate: 60
        });
      }
      
      // Show/hide resource and activity buttons
      if (addResourceBtn) {
        addResourceBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
      }
      if (addActivityBtn) {
        addActivityBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  if (expensesToggle) {
    expensesToggle.onclick = () => {
      window.expandedPricingMethods.expense = !window.expandedPricingMethods.expense;
      
      // Update button icon
      expensesToggle.textContent = (window.expandedPricingMethods.expense ? "⊟" : "⊞") + " Expenses";
      
      // Show/hide expense button
      if (addExpenseBtn) {
        addExpenseBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  if (usagesToggle) {
    usagesToggle.onclick = () => {
      window.expandedPricingMethods.usages = !window.expandedPricingMethods.usages;
      
      // Update button icon
      usagesToggle.textContent = (window.expandedPricingMethods.usages ? "⊟" : "⊞") + " Usages";
      
      // Show/hide usage button
      if (addUsageBtn) {
        addUsageBtn.style.display = window.expandedPricingMethods.usages ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  if (addResourceBtn) {
    addResourceBtn.onclick = async () => {
      // Open resource picker modal
      const resourcesData = await Rates.listResources();
      const allOptions = [
        ...resourcesData.generic.map(r => ({ ...r, type: "generic" })),
        ...resourcesData.named.map(r => ({ ...r, type: "named" }))
      ];
      
      Modal.open({
        title: "Add Resource to Labor Mode",
        content: (container) => {
          container.innerHTML = "";
          container.style.padding = "12px";
          
          const searchLabel = document.createElement("div");
          searchLabel.textContent = "Search resources:";
          searchLabel.style.marginBottom = "8px";
          searchLabel.style.fontWeight = "600";
          searchLabel.style.fontSize = "12px";
          
          const searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Type to filter...";
          searchInput.style.width = "100%";
          searchInput.style.padding = "8px";
          searchInput.style.marginBottom = "12px";
          searchInput.style.border = "1px solid var(--border)";
          searchInput.style.borderRadius = "4px";
          searchInput.style.background = "var(--bg)";
          searchInput.style.color = "var(--text)";
          searchInput.style.fontSize = "13px";
          
          const listContainer = document.createElement("div");
          listContainer.style.maxHeight = "400px";
          listContainer.style.overflowY = "auto";
          listContainer.style.border = "1px solid var(--border)";
          listContainer.style.borderRadius = "4px";
          
          function renderList(filter = "") {
            listContainer.innerHTML = "";
            const filtered = allOptions.filter(r => 
              r.label.toLowerCase().includes(filter.toLowerCase())
            );
            
            if (filtered.length === 0) {
              listContainer.innerHTML = "<div style='padding: 20px; text-align: center; color: var(--text-muted);'>No resources found</div>";
              return;
            }
            
            filtered.forEach(resource => {
              const item = document.createElement("div");
              item.style.padding = "10px 12px";
              item.style.borderBottom = "1px solid var(--border-muted)";
              item.style.cursor = "pointer";
              item.style.transition = "background 0.15s";
              
              const name = document.createElement("div");
              name.textContent = resource.label;
              name.style.fontWeight = "500";
              name.style.fontSize = "13px";
              
              const details = document.createElement("div");
              details.textContent = `${resource.type === "generic" ? "Generic" : "Named"} • Cost: $${resource.cost}/hr • Sell: $${resource.sell}/hr`;
              details.style.fontSize = "11px";
              details.style.color = "var(--text-muted)";
              details.style.marginTop = "2px";
              
              item.appendChild(name);
              item.appendChild(details);
              
              item.addEventListener("mouseenter", () => {
                item.style.background = "var(--bg-hover)";
              });
              
              item.addEventListener("mouseleave", () => {
                item.style.background = "";
              });
              
              item.addEventListener("click", () => {
                // Add the selected resource to laborResources
                laborResources.push({
                  id: crypto.randomUUID(),
                  name: resource.label,
                  resourceId: resource.id,
                  chargeoutRate: resource.sell,
                  costRate: resource.cost
                });
                renderWBS();
                Modal.close();
              });
              
              listContainer.appendChild(item);
            });
          }
          
          searchInput.addEventListener("input", () => {
            renderList(searchInput.value);
          });
          
          container.appendChild(searchLabel);
          container.appendChild(searchInput);
          container.appendChild(listContainer);
          
          renderList();
          
          // Focus search input
          setTimeout(() => searchInput.focus(), 100);
        },
        onSave: null, // No save button needed - click to select
        onClose: () => Modal.close()
      });
    };

    addResourceBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
  }

  if (addActivityBtn) {
    addActivityBtn.onclick = () => {
      if (!selectedNodeId) return;
      if (!laborActivities[selectedNodeId]) {
        laborActivities[selectedNodeId] = { activities: [] };
      }
      if (!Array.isArray(laborActivities[selectedNodeId].activities)) {
        laborActivities[selectedNodeId].activities = [];
      }
      const nextIndex = laborActivities[selectedNodeId].activities.length + 1;
      laborActivities[selectedNodeId].activities.push({
        id: crypto.randomUUID(),
        name: `Activity ${nextIndex}`,
        hours: {}
      });
      renderWBS();
    };

    addActivityBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
  }

  if (addExpenseBtn) {
    addExpenseBtn.onclick = () => {
      if (!selectedNodeId) return;
      alert("Expense functionality coming soon!");
      // TODO: Implement expense form/modal
    };
    addExpenseBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
  }

  if (addUsageBtn) {
    addUsageBtn.onclick = () => {
      if (!selectedNodeId) return;
      alert("Usage/Unit functionality coming soon!");
      // TODO: Implement usage form/modal
    };
    addUsageBtn.style.display = window.expandedPricingMethods.usages ? "inline-flex" : "none";
  }

  if (resourceManagerBtn) {
    resourceManagerBtn.onclick = () => {
      ResourceManager.openManager();
    };
  }
}

// Rate Override Modal
function openRateOverrideModal(resource) {
  Modal.open({
    title: `Rate Override - ${resource.name}`,
    content: (container) => {
      container.innerHTML = "";
      container.style.padding = "8px 10px";
      container.style.maxWidth = "340px";
      container.style.fontSize = "10px";

      // Get default rates
      const defaultCostReg = resource.costRate || 60;
      const defaultCostOT = (resource.costRate || 60) * 1.5;
      const defaultSellReg = resource.chargeoutRate || 120;
      const defaultSellOT = (resource.chargeoutRate || 120) * 1.5;

      // Helper to create compact input field
      function createRateInput(label, defaultValue, overrideValue) {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "80px 60px 70px";
        row.style.gap = "4px";
        row.style.alignItems = "center";
        row.style.marginBottom = "4px";

        const labelEl = document.createElement("label");
        labelEl.textContent = label;
        labelEl.style.fontSize = "9px";
        labelEl.style.color = "var(--text-muted)";

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.min = "0";
        input.value = overrideValue !== undefined ? overrideValue : "";
        input.placeholder = defaultValue.toFixed(0);
        input.style.width = "100%";
        input.style.padding = "2px 4px";
        input.style.border = "1px solid var(--border)";
        input.style.borderRadius = "3px";
        input.style.background = "var(--bg)";
        input.style.color = "var(--text)";
        input.style.fontSize = "9px";

        const defaultNote = document.createElement("span");
        defaultNote.textContent = `($${defaultValue.toFixed(0)})`;
        defaultNote.style.fontSize = "8px";
        defaultNote.style.color = "var(--text-muted)";

        row.appendChild(labelEl);
        row.appendChild(input);
        row.appendChild(defaultNote);

        return { row, input };
      }

      // Cost rates section
      const costTitle = document.createElement("div");
      costTitle.textContent = "Cost";
      costTitle.style.fontSize = "10px";
      costTitle.style.fontWeight = "600";
      costTitle.style.marginBottom = "3px";
      costTitle.style.paddingBottom = "2px";
      costTitle.style.borderBottom = "1px solid var(--border)";
      container.appendChild(costTitle);

      const { row: costRegRow, input: costRegInput } = createRateInput("Reg:", defaultCostReg, resource.overrideCostReg);
      container.appendChild(costRegRow);

      const { row: costOTRow, input: costOTInput } = createRateInput("OT:", defaultCostOT, resource.overrideCostOT);
      container.appendChild(costOTRow);

      // Sell rates section
      const sellTitle = document.createElement("div");
      sellTitle.textContent = "Sell";
      sellTitle.style.fontSize = "10px";
      sellTitle.style.fontWeight = "600";
      sellTitle.style.marginTop = "6px";
      sellTitle.style.marginBottom = "3px";
      sellTitle.style.paddingBottom = "2px";
      sellTitle.style.borderBottom = "1px solid var(--border)";
      container.appendChild(sellTitle);

      const { row: sellRegRow, input: sellRegInput } = createRateInput("Reg:", defaultSellReg, resource.overrideSellReg);
      container.appendChild(sellRegRow);

      const { row: sellOTRow, input: sellOTInput } = createRateInput("OT:", defaultSellOT, resource.overrideSellOT);
      container.appendChild(sellOTRow);

      // Clear button
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear";
      clearBtn.className = "btn btn-secondary";
      clearBtn.style.marginTop = "6px";
      clearBtn.style.padding = "2px 8px";
      clearBtn.style.fontSize = "9px";
      clearBtn.addEventListener("click", () => {
        costRegInput.value = "";
        costOTInput.value = "";
        sellRegInput.value = "";
        sellOTInput.value = "";
      });
      container.appendChild(clearBtn);

      // Save callback
      container._saveCallback = () => {
        // Save overrides (undefined if empty string)
        resource.overrideCostReg = costRegInput.value ? parseFloat(costRegInput.value) : undefined;
        resource.overrideCostOT = costOTInput.value ? parseFloat(costOTInput.value) : undefined;
        resource.overrideSellReg = sellRegInput.value ? parseFloat(sellRegInput.value) : undefined;
        resource.overrideSellOT = sellOTInput.value ? parseFloat(sellOTInput.value) : undefined;

        console.log("✅ Rate overrides saved for", resource.name, resource);
        
        // Trigger recalculation
        if (window.Calculations && window.Calculations.recalculate) {
          window.Calculations.recalculate();
        } else {
          renderWBS();
        }
        
        Modal.close();
      };
    },
    onSave: (container) => {
      if (container._saveCallback) {
        container._saveCallback();
      }
    }
  });
}

// ---------------------- expose / init ------------------
window.renderWBS = renderWBS;
window.wireTopButtons = wireTopButtons;
