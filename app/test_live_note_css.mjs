import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();

    // Page 1: Controller
    const controllerPage = await context.newPage();
    controllerPage.on('console', msg => console.log('CONTROLLER:', msg.text()));

    await controllerPage.goto('http://localhost:8080/controller.html', { waitUntil: 'load' });

    // Intercept window.open
    const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        controllerPage.evaluate(() => window.openDisplayWindow())
    ]);

    displayPage.on('console', msg => console.log('DISPLAY:', msg.text()));
    await displayPage.waitForLoadState('load');

    console.log("Pages loaded. Turning on Live Toggle...");
    await controllerPage.check('#note-live-toggle');

    console.log("Typing 'A'...");
    await controllerPage.fill('#note-input', 'A');
    await controllerPage.waitForTimeout(100); // Give JS a tiny moment to execute

    console.log("Checking inline styles on display elements...");
    const styles = await displayPage.evaluate(() => {
        const container = document.getElementById('display-container');
        const content = document.getElementById('verse-content');
        return {
            containerTransition: container.style.transition,
            contentTransition: content.style.transition,
            isVisible: container.classList.contains('visible')
        };
    });

    console.log("Styles applied:", styles);

    if (styles.containerTransition === 'none' && styles.contentTransition === 'none' && styles.isVisible) {
        console.log("SUCCESS: CSS transitions are fully disabled during Live Note typing!");
    } else {
        console.error("FAILURE: CSS transitions are still active or visibility failed.");
    }

    console.log("Erasing note to check restore...");
    await controllerPage.fill('#note-input', '');
    await controllerPage.waitForTimeout(100);

    const erasedStyles = await displayPage.evaluate(() => {
        const container = document.getElementById('display-container');
        const content = document.getElementById('verse-content');
        return {
            containerTransition: container.style.transition,
            contentTransition: content.style.transition
        };
    });

    console.log("Styles after erasing:", erasedStyles);

    if (erasedStyles.containerTransition === '' && erasedStyles.contentTransition === '') {
        console.log("SUCCESS: CSS transitions are correctly restored for smooth fade-out!");
    } else {
        console.error("FAILURE: CSS transitions are not restored upon erase.");
    }

    await browser.close();
})();
