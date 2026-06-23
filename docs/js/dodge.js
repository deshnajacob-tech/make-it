export class DodgeGame {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.player = { x: this.width / 2, y: this.height - 40, w: 30, h: 14 };
    this.speed = opts.speed || 4.5;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnRate = 900;
    this.score = 0;
    this.alive = true;
    this.last = null;
    this.onGameOver = null;
    this._raf = null;
    this._dx = 0;
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.alive = true;
    this.player.x = this.width / 2;
    this.last = null;
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._loop.bind(this));
  }

  _spawn() {
    const size = Math.random() * 24 + 18;
    const x = Math.random() * (this.width - size - 24) + 12;
    this.obstacles.push({ x, y: -size, w: size, h: size, speed: Math.random() * 1.2 + 1.8 });
  }

  _update(dt) {
    if (!this.alive) return;
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer > this.spawnRate) {
      this.spawnTimer = 0;
      this.spawnRate = Math.max(400, this.spawnRate - 15);
      this._spawn();
    }

    this.player.x += this._dx * this.speed;
    this.player.x = Math.max(12, Math.min(this.width - this.player.w - 12, this.player.x));

    this.obstacles.forEach(obs => {
      obs.y += obs.speed * dt * 120;
    });

    this.obstacles = this.obstacles.filter(obs => {
      if (obs.y > this.height + obs.h) {
        this.score += 5;
        return false;
      }
      return true;
    });

    if (this.obstacles.some(obs => this._collides(obs, this.player))) {
      this.alive = false;
      if (this.onGameOver) this.onGameOver(this.score);
    }
  }

  _collides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  _draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050812';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

    ctx.fillStyle = '#f85149';
    this.obstacles.forEach(obs => {
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
      ctx.fill();
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 12, 20);

    if (!this.alive) {
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px Segoe UI';
      ctx.fillText('Game Over', this.width / 2, this.height / 2 - 10);
      ctx.font = '14px Segoe UI';
      ctx.fillText('Click or press Space to retry', this.width / 2, this.height / 2 + 18);
    }
  }

  _loop(ts) {
    if (!this.last) this.last = ts;
    const dt = Math.min(0.033, (ts - this.last) / 1000);
    this.last = ts;
    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(this._loop.bind(this));
  }

  handleKey(key, isDown) {
    const left = key === 'ArrowLeft' || key === 'a';
    const right = key === 'ArrowRight' || key === 'd';
    if (!isDown) {
      if ((key === 'ArrowLeft' || key === 'a') && this._dx < 0) this._dx = 0;
      if ((key === 'ArrowRight' || key === 'd') && this._dx > 0) this._dx = 0;
      return;
    }
    if (!this.alive && key === ' ') { this.reset(); return; }
    if (left) this._dx = -1;
    if (right) this._dx = 1;
  }

  clickOrSpace() {
    if (!this.alive) this.reset();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
  }
}
