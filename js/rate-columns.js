// Rate Columns Registry — Defines sell rate variants (Client, Discipline, Service Type, etc.)
// Job Levels use these column IDs to store different selling prices for same cost

window.RateColumns = (function () {
  const CUSTOM_COLUMNS_KEY = "estimator_custom_rate_columns_v1";

  // Default rate columns
  const DEFAULT_COLUMNS = [
    {
      id: "standard",
      label: "Standard",
      description: "Default rates"
    },
    {
      id: "premium",
      label: "Premium",
      description: "High-value services"
    },
    {
      id: "discount",
      label: "Discount",
      description: "Discounted rates"
    }
  ];

  function getDefaultColumns() {
    return JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
  }

  function getCustomColumns() {
    try {
      const raw = localStorage.getItem(CUSTOM_COLUMNS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load custom rate columns", e);
      return [];
    }
  }

  function saveCustomColumns(columns) {
    try {
      localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(columns));
      return true;
    } catch (e) {
      console.warn("Failed to save custom rate columns", e);
      return false;
    }
  }

  function getAllColumns() {
    return [...getDefaultColumns(), ...getCustomColumns()];
  }

  function getColumnById(id) {
    return getAllColumns().find(c => c.id === id);
  }

  function addCustomColumn(label, description = "") {
    const columns = getCustomColumns();
    const newColumn = {
      id: "col-" + crypto.randomUUID(),
      label,
      description,
      custom: true
    };
    columns.push(newColumn);
    saveCustomColumns(columns);
    return newColumn;
  }

  function updateCustomColumn(id, label, description = "") {
    const columns = getCustomColumns();
    const idx = columns.findIndex(c => c.id === id);
    if (idx !== -1) {
      columns[idx] = { ...columns[idx], label, description };
      saveCustomColumns(columns);
      return columns[idx];
    }
    return null;
  }

  function deleteCustomColumn(id) {
    const columns = getCustomColumns();
    const filtered = columns.filter(c => c.id !== id);
    saveCustomColumns(filtered);
    return filtered.length < columns.length;
  }

  return {
    getDefaultColumns,
    getCustomColumns,
    getAllColumns,
    getColumnById,
    addCustomColumn,
    updateCustomColumn,
    deleteCustomColumn
  };
})();

// console.log("✅ RateColumns loaded");
