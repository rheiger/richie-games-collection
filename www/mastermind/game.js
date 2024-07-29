const gameConfig = {
    useColors: true,
    useDigits: false,
    allowDuplicates: true,
    maxAttempts: 10,
    codeLength: 4
};

const colors = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

let secretCode = [];
let currentGuess = [];
let attempts = [];
let selectedDent = null;

function initGame() {
    secretCode = generateSecretCode();
    currentGuess = new Array(gameConfig.codeLength).fill(null);
    attempts = [];
    selectedDent = null;
    renderGameBoard();
    renderInputSelector(); // Add this line
    addKeyboardListeners();
}

function renderInputSelector() {
    const inputSelector = document.getElementById('input-selector');
    inputSelector.innerHTML = '';
    const items = gameConfig.useColors ? colors : digits;
    items.forEach(item => {
        const button = document.createElement('button');
        button.className = 'input-tile';
        button.draggable = true;
        if (gameConfig.useColors) {
            button.style.backgroundColor = item;
        } else {
            button.textContent = item;
        }
        button.addEventListener('click', () => handleTileClick(item));
        button.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', item));
        inputSelector.appendChild(button);
    });
}

function generateSecretCode() {
    const codeSet = gameConfig.useColors ? colors : digits;
    const code = [];
    for (let i = 0; i < gameConfig.codeLength; i++) {
        let item;
        do {
            item = codeSet[Math.floor(Math.random() * codeSet.length)];
        } while (!gameConfig.allowDuplicates && code.includes(item));
        code.push(item);
    }
    return code;
}

function renderGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    for (let i = 0; i < gameConfig.maxAttempts; i++) {
        const row = document.createElement('div');
        row.className = 'game-row';
        row.dataset.row = i;
        for (let j = 0; j < gameConfig.codeLength; j++) {
            const dent = document.createElement('div');
            dent.className = 'peg dent';
            dent.dataset.col = j;
            dent.addEventListener('click', () => selectDent(i, j));
            dent.addEventListener('dragover', (e) => e.preventDefault());
            dent.addEventListener('drop', (e) => handleDrop(e, i, j));
            row.appendChild(dent);
        }
        const feedback = document.createElement('div');
        feedback.className = 'feedback';
        feedback.textContent = '?';
        row.appendChild(feedback);
        gameBoard.appendChild(row);
    }
}

function renderGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    for (let i = 0; i < gameConfig.maxAttempts; i++) {
        const row = document.createElement('div');
        row.className = 'game-row';
        if (i === gameConfig.maxAttempts - 1) {
            row.classList.add('active-row');
        }
        row.dataset.row = i;
        for (let j = 0; j < gameConfig.codeLength; j++) {
            const dent = document.createElement('div');
            dent.className = 'peg dent';
            dent.dataset.col = j;
            dent.addEventListener('click', () => selectDent(i, j));
            dent.addEventListener('dragover', (e) => e.preventDefault());
            dent.addEventListener('drop', (e) => handleDrop(e, i, j));
            row.appendChild(dent);
        }
        const feedback = document.createElement('div');
        feedback.className = 'feedback';
        feedback.addEventListener('click', () => submitGuessFromFeedback(i));
        row.appendChild(feedback);
        gameBoard.appendChild(row);
    }
}

function submitGuessFromFeedback(row) {
    console.log('submitted guess for row='+row);
    if (row === gameConfig.maxAttempts - attempts.length - 1) {
        submitGuess();
    }
}

function updateFeedback(feedback, rowIndex) {
    const feedbackElement = document.querySelectorAll('.game-row')[rowIndex].querySelector('.feedback');
    feedbackElement.innerHTML = '';
    feedbackElement.className = 'feedback feedback-pegs';

    // Create a container for the pegs
    const pegContainer = document.createElement('div');
    pegContainer.className = 'peg-container';

    // Add black pegs for correct guesses
    for (let i = 0; i < feedback.correct; i++) {
        const peg = document.createElement('div');
        peg.className = 'feedback-peg black-peg';
        pegContainer.appendChild(peg);
    }

    // Add white pegs for misplaced guesses
    for (let i = 0; i < feedback.misplaced; i++) {
        const peg = document.createElement('div');
        peg.className = 'feedback-peg white-peg';
        pegContainer.appendChild(peg);
    }

    // Append the peg container to the feedback element
    feedbackElement.appendChild(pegContainer);
}

function selectDent(row, col) {
    if (row !== gameConfig.maxAttempts - attempts.length - 1) return;
    const dents = document.querySelectorAll('.dent');
    dents.forEach(dent => dent.classList.remove('selected'));
    const selectedDentElement = document.querySelector(`.game-row[data-row="${row}"] .dent[data-col="${col}"]`);
    selectedDentElement.classList.add('selected');
    selectedDent = { row, col };
}

function handleDrop(e, row, col) {
    e.preventDefault();
    if (row !== gameConfig.maxAttempts - attempts.length - 1) return;
    const item = e.dataTransfer.getData('text');
    placeTile(item, row, col);
}

