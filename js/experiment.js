// Smooth player movement for RETURN GRID's experiment stage.
"use strict";

(() => {
  const arena = document.querySelector("#game-arena");
  const player = document.querySelector("#player");
  const movementStatus = document.querySelector("#movement-status");

  if (!arena || !player || !movementStatus) {
    console.error("RETURN GRID: required movement-stage elements were not found.");
    return;
  }

  const keysDown = new Set();
  const movementKeys = new Set([
    "w", "a", "s", "d",
    "arrowup", "arrowdown", "arrowleft", "arrowright"
  ]);

  const playerRadius = { x: player.offsetWidth / 2, y: player.offsetHeight / 2 };
  const speed = 160; // CSS pixels per second; slower for one-screen stages.
  let gridSkew = 0;

  function readGridSkew() {
    const degrees = Number.parseFloat(
      window.getComputedStyle(arena).getPropertyValue("--grid-skew")
    );
    gridSkew = Math.tan((Number.isFinite(degrees) ? degrees : 0) * Math.PI / 180);
  }
  let x = 0;
  let y = 0;
  let previousTime = 0;

  function bounds() {
    playerRadius.x = player.offsetWidth / 2;
    playerRadius.y = player.offsetHeight / 2;

    return {
      minX: playerRadius.x,
      maxX: Math.max(playerRadius.x, arena.clientWidth - playerRadius.x),
      minY: playerRadius.y,
      maxY: Math.max(playerRadius.y, arena.clientHeight - playerRadius.y)
    };
  }

  function keepInsideArena() {
    const limit = bounds();
    x = Math.min(limit.maxX, Math.max(limit.minX, x));
    y = Math.min(limit.maxY, Math.max(limit.minY, y));
  }

  function renderPlayer() {
    player.style.left = `${x}px`;
    player.style.top = `${y}px`;
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (!movementKeys.has(key)) return;

    event.preventDefault();

    // The most recently pressed direction wins. Repeats do not change priority.
    if (!event.repeat) keysDown.delete(key);
    keysDown.add(key);
  }

  function onKeyUp(event) {
    keysDown.delete(event.key.toLowerCase());
  }

  function clearKeys() {
    keysDown.clear();
  }

  function frame(time) {
    if (!previousTime) previousTime = time;
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    let dx = 0;
    let dy = 0;

    // Only one direction is active at a time; the latest key press takes priority.
    const activeKey = Array.from(keysDown).pop();
    switch (activeKey) {
      case "a":
      case "arrowleft":
        dx = -1;
        break;
      case "d":
      case "arrowright":
        dx = 1;
        break;
      case "w":
      case "arrowup":
        dy = -1;
        break;
      case "s":
      case "arrowdown":
        dy = 1;
        break;
    }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      // Match the CSS grid's shared skew angle.
      const projectedX = dx + dy * gridSkew;
      const magnitude = Math.hypot(projectedX, dy);
      const moveX = projectedX / magnitude;
      const moveY = dy / magnitude;

      // Move along the full vector until the first arena boundary is reached.
      // Do not clamp only Y: that would leave the skew's horizontal component
      // active and make the player drift sideways while held against an edge.
      const limit = bounds();
      const stepX = moveX * speed * delta;
      const stepY = moveY * speed * delta;
      let travel = 1;

      if (stepX < 0 && x + stepX < limit.minX) {
        travel = Math.min(travel, (limit.minX - x) / stepX);
      } else if (stepX > 0 && x + stepX > limit.maxX) {
        travel = Math.min(travel, (limit.maxX - x) / stepX);
      }

      if (stepY < 0 && y + stepY < limit.minY) {
        travel = Math.min(travel, (limit.minY - y) / stepY);
      } else if (stepY > 0 && y + stepY > limit.maxY) {
        travel = Math.min(travel, (limit.maxY - y) / stepY);
      }

      x += stepX * travel;
      y += stepY * travel;
      keepInsideArena();

      player.style.setProperty("--look-x", `${moveX * 3}px`);
      player.style.setProperty("--look-y", `${moveY * 3}px`);
      player.classList.add("is-moving");
      movementStatus.textContent = "MOVING";
    } else {
      player.classList.remove("is-moving");
      movementStatus.textContent = "STANDBY";
    }

    renderPlayer();
    window.requestAnimationFrame(frame);
  }

  // Read the CSS skew once at startup and again after viewport changes.
  readGridSkew();

  // Start near the center; recalculate bounds when the window changes size.
  x = arena.clientWidth / 2;
  y = arena.clientHeight / 2;
  keepInsideArena();
  renderPlayer();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("resize", () => {
    readGridSkew();
    keepInsideArena();
    renderPlayer();
  });

  window.requestAnimationFrame(frame);
})();
