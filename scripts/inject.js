const SOURCE_LABEL_SELECTOR = 'span';
const SOURCE_ACTIVE_CLASS = 'bg-fill-2';
const SOURCE_BUTTON_CONTAINER_SELECTOR = 'div.cursor-pointer';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForElement = async (selector, timeoutMs = 3000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const el = document.querySelector(selector);
        if (el) return el;
        await sleep(100);
    }
    return null;
};

const findSourceButton = () => {
    const labels = Array.from(document.querySelectorAll(SOURCE_LABEL_SELECTOR));
    const sourceLabel = labels.find((el) => el.textContent && el.textContent.trim() === 'Source');
    if (!sourceLabel) {
        return null;
    }

    return sourceLabel.closest(SOURCE_BUTTON_CONTAINER_SELECTOR) || sourceLabel.parentElement;
};

const isSourceActive = (sourceButton) => {
    return !!(sourceButton && sourceButton.classList.contains(SOURCE_ACTIVE_CLASS));
};

const ensureSourceActiveAndWait = async (timeoutMs = 3000) => {
    const sourceButton = findSourceButton();
    if (!sourceButton) {
        console.error('source button not found');
        return false;
    }

    if (isSourceActive(sourceButton)) {
        console.log('source already active');
        return true;
    }

    sourceButton.click();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const freshSourceButton = findSourceButton();
        if (isSourceActive(freshSourceButton)) {
            console.log('switched to source');
            return true;
        }
        await sleep(100);
    }

    console.error('source switch timeout');
    return false;
};

const normalizeLines = (testCases) => {
    if (Array.isArray(testCases)) return testCases;
    if (testCases && Array.isArray(testCases.lines)) return testCases.lines;
    if (typeof testCases === 'string') return testCases.split('\n');
    return [String(testCases)];
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== 'checkButtonAndInject') return;

    const run = async () => {
        const testCases = request.data;
        const lines = normalizeLines(testCases);
        const value = lines.join('\n');

        const isSourceReady = await ensureSourceActiveAndWait(3000);
        if (!isSourceReady) {
            sendResponse({ success: false, reason: 'source tab not active' });
            return;
        }

        // Wait for source editor container to render.
        const editorContainer = await waitForElement('.cm-content', 3000);
        if (!editorContainer) {
            console.error('cm-content not found; cannot inject testcases');
            sendResponse({ success: false, reason: 'editor container not found' });
            return;
        }

        // Preferred approach: update underlying input if present.
        const editorRoot = editorContainer.closest('.cm-editor') || editorContainer;
        const textarea = editorRoot.querySelector('textarea');
        if (textarea) {
            textarea.value = value;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('successful injection via textarea');
            sendResponse({ success: true, method: 'textarea' });
            return;
        }

        // Fallback: update DOM content (may be overwritten if CodeMirror re-renders).
        editorContainer.innerHTML = '';
        lines.forEach((line) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'cm-line';
            lineDiv.textContent = line;
            editorContainer.appendChild(lineDiv);
        });
        editorContainer.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('successful injection via DOM fallback');
        sendResponse({ success: true, method: 'dom_fallback' });
    };

    run().catch((e) => {
        console.error('inject failed:', e);
        sendResponse({ success: false, reason: e && e.message ? e.message : 'unknown error' });
    });

    return true;
});