function handleTileClick(item) {
    if (selectedDent) {
        placeTile(item, selectedDent.row, selectedDent.col);
    }
}

function placeTile(item, row, col) {
    if (row !== gameConfig.maxAttempts - attempts.length - 1) return;
    currentGuess[col] = item;
    updateActiveRow();
    selectedDent = null;
    document.querySelectorAll('.dent').forEach(dent => dent.classList.remove('selected'));
}

function addToGuess(item) {
    if (currentGuess.length < gameConfig.codeLength) {
        currentGuess.push(item);
        updateActiveRow();
    }
}

function updateActiveRow() {
    const activeRow = document.querySelectorAll('.game-row')[gameConfig.maxAttempts - attempts.length - 1];
    const dents = activeRow.querySelectorAll('.dent');
    currentGuess.forEach((item, index) => {
        if (item) {
            if (gameConfig.useColors) {
                dents[index].style.backgroundColor = item;
            } else {
                dents[index].textContent = item;
            }
        } else {
            dents[index].style.backgroundColor = '';
            dents[index].textContent = '';
        }
    });
}

function addKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        if (!selectedDent) return;
        const key = e.key.toLowerCase();
        if (gameConfig.useDigits && digits.includes(key)) {
            placeTile(key, selectedDent.row, selectedDent.col);
        } else if (gameConfig.useColors) {
            const colorIndex = 'rbgywo'.indexOf(key);
            if (colorIndex !== -1) {
                placeTile(colors[colorIndex], selectedDent.row, selectedDent.col);
            }
        }
    });
}

function submitGuess() {
    console.log('submitGuess called');
    const activeRowIndex = gameConfig.maxAttempts - attempts.length - 1;
    const activeRow = document.querySelectorAll('.game-row')[activeRowIndex];
    const activeDents = activeRow.querySelectorAll('.dent');
    
    // Check if all dents in the active row are filled
    const isRowComplete = Array.from(activeDents).every(dent => 
        dent.style.backgroundColor !== '' || dent.textContent !== '');

    if (isRowComplete) {
        // Collect the guess from the active row
        currentGuess = Array.from(activeDents).map(dent => 
            gameConfig.useColors ? dent.style.backgroundColor : dent.textContent);

        const feedback = calculateFeedback();
        attempts.push({ guess: [...currentGuess], feedback });
        updateFeedback(feedback, activeRowIndex);

        if (feedback.correct === gameConfig.codeLength) {
            endGame(true);
        } else if (attempts.length >= gameConfig.maxAttempts) {
            endGame(false);
        } else {
            // Prepare for the next guess
            currentGuess = new Array(gameConfig.codeLength).fill(null);
            // Move the 'active-row' class to the new active row
            activeRow.classList.remove('active-row');
            const nextActiveRow = document.querySelectorAll('.game-row')[activeRowIndex - 1];
            if (nextActiveRow) {
                nextActiveRow.classList.add('active-row');
            }
        }
    } else {
        console.log('Current row is not completely filled');
        // Optionally, display a message to the user
    }
}

function calculateFeedback() {
    let correct = 0;
    let misplaced = 0;
    const codeCopy = [...secretCode];
    const guessCopy = [...currentGuess];

    for (let i = 0; i < gameConfig.codeLength; i++) {
        if (guessCopy[i] === codeCopy[i]) {
            correct++;
            codeCopy[i] = guessCopy[i] = null;
        }
    }

    for (let i = 0; i < gameConfig.codeLength; i++) {
        if (guessCopy[i] !== null) {
            const index = codeCopy.indexOf(guessCopy[i]);
            if (index !== -1) {
                misplaced++;
                codeCopy[index] = null;
            }
        }
    }

    return { correct, misplaced };
}

function endGame(isWin) {
    const message = document.getElementById('message');
    if (isWin) {
        message.textContent = 'Congratulations! You cracked the code!';
    } else {
        message.textContent = `Game over. The secret code was: ${secretCode.join(', ')}`;
    }
    // Disable inputs or show a new game button
}

function giveUp() {
    endGame(false);
}

function toggleGameMode(mode) {
    gameConfig[mode] = !gameConfig[mode];
    if (mode === 'useColors' || mode === 'useDigits') {
        gameConfig.useColors = mode === 'useColors';
        gameConfig.useDigits = !gameConfig.useColors;
    }
    initGame();
}

function setDifficulty(level) {
    switch (level) {
        case 'easy':
            gameConfig.maxAttempts = 12;
            break;
        case 'medium':
            gameConfig.maxAttempts = 10;
            break;
        case 'hard':
            gameConfig.maxAttempts = 8;
            break;
        case 'unlimited':
            gameConfig.maxAttempts = Infinity;
            break;
    }
    initGame();
}

// Initialize the game when the script loads
document.addEventListener('DOMContentLoaded', initGame);