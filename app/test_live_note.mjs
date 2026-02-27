import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    
    // Page 1: Controller
    const controllerPage = await context.newPage();
    controllerPage.on('console', msg => console.log('CONTROLLER:', msg.text()));
    
    await controllerPage.goto('http://localhost:8080/controller.html', { waitUntil: 'load' });
    
    // We intercept window.open to grab the new display page
    const [displayPage] = await Promise.all([
        context.waitForEvent('page'),
        controllerPage.evaluate(() => window.openDisplayWindow())
    ]);
    
    displayPage.on('console', msg => console.log('DISPLAY:', msg.text()));
    await displayPage.waitForLoadState('load');
    
    console.log("Both pages loaded. Activating Live Toggle...");
    await controllerPage.check('#note-live-toggle');

    console.log("Typing 'A'...");
    await controllerPage.fill('#note-input', 'A');
    
    // Wait just 50ms (well under the 400ms timeout)
    await controllerPage.waitForTimeout(50);
    
    console.log("Checking display container state...");
    const state = await displayPage.evaluate(() => {
        const container = document.getElementById('container');
        const content = document.getElementById('content');
        const idle = document.getElementById('idle');
        return {
            isVisible: container.classList.contains('visible'),
            text: content.innerText,
            idleDisplay: idle.style.display
        };
    });
    
    console.log("State at 50ms:", state);
    
    if (state.isVisible && state.text === 'A' && state.idleDisplay === 'none') {
        console.log("SUCCESS: Display updated INSTANTLY without 400ms timeout!");
    } else {
        console.log("FAILURE: Display is still waiting for animation.");
    }
    
    console.log("Typing 'AB'...");
    await controllerPage.fill('#note-input', 'AB');
    await controllerPage.waitForTimeout(50);
    
    const state2 = await displayPage.evaluate(() => {
        const content = document.getElementById('content');
        return { text: content.innerText };
    });
    console.log("State at 50ms (second stroke):", state2);
    
    console.log("Erasing note entirely...");
    await controllerPage.fill('#note-input', '');
    await controllerPage.waitForTimeout(50);
    
    const erasedState = await displayPage.evaluate(() => {
        const container = document.getElementById('container');
        return { isVisible: container.classList.contains('visible') };
    });
    console.log("Erased state at 50ms:", erasedState);
    if (!erasedState.isVisible) {
        console.log("SUCCESS: Container correctly lost 'visible' class instantly upon erase, triggering CSS fade out!");
    }

    await browser.close();
})();
