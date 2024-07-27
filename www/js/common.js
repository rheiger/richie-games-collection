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
