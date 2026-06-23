const DIRS = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w:          { x: 0, y: -1 },
  s:          { x: 0, y:  1 },
  a:          { x: -1, y: 0 },
  d:          { x: 1, y: 0 },
};

const TYPE_INFO = {
  empty: { color: '#0d1117' },
  player: { color: '#7c3aed' },
  goal: { color: '#22c55e' },
  wall: { color: '#6b7280' },
  coin: { color: '#facc15' },
};

export class BuilderGame {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = opts.cols || 12;
    this.rows = opts.rows || 10;
    this.cell = opts.cell || 32;
    this.grid = opts.grid ? opts.grid.map(row => row.slice()) : Array.from({ length: this.rows }, () => Array(this.cols).fill('empty'));
    this.running = false;
    this.victory = false;
    this.collected = 0;
    this.message = 'Place a player and a goal to play.';
    this._raf = null;
    this._parseGrid();
    this.draw();
  }

  _parseGrid() {
    this.playerStart = null;
    this.goal = null;
    this.coins = [];
    this.walls = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell === 'player') this.playerStart = { x, y };
        if (cell === 'goal') this.goal = { x, y };
        if (cell === 'coin') this.coins.push({ x, y });
        if (cell === 'wall') this.walls.push({ x, y });
      }
    }

    if (!this.playerStart || !this.goal) {
      this.running = false;
      this.message = 'Place a player and a goal to play.';
    }

    this.player = this.playerStart ? { ...this.playerStart } : null;
  }

  updateStage(grid) {
    this.grid = grid.map(row => row.slice());
    this.running = false;
    this.victory = false;
    this.collected = 0;
    this._parseGrid();
    this.draw();
  }

  canPlay() {
    return Boolean(this.playerStart && this.goal);
  }

  start() {
    if (!this.canPlay()) {
      this.message = 'Place a player and a goal to play.';
      this.draw();
      return;
    }
    this.running = true;
    this.victory = false;
    this.collected = 0;
    this.player = { ...this.playerStart };
    this.message = 'Use arrows or WASD to move.';
    this.draw();
    this._beginLoop();
  }

  _beginLoop() {
    cancelAnimationFrame(this._raf);
    const step = () => {
      this.draw();
      if (this.running) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  handleKey(key) {
    if (!this.running) return;
    const dir = DIRS[key];
    if (!dir) return;
    this._move(dir);
  }

  _move(dir) {
    if (!this.player) return;
    const next = { x: this.player.x + dir.x, y: this.player.y + dir.y };
    if (next.x < 0 || next.x >= this.cols || next.y < 0 || next.y >= this.rows) return;
    const target = this.grid[next.y][next.x];
    if (target === 'wall') return;

    this.player = next;

    if (target === 'coin') {
      this.grid[next.y][next.x] = 'empty';
      this.collected += 1;
    }

    if (target === 'goal') {
      this.running = false;
      this.victory = true;
      this.message = 'Level complete! Great job.';
    }

    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, W, H);

    const startX = Math.floor((W - this.cols * this.cell) / 2);
    const startY = Math.floor((H - this.rows * this.cell) / 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + y * this.cell);
      ctx.lineTo(startX + this.cols * this.cell, startY + y * this.cell);
      ctx.stroke();
    }
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(startX + x * this.cell, startY);
      ctx.lineTo(startX + x * this.cell, startY + this.rows * this.cell);
      ctx.stroke();
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.grid[y][x];
        if (tile === 'empty') continue;
        ctx.fillStyle = TYPE_INFO[tile].color;
        const px = startX + x * this.cell + 2;
        const py = startY + y * this.cell + 2;
        const size = this.cell - 4;
        if (tile === 'player' || tile === 'goal' || tile === 'coin') {
          ctx.beginPath();
          ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, size, size);
        }
      }
    }

    if (this.player) {
      const px = startX + this.player.x * this.cell + 2;
      const py = startY + this.player.y * this.cell + 2;
      ctx.fillStyle = TYPE_INFO.player.color;
      ctx.beginPath();
      ctx.arc(px + (this.cell - 4) / 2, py + (this.cell - 4) / 2, (this.cell - 4) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000a';
      ctx.beginPath();
      ctx.arc(px + (this.cell - 4) / 2, py + (this.cell - 4) / 2, (this.cell - 4) / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(this.message, W / 2, H - 22);

    if (!this.running && !this.victory && this.canPlay()) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 18px Segoe UI';
      ctx.fillText('Click Play and use arrows to move.', W / 2, 28);
    }

    if (this.victory) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 30px Segoe UI';
      ctx.fillText('You won!', W / 2, H / 2 - 10);
      ctx.fillStyle = '#d1d5db';
      ctx.font = '16px Segoe UI';
      ctx.fillText(`Coins collected: ${this.collected}`, W / 2, H / 2 + 18);
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
  }
}
