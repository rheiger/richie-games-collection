document.addEventListener('DOMContentLoaded', (event) => {
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
    let dx = 3;
    let dy = -3;
    let score = 0;
    let gameRunning = false;
    let spin = 0;
    let maxSpeed = 8;
    let speedIncreaseFactor = 1.0005;

    function drawBall() {
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3498db';
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color') || '#2ecc71';
        ctx.fill();
        ctx.closePath();
    }

    function drawScore() {
        if (scoreElement) {
            scoreElement.textContent = score;
        }
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.fillText(`Score: ${score}`, canvas.width - 80, 20);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBall();
        drawPaddle();
        drawScore();

        if (gameRunning) {
            if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
                dx = -dx;
            }
            if (y + dy < ballRadius) {
                dy = -dy;
            } else if (y + dy > canvas.height - ballRadius) {
                if (x > paddleX && x < paddleX + paddleWidth) {
                    let hitPos = (x - paddleX) / paddleWidth;
                    dy = -Math.abs(dy);
                    dx = 8 * (hitPos - 0.5) + spin;
                    dx = Math.max(Math.min(dx, maxSpeed), -maxSpeed);
                    dy *= speedIncreaseFactor;
                    dx *= speedIncreaseFactor;
                    let speed = Math.sqrt(dx*dx + dy*dy);
                    if (speed > maxSpeed) {
                        dx *= maxSpeed / speed;
                        dy *= maxSpeed / speed;
                    }
                    score++;
                    spin = 0;
                } else {
                    gameRunning = false;
                    if (startButton) startButton.style.display = 'inline-block';
                    return;
                }
            }

            x += dx;
            y += dy;

            if (spin > 0) spin = Math.max(0, spin - 0.1);
            if (spin < 0) spin = Math.min(0, spin + 0.1);
        } else {
            // Display "Click Start to Begin" message
            ctx.fillStyle = "black";
            ctx.font = "20px Arial";
            ctx.fillText("Click Start to Begin", canvas.width / 2 - 80, canvas.height / 2);
        }

        requestAnimationFrame(draw);
    }

    function keyDownHandler(e) {
        if (!gameRunning) return; // Ignore key presses if game hasn't started
        if (e.key === "Right" || e.key === "ArrowRight") {
            paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
            spin = 1;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            paddleX = Math.max(paddleX - 7, 0);
            spin = -1;
        }
    }

    function keyUpHandler(e) {
        if (!gameRunning) return; // Ignore key releases if game hasn't started
        if ((e.key === "Right" || e.key === "ArrowRight") && spin > 0) {
            spin = 0;
        } else if ((e.key === "Left" || e.key === "ArrowLeft") && spin < 0) {
            spin = 0;
        }
    }

    function mouseMoveHandler(e) {
        if (!gameRunning) return; // Ignore mouse movement if game hasn't started
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            let newPaddleX = relativeX - paddleWidth / 2;
            spin = (newPaddleX - paddleX) / 5;
            paddleX = newPaddleX;
        }
    }

    function startGame() {
        if (!gameRunning) {
            gameRunning = true;
            score = 0;
            x = canvas.width / 2;
            y = canvas.height - 30;
            dx = 3;
            dy = -3;
            paddleX = (canvas.width - paddleWidth) / 2;
            spin = 0;
            if (startButton) startButton.style.display = 'none';
        }
    }

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    if (startButton) startButton.addEventListener("click", startGame);

    // Start the draw loop immediately, but don't move anything until game starts
    draw();

    console.log("Script loaded and initialized");
});