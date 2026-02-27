import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Catch all console logs and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => {
        console.error('PAGE ERROR:', exception);
    });

    await page.goto('http://localhost:8081/controller.html');
    await page.waitForTimeout(1000); // let db load

    // Switch to KYB
    // await page.selectOption('#translation-select', 'KYB');
    // Using default RST for speed to see if the global error happens

    // Open nav modal
    await page.evaluate(() => window.openBibleNavModal());
    await page.waitForTimeout(500);

    // Click Genesis (1) -> Chapter 1 -> Verse 1
    console.log("Selecting book 1...");
    await page.evaluate(() => window.bibleNavSelectBook(1, 'Башталыш'));
    await page.waitForTimeout(500);

    console.log("Selecting chapter 1...");
    await page.evaluate(() => window.bibleNavSelectChapter(1, 1));
    await page.waitForTimeout(500);

    console.log("Selecting verse 1...");
    // If it crashes, the pageerror listener will catch it
    await page.evaluate(() => window.bibleNavSelectVerse(1, 1, 1));
    await page.waitForTimeout(1000); // wait for fetch/render

    const inputVal = await page.evaluate(() => document.getElementById('search-input').value);
    console.log('Final Input Value:', inputVal);

    await browser.close();
})();
