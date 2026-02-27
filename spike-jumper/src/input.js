// ============================================================
// INPUT — keyboard and touch handling
// ============================================================

export class Input {
  constructor() {
    this._keys      = new Set();
    this._justDown  = new Set();
    this._justUp    = new Set();

    window.addEventListener('keydown', e => {
      if (!this._keys.has(e.code)) this._justDown.add(e.code);
      this._keys.add(e.code);
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this._keys.delete(e.code);
      this._justUp.add(e.code);
    });

    // Touch support
    window.addEventListener('touchstart', e => {
      const t = e.touches[0];
      const midX = window.innerWidth / 2;
      if (t.clientY > window.innerHeight * 0.7) {
        // bottom half → slide
        if (!this._keys.has('ArrowDown')) this._justDown.add('ArrowDown');
        this._keys.add('ArrowDown');
      } else {
        if (!this._keys.has('Space')) this._justDown.add('Space');
        this._keys.add('Space');
      }
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', e => {
      this._keys.delete('Space');
      this._keys.delete('ArrowDown');
    });
  }

  /** Call once per frame after processing to clear transient state */
  flush() {
    this._justDown.clear();
    this._justUp.clear();
  }

  isDown(code)    { return this._keys.has(code); }
  isJustDown(code){ return this._justDown.has(code); }
  isJustUp(code)  { return this._justUp.has(code); }

  isJump()    { return this.isJustDown('Space') || this.isJustDown('ArrowUp') || this.isJustDown('KeyW'); }
  isSlide()   { return this.isDown('ArrowDown') || this.isDown('KeyS'); }
  isConfirm() { return this.isJustDown('Enter') || this.isJustDown('Space'); }
  isBack()    { return this.isJustDown('Escape'); }
  isUp()      { return this.isJustDown('ArrowUp')   || this.isJustDown('KeyW'); }
  isDown2()   { return this.isJustDown('ArrowDown') || this.isJustDown('KeyS'); }
  isSkip()    { return this.isJustDown('KeyN') || this.isJustDown('Tab'); }
}
