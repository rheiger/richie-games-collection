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

function dropPiece(col) {
    if (!gameActive) return;
    let row = getNextEmptyRow(col);
    if (row !== -1) {
        gameBoard[row][col] = currentPlayer;
        updateBoard();
        checkGameState(row, col);
        currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
        if (gameActive && currentPlayer === 'yellow') {
            setTimeout(computerMove, 500);
        }
    }
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
            }
        }
    }
}

document.getElementById('board').addEventListener('click', (e) => {
    if (e.target.classList.contains('cell') && currentPlayer === 'red') {
        const col = parseInt(e.target.dataset.col);
        dropPiece(col);
    }
});