// Game configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Lane positions (X coordinate for each arrow)
const LANES = [
    { key: 'ArrowLeft', x: 280, y: 450, angle: 0 },
    { key: 'ArrowUp', x: 480, y: 450, angle: 0 },
    { key: 'ArrowDown', x: 680, y: 450, angle: 0 },
    { key: 'ArrowRight', x: 880, y: 450, angle: 0 }
];

const NOTE_SPEED = 5.2;
const HIT_Y = 510;

// Game state
let score = 0;
let combo = 0;
let health = 100;
let notes = [];
let gameActive = true;
let frameCount = 0;
let nextNoteIndex = 0;
let currentSong = null;
let pressedArrows = {};
let lastHitRating = '';
let hitEffectTimer = 0;

// Images cache
const images = {};

// Song pattern (Week 1 style)
const songs = {
    tutorial: {
        name: 'Tutorial',
        bpm: 150,
        notes: generateWeek1Pattern()
    }
};

function generateWeek1Pattern() {
    const pattern = [];
    let frame = 0;
    
    // Intro
    for(let i = 0; i < 8; i++) {
        pattern.push([frame, i % 4]);
        frame += 15;
    }
    
    // Verse 1
    const verse1 = [0,1,2,3, 0,2,1,3, 0,0,1,2, 3,0,1,2];
    for(let i = 0; i < verse1.length; i++) {
        pattern.push([frame, verse1[i]]);
        frame += 12 + (i % 2 === 0 ? 0 : 4);
    }
    
    // Chorus
    for(let i = 0; i < 32; i++) {
        pattern.push([frame, i % 4]);
        frame += 10;
    }
    
    // Verse 2
    for(let i = 0; i < 24; i++) {
        pattern.push([frame, Math.floor(Math.random() * 4)]);
        frame += 12;
    }
    
    // Outro
    for(let i = 0; i < 16; i++) {
        pattern.push([frame, i % 4]);
        frame += 15;
    }
    
    return pattern;
}

// Load all images from assets
async function loadImages() {
    const imageList = {
        // Stage backgrounds
        smoke: 'assets/week1/smoke.png',
        spotlight: 'assets/week1/spotlight.png',
        stageLight: 'assets/week1/stage_light.png',
        stageBack: 'assets/week1/stageback.png',
        stageCurtains: 'assets/week1/stagecurtains.png',
        stageFront: 'assets/week1/stagefront.png',
        
        // Boyfriend animations
        bfIdle: 'assets/week1/boyfriend/idle.png',
        bfLeft: 'assets/week1/boyfriend/singLEFT.png',
        bfUp: 'assets/week1/boyfriend/singUP.png',
        bfDown: 'assets/week1/boyfriend/singDOWN.png',
        bfRight: 'assets/week1/boyfriend/singRIGHT.png',
        
        // Dad animations
        dadIdle: 'assets/week1/dad/idle.png',
        dadLeft: 'assets/week1/dad/singLEFT.png',
        dadUp: 'assets/week1/dad/singUP.png',
        dadDown: 'assets/week1/dad/singDOWN.png',
        dadRight: 'assets/week1/dad/singRIGHT.png',
        
        // Notes
        noteLeft: 'assets/week1/notes/left.png',
        noteUp: 'assets/week1/notes/up.png',
        noteDown: 'assets/week1/notes/down.png',
        noteRight: 'assets/week1/notes/right.png',
        splash: 'assets/week1/notes/splash.png'
    };
    
    const promises = [];
    for (const [key, path] of Object.entries(imageList)) {
        promises.push(new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                images[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.warn(`Could not load: ${path}`);
                images[key] = null;
                resolve();
            };
            img.src = path;
        }));
    }
    
    await Promise.all(promises);
    console.log('All images loaded');
}

