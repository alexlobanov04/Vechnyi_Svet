import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('CONTROLLER_LOG:', msg.text()));

    await page.goto('http://localhost:8080/controller.html', { waitUntil: 'load' });
    
    // Set up display directly inside the page context to test broadcast functionality
    await page.evaluate(() => {
        // Mock a connected display window
        window.displayWindow = {
            postMessage: (msg, target) => {
                console.log("POST_MESSAGE_RECEIVED:", JSON.stringify(msg));
            },
            closed: false
        };
    });

    console.log("Typing note...");
    
    // Test 1: Type with live toggle checked
    await page.evaluate(() => {
        document.getElementById('note-live-toggle').checked = true;
        const input = document.getElementById('note-input');
        input.value = "Live Test!";
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);

    // Test 2: Press Ctrl+Enter
    await page.evaluate(() => {
        const input = document.getElementById('note-input');
        input.value = "Ctrl+Enter Test!";
        const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true });
        input.dispatchEvent(event);
    });

    await page.waitForTimeout(500);

    const statusText = await page.evaluate(() => document.getElementById('status').innerText);
    console.log("Final Status PILL:", statusText);

    await browser.close();
})();
