document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('gameBoard');
    const shuffleResetBtn = document.getElementById('shuffleResetBtn'); // Corrected ID
    const solveBtn = document.getElementById('solveBtn');
    const moveCount = document.getElementById('moveCount');
    const randomMoveCount = document.getElementById('randomMoveCount');
    const message = document.getElementById('message');
    const overlay = document.getElementById('overlay');
    const puzzleTypeSelect = document.getElementById('puzzleType');

    let tiles = [];
    let emptyTile;
    let moves = 0;
    let randomMovesDone = 0;
    let canMove = true;
    let puzzleSize;
    let isShuffling = false;
    let shuffleInterval;
    let shuffleTimeout;
    let isLongPress = false;

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
        emptyTile = { row: gridSize - 1, col: gridSize - 1 };
        moves = 0;
        randomMovesDone = 0;
        moveCount.textContent = moves;
        randomMoveCount.textContent = randomMovesDone;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (i === gridSize - 1 && j === gridSize - 1) {
                    const emptyTileElement = document.createElement('div');
                    emptyTileElement.className = 'tile empty';
                    setTilePosition(emptyTileElement, i, j);
                    gameBoard.appendChild(emptyTileElement);
                } else {
                    const num = i * gridSize + j + 1;
                    const tileElement = createTile(num, i, j);
                    gameBoard.appendChild(tileElement);
                    tiles.push({ num, row: i, col: j, element: tileElement });
                }
            }
        }

        shuffleResetBtn.textContent = getMessage('shuffle');
        shuffleResetBtn.dataset.action = 'shuffle';
        updateStats();
    }

    function updateStats() {
        const randomMovesElement = document.getElementById('randomMoveCount');
        const movesElement = document.getElementById('moveCount');
    
        if (randomMovesElement) {
            randomMovesElement.textContent = randomMovesDone;
        }
        if (movesElement) {
            movesElement.textContent = moves;
        }
    
        // Update the labels if needed
        const randomMovesLabel = document.querySelector('[data-i18n="randomMoves"]');
        const movesLabel = document.querySelector('[data-i18n="moves"]');
    
        if (randomMovesLabel) {
            randomMovesLabel.textContent = getMessage('randomMoves');
        }
        if (movesLabel) {
            movesLabel.textContent = getMessage('moves');
        }
    }

    function moveTile(tile, isRandom = false) {
        if (!canMove) return;
        if (isAdjacent(tile.row, tile.col, emptyTile.row, emptyTile.col)) {
            const emptyTileElement = gameBoard.querySelector('.empty');
            if (!emptyTileElement) {
                console.error('Empty tile element not found');
                return;
            }

            [tile.row, tile.col, emptyTile.row, emptyTile.col] = [emptyTile.row, emptyTile.col, tile.row, tile.col];

            setTilePosition(tile.element, tile.row, tile.col);
            setTilePosition(emptyTileElement, emptyTile.row, emptyTile.col);

            if (!isRandom) {
                moves++;
                moveCount.textContent = moves;
            } else {
                randomMovesDone++;
                randomMoveCount.textContent = randomMovesDone;
            }

            updateStats();

            if (!isRandom && checkWin()) {
                overlay.style.display = 'flex';
            }
        }
    }

    function isAdjacent(row1, col1, row2, col2) {
        console.log('Checking ', row1, ':', col1, ' vs ', row2, ':', col2);
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

        const goalState = Array.from({ length: puzzleSize + 1 }, (_, i) => i);
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

    function shufflePuzzle() {
        const gridSize = Math.sqrt(puzzleSize + 1);
        const adjacentTiles = tiles.filter(tile =>
            isAdjacent(tile.row, tile.col, emptyTile.row, emptyTile.col)
        );
        if (adjacentTiles.length > 0) {
            const randomTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
            moveTile(randomTile, true);
        }
    }

    function startShuffling(isAutomatic = false) {
        isShuffling = true;
        shuffleInterval = setInterval(() => {
            shufflePuzzle();
            if ((isAutomatic && randomMovesDone >= 50) || (!isAutomatic && !isLongPress)) {
                stopShuffling();
            }
        }, 100);
    }

    function stopShuffling() {
        isShuffling = false;
        clearInterval(shuffleInterval);
        shuffleResetBtn.textContent = 'Reset';
        shuffleResetBtn.dataset.action = 'reset';
    }

    shuffleResetBtn.addEventListener('mousedown', () => {
        if (shuffleResetBtn.dataset.action === 'shuffle') {
            isLongPress = false;
            shuffleTimeout = setTimeout(() => {
                isLongPress = true;
                startShuffling();
            }, 500); // Long press threshold
        }
    });

    shuffleResetBtn.addEventListener('mouseup', () => {
        if (shuffleResetBtn.dataset.action === 'shuffle') {
            clearTimeout(shuffleTimeout);
            if (!isLongPress) {
                // Short click detected, start automatic shuffling
                startShuffling(true);
            } else {
                stopShuffling();
            }
        }
    });

    shuffleResetBtn.addEventListener('mouseleave', () => {
        if (isShuffling) {
            stopShuffling();
        }
        clearTimeout(shuffleTimeout);
    });

    shuffleResetBtn.addEventListener('click', (e) => {
        if (shuffleResetBtn.dataset.action === 'reset') {
            initializeGame();
        } else {
            // Prevent the click event from triggering on long press
            e.preventDefault();
        }
    });

    // Touch event listeners
    shuffleResetBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (shuffleResetBtn.dataset.action === 'shuffle') {
            isLongPress = false;
            shuffleTimeout = setTimeout(() => {
                isLongPress = true;
                startShuffling();
            }, 500); // Long press threshold
        }
    });

    shuffleResetBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (shuffleResetBtn.dataset.action === 'shuffle') {
            clearTimeout(shuffleTimeout);
            if (!isLongPress) {
                // Short touch detected, start automatic shuffling
                startShuffling(true);
            } else {
                stopShuffling();
            }
        }
    });

    solveBtn.addEventListener('click', solvePuzzle);
    puzzleTypeSelect.addEventListener('change', initializeGame);

    gameBoard.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    initializeGame();
});