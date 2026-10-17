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
  const speed = 300; // CSS pixels per second
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

    if (keysDown.has("a") || keysDown.has("arrowleft")) dx -= 1;
    if (keysDown.has("d") || keysDown.has("arrowright")) dx += 1;
    if (keysDown.has("w") || keysDown.has("arrowup")) dy -= 1;
    if (keysDown.has("s") || keysDown.has("arrowdown")) dy += 1;

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      // Normalize diagonal movement so it is not faster than horizontal movement.
      const magnitude = Math.hypot(dx, dy);
      dx /= magnitude;
      dy /= magnitude;

      x += dx * speed * delta;
      y += dy * speed * delta;
      keepInsideArena();

      player.style.setProperty("--look-x", `${dx * 3}px`);
      player.style.setProperty("--look-y", `${dy * 3}px`);
      player.classList.add("is-moving");
      movementStatus.textContent = "MOVING";
    } else {
      player.classList.remove("is-moving");
      movementStatus.textContent = "STANDBY";
    }

    renderPlayer();
    window.requestAnimationFrame(frame);
  }

  // Start near the center; recalculate bounds when the window changes size.
  x = arena.clientWidth / 2;
  y = arena.clientHeight / 2;
  keepInsideArena();
  renderPlayer();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("resize", () => {
    keepInsideArena();
    renderPlayer();
  });

  window.requestAnimationFrame(frame);
})();
