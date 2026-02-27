import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('CONTROLLER_LOG:', msg.text()));

    await page.goto('http://localhost:8080/controller.html', { waitUntil: 'load' });
    
    // Inject a global mock wrapper inside the live page context to capture the broadcast
    await page.evaluate(() => {
        // mock window.openDisplayWindow to actually open a fake display
        window.openDisplayWindow = function() {
            window.displayWindow = {
                closed: false,
                postMessage: (msg, origin) => console.log('INTERCEPTED_BROADCAST:', JSON.stringify(msg))
            };
            
            // Re-bind the module state using the global setter!
            import('./js/modules/broadcast.js').then(module => {
                module.setDisplayWindow(window.displayWindow);
                console.log('MOCKED_DISPLAY_SET');
            });
        };
        
        window.openDisplayWindow();
    });

    await page.waitForTimeout(1000); // Wait for async import

    console.log("Typing note...");
    
    // Test 1: Type with live toggle checked
    await page.evaluate(() => {
        document.getElementById('note-live-toggle').checked = true;
        const input = document.getElementById('note-input');
        input.value = "Live Test!";
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);

    const statusText = await page.evaluate(() => document.getElementById('status').innerText);
    console.log("Final Status PILL:", statusText);

    await browser.close();
})();
