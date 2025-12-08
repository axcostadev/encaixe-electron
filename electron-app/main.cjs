// Bootstrapper to allow Electron (CommonJS) to load an ES module main.js
(async () => {
  try {
    await import('./main.js');
  } catch (err) {
    console.error('Failed to import main.js:', err);
    process.exit(1);
  }
})();
