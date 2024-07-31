let currentPlayer = 'red';
let gameBoard = Array(6).fill().map(() => Array(7).fill(''));
let gameActive = true;

function createBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let row = 5; row >= 0; row--) {
        for (let col = 0; col < 7; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.col = col;
            cell.dataset.row = row;
            board.appendChild(cell);
        }
    }
}

function dropPice(col) {
    if (!gameActive) return;
    let row = getNextEmptyRow(col);
    if (row !== -1) {
        gameBoard[row][col] = currentPlayer;
        animateDropPiece(row, col);
        setTimeout(() => {
            checkGameState(row, col);
            currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
            if (gameActive && currentPlayer === 'yellow') {
                setTimeout(computerMove, 500);
            }
        }, 500); // Wait for animation to finish
    }
}

function animateDropPiece(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add(currentPlayer, 'animated');
    setTimeout(() => cell.classList.remove('animated'), 500);
}

function getNextEmptyRow(col) {
    for (let row = 0; row < 6; row++) {
        if (gameBoard[row][col] === '') {
            return row;
        }
    }
    return -1; // Column is full
}

function updateBoard() {
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            cell.className = 'cell'; // Reset the cell
            if (gameBoard[row][col] !== '') {
                cell.classList.add(gameBoard[row][col]);
                cell.classList.add('animated');
                setTimeout(() => cell.classList.remove('animated'), 500);
            }
        }
    }
}

function checkGameState(row, col) {
    if (checkWin(row, col)) {
        const winner = currentPlayer === 'red' ? translations[currentLang].youWin : translations[currentLang].computerWins;
        updateMessage(winner);
        gameActive = false;
        if (currentPlayer === 'red') {
            setTimeout(showFireworks, 100);
        } else {
            setTimeout(showProudComputer, 100);
        }
    } else if (checkDraw()) {
        updateMessage(translations[currentLang].draw);
        gameActive = false;
    } else {
        updateMessage(currentPlayer === 'red' ? translations[currentLang].computerTurn : translations[currentLang].yourTurn);
    }
}

function dropPiece(col) {
    if (!gameActive) return;
    let row = getNextEmptyRow(col);
    if (row !== -1) {
        gameBoard[row][col] = currentPlayer;
        animateDropPiece(row, col);
        setTimeout(() => {
            checkGameState(row, col);
            currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
            if (gameActive && currentPlayer === 'yellow') {
                setTimeout(computerMove, 500);
            }
        }, 500); // Wait for animation to finish
    }
}

function animateDropPiece(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add(currentPlayer, 'animated');
    setTimeout(() => cell.classList.remove('animated'), 500);
}

function checkWin(row, col) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    return directions.some(([dy, dx]) => {
        let count = 1;
        for (let i = 1; i <= 3; i++) {
            if (checkDirection(row, col, dy, dx, i)) count++;
            else break;
        }
        for (let i = 1; i <= 3; i++) {
            if (checkDirection(row, col, -dy, -dx, i)) count++;
            else break;
        }
        return count >= 4;
    });
}

function checkDirection(row, col, dy, dx, i) {
    const newRow = row + i * dy;
    const newCol = col + i * dx;
    return newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 &&
        gameBoard[newRow][newCol] === currentPlayer;
}

function checkDraw() {
    return gameBoard.every(row => row.every(cell => cell !== ''));
}

function computerMove() {
    if (!gameActive) return;

    let bestScore = -Infinity;
    let bestCol = 3; // Default to middle column

    for (let col = 0; col < 7; col++) {
        if (canPlayColumn(col)) {
            let row = getNextEmptyRow(col);
            gameBoard[row][col] = 'yellow';
            let score = minimax(gameBoard, 4, false);
            gameBoard[row][col] = '';

            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }
    }

    dropPiece(bestCol);
}

function minimax(board, depth, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard(board);
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let col = 0; col < 7; col++) {
            if (canPlayColumn(col)) {
                let row = getNextEmptyRow(col);
                board[row][col] = 'yellow';
                let score = minimax(board, depth - 1, false);
                board[row][col] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let col = 0; col < 7; col++) {
            if (canPlayColumn(col)) {
                let row = getNextEmptyRow(col);
                board[row][col] = 'red';
                let score = minimax(board, depth - 1, true);
                board[row][col] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function evaluateBoard(board) {
    let score = 0;

    // Check horizontal
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
            score += evaluateLine(board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]);
        }
    }

    // Check vertical
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 7; col++) {
            score += evaluateLine(board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]);
        }
    }

    // Check diagonal (positive slope)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            score += evaluateLine(board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]);
        }
    }

    // Check diagonal (negative slope)
    for (let row = 3; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
            score += evaluateLine(board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]);
        }
    }

    return score;
}

function evaluateLine(a, b, c, d) {
    let score = 0;
    let yellow = 0;
    let red = 0;
    let empty = 0;

    if (a === 'yellow') yellow++;
    else if (a === 'red') red++;
    else empty++;

    if (b === 'yellow') yellow++;
    else if (b === 'red') red++;
    else empty++;

    if (c === 'yellow') yellow++;
    else if (c === 'red') red++;
    else empty++;

    if (d === 'yellow') yellow++;
    else if (d === 'red') red++;
    else empty++;

    if (yellow === 4) score += 100;
    else if (yellow === 3 && empty === 1) score += 5;
    else if (yellow === 2 && empty === 2) score += 2;

    if (red === 3 && empty === 1) score -= 4;

    return score;
}

function canPlayColumn(col) {
    return gameBoard[5][col] === '';
}

function updateMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function resetGame() {
    gameBoard = Array(6).fill().map(() => Array(7).fill(''));
    currentPlayer = 'red';
    gameActive = true;
    createBoard();
    updateMessage(translations[currentLang].yourTurn);
}

function showFireworks() {
    const fireworks = document.createElement('div');
    fireworks.className = 'firework';
    document.body.appendChild(fireworks);
    setTimeout(() => document.body.removeChild(fireworks), 2000);
}

function showProudComputer() {
    const proudComputer = document.createElement('div');
    proudComputer.className = 'proud-computer';
    proudComputer.textContent = '🖥️ I win!';
    document.body.appendChild(proudComputer);
    setTimeout(() => document.body.removeChild(proudComputer), 3000);
}

document.getElementById('board').addEventListener('click', (e) => {
    if (e.target.classList.contains('cell') && currentPlayer === 'red') {
        const col = parseInt(e.target.dataset.col);
        dropPiece(col);
    }
});

document.getElementById('board').addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('cell') && currentPlayer === 'red') {
        e.preventDefault(); // Prevent scrolling when touching the game board
        const col = parseInt(e.target.dataset.col);
        dropPiece(col);
    }
}, { passive: false });

document.getElementById('resetBtn').addEventListener('click', resetGame);
