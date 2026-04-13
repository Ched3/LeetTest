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
    const isRobotProgramObject = (x) =>
        x &&
        typeof x === 'object' &&
        Array.isArray(x.methods) &&
        Array.isArray(x.params);

    const isRobotProgramPair = (x) =>
        Array.isArray(x) &&
        x.length === 2 &&
        Array.isArray(x[0]) &&
        Array.isArray(x[1]);

    const formatRobotProgram = (program) => {
        // Each testcase becomes exactly 2 lines:
        // 1) methods JSON
        // 2) params JSON
        if (isRobotProgramObject(program)) {
            return [JSON.stringify(program.methods), JSON.stringify(program.params)];
        }
        if (isRobotProgramPair(program)) {
            return [JSON.stringify(program[0]), JSON.stringify(program[1])];
        }
        return [JSON.stringify(program)];
    };

    if (Array.isArray(testCases)) {
        // Shape 1: [{methods: [...], params: [...]}, ...]
        if (testCases.length > 0 && isRobotProgramObject(testCases[0])) {
            return testCases.flatMap((p) => formatRobotProgram(p));
        }

        // Shape 2: [[[...methods...],[...params...]], ...] (pair form)
        if (testCases.length > 0 && isRobotProgramPair(testCases[0])) {
            return testCases.flatMap((p) => formatRobotProgram(p));
        }

        // Shape 3: [methodsArray, paramsArray] (single testcase)
        if (isRobotProgramPair(testCases)) {
            return formatRobotProgram(testCases);
        }

        // Generic: already an array of strings → treat each string as one line.
        const allStrings = testCases.every((item) => typeof item === 'string');
        if (allStrings) return testCases;

        // Fallback: stringify the whole thing as JSON (best-effort).
        return [JSON.stringify(testCases, null, 2)];
    }

    if (testCases && Array.isArray(testCases.lines)) {
        // If `lines` already carries robot-program shapes, format them as 2-line testcases.
        if (testCases.lines.length > 0 && isRobotProgramObject(testCases.lines[0])) {
            return testCases.lines.flatMap((p) => formatRobotProgram(p));
        }
        if (testCases.lines.length > 0 && isRobotProgramPair(testCases.lines[0])) {
            return testCases.lines.flatMap((p) => formatRobotProgram(p));
        }

        const allStrings = testCases.lines.every((item) => typeof item === 'string');
        if (allStrings) return testCases.lines;
        return [JSON.stringify(testCases.lines, null, 2)];
    }

    if (typeof testCases === 'string') return testCases.split('\n');

    if (testCases && isRobotProgramObject(testCases)) {
        return formatRobotProgram(testCases);
    }

    if (testCases && Array.isArray(testCases.methods) && Array.isArray(testCases.params)) {
        return [JSON.stringify(testCases.methods), JSON.stringify(testCases.params)];
    }

    if (testCases && typeof testCases === 'object') return [JSON.stringify(testCases, null, 2)];
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
            sendResponse({ success: false, reason: 'Click on the testcases tab' });
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