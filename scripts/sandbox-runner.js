// Runs backend-provided generator code and posts the serialized testcases back to the popup.
//
// Chrome loads this page as a manifest "sandbox" page, where `new Function` is allowed.
// Firefox has no sandbox pages and its MV3 CSP forbids eval, so there we fall back to the
// bundled Sval interpreter (scripts/vendor/sval.min.js). The generator.js helpers still run
// natively; only the generated glue code is interpreted.
(function () {
    const canEval = (() => {
        try {
            return new Function('return true')();
        } catch (e) {
            return false;
        }
    })();

    // Function declarations in generator.js land on window; classes don't, so add them explicitly.
    const collectHelpers = () => {
        const base = window.LEETTEST_BASE_GLOBALS || new Set();
        const helpers = {};
        for (const name of Object.getOwnPropertyNames(window)) {
            if (!base.has(name) && name !== 'LEETTEST_BASE_GLOBALS') {
                helpers[name] = window[name];
            }
        }
        if (typeof TreeNode !== 'undefined') helpers.TreeNode = TreeNode;
        return helpers;
    };

    const runNative = (code) => {
        const fn = new Function(`
            "use strict";
            ${code}
            return typeof result !== "undefined" ? result : undefined;
        `);
        return fn();
    };

    const runInterpreted = (code) => {
        if (typeof Sval === 'undefined') {
            throw new Error('Interpreter failed to load');
        }
        const interpreter = new Sval({ ecmaVer: 'latest', sandBox: true });
        interpreter.import(collectHelpers());
        interpreter.run(`"use strict";\n${code}\nexports.result = typeof result !== "undefined" ? result : undefined;`);
        return interpreter.exports.result;
    };

    const serialize = (result) => {
        if (!Array.isArray(result)) {
            throw new Error('Generated result must be an array');
        }

        const lines = [];
        for (const testCase of result) {
            if (!Array.isArray(testCase)) {
                throw new Error('Each test case must be an array');
            }
            for (const value of testCase) {
                lines.push(convertToString(value));
            }
        }
        return lines.join('\n');
    };

    window.addEventListener('message', (event) => {
        const code = event.data && event.data.code;
        if (typeof code !== 'string') return;

        try {
            const result = canEval ? runNative(code) : runInterpreted(code);
            event.source.postMessage({ success: true, data: serialize(result) }, event.origin);
        } catch (err) {
            console.error('[sandbox] execution error:', err);
            event.source.postMessage({ success: false, error: err.message }, event.origin);
        }
    });
})();
