// Create a draggable palette pill
window.createPalettePill = function (item) {
  const pill = document.createElement("div");
  pill.className = "pill";
  pill.textContent = item.label;
  pill.dataset.id = item.id;
  pill.dataset.category = item.category;
  pill.draggable = true;

  pill.addEventListener("dragstart", (e) => {
	e.dataTransfer.setData("text/plain", JSON.stringify({
	  id: item.id,
	  category: item.category
	}));
    e.dataTransfer.effectAllowed = "copy";
  });

  return pill;
};

// Find metadata for a pill by category + id
window.findPillMeta = function (category, id) {
  if (category === "estimateType") return EstimateTypeRegistry.find(p => p.id === id);
  if (category === "tag") return TagRegistry.find(p => p.id === id);
  if (category === "unit") return UnitRegistry.find(p => p.id === id);
  return null;
};

// Add pill to WBS node
window.addPillToNode = function (wbsNodeId, category, pillId) {
  if (!wbsPills[wbsNodeId]) {
    wbsPills[wbsNodeId] = { estimateType: [], tag: [], unit: [] };
  }

  const arr = wbsPills[wbsNodeId][category];

  // Estimate types + units: no duplicates
  if ((category === "estimateType" || category === "unit") && arr.includes(pillId)) {
    return;
  }

  arr.push(pillId);
};

// Remove pill from WBS node
window.removePillFromNode = function (wbsNodeId, category, pillId) {
  if (!wbsPills[wbsNodeId]) return;
  wbsPills[wbsNodeId][category] =
    wbsPills[wbsNodeId][category].filter(id => id !== pillId);
};

// ... existing functions ...

// Render a pill inside a zone (with remove + double-click behavior)
window.renderZonePill = function (zone, wbsNodeId, category, pillId) {
  const pillMeta = findPillMeta(category, pillId);
  if (!pillMeta) return;

  const pillEl = document.createElement("div");
  pillEl.className = "pill";
  pillEl.dataset.category = category;
  pillEl.textContent = pillMeta.short || pillMeta.label;


  // Double-click: open appropriate form
  pillEl.addEventListener("dblclick", () => {
    console.log(`🔄 Labor pill double-clicked for node ${wbsNodeId}`);
    if (category === "estimateType" && pillId === "labor") {
      // Toggle labor expansion inline in WBS
      if (expandedLaborNodes.has(wbsNodeId)) {
        console.log(`➖ Collapsing labor for ${wbsNodeId}`);
        expandedLaborNodes.delete(wbsNodeId);
      } else {
        console.log(`➕ Expanding labor for ${wbsNodeId}`);
        expandedLaborNodes.add(wbsNodeId);
        // Initialize laborData if needed
        if (!wbsPills[wbsNodeId]) {
          wbsPills[wbsNodeId] = { estimateType: [], tag: [], unit: [] };
        }
        if (!wbsPills[wbsNodeId].laborData) {
          wbsPills[wbsNodeId].laborData = { activities: [], resources: [] };
        }
      }
      renderWBS();
    }
    // later: other estimate types, units, etc.
  });

  const remove = document.createElement("span");
  remove.className = "remove";
  remove.textContent = "×";
  remove.addEventListener("click", (e) => {
    e.stopPropagation();
    removePillFromNode(wbsNodeId, category, pillId);
    renderWBS();
  });

  pillEl.appendChild(remove);
  zone.appendChild(pillEl);
};
