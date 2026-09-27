// Garante que o painel lateral abra ao clicar no ícone da extensão (Chrome / Edge)
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));
}