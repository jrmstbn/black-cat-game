const game = {
    running: false, 
    score: 0, 
    lives: 8, 
    time: 0,
    camera: { x: 0, y: 0 }, 
    world: { width: 1600, height: 1200 },
    cat: { x: 400, y: 300, hidden: false }, 
    silhouettes: [],
    villagers: [{ x: 300, y: 300, dx: 1, dy: 1 }], 
    rats: [],
    houses: [
        { x: 200, y: 300 }, { x: 500, y: 250 }, { x: 800, y: 400 },
        { x: 1200, y: 200 }, { x: 300, y: 600 }, { x: 900, y: 700 },
        { x: 1400, y: 500 }, { x: 600, y: 900 }, { x: 100, y: 800 }
    ],
    keys: {}, 
    mobile: { moveX: 0, moveY: 0 }
};

function showGame() {
    document.getElementById('story').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('start').style.display = 'block';
    init();
}

function init() {
    for (let i = 0; i < 20; i++) {
        game.rats.push({
            x: Math.random() * (game.world.width - 50) + 25,
            y: Math.random() * (game.world.height - 50) + 25,
            dx: (Math.random() - 0.5) * 2, 
            dy: (Math.random() - 0.5) * 2
        });
    }
    setupMobileControls();
    render();
}

function setupMobileControls() {
    const joystick = document.getElementById('moveJoystick');
    const inner = joystick.querySelector('.joystick-inner');
    let isDragging = false;

    function handleStart(e) {
        isDragging = true;
        e.preventDefault();
    }

    function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.min(25, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
        const angle = Math.atan2(deltaY, deltaX);
        
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        inner.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        game.mobile.moveX = x / 25;
        game.mobile.moveY = y / 25;
    }

    function handleEnd(e) {
        isDragging = false;
        inner.style.transform = 'translate(-50%, -50%)';
        game.mobile.moveX = 0;
        game.mobile.moveY = 0;
    }

    joystick.addEventListener('touchstart', handleStart);
    joystick.addEventListener('mousedown', handleStart);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mouseup', handleEnd);
}

function createSilhouette() {
    if (game.silhouettes.length < game.lives) {
        game.silhouettes.push({ x: game.cat.x, y: game.cat.y });
    }
}

function teleportToSilhouette() {
    if (game.silhouettes.length > 0) {
        const sil = game.silhouettes.shift();
        game.cat.x = sil.x;
        game.cat.y = sil.y;
    }
}

function startGame() {
    game.running = true;
    document.getElementById('start').style.display = 'none';
    setInterval(() => {
        if (!game.running) return;
        game.time++;
        if (game.time % 7 === 0) addVillager();
    }, 1000);
    gameLoop();
}

function addVillager() {
    game.villagers.push({
        x: Math.random() * (game.world.width - 50) + 25,
        y: Math.random() * (game.world.height - 50) + 25,
        dx: (Math.random() - 0.5) * 2, 
        dy: (Math.random() - 0.5) * 2
    });
}

function gameLoop() {
    if (!game.running) return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Move cat
    let moveX = 0, moveY = 0;
    if (game.keys['KeyW'] || game.keys['ArrowUp']) moveY -= 2;
    if (game.keys['KeyS'] || game.keys['ArrowDown']) moveY += 2;
    if (game.keys['KeyA'] || game.keys['ArrowLeft']) moveX -= 2;
    if (game.keys['KeyD'] || game.keys['ArrowRight']) moveX += 2;
    
    // Mobile controls
    moveX += game.mobile.moveX * 3;
    moveY += game.mobile.moveY * 3;
    
    game.cat.x += moveX;
    game.cat.y += moveY;

    // Keep cat in world bounds
    game.cat.x = Math.max(10, Math.min(game.world.width - 30, game.cat.x));
    game.cat.y = Math.max(10, Math.min(game.world.height - 30, game.cat.y));

    // Update camera
    game.camera.x = game.cat.x - window.innerWidth / 2;
    game.camera.y = game.cat.y - window.innerHeight / 2;
    game.camera.x = Math.max(0, Math.min(game.world.width - window.innerWidth, game.camera.x));
    game.camera.y = Math.max(0, Math.min(game.world.height - window.innerHeight, game.camera.y));

    // Check if cat is in house
    game.cat.hidden = false;
    for (let house of game.houses) {
        if (collision(game.cat, house, 20, 60, 20, 50)) {
            game.cat.hidden = true;
            break;
        }
    }

    // Move villagers
    for (let v of game.villagers) {
        v.x += v.dx; 
        v.y += v.dy;
        if (v.x <= 0 || v.x >= game.world.width - 16) v.dx *= -1;
        if (v.y <= 0 || v.y >= game.world.height - 24) v.dy *= -1;

        if (!game.cat.hidden && collision(game.cat, v, 20, 16, 20, 24)) {
            game.lives--;
            if (game.silhouettes.length > 0) game.silhouettes.pop();
            if (game.lives <= 0) { 
                endGame(false); 
                return; 
            }
            game.cat.x = Math.random() * (game.world.width - 100) + 50;
            game.cat.y = Math.random() * (game.world.height - 100) + 50;
        }
    }

    // Move rats
    for (let i = game.rats.length - 1; i >= 0; i--) {
        let r = game.rats[i];
        let dx = game.cat.x - r.x, dy = game.cat.y - r.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 80) {
            r.dx = -dx / dist * 1.5;
            r.dy = -dy / dist * 1.5;
        }
        
        r.x += r.dx; 
        r.y += r.dy;
        
        if (r.x <= 0 || r.x >= game.world.width - 12) r.dx *= -1;
        if (r.y <= 0 || r.y >= game.world.height - 8) r.dy *= -1;
        r.x = Math.max(0, Math.min(game.world.width - 12, r.x));
        r.y = Math.max(0, Math.min(game.world.height - 8, r.y));

        if (collision(game.cat, r, 20, 12, 20, 8)) {
            game.rats.splice(i, 1);
            game.score++;
            if (game.score >= 20) { 
                endGame(true); 
                return; 
            }
        }
    }
}

