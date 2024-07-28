const languages = {
    'en': { emoji: '🇬🇧', name: 'English' },
    'de': { emoji: '🇩🇪', name: 'Deutsch' },
    'fr': { emoji: '🇫🇷', name: 'Français' },
    'it': { emoji: '🇮🇹', name: 'Italiano' },
    'sv': { emoji: '🇸🇪', name: 'Svenska' },
    'sk': { emoji: '🇸🇰', name: 'Slovenčina' },
    'es': { emoji: '🇪🇸', name: 'Español' },
    'pt': { emoji: '🇵🇹', name: 'Português' },
    'no': { emoji: '🇳🇴', name: 'Norsk' },
    'fi': { emoji: '🇫🇮', name: 'Suomi' },
    'pl': { emoji: '🇵🇱', name: 'Polski' },
    'cs': { emoji: '🇨🇿', name: 'Čeština' }
};

function createLanguageButtons() {
    const languageSelector = document.getElementById('languageSelector');
    for (const [langCode, langInfo] of Object.entries(languages)) {
        const btn = document.createElement('button');
        btn.innerHTML = `${langInfo.emoji} ${langInfo.name}`;
        btn.className = 'language-btn';
        btn.setAttribute('data-lang', langCode);
        btn.onclick = () => setLanguage(langCode);
        languageSelector.appendChild(btn);
    }
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (element.tagName === 'SELECT') {
            element.querySelectorAll('option').forEach(option => {
                const optionKey = option.getAttribute('data-i18n');
                option.textContent = translations[lang][optionKey];
            });
        } else {
            element.textContent = translations[lang][key];
        }
    });

    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = translations[lang].generatingPuzzle;
    }
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

function detectLanguage() {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && languages[storedLang]) {
        return storedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    return languages[browserLang] ? browserLang : 'en';
}

// release-notes.js

function toggleReleaseNotes() {
    console.log("toggleReleaseNotes called");
    const notes = document.getElementById('release-notes');
    if (notes.style.display === 'none') {
        console.log("Showing release notes");
        notes.style.display = 'block';
        populateReleaseNotes();
    } else {
        console.log("Hiding release notes");
        notes.style.display = 'none';
    }
}

function populateReleaseNotes() {
    console.log("Populating release notes");
    const notes = document.getElementById('release-notes');
    notes.innerHTML = `
        <strong>Version ${releaseInfo.version}</strong> - ${releaseInfo.notes}
        <ul style="margin: 5px 0 0 20px; padding: 0;">
            ${releaseInfo.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
    `;
}

function initReleaseNotes() {
    console.log("Initializing release notes");
    const releaseTag = document.getElementById('release-tag');
    if (releaseTag) {
        console.log("Release tag found, adding event listener");
        releaseTag.addEventListener('click', toggleReleaseNotes);
        releaseTag.addEventListener('touchstart', function (event) {
            event.preventDefault();
            toggleReleaseNotes();
        });
    } else {
        console.error("Release tag not found");
    }
}

// Close release notes when clicking outside
document.addEventListener('click', function (event) {
    console.log("Document clicked");
    const releaseTag = document.getElementById('release-tag');
    const releaseNotes = document.getElementById('release-notes');
    if (releaseTag && releaseNotes && !releaseTag.contains(event.target) && !releaseNotes.contains(event.target)) {
        console.log("Closing release notes");
        releaseNotes.style.display = 'none';
    }
});

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initReleaseNotes);

// Export the functions if using modules
// export { detectLanguage, createLanguageButtons, toggleReleaseNotes, populateReleaseNotes, initReleaseNotes };