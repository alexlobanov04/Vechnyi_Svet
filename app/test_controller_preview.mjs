import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const controllerPage = await context.newPage();

        console.log("Loading Controller Page...");
        await controllerPage.goto('http://127.0.0.1:8080/controller.html');
        await controllerPage.waitForTimeout(500);

        // Click settings toggle
        console.log("Opening Settings...");
        await controllerPage.click('button[data-action="toggleSettings"]');
        await controllerPage.waitForTimeout(500);

        // Set text color to red (#c51616)
        console.log("Setting Text Color to #c51616...");
        await controllerPage.fill('#text-color-select', '#c51616');

        // Trigger the input and change events just like user interaction
        await controllerPage.evaluate(() => {
            const input = document.getElementById('text-color-select');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await controllerPage.waitForTimeout(500);

        // Inject a simulated active song stanza to test the real render path
        await controllerPage.evaluate(() => {
            const previewTextNode = document.querySelector('.verse-text.song-preview-container');
            previewTextNode.classList.remove('placeholder');
            previewTextNode.innerHTML = '<div class="song-stanza verse"><div class="stanza-label">Куплет 1</div><div class="stanza-text">Test Song Lyrics</div></div>';
        });

        await controllerPage.waitForTimeout(500);

        // Check computed color on .stanza-text inside the actual controller DOM
        console.log("Extracting CSS variables from the Controller...");
        const result = await controllerPage.evaluate(() => {
            const root = document.documentElement;
            const stanzaTextNode = document.querySelector('.stanza-text');

            return {
                rootTextColorVar: window.getComputedStyle(root).getPropertyValue('--text-color'),
                rootAccentColorVar: window.getComputedStyle(root).getPropertyValue('--accent-color'),
                previewTextColor: stanzaTextNode ? window.getComputedStyle(stanzaTextNode).color : 'NODE_NOT_FOUND'
            };
        });

        console.log("Controller CSS Test Result:", result);

        if (result.previewTextColor !== 'rgb(197, 22, 22)') {
            console.error("❌ FAILED: Controller preview text color did not update.");
            process.exitCode = 1;
        } else {
            console.log("✅ SUCCESS: Controller preview text color updated correctly!");
        }

    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
