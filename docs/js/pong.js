export class PongGame {
  constructor(canvas, opts = {}) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.ballColor  = opts.ballColor    ?? '#00d4ff';
    this.p1Color    = opts.p1Color      ?? '#7c3aed';
    this.p2Color    = opts.p2Color      ?? '#f85149';
    this.aiSpeed    = opts.aiDifficulty ?? 0.7;
    this.ballSpeedM = opts.ballSpeed    ?? 1.0;
    this.onGameOver = null;
    this._raf       = null;
    this._last      = null;
    this.reset();
  }

  reset() {
    const W = this.canvas.width, H = this.canvas.height;
    this.W = W; this.H = H;
    this.paddleH  = Math.round(H * 0.22);
    this.paddleW  = 12;
    this.ballR    = 9;
    this.player   = { x: 18, y: H/2 - this.paddleH/2, vy: 0, score: 0 };
    this.ai       = { x: W - 18 - this.paddleW, y: H/2 - this.paddleH/2, score: 0 };
    this._resetBall();
    this.alive    = true;
    this._start();
  }

  _resetBall() {
    const angle  = (Math.random() * 60 - 30) * Math.PI / 180;
    const dir    = Math.random() < .5 ? 1 : -1;
    const spd    = 4.5 * this.ballSpeedM;
    this.ball    = { x: this.W/2, y: this.H/2,
                     vx: spd * dir * Math.cos(angle),
                     vy: spd       * Math.sin(angle) };
  }

  _start() {
    cancelAnimationFrame(this._raf);
    this._last = null;
    const loop = (ts) => {
      if (!this.alive) return;
      if (this._last) this._update((ts - this._last) / 1000);
      this._last = ts;
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _update(dt) {
    const { W, H } = this;
    const pSpeed = 320;

    // Player paddle
    this.player.y += this.player.vy * pSpeed * dt;
    this.player.y  = Math.max(0, Math.min(H - this.paddleH, this.player.y));

    // AI paddle (tracks ball with capped speed)
    const aiTarget = this.ball.y - this.paddleH / 2;
    const aiDiff   = aiTarget - this.ai.y;
    const aiStep   = this.aiSpeed * pSpeed * dt;
    this.ai.y += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), aiStep);
    this.ai.y  = Math.max(0, Math.min(H - this.paddleH, this.ai.y));

    // Ball movement
    const maxSpd = 14 * this.ballSpeedM;
    this.ball.x += this.ball.vx * 60 * dt;
    this.ball.y += this.ball.vy * 60 * dt;

    // Wall bounce
    if (this.ball.y - this.ballR < 0)  { this.ball.y = this.ballR;       this.ball.vy *= -1; }
    if (this.ball.y + this.ballR > H)  { this.ball.y = H - this.ballR;   this.ball.vy *= -1; }

    // Player paddle hit
    if (this.ball.vx < 0 &&
        this.ball.x - this.ballR <= this.player.x + this.paddleW &&
        this.ball.x - this.ballR >= this.player.x - 4 &&
        this.ball.y >= this.player.y - 4 &&
        this.ball.y <= this.player.y + this.paddleH + 4) {
      this.ball.x  = this.player.x + this.paddleW + this.ballR;
      const rel    = (this.ball.y - (this.player.y + this.paddleH / 2)) / (this.paddleH / 2);
      this.ball.vx = Math.min(maxSpd, Math.abs(this.ball.vx) * 1.06);
      this.ball.vy = rel * 7;
    }

    // AI paddle hit
    if (this.ball.vx > 0 &&
        this.ball.x + this.ballR >= this.ai.x &&
        this.ball.x + this.ballR <= this.ai.x + this.paddleW + 4 &&
        this.ball.y >= this.ai.y - 4 &&
        this.ball.y <= this.ai.y + this.paddleH + 4) {
      this.ball.x  = this.ai.x - this.ballR;
      const rel    = (this.ball.y - (this.ai.y + this.paddleH / 2)) / (this.paddleH / 2);
      this.ball.vx = -Math.min(maxSpd, Math.abs(this.ball.vx) * 1.06);
      this.ball.vy = rel * 7;
    }

    // Scoring
    if (this.ball.x < 0) {
      this.ai.score++;
      if (this.ai.score >= 5) { this.alive = false; this.draw(); if (this.onGameOver) this.onGameOver(this.player.score); return; }
      setTimeout(() => this._resetBall(), 600);
    }
    if (this.ball.x > W) {
      this.player.score++;
      if (this.player.score >= 5) { this.alive = false; this.draw(); if (this.onGameOver) this.onGameOver(this.player.score); return; }
      setTimeout(() => this._resetBall(), 600);
    }
  }

  draw() {
    const { ctx, W, H } = this;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Center dashes
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.font      = 'bold 36px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.p1Color;
    ctx.fillText(this.player.score, W/2 - 55, 52);
    ctx.fillStyle = this.p2Color;
    ctx.fillText(this.ai.score, W/2 + 55, 52);

    // Labels
    ctx.font = '11px Segoe UI';
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillText('YOU', W/2 - 55, 68);
    ctx.fillText('CPU', W/2 + 55, 68);

    // Player paddle
    ctx.shadowColor = this.p1Color; ctx.shadowBlur = 12;
    ctx.fillStyle   = this.p1Color;
    ctx.beginPath(); ctx.roundRect(this.player.x, this.player.y, this.paddleW, this.paddleH, 4); ctx.fill();
    ctx.shadowBlur  = 0;

    // AI paddle
    ctx.shadowColor = this.p2Color; ctx.shadowBlur = 12;
    ctx.fillStyle   = this.p2Color;
    ctx.beginPath(); ctx.roundRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH, 4); ctx.fill();
    ctx.shadowBlur  = 0;

    // Ball
    ctx.shadowColor = this.ballColor; ctx.shadowBlur = 18;
    ctx.fillStyle   = this.ballColor;
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ballR, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur  = 0;

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText('W/S or ↑↓ to move', 10, H - 8);

    if (!this.alive) {
      const won = this.player.score >= 5;
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0,0,W,H);
      ctx.textAlign = 'center';
      ctx.fillStyle = won ? '#3fb950' : '#f85149';
      ctx.font = 'bold 30px Segoe UI';
      ctx.fillText(won ? 'You Win! 🎉' : 'CPU Wins', W/2, H/2 - 18);
      ctx.fillStyle = '#8b949e'; ctx.font = '15px Segoe UI';
      ctx.fillText('Space / click to play again', W/2, H/2 + 18);
    }
  }

  handleKey(key, down) {
    if ((key === 'ArrowUp'   || key === 'w') && down) this.player.vy = -1;
    if ((key === 'ArrowDown' || key === 's') && down) this.player.vy =  1;
    if ((key === 'ArrowUp'   || key === 'w') && !down && this.player.vy < 0) this.player.vy = 0;
    if ((key === 'ArrowDown' || key === 's') && !down && this.player.vy > 0) this.player.vy = 0;
    if ((key === ' ' || key === 'Space') && down && !this.alive) this.reset();
  }

  clickOrSpace() { if (!this.alive) this.reset(); }

  destroy() { cancelAnimationFrame(this._raf); }
}
