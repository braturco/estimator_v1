// ---------------------------------------------------------
// COLUMN RESIZING ENGINE (FINAL WORKING VERSION)
// ---------------------------------------------------------

window.enableColumnResizing = function (rowSelector) {
  const root = document.documentElement;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let colIndex = null;

  function getColumns() {
    const val = getComputedStyle(root).getPropertyValue("--wbs-columns");
    return val.trim().replace(/\s+/g, " ").split(" ");
  }

  function setColumns(cols) {
    root.style.setProperty("--wbs-columns", cols.join(" "));
  }

  document.querySelectorAll(".col-resize-handle").forEach(handle => {
    handle.addEventListener("pointerdown", e => {
      handle.setPointerCapture(e.pointerId);

      isResizing = true;
      startX = e.clientX;

      const header = handle.parentElement;
      colIndex = parseInt(header.dataset.col);

      const cols = getColumns();
      startWidth = parseInt(cols[colIndex]);

      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });

    handle.addEventListener("dblclick", () => {
      const rows = document.querySelectorAll(rowSelector);
      let maxWidth = 60;

      rows.forEach(row => {
        const cell = row.children[colIndex];
        if (!cell) return;
        const width = cell.scrollWidth + 24;
        if (width > maxWidth) maxWidth = width;
      });

      const cols = getColumns();
      cols[colIndex] = `${maxWidth}px`;
      setColumns(cols);
    });
  });

  document.addEventListener("pointermove", e => {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + dx);

    const cols = getColumns();
    cols[colIndex] = `${newWidth}px`;
    setColumns(cols);
  });

  document.addEventListener("pointerup", e => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.cursor = "default";

    document.querySelectorAll(".col-resize-handle").forEach(h => {
      try { h.releasePointerCapture(e.pointerId); } catch {}
    });
  });
};
