const gameBoard = document.getElementById('game-board');
const newGameBtn = document.getElementById('new-game-btn');
const solveBtn = document.getElementById('solve-btn');
const moveCount = document.getElementById('move-count');
const message = document.getElementById('message');
const overlay = document.getElementById('overlay');
const puzzleTypeSelect = document.getElementById('puzzle-type');

let tiles = [];
let emptyTile;
let moves = 0;
let canMove = true;
let puzzleSize;

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
    const gridSize = Math.sqrt(puzzleSize + 1);
    const gap = 6;
    const tileSize = (puzzleSize === 8 ? 72 : 72);
    const top = row * (tileSize + gap) + gap;
    const left = col * (tileSize + gap) + gap;
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
}

function initializeGame() {
    puzzleSize = parseInt(puzzleTypeSelect.value);
    gameBoard.className = `puzzle-${puzzleSize}`;
    gameBoard.innerHTML = '';
    tiles = [];
    const gridSize = Math.sqrt(puzzleSize + 1);
    emptyTile = { row: gridSize - 1, col: gridSize - 1 }; // Fix: Use integer values
    moves = 0;
    moveCount.textContent = moves;

    const numbers = Array.from({length: puzzleSize}, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (i === gridSize - 1 && j === gridSize - 1) {
                const emptyTileElement = document.createElement('div');
                emptyTileElement.className = 'tile empty';
                setTilePosition(emptyTileElement, i, j);
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

function moveTile(tile) {
    if (!canMove) return;
    console.log(`Tile position: (${tile.row}, ${tile.col}), Empty tile position: (${emptyTile.row}, ${emptyTile.col})`);
    if (isAdjacent(tile.row, tile.col, emptyTile.row, emptyTile.col)) {
        canMove = false;
        const emptyTileElement = gameBoard.querySelector('.empty');
        if (!emptyTileElement) {
            console.error('Empty tile element not found');
            return;
        }

        [tile.row, tile.col, emptyTile.row, emptyTile.col] = [emptyTile.row, emptyTile.col, tile.row, tile.col];

        setTilePosition(tile.element, tile.row, tile.col);
        setTilePosition(emptyTileElement, emptyTile.row, emptyTile.col);

        moves++;
        moveCount.textContent = moves;

        setTimeout(() => {
            canMove = true;
            if (checkWin()) {
                overlay.style.display = 'flex';
            }
        }, 300);
    } else {
        console.log('Tiles are not adjacent');
    }
}

function isAdjacent(row1, col1, row2, col2) {
    console.log('Checking ',row1,':',col1,' vs ',row2,':',col2);
    return (Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1);
}

function checkWin() {
    const gridSize = Math.sqrt(puzzleSize + 1);
    for (let i = 0; i < tiles.length; i++) {
        if (tiles[i].num !== i + 1 || tiles[i].row !== Math.floor(i / gridSize) || tiles[i].col !== i % gridSize) {
            return false;
        }
    }
    return true;
}

// Update the solver function to work with both puzzle sizes
function solvePuzzle() {
    const gridSize = Math.sqrt(puzzleSize + 1);
    const currentState = tiles.map(tile => tile.num);
    currentState.push(0); // Add the empty tile

    const goalState = Array.from({length: puzzleSize + 1}, (_, i) => i);
    goalState[puzzleSize] = 0; // Set the last element to 0 for the empty tile

    const solution = aStarSearch(currentState, goalState, gridSize);
    if (solution) {
        animateSolution(solution);
    } else {
        console.log("No solution found");
    }
}

// Update A* search and related functions to work with both puzzle sizes
// ... (update the A* search algorithm and related functions) ...

newGameBtn.addEventListener('click', initializeGame);
solveBtn.addEventListener('click', solvePuzzle);
puzzleTypeSelect.addEventListener('change', initializeGame);

initializeGame();