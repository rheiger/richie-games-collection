let currentPuzzle = [];
let currentSolution = [];
let isChecking = false;
let isSolutionVisible = false;
let currentLanguage = 'en';
let currentDifficulty = 'easy';

function updateCheckingButtonText() {
    const button = document.getElementById('toggle-checking');
    button.textContent = translations[currentLanguage][isChecking ? 'stopChecking' : 'startChecking'];
}

function generateSudoku(difficulty) {
    const board = Array(9).fill().map(() => Array(9).fill(0));

    function isValid(board, row, col, num) {
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num || board[x][col] === num) {
                return false;
            }
        }

        let boxRow = Math.floor(row / 3) * 3;
        let boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) {
                    return false;
                }
            }
        }

        return true;
    }

    function fillBoard(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    while (numbers.length > 0) {
                        let index = Math.floor(Math.random() * numbers.length);
                        let num = numbers[index];
                        numbers.splice(index, 1);
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (fillBoard(board)) {
                                return true;
                            }
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    fillBoard(board);

    const solution = board.map(row => [...row]);

    function hasUniqueSolution(board) {
        const emptyCell = findEmptyCell(board);
        if (!emptyCell) return true;

        const [row, col] = emptyCell;
        let solutionCount = 0;

        for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (hasUniqueSolution(board)) {
                    solutionCount++;
                }
                if (solutionCount > 1) {
                    board[row][col] = 0;
                    return false;
                }
                board[row][col] = 0;
            }
        }

        return solutionCount === 1;
    }

    function findEmptyCell(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    let cellsToRemove;
    switch (difficulty) {
        case 'trivial': cellsToRemove = 20; break;
        case 'easy': cellsToRemove = 30; break;
        case 'medium': cellsToRemove = 40; break;
        case 'hard': cellsToRemove = 50; break;
        case 'expert': cellsToRemove = 58; break;
        case 'ultimate': cellsToRemove = 62; break;
        default: cellsToRemove = 40;
    }

    const cellsToTry = [...Array(81)].map((_, i) => [Math.floor(i / 9), i % 9]);
    while (cellsToRemove > 0 && cellsToTry.length > 0) {
        const index = Math.floor(Math.random() * cellsToTry.length);
        const [row, col] = cellsToTry.splice(index, 1)[0];

        if (board[row][col] !== 0) {
            const temp = board[row][col];
            board[row][col] = 0;

            const boardCopy = board.map(row => [...row]);
            if (hasUniqueSolution(boardCopy)) {
                cellsToRemove--;
            } else {
                board[row][col] = temp;
            }
        }
    }

    return { puzzle: board, solution: solution };
}

function displaySudoku(puzzle) {
    const board = document.getElementById('sudoku-board');
    board.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'tel';
            input.inputMode = 'numeric';
            input.pattern = '[0-9]';
            input.maxLength = 1;
            input.dataset.row = i;
            input.dataset.col = j;

            if (puzzle[i][j] !== 0) {
                // This is a given number in the initial puzzle
                input.value = puzzle[i][j];
                input.readOnly = true;
                input.classList.add('given');
                input.tabIndex = -1;
            } else {
                // This is an empty cell for user input
                input.value = '';
                input.readOnly = false;
                input.tabIndex = 0;
            }

            input.addEventListener('input', handleInput);
            input.addEventListener('focus', handleFocus);
            input.addEventListener('mousedown', handleMouseDown);

            cell.appendChild(input);
            row.appendChild(cell);
        }
        board.appendChild(row);
    }

    // resizeSudokuBoard();
}

function handleFocus(e) {
    if (this.value && !this.readOnly) {
        setTimeout(() => {
            this.select();
        }, 0);
    }
}

function handleMouseDown(e) {
    if (this.readOnly) {
        e.preventDefault();
    }
}

function handleInput(e) {
    // Prevent changes to given values
    if (this.classList.contains('given')) {
        e.preventDefault();
        return;
    }

    // Handle hint requests
    if (this.value === '?' || this.value === '0') {
        showHint(this);
        e.preventDefault();
        checkCompletion();
        setTimeout(() => focusNextEmptyCell(this), 0);
        return;
    }

    // Handle digit input
    const originalValue = this.value;
    this.value = this.value.replace(/[^1-9]/g, '');

    if (this.value !== '') {
        // Valid digit entered
        this.classList.remove('hint', 'solution');
        this.classList.add('user-entered');

        let isCorrect = true;
        if (isChecking) {
            isCorrect = checkCell(this);
        }
        checkCompletion();

        // Advance to next cell only if not checking or if the entry is correct
        if (!isChecking || isCorrect) {
            setTimeout(() => focusNextEmptyCell(this), 0);
        }
    } else {
        // Input was cleared
        this.classList.remove('hint', 'solution', 'user-entered');
    }
}

function focusNextEmptyCell(currentCell) {
    const inputs = Array.from(document.querySelectorAll('#sudoku-board input:not(.given):not(.hint)'));
    const currentIndex = inputs.indexOf(currentCell);
    for (let i = currentIndex + 1; i < inputs.length; i++) {
        if (inputs[i].value === '') {
            inputs[i].focus();
            return;
        }
    }
    // If no empty cell found after current, loop back to beginning
    for (let i = 0; i < currentIndex; i++) {
        if (inputs[i].value === '') {
            inputs[i].focus();
            return;
        }
    }
}

