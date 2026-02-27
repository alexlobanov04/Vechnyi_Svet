import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  await page.goto('http://localhost:8081');
  await page.waitForTimeout(1000);
  
  // Open modal
  const navBtn = await page.locator('.nav-btn').filter({ hasText: '📚 Навигация' }).first();
  await navBtn.click();
  await page.waitForTimeout(500);

  // Click first book (Бытие)
  const bookBtn = await page.locator('.bible-nav-btn').filter({ hasText: 'Бытие' }).first();
  await bookBtn.click();
  await page.waitForTimeout(500);

  // Click first chapter
  const chapterBtn = await page.locator('.bible-nav-btn').filter({ hasText: '1' }).first();
  await chapterBtn.click();
  await page.waitForTimeout(500);

  console.log("About to click verse...");
  // Click first verse
  const verseBtn = await page.locator('.bible-nav-btn').filter({ hasText: '1' }).first();
  await verseBtn.click();
  await page.waitForTimeout(1000);
  
  console.log("Wait complete, checking input value:");
  const inputValue = await page.inputValue('#search-input');
  console.log("Input value:", inputValue);

  await browser.close();
})();
