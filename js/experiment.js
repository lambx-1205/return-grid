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

  const GRID_COLUMNS = 24;
  const GRID_ROWS = 12;
  const PLAYER_CELL_FRACTION = 1.0;
  const PLAYER_BASE_SIZE = 60;
  const playerRadius = { x: PLAYER_BASE_SIZE / 2, y: PLAYER_BASE_SIZE / 2 };
  const speed = 160; // CSS pixels per second; slower for one-screen stages.
  let x = 0;
  let y = 0;
  let previousTime = 0;

  function fitPlayerToGrid() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const desiredSize = Math.min(cellWidth, cellHeight) * PLAYER_CELL_FRACTION;
    const scale = Math.max(0.3, Math.min(1, desiredSize / PLAYER_BASE_SIZE));
    player.style.setProperty("--player-scale", String(scale));
  }

  function bounds() {
    // Use the visual, scaled size rather than the unscaled CSS box.
    const rect = player.getBoundingClientRect();
    playerRadius.x = rect.width / 2;
    playerRadius.y = rect.height / 2;

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
      // The 20 x 10 board uses a straight coordinate grid.
      // One axis moves at a time, so a side wall cannot block vertical travel.
      x += dx * speed * delta;
      y += dy * speed * delta;
      keepInsideArena();

      player.classList.add("is-moving");
      movementStatus.textContent = "MOVING";
    } else {
      player.classList.remove("is-moving");
      movementStatus.textContent = "STANDBY";
    }

    renderPlayer();
    window.requestAnimationFrame(frame);
  }

  // Keep the mech at a consistent fraction of one grid cell.
  fitPlayerToGrid();

  // Start near the center; recalculate bounds when the window changes size.
  x = arena.clientWidth / 2;
  y = arena.clientHeight / 2;
  keepInsideArena();
  renderPlayer();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("resize", () => {
    fitPlayerToGrid();
    keepInsideArena();
    renderPlayer();
  });

  window.requestAnimationFrame(frame);
})();
