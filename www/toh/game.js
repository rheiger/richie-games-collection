let towers = [[], [], []];
let discCount = 3;
let moves = 0;
let minMoves = 7;
let selectedTower = null;
let solving = false;

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
    messageDiv.textContent = '';
    currentMovesSpan.textContent = moves;
    
    discCount = parseInt(discCountSelect.value);
    minMoves = Math.pow(2, discCount) - 1;
    minMovesSpan.textContent = minMoves;

    for (let i = discCount; i > 0; i--) {
        towers[0].push(i);
    }
    drawTowers();
}

function drawTowers() {
    gameBoard.innerHTML = '';
    towers.forEach((tower, index) => {
        const towerDiv = document.createElement('div');
        towerDiv.className = 'tower';
        towerDiv.id = `tower${index + 1}`;
        towerDiv.onclick = () => selectTower(index);
        
        tower.forEach((disc, discIndex) => {
            const discDiv = document.createElement('div');
            discDiv.className = 'disc';
            discDiv.style.width = `${disc * 20 + 20}px`;
            discDiv.style.backgroundColor = `hsl(${disc * 30}, 70%, 50%)`;
            towerDiv.appendChild(discDiv);
        });
        
        gameBoard.appendChild(towerDiv);
    });
}

function selectTower(index) {
    if (solving) return;
    
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

function moveDisc(from, to) {
    if (towers[from].length === 0) return;
    if (towers[to].length > 0 && towers[from][towers[from].length - 1] > towers[to][towers[to].length - 1]) return;
    
    const disc = towers[from].pop();
    towers[to].push(disc);
    moves++;
    currentMovesSpan.textContent = moves;
    drawTowers();
    checkWin();
}

function checkWin() {
    if (towers[2].length === discCount) {
        if (moves === minMoves) {
            messageDiv.textContent = 'Congratulations! You solved it in the minimum number of moves!';
        } else {
            messageDiv.textContent = `Congratulations! You solved it in ${moves} moves. Try to solve it in ${minMoves} moves!`;
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
        await new Promise(resolve => setTimeout(resolve, 500));
        moveDisc(from, to);
        return;
    }
    await solveTowers(n - 1, from, aux, to);
    await new Promise(resolve => setTimeout(resolve, 500));
    moveDisc(from, to);
    await solveTowers(n - 1, aux, to, from);
}

discCountSelect.addEventListener('change', initGame);
resetBtn.addEventListener('click', initGame);
solveBtn.addEventListener('click', solve);

initGame();