// Standalone script to initialize Farcaster MiniApp
console.log('[miniapp-init.js] Script loaded');

// Import SDK and call ready()
(async function() {
  try {
    console.log('[miniapp-init.js] Importing SDK...');
    
    // Load SDK from CDN
    const { sdk } = await import('https://esm.sh/@farcaster/miniapp-sdk@0.2.2');
    
    console.log('[miniapp-init.js] SDK imported:', sdk);
    console.log('[miniapp-init.js] Calling ready()...');
    
    await sdk.actions.ready();
    
    console.log('[miniapp-init.js] ✅ ready() SUCCESS - splash hidden');
  } catch (error) {
    console.error('[miniapp-init.js] ❌ Error:', error);
  }
})();
