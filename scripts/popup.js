document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fetch-data').addEventListener('click', async () => {
        const currentUrl = window.location.href;
        console.log(currentUrl);
        const outputDiv = document.getElementById('output');
        try {
            const response = await fetch('http://127.0.0.1:5000/api/data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            console.log(data);
            const paragraph = document.createElement('p');
            paragraph.textContent = data;
            outputDiv.appendChild(paragraph);
        } catch (error) {
            outputDiv.innerHTML = `<p style="color: red;">Error fetching data: ${error.message}</p>`;
            console.error(error);
        }
    });
});
