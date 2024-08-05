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
    let lastShuffledTile;

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
                    tiles.push({ num: 0, row: i, col: j, element: emptyTileElement });
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
    
            // Swap positions
            [tile.row, tile.col, emptyTile.row, emptyTile.col] = [emptyTile.row, emptyTile.col, tile.row, tile.col];
    
            // Update visual positions
            setTilePosition(tile.element, tile.row, tile.col);
            setTilePosition(emptyTileElement, emptyTile.row, emptyTile.col);
    
            // Update the tiles array
            const emptyTileIndex = tiles.findIndex(t => t.num === 0);
            const movedTileIndex = tiles.findIndex(t => t === tile);
            [tiles[emptyTileIndex], tiles[movedTileIndex]] = [tiles[movedTileIndex], tiles[emptyTileIndex]];
    
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
        // console.log('Checking ', row1, ':', col1, ' vs ', row2, ':', col2);
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

    // Priority Queue implementation
    class PriorityQueue {
        constructor() {
            this.elements = [];
        }
    
        enqueue(element, priority) {
            this.elements.push({element, priority});
            this.elements.sort((a, b) => a.priority - b.priority);
        }
    
        dequeue() {
            return this.elements.shift().element;
        }
    
        isEmpty() {
            return this.elements.length === 0;
        }
    
        contains(element) {
            return this.elements.some(e => e.element === element);
        }
    
        size() {
            return this.elements.length;
        }
    
        peek() {
            return this.elements[0]?.element;
        }
    }    
        
    // Helper function to calculate Manhattan distance
    function manhattanDistance(state, goalState, gridSize) {
        let distance = 0;
        for (let i = 0; i < state.length; i++) {
            if (state[i] !== 0 && state[i] !== goalState[i]) {
                const currentRow = Math.floor(i / gridSize);
                const currentCol = i % gridSize;
                const goalIndex = goalState.indexOf(state[i]);
                const goalRow = Math.floor(goalIndex / gridSize);
                const goalCol = goalIndex % gridSize;
                distance += Math.abs(currentRow - goalRow) + Math.abs(currentCol - goalCol);
            }
        }
        return Math.floor(distance); // Ensure it's an integer
    }
    
    function getPossibleMoves(state, gridSize) {
        // console.log("getPossibleMoves - Input state:", state);
        // console.log("getPossibleMoves - Grid size:", gridSize);
    
        const zeroIndex = state.indexOf(0);
        // console.log("getPossibleMoves - Zero index:", zeroIndex);
    
        if (zeroIndex === -1) {
            console.error("No empty tile (0) found in the state");
            return [];
        }
    
        const row = Math.floor(zeroIndex / gridSize);
        const col = zeroIndex % gridSize;
        // console.log("getPossibleMoves - Zero position: row", row, "col", col);
    
        const moves = [];
    
        if (row > 0) {
            moves.push(zeroIndex - gridSize);
            // console.log("getPossibleMoves - Can move up, adding:", zeroIndex - gridSize);
        }
        if (row < gridSize - 1) {
            moves.push(zeroIndex + gridSize);
            // console.log("getPossibleMoves - Can move down, adding:", zeroIndex + gridSize);
        }
        if (col > 0) {
            moves.push(zeroIndex - 1);
            // console.log("getPossibleMoves - Can move left, adding:", zeroIndex - 1);
        }
        if (col < gridSize - 1) {
            moves.push(zeroIndex + 1);
            // console.log("getPossibleMoves - Can move right, adding:", zeroIndex + 1);
        }
    
        // console.log("getPossibleMoves - Final possible moves:", moves);
        return moves;
    }
    
    function getStateAfterMove(state, move, zeroIndex) {
        if (zeroIndex === -1 || move < 0 || move >= state.length || zeroIndex < 0 || zeroIndex >= state.length) {
            console.error("Invalid move:", move, "or zeroIndex:", zeroIndex);
            return [...state]; // Return a copy of the original state
        }
        const newState = [...state];
        [newState[zeroIndex], newState[move]] = [newState[move], newState[zeroIndex]];
        return newState;
    }
    
    function aStarSearch(initialState, goalState, gridSize) {
        // console.log("Initial State:", initialState);
        // console.log("Goal State:", goalState);
        // console.log("Grid Size:", gridSize);
        // console.log("Initial Manhattan distance:", manhattanDistance(initialState, goalState, gridSize));
    
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
    
        const initialStateString = initialState.join(',');
        openSet.enqueue(initialStateString, manhattanDistance(initialState, goalState, gridSize));
        gScore.set(initialStateString, 0);
        fScore.set(initialStateString, manhattanDistance(initialState, goalState, gridSize));
    
        let iterations = 0;
        const maxIterations = 1000000;
    
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const currentStateString = openSet.dequeue();
            const currentState = currentStateString.split(',').map(Number);
            
            if(iterations % 10000 == 0){
                console.log(`Iteration ${iterations}:`, currentState);
                console.log("Current Manhattan distance:", manhattanDistance(currentState, goalState, gridSize));
            }
    
            if (currentStateString === goalState.join(',')) {
                // console.log("Solution found!");
                return reconstructPath(cameFrom, currentStateString);
            }
    
            closedSet.add(currentStateString);
    
            const zeroIndex = currentState.indexOf(0);
            // console.log("Calling getPossibleMoves with:", currentState, gridSize);
            const possibleMoves = getPossibleMoves(currentState, gridSize);
    
            // console.log("Possible moves returned:", possibleMoves);
    
            for (const move of possibleMoves) {
                const newState = getStateAfterMove(currentState, move, zeroIndex);
                const newStateString = newState.join(',');
    
                // console.log("New state after move:", newState);
    
                if (closedSet.has(newStateString)) continue;
    
                const tentativeGScore = gScore.get(currentStateString) + 1;
    
                if (!gScore.has(newStateString) || tentativeGScore < gScore.get(newStateString)) {
                    cameFrom.set(newStateString, currentStateString);
                    gScore.set(newStateString, tentativeGScore);
                    const f = tentativeGScore + manhattanDistance(newState, goalState, gridSize);
                    fScore.set(newStateString, f);
    
                    if (!openSet.contains(newStateString)) {
                        openSet.enqueue(newStateString, f);
                    }
                }
            }
    
            // console.log("Open set size:", openSet.size());
            // console.log("Closed set size:", closedSet.size);
        }
    
        // console.log("No solution found after", iterations, "iterations");
        // console.log("Final state:", openSet.peek());
        return null;
    }    
    
    // Helper function to reconstruct the path
    function reconstructPath(cameFrom, currentState) {
        const path = [currentState];
        while (cameFrom.has(currentState)) {
            currentState = cameFrom.get(currentState);
            path.unshift(currentState);
        }
        return path;
    }

    // Function to solve the puzzle
    function solvePuzzle() {
        // Create a 2D array to represent the current state
        const gridSize = Math.sqrt(tiles.length);
        let currentState = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
        // Fill the 2D array with the current tile positions
        tiles.forEach(tile => {
            currentState[tile.row][tile.col] = tile.num || 0;
        });
    
        // Flatten the 2D array to 1D for the A* algorithm
        currentState = currentState.flat();
    
        const goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    
        console.log("Solving puzzle:");
        console.log("Current state:", currentState);
        console.log("Goal state:", goalState);
        console.log("Grid size:", gridSize);
    
        const solution = aStarSearch(currentState, goalState, gridSize);
        if (solution) {
            console.log("Solution found:", solution);
            animateSolution(solution);
        } else {
            console.log("No solution found");
        }
    }
        
    // Function to animate the solution
    function animateSolution(solution) {
        let index = 0;
        const interval = setInterval(() => {
            if (index < solution.length - 1) {
                const currentState = solution[index].split(',').map(Number);
                const nextState = solution[index + 1].split(',').map(Number);
                const movedTileIndex = currentState.findIndex((num, i) => num !== nextState[i] && num !== 0);
                const movedTile = tiles.find(tile => tile.num === currentState[movedTileIndex]);
                moveTile(movedTile, true);
                index++;
            } else {
                clearInterval(interval);
            }
        }, 300); // Adjust this value to change the speed of the animation
    }

    function shufflePuzzle() {
        const gridSize = Math.sqrt(puzzleSize + 1);
        const adjacentTiles = tiles.filter(tile =>
            isAdjacent(tile.row, tile.col, emptyTile.row, emptyTile.col) && tile.num !== 0
        );
        // console.log('adjacentTiles:',adjacentTiles);
        if (adjacentTiles.length > 0) {
            let randomTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
            while (randomTile.num === 0 || randomTile === lastShuffledTile){
                randomTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
            }
            // console.log('moving ',randomTile);
            moveTile(randomTile, true);
            lastShuffledTile = randomTile;
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