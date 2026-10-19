document.addEventListener('DOMContentLoaded', () => {
    const { showView, showStatus, clearStatus, getActiveProblem, formatSlug } = window.LEETTEST_UI;
    const reportIssueButton = document.getElementById('report-issue');
    const submitButton = document.getElementById('submit-report');
    const reportStatus = document.getElementById('report-status');
    const reportProblem = document.getElementById('report-problem');
    const reasonInputs = document.querySelectorAll('input[name="report-reason"]');
    const backendBaseUrl = (window.LEETTEST_BACKEND_BASE_URL || 'https://kohlenz.com/leettest').replace(/\/+$/, '');

    let activeSlug = '';
    let submitting = false;

    const isUpdateRequired = () => !!(window.LEETTEST_UPDATE_STATE && window.LEETTEST_UPDATE_STATE.required);
    const selectedReason = () => {
        const checked = document.querySelector('input[name="report-reason"]:checked');
        return checked ? checked.value : '';
    };
    const refreshSubmitState = () => {
        submitButton.disabled = submitting || !activeSlug || !selectedReason();
    };

    const resetForm = () => {
        reasonInputs.forEach((input) => { input.checked = false; });
        submitButton.textContent = 'Submit report';
        clearStatus(reportStatus);
        refreshSubmitState();
    };

    reportIssueButton.addEventListener('click', async () => {
        if (isUpdateRequired()) return;

        resetForm();
        showView('report');

        const { slug } = await getActiveProblem();
        activeSlug = slug;
        if (slug) {
            reportProblem.textContent = `What went wrong with the testcases for ${formatSlug(slug)}?`;
        } else {
            reportProblem.textContent = 'Open a LeetCode problem to report an issue with it.';
        }
        refreshSubmitState();
    });

    reasonInputs.forEach((input) => input.addEventListener('change', refreshSubmitState));

    submitButton.addEventListener('click', async () => {
        const reason = selectedReason();
        if (isUpdateRequired() || submitting || !reason || !activeSlug) return;

        submitting = true;
        submitButton.textContent = 'Submitting…';
        refreshSubmitState();
        clearStatus(reportStatus);

        const extensionVersion = window.LEETTEST_EXTENSION_VERSION || chrome.runtime.getManifest().version;

        try {
            const response = await fetch(`${backendBaseUrl}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-Version': extensionVersion
                },
                body: JSON.stringify({
                    problem_name: activeSlug,
                    issue_type: reason
                })
            });
            const data = await response.json().catch(() => ({}));

            if (window.LEETTEST_API && window.LEETTEST_API.isUpdateRequiredResponse(response.status, data)) {
                window.LEETTEST_API.setUpdateRequiredState(data.message);
                showView('main');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to submit report.');
            }

            showStatus(reportStatus, 'success', 'Thanks! Your report was submitted.');
            submitButton.textContent = 'Submitted';
            setTimeout(() => {
                if (!document.querySelector('[data-view="report"]').hidden) showView('main');
            }, 1500);
        } catch (error) {
            console.error('Error:', error);
            showStatus(reportStatus, 'error', error.message || 'Error submitting report.');
            submitButton.textContent = 'Submit report';
        } finally {
            submitting = false;
            // Keep the button disabled after a successful submit so it can't be double-sent.
            if (submitButton.textContent === 'Submitted') {
                submitButton.disabled = true;
            } else {
                refreshSubmitState();
            }
        }
    });
});
