// Shared popup helpers: view switching, status messages, and active-problem lookup.
(function () {
    const showView = (name) => {
        document.querySelectorAll('.view').forEach((view) => {
            view.hidden = view.dataset.view !== name;
        });
        document.dispatchEvent(new CustomEvent('leettest:view', { detail: { name } }));
    };

    // Renders a status pill into `container`. Returns the element so callers can remove it.
    const showStatus = (container, type, message, { autoHideMs = 0 } = {}) => {
        container.replaceChildren();
        const el = document.createElement('div');
        el.className = `status status--${type}`;
        const icon = document.getElementById(`icon-${type}`) || document.getElementById('icon-info');
        el.appendChild(icon.content.cloneNode(true));
        const text = document.createElement('span');
        text.textContent = message;
        el.appendChild(text);
        container.appendChild(el);

        if (autoHideMs > 0) {
            setTimeout(() => {
                if (el.parentElement === container) el.remove();
            }, autoHideMs);
        }
        return el;
    };

    const clearStatus = (container) => {
        container.replaceChildren();
    };

    // Store listing for whichever browser this is (Firefox has getBrowserInfo; Chrome doesn't).
    const isFirefox = typeof browser !== 'undefined' && !!browser.runtime && typeof browser.runtime.getBrowserInfo === 'function';
    const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/leettest/diinamlcdbbpfebknmhajjaijpflnaoe';
    const storeUrl = ({ reviews = false } = {}) => {
        const gecko = (chrome.runtime.getManifest().browser_specific_settings || {}).gecko;
        if (isFirefox && gecko && gecko.id) {
            return `https://addons.mozilla.org/firefox/addon/${encodeURIComponent(gecko.id)}/${reviews ? 'reviews/' : ''}`;
        }
        return reviews ? `${CHROME_STORE_URL}/reviews` : CHROME_STORE_URL;
    };

    const openReviewPage = () => {
        chrome.tabs.create({ url: storeUrl({ reviews: true }) });
        chrome.storage.local.set({ reviewPromptDone: true });
    };

    // After a few successful pastes, ask once for a review. Dismissing or clicking ends it for good.
    const REVIEW_PROMPT_AFTER = 5;
    const recordSuccess = () => {
        chrome.storage.local.get({ successCount: 0, reviewPromptDone: false }, ({ successCount, reviewPromptDone }) => {
            const count = successCount + 1;
            chrome.storage.local.set({ successCount: count });
            if (!reviewPromptDone && count >= REVIEW_PROMPT_AFTER) {
                document.getElementById('review-prompt').hidden = false;
            }
        });
    };

    const getProblemSlug = (url) => {
        const match = String(url || '').match(/leetcode\.com\/problems\/([^/?#]+)/);
        return match ? match[1] : '';
    };

    const formatSlug = (slug) => slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // Resolves to { tab, slug } for the active tab; slug is '' when not on a problem page.
    const getActiveProblem = () => new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            resolve({ tab: tab || null, slug: tab ? getProblemSlug(tab.url) : '' });
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-back]').forEach((button) => {
            button.addEventListener('click', () => showView('main'));
        });
        document.getElementById('version').textContent = chrome.runtime.getManifest().version;

        document.getElementById('review-link').addEventListener('click', (e) => {
            e.preventDefault();
            openReviewPage();
        });
        document.getElementById('review-yes').addEventListener('click', () => {
            document.getElementById('review-prompt').hidden = true;
            openReviewPage();
        });
        document.getElementById('review-no').addEventListener('click', () => {
            document.getElementById('review-prompt').hidden = true;
            chrome.storage.local.set({ reviewPromptDone: true });
        });
    });

    window.LEETTEST_UI = { showView, showStatus, clearStatus, getActiveProblem, formatSlug, storeUrl, recordSuccess };
})();
