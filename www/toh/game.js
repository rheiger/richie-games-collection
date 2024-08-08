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
}

function drawTowers() {
    gameBoard.innerHTML = '';
    const towerWidth = 20;
    const towerSpacing = (gameBoard.clientWidth - towerWidth * 3) / 4;

    towers.forEach((tower, index) => {
        const towerDiv = document.createElement('div');
        towerDiv.className = 'tower';
        towerDiv.id = `tower${index + 1}`;
        towerDiv.style.left = `${towerSpacing + (towerSpacing + towerWidth) * index}px`;
        towerDiv.onclick = () => selectTower(index);
        
        tower.forEach((disc, discIndex) => {
            const discDiv = document.createElement('div');
            discDiv.className = 'disc';
            discDiv.style.width = `${disc * 20 + 20}px`;
            discDiv.style.backgroundColor = `hsl(${disc * 30}, 70%, 50%)`;
            discDiv.style.bottom = `${discIndex * 22}px`;
            discDiv.style.left = `${(towerWidth - (disc * 20 + 20)) / 2}px`;
            towerDiv.appendChild(discDiv);
        });
        
        gameBoard.appendChild(towerDiv);
    });
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
}

async function moveDisc(from, to) {
    if (towers[from].length === 0) return;
    if (towers[to].length > 0 && towers[from][towers[from].length - 1] > towers[to][towers[to].length - 1]) return;
    
    animationInProgress = true;
    const disc = towers[from].pop();
    const fromTower = document.getElementById(`tower${from + 1}`);
    const toTower = document.getElementById(`tower${to + 1}`);
    const discElement = fromTower.lastElementChild;
    
    const startPos = {
        x: parseFloat(discElement.style.left) + fromTower.offsetLeft,
        y: parseFloat(discElement.style.bottom)
    };
    const endPos = {
        x: toTower.offsetLeft + (20 - (disc * 20 + 20)) / 2,
        y: towers[to].length * 22
    };

    await animateDisc(discElement, startPos, endPos);
    
    towers[to].push(disc);
    toTower.appendChild(discElement);
    discElement.style.transform = '';
    discElement.style.left = `${(20 - (disc * 20 + 20)) / 2}px`;
    discElement.style.bottom = `${(towers[to].length - 1) * 22}px`;
    
    moves++;
    currentMovesSpan.textContent = moves;
    animationInProgress = false;
    checkWin();
}

function animateDisc(element, start, end) {
    const animationDuration = 1000; // milliseconds
    const startTime = performance.now();
    const maxHeight = 100; // maximum height of the arc

    return new Promise(resolve => {
        function step(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);

            // Easing function for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            let currentX, currentY;

            if (progress < 0.5) {
                // First half: move up and halfway across
                currentX = start.x + (end.x - start.x) * (progress * 2);
                currentY = start.y + maxHeight * Math.sin(progress * Math.PI);
            } else {
                // Second half: move down and complete horizontal movement
                currentX = start.x + (end.x - start.x);
                currentY = maxHeight * Math.sin(progress * Math.PI) + end.y * (1 - Math.sin(progress * Math.PI));
            }

            element.style.transform = `translate(${currentX - start.x}px, ${-currentY}px)`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
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