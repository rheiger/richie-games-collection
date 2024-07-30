// Wait for the DOM to be fully loaded before running the script
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
        // Always draw score on canvas as a fallback
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.fillText(`Score: ${score}`, canvas.width - 80, 20);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBall();
        drawPaddle();
        drawScore();

        // Debug information
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";
        ctx.fillText(`Ball: (${x.toFixed(2)}, ${y.toFixed(2)})`, 10, 20);
        ctx.fillText(`Speed: (${dx.toFixed(2)}, ${dy.toFixed(2)})`, 10, 40);
        ctx.fillText(`Paddle: ${paddleX.toFixed(2)}`, 10, 60);

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

        if (gameRunning) {
            requestAnimationFrame(draw);
        }
    }

    function keyDownHandler(e) {
        console.log("Key pressed:", e.key);  // Debug log
        if (e.key === "Right" || e.key === "ArrowRight") {
            paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
            spin = 1;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            paddleX = Math.max(paddleX - 7, 0);
            spin = -1;
        }
        if (!gameRunning) draw();  // Redraw immediately if game is not running
    }

    function keyUpHandler(e) {
        if ((e.key === "Right" || e.key === "ArrowRight") && spin > 0) {
            spin = 0;
        } else if ((e.key === "Left" || e.key === "ArrowLeft") && spin < 0) {
            spin = 0;
        }
    }

    function mouseMoveHandler(e) {
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            let newPaddleX = relativeX - paddleWidth / 2;
            spin = (newPaddleX - paddleX) / 5;
            paddleX = newPaddleX;
            if (!gameRunning) draw();  // Redraw immediately if game is not running
        }
    }

    function startGame() {
        console.log("Game started");  // Debug log
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
            requestAnimationFrame(draw);  // Start the game loop
        }
    }

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    if (startButton) startButton.addEventListener("click", startGame);

    // Initial draw to show the game state
    draw();

    console.log("Script loaded and initialized");  // Debug log
});