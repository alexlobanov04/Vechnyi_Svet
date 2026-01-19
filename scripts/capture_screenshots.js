import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Good for some environments, usually safe locally
    });
    
    try {
        const page = await browser.newPage();

        // 1. Dashboard (Controller) - Desktop
        console.log('Capturing Dashboard...');
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`file://${path.join(projectRoot, 'app/controller.html')}`);
        // Wait for any animations or data loading
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(projectRoot, 'site/img/screenshots/dashboard.png') });

        // 2. Display Window
        console.log('Capturing Display Screen...');
        // We might want to inject some state here to show a verse?
        // Let's rely on default state or URL params if the app supports it.
        // If not, we might capture an empty screen. 
        // Let's try to simulate typing a verse if possible, but simplicity first.
        // Assuming display.html shows something by default or is the receiving end.
        // Actually, display.html usually waits for messages.
        // Strategy: Open controller, click "Open Display" might not work well in headless.
        // Better Strategy: Just open display.html and inject a verse via local storage or DOM manipulation.
        
        await page.goto(`file://${path.join(projectRoot, 'app/display.html')}`);
        await page.evaluate(() => {
             // Simulate receiving a verse
             const displayBody = document.querySelector('.display-body') || document.body;
             if(displayBody) {
                 displayBody.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; color: white; background: radial-gradient(circle at center, #1e1b4b 0%, #000000 100%);">
                        <div style="font-family: 'Playfair Display', serif; font-size: 5vw; line-height: 1.4; margin-bottom: 20px;">
                            Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного...
                        </div>
                        <div style="font-family: 'Inter', sans-serif; font-size: 2vw; opacity: 0.8;">
                            Иоанна 3:16
                        </div>
                    </div>
                 `;
             }
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(projectRoot, 'site/img/screenshots/display.png') });

        // 3. Mobile Controller
        console.log('Capturing Mobile Controller...');
        await page.setViewport({ width: 375, height: 812, isMobile: true });
        await page.goto(`file://${path.join(projectRoot, 'app/controller.html')}`);
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(projectRoot, 'site/img/screenshots/mobile.png') });

        console.log('Screenshots captured successfully!');

    } catch (error) {
        console.error('Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
})();
