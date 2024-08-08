let towers = [[], [], []];
let discCount = 3;
let moves = 0;
let minMoves = 7;
let selectedTower = null;
let solving = false;
let currentLanguage = 'en';
let animationInProgress = false;

const gameBoard = document.getElementById('gameBoard');
const discCountSelect = document.getElementById('discCount');
const resetBtn = document.getElementById('resetBtn');
const solveBtn = document.getElementById('solveBtn');
const currentMovesSpan = document.getElementById('currentMoves');
const minMovesSpan = document.getElementById('minMoves');
const messageDiv = document.getElementById('message');

const TOWER_HEIGHT = 200;
const TOWER_WIDTH = 20;
const DISC_HEIGHT = 22;
const CLEAR_HEIGHT = TOWER_HEIGHT + 50; // Raise disc 50px above the tower

console.log(`Constants: TOWER_HEIGHT=${TOWER_HEIGHT}, TOWER_WIDTH=${TOWER_WIDTH}, DISC_HEIGHT=${DISC_HEIGHT}, CLEAR_HEIGHT=${CLEAR_HEIGHT}`);

function initGame() {
    towers = [[], [], []];
    moves = 0;
    solving = false;
    animationInProgress = false;
    messageDiv.textContent = '';
    currentMovesSpan.textContent = moves;
    
    discCount = parseInt(discCountSelect.value);
    minMoves = Math.pow(2, discCount) - 1;
    minMovesSpan.textContent = minMoves;

    for (let i = discCount; i > 0; i--) {
        towers[0].push(i);
    }
    drawTowers();
    updateLanguage();
    console.log(`Game initialized with ${discCount} discs`);
}

function drawTowers() {
    gameBoard.innerHTML = '';
    const towerSpacing = (gameBoard.clientWidth - TOWER_WIDTH * 3) / 4;

    towers.forEach((tower, index) => {
        const towerDiv = document.createElement('div');
        towerDiv.className = 'tower';
        towerDiv.id = `tower${index + 1}`;
        towerDiv.style.left = `${towerSpacing + (towerSpacing + TOWER_WIDTH) * index}px`;
        towerDiv.onclick = () => selectTower(index);
        
        tower.forEach((disc, discIndex) => {
            const discDiv = document.createElement('div');
            discDiv.className = 'disc';
            discDiv.style.width = `${disc * 20 + 20}px`;
            discDiv.style.backgroundColor = `hsl(${disc * 30}, 70%, 50%)`;
            discDiv.style.bottom = `${discIndex * DISC_HEIGHT}px`;
            discDiv.style.left = `${(TOWER_WIDTH - (disc * 20 + 20)) / 2}px`;
            towerDiv.appendChild(discDiv);
        });
        
        gameBoard.appendChild(towerDiv);
    });
    console.log('Towers redrawn');
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
    if (towers[from].length === 0) return;
    if (towers[to].length > 0 && towers[from][towers[from].length - 1] > towers[to][towers[to].length - 1]) return;
    
    console.log(`Moving disc from tower ${from} to tower ${to}`);
    animationInProgress = true;
    const disc = towers[from].pop();
    const fromTower = document.getElementById(`tower${from + 1}`);
    const toTower = document.getElementById(`tower${to + 1}`);
    const discElement = fromTower.lastElementChild;
    
    const startPos = getCurrentPosition(discElement);
    const endPos = {
        x: parseFloat(toTower.style.left) + (TOWER_WIDTH - discElement.offsetWidth) / 2,
        y: towers[to].length * DISC_HEIGHT
    };

    console.log(`Start position: x=${startPos.x}, y=${startPos.y}`);
    console.log(`End position: x=${endPos.x}, y=${endPos.y}`);

    // Step 1: Move up vertically
    console.log("Step 1: Moving up");
    await animateStep(discElement, { x: startPos.x, y: CLEAR_HEIGHT });
    logPosition(discElement, "After Step 1");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Move horizontally
    console.log("Step 2: Moving horizontally");
    await animateStep(discElement, { x: endPos.x, y: CLEAR_HEIGHT });
    logPosition(discElement, "After Step 2");

    // Step 3: Move down vertically
    console.log("Step 3: Moving down");
    await animateStep(discElement, { x: endPos.x, y: endPos.y });

    // Update the disc's final position
    discElement.style.transform = '';
    discElement.style.left = `${(TOWER_WIDTH - discElement.offsetWidth) / 2}px`;
    discElement.style.bottom = `${endPos.y}px`;

    towers[to].push(disc);
    toTower.appendChild(discElement);
    
    logPosition(discElement, "Final disc position");

    moves++;
    currentMovesSpan.textContent = moves;
    animationInProgress = false;
    checkWin();
}

function animateStep(element, endPos) {
    return new Promise(resolve => {
        const animationDuration = 300; // milliseconds per step
        const startTime = performance.now();
        const startPos = getCurrentPosition(element);

        console.log(`Animation step: from (${startPos.x}, ${startPos.y}) to (${endPos.x}, ${endPos.y})`);

        function step(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);

            const currentX = startPos.x + (endPos.x - startPos.x) * progress;
            const currentY = startPos.y + (endPos.y - startPos.y) * progress;

            const translateX = currentX - parseFloat(element.style.left);
            const translateY = -(currentY - parseFloat(element.style.bottom));
            element.style.transform = `translate(${translateX}px, ${translateY}px)`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                console.log(`Animation step completed: final position (${currentX}, ${currentY})`);
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

function getCurrentPosition(element) {
    const rect = element.getBoundingClientRect();
    const gameBoard = document.getElementById('gameBoard');
    const gameBoardRect = gameBoard.getBoundingClientRect();

    return {
        x: rect.left - gameBoardRect.left,
        y: gameBoardRect.bottom - rect.bottom
    };
}

function logPosition(element, label) {
    const pos = getCurrentPosition(element);
    const rect = element.getBoundingClientRect();
    console.log(`${label} - Position: x=${pos.x}, y=${pos.y}, left=${element.style.left}, bottom=${element.style.bottom}, transform=${element.style.transform}, BoundingClientRect: left=${rect.left}, top=${rect.top}`);
}

function checkWin() {
    if (towers[2].length === discCount) {
        if (moves === minMoves) {
            messageDiv.textContent = getMessage('perfectWin', currentLanguage);
        } else {
            messageDiv.textContent = getMessage('normalWin', currentLanguage)
                .replace('{moves}', moves)
                .replace('{minMoves}', minMoves);
        }
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

function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = getMessage(key, currentLanguage);
    });
    document.title = getMessage('title', currentLanguage);
}

function initializeLanguage() {
    currentLanguage = window.detectLanguage();
    window.createLanguageButtons();
    window.setLanguage(currentLanguage);
}

discCountSelect.addEventListener('change', initGame);
resetBtn.addEventListener('click', initGame);
solveBtn.addEventListener('click', solve);

window.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    initGame();
});

window.addEventListener('resize', drawTowers);

// Make setLanguage function available globally
window.setLanguage = (lang) => {
    currentLanguage = lang;
    updateLanguage();
};