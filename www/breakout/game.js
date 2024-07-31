document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const scoreElement = document.getElementById('scoreValue');

    // Canvas dimensions
    canvas.width = 400;
    canvas.height = 400;

    // Ball properties
    let ballRadius = 10;
    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = 2;
    let dy = -2;
    let initialSpeed = 2;
    let maxSpeed = 8;
    let speedIncreaseFactor = 1.0005;

    // Paddle properties
    let paddleHeight = 10;
    let paddleWidth = 75;
    let paddleX = (canvas.width - paddleWidth) / 2;

    // Keyboard input variables
    let rightPressed = false;
    let leftPressed = false;

    // Brick properties
    let brickRowCount = 5;
    let brickColumnCount = 7;
    let brickWidth;
    let brickHeight = 20;
    let brickPadding = 5;
    let brickOffsetTop = 30;
    let brickOffsetLeft = 15;

    // Game state
    let score = 0;
    let lives = 3;
    let gameRunning = false;
    let gameOver = false;
    let gamePaused = false;
    let gameWon = false;

    // Brick colors and values
    const brickColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF'];
    const brickValues = [5, 4, 3, 2, 1];

    function calculateBrickWidth() {
        const availableWidth = canvas.width - 2 * brickOffsetLeft - (brickColumnCount - 1) * brickPadding;
        brickWidth = Math.floor(availableWidth / brickColumnCount);
    }

    calculateBrickWidth();

    // Create bricks
    let bricks = [];
    function createBricks() {
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { 
                    x: 0, 
                    y: 0, 
                    status: 1, 
                    color: brickColors[r], 
                    value: brickValues[r] 
                };
            }
        }
    }

    createBricks();

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

    function drawBricks() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status == 1) {
                    let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brickWidth, brickHeight);
                    ctx.fillStyle = bricks[c][r].color;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    function drawScore() {
        if (scoreElement) {
            scoreElement.textContent = score;
        }
        ctx.font = "16px Arial";
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#34495e';
        ctx.fillText(`${getMessage('score', currentLanguage)}${score}`, 8, 20);
    }

    function drawLives() {
        ctx.font = "16px Arial";
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#34495e';
        ctx.fillText(`${getMessage('lives', currentLanguage)}${lives}`, canvas.width - 65, 20);
    }

    function collisionDetection() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                let b = bricks[c][r];
                if (b.status == 1) {
                    if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                        dy = -dy;
                        b.status = 0;
                        score += b.value;
                        if (score == brickRowCount * brickColumnCount * 3) {  // Average brick value is 3
                            gameWon = true;
                            gameOver = true;
                            gameRunning = false;
                        }
                    }
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        drawScore();
        drawLives();
        collisionDetection();

        if (gameRunning && !gamePaused) {
            if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
                dx = -dx;
            }
            if (y + dy < ballRadius) {
                dy = -dy;
            } else if (y + dy > canvas.height - ballRadius) {
                if (x > paddleX && x < paddleX + paddleWidth) {
                    let hitPos = (x - paddleX) / paddleWidth;
                    dx = 8 * (hitPos - 0.5);
                    dy = -Math.abs(dy);
                    let speed = Math.sqrt(dx*dx + dy*dy);
                    dx *= speedIncreaseFactor;
                    dy *= speedIncreaseFactor;
                    if (speed > maxSpeed) {
                        dx *= maxSpeed / speed;
                        dy *= maxSpeed / speed;
                    }
                } else {
                    lives--;
                    if (!lives) {
                        gameOver = true;
                        gameRunning = false;
                    } else {
                        x = canvas.width / 2;
                        y = canvas.height - 30;
                        dx = initialSpeed;
                        dy = -initialSpeed;
                        paddleX = (canvas.width - paddleWidth) / 2;
                        gamePaused = true;
                    }
                }
            }

            x += dx;
            y += dy;

            if (rightPressed && paddleX < canvas.width - paddleWidth) {
                paddleX += 7;
            } else if (leftPressed && paddleX > 0) {
                paddleX -= 7;
            }
        } else if (gameOver) {
            ctx.font = "30px Arial";
            ctx.fillStyle = gameWon ? "green" : "red";
            centerText(ctx, gameWon ? getMessage('congratulations', currentLanguage) : getMessage('gameOver', currentLanguage), canvas.height / 2);
            ctx.font = "20px Arial";
            centerText(ctx, `${getMessage('finalScore', currentLanguage)}${score}`, canvas.height / 2 + 40);
        } else if (gamePaused) {
            ctx.font = "20px Arial";
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#34495e';
            centerText(ctx, getMessage('clickToContinue', currentLanguage), canvas.height / 2);
        } else {
            ctx.font = "20px Arial";
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#34495e';
            centerText(ctx, getMessage('clickToBegin', currentLanguage), canvas.height / 2);
        }

        requestAnimationFrame(draw);
    }

    function centerText(ctx, text, y) {
        const measurement = ctx.measureText(text);
        const x = (canvas.width - measurement.width) / 2;
        ctx.fillText(text, x, y);
    }

    function keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = true;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = true;
        }
    }

    function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = false;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = false;
        }
    }

    function mouseMoveHandler(e) {
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleX = relativeX - paddleWidth / 2;
        }
    }

    function clickHandler(e) {
        if (gamePaused) {
            gamePaused = false;
            gameRunning = true;
        }
    }

    function startGame() {
        gameRunning = true;
        gameOver = false;
        gameWon = false;
        gamePaused = false;
        score = 0;
        lives = 3;
        x = canvas.width / 2;
        y = canvas.height - 30;
        dx = initialSpeed;
        dy = -initialSpeed;
        paddleX = (canvas.width - paddleWidth) / 2;
        
        createBricks();

        if (startButton) {
            startButton.style.display = 'none';
        }
    }

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    canvas.addEventListener("click", clickHandler, false);
    if (startButton) {
        startButton.addEventListener("click", startGame);
    }

    // Initial setup
    if (startButton) {
        startButton.textContent = getMessage('startGame', currentLanguage);
    }
    document.getElementById('title').textContent = getMessage('title', currentLanguage);

    draw();
});