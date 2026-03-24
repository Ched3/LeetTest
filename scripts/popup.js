document.addEventListener('DOMContentLoaded', () => {
    const outputDiv = document.getElementById('output');
    const loadingDiv = document.getElementById('loading');
    const fetchButton = document.getElementById('fetch-data');
    const reportIssueButton = document.getElementById('report-issue');
    const updateRequiredDiv = document.getElementById('update-required');
    const updateMessage = document.getElementById('update-message');
    const updateNowButton = document.getElementById('update-now');
    const EXTENSION_UPDATE_URL = 'https://chromewebstore.google.com/detail/leettest/diinamlcdbbpfebknmhajjaijpflnaoe';
    const normalizedBackendBaseUrl = (window.LEETTEST_BACKEND_BASE_URL || 'https://kohlenz.com/leettest').replace(/\/+$/, '');
    const VERSION_CHECK_URL = `${normalizedBackendBaseUrl}/version`;
    const extensionVersion = chrome.runtime.getManifest().version;
    window.LEETTEST_EXTENSION_VERSION = extensionVersion;
    window.LEETTEST_UPDATE_STATE = { required: false };

    const setUpdateRequiredState = (message) => {
        window.LEETTEST_UPDATE_STATE.required = true;
        loadingDiv.style.display = 'none';
        updateRequiredDiv.style.display = 'block';
        updateMessage.textContent = message || 'A new version of LeetTest is required.';
        fetchButton.disabled = true;
        reportIssueButton.disabled = true;
        outputDiv.innerHTML = '<p style="color: red;">Please update the extension to continue.</p>';
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

    fetchButton.addEventListener('click', async () => {
        if (window.LEETTEST_UPDATE_STATE.required) {
            return;
        }

        outputDiv.innerHTML = '';
        loadingDiv.style.display = 'block';

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs && tabs.length > 0) {
                const activeTab = tabs[0];
                if (!activeTab.url.includes('leetcode.com/problems/')) {
                    loadingDiv.style.display = 'none';
                    outputDiv.innerHTML = `<p style="color: red;">Please be on a LeetCode problem page.</p>`;
                } else {
                    try {
                        const activeTabUrl = activeTab.url.split("/")[4];
                        const response = await fetch(`${normalizedBackendBaseUrl}/api/${activeTabUrl}`, {
                            headers: {
                                'X-Extension-Version': extensionVersion
                            }
                        });
                        const testCases = await response.json();

                        if (window.LEETTEST_API.isUpdateRequiredResponse(response.status, testCases)) {
                            setUpdateRequiredState(testCases.message);
                            return;
                        }

                        if (!response.ok) {
                            throw new Error(testCases.message || 'Failed to fetch test cases.');
                        }

                        loadingDiv.style.display = 'none';
                        outputDiv.innerHTML = `<br>Test cases fetched successfully.`;

                        chrome.tabs.sendMessage(
                            activeTab.id,
                            { action: "checkButtonAndInject", data: testCases },
                            (result) => {
                                if (chrome.runtime.lastError) {
                                    console.error('sendMessage failed:', chrome.runtime.lastError.message);
                                    loadingDiv.style.display = 'none';
                                    outputDiv.innerHTML = `<p style="color: red;">Injection failed: ${chrome.runtime.lastError.message}</p>`;
                                    return;
                                }

                                if (result && result.success === false) {
                                    outputDiv.innerHTML = `<p style="color: red;">Injection failed: ${result.reason || 'unknown error'}</p>`;
                                }
                            }
                        );
                    } catch (error) {
                        loadingDiv.style.display = 'none';
                        outputDiv.innerHTML = `<p style="color: red;">Error fetching test cases: ${error.message}</p>`;
                        console.error(error);
                    }
                }
            } else {
                loadingDiv.style.display = 'none';
                outputDiv.innerHTML = '<p style="color: red;">No active tab found.</p>';
                console.error('no active tab');
            }
        });
    });
});