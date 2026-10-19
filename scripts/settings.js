// Keep these defaults in sync with DEFAULT_SETTINGS in modify.js.
const LEETTEST_DEFAULT_SETTINGS = {
    showRating: true,
    showCompanies: true
};

document.addEventListener('DOMContentLoaded', () => {
    const { showView } = window.LEETTEST_UI;
    const toggles = document.querySelectorAll('[data-setting]');

    document.getElementById('open-settings').addEventListener('click', () => showView('settings'));

    chrome.storage.sync.get(LEETTEST_DEFAULT_SETTINGS, (settings) => {
        toggles.forEach((toggle) => {
            toggle.checked = !!settings[toggle.dataset.setting];
        });
    });

    // modify.js listens to storage.onChanged, so open LeetCode tabs update immediately.
    toggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
            chrome.storage.sync.set({ [toggle.dataset.setting]: toggle.checked });
        });
    });
});
