document.addEventListener('DOMContentLoaded', () => {
    const outputDiv = document.getElementById('output');
    const loadingDiv = document.getElementById('loading');

    document.getElementById('fetch-data').addEventListener('click', async () => {
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
                        const response = await fetch(`https://kohlenz.com/leettest/api/${activeTabUrl}`);
                        const testCases = await response.json();
                        loadingDiv.style.display = 'none';
                        outputDiv.innerHTML = `<br>Test cases fetched successfully.`;

                        chrome.tabs.sendMessage(activeTab.id, { action: "checkButtonAndInject", data: testCases });
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