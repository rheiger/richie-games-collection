const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const patterns = {
    stillLife: [
        { name: "Block", pattern: [[1, 1], [1, 2], [2, 1], [2, 2]] },
        { name: "Beehive", pattern: [[1, 2], [1, 3], [2, 1], [2, 4], [3, 2], [3, 3]] },
        { name: "Loaf", pattern: [[1, 2], [1, 3], [2, 1], [2, 4], [3, 2], [3, 4], [4, 3]] },
        { name: "Boat", pattern: [[1, 1], [1, 2], [2, 1], [2, 3], [3, 2]] }
    ],
    oscillator: [
        { name: "Blinker", pattern: [[1, 1], [1, 2], [1, 3]] },
        { name: "Toad", pattern: [[1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3]] },
        { name: "Beacon", pattern: [[1, 1], [1, 2], [2, 1], [2, 2], [3, 3], [3, 4], [4, 3], [4, 4]] },
        {
            name: "Pulsar", pattern: [
                [2, 4], [2, 5], [2, 6], [2, 10], [2, 11], [2, 12],
                [4, 2], [4, 7], [4, 9], [4, 14],
                [5, 2], [5, 7], [5, 9], [5, 14],
                [6, 2], [6, 7], [6, 9], [6, 14],
                [7, 4], [7, 5], [7, 6], [7, 10], [7, 11], [7, 12],
                [9, 4], [9, 5], [9, 6], [9, 10], [9, 11], [9, 12],
                [10, 2], [10, 7], [10, 9], [10, 14],
                [11, 2], [11, 7], [11, 9], [11, 14],
                [12, 2], [12, 7], [12, 9], [12, 14],
                [14, 4], [14, 5], [14, 6], [14, 10], [14, 11], [14, 12]
            ]
        }
    ],
    spaceship: [
        { name: "Glider", pattern: [[1, 2], [2, 3], [3, 1], [3, 2], [3, 3]] },
        { name: "Lightweight spaceship", pattern: [[1, 1], [1, 4], [2, 5], [3, 1], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5]] },
        { name: "Middleweight spaceship", pattern: [[1, 1], [1, 5], [2, 6], [3, 1], [3, 6], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [5, 3], [5, 4], [5, 5], [5, 6]] },
        { name: "Heavyweight spaceship", pattern: [[1, 1], [1, 6], [2, 7], [3, 1], [3, 7], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [6, 4], [6, 5], [6, 6]] }
    ],
    infinite: [
        {
            name: "Gosper Glider Gun",
            pattern: [
                [1, 5], [1, 6], [2, 5], [2, 6], [11, 5], [11, 6], [11, 7], [12, 4], [12, 8], [13, 3], [13, 9], [14, 3], [14, 9], [15, 6], [16, 4], [16, 8], [17, 5], [17, 6], [17, 7], [18, 6], [21, 3], [21, 4], [21, 5], [22, 3], [22, 4], [22, 5], [23, 2], [23, 6], [25, 1], [25, 2], [25, 6], [25, 7], [35, 3], [35, 4], [36, 3], [36, 4]
            ]
        }
    ]
};

const cellSize = 10;
let size, cols, rows;
let grid;
let isRunning = false;
let intervalId;
let currentLanguage;
let isMouseDown = false;
let lastCellToggled = null;

let generationCount = 0;

function updateGenerationCounter() {
    const counterElement = document.getElementById('generationCounter');
    counterElement.textContent = `${translations[currentLanguage].generation}: ${generationCount}`;
}

