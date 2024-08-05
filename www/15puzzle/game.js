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
        console.log("Initializing game");
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
        hideCongratulations();
        console.log("Game initialized");
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

            if (!isRandom && moves > 0 && checkWin()) {
                showCongratulations();
            }
        }
    }

    function isAdjacent(row1, col1, row2, col2) {
        // console.log('Checking ', row1, ':', col1, ' vs ', row2, ':', col2);
        return (Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1);
    }

    function checkWin() {
        console.log("Checking win condition");
        console.log("Current tile arrangement:", tiles);
        const gridSize = Math.sqrt(puzzleSize + 1);
        for (let i = 0; i < tiles.length; i++) {
            const expectedNum = (i + 1) % tiles.length;
            const expectedRow = Math.floor(i / gridSize);
            const expectedCol = i % gridSize;
            console.log(`Tile ${i}: Expected ${expectedNum} at (${expectedRow}, ${expectedCol}), Found ${tiles[i].num} at (${tiles[i].row}, ${tiles[i].col})`);
            if (tiles[i].num !== expectedNum || tiles[i].row !== expectedRow || tiles[i].col !== expectedCol) {
                console.log("Win condition not met");
                return false;
            }
        }
        console.log("Win condition met");
        return true;
    }

    // Priority Queue implementation
    class PriorityQueue {
        constructor() {
            this.elements = [];
        }

        enqueue(element, priority) {
            this.elements.push({ element, priority });
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

    function linearConflict(state, goalState, gridSize) {
        let conflicts = 0;
        for (let i = 0; i < gridSize; i++) {
            conflicts += countRowConflicts(state, goalState, i, gridSize);
            conflicts += countColumnConflicts(state, goalState, i, gridSize);
        }
        return conflicts * 2; // Each conflict requires 2 additional moves
    }

    function countRowConflicts(state, goalState, row, gridSize) {
        let conflicts = 0;
        for (let i = 0; i < gridSize - 1; i++) {
            for (let j = i + 1; j < gridSize; j++) {
                const tile1 = state[row * gridSize + i];
                const tile2 = state[row * gridSize + j];
                if (tile1 !== 0 && tile2 !== 0) {
                    const goalRow1 = Math.floor((tile1 - 1) / gridSize);
                    const goalRow2 = Math.floor((tile2 - 1) / gridSize);
                    if (goalRow1 === goalRow2 && goalRow1 === row && tile1 > tile2) {
                        conflicts++;
                    }
                }
            }
        }
        return conflicts;
    }

    function countColumnConflicts(state, goalState, col, gridSize) {
        let conflicts = 0;
        for (let i = 0; i < gridSize - 1; i++) {
            for (let j = i + 1; j < gridSize; j++) {
                const tile1 = state[i * gridSize + col];
                const tile2 = state[j * gridSize + col];
                if (tile1 !== 0 && tile2 !== 0) {
                    const goalCol1 = (tile1 - 1) % gridSize;
                    const goalCol2 = (tile2 - 1) % gridSize;
                    if (goalCol1 === goalCol2 && goalCol1 === col && tile1 > tile2) {
                        conflicts++;
                    }
                }
            }
        }
        return conflicts;
    }

    function reconstructPath(cameFrom, currentState) {
        const path = [currentState];
        while (cameFrom.has(currentState)) {
            currentState = cameFrom.get(currentState);
            path.unshift(currentState);
        }
        return path;
    }

    function improvedHeuristic(state, goalState, gridSize) {
        return manhattanDistance(state, goalState, gridSize) + linearConflict(state, goalState, gridSize);
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

    function aStarSearch(initialState, goalState, gridSize, maxIterations = 200000) {
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        let iterations = 0;

        const initialStateString = initialState.join(',');
        openSet.enqueue(initialStateString, improvedHeuristic(initialState, goalState, gridSize));
        gScore.set(initialStateString, 0);
        fScore.set(initialStateString, improvedHeuristic(initialState, goalState, gridSize));

        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const currentStateString = openSet.dequeue();
            if (currentStateString === goalState.join(',')) {
                return reconstructPath(cameFrom, currentStateString);
            }

            closedSet.add(currentStateString);

            const currentState = currentStateString.split(',').map(Number);
            const zeroIndex = currentState.indexOf(0);
            const possibleMoves = getPossibleMoves(currentState, gridSize);

            for (const move of possibleMoves) {
                const newState = getStateAfterMove(currentState, move, zeroIndex);
                const newStateString = newState.join(',');

                if (closedSet.has(newStateString)) continue;

                const tentativeGScore = gScore.get(currentStateString) + 1;

                if (!gScore.has(newStateString) || tentativeGScore < gScore.get(newStateString)) {
                    cameFrom.set(newStateString, currentStateString);
                    gScore.set(newStateString, tentativeGScore);
                    const f = tentativeGScore + improvedHeuristic(newState, goalState, gridSize);
                    fScore.set(newStateString, f);

                    if (!openSet.contains(newStateString)) {
                        openSet.enqueue(newStateString, f);
                    }
                }
            }
        }

        return null; // No solution found
    }

    function idaStar(initialState, goalState, gridSize, maxIterations = 200000) {
        let iterations = 0;
        let threshold = improvedHeuristic(initialState, goalState, gridSize);
    
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const result = search(initialState, goalState, 0, threshold, gridSize, []);
            if (Array.isArray(result)) {
                // Convert the solution to the same format as aStarSearch
                return result.map(state => state.join(','));
            }
            if (result === Infinity) {
                return null; // No solution
            }
            threshold = result; // New threshold for next iteration
        }
        return null; // No solution found within iteration limit
    }
    
    function search(state, goalState, g, threshold, gridSize, path) {
        const f = g + improvedHeuristic(state, goalState, gridSize);
        if (f > threshold) {
            return f;
        }
        if (state.join(',') === goalState.join(',')) {
            return path.concat([state]);
        }
        let min = Infinity;
        const zeroIndex = state.indexOf(0);
        const possibleMoves = getPossibleMoves(state, gridSize);
    
        for (const move of possibleMoves) {
            const newState = getStateAfterMove(state, move, zeroIndex);
            if (!path.some(s => s.join(',') === newState.join(','))) {
                const result = search(newState, goalState, g + 1, threshold, gridSize, path.concat([state]));
                if (Array.isArray(result)) {
                    return result;
                }
                if (result < min) {
                    min = result;
                }
            }
        }
        return min;
    }

    // Function to solve the puzzle
    async function solvePuzzle() {
        const gridSize = Math.sqrt(tiles.length);
        let currentState = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
        tiles.forEach(tile => {
            currentState[tile.row][tile.col] = tile.num || 0;
        });
    
        currentState = currentState.flat();
        const goalState = Array.from({length: tiles.length}, (_, i) => (i + 1) % tiles.length);
        const maxIterations = 1000000; // Adjust as needed
    
        console.log("Solving puzzle:");
        console.log("Current state:", currentState);
        console.log("Goal state:", goalState);
        console.log("Grid size:", gridSize);
    
        if (gridSize === 4) {
            const continueSearch = await showAlert(getMessage('warning15Puzzle'));
            if (!continueSearch) return;
        }
    
        solveBtn.textContent = getMessage('thinking');
        solveBtn.onclick = interruptSearch;
    
        let searchInterrupted = false;
        const solution = await new Promise(resolve => {
            setTimeout(() => {
                const result = idaStar(currentState, goalState, gridSize, maxIterations);
                if (searchInterrupted) {
                    resolve(null);
                } else {
                    resolve(result);
                }
            }, 0);
        });
    
        solveBtn.textContent = getMessage('solve');
        solveBtn.onclick = solvePuzzle;
    
        if (solution) {
            console.log("Solution found:", solution);
            animateSolution(solution);
        } else if (!searchInterrupted) {
            showGivingUpOverlay(maxIterations);
        }
    }
    
    function showCongratulations() {
        console.log("Showing congratulations overlay");
        overlay.style.display = 'flex';
    }
    
    // Add this function to hide the overlay
    function hideCongratulations() {
        console.log("Hiding congratulations overlay");
        overlay.style.display = 'none';
    }
    
    // Modify the event listener for the overlay
    overlay.addEventListener('click', hideCongratulations);
    
    function interruptSearch() {
        searchInterrupted = true;
        solveBtn.textContent = getMessage('solve');
        solveBtn.onclick = solvePuzzle;
    }
    
    function showGivingUpOverlay(iterations) {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `<div class="message">${getMessage('computerGivingUp').replace('{n}', iterations)}</div>`;
        overlay.onclick = () => document.body.removeChild(overlay);
        document.body.appendChild(overlay);
    }
    
    function showAlert(message) {
        return new Promise(resolve => {
            const alertBox = document.createElement('div');
            alertBox.className = 'alert-box';
            alertBox.innerHTML = `
                <div class="message">${message}</div>
                <button class="yes">${getMessage('yes')}</button>
                <button class="no">${getMessage('no')}</button>
            `;
    
            function removeAlertBox() {
                document.body.removeChild(alertBox);
            }
    
            alertBox.querySelector('.yes').onclick = () => {
                removeAlertBox();
                resolve(true);
            };
    
            alertBox.querySelector('.no').onclick = () => {
                removeAlertBox();
                resolve(false);
            };
    
            document.body.appendChild(alertBox);
        });
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
            while (randomTile.num === 0 || randomTile === lastShuffledTile) {
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