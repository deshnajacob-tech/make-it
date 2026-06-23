export class BreakoutGame {
  constructor(canvas, opts = {}) {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext('2d');
    this.paddleColor = opts.paddleColor ?? '#7c3aed';
    this.ballColor   = opts.ballColor   ?? '#00d4ff';
    this.brickRows   = opts.brickRows   ?? 5;
    this.ballSpeedM  = opts.ballSpeed   ?? 1.0;
    this.paddleScale = opts.paddleScale ?? 1.0;
    this.scheme      = opts.scheme      ?? ['#f85149','#f0a83b','#f0e68c','#3fb950','#00d4ff','#a78bfa'];
    this.onGameOver  = null;
    this._raf        = null;
    this._last       = null;
    this.reset();
  }

  reset() {
    const W = this.canvas.width, H = this.canvas.height;
    this.W = W; this.H = H;
    this.paddleW = Math.round(W * 0.18 * this.paddleScale);
    this.paddleH = 13;
    this.paddleX = W/2 - this.paddleW/2;
    this.ballR   = 8;
    this.lives   = 3;
    this.score   = 0;
    this.alive   = true;
    this.started = false;
    this.mouseX  = W/2;
    this._ball0();
    this.bricks  = this._buildBricks();
    this._start();
  }

  _ball0() {
    const angle = (Math.random() * 40 - 20) * Math.PI / 180;
    const spd   = 4.8 * this.ballSpeedM;
    this.ball   = { x: this.W/2, y: this.H - 70,
                    vx: spd * Math.sin(angle),
                    vy: -spd * Math.cos(angle) };
  }

  _buildBricks() {
    const cols = 10;
    const rows = Math.min(this.brickRows, this.scheme.length);
    const bw   = (this.W - 40) / cols;
    const bh   = 20;
    const bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({ x: 20 + c*bw, y: 55 + r*(bh+5),
                      w: bw-4, h: bh, alive: true,
                      color: this.scheme[r % this.scheme.length],
                      pts: (rows - r) * 10 });
      }
    }
    return bricks;
  }

  _start() {
    cancelAnimationFrame(this._raf);
    this._last = null;
    const loop = (ts) => {
      if (!this.alive) return;
      if (this._last && this.started) this._update((ts - this._last) / 1000);
      this._last = ts;
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _update(dt) {
    const { W, H } = this;
    const spd = 280 * this.ballSpeedM;

    // Paddle follows mouse
    this.paddleX = Math.max(0, Math.min(W - this.paddleW, this.mouseX - this.paddleW/2));

    this.ball.x += this.ball.vx * spd * dt;
    this.ball.y += this.ball.vy * spd * dt;

    // Side walls
    if (this.ball.x - this.ballR < 0)   { this.ball.x = this.ballR;       this.ball.vx *= -1; }
    if (this.ball.x + this.ballR > W)    { this.ball.x = W - this.ballR;   this.ball.vx *= -1; }
    // Top wall
    if (this.ball.y - this.ballR < 0)    { this.ball.y = this.ballR;       this.ball.vy  =  Math.abs(this.ball.vy); }

    // Paddle collision
    const py = H - 40;
    if (this.ball.vy > 0 &&
        this.ball.y + this.ballR >= py &&
        this.ball.y + this.ballR <= py + this.paddleH + 6 &&
        this.ball.x >= this.paddleX - 4 &&
        this.ball.x <= this.paddleX + this.paddleW + 4) {
      const rel    = (this.ball.x - (this.paddleX + this.paddleW/2)) / (this.paddleW/2);
      this.ball.vy = -Math.abs(this.ball.vy);
      this.ball.vx = rel * 5.5;
      this.ball.y  = py - this.ballR;
    }

    // Bottom — lose life
    if (this.ball.y - this.ballR > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.alive = false;
        this.draw();
        if (this.onGameOver) this.onGameOver(this.score);
        return;
      }
      this._ball0();
      this.started = false;
      return;
    }

    // Brick collisions
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (this.ball.x + this.ballR >= b.x &&
          this.ball.x - this.ballR <= b.x + b.w &&
          this.ball.y + this.ballR >= b.y &&
          this.ball.y - this.ballR <= b.y + b.h) {
        b.alive      = false;
        this.score  += b.pts;
        const overX  = Math.min(Math.abs(this.ball.x - b.x), Math.abs(this.ball.x - (b.x+b.w)));
        const overY  = Math.min(Math.abs(this.ball.y - b.y), Math.abs(this.ball.y - (b.y+b.h)));
        if (overY < overX) this.ball.vy *= -1;
        else               this.ball.vx *= -1;
        break;
      }
    }

    // All bricks cleared → next level
    if (this.bricks.every(b => !b.alive)) {
      this.bricks = this._buildBricks();
      this.ballSpeedM *= 1.1;
      this._ball0();
      this.started = false;
    }
  }

  draw() {
    const { ctx, W, H } = this;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle   = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 4;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Paddle
    ctx.shadowColor = this.paddleColor; ctx.shadowBlur = 14;
    ctx.fillStyle   = this.paddleColor;
    ctx.beginPath(); ctx.roundRect(this.paddleX, H-40, this.paddleW, this.paddleH, 5); ctx.fill();
    ctx.shadowBlur  = 0;

    // Ball
    ctx.shadowColor = this.ballColor; ctx.shadowBlur = 16;
    ctx.fillStyle   = this.ballColor;
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ballR, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur  = 0;

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font      = 'bold 13px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 10, 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f85149';
    ctx.fillText('♥'.repeat(this.lives), W - 10, 28);

    if (!this.started && this.alive) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0,0,W,H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 20px Segoe UI';
      ctx.fillText('Click or press Space to launch!', W/2, H/2);
      ctx.fillStyle = '#8b949e'; ctx.font = '13px Segoe UI';
      ctx.fillText('Move your mouse to control the paddle', W/2, H/2 + 28);
    }

    if (!this.alive) {
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0,0,W,H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f85149';
      ctx.font = 'bold 28px Segoe UI';
      ctx.fillText('Game Over', W/2, H/2 - 20);
      ctx.fillStyle = '#8b949e'; ctx.font = '16px Segoe UI';
      ctx.fillText(`Final Score: ${this.score}`, W/2, H/2 + 14);
      ctx.font = '13px Segoe UI';
      ctx.fillText('Click or Space to play again', W/2, H/2 + 42);
    }
  }

  handleKey(key) {
    if (key === ' ' || key === 'Space') {
      if (!this.alive) this.reset();
      else this.started = true;
    }
  }

  handleMouse(clientX) {
    const rect   = this.canvas.getBoundingClientRect();
    this.mouseX  = (clientX - rect.left) * (this.W / rect.width);
    if (!this.started && this.alive) this.started = true;
  }

  clickOrSpace() {
    if (!this.alive) this.reset();
    else this.started = true;
  }

  destroy() { cancelAnimationFrame(this._raf); }
}
