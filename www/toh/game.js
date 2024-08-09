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
const CLEAR_HEIGHT = TOWER_HEIGHT + 20; // 20px above the tower height

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
    
    const startPos = {
        x: parseFloat(discElement.style.left),
        y: parseFloat(discElement.style.bottom)
    };
    const endPos = {
        x: (TOWER_WIDTH - (disc * 20 + 20)) / 2,
        y: towers[to].length * DISC_HEIGHT
    };

    console.log(`Start position: x=${startPos.x}, y=${startPos.y}`);
    console.log(`End position: x=${endPos.x}, y=${endPos.y}`);

    // Step 1: Move up vertically
    const verticalMoveDistance = CLEAR_HEIGHT - startPos.y;
    console.log(`Step 1: Moving up by ${verticalMoveDistance}px`);
    await animateStep(discElement, { x: startPos.x, y: CLEAR_HEIGHT });
    
    logPosition(discElement, "After Step 1");
    await new Promise(resolve => setTimeout(resolve, 350));

    // Step 2: Move horizontally
    console.log(`disc.style="${parseFloat(discElement.style.width)}"`);
    const horizontalMove = toTower.offsetLeft - fromTower.offsetLeft + parseFloat(discElement.style.width)/2;
    console.log(`Step 2: Moving horizontally by ${horizontalMove}px`);
    await animateStep(discElement, { x: startPos.x + horizontalMove, y: CLEAR_HEIGHT });
    
    logPosition(discElement, "After Step 2");
    await new Promise(resolve => setTimeout(resolve, 350));

    // Step 3: Move down vertically
    console.log(`Step 3: Moving down to final y-position ${endPos.y}`);
    await animateStep(discElement, { x: startPos.x + horizontalMove, y: endPos.y });

    // Update the disc's final position
    discElement.style.transform = '';
    discElement.style.left = `${endPos.x}px`;
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
    const animationDuration = 150; // milliseconds per step
    const startTime = performance.now();
    const startPos = getCurrentPosition(element);

    console.log(`Animation step: from (${startPos.x}, ${startPos.y}) to (${endPos.x}, ${endPos.y})`);

    return new Promise(resolve => {
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

function logPosition(element, label) {
    const pos = getCurrentPosition(element);
    console.log(`${label} - Position: x=${pos.x}, y=${pos.y}, left=${element.style.left}, bottom=${element.style.bottom}, transform=${element.style.transform}`);
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


discCountSelect.addEventListener('change', initGame);
resetBtn.addEventListener('click', initGame);
solveBtn.addEventListener('click', solve);

window.addEventListener('DOMContentLoaded', () => {
    currentLanguage = detectLanguage();
    window.setLanguage(currentLanguage);
    initGame();
});

window.addEventListener('resize', drawTowers);