// Drawing functions with actual graphics
function drawBackground() {
    // Stage back
    if (images.stageBack) {
        ctx.drawImage(images.stageBack, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1a0533';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Stage curtains
    if (images.stageCurtains) {
        ctx.drawImage(images.stageCurtains, 0, 0, canvas.width, canvas.height);
    }
    
    // Stage lights
    if (images.stageLight) {
        for(let i = 0; i < 4; i++) {
            ctx.drawImage(images.stageLight, 100 + i * 300, 50, 200, 300);
        }
    }
    
    // Spotlight effect (changing color based on health)
    if (images.spotlight) {
        ctx.globalAlpha = 0.4 + (health / 200);
        ctx.drawImage(images.spotlight, 400, 100, 500, 400);
        ctx.globalAlpha = 1;
    }
    
    // Smoke overlay
    if (images.smoke) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(images.smoke, 0, canvas.height - 300, canvas.width, 300);
        ctx.globalAlpha = 1;
    }
}

function drawCharacter(x, y, type, animation) {
    let imgKey = '';
    
    if (type === 'bf') {
        switch(animation) {
            case 'left': imgKey = 'bfLeft'; break;
            case 'up': imgKey = 'bfUp'; break;
            case 'down': imgKey = 'bfDown'; break;
            case 'right': imgKey = 'bfRight'; break;
            default: imgKey = 'bfIdle';
        }
    } else {
        switch(animation) {
            case 'left': imgKey = 'dadLeft'; break;
            case 'up': imgKey = 'dadUp'; break;
            case 'down': imgKey = 'dadDown'; break;
            case 'right': imgKey = 'dadRight'; break;
            default: imgKey = 'dadIdle';
        }
    }
    
    if (images[imgKey]) {
        ctx.drawImage(images[imgKey], x, y, images[imgKey].width, images[imgKey].height);
    } else {
        // Fallback drawing
        ctx.fillStyle = type === 'bf' ? '#3366FF' : '#FF3366';
        ctx.fillRect(x, y, 150, 150);
        ctx.fillStyle = '#FFD1A4';
        ctx.fillRect(x + 25, y + 20, 100, 80);
    }
}

function drawLanesAndNotes() {
    // Draw stage front (over characters but under notes)
    if (images.stageFront) {
        ctx.drawImage(images.stageFront, 0, canvas.height - 200, canvas.width, 200);
    }
    
    // Draw note receptors (static arrows)
    LANES.forEach((lane, idx) => {
        const noteImg = images[`note${['Left','Up','Down','Right'][idx]}`];
        if (noteImg) {
            ctx.drawImage(noteImg, lane.x - 35, HIT_Y - 35, 70, 70);
        } else {
            ctx.fillStyle = 'rgba(100,100,200,0.5)';
            ctx.fillRect(lane.x - 35, HIT_Y - 35, 70, 70);
        }
        
        // Press effect
        if (pressedArrows[lane.key]) {
            ctx.strokeStyle = '#ffdd88';
            ctx.lineWidth = 4;
            ctx.strokeRect(lane.x - 35, HIT_Y - 35, 70, 70);
        }
    });
    
    // Draw falling notes
    notes.forEach(note => {
        const lane = LANES[note.lane];
        const noteImg = images[`note${['Left','Up','Down','Right'][note.lane]}`];
        if (noteImg) {
            ctx.drawImage(noteImg, lane.x - 35, note.y, 70, 70);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(lane.x - 30, note.y, 60, 60);
        }
    });
}

function drawHitRating() {
    if (hitEffectTimer > 0 && lastHitRating) {
        const effectDiv = document.getElementById('hitEffect');
        effectDiv.textContent = lastHitRating;
        effectDiv.style.color = lastHitRating === 'PERFECT!' ? '#ffd700' : 
                                 lastHitRating === 'GOOD!' ? '#88ff88' : '#ff6666';
        effectDiv.classList.add('show');
        setTimeout(() => effectDiv.classList.remove('show'), 300);
        hitEffectTimer--;
    }
}

// Game mechanics
function spawnNote() {
    if (!gameActive) return;
    
    const song = songs.tutorial;
    while (nextNoteIndex < song.notes.length && song.notes[nextNoteIndex][0] <= frameCount) {
        notes.push({
            lane: song.notes[nextNoteIndex][1],
            y: -70,
            frame: frameCount
        });
        nextNoteIndex++;
    }
}

function updateNotes() {
    for (let i = 0; i < notes.length; i++) {
        notes[i].y += NOTE_SPEED;
        
        if (notes[i].y > HIT_Y + 80) {
            notes.splice(i, 1);
            miss();
            i--;
        }
    }
}

function hitNote(laneIndex, key) {
    let closestNote = null;
    let minDistance = Infinity;
    
    for (let note of notes) {
        if (note.lane === laneIndex) {
            const distance = Math.abs(note.y - HIT_Y);
            if (distance < minDistance) {
                minDistance = distance;
                closestNote = note;
            }
        }
    }
    
    if (closestNote) {
        const noteIndex = notes.indexOf(closestNote);
        
        if (minDistance <= 20) {
            // PERFECT
            const points = 100 + Math.floor(combo * 2);
            score += points;
            combo++;
            health = Math.min(100, health + 5);
            lastHitRating = 'PERFECT!';
            hitEffectTimer = 10;
            createSplashEffect(LANES[laneIndex].x, HIT_Y);
        } else if (minDistance <= 45) {
            // GOOD
            const points = 50 + combo;
            score += points;
            combo++;
            health = Math.min(100, health + 2);
            lastHitRating = 'GOOD!';
            hitEffectTimer = 8;
        } else {
            // Too far - miss
            notes.splice(noteIndex, 1);
            miss();
            return;
        }
        
        notes.splice(noteIndex, 1);
        updateUI();
        
        // Animate character singing
        const arrowName = ['left', 'up', 'down', 'right'][laneIndex];
        animateCharacter(arrowName);
    } else {
        miss();
    }
}

function createSplashEffect(x, y) {
    if (images.splash) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(images.splash, x - 50, y - 50, 100, 100);
        ctx.restore();
    }
}

