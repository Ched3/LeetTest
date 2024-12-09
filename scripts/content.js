try {
    const response = await fetch('http://127.0.0.1:5000/api/data');
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    console.log(data)

} catch (error) {
    console.error(error);
}

console.log("Path Name: " + window.location.pathname)