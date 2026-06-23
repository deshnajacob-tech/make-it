export class SnakeGame {
  constructor(canvas, opts = {}) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.cellSize = opts.cellSize ?? 20;
    this.cols     = Math.floor(canvas.width  / this.cellSize);
    this.rows     = Math.floor(canvas.height / this.cellSize);
    this.snakeColor = opts.snakeColor ?? '#7c3aed';
    this.foodColor  = opts.foodColor  ?? '#f85149';
    this.bgColor    = opts.bgColor    ?? '#0d1117';
    this.baseSpeed  = opts.speed      ?? 140;
    this._interval  = null;
    this.onGameOver = null;
    this.reset();
  }

  reset() {
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake    = [{x: cx, y: cy}];
    this.dir      = {x: 1, y: 0};
    this.nextDir  = {x: 1, y: 0};
    this.food     = this._spawnFood();
    this.score    = 0;
    this.alive    = true;
    this.speed    = this.baseSpeed;
    this._restart();
  }

  _restart() {
    clearInterval(this._interval);
    if (this.alive) {
      this._interval = setInterval(() => { this._tick(); this.draw(); }, this.speed);
    }
  }

  _spawnFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows),
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  _tick() {
    if (!this.alive) return;
    this.dir = this.nextDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.alive = false;
      clearInterval(this._interval);
      this.draw();
      if (this.onGameOver) this.onGameOver(this.score);
      return;
    }

    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food   = this._spawnFood();
      this.speed  = Math.max(55, this.speed - 3);
      clearInterval(this._interval);
      this._interval = setInterval(() => { this._tick(); this.draw(); }, this.speed);
    } else {
      this.snake.pop();
    }
  }

  draw() {
    const { ctx, canvas, cellSize: cs } = this;
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, W, H);

    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = .5;
    for (let x = 0; x < this.cols; x++) ctx.strokeRect(x * cs, 0, cs, H);
    for (let y = 0; y < this.rows; y++) ctx.strokeRect(0, y * cs, W, cs);

    // snake
    this.snake.forEach((seg, i) => {
      const t   = i / Math.max(this.snake.length, 1);
      const col = i === 0 ? this.snakeColor : this._lerpColor(this.snakeColor, '#1a0533', t);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2, 5);
      ctx.fill();
    });

    // food with pulse glow
    ctx.shadowColor = this.foodColor;
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = this.foodColor;
    ctx.beginPath();
    ctx.arc(this.food.x * cs + cs / 2, this.food.y * cs + cs / 2, cs / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // score
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font      = `bold 13px Segoe UI`;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 8, 18);

    if (!this.alive) this._drawOverlay('Game Over', `Score: ${this.score}`, 'Space / click to restart');
  }

  _drawOverlay(title, sub, hint) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6edf3';
    ctx.font = `bold 26px Segoe UI`;
    ctx.fillText(title, W / 2, H / 2 - 22);
    ctx.fillStyle = '#8b949e';
    ctx.font = `16px Segoe UI`;
    ctx.fillText(sub, W / 2, H / 2 + 12);
    ctx.font = `13px Segoe UI`;
    ctx.fillText(hint, W / 2, H / 2 + 40);
  }

  _lerpColor(a, b, t) {
    const p = (s, i) => parseInt(s.slice(i, i + 2), 16);
    const r = Math.round(p(a,1) + (p(b,1) - p(a,1)) * t);
    const g = Math.round(p(a,3) + (p(b,3) - p(a,3)) * t);
    const bl = Math.round(p(a,5) + (p(b,5) - p(a,5)) * t);
    return `rgb(${r},${g},${bl})`;
  }

  handleKey(key) {
    const map = { ArrowUp:    {x:0,y:-1}, w: {x:0,y:-1},
                  ArrowDown:  {x:0,y:1},  s: {x:0,y:1},
                  ArrowLeft:  {x:-1,y:0}, a: {x:-1,y:0},
                  ArrowRight: {x:1,y:0},  d: {x:1,y:0} };
    const d = map[key];
    if (!d) return;
    if (d.x === -this.dir.x && d.y === -this.dir.y) return;
    if (!this.alive) { this.reset(); return; }
    this.nextDir = d;
  }

  clickOrSpace() {
    if (!this.alive) this.reset();
  }

  destroy() { clearInterval(this._interval); }
}
