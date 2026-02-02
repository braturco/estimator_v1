# Copilot Instructions for Estimator v1

## Project Overview
A **phase-based construction estimating tool** using vanilla JavaScript with a modular architecture. Phase 1 (current) focuses on WBS (Work Breakdown Structure) navigation, drag-and-drop pill assignment, and labor form scaffolding. No backend/persistence layer yet.

## Architecture

### Core Data Structures
- **WBS_DATA** ([../js/datastore.js](../js/datastore.js)): Hierarchical tree of phases/tasks/work items with fields like `id`, `code`, `name`, `children`, and rollup fields (`directLabour`, `expenses`, `burdened`, `netRevenue`, `grossRevenue`, `nm`, `gm`, `dlm`)
- **wbsPills** ([../js/datastore.js](../js/datastore.js)): Object keyed by WBS node ID storing arrays of attached pills (`{ estimateType: [], tag: [], unit: [], laborData: {...} }`)
- **Registries** ([../js/registry-estimateTypes.js](../js/registry-estimateTypes.js)): Global arrays for `EstimateTypeRegistry`, `TagRegistry`, `UnitRegistry`. Each item has `id`, `label`, `short`, `category`

### Component Interaction
1. **Palettes** ([../js/pills.js](../js/pills.js)): Left sidebar draggable pills sourced from registries. Trigger `dragstart` with JSON metadata.
2. **WBS Rows** ([../js/wbs.js](../js/wbs.js)): Render hierarchical tree with expand/collapse, inline rename, selection, and zones for dropped pills.
3. **Forms** ([../js/form-labor.js](../js/form-labor.js)): Modal-based editors opened by double-clicking estimate-type pills. Labor form manages resource selection (from `resources.json`), hours, and rate calculations.
4. **Modal System** ([../js/modal.js](../js/modal.js)): Reusable `Modal.open()` helper with title, content function, `onSave`, `onClose` callbacks.

## Key Patterns

### Registry-Based Configuration
All draggable items (estimate types, tags, units) are registered globally. Add new types by extending registries—no hardcoded lists in UI components.

### Pill Attachment & State
Pills are attached to WBS nodes via `wbsPills[nodeId][category]`. Each category (`estimateType`, `tag`, `unit`) is an array. Estimate types and units enforce no duplicates; tags allow multiples.

### Form State Management
Form components (like `LaborForm`) maintain local state objects and sync to `wbsPills[nodeId].laborData` on save. Forms are modal-based and rebuild on state changes.

### Drag-Drop Pattern
Palette pills set `text/plain` dataTransfer with `{ id, category }` JSON. Drop zones in WBS rows parse this and call `addPillToNode()`, then re-render.

## Essential Workflows

### Adding a New Estimate Type (Phase 2+)
1. Add entry to `EstimateTypeRegistry`
2. Create corresponding form file (e.g., `form-subcontractor.js`)
3. Add case in [../js/pills.js](../js/pills.js#L58) `dblclick` handler
4. Form pattern: use `Modal.open()` with `state` object, sync to `wbsPills[nodeId].[category]Data`

### Modifying WBS Structure
Use `findNodeById()`, `addChildById()`, `deleteNode()` helpers in [../js/wbs.js](../js/wbs.js). Always call `renderWBS()` after mutations.

### Labor Form Specifics
Labor form reads resources from `resources.json` (via `Rates.listResources()`), renders dynamic rows for each resource with regular/OT hours, and calculates totals via `updateRatesAndTotals()`.

## CSS & UI Conventions
- Modular CSS: [../css/base.css](../css/base.css) (resets), [../css/layout.css](../css/layout.css) (grid/flex), [../css/components.css](../css/components.css) (pills, buttons), [../css/modal.css](../css/modal.css), [../css/theme-dark.css](../css/theme-dark.css)
- Pills: `.pill` class with `data-id` and `data-category`
- WBS rows: `.wbs-row` with `data-id`, `.wbs-row-selected` for active state
- Modals: `.modal-backdrop`, `.modal`, `.modal-header`, `.modal-body`, `.modal-footer`

## Integration Points
- **Labor rates & resources**: [../data/resources.json](../data/resources.json) with generic and named resource arrays
- **Phase 2 readiness**: Placeholder for `wbs-sample.json` load; rollup calculations stub in place
- **No external dependencies**: Vanilla JS, no frameworks or build step

## Testing & Debugging
- Open [../index.html](../index.html) in browser; console shows registry/WBS state
- Drag pills from sidebar to WBS zones; double-click labor pill to open form
- Inline rename and row selection work immediately on WBS rows