function focusNextEmptyCell(currentCell) {
    const inputs = Array.from(document.querySelectorAll('#sudoku-board input'));
    const currentIndex = inputs.indexOf(currentCell);
    for (let i = currentIndex + 1; i < inputs.length; i++) {
        if (!inputs[i].readOnly) {
            inputs[i].focus();
            return;
        }
    }
    // If no empty cell found after current, loop back to beginning
    for (let i = 0; i < currentIndex; i++) {
        if (!inputs[i].readOnly) {
            inputs[i].focus();
            return;
        }
    }
}

function resizeSudokuBoard() {
    const container = document.querySelector('.container');
    const board = document.getElementById('sudoku-board');
    const availableWidth = Math.min(container.clientWidth - 40, 500); // 40px for container padding, max 500px
    const cellSize = Math.floor(availableWidth / 9);

    board.style.width = `${cellSize * 9}px`;
    board.style.height = `${cellSize * 9}px`;

    const inputs = board.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.width = `${cellSize}px`;
        input.style.height = `${cellSize}px`;
        input.style.fontSize = `${cellSize * 0.6}px`;
    });
}

function showHint(input) {
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    input.value = currentSolution[row][col];
    input.classList.add('hint');
    input.classList.remove('user-entered');
    input.readOnly = true;
    input.tabIndex = -1;
}

function showLoadingOverlay() {
    let loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        document.body.removeChild(loadingOverlay);
    }

    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    loadingOverlay.innerHTML = `
        <div class="spinner" style="
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        "></div>
        <p id="loading-text" style="color: white; margin-top: 10px;">${translations[currentLanguage].generatingPuzzle}</p>
    `;

    document.body.appendChild(loadingOverlay);

    // Force a reflow
    void loadingOverlay.offsetHeight;

    return new Promise(resolve => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

async function newGame() {
    currentDifficulty = document.getElementById('difficultySelect').value;
    await showLoadingOverlay();

    try {
        const result = await new Promise(resolve => {
            setTimeout(() => {
                const generatedPuzzle = generateSudoku(currentDifficulty);
                resolve(generatedPuzzle);
            }, 0);
        });

        currentPuzzle = result.puzzle;
        currentSolution = result.solution;
        displaySudoku(currentPuzzle);
        document.getElementById('message').textContent = '';
        document.querySelector('.overlay').classList.remove('show');
        isChecking = false;
        isSolutionVisible = false;
        updateCheckingButtonText();
    } catch (error) {
        document.getElementById('message').textContent = 'Error generating puzzle. Please try again.';
    } finally {
        hideLoadingOverlay();
    }
}

function checkCell(input) {
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    const value = parseInt(input.value) || 0;

    if (value === 0) {
        input.classList.remove('incorrect');
        return true;
    } else if (value !== currentSolution[row][col]) {
        input.classList.add('incorrect');
        return false;
    } else {
        input.classList.remove('incorrect');
        return true;
    }
}

function showCongratulations() {
    const overlay = document.querySelector('.overlay');
    overlay.classList.add('show');
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 3000);
}

function checkCompletion() {
    const board = Array(9).fill().map(() => Array(9).fill(0));
    const inputs = document.querySelectorAll('#sudoku-board input');
    let isComplete = true;

    // Fill the board array with current values
    inputs.forEach(input => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        const value = parseInt(input.value) || 0;
        board[row][col] = value;
        if (value === 0) isComplete = false;
    });

    // If not all cells are filled, don't show congratulations
    if (!isComplete) return;

    // Check rows
    for (let row = 0; row < 9; row++) {
        if (!isValidSet(board[row])) return;
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
        const column = board.map(row => row[col]);
        if (!isValidSet(column)) return;
    }

    // Check 3x3 sub-grids
    for (let i = 0; i < 9; i += 3) {
        for (let j = 0; j < 9; j += 3) {
            const subGrid = [];
            for (let x = 0; x < 3; x++) {
                for (let y = 0; y < 3; y++) {
                    subGrid.push(board[i + x][j + y]);
                }
            }
            if (!isValidSet(subGrid)) return;
        }
    }

    // If we've made it this far, the puzzle is solved correctly
    showCongratulations();
}

function isValidSet(arr) {
    const set = new Set(arr);
    return set.size === 9 && !set.has(0);
}

function toggleSolution() {
    isSolutionVisible = !isSolutionVisible;
    const inputs = document.querySelectorAll('#sudoku-board input:not(.given)');
    inputs.forEach(input => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        const currentValue = parseInt(input.value) || 0;
        const solutionValue = currentSolution[row][col];

        if (isSolutionVisible) {
            if (currentValue !== solutionValue) {
                input.value = solutionValue;
                input.classList.add('solution');
            }
        } else {
            if (input.classList.contains('solution')) {
                input.value = '';
                input.classList.remove('solution');
            }
        }
    });
}

// window.addEventListener('resize', resizeSudokuBoard);


