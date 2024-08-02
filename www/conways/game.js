const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cellSize = 10;
let size, cols, rows;
let grid;
let isRunning = false;
let intervalId;

function initializeGrid() {
    const maxSize = Math.min(window.innerWidth, window.innerHeight) - 100; // Subtract some pixels for margin
    size = Math.floor(maxSize / cellSize) * cellSize; // Ensure it's divisible by cellSize
    cols = rows = size / cellSize;
    
    canvas.width = canvas.height = size;

    grid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
}

function drawGrid() {
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            if (grid[i][j] === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
            }
        }
    }
}

function countNeighbors(x, y) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            let col = (x + i + cols) % cols;
            let row = (y + j + rows) % rows;
            sum += grid[col][row];
        }
    }
    sum -= grid[x][y];
    return sum;
}

function updateGrid() {
    let next = new Array(cols).fill(null).map(() => new Array(rows).fill(0));

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            let state = grid[i][j];
            let neighbors = countNeighbors(i, j);

            if (state === 0 && neighbors === 3) {
                next[i][j] = 1;
            } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                next[i][j] = 0;
            } else {
                next[i][j] = state;
            }
        }
    }

    grid = next;
}

function gameLoop() {
    updateGrid();
    drawGrid();
}

function startStop() {
    if (isRunning) {
        clearInterval(intervalId);
        document.getElementById('startStop').textContent = 'Start';
    } else {
        intervalId = setInterval(gameLoop, 100);
        document.getElementById('startStop').textContent = 'Stop';
    }
    isRunning = !isRunning;
}

function clearGrid() {
    grid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
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
        grid[x][y] = 1 - grid[x][y];  // Toggle cell state
        drawGrid();
    }
}

window.addEventListener('resize', () => {
    initializeGrid();
    drawGrid();
});

document.getElementById('startStop').addEventListener('click', startStop);
document.getElementById('clear').addEventListener('click', clearGrid);
document.getElementById('random').addEventListener('click', randomizeGrid);
canvas.addEventListener('click', handleCanvasClick);

initializeGrid();
drawGrid();