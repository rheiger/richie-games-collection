const gameBoard = document.getElementById('game-board');
const newGameBtn = document.getElementById('new-game-btn');
const solveBtn = document.getElementById('solve-btn');
const moveCount = document.getElementById('move-count');
const message = document.getElementById('message');
const overlay = document.getElementById('overlay');

let tiles = [];
let emptyTile = { row: 3, col: 3 };
let moves = 0;

function createTile(num, row, col) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.textContent = num;
    tile.style.gridRow = row + 1;
    tile.style.gridColumn = col + 1;
    tile.addEventListener('click', () => moveTile(row, col));
    return tile;
}

function initializeGame() {
    gameBoard.innerHTML = '';
    tiles = [];
    emptyTile = { row: 3, col: 3 };
    moves = 0;
    moveCount.textContent = moves;

    const numbers = Array.from({length: 15}, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (i === 3 && j === 3) {
                const emptyTileElement = document.createElement('div');
                emptyTileElement.className = 'tile empty';
                emptyTileElement.style.gridRow = 4;
                emptyTileElement.style.gridColumn = 4;
                gameBoard.appendChild(emptyTileElement);
            } else {
                const num = numbers.pop();
                const tile = createTile(num, i, j);
                gameBoard.appendChild(tile);
                tiles.push({ num, row: i, col: j, element: tile });
            }
        }
    }
}

function moveTile(row, col) {
    if (isAdjacent(row, col, emptyTile.row, emptyTile.col)) {
        const tileIndex = tiles.findIndex(t => t.row === row && t.col === col);
        const tile = tiles[tileIndex];

        // Find the empty tile element
        const emptyTileElement = gameBoard.querySelector('.empty');

        // Swap positions in the game state
        [tile.row, tile.col, emptyTile.row, emptyTile.col] = [emptyTile.row, emptyTile.col, tile.row, tile.col];

        // Update tile position in the grid
        tile.element.style.gridRow = tile.row + 1;
        tile.element.style.gridColumn = tile.col + 1;

        // Update empty tile position in the grid
        emptyTileElement.style.gridRow = emptyTile.row + 1;
        emptyTileElement.style.gridColumn = emptyTile.col + 1;

        moves++;
        moveCount.textContent = moves;

        if (checkWin()) {
            overlay.style.display = 'flex';
        }
    }
}

function isAdjacent(row1, col1, row2, col2) {
    return (Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1);
}

function checkWin() {
    for (let i = 0; i < tiles.length; i++) {
        if (tiles[i].num !== i + 1 || tiles[i].row !== Math.floor(i / 4) || tiles[i].col !== i % 4) {
            return false;
        }
    }
    return true;
}

function solvePuzzle() {
    // This is a simple solver that just puts the tiles in order
    // A more advanced solver would use algorithms like A* search
    tiles.sort((a, b) => a.num - b.num);
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].row = Math.floor(i / 4);
        tiles[i].col = i % 4;
        tiles[i].element.style.gridRow = tiles[i].row + 1;
        tiles[i].element.style.gridColumn = tiles[i].col + 1;
    }
    emptyTile = { row: 3, col: 3 };
    moves = 0;
    moveCount.textContent = moves;
}

newGameBtn.addEventListener('click', initializeGame);
solveBtn.addEventListener('click', solvePuzzle);
overlay.addEventListener('click', () => overlay.style.display = 'none');

initializeGame();