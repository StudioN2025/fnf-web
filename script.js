const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const LANES = [
    { key: 'ArrowLeft', x: 280, name: 'left' },
    { key: 'ArrowUp', x: 480, name: 'up' },
    { key: 'ArrowDown', x: 680, name: 'down' },
    { key: 'ArrowRight', x: 880, name: 'right' }
];
const HIT_Y = 550;
const NOTE_SPEED = 4.5;

let score = 0;
let combo = 0;
let health = 100;
let notes = [];
let currentSongIndex = 0;
let gameActive = true;
let frameCount = 0;
let lastHitType = '';

// Song pattern [frame, laneIndex]
const songPatterns = [
    {
        name: "Tutorial",
        notes: [
            [30,0], [45,1], [60,2], [75,3],
            [90,0], [105,2], [120,1], [135,3],
            [160,0], [170,1], [180,2], [190,3],
            [210,0], [220,0], [230,1], [240,2],
            [260,3], [270,0], [280,1], [290,2],
            [310,3], [320,0], [330,1], [340,2],
            [360,3], [370,0], [380,0], [390,3],
            [420,0], [435,2], [450,1], [465,3],
            [490,0], [500,1], [510,2], [520,3],
            [550,0], [560,1], [570,2], [580,3],
            [610,0], [620,2], [630,1], [640,3],
            [670,0], [680,1], [690,2], [700,3],
            [730,0], [740,0], [750,1], [760,2],
            [790,3], [810,0], [830,1], [850,2],
            [880,3], [900,0], [920,1], [940,2],
            [970,3], [990,0], [1010,1], [1030,2]
        ]
    }
];

let currentPattern = songPatterns[0];
let nextNoteIndex = 0;

// Key states
let pressedKeys = {};

// Create placeholder graphics (since we can't actually load images in this demo)
// In a real project, you'd load PNG files
function drawPixelArtArrow(x, y, direction, isNote = false) {
    ctx.save();
    ctx.shadowBlur = isNote ? 15 : 5;
    ctx.shadowColor = isNote ? '#ff66ff' : '#000';
    
    // Arrow body
    ctx.fillStyle = isNote ? '#FFD700' : '#FFFFFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    
    const size = 40;
    const half = size / 2;
    
    ctx.beginPath();
    switch(direction) {
        case 'left':
            ctx.moveTo(x, y);
            ctx.lineTo(x - size, y - half);
            ctx.lineTo(x - size, y - 15);
            ctx.lineTo(x - size - 20, y);
            ctx.lineTo(x - size, y + 15);
            ctx.lineTo(x - size, y + half);
            break;
        case 'up':
            ctx.moveTo(x, y);
            ctx.lineTo(x - half, y + size);
            ctx.lineTo(x - 15, y + size);
            ctx.lineTo(x, y + size + 20);
            ctx.lineTo(x + 15, y + size);
            ctx.lineTo(x + half, y + size);
            break;
        case 'down':
            ctx.moveTo(x, y);
            ctx.lineTo(x - half, y - size);
            ctx.lineTo(x - 15, y - size);
            ctx.lineTo(x, y - size - 20);
            ctx.lineTo(x + 15, y - size);
            ctx.lineTo(x + half, y - size);
            break;
        case 'right':
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y - half);
            ctx.lineTo(x + size, y - 15);
            ctx.lineTo(x + size + 20, y);
            ctx.lineTo(x + size, y + 15);
            ctx.lineTo(x + size, y + half);
            break;
    }
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

function drawCharacter(x, y, character) {
    ctx.save();
    ctx.shadowBlur = 0;
    
    // Simple pixel art style character
    ctx.fillStyle = character === 'bf' ? '#3366FF' : '#FF3366';
    ctx.fillRect(x - 40, y - 80, 80, 80);
    
    // Head
    ctx.fillStyle = '#FFD1A4';
    ctx.fillRect(x - 30, y - 70, 60, 50);
    
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 20, y - 55, 15, 12);
    ctx.fillRect(x + 5, y - 55, 15, 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 18, y - 53, 10, 8);
    ctx.fillRect(x + 7, y - 53, 10, 8);
    
    // Mouth (determined by last hit)
    ctx.fillStyle = '#663300';
    if(lastHitType === 'perfect') {
        ctx.fillRect(x - 10, y - 38, 20, 8);
    } else if(lastHitType === 'miss') {
        ctx.fillRect(x - 15, y - 38, 30, 6);
    } else {
        ctx.fillRect(x - 8, y - 38, 16, 5);
    }
    
    // Hair
    ctx.fillStyle = character === 'bf' ? '#FF6600' : '#660000';
    ctx.fillRect(x - 35, y - 75, 70, 20);
    
    // Body
    ctx.fillStyle = character === 'bf' ? '#0044CC' : '#CC0044';
    ctx.fillRect(x - 25, y - 25, 50, 40);
    
    ctx.restore();
}

