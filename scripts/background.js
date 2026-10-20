const BACKEND_BASE_URL = 'https://kohlenz.com/leettest';

const RATING_CACHE_KEY = 'leettest_rating_cache';
const RATING_CACHE_MAX_ENTRIES = 1000;
const RATING_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const loadRatingCache = async () => {
    try {
        const stored = await chrome.storage.local.get(RATING_CACHE_KEY);
        const cache = stored[RATING_CACHE_KEY];
        if (cache && Array.isArray(cache.order) && cache.entries && typeof cache.entries === 'object') {
            return cache;
        }
    } catch (err) {
        console.warn('rating cache load failed:', err);
    }
    return { order: [], entries: {} };
};

const saveRatingCache = async (cache) => {
    try {
        await chrome.storage.local.set({ [RATING_CACHE_KEY]: cache });
    } catch (err) {
        console.warn('rating cache save failed:', err);
    }
};

const readCachedRating = async (slug) => {
    const cache = await loadRatingCache();
    const entry = cache.entries[slug];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > RATING_CACHE_TTL_MS) {
        delete cache.entries[slug];
        cache.order = cache.order.filter((s) => s !== slug);
        await saveRatingCache(cache);
        return null;
    }
    cache.order = [slug, ...cache.order.filter((s) => s !== slug)];
    await saveRatingCache(cache);
    return entry.data;
};

const writeCachedRating = async (slug, data) => {
    const cache = await loadRatingCache();
    cache.entries[slug] = { data, fetchedAt: Date.now() };
    cache.order = [slug, ...cache.order.filter((s) => s !== slug)];
    while (cache.order.length > RATING_CACHE_MAX_ENTRIES) {
        const evicted = cache.order.pop();
        delete cache.entries[evicted];
    }
    await saveRatingCache(cache);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchRating') {
        (async () => {
            try {
                const cached = await readCachedRating(message.slug);
                if (cached !== null) {
                    sendResponse({ success: true, data: cached });
                    return;
                }
                const res = await fetch(`${BACKEND_BASE_URL}/rating/${message.slug}`);
                const data = await res.json();
                if (data && data.rating != null) {
                    await writeCachedRating(message.slug, data);
                }
                sendResponse({ success: true, data });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }
});

// Browsers only add content scripts to pages loaded after install/update, so LeetCode tabs
// that are already open would show no ratings/tags and couldn't receive testcases until a
// refresh. Inject into them now. The scripts guard against running twice.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install' && reason !== 'update') return;
    const { js, matches } = chrome.runtime.getManifest().content_scripts[0];
    try {
        const tabs = await chrome.tabs.query({ url: matches });
        await Promise.all(tabs.map((tab) =>
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: js })
                .catch((err) => console.warn(`could not inject into tab ${tab.id}:`, err))
        ));
    } catch (err) {
        console.warn('injecting into open LeetCode tabs failed:', err);
    }
});
