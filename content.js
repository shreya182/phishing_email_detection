chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'displayResult') {
    displayResult(message.elementIndex, message.safe);
  }
});

function displayResult(elementIndex, isSafe) {
  const emailBody = document.querySelector('.ii.gt');
  const links = Array.from(emailBody.querySelectorAll('a'));
  const linkElement = links[elementIndex];

  if (!linkElement) return;

  linkElement.style.color = isSafe ? 'green' : 'red';
}
