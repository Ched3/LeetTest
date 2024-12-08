document.getElementById('fetch-data').addEventListener('click', async () => {
    const outputDiv = document.getElementById('output');
    
    try {
        // Fetch data from the Flask backend
        const response = await fetch('http://127.0.0.1:5000/api/data');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Expect the response to be a plain text string
        const data = await response.text(); // Use response.text() for string responses
        
        // Append the data below the button
        const paragraph = document.createElement('p');
        paragraph.textContent = data; // Display the string directly
        outputDiv.appendChild(paragraph); // Append instead of replacing content
    } catch (error) {
        // Handle errors and display an error message
        outputDiv.innerHTML = `<p style="color: red;">Error fetching data: ${error.message}</p>`;
        console.error(error);
    }
});
