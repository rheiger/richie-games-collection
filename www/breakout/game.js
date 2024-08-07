document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const scoreElement = document.getElementById('scoreValue');

    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let usingDeviceOrientation = false;
    let currentLanguage = detectLanguage();

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
    let maxSpeed = 12;
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
            if (startButton) {
                startButton.style.display = 'inline-block';
            }
        } else if (gamePaused) {
            x = paddleX + paddleWidth / 2;
            y = canvas.height - paddleHeight - ballRadius;
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
        movePaddle(relativeX);
    }

    function touchMoveHandler(e) {
        e.preventDefault();
        const relativeX = e.touches[0].clientX - canvas.offsetLeft;
        movePaddle(relativeX);
    }

    function movePaddle(relativeX) {
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleX = relativeX - paddleWidth / 2;
            
            // Ensure the paddle stays within the canvas
            paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));

            // If the game is paused, move the ball with the paddle
            if (gamePaused) {
                x = paddleX + paddleWidth / 2;
            }
        }
    }

    function handleOrientation(event) {
        if (event.gamma == null) {
            // Device orientation is not supported or not available
            window.removeEventListener('deviceorientation', handleOrientation);
            usingDeviceOrientation = false;
            displayOrientationMessage("Device orientation not available. Using touch controls.");
            return;
        }
        
        usingDeviceOrientation = true;
        
        if (!gameRunning && !gamePaused) return;
        const gamma = event.gamma; // Left-right tilt in degree, range: -90 to 90
        const maxTilt = 45; // Maximum tilt angle we'll use
        const tiltPercentage = (gamma + maxTilt) / (maxTilt * 2); // Convert to 0-1 range
        const newPaddleX = tiltPercentage * (canvas.width - paddleWidth);
        movePaddle(newPaddleX + paddleWidth / 2);
    }

    function clickHandler(e) {
        if (gamePaused) {
            gamePaused = false;
            gameRunning = true;
            // Set initial ball direction when resuming
            dx = initialSpeed * (Math.random() > 0.5 ? 1 : -1);
            dy = -initialSpeed;
        } else if (!gameRunning && !gameOver) {
            startGame();
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
        if (isMobile) {
            if (window.DeviceOrientationEvent) {
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    // iOS 13+ devices
                    DeviceOrientationEvent.requestPermission()
                        .then(permissionState => {
                            if (permissionState === 'granted') {
                                window.addEventListener('deviceorientation', handleOrientation);
                                usingDeviceOrientation = true;
                                log('Permission is granted');
                            } else {
                                log('Permission is NOT granted');
                                displayOrientationMessage("Permission denied. Using touch controls.");
                            }
                        })
                        .catch(error => {
                            console.error('Error requesting device orientation permission:', error);
                            displayOrientationMessage("Couldn't request permission. Using touch controls.");
                            log('Error requesting device orientation permission:', error);
                        });
                } else {
                    // Android devices or older iOS versions
                    try {
                        window.addEventListener('deviceorientation', handleOrientation);
                        usingDeviceOrientation = true;
                        // Trigger a deviceorientation event to check if it's supported
                        setTimeout(() => {
                            if (!usingDeviceOrientation) {
                                displayOrientationMessage("Device orientation not available. Using touch controls.");
                            }
                        }, 500);
                    } catch (e) {
                        console.error('Error setting up device orientation:', e);
                        displayOrientationMessage("Device orientation not supported. Using touch controls.");
                    }
                }
            } else {
                displayOrientationMessage("Device orientation not supported. Using touch controls.");
            }
        }
    }

// console.log("Game started, gameRunning:", gameRunning, "gameOver:", gameOver);


    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    canvas.addEventListener("click", clickHandler, false);
    canvas.addEventListener('touchstart', clickHandler, false);
    canvas.addEventListener("touchmove", touchMoveHandler, false);
    canvas.addEventListener("touchstart", function(e) { e.preventDefault(); }, false);

    if (startButton) {
        startButton.addEventListener("click", startGame);
    }

    // Prevent scrolling when touching the canvas
    document.body.addEventListener("touchstart", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    document.body.addEventListener("touchend", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    document.body.addEventListener("touchmove", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, { passive: false });

    // Initial setup
    if (startButton) {
        startButton.textContent = getMessage('startGame', currentLanguage);
    }
    document.getElementById('title').textContent = getMessage('title', currentLanguage);

    draw();
});
