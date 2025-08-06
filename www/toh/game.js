// Constants
const TOWER_HEIGHT = 200;
const TOWER_WIDTH = 20;
const DISC_HEIGHT = 22;
const CLEAR_HEIGHT = TOWER_HEIGHT + 20;

// Game state
let towers = [[], [], []];
let discCount = 3;
let moves = 0;
let minMoves = 7;
let selectedTower = null;
let solving = false;
let currentLanguage = 'en';
let animationInProgress = false;

// DOM elements
const gameBoard = document.getElementById('game-board');
const discCountSelect = document.getElementById('discCount');
const resetBtn = document.getElementById('resetBtn');
const solveBtn = document.getElementById('solveBtn');
const currentMovesSpan = document.getElementById('currentMoves');
const minMovesSpan = document.getElementById('minMoves');
const messageDiv = document.getElementById('message');

function initGame() {
    resetGameState();
    if (window.innerWidth <= 430) {
        discCountSelect.value = Math.min(parseInt(discCountSelect.value), 4);
    }
    updateUI();
    createDiscs();
    drawTowers();
    addTouchEventListeners();
    console.log(`Game initialized with ${discCount} discs`);
}

function resetGameState() {
    towers = [[], [], []];
    moves = 0;
    solving = false;
    animationInProgress = false;
    discCount = parseInt(discCountSelect.value);
    minMoves = Math.pow(2, discCount) - 1;
}

function updateUI() {
    messageDiv.textContent = '';
    currentMovesSpan.textContent = moves;
    minMovesSpan.textContent = minMoves;
}

function createDiscs() {
    for (let i = discCount; i > 0; i--) {
        towers[0].push(i);
    }
}

function drawTowers() {
    gameBoard.innerHTML = '';
    const gameBoardWidth = gameBoard.clientWidth;
    const towerSpacing = gameBoardWidth / 4;
    console.log('Game board width:', gameBoard.clientWidth);
    console.log('Tower spacing:', towerSpacing);

    towers.forEach((tower, index) => {
        const towerDiv = createTowerElement(index, towerSpacing);
        console.log(`Tower ${index + 1} position:`, towerDiv.style.left);
        tower.forEach((disc, discIndex) => {
            const discDiv = createDiscElement(disc, discIndex, tower.length);
            towerDiv.appendChild(discDiv);
        });
        gameBoard.appendChild(towerDiv);
    });
    console.log('Towers redrawn');
    console.log('Game board layout:', gameBoard.innerHTML);
}

function createTowerElement(index, towerSpacing) {
    const towerDiv = document.createElement('div');
    towerDiv.className = 'tower';
    towerDiv.id = `tower${index + 1}`;
    towerDiv.style.left = `${towerSpacing + (towerSpacing + TOWER_WIDTH) * index}px`;
    towerDiv.onclick = () => selectTower(index);
    console.log(`Tower ${index + 1} created with left position:`, towerDiv.style.left);
    return towerDiv;
}

