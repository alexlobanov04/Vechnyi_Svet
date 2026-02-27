import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const errors = [];
    const warnings = [];
    try {

        // Page 1: Controller
        const controllerPage = await context.newPage();
        controllerPage.on('console', msg => {
            if (msg.type() === 'error') errors.push(`[CONTROLLER ERROR]: ${msg.text()}`);
            if (msg.type() === 'warning') warnings.push(`[CONTROLLER WARNING]: ${msg.text()}`);
        });
        controllerPage.on('pageerror', err => errors.push(`[CONTROLLER UNCAUGHT]: ${err.message}`));

        await controllerPage.goto('http://127.0.0.1:8105/controller.html', { waitUntil: 'load' });

        // Intercept window.open
        const [displayPage] = await Promise.all([
            context.waitForEvent('page'),
            controllerPage.click('button[data-action="openDisplayWindow"]')
        ]);

        displayPage.on('console', msg => {
            if (msg.type() === 'error') errors.push(`[DISPLAY ERROR]: ${msg.text()}`);
            if (msg.type() === 'warning') warnings.push(`[DISPLAY WARNING]: ${msg.text()}`);
        });
        displayPage.on('pageerror', err => errors.push(`[DISPLAY UNCAUGHT]: ${err.message}`));

        await displayPage.waitForLoadState('load');

        console.log("Pages loaded. Running tests...");

        // Test 1: Bible Search
        console.log("Testing Bible Search...");
        await controllerPage.fill('#search-input', 'Ин 3 16');
        await controllerPage.keyboard.press('Enter');
        await controllerPage.waitForTimeout(1000);

        // Test 2: Notes
        console.log("Testing Notes...");
        await controllerPage.fill('#note-input', 'Test Note');
        await controllerPage.click('#btn-broadcast');
        await controllerPage.waitForTimeout(500);

        // Test 3: Live Notes
        console.log("Testing Live Notes...");
        await controllerPage.check('#note-live-toggle');
        await controllerPage.fill('#note-input', 'Live Test Note');
        await controllerPage.waitForTimeout(500);
        await controllerPage.fill('#note-input', '');
        await controllerPage.waitForTimeout(500);

        // Test 4: Songs
        console.log("Testing Songs...");
        await controllerPage.click('#btn-mode-songs');
        await controllerPage.waitForTimeout(500);
        await controllerPage.fill('#song-search-input', 'благодать');
        await controllerPage.waitForTimeout(500);
        // Click first song result if exists
        const songsCount = await controllerPage.locator('.song-item').count();
        if (songsCount > 0) {
            await controllerPage.click('.song-item:first-child');
            await controllerPage.waitForTimeout(500);
            // Click first stanza
            const stanzaCount = await controllerPage.locator('.stanza-btn').count();
            if (stanzaCount > 0) {
                await controllerPage.click('.stanza-btn:first-child');
                await controllerPage.waitForTimeout(500);
            }
        }

        // Test 5: Settings toggle
        console.log("Testing Settings...");
        await controllerPage.click('button[data-action="toggleSettings"]');
        await controllerPage.waitForTimeout(500);
        await controllerPage.click('button:has-text("Готово")');

        // Test 6: Custom Color Pickers
        console.log("Testing Custom Color Pickers...");
        await controllerPage.click('button[data-action="toggleSettings"]');
        await controllerPage.waitForTimeout(300);

        // --- Background Color ---
        await controllerPage.fill('#theme-select', '#ff0000');
        await controllerPage.evaluate(() => {
            const input = document.getElementById('theme-select');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // --- Text Color ---
        await controllerPage.fill('#text-color-select', '#ffff00');
        await controllerPage.evaluate(() => {
            const input = document.getElementById('text-color-select');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Close the modal
        await controllerPage.click('button:has-text("Готово")');
        await controllerPage.waitForTimeout(500);

        // Verify display window caught the background color
        const bgColor = await displayPage.evaluate(() => {
            const overlay = document.querySelector('.background-overlay');
            // rgb(255, 0, 0) is standard parsed format for #ff0000 in computed styles
            return window.getComputedStyle(overlay).backgroundColor;
        });

        if (bgColor !== 'rgb(255, 0, 0)') {
            console.error(`❌ Color Picker Failed: Expected background rgb(255, 0, 0) but got ${bgColor}`);
        } else {
            console.log("✅ Background Color Picker successfully broadcasted `#ff0000`");
        }

        // Verify display window caught the text color
        const textColor = await displayPage.evaluate(() => {
            // Need to grab what the computed variable is resolved to
            return window.getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        });

        if (textColor !== '#ffff00') {
            console.error(`❌ Text Color Picker Failed: Expected --accent-color #ffff00 but got ${textColor}`);
        } else {
            console.log("✅ Text Color Picker successfully broadcasted `#ffff00`");
        }

        // Test 7: Clear display
        console.log("Testing Display Clear...");
        await controllerPage.click('#btn-mode-bible');
        await controllerPage.waitForTimeout(500);
        await controllerPage.click('button[data-action="hideFromDisplay"]');
        await controllerPage.waitForTimeout(500);

        console.log("--- RESULTS ---");
        if (errors.length > 0) {
            console.log("ERRORS FOUND:");
            errors.forEach(e => console.log(e));
        } else {
            console.log("No console errors found!");
        }

        if (warnings.length > 0) {
            console.log("\nWARNINGS FOUND:");
            warnings.forEach(w => console.log(w));
        } else {
            console.log("\nNo warnings found.");
        }

        process.exit(0);
    } catch (e) {
        console.error("CRITICAL TEST FAILURE:", e);
        if (errors.length > 0) {
            console.log("ERRORS CAUGHT BEFORE CRASH:");
            errors.forEach(err => console.log(err));
        }
        if (warnings.length > 0) {
            console.log("WARNINGS CAUGHT BEFORE CRASH:");
            warnings.forEach(w => console.log(w));
        }
        process.exit(1);
    }
})();
