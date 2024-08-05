const gameBoard = document.getElementById('game-board');
const newGameBtn = document.getElementById('new-game-btn');
const solveBtn = document.getElementById('solve-btn');
const moveCount = document.getElementById('move-count');
const message = document.getElementById('message');
const overlay = document.getElementById('overlay');

let tiles = [];
let emptyTile = { row: 3, col: 3 };
let moves = 0;
let canMove = true;

function createTile(num, row, col) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.textContent = num;
    setTilePosition(tile, row, col);
    
    tile.addEventListener('click', () => {
        const currentTile = tiles.find(t => t.element === tile);
        if (currentTile) {
            moveTile(currentTile);
        }
    });
    
    return tile;
}

function setTilePosition(element, row, col) {
    const gap = 6; // Increased gap slightly for better spacing
    const tileSize = 72; // Match the CSS tile size
    const top = row * (tileSize + gap) + gap;
    const left = col * (tileSize + gap) + gap;
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
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
                setTilePosition(emptyTileElement, 3, 3);
                gameBoard.appendChild(emptyTileElement);
            } else {
                const num = numbers.pop();
                const tileElement = createTile(num, i, j);
                gameBoard.appendChild(tileElement);
                tiles.push({ num, row: i, col: j, element: tileElement });
            }
        }
    }
}

function isValidPosition(row, col) {
    return row >= 0 && row < 4 && col >= 0 && col < 4;
}

function updateTilePosition(element, row, col) {
    if (row < 0 || row > 3 || col < 0 || col > 3) {
        console.error(`Invalid position: row ${row}, col ${col}`);
        return;
    }
    element.style.gridRow = `${row + 1}`;
    element.style.gridColumn = `${col + 1}`;
}

function moveTile(tile) {
    if (!canMove) return;
    if (isAdjacent(tile.row, tile.col, emptyTile.row, emptyTile.col)) {
        canMove = false;
        const emptyTileElement = gameBoard.querySelector('.empty');
        if (!emptyTileElement) {
            console.error('Empty tile element not found');
            return;
        }

        // Swap positions in the game state
        [tile.row, tile.col, emptyTile.row, emptyTile.col] = [emptyTile.row, emptyTile.col, tile.row, tile.col];

        // Animate tile movement
        setTilePosition(tile.element, tile.row, tile.col);
        setTilePosition(emptyTileElement, emptyTile.row, emptyTile.col);

        moves++;
        moveCount.textContent = moves;

        setTimeout(() => {
            canMove = true;
            if (checkWin()) {
                overlay.style.display = 'flex';
            }
        }, 300); // This should match the transition duration in CSS
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