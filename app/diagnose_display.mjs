import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(() => {
            // Intercept console.warn or logs inside the display
            window.console.warn = (...args) => console.log('INTERCEPTED WARN:', ...args);
        });

        const displayPage = await context.newPage();
        displayPage.on('console', msg => console.log('DISPLAY BROWSER LOG:', msg.text()));

        await displayPage.goto('http://127.0.0.1:8080/display.html');
        await displayPage.waitForTimeout(500);

        // Broadcast a verse first
        await displayPage.evaluate(() => {
            window.postMessage({
                type: 'SHOW_VERSE',
                data: { text: 'Test Verse Text', reference: 'Gen 1:1' }
            }, '*');
        });
        await displayPage.waitForTimeout(500);

        console.log("Broadcasting UPDATE_SETTINGS payload with textColor = '#c51616'");

        // Broadcast the strict payload
        await displayPage.evaluate(() => {
            window.postMessage({
                type: 'UPDATE_SETTINGS',
                data: { font: "'Inter'", theme: '#000000', textColor: '#c51616', size: 100 }
            }, '*');
        });

        await displayPage.waitForTimeout(500);

        // Extract computed values
        const result = await displayPage.evaluate(() => {
            const root = document.documentElement;
            const verseText = document.querySelector('.verse-text');

            return {
                rootTextVar: window.getComputedStyle(root).getPropertyValue('--text-color'),
                verseColor: window.getComputedStyle(verseText).color
            };
        });

        console.log("FINAL RENDER STATE:", result);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
