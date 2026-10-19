const DEFAULT_SETTINGS = {
    showRating: true,
    showCompanies: true
};

const DIFFICULTY_BADGE_SELECTOR = [
    'easy',
    'medium',
    'hard'
].map((level) =>
    `.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-difficulty-${level}`
).join(', ');

// Firefox's `browser` namespace always returns promises; Chrome MV3's `chrome` does too.
const extensionApi = globalThis.browser ?? globalThis.chrome;

const COMPANY_CONTAINER_CLASS = 'custom-company-button';
const RATING_NOT_FOUND = 'Not found';

function getLeetCodeProblemSlug() {
    const pathname = window.location.pathname || '';
    const match = pathname.match(/^\/problems\/([^/]+)/);
    return match ? match[1] : '';
}

// clist returns null when it has no rating; the backend stores 0 when the lookup fails.
function formatRating(rating) {
    const numeric = Number(rating);
    if (rating === null || rating === undefined || rating === '' || !Number.isFinite(numeric) || numeric <= 0) {
        return RATING_NOT_FOUND;
    }
    return String(Math.round(numeric));
}

function getDifficultyLabel(badge) {
    if (badge.classList.contains('text-difficulty-hard')) return 'Hard';
    if (badge.classList.contains('text-difficulty-medium')) return 'Medium';
    if (badge.classList.contains('text-difficulty-easy')) return 'Easy';
    return badge.textContent.trim();
}

(async function () {
    let settings = { ...DEFAULT_SETTINGS };
    let currentSlug = '';
    let ratingText = null; // null = not loaded yet for currentSlug
    let companiesData = null;

    try {
        settings = { ...DEFAULT_SETTINGS, ...(await extensionApi.storage.sync.get(DEFAULT_SETTINGS)) };
    } catch (error) {
        console.error('failed to load settings', error);
    }

    const loadCompanies = async () => {
        if (companiesData) return companiesData;
        try {
            const response = await fetch(extensionApi.runtime.getURL('scripts/companies.json'));
            companiesData = await response.json();
        } catch (error) {
            console.error('Error loading companies.json:', error);
            companiesData = {};
        }
        return companiesData;
    };

    const fetchRating = async (slug) => {
        try {
            const response = await extensionApi.runtime.sendMessage({ action: 'fetchRating', slug });
            if (!response || !response.success) {
                throw new Error(response?.error || 'Rating fetch failed');
            }
            return formatRating(response.data && response.data.rating);
        } catch (error) {
            console.error('failed to get rating', error);
            return RATING_NOT_FOUND;
        }
    };

    // Rewrites the difficulty badge ("Medium" -> "Medium - 1834") or restores it when disabled.
    const applyRating = () => {
        const badge = document.querySelector(DIFFICULTY_BADGE_SELECTOR);
        if (!badge) return;

        const difficulty = getDifficultyLabel(badge);
        const desired = settings.showRating && ratingText !== null
            ? `${difficulty} - ${ratingText}`
            : difficulty;

        if (badge.textContent !== desired) {
            badge.textContent = desired;
        }
        badge.title = settings.showRating && ratingText !== null ? `LeetTest rating: ${ratingText}` : '';
    };

    const applyCompanies = () => {
        const existing = document.querySelector(`.${COMPANY_CONTAINER_CLASS}`);
        const companies = companiesData && companiesData[currentSlug];

        if (!settings.showCompanies || !companies || companies.length === 0) {
            if (existing) existing.remove();
            return;
        }
        if (existing && existing.dataset.slug === currentSlug) return;
        if (existing) existing.remove();

        const badge = document.querySelector(DIFFICULTY_BADGE_SELECTOR);
        if (!badge || !badge.parentElement) return;

        const container = document.createElement('div');
        container.className = `flex gap-1 ${COMPANY_CONTAINER_CLASS}`;
        container.dataset.slug = currentSlug;
        for (const company of companies) {
            const tag = document.createElement('div');
            tag.className = 'relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary';
            tag.style.whiteSpace = 'nowrap';
            tag.textContent = company[1];
            container.appendChild(tag);
        }
        badge.parentElement.insertAdjacentElement('afterend', container);
    };

    const applyAll = () => {
        applyRating();
        applyCompanies();
    };

    const onSlugChange = async (slug) => {
        currentSlug = slug;
        ratingText = null;
        applyAll();
        if (!slug) return;

        // Always fetch: the rating request also warms the backend's generator cache for this problem.
        const [rating] = await Promise.all([fetchRating(slug), loadCompanies()]);
        if (slug !== currentSlug) return; // user navigated away mid-request
        ratingText = rating;
        applyAll();
    };

    extensionApi.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            if (changes[key]) settings[key] = changes[key].newValue;
        }
        applyAll();
    });

    // LeetCode is an SPA that re-renders the header often: re-apply on DOM changes and
    // refetch only when the problem slug actually changes.
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            const slug = getLeetCodeProblemSlug();
            if (slug !== currentSlug) {
                onSlugChange(slug);
            } else {
                applyAll();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    onSlugChange(getLeetCodeProblemSlug());
})();
