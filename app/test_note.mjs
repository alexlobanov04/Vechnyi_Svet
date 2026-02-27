import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('CONTROLLER_LOG:', msg.type(), msg.text()));
    page.on('pageerror', exception => console.log('CONTROLLER_ERR:', exception));

    await page.goto('http://localhost:8080/controller.html', { waitUntil: 'networkidle' });

    // Open Display Window
    const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        page.evaluate(() => window.openDisplayWindow())
    ]);

    displayPage.on('console', msg => console.log('DISPLAY_LOG:', msg.type(), msg.text()));
    displayPage.on('pageerror', exception => console.log('DISPLAY_ERR:', exception));
    
    await displayPage.waitForLoadState('networkidle');

    console.log("Typing note...");
    await page.check('#note-live-toggle');
    await page.fill('#note-input', 'Testing live note');
    
    await page.waitForTimeout(1000);
    
    // Check if display actually received the note
    const displayText = await displayPage.evaluate(() => {
        const p = document.getElementById('note-p');
        return p ? p.innerText : null;
    });
    console.log("Display text after live typing:", displayText);

    await browser.close();
})();
