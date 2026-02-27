import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('CONTROLLER_LOG:', msg.text()));

    await page.goto('http://localhost:8080/controller.html', { waitUntil: 'load' });
    
    // Set up display directly inside the page context to test broadcast functionality
    await page.evaluate(() => {
        window.displayWindow = {
            postMessage: (msg, target) => {
                console.log("POST_MESSAGE:", JSON.stringify(msg));
            }
        };
    });

    console.log("Typing note...");
    // Force event listener to fire
    await page.evaluate(() => {
        document.getElementById('note-live-toggle').checked = true;
        const input = document.getElementById('note-input');
        input.value = "Live Test!";
        input.dispatchEvent(new Event('input'));
    });
    
    await browser.close();
})();
