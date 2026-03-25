/* SSI Units Module */
const SSIUnits = (() => {
  // Units are managed via Admin panel; this module provides helpers
  function getAll() {
    return SSIApp.getState().units.filter(u => u.active);
  }
  return { getAll };
})();