function initializeGrid() {
    const gameContainer = document.getElementById('gameContainer');
    const controls = document.getElementById('controls');
    const generationCounter = document.getElementById('generationCounter');

    // Calculate available height
    const availableHeight = window.innerHeight
        - gameContainer.offsetTop
        - controls.offsetHeight
        - generationCounter.offsetHeight
        - 140; // Additional margin

    const availableWidth = window.innerWidth - 50; // 20px margin on each side

    // Use the smaller of the two to ensure it fits on screen
    const maxSize = Math.min(availableHeight, availableWidth);

    size = Math.floor(maxSize / cellSize) * cellSize; // Ensure it's divisible by cellSize
    cols = rows = size / cellSize;

    canvas.width = canvas.height = size;

    grid = new Array(cols).fill(null).map(() =>
        new Array(rows).fill(null).map(() => ({ alive: 0, age: 0 }))
    );
}

function getColorForAge(age) {
    // This function returns a color based on the cell's age
    const hue = (age * 10) % 360; // Cycle through hues
    return `hsl(${hue}, 100%, 50%)`;
}

function drawGrid() {
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            if (grid[i][j].alive) {
                ctx.fillStyle = getColorForAge(grid[i][j].age);
                ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
            }
        }
    }
}

function updateGrid() {
    let next = new Array(cols).fill(null).map(() =>
        new Array(rows).fill(null).map(() => ({ alive: 0, age: 0 }))
    );

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            let state = grid[i][j].alive;
            let neighbors = countNeighbors(i, j);

            if (state === 0 && neighbors === 3) {
                next[i][j].alive = 1;
            } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                next[i][j].alive = 0;
            } else {
                next[i][j].alive = state;
                if (state === 1) {
                    next[i][j].age = grid[i][j].age + 1;
                }
            }
        }
    }

    grid = next;
}

function countNeighbors(x, y) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            let col = (x + i + cols) % cols;
            let row = (y + j + rows) % rows;
            sum += grid[col][row].alive;
        }
    }
    sum -= grid[x][y].alive;
    return sum;
}

function areGridsEqual(grid1, grid2) {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            if (grid1[i][j].alive !== grid2[i][j].alive) {
                return false;
            }
        }
    }
    return true;
}

function isExtinct(grid) {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            if (grid[i][j].alive === 1) {
                return false;
            }
        }
    }
    return true;
}

const MAX_HISTORY = 10; // Store up to 10 previous states
let gridHistory = [];

function checkSteadyState() {
    if (isExtinct(grid)) {
        return translations[currentLanguage].extinction;
    }

    // Create a copy of the current grid state (only the 'alive' property)
    const currentState = grid.map(row => row.map(cell => ({ alive: cell.alive })));

    gridHistory.push(currentState);
    if (gridHistory.length > MAX_HISTORY) {
        gridHistory.shift();
    }

    for (let i = 0; i < gridHistory.length - 1; i++) {
        if (areGridsEqual(currentState, gridHistory[i])) {
            return i === gridHistory.length - 2
                ? translations[currentLanguage].stillLifeState
                : translations[currentLanguage].oscillatorState.replace("{0}", gridHistory.length - 1 - i);
        }
    }

    return null; // No steady state detected
}

function gameLoop() {
    updateGrid();
    drawGrid();
    generationCount++;
    updateGenerationCounter();

    const steadyState = checkSteadyState();
    if (steadyState) {
        clearInterval(intervalId);
        isRunning = false;
        document.getElementById('startStop').textContent = translations[currentLanguage].start;
        alert(`${translations[currentLanguage].steadyStateReached} ${steadyState}`);
    }
}

function startStop() {
    if (isRunning) {
        clearInterval(intervalId);
        document.getElementById('startStop').textContent = translations[currentLanguage].start;
    } else {
        intervalId = setInterval(gameLoop, 100);
        document.getElementById('startStop').textContent = translations[currentLanguage].stop;
    }
    isRunning = !isRunning;
}

function clearGrid() {
    grid = new Array(cols).fill(null).map(() =>
        new Array(rows).fill(null).map(() => ({ alive: 0, age: 0 }))
    );
    generationCount = 0;
    updateGenerationCounter();
    drawGrid();
}

