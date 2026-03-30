const BACKEND_BASE_URL = 'https://kohlenz.com/leettest';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchRating') {
        const url = `${BACKEND_BASE_URL}/rating/${message.slug}`;
        fetch(url)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
