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
    await controllerPage.waitForTimeout(100);

    console.log("Erasing note to trigger the empty text bug scenario...");
    await controllerPage.fill('#note-input', '');

    await controllerPage.waitForTimeout(50); // Important: Wait UNDER 400ms to catch if an animation is still going!

    const erasedState = await displayPage.evaluate(() => {
        const container = document.getElementById('display-container');
        const content = document.getElementById('verse-content');
        const idle = document.getElementById('idle');
        return {
            containerTransition: container.style.transition,
            htmlContent: content.innerHTML,
            isVisibleClass: container.classList.contains('visible'),
            isIdleVisible: idle.style.display
        };
    });

    console.log("Erased state at exactly 50ms:", erasedState);

    if (erasedState.containerTransition === 'none' &&
        erasedState.htmlContent === '' &&
        !erasedState.isVisibleClass &&
        erasedState.isIdleVisible === 'block') {
        console.log("SUCCESS: The note erased instantly. No trailing letters, no 800ms fade-out animation!");
    } else {
        console.error("FAILURE: Fast-path erase logic failed.");
    }

    await browser.close();
})();
