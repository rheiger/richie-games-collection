const gameConfig = {
    useColors: true,
    allowDuplicates: false,
    codeLength: 4,
    maxAttempts: 12
};

const colors = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
const digits6 = ['1', '2', '3', '4', '5', '6'];
const digits9 = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

let secretCode = [];
let currentGuess = [];
let attempts = [];
let selectedDent = null;
let activeRowIndex = gameConfig.maxAttempts - 1;

function initGame() {
    // Check the gameMode value and update gameConfig accordingly
    const mode = document.getElementById('gameMode').value;
    gameConfig.useColors = mode.startsWith('color');
    gameConfig.allowDuplicates = mode.endsWith('Repeat');
    gameConfig.maxDigit = mode.includes('6') ? 6 : 9;

    secretCode = generateSecretCode();
    currentGuess = new Array(gameConfig.codeLength).fill(null);
    attempts = [];
    selectedDent = null;
    activeRowIndex = 0; // Start from the top row
    renderGameBoard();
    renderInputSelector();
    addKeyboardListeners();
    setActiveRow(activeRowIndex);
    updateFeedbackStates();
}

function generateSecretCode() {
    const codeSet = getCodeSet();
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

function getCodeSet() {
    if (gameConfig.useColors) return colors;
    return gameConfig.maxDigit === 6 ? digits6 : digits9;
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
        feedback.dataset.row = i;
        row.appendChild(feedback);
        gameBoard.appendChild(row);
    }
    addFeedbackClickListeners();
    updateFeedbackStates();
}

function addFeedbackClickListeners() {
    const feedbackElements = document.querySelectorAll('.feedback');
    feedbackElements.forEach(feedback => {
        feedback.addEventListener('click', (e) => {
            const clickedRow = parseInt(e.target.dataset.row);
            if (clickedRow === activeRowIndex) {
                submitGuess();
            }
        });
    });
}

function submitGuessFromFeedback(row) {
    if (row === activeRowIndex) {
        submitGuess();
    }
}

function updateFeedbackStates() {
    const rows = document.querySelectorAll('.game-row');
    rows.forEach((row, index) => {
        const feedback = row.querySelector('.feedback');
        const dents = row.querySelectorAll('.dent');
        const isRowFilled = Array.from(dents).every(dent => dent.style.backgroundColor !== '' || dent.textContent !== '');
        
        if (index < activeRowIndex) {
            // Validated rows
            // Don't clear the content, as it should contain the validation pegs
            feedback.classList.remove('clickable', 'incomplete');
        } else if (index === activeRowIndex) {
            // Current active row
            if (!feedback.querySelector('.peg-container')) {
                // Only set to '?' if there are no validation pegs
                feedback.textContent = '?';
            }
            feedback.classList.add('clickable');
            feedback.classList.toggle('incomplete', !isRowFilled);
        } else {
            // Future rows
            feedback.textContent = '?';
            feedback.classList.remove('clickable');
            feedback.classList.add('incomplete');
        }
    });
}

function setActiveRow(rowIndex) {
    activeRowIndex = rowIndex;
    document.querySelectorAll('.game-row').forEach((row, index) => {
        row.classList.toggle('active-row', index === activeRowIndex);
    });
    updateFeedbackStates();
}

