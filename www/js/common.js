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

    // Dispatch a custom event to notify the game of language change
    const event = new CustomEvent('languageChanged', { detail: { language: lang } });
    document.dispatchEvent(event);
}

function detectLanguage() {
    console.log('Detecting language');
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && languages[storedLang]) {
        console.log('returning stored language ',storedLang);
        return storedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    console.log('returning browser language ',browserLang);
    return languages[browserLang] ? browserLang : 'en';
}

function getMessage(key, lang = 'en') {
    return translations[lang][key] || messages['en'][key]; // Fallback to English if key or language not found
}

function toggleReleaseNotes() {
    const notes = document.getElementById('release-notes');
    if (notes.style.display === 'none') {
        notes.style.display = 'block';
        populateReleaseNotes();
    } else {
        notes.style.display = 'none';
    }
}

function populateReleaseNotes() {
    const notes = document.getElementById('release-notes');
    notes.innerHTML = `
        <strong>Version ${releaseInfo.version}</strong> - ${releaseInfo.notes}
        <ul style="margin: 5px 0 0 20px; padding: 0;">
            ${releaseInfo.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
    `;
}

function initReleaseNotes() {
    const releaseTag = document.getElementById('release-tag');
    if (releaseTag) {
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
    const releaseTag = document.getElementById('release-tag');
    const releaseNotes = document.getElementById('release-notes');
    if (releaseTag && releaseNotes && !releaseTag.contains(event.target) && !releaseNotes.contains(event.target)) {
        releaseNotes.style.display = 'none';
    }
});

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initReleaseNotes);

// Make these functions global
window.detectLanguage = detectLanguage;
window.getMessage = getMessage;
window.setLanguage = setLanguage;
