document.addEventListener('DOMContentLoaded', () => {
    const outputDiv = document.getElementById('output');
    const loadingDiv = document.getElementById('loading');
    const fetchButton = document.getElementById('fetch-data');
    const reportIssueButton = document.getElementById('report-issue');
    const updateRequiredDiv = document.getElementById('update-required');
    const updateMessage = document.getElementById('update-message');
    const updateNowButton = document.getElementById('update-now');
    const manifest = chrome.runtime.getManifest();
    const EXTENSION_UPDATE_URL = window.LEETTEST_UI.storeUrl();
    const normalizedBackendBaseUrl = (window.LEETTEST_BACKEND_BASE_URL || 'https://kohlenz.com/leettest').replace(/\/+$/, '');
    const VERSION_CHECK_URL = `${normalizedBackendBaseUrl}/version`;
    const extensionVersion = manifest.version;
    window.LEETTEST_EXTENSION_VERSION = extensionVersion;
    window.LEETTEST_UPDATE_STATE = { required: false };

    const { showStatus, clearStatus, getActiveProblem, formatSlug } = window.LEETTEST_UI;
    const problemName = document.getElementById('problem-name');
    const timerSpan = document.getElementById('timer');
    let timerInterval = null;
    let timerStart = 0;

    const renderElapsed = () => {
        timerSpan.textContent = `${Math.round(performance.now() - timerStart)}ms`;
    };

    const startTimer = () => {
        timerStart = performance.now();
        timerSpan.textContent = '0ms';
        timerInterval = setInterval(renderElapsed, 16);
    };

    const stopTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            // Final exact value, so fast runs don't show a stale tick.
            renderElapsed();
        }
    };

    const setLoading = (isLoading) => {
        loadingDiv.hidden = !isLoading;
        fetchButton.disabled = isLoading || window.LEETTEST_UPDATE_STATE.required;
        if (isLoading) {
            startTimer();
        } else {
            stopTimer();
        }
    };

    const showError = (message) => {
        setLoading(false);
        showStatus(outputDiv, 'error', message);
    };

    // LeetCode only serves Premium problem descriptions to Premium accounts, so the backend
    // can't build a generator for them. Ask LeetCode up front (cached per slug) instead of
    // letting the request fail with a generic error. Resolves true/false, or null if unknown.
    const premiumChecks = new Map();
    const isPremiumProblem = (slug) => {
        if (!premiumChecks.has(slug)) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            premiumChecks.set(slug, fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'query isPremium($slug: String!) { question(titleSlug: $slug) { isPaidOnly } }',
                    variables: { slug },
                }),
                signal: controller.signal,
            })
                .then((res) => res.json())
                .then((data) => {
                    const question = data && data.data && data.data.question;
                    return question ? question.isPaidOnly === true : null;
                })
                .catch(() => null) // never block generation just because the check failed
                .finally(() => clearTimeout(timer)));
        }
        return premiumChecks.get(slug);
    };

    getActiveProblem().then(({ slug }) => {
        if (slug) isPremiumProblem(slug); // start early so clicking Generate is instant
        if (slug) {
            problemName.textContent = formatSlug(slug);
        } else {
            problemName.textContent = 'Open a LeetCode problem';
            problemName.classList.add('problem-name--empty');
        }
    });

    const setUpdateRequiredState = (message) => {
        window.LEETTEST_UPDATE_STATE.required = true;
        setLoading(false);
        updateRequiredDiv.hidden = false;
        updateMessage.textContent = message || 'A new version of LeetTest is required.';
        fetchButton.disabled = true;
        reportIssueButton.disabled = true;
        clearStatus(outputDiv);
    };

    window.LEETTEST_API = {
        setUpdateRequiredState,
        isUpdateRequiredResponse: (status, payload) => {
            return status === 426 || (payload && payload.error_code === 'EXTENSION_UPDATE_REQUIRED');
        }
    };

    const compareVersions = (currentVersion, targetVersion) => {
        const currentParts = String(currentVersion).split('.').map(part => parseInt(part, 10) || 0);
        const targetParts = String(targetVersion).split('.').map(part => parseInt(part, 10) || 0);
        const maxLength = Math.max(currentParts.length, targetParts.length);

        for (let i = 0; i < maxLength; i += 1) {
            const current = currentParts[i] || 0;
            const target = targetParts[i] || 0;
            if (current < target) {
                return -1;
            }
            if (current > target) {
                return 1;
            }
        }
        return 0;
    };

    const checkMinimumSupportedVersion = async () => {
        try {
            const response = await fetch(VERSION_CHECK_URL, {
                headers: {
                    'X-Extension-Version': extensionVersion,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            const minimumVersion = payload && (payload.minimum_version);
            if (!minimumVersion) {
                return;
            }

            if (compareVersions(extensionVersion, minimumVersion) < 0) {
                setUpdateRequiredState(`Minimum supported version is ${minimumVersion}. Please update to continue.`);
            }
        } catch (error) {
            console.error('Version check failed:', error);
        }
    };

    updateNowButton.addEventListener('click', () => {
        chrome.tabs.create({ url: EXTENSION_UPDATE_URL });
    });

    checkMinimumSupportedVersion();

    // Firefox MV3 treats host permissions as optional, so users can end up without them.
    const permissionBanner = document.getElementById('permission-required');
    const hostOrigins = { origins: manifest.host_permissions || [] };
    const refreshPermissionBanner = () => {
        chrome.permissions.contains(hostOrigins, (granted) => {
            permissionBanner.hidden = !!granted;
        });
    };
    document.getElementById('grant-permissions').addEventListener('click', () => {
        chrome.permissions.request(hostOrigins, (granted) => {
            if (granted) {
                permissionBanner.hidden = true;
                showStatus(outputDiv, 'info', 'Access granted. Reload your LeetCode tab to finish setup.');
            }
        });
    });
    refreshPermissionBanner();

    const sendMessageOnce = (tabId, message) => new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, (reply) => {
            if (chrome.runtime.lastError) {
                resolve({ unreachable: true, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(reply || { success: false, reason: 'No response from the page.' });
        });
    });

    // Tabs opened before LeetTest was installed/updated have no content script listening.
    // Inject it (the scripts are safe to run twice) and try once more; if even that fails,
    // fall back to asking the user to refresh.
    const sendToPage = async (tabId, message) => {
        const first = await sendMessageOnce(tabId, message);
        if (!first.unreachable) return first;

        try {
            await chrome.scripting.executeScript({ target: { tabId }, files: manifest.content_scripts[0].js });
        } catch (error) {
            console.error('content script injection failed:', error);
            return { success: false, needsReload: true };
        }
        const second = await sendMessageOnce(tabId, message);
        return second.unreachable ? { success: false, needsReload: true } : second;
    };

    fetchButton.addEventListener('click', async () => {
        if (window.LEETTEST_UPDATE_STATE.required) {
            return;
        }

        clearStatus(outputDiv);
        setLoading(true);

        const { tab: activeTab, slug } = await getActiveProblem();
        if (!activeTab) {
            showError('No active tab found.');
            return;
        }
        if (!slug) {
            showError('Open a LeetCode problem page first.');
            return;
        }
        if (await isPremiumProblem(slug)) {
            showError("LeetTest doesn't work on Premium problems. LeetCode only shares their details with Premium accounts, so we can't generate testcases for them.");
            return;
        }

        try {
            const response = await fetch(`${normalizedBackendBaseUrl}/api/${slug}`, {
                headers: {
                    'X-Extension-Version': extensionVersion
                }
            });

            if (response.status === 426) {
                const errPayload = await response.json().catch(() => ({}));
                setUpdateRequiredState(errPayload.message);
                return;
            }

            if (!response.ok) {
                const errPayload = await response.json().catch(() => ({}));
                throw new Error(errPayload.message || errPayload.error || `Server returned ${response.status}.`);
            }

            const responseText = await response.text();
            let generatorCode;
            try {
                const parsed = JSON.parse(responseText);
                generatorCode = parsed.code || responseText;
            } catch {
                generatorCode = responseText;
            }

            const sandboxFrame = document.getElementById('sandbox-frame');
            const testCases = await new Promise((resolve, reject) => {
                let settled = false;
                const handler = (event) => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('message', handler);
                    clearTimeout(timer);
                    if (event.data && event.data.success) {
                        resolve(event.data.data);
                    } else {
                        reject(new Error((event.data && event.data.error) || 'Sandbox execution failed'));
                    }
                };
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('message', handler);
                    reject(new Error('Test case generation timed out'));
                }, 10000);
                window.addEventListener('message', handler);
                sandboxFrame.contentWindow.postMessage({ code: generatorCode }, '*');
            });

            const result = await sendToPage(activeTab.id, { action: 'checkButtonAndInject', data: testCases });

            setLoading(false);
            if (result.needsReload) {
                showStatus(outputDiv, 'error',
                    'This LeetCode tab was open before LeetTest was installed or updated. Refresh the page, then try again.',
                    { action: { label: 'Refresh page', onClick: () => { chrome.tabs.reload(activeTab.id); window.close(); } } });
                return;
            }
            if (result.success === false) {
                showStatus(outputDiv, 'error', result.reason || 'Injection failed.');
                return;
            }
            showStatus(outputDiv, 'success', `Pasted into the Testcase tab in ${timerSpan.textContent}.`);
            window.LEETTEST_UI.recordSuccess();
        } catch (error) {
            console.error(error);
            showError(`Couldn't generate testcases: ${error.message}`);
        }
    });
});