function renderInputSelector() {
    const inputSelector = document.getElementById('input-selector');
    inputSelector.innerHTML = '';
    const items = getCodeSet();
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

function submitGuessFromFeedback(row) {
    if (row === gameConfig.maxAttempts - attempts.length - 1) {
        submitGuess();
    }
}

function selectDent(row, col) {
    if (row !== activeRowIndex) return;
    const dents = document.querySelectorAll('.dent');
    dents.forEach(dent => dent.classList.remove('selected'));
    const selectedDentElement = document.querySelector(`.game-row[data-row="${row}"] .dent[data-col="${col}"]`);
    selectedDentElement.classList.add('selected');
    selectedDent = { row, col };
}

function handleDrop(e, row, col) {
    e.preventDefault();
    if (row !== activeRowIndex) return;
    const item = e.dataTransfer.getData('text');
    placeTile(item, row, col);
}

function handleTileClick(item) {
    if (selectedDent) {
        placeTile(item, selectedDent.row, selectedDent.col);
    }
}

function placeTile(item, row, col) {
    if (row !== activeRowIndex) return;
    const activeRow = document.querySelector(`.game-row[data-row="${activeRowIndex}"]`);
    const dent = activeRow.querySelector(`.dent[data-col="${col}"]`);
    if (gameConfig.useColors) {
        dent.style.backgroundColor = item;
        dent.textContent = '';
    } else {
        dent.textContent = item;
        dent.style.backgroundColor = '';
    }
    currentGuess[col] = item;
    selectedDent = null;
    document.querySelectorAll('.dent').forEach(d => d.classList.remove('selected'));
    updateFeedbackStates();
}

function addToGuess(item) {
    if (currentGuess.length < gameConfig.codeLength) {
        currentGuess.push(item);
        updateActiveRow();
    }
}

function updateActiveRow() {
    const activeRow = document.querySelector(`.game-row[data-row="${activeRowIndex}"]`);
    const dents = activeRow.querySelectorAll('.dent');
    currentGuess.forEach((item, index) => {
        if (item) {
            if (gameConfig.useColors) {
                dents[index].style.backgroundColor = item;
                dents[index].textContent = '';
            } else {
                dents[index].textContent = item;
                dents[index].style.backgroundColor = '';
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
        if (!gameConfig.useColors) {
            // For number mode
            const maxDigit = gameConfig.maxDigit;
            if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key) && parseInt(key) <= maxDigit) {
                placeTile(key, activeRowIndex, selectedDent.col);
            }
        } else {
            // For color mode (unchanged)
            const colorIndex = 'rbgywo'.indexOf(key);
            if (colorIndex !== -1) {
                placeTile(colors[colorIndex], activeRowIndex, selectedDent.col);
            }
        }
    });
}


function submitGuess() {
    const activeRow = document.querySelector(`.game-row[data-row="${activeRowIndex}"]`);
    const activeDents = activeRow.querySelectorAll('.dent');
    
    const isRowComplete = Array.from(activeDents).every(dent => 
        dent.style.backgroundColor !== '' || dent.textContent !== '');

    if (isRowComplete) {
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
            currentGuess = new Array(gameConfig.codeLength).fill(null);
            setActiveRow(activeRowIndex + 1); // Move to the next row down
        }
        updateFeedbackStates();
    } else {
        alert(getMessage('fillAllPositions', currentLanguage));
    }
}

function updateFeedback(feedback, rowIndex) {
    const feedbackElement = document.querySelector(`.game-row[data-row="${rowIndex}"]`).querySelector('.feedback');
    feedbackElement.innerHTML = '';
    feedbackElement.className = 'feedback feedback-pegs';

    const pegContainer = document.createElement('div');
    pegContainer.className = 'peg-container';

    for (let i = 0; i < feedback.correct; i++) {
        const peg = document.createElement('div');
        peg.className = 'feedback-peg black-peg';
        pegContainer.appendChild(peg);
    }

    for (let i = 0; i < feedback.misplaced; i++) {
        const peg = document.createElement('div');
        peg.className = 'feedback-peg white-peg';
        pegContainer.appendChild(peg);
    }

    feedbackElement.appendChild(pegContainer);
    updateFeedbackStates(); // Call this to ensure proper styling
}

function changeGameMode() {
    const mode = document.getElementById('gameMode').value;
    gameConfig.useColors = mode.startsWith('color');
    gameConfig.allowDuplicates = mode.endsWith('Repeat');
    gameConfig.maxDigit = mode.includes('6') ? 6 : 9;
    initGame(); // This will reset the game with the new settings
}

function restartGame() {
    initGame();
    document.getElementById('message').textContent = '';
    document.querySelectorAll('.game-row').forEach(row => {
        row.querySelectorAll('.dent').forEach(dent => {
            dent.style.backgroundColor = '';
            dent.textContent = '';
        });
        row.querySelector('.feedback').innerHTML = '';
    });
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
    document.querySelectorAll('.dent').forEach(dent => dent.style.pointerEvents = 'none');
}

function giveUp() {
    endGame(false);
}

// Initialize the game when the script loads
document.addEventListener('DOMContentLoaded', initGame);