function getLeetCodeProblemSlug() {
    const pathname = window.location.pathname || '';
    const match = pathname.match(/^\/problems\/([^/]+)/);
    return match ? match[1] : '';
}

(async function () {
    let lastProblemSlug = getLeetCodeProblemSlug();

    async function updateCompany() {
        fetch(chrome.runtime.getURL('scripts/companies.json'))
            .then(response => response.json())
            .then(data => {
                const url = getLeetCodeProblemSlug();

                const existingButton = document.querySelector('.custom-company-button');
                if (existingButton) existingButton.remove();

                const companies = data[url];
                const button = document.createElement('div');
                button.className = "flex gap-1 custom-company-button";
                for (const company of companies) {
                    button.innerHTML += `<div class="relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary" style="white-space: nowrap;">${company[1]}</div>`;
                }

                const targetDiv = document.querySelector('.flex.gap-1 > .relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full');
                if (targetDiv) {
                    targetDiv.parentElement.insertAdjacentElement('afterend', button);
                }
            })
            .catch(error => console.error('Error loading companies.json:', error));
    }

    updateCompany();

    const observer = new MutationObserver(() => {
        const slug = getLeetCodeProblemSlug();
        if (slug && slug !== lastProblemSlug) {
            lastProblemSlug = slug;
            updateCompany();
        } else if (!slug && lastProblemSlug) {
            lastProblemSlug = '';
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

(async function () {
    let lastProblemSlug = getLeetCodeProblemSlug();

    async function updateRating() {
        const activeTabUrl = getLeetCodeProblemSlug();
        if (!activeTabUrl) {
            return;
        }
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchRating',
                slug: activeTabUrl
            });
            if (!response || !response.success) {
                throw new Error(response?.error || 'Rating fetch failed');
            }
            const rating = response.data.rating;

            const targetDiv = document.querySelector(
                '.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-difficulty-hard.dark\\:text-difficulty-hard, ' +
                '.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-difficulty-medium.dark\\:text-difficulty-medium, ' +
                '.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-difficulty-easy.dark\\:text-difficulty-easy'
            );

            if (targetDiv) {
                let difficulty = '';
                if (targetDiv.classList.contains('text-difficulty-hard')) {
                    difficulty = 'Hard';
                } else if (targetDiv.classList.contains('text-difficulty-medium')) {
                    difficulty = 'Medium';
                } else if (targetDiv.classList.contains('text-difficulty-easy')) {
                    difficulty = 'Easy';
                }
                targetDiv.textContent = `${difficulty} - ${rating}`;
            }
        } catch (error) {
            console.error('failed to get rating');
        }
    }

    updateRating();

    // Refetch only when the problem slug changes (same problem, different tabs/paths → no request).
    const observer = new MutationObserver(() => {
        const slug = getLeetCodeProblemSlug();
        if (slug && slug !== lastProblemSlug) {
            lastProblemSlug = slug;
            updateRating();
        } else if (!slug && lastProblemSlug) {
            lastProblemSlug = '';
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();