function collision(a, b, aw, bw, ah, bh) {
    return a.x < b.x + bw && a.x + aw > b.x && a.y < b.y + bh && a.y + ah > b.y;
}

function render() {
    const gameEl = document.getElementById('game');
    const children = [...gameEl.children];
    children.forEach(child => {
        if (!['ui', 'controls', 'start', 'mobile-controls', 'gameover'].includes(child.id) && 
            !child.className.includes('grass')) {
            child.remove();
        }
    });

    // Update UI
    document.getElementById('score').textContent = game.score;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('villagers').textContent = game.villagers.length;
    document.getElementById('time').textContent = game.time;

    // Render houses
    game.houses.forEach(house => {
        const div = document.createElement('div');
        div.className = 'house';
        div.style.left = (house.x - game.camera.x) + 'px';
        div.style.top = (house.y - game.camera.y) + 'px';
        gameEl.appendChild(div);
    });

    // Render silhouettes
    game.silhouettes.forEach(sil => {
        const div = document.createElement('div');
        div.className = 'cat silhouette';
        div.style.left = (sil.x - game.camera.x) + 'px';
        div.style.top = (sil.y - game.camera.y) + 'px';
        gameEl.appendChild(div);
    });

    // Render cat
    const catDiv = document.createElement('div');
    catDiv.className = 'cat' + (game.cat.hidden ? ' hidden' : '');
    catDiv.style.left = (game.cat.x - game.camera.x) + 'px';
    catDiv.style.top = (game.cat.y - game.camera.y) + 'px';
    gameEl.appendChild(catDiv);

    // Render villagers (only if visible)
    game.villagers.forEach(v => {
        if (v.x + 16 > game.camera.x && v.x < game.camera.x + window.innerWidth &&
            v.y + 24 > game.camera.y && v.y < game.camera.y + window.innerHeight) {
            const div = document.createElement('div');
            div.className = 'villager';
            div.style.left = (v.x - game.camera.x) + 'px';
            div.style.top = (v.y - game.camera.y) + 'px';
            gameEl.appendChild(div);
        }
    });

    // Render rats (only if visible)
    game.rats.forEach(r => {
        if (r.x + 12 > game.camera.x && r.x < game.camera.x + window.innerWidth &&
            r.y + 8 > game.camera.y && r.y < game.camera.y + window.innerHeight) {
            const div = document.createElement('div');
            div.className = 'rat';
            div.style.left = (r.x - game.camera.x) + 'px';
            div.style.top = (r.y - game.camera.y) + 'px';
            gameEl.appendChild(div);
        }
    });
}

function endGame(won) {
    game.running = false;
    setTimeout(() => {
        const gameoverEl = document.querySelector('#gameover');
        const endtextEl = document.querySelector('#endtext');
        
        if (won) {
            document.body.className = 'victory';
            document.getElementById('game').style.background = 'radial-gradient(circle, #87ceeb, #b0e0e6)';
            endtextEl.innerHTML = '🎉 Victory! 🎉<br>The Black Cat saved Europe from the plague!<br>You hunted all rats in ' + game.time + ' seconds!';
        } else {
            endtextEl.innerHTML = '💀 Defeat! 💀<br>The Black Death spreads across the land...<br>The villagers\' superstition doomed them all.';
        }
        gameoverEl.style.display = 'block';
    }, 100);
}

document.addEventListener('keydown', e => {
    game.keys[e.code] = true;
    if (e.code === 'KeyE') createSilhouette();
    if (e.code === 'KeyQ') teleportToSilhouette();
});

document.addEventListener('keyup', e => {
    game.keys[e.code] = false;
});