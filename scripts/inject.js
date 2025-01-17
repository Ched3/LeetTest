const ensureButtonPressed = () => {
    const button = document.querySelector(
        '.text-label-3.dark\\:text-dark-label-3.group-hover\\:text-label-2.dark\\:group-hover\\:text-dark-label-2'
    );

    const pressedIndicator = document.querySelector(
        '.text-label-4.dark\\:text-dark-label-4.flex-nowrap.items-center.space-x-2.whitespace-nowrap.py-1.pr-1.text-xs.flex'
    );

    if (button) {
        if (pressedIndicator) {
            return true;
        } else {
            button.click();
            return false;
        }
    } else {
        console.error("button not found");
        return false;
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkButtonAndInject") {
        const testCases = request.data;

        const isButtonPressed = ensureButtonPressed();

        if (isButtonPressed) {
            const editorContainer = document.querySelector('.cm-content');
            if (editorContainer) {
                editorContainer.innerHTML = '';
                testCases.forEach((line) => {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'cm-line';
                    lineDiv.textContent = line;
                    editorContainer.appendChild(lineDiv);
                });
                console.log("successful injection");
            }
        } else {
            console.log("failure");
        }
}});