function randomizeGrid() {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            grid[i][j] = Math.random() > 0.8 ? 1 : 0;
        }
    }
    drawGrid();
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (x >= 0 && x < cols && y >= 0 && y < rows) {
        grid[x][y] = 1 - grid[x][y];
        drawGrid();
    }
}

function handleMouseDown(event) {
    isMouseDown = true;
    toggleCell(event);
}

function handleMouseMove(event) {
    if (isMouseDown) {
        toggleCell(event);
    }
}

function handleMouseUp() {
    isMouseDown = false;
    lastCellToggled = null;
}

function handleMouseLeave() {
    isMouseDown = false;
    lastCellToggled = null;
}

function handleTouchStart(event) {
    event.preventDefault();
    isMouseDown = true;
    toggleCell(event.touches[0]);
}

function handleTouchMove(event) {
    event.preventDefault();
    if (isMouseDown) {
        toggleCell(event.touches[0]);
    }
}

function handleTouchEnd() {
    isMouseDown = false;
    lastCellToggled = null;
}

function toggleCell(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (x >= 0 && x < cols && y >= 0 && y < rows) {
        const cellKey = `${x},${y}`;
        if (cellKey !== lastCellToggled) {
            grid[x][y].alive = 1 - grid[x][y].alive;
            grid[x][y].age = 0;
            drawGrid();
            lastCellToggled = cellKey;
        }
    }
}

function showExplanation() {
    const explanation = document.getElementById('explanation');
    explanation.style.display = 'flex';
}

function hideExplanation() {
    const explanation = document.getElementById('explanation');
    explanation.style.display = 'none';
}

function randomizeGrid(patternType = 'random') {
    if (patternType === 'clear') {
        clearGrid();
        return;
    } else if (patternType === 'keep') {
        return;
    }
    clearGrid();

    if (patternType === 'random') {
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                grid[i][j].alive = Math.random() > 0.8 ? 1 : 0;
            }
        }
    } else {
        const patternList = patterns[patternType];
        const selectedPattern = patternList[Math.floor(Math.random() * patternList.length)];
        
        // Calculate the maximum possible starting positions
        const maxStartX = Math.max(0, cols - 40);
        const maxStartY = Math.max(0, rows - 40);
        
        // Ensure startX and startY are always non-negative
        const startX = Math.floor(Math.random() * (maxStartX + 1));
        const startY = Math.floor(Math.random() * (maxStartY + 1));

        selectedPattern.pattern.forEach(([x, y]) => {
            if (startX + x < cols && startY + y < rows) {
                grid[startX + x][startY + y].alive = 1;
            }
        });
    }

    drawGrid();
}

function handlePatternSelection(event) {
    if (!event || !event.target || !event.target.value) {
        return; // Exit early if event or target or value is not present
    }
    const patternType = event.target.value;
    if (patternType === 'keep') {
        return; // Do nothing, keep the current grid
    } else if (patternType === 'clear') {
        clearGrid();
    } else {
        randomizeGrid(patternType);
    }
}

const patternSelect = document.getElementById('patternSelect');
patternSelect.addEventListener('change', handlePatternSelection);
patternSelect.addEventListener('input', handlePatternSelection);
patternSelect.addEventListener('blur', handlePatternSelection);
patternSelect.addEventListener('touchstart', function() {
    setTimeout(handlePatternSelection, 100);
  });
  

window.addEventListener('resize', () => {
    initializeGrid();
    drawGrid();
});

document.getElementById('startStop').addEventListener('click', startStop);
document.getElementById('explain').addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent this click from immediately hiding the explanation
    showExplanation();
});

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseLeave);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);
document.addEventListener('click', hideExplanation);
document.addEventListener('touchstart', hideExplanation);

function initGame() {
    currentLanguage = detectLanguage();
    setLanguage(currentLanguage);
    initializeGrid();
    clearGrid();
    drawGrid();
}

document.addEventListener('DOMContentLoaded', initGame);