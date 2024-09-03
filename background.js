chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Phishing Scanner installed');
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  if (tab.url.includes('mail.google.com')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: executeScriptOnEmailPage
      });
    });
  } else {
    console.log('Not a Gmail tab.');
  }
});

function executeScriptOnEmailPage() {
  function checkIfInEmail() {
    const gmailUrlPattern = /mail.google.com\/mail\/u\/\d+\/#inbox\/\S+/;
    if (gmailUrlPattern.test(window.location.href)) {
      gatherUrlsAndCheck();
    } else {
      console.log('Not in an email view.');
    }
  }

  async function gatherUrlsAndCheck() {
    const emailBody = document.querySelector('.ii.gt');
    if (!emailBody) {
      console.log('Email body not found.');
      return;
    }

    const links = Array.from(emailBody.querySelectorAll('a'))
      .map(a => ({ href: a.href, elementIndex: Array.from(emailBody.querySelectorAll('a')).indexOf(a) }))
      //.filter(link => !link.href.startsWith('mailto:'));
     
    if (links.length === 0) {
      console.log('No links found in email body.');
      return;
    }

    chrome.runtime.sendMessage({ action: 'checkUrls', links: links });
  }

  checkIfInEmail();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkUrls') {
    checkUrlsSafety(message.links)
      .then(results => {
        results.forEach((result, index) => {
          const linkInfo = message.links[index];
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'displayResult',
            url: linkInfo.href,
            elementIndex: linkInfo.elementIndex,
            safe: result
          });
        });
      })
      .catch(error => {
        console.error('Error checking URLs:', error);
      });
    return true; // Keep the message channel open for sendResponse
  }
});

async function checkUrlsSafety(links) {
  const results = [];
  for (const link of links) {
    try {
      const isSafe = await checkUrlSafety(canonicalizeUrl(link.href));
      results.push(isSafe);
    } catch (error) {
      console.error(`Error checking URL ${link.href}:`, error);
      results.push(false); // Assume unsafe if there's an error
    }
  }
  return results;
}

function canonicalizeUrl(url) {
  try {
    url = url.replace(/[\t\r\n]/g, '');

    const fragmentIndex = url.indexOf('#');
    if (fragmentIndex > -1) {
      url = url.substring(0, fragmentIndex);
    }

    let previousUrl;
    do {
      previousUrl = url;
      url = decodeURIComponent(url);
    } while (previousUrl !== url);

    const parsedUrl = new URL(url);
    parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
    return parsedUrl.toString();
  } catch (e) {
    console.error(`Error canonicalizing URL ${url}:`, e);
    return url;
  }
}

async function checkUrlSafety(url) {
  const apiKey = 'AIzaSyAtleXDB1YoCK1VB32lAFYMqB_PCQ3BUHE'; // Replace with your actual API key
  const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  const requestBody = {
    client: {
      clientId: "yourcompanyname",
      clientVersion: "1.5.2"
    },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [
        { url: url }
      ]
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Network response was not ok: ${response.statusText}, ${errorText}`);
  }

  const responseBody = await response.json();
  console.log('Google Safe Browsing response for', url, ':', JSON.stringify(responseBody, null, 2));

  return !responseBody.matches || responseBody.matches.length === 0;
}