function drawBackground() {
    // Gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a0533');
    grad.addColorStop(0.5, '#331a66');
    grad.addColorStop(1, '#0a0a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stars
    ctx.fillStyle = '#FFFFFF';
    for(let i = 0; i < 100; i++) {
        if(i % 2 === 0) {
            ctx.fillRect((i * 131) % canvas.width, (i * 87) % canvas.height, 2, 2);
        }
    }
    
    // Stage
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    ctx.fillStyle = '#4a2a6a';
    for(let i = 0; i < 20; i++) {
        ctx.fillRect(i * 80, canvas.height - 150, 40, 10);
    }
}

function drawLanes() {
    // Lane lines
    LANES.forEach(lane => {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lane.x - 45, 0);
        ctx.lineTo(lane.x - 45, canvas.height);
        ctx.stroke();
        
        // Hit zone
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(lane.x - 45, HIT_Y - 25, 90, 50);
        ctx.strokeStyle = '#ff66cc';
        ctx.strokeRect(lane.x - 45, HIT_Y - 25, 90, 50);
        
        // Base arrows
        drawPixelArtArrow(lane.x, HIT_Y + 5, lane.name, false);
        
        // Key press effect
        if(pressedKeys[lane.key]) {
            ctx.fillStyle = 'rgba(255,200,100,0.4)';
            ctx.fillRect(lane.x - 45, HIT_Y - 25, 90, 50);
        }
    });
}

function drawNotes() {
    notes.forEach(note => {
        const lane = LANES[note.lane];
        drawPixelArtArrow(lane.x, note.y, lane.name, true);
    });
}

function spawnNote(frame) {
    while(nextNoteIndex < currentPattern.notes.length && 
          currentPattern.notes[nextNoteIndex][0] <= frame) {
        notes.push({
            lane: currentPattern.notes[nextNoteIndex][1],
            y: -50,
            frame: frame
        });
        nextNoteIndex++;
    }
}

function updateNotes() {
    for(let i = 0; i < notes.length; i++) {
        notes[i].y += NOTE_SPEED;
        
        // Miss if passed hit zone
        if(notes[i].y > HIT_Y + 60) {
            notes.splice(i, 1);
            miss();
            i--;
        }
    }
}

function hitNote(laneIndex) {
    let closestNote = null;
    let closestDistance = Infinity;
    
    notes.forEach(note => {
        if(note.lane === laneIndex) {
            const distance = Math.abs(note.y - HIT_Y);
            if(distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        }
    });
    
    if(closestNote) {
        if(closestDistance <= 15) {
            perfectHit();
            createHitEffect('PERFECT!', '#FFD700');
            lastHitType = 'perfect';
        } else if(closestDistance <= 35) {
            goodHit();
            createHitEffect('GOOD!', '#88FF88');
            lastHitType = 'good';
        } else {
            miss();
            createHitEffect('MISS', '#FF6666');
            return;
        }
        
        const index = notes.indexOf(closestNote);
        notes.splice(index, 1);
    } else {
        miss();
    }
}

function perfectHit() {
    const points = 100 + Math.floor(combo * 1.5);
    score += points;
    combo++;
    health = Math.min(100, health + 5);
    updateUI();
}

function goodHit() {
    const points = 50 + combo;
    score += points;
    combo++;
    health = Math.min(100, health + 2);
    updateUI();
}

function miss() {
    combo = 0;
    health = Math.max(0, health - 15);
    updateUI();
    
    if(health <= 0) {
        gameActive = false;
        document.querySelector('.ui-overlay').innerHTML += '<div class="game-over">GAME OVER</div>';
    }
}

function createHitEffect(text, color) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.textContent = text;
    effect.style.color = color;
    effect.style.left = '50%';
    effect.style.top = '40%';
    effect.style.position = 'absolute';
    effect.style.fontSize = '48px';
    effect.style.fontWeight = 'bold';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '100';
    document.querySelector('.game-wrapper').appendChild(effect);
    
    setTimeout(() => effect.remove(), 500);
}

function updateUI() {
    document.getElementById('scoreValue').textContent = Math.floor(score);
    document.getElementById('comboValue').textContent = combo;
    document.getElementById('healthBar').style.width = health + '%';
    
    // Change health bar color based on health
    const healthBar = document.getElementById('healthBar');
    if(health > 70) {
        healthBar.style.background = 'linear-gradient(90deg, #00ff66, #33ff88)';
    } else if(health > 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ffaa33, #ffcc55)';
    } else {
        healthBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
    }
}

function resetGame() {
    score = 0;
    combo = 0;
    health = 100;
    notes = [];
    nextNoteIndex = 0;
    frameCount = 0;
    gameActive = true;
    lastHitType = '';
    updateUI();
    
    // Remove game over message if exists
    const gameOver = document.querySelector('.game-over');
    if(gameOver) gameOver.remove();
}

function gameLoop() {
    if(!gameActive) {
        drawBackground();
        drawCharacter(200, 500, 'bf');
        drawCharacter(1000, 500, 'dad');
        drawLanes();
        
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = '#FF3366';
        ctx.shadowBlur = 0;
        ctx.fillText('GAME OVER', canvas.width/2 - 150, canvas.height/2);
        requestAnimationFrame(gameLoop);
        return;
    }
    
    frameCount++;
    spawnNote(frameCount);
    updateNotes();
    
    // Draw everything
    drawBackground();
    drawCharacter(200, 500, 'bf');
    drawCharacter(1000, 500, 'dad');
    drawLanes();
    drawNotes();
    
    // Check if song finished
    if(nextNoteIndex >= currentPattern.notes.length && notes.length === 0) {
        gameActive = false;
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('COMPLETE!', canvas.width/2 - 120, canvas.height/2);
    }
    
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    const laneIndex = LANES.findIndex(lane => lane.key === e.key);
    if(laneIndex !== -1 && gameActive) {
        e.preventDefault();
        pressedKeys[e.key] = true;
        hitNote(laneIndex);
        
        // Visual feedback
        setTimeout(() => {
            pressedKeys[e.key] = false;
        }, 100);
    }
    
    if(e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

document.getElementById('resetBtn').addEventListener('click', resetGame);

// Start game
resetGame();
gameLoop();
