const ICONS = {
    active: { path: "icon_150.png" },   // Цветная иконка
    inactive: { path: "icon_150d.png" } // Серая иконка
};


function isLetterOpened(url) {
    if (!url) return false;

    return url.includes("mail.yandex.ru") &&
        (url.includes("/message/") ||
            url.includes("#message/") ||
            url.includes("/thread/"));
}

function updateIcon(url) {
    const state = isLetterOpened(url) ? "active" : "inactive";
    chrome.action.setIcon(ICONS[state]);

    console.log("URL:", url, "| Icon:", state);
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab?.url) updateIcon(tab.url);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) updateIcon(changeInfo.url);
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) updateIcon(tabs[0].url);
});
