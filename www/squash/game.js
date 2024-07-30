const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('scoreValue');

let paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;
let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;
let score = 0;
let gameRunning = false;

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color');
    ctx.fill();
    ctx.closePath();
}

function drawScore() {
    scoreElement.textContent = score;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall();
    drawPaddle();
    drawScore();

    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
    }
    if (y + dy < ballRadius) {
        dy = -dy;
    } else if (y + dy > canvas.height - ballRadius) {
        if (x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
            score++;
        } else {
            gameRunning = false;
            startButton.style.display = 'inline-block';
            return;
        }
    }

    x += dx;
    y += dy;

    if (gameRunning) {
        requestAnimationFrame(draw);
    }
}

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        paddleX = Math.max(paddleX - 7, 0);
    }
}

function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
    }
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        score = 0;
        x = canvas.width / 2;
        y = canvas.height - 30;
        dx = 2;
        dy = -2;
        paddleX = (canvas.width - paddleWidth) / 2;
        startButton.style.display = 'none';
        draw();
    }
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);
startButton.addEventListener("click", startGame);

// Initial draw to show the game state
draw();

// Extend the existing translations object
Object.keys(gameTranslations).forEach(lang => {
    if (translations[lang]) {
        Object.assign(translations[lang], gameTranslations[lang]);
    } else {
        translations[lang] = gameTranslations[lang];
    }
});

// Initialize language
createLanguageButtons();
setLanguage(detectLanguage());