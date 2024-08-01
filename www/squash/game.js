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
    let gameOver = false;
    let spin = 0;
    let maxSpeed = 8;
    let speedIncreaseFactor = 1.0005;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let usingDeviceOrientation = false;

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
        const scoreText = `${getMessage('score', currentLanguage)}${score}`;
        ctx.fillText(scoreText, canvas.width - ctx.measureText(scoreText).width - 10, 20);
    }

    function centerText(ctx, text, y) {
        const measurement = ctx.measureText(text);
        const x = (canvas.width - measurement.width) / 2;
        ctx.fillText(text, x, y);
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
                    endGame();
                }
            }

            x += dx;
            y += dy;

            if (spin > 0) spin = Math.max(0, spin - 0.1);
            if (spin < 0) spin = Math.min(0, spin + 0.1);
        } else if (gameOver) {
            ctx.fillStyle = "red";
            ctx.font = "30px Arial";
            centerText(ctx, getMessage('gameOver', currentLanguage), canvas.height / 2);
            ctx.font = "20px Arial";
            centerText(ctx, `${getMessage('finalScore', currentLanguage)}${score}`, canvas.height / 2 + 40);
        } else {
            ctx.fillStyle = "black";
            ctx.font = "20px Arial";
            centerText(ctx, getMessage('clickToBegin', currentLanguage), canvas.height / 2);
            if (isMobile) {
                ctx.font = "16px Arial";
                centerText(ctx, getMessage('mobileInstructions', currentLanguage), canvas.height / 2 + 30);
            }
        }

        requestAnimationFrame(draw);
    }

    function endGame() {
        // console.log("Game Over");
        gameRunning = false;
        gameOver = true;
        if (startButton) startButton.style.display = 'inline-block';
    }

    function keyDownHandler(e) {
        if (!gameRunning) return;
        if (e.key === "Right" || e.key === "ArrowRight") {
            paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
            spin = 1;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            paddleX = Math.max(paddleX - 7, 0);
            spin = -1;
        }
    }

    function keyUpHandler(e) {
        if (!gameRunning) return;
        if ((e.key === "Right" || e.key === "ArrowRight") && spin > 0) {
            spin = 0;
        } else if ((e.key === "Left" || e.key === "ArrowLeft") && spin < 0) {
            spin = 0;
        }
    }

    function mouseMoveHandler(e) {
        if (!gameRunning) return;
        const relativeX = e.clientX - canvas.offsetLeft;
        movePaddle(relativeX);
    }

    function touchMoveHandler(e) {
        if (!gameRunning) return;
        e.preventDefault();
        const relativeX = e.touches[0].clientX - canvas.offsetLeft;
        movePaddle(relativeX);
    }

    function movePaddle(relativeX) {
        if (relativeX > 0 && relativeX < canvas.width) {
            let newPaddleX = relativeX - paddleWidth / 2;
            spin = (newPaddleX - paddleX) / 5;
            paddleX = newPaddleX;
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
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, tiltPercentage * canvas.width));
    }

    function startGame() {
        // console.log("Starting game");
        gameRunning = true;
        gameOver = false;
        score = 0;
        x = canvas.width / 2;
        y = canvas.height - 30;
        dx = 3;
        dy = -3;
        paddleX = (canvas.width - paddleWidth) / 2;
        spin = 0;
        if (startButton) {
            startButton.style.display = 'none';
            startButton.textContent = getMessage('startGame');
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
                            } else {
                                displayOrientationMessage("Permission denied. Using touch controls.");
                            }
                        })
                        .catch(error => {
                            console.error('Error requesting device orientation permission:', error);
                            displayOrientationMessage("Couldn't request permission. Using touch controls.");
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

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    document.addEventListener("touchmove", touchMoveHandler, false);
    if (startButton) {
        startButton.addEventListener("click", startGame);
    } else {
        console.error("Start button not found");
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

    if (startButton) {
        startButton.textContent = getMessage('startGame');
    }
    document.getElementById('title').textContent = getMessage('title');

    draw();

    // console.log("Script loaded and initialized");
});