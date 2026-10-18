// Smooth player movement for RETURN GRID's experiment stage.
"use strict";

(() => {
  const arena = document.querySelector("#game-arena");
  const player = document.querySelector("#player");
  const stageBlocks = document.querySelector("#stage-blocks");
  const projectileElement = document.querySelector("#projectile");
  const movementStatus = document.querySelector("#movement-status");

  if (!arena || !player || !stageBlocks || !projectileElement || !movementStatus) {
    console.error("RETURN GRID: required movement-stage elements were not found.");
    return;
  }

  const keysDown = new Set();
  const movementKeys = new Set([
    "w", "a", "s", "d",
    "arrowup", "arrowdown", "arrowleft", "arrowright"
  ]);

  const GRID_COLUMNS = 23;
  const GRID_ROWS = 11;
  const PLAYER_CELL_FRACTION = 0.85;
  const PLAYER_BASE_SIZE = 60;
  const playerRadius = { x: PLAYER_BASE_SIZE / 2, y: PLAYER_BASE_SIZE / 2 };
  const speed = 160; // CSS pixels per second.
  const PROJECTILE_SIZE = 40;
  const PROJECTILE_SPEED = 300;
  const PROJECTILE_RETURN_SPEED = 340;
  let projectileRangeCells = 3; // Future range-upgrade items can increase this value.
  let x = 0;
  let y = 0;
  let facingX = 0;
  let facingY = -1;
  let previousTime = 0;

  const projectile = {
    active: false,
    mode: "outbound",
    x: 0,
    y: 0,
    directionX: 0,
    directionY: -1,
    travelled: 0,
    maxDistance: 0,
    turnElapsed: 0,
    turnDuration: 0.22,
    turnStartX: 0,
    turnStartY: 0,
    turnPerpX: 0,
    turnPerpY: 0,
    turnRadius: 0
  };

  function fitPlayerToGrid() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const desiredSize = Math.min(cellWidth, cellHeight) * PLAYER_CELL_FRACTION;
    const scale = desiredSize / PLAYER_BASE_SIZE;
    player.style.setProperty("--player-scale", String(scale));
  }

  function bounds() {
    // Use the visual, scaled size rather than the unscaled CSS box.
    const rect = player.getBoundingClientRect();
    playerRadius.x = rect.width / 2;
    playerRadius.y = rect.height / 2;

    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    // Keep the player inside the walkable cells, not inside the hard-block ring.
    return {
      minX: cellWidth + playerRadius.x,
      maxX: Math.max(cellWidth + playerRadius.x, arena.clientWidth - cellWidth - playerRadius.x),
      minY: cellHeight + playerRadius.y,
      maxY: Math.max(cellHeight + playerRadius.y, arena.clientHeight - cellHeight - playerRadius.y)
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

  // Stage layout: 1 = hard block, 0 = walkable. The perimeter is always blocked.
  const STAGE_MAP = [
    "11111111111111111111111",
    "10101010101010101010101",
    "10000000000000000000001",
    "10101010101010101010101",
    "10000000000000000000001",
    "10101010101010101010101",
    "10000000000000000000001",
    "10101010101010101010101",
    "10000000000000000000001",
    "10101010101010101010101",
    "11111111111111111111111"
  ];
  const hardBlockCells = [];

  function buildHardBlocks() {
    const fragment = document.createDocumentFragment();
    hardBlockCells.length = 0;

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        if (STAGE_MAP[row][col] !== "1") continue;
        hardBlockCells.push({ row, col });

        const block = document.createElement("div");
        const variant = (row * 7 + col * 3 + row * col) % 4;
        block.className = "hard-block hard-block--" + variant;
        block.style.gridColumn = String(col + 1);
        block.style.gridRow = String(row + 1);
        fragment.appendChild(block);
      }
    }
    stageBlocks.replaceChildren(fragment);
  }

  function collidesWithHardBlock(centerX, centerY) {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const left = centerX - playerRadius.x;
    const right = centerX + playerRadius.x;
    const top = centerY - playerRadius.y;
    const bottom = centerY + playerRadius.y;

    return hardBlockCells.some(({ row, col }) => {
      const blockLeft = col * cellWidth;
      const blockRight = blockLeft + cellWidth;
      const blockTop = row * cellHeight;
      const blockBottom = blockTop + cellHeight;
      return right > blockLeft && left < blockRight &&
        bottom > blockTop && top < blockBottom;
    });
  }

  function movePlayer(dx, dy, delta) {
    const nextX = x + dx * speed * delta;
    const nextY = y + dy * speed * delta;

    // Resolve each axis separately so the player can slide along a wall.
    if (!collidesWithHardBlock(nextX, y)) x = nextX;
    if (!collidesWithHardBlock(x, nextY)) y = nextY;
    keepInsideArena();
  }

  function renderProjectile() {
    projectileElement.hidden = !projectile.active;
    if (!projectile.active) return;
    projectileElement.dataset.mode = projectile.mode;
    projectileElement.style.left = `${projectile.x}px`;
    projectileElement.style.top = `${projectile.y}px`;
  }

  function projectileBounds() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const padding = PROJECTILE_SIZE / 2 + 1;
    // The projectile may cross the metal perimeter, but stays visible within the arena.
    return {
      minX: padding,
      maxX: arena.clientWidth - padding,
      minY: padding,
      maxY: arena.clientHeight - padding,
      cellSize: Math.min(cellWidth, cellHeight)
    };
  }

  function beginTurnaround() {
    projectile.mode = "turn";
    projectile.turnElapsed = 0;
    projectile.turnStartX = projectile.x;
    projectile.turnStartY = projectile.y;

    // Turn toward the arena center to leave room for a small semicircular arc.
    let perpX = -projectile.directionY;
    let perpY = projectile.directionX;
    const centerX = arena.clientWidth / 2;
    const centerY = arena.clientHeight / 2;
    const towardCenter = perpX * (centerX - projectile.x) + perpY * (centerY - projectile.y);
    if (towardCenter < 0) {
      perpX *= -1;
      perpY *= -1;
    }

    const safe = projectileBounds();
    const roomX = perpX > 0 ? safe.maxX - projectile.x : perpX < 0 ? projectile.x - safe.minX : Infinity;
    const roomY = perpY > 0 ? safe.maxY - projectile.y : perpY < 0 ? projectile.y - safe.minY : Infinity;
    const room = Math.min(roomX, roomY);
    projectile.turnPerpX = perpX;
    projectile.turnPerpY = perpY;
    projectile.turnRadius = Math.min(safe.cellSize * 0.16, Math.max(0, room / 2));
  }

  function launchProjectile() {
    if (projectile.active) return;
    projectile.active = true;
    projectile.mode = "outbound";
    projectile.x = x;
    projectile.y = y;
    projectile.directionX = facingX;
    projectile.directionY = facingY;
    projectile.travelled = 0;

    const safe = projectileBounds();
    let availableDistance = 0;
    if (facingX < 0) availableDistance = projectile.x - safe.minX;
    else if (facingX > 0) availableDistance = safe.maxX - projectile.x;
    else if (facingY < 0) availableDistance = projectile.y - safe.minY;
    else availableDistance = safe.maxY - projectile.y;
    projectile.maxDistance = Math.max(0, Math.min(safe.cellSize * projectileRangeCells, availableDistance - 1));
    renderProjectile();
  }

  function updateProjectile(delta) {
    if (!projectile.active) return;

    if (projectile.mode === "outbound") {
      const remaining = projectile.maxDistance - projectile.travelled;
      const step = Math.min(PROJECTILE_SPEED * delta, Math.max(0, remaining));
      projectile.x += projectile.directionX * step;
      projectile.y += projectile.directionY * step;
      projectile.travelled += step;
      if (projectile.travelled >= projectile.maxDistance) beginTurnaround();
    } else if (projectile.mode === "turn") {
      projectile.turnElapsed = Math.min(projectile.turnElapsed + delta, projectile.turnDuration);
      const progress = projectile.turnElapsed / projectile.turnDuration;
      const angle = Math.PI * progress;
      const forwardArc = projectile.turnRadius * Math.sin(angle);
      const sideArc = projectile.turnRadius * (1 - Math.cos(angle));
      projectile.x = projectile.turnStartX + projectile.directionX * forwardArc + projectile.turnPerpX * sideArc;
      projectile.y = projectile.turnStartY + projectile.directionY * forwardArc + projectile.turnPerpY * sideArc;
      if (progress >= 1) projectile.mode = "return";
    } else {
      // Home toward the player only after the turn completes, avoiding an abrupt direction snap.
      const toPlayerX = x - projectile.x;
      const toPlayerY = y - projectile.y;
      const distance = Math.hypot(toPlayerX, toPlayerY);
      const step = PROJECTILE_RETURN_SPEED * delta;
      if (distance <= Math.max(step, PROJECTILE_SIZE * 0.55)) {
        projectile.active = false;
      } else {
        projectile.x += (toPlayerX / distance) * step;
        projectile.y += (toPlayerY / distance) * step;
      }
    }

    renderProjectile();
  }

  function onKeyDown(event) {
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      if (!event.repeat) launchProjectile();
      return;
    }

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
      // The 23 x 11 board uses a straight coordinate grid.
      // One axis moves at a time, so a side wall cannot block vertical travel.
      facingX = dx;
      facingY = dy;
      movePlayer(dx, dy, delta);

      player.classList.add("is-moving");
      player.classList.toggle("moving-left", dx < 0);
      player.classList.toggle("moving-right", dx > 0);
      player.classList.toggle("moving-up", dy < 0);
      player.classList.toggle("moving-down", dy > 0);
      player.style.setProperty("--trail-x", `${-dx * 8}px`);
      player.style.setProperty("--trail-y", `${-dy * 8}px`);
      movementStatus.textContent = "MOVING";
    } else {
      player.classList.remove("is-moving", "moving-left", "moving-right", "moving-up", "moving-down");
      player.style.setProperty("--trail-x", "0px");
      player.style.setProperty("--trail-y", "0px");
      movementStatus.textContent = "STANDBY";
    }

    updateProjectile(delta);
    renderPlayer();
    window.requestAnimationFrame(frame);
  }

  buildHardBlocks();
  fitPlayerToGrid();

  // Start in a walkable cell on the bottom interior row (column 10, zero-based).
  const cellWidth = arena.clientWidth / GRID_COLUMNS;
  const cellHeight = arena.clientHeight / GRID_ROWS;
  x = cellWidth * 9.5;
  y = arena.clientHeight - cellHeight * 1.5;
  keepInsideArena();
  renderPlayer();
  renderProjectile();

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