function animateCharacter(direction) {
    // Visual feedback - the actual animation happens in draw loop
    // We set a temporary flag
    window.bfAnimation = direction;
    window.dadAnimation = direction;
    setTimeout(() => {
        window.bfAnimation = null;
        window.dadAnimation = null;
    }, 150);
}

function miss() {
    combo = 0;
    health = Math.max(0, health - 12);
    lastHitRating = 'MISS!';
    hitEffectTimer = 8;
    updateUI();
    
    if (health <= 0) {
        gameActive = false;
        showGameOver();
    }
}

function updateUI() {
    document.getElementById('scoreValue').textContent = Math.floor(score);
    document.getElementById('comboValue').textContent = combo;
    document.getElementById('healthBar').style.width = health + '%';
    
    // Show/hide combo box with animation
    const comboBox = document.getElementById('comboBox');
    if (combo >= 2) {
        comboBox.style.display = 'block';
        comboBox.style.animation = 'none';
        setTimeout(() => comboBox.style.animation = 'comboPulse 0.3s ease', 10);
    } else {
        comboBox.style.display = 'none';
    }
    
    // Change health bar color
    const healthBar = document.getElementById('healthBar');
    if (health > 70) {
        healthBar.style.background = 'linear-gradient(90deg, #44ff66, #88ff88)';
    } else if (health > 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ffaa33, #ffcc55)';
    } else {
        healthBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
    }
}

function showGameOver() {
    const container = document.querySelector('.game-container');
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.textContent = 'GAME OVER';
    container.appendChild(gameOverDiv);
}

function resetGame() {
    score = 0;
    combo = 0;
    health = 100;
    notes = [];
    nextNoteIndex = 0;
    frameCount = 0;
    gameActive = true;
    lastHitRating = '';
    updateUI();
    
    const gameOverDiv = document.querySelector('.game-over');
    if (gameOverDiv) gameOverDiv.remove();
    
    document.getElementById('songName').textContent = 'Tutorial';
}

// Animation loop
function gameLoop() {
    if (gameActive) {
        frameCount++;
        spawnNote();
        updateNotes();
    }
    
    // Draw everything
    drawBackground();
    
    // Draw Dad (enemy) - left side
    drawCharacter(150, 300, 'dad', window.dadAnimation || 'idle');
    
    // Draw Boyfriend - right side
    drawCharacter(900, 350, 'bf', window.bfAnimation || 'idle');
    
    drawLanesAndNotes();
    drawHitRating();
    
    // Check win condition
    if (nextNoteIndex >= songs.tutorial.notes.length && notes.length === 0 && gameActive) {
        gameActive = false;
        const container = document.querySelector('.game-container');
        const winDiv = document.createElement('div');
        winDiv.className = 'game-over';
        winDiv.textContent = 'WEEK COMPLETE!';
        winDiv.style.color = '#ffd700';
        container.appendChild(winDiv);
    }
    
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    const laneIndex = LANES.findIndex(lane => lane.key === e.key);
    if (laneIndex !== -1 && gameActive) {
        e.preventDefault();
        pressedArrows[e.key] = true;
        hitNote(laneIndex, e.key);
        
        // Visual feedback on controls panel
        const keys = document.querySelectorAll('.key-hint');
        if (keys[laneIndex]) {
            keys[laneIndex].style.transform = 'translateY(2px)';
            setTimeout(() => {
                keys[laneIndex].style.transform = '';
            }, 100);
        }
        
        setTimeout(() => {
            pressedArrows[e.key] = false;
        }, 150);
    }
    
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

document.getElementById('restartBtn').addEventListener('click', resetGame);

// Initialize game
async function init() {
    await loadImages();
    resetGame();
    gameLoop();
}

init();