function createDiscElement(disc, discIndex, towerHeight) {
    const discDiv = document.createElement('div');
    discDiv.className = 'disc';
    const maxWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-disc-width') || '200');
    const discWidth = Math.min(disc * 20 + 20, maxWidth);
    discDiv.style.width = `${discWidth}px`;
    discDiv.style.backgroundColor = `hsl(${disc * 30}, 70%, 50%)`;
    discDiv.style.bottom = `${discIndex * DISC_HEIGHT}px`;
    discDiv.style.left = `${(TOWER_WIDTH - discWidth) / 2}px`;
    return discDiv;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function selectTower(index) {
    if (solving || animationInProgress) return;
    
    if (selectedTower === null) {
        if (towers[index].length > 0) {
            selectedTower = index;
            document.getElementById(`tower${index + 1}`).style.backgroundColor = '#aaa';
        }
    } else {
        moveDisc(selectedTower, index);
        document.getElementById(`tower${selectedTower + 1}`).style.backgroundColor = '#666';
        selectedTower = null;
    }
    console.log(`Tower ${index} selected`);
}

async function moveDisc(from, to) {
    if (!isValidMove(from, to)) return;
    
    console.log(`Moving disc from tower ${from} to tower ${to}`);
    animationInProgress = true;
    const disc = towers[from].pop();
    const discElement = document.getElementById(`tower${from + 1}`).lastElementChild;
    
    await animateDiscMove(discElement, from, to);

    towers[to].push(disc);
    document.getElementById(`tower${to + 1}`).appendChild(discElement);
    
    updateGameState();
}

function isValidMove(from, to) {
    return towers[from].length > 0 && 
           (towers[to].length === 0 || towers[from][towers[from].length - 1] < towers[to][towers[to].length - 1]);
}

async function animateDiscMove(discElement, from, to) {
    const fromTower = document.getElementById(`tower${from + 1}`);
    const toTower = document.getElementById(`tower${to + 1}`);
    const startPos = getCurrentPosition(discElement);
    const endPos = calculateEndPosition(discElement, to);

    await animateStep(discElement, { x: startPos.x, y: CLEAR_HEIGHT });
    await new Promise(resolve => setTimeout(resolve, 350));

    const horizontalMove = toTower.offsetLeft - fromTower.offsetLeft;
    await animateStep(discElement, { x: startPos.x + horizontalMove, y: CLEAR_HEIGHT });
    await new Promise(resolve => setTimeout(resolve, 350));

    await animateStep(discElement, { x: startPos.x + horizontalMove, y: endPos.y });

    discElement.style.transform = '';
    discElement.style.left = `${endPos.x}px`;
    discElement.style.bottom = `${endPos.y}px`;
}

function calculateEndPosition(discElement, to) {
    const disc = parseInt(discElement.style.width) / 20 - 1;
    return {
        x: (TOWER_WIDTH - (disc * 20 + 20)) / 2,
        y: towers[to].length * DISC_HEIGHT
    };
}

function animateStep(element, endPos) {
    const animationDuration = 150;
    const startTime = performance.now();
    const startPos = getCurrentPosition(element);

    return new Promise(resolve => {
        function step(currentTime) {
            const progress = Math.min((currentTime - startTime) / animationDuration, 1);
            const currentX = startPos.x + (endPos.x - startPos.x) * progress;
            const currentY = startPos.y + (endPos.y - startPos.y) * progress;

            element.style.transform = `translate(${currentX - parseFloat(element.style.left)}px, ${-(currentY - parseFloat(element.style.bottom))}px)`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function getCurrentPosition(element) {
    const left = parseFloat(element.style.left);
    const bottom = parseFloat(element.style.bottom);
    const transform = element.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/) || ['', '0', '0'];
    const translateX = parseFloat(transform[1]);
    const translateY = parseFloat(transform[2]);

    return {
        x: left + translateX,
        y: bottom - translateY
    };
}

function updateGameState() {
    moves++;
    currentMovesSpan.textContent = moves;
    animationInProgress = false;
    checkWin();
}

function checkWin() {
    if (towers[2].length === discCount) {
        const message = moves === minMoves ? 'perfectWin' : 'normalWin';
        messageDiv.textContent = getMessage(message, currentLanguage)
            .replace('{moves}', moves)
            .replace('{minMoves}', minMoves);
    }
}

async function solve() {
    solving = true;
    solveBtn.disabled = true;
    await solveTowers(discCount, 0, 2, 1);
    solving = false;
    solveBtn.disabled = false;
    checkWin();
}

async function solveTowers(n, from, to, aux) {
    if (n === 1) {
        await moveDisc(from, to);
        return;
    }
    await solveTowers(n - 1, from, aux, to);
    await moveDisc(from, to);
    await solveTowers(n - 1, aux, to, from);
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
  
// Event listeners
discCountSelect.addEventListener('change', initGame);
resetBtn.addEventListener('click', initGame);
solveBtn.addEventListener('click', solve);
window.addEventListener('resize', drawTowers);

window.addEventListener('DOMContentLoaded', () => {
    currentLanguage = detectLanguage();
    window.setLanguage(currentLanguage);
    initGame();
});

function addTouchEventListeners() {
    const towers = document.querySelectorAll('.tower');
    towers.forEach(tower => {
      tower.addEventListener('touchstart', handleTouchStart, false);
      tower.addEventListener('touchend', handleTouchEnd, false);
    });
  }
  
  function handleTouchStart(event) {
    event.preventDefault();
    const tower = event.target.closest('.tower');
    if (tower) {
      selectTower(tower);
    }
  }
  
  function handleTouchEnd(event) {
    event.preventDefault();
    const tower = event.target.closest('.tower');
    if (tower) {
      selectTower(tower);
    }
  }
  