document.addEventListener('DOMContentLoaded', () => {
    const reportMenu = document.getElementById('report-menu');
    const reportIssueButton = document.getElementById('report-issue');
    const closeReportMenuButton = document.getElementById('close-report-menu');
    const overlay = document.getElementById('overlay');
    const outputDiv = document.getElementById('output');

    reportIssueButton.addEventListener('click', () => {
        reportMenu.style.display = 'block';
        overlay.style.display = 'block';
    });

    closeReportMenuButton.addEventListener('click', () => {
        reportMenu.style.display = 'none';
        overlay.style.display = 'none';
    });

    const reportReasonButtons = document.querySelectorAll('.report-reason');
    reportReasonButtons.forEach(button => {
        button.addEventListener('click', () => {
            const reason = button.getAttribute('data-reason');

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const activeTab = tabs[0];
                    const activeTabUrl = activeTab.url.split("/")[4];

                    fetch('https://kohlenz.com/leettest/report', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            problem_name: activeTabUrl,
                            issue_type: reason
                        }),
                    })
                    .then(response => {
                        if (response.ok) {
                            const successMessage = document.createElement('p');
                            successMessage.textContent = 'Report submitted successfully!';
                            successMessage.style.color = 'rgb(44, 187, 93)';
                            outputDiv.appendChild(successMessage);

                            setTimeout(() => {
                                outputDiv.removeChild(successMessage);
                            }, 5000);
                        } else {
                            const errorMessage = document.createElement('p');
                            errorMessage.textContent = 'Failed to submit report.';
                            errorMessage.style.color = 'rgb(239, 71, 67)';
                            outputDiv.appendChild(errorMessage);

                            setTimeout(() => {
                                outputDiv.removeChild(errorMessage);
                            }, 5000);
                        }
                        reportMenu.style.display = 'none';
                        overlay.style.display = 'none';
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        const errorMessage = document.createElement('p');
                        errorMessage.textContent = 'Error submitting report.';
                        errorMessage.style.color = 'rgb(239, 71, 67)';
                        outputDiv.appendChild(errorMessage);

                        setTimeout(() => {
                            outputDiv.removeChild(errorMessage);
                        }, 5000);

                        reportMenu.style.display = 'none';
                        overlay.style.display = 'none';
                    });
                } else {
                    reportMenu.style.display = 'none';
                    overlay.style.display = 'none';
                }
            });
        });
    });
});