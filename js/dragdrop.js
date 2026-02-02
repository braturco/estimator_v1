// Create a pill drop zone for a WBS node
window.createPillZone = function (wbsNodeId, category, label) {
  const zone = document.createElement("div");
  zone.className = "pill-zone";

  // Placeholder text (ghost hint)
  zone.dataset.placeholder = label;

  zone.dataset.wbsNodeId = wbsNodeId;
  zone.dataset.category = category;

  // Prevent default HTML5 drag behavior
  zone.setAttribute("ondrop", "return false;");
  zone.setAttribute("ondragover", "return false;");

  // DRAG OVER
  zone.addEventListener("dragover", (e) => {
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.category === category) {
      e.preventDefault(); // enables drop
      zone.classList.add("active-drop");
    }
  });

  // DRAG LEAVE
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("active-drop");
  });

  // DROP
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("active-drop");

    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn("Drop payload parse failed:", raw);
      return;
    }

    const pillId = data.id;
    const pillCategory = data.category;

    if (!pillId || pillCategory !== category) return;

    addPillToNode(wbsNodeId, category, pillId);
    renderWBS();
  });

  // RENDER EXISTING PILLS
  const pillsForNode =
    (wbsPills[wbsNodeId] && wbsPills[wbsNodeId][category]) || [];

  pillsForNode.forEach((pillId) => {
    renderZonePill(zone, wbsNodeId, category, pillId);
  });

  return zone;
};
