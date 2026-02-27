import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('BROWSER_LOG:', msg.type(), msg.text()));
    page.on('pageerror', exception => console.log('BROWSER_EXCEPTION:', exception));

    await page.goto('http://localhost:8081/controller.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000); // let app init

    // SWITCH TO KYB!
    await page.selectOption('#translation-select', 'KYB');
    await page.waitForTimeout(500);

    // Open navigation
    await page.evaluate(() => window.openBibleNavModal());
    await page.waitForTimeout(500);

    // Click 2 (Exodus) -> Chapter 20 -> Verse 3
    await page.evaluate(() => window.bibleNavSelectBook(2, 'Чыгуу'));
    await page.waitForTimeout(500);

    await page.evaluate(() => window.bibleNavSelectChapter(2, 20));
    await page.waitForTimeout(500);

    console.log("Clicking verse...");
    await page.evaluate(() => {
        // Select verse 3 from chapter 20
        const btn = Array.from(document.querySelectorAll('#bible-nav-content .bible-nav-btn')).find(b => b.textContent === '3');
        if (btn) btn.click();
    });

    await page.waitForTimeout(1000);

    const isModalActive = await page.evaluate(() => document.getElementById('bible-nav-modal').classList.contains('active'));
    console.log("Modal active:", isModalActive);

    const inputVal = await page.evaluate(() => document.getElementById('search-input').value);
    console.log("Input Value:", inputVal);

    await browser.close();
})();
