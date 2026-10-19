const SOURCE_LABEL_SELECTOR = 'span';
const SOURCE_ACTIVE_CLASS = 'bg-fill-2';
const SOURCE_BUTTON_CONTAINER_SELECTOR = 'div.cursor-pointer';
const TAB_BUTTON_SELECTOR = '.flexlayout__tab_button';
const TAB_SELECTED_CLASS = 'flexlayout__tab_button--selected';

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

const waitFor = async (predicate, timeoutMs = 3000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return true;
        await sleep(100);
    }
    return false;
};

// Hidden tabs stay mounted in LeetCode's flexlayout, so only consider rendered elements.
const isVisible = (el) => !!(el && el.getClientRects().length > 0);

// flexlayout tabs ignore a bare .click(); they listen for pointer/mouse down.
const pressElement = (el) => {
    const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
};

const findTestcaseTabButton = () => {
    const byId = document.getElementById('testcase_tab');
    if (byId) return byId.closest(TAB_BUTTON_SELECTOR) || byId;

    return Array.from(document.querySelectorAll(TAB_BUTTON_SELECTOR))
        .find((el) => /^testcase/i.test(el.textContent.trim())) || null;
};

const isTabSelected = (tabButton) => !!(tabButton && tabButton.classList.contains(TAB_SELECTED_CLASS));

const ensureTestcaseTabActive = async (timeoutMs = 3000) => {
    const tabButton = findTestcaseTabButton();
    if (!tabButton) {
        console.error('testcase tab not found');
        return false;
    }

    if (isTabSelected(tabButton)) return true;

    pressElement(tabButton);
    const switched = await waitFor(() => isTabSelected(findTestcaseTabButton()), timeoutMs);
    if (switched) {
        console.log('switched to testcase tab');
    } else {
        console.error('testcase tab switch timeout');
    }
    return switched;
};

const findSourceButton = () => {
    const labels = Array.from(document.querySelectorAll(SOURCE_LABEL_SELECTOR));
    const sourceLabel = labels.find((el) => el.textContent && el.textContent.trim() === 'Source' && isVisible(el));
    if (!sourceLabel) {
        return null;
    }

    return sourceLabel.closest(SOURCE_BUTTON_CONTAINER_SELECTOR) || sourceLabel.parentElement;
};

const isSourceActive = (sourceButton) => {
    return !!(sourceButton && sourceButton.classList.contains(SOURCE_ACTIVE_CLASS));
};

const ensureSourceActiveAndWait = async (timeoutMs = 3000) => {
    // The Source toggle only renders once the Testcase panel has mounted.
    if (!(await waitFor(() => findSourceButton(), timeoutMs))) {
        console.error('source button not found');
        return false;
    }

    const sourceButton = findSourceButton();
    if (isSourceActive(sourceButton)) {
        console.log('source already active');
        return true;
    }

    sourceButton.click();
    if (await waitFor(() => isSourceActive(findSourceButton()), timeoutMs)) {
        console.log('switched to source');
        return true;
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

        const isTestcaseTabReady = await ensureTestcaseTabActive(3000);
        if (!isTestcaseTabReady) {
            sendResponse({ success: false, reason: "Couldn't open the Testcase tab. Open it and try again." });
            return;
        }

        const isSourceReady = await ensureSourceActiveAndWait(3000);
        if (!isSourceReady) {
            sendResponse({ success: false, reason: "Couldn't switch the Testcase panel to Source view." });
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
            sendResponse({ success: true, method: 'textarea', lineCount: lines.length });
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
        sendResponse({ success: true, method: 'dom_fallback', lineCount: lines.length });
    };

    run().catch((e) => {
        console.error('inject failed:', e);
        sendResponse({ success: false, reason: e && e.message ? e.message : 'unknown error' });
    });

    return true;
});