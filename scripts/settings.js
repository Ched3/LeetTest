// Keep these defaults in sync with DEFAULT_SETTINGS in modify.js.
const LEETTEST_DEFAULT_SETTINGS = {
    showDifficulty: true,
    showRating: true,
    showCompanies: true
};

document.addEventListener('DOMContentLoaded', () => {
    const { showView } = window.LEETTEST_UI;
    const toggles = document.querySelectorAll('[data-setting]');
    const difficultyToggle = document.querySelector('[data-setting="showDifficulty"]');
    const ratingToggle = document.querySelector('[data-setting="showRating"]');

    // The rating lives inside the difficulty badge, so it can't show when difficulty is hidden.
    const syncDependentToggles = () => {
        ratingToggle.disabled = !difficultyToggle.checked;
        ratingToggle.closest('.setting').classList.toggle('setting--disabled', ratingToggle.disabled);
    };

    document.getElementById('open-settings').addEventListener('click', () => showView('settings'));

    chrome.storage.sync.get(LEETTEST_DEFAULT_SETTINGS, (settings) => {
        toggles.forEach((toggle) => {
            toggle.checked = !!settings[toggle.dataset.setting];
        });
        syncDependentToggles();
    });

    // modify.js listens to storage.onChanged, so open LeetCode tabs update immediately.
    toggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
            chrome.storage.sync.set({ [toggle.dataset.setting]: toggle.checked });
            syncDependentToggles();
        });
    });
});
