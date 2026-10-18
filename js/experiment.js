// Smooth player movement for RETURN GRID's experiment stage.
"use strict";

(() => {
  const arena = document.querySelector("#game-arena");
  const player = document.querySelector("#player");
  const enemyDrone = document.querySelector("#enemy-drone");
  const stageBlocks = document.querySelector("#stage-blocks");
  const scoreCount = document.querySelector("#score-count");
  const projectileElement = document.querySelector("#projectile");
  const movementStatus = document.querySelector("#movement-status");
  const attackCooldown = document.querySelector("#attack-cooldown");
  const attackCooldownRing = document.querySelector("#attack-cooldown-ring");
  const attackCooldownValue = document.querySelector("#attack-cooldown-value");
  const lifeCount = document.querySelector("#life-count");
  const lifeIcons = document.querySelector("#life-icons");
  const respawnOverlay = document.querySelector("#respawn-overlay");
  const respawnCountdown = document.querySelector("#respawn-countdown");
  const restartButton = document.querySelector("#restart-button");
  const gameoverOverlay = document.querySelector("#gameover-overlay");
  const gameoverRestart = document.querySelector("#gameover-restart");
  const stageSetup = document.querySelector("#stage-setup");
  const gameplayView = document.querySelector("#gameplay-view");
  const stageTitle = document.querySelector("#stage-title");
  const stageBadge = document.querySelector("#stage-badge");
  const enemyCountControls = {
    drone: { value: document.querySelector("#enemy-count-value"), decrease: document.querySelector("#enemy-count-decrease"), increase: document.querySelector("#enemy-count-increase") },
    tank: { value: document.querySelector("#enemy-tank-count-value"), decrease: document.querySelector("#enemy-tank-count-decrease"), increase: document.querySelector("#enemy-tank-count-increase") },
    scout: { value: document.querySelector("#enemy-scout-count-value"), decrease: document.querySelector("#enemy-scout-count-decrease"), increase: document.querySelector("#enemy-scout-count-increase") },
    hunter: { value: document.querySelector("#enemy-hunter-count-value"), decrease: document.querySelector("#enemy-hunter-count-decrease"), increase: document.querySelector("#enemy-hunter-count-increase") },
    feint: { value: document.querySelector("#enemy-feint-count-value"), decrease: document.querySelector("#enemy-feint-count-decrease"), increase: document.querySelector("#enemy-feint-count-increase") },
    photon: { value: document.querySelector("#enemy-photon-count-value"), decrease: document.querySelector("#enemy-photon-count-decrease"), increase: document.querySelector("#enemy-photon-count-increase") },
    reaper: { value: document.querySelector("#enemy-reaper-count-value"), decrease: document.querySelector("#enemy-reaper-count-decrease"), increase: document.querySelector("#enemy-reaper-count-increase") },
    dash: { value: document.querySelector("#enemy-dash-count-value"), decrease: document.querySelector("#enemy-dash-count-decrease"), increase: document.querySelector("#enemy-dash-count-increase") },
    zigzag: { value: document.querySelector("#enemy-zigzag-count-value"), decrease: document.querySelector("#enemy-zigzag-count-decrease"), increase: document.querySelector("#enemy-zigzag-count-increase") },
    fade: { value: document.querySelector("#enemy-fade-count-value"), decrease: document.querySelector("#enemy-fade-count-decrease"), increase: document.querySelector("#enemy-fade-count-increase") }
  };
  const gameStartButton = document.querySelector("#game-start-button");

  if (!arena || !player || !enemyDrone || !stageBlocks || !projectileElement || !movementStatus ||
      !attackCooldown || !attackCooldownRing || !attackCooldownValue ||
      !lifeCount || !lifeIcons || !scoreCount || !respawnOverlay || !respawnCountdown ||
      !restartButton || !gameoverOverlay || !gameoverRestart || !stageSetup || !gameplayView ||
      !stageTitle || !stageBadge ||
      Object.values(enemyCountControls).some(control => !control.value || !control.decrease || !control.increase) ||
      !gameStartButton) {
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
  const ENEMY_BASE_SIZE = 42;
  const ENEMY_SPEED = 72; // Speed multiplier 1 is the current drone speed.
  const ENEMY_TYPES = {
    drone: { hp: 1, points: 100, speed: 1, turnChance: 0.40 },
    tank: { hp: 3, points: 250, speed: 0.55, turnChance: 1.00 },
    scout: { hp: 1, points: 200, speed: 2, turnChance: 0.65 },
    hunter: { hp: 2, points: 500, speed: 0.85, behavior: "chase", fallbackTurnChance: 0.40 },
    feint: { hp: 2, points: 600, speed: 1.20, behavior: "flee", fallbackTurnChance: 0.40 },
    photon: { hp: 2, points: 1000, speed: 4, turnChance: 0.10 },
    reaper: { hp: 5, points: 1600, speed: 0.9, turnChance: 0.50, behavior: "reaper" },
    dash: { hp: 2, points: 500, speed: 1, turnChance: 0.30, behavior: "dash", alertSpeed: 2.5 },
    zigzag: { hp: 1, points: 400, speed: 2.65, turnChance: 0.50, behavior: "zigzag", ignoresSoftBlocks: true },
    fade: { hp: 4, points: 1200, speed: 1.35, turnChance: 0.35, behavior: "fade" }
  };
  const configuredEnemyCounts = { drone: 3, tank: 0, scout: 0, hunter: 0, feint: 0, photon: 0, reaper: 0, dash: 0, zigzag: 0, fade: 0 };
  const MAX_TOTAL_ENEMIES = 20;
  const ENEMY_COUNT_LIMITS = {
    drone: { min: 0, max: 8 }, tank: { min: 0, max: 8 }, scout: { min: 0, max: 8 },
    hunter: { min: 0, max: 8 }, feint: { min: 0, max: 8 }, photon: { min: 0, max: 8 },
    reaper: { min: 0, max: 8 }, dash: { min: 0, max: 8 }, zigzag: { min: 0, max: 8 }, fade: { min: 0, max: 8 }
  };
  let gameStarted = false;
  const enemyUnits = [];
  const softBlockCells = new Map();
  let score = 0;
  const PROJECTILE_SIZE = 40;
  const PROJECTILE_SPEED = 300;
  const PROJECTILE_RETURN_SPEED = 340;
  const SOFT_BLOCK_HIT_POINTS = 2;
  const ATTACK_COOLDOWN_MS = 1500;
  let attackCooldownEndsAt = 0;
  let projectileRangeCells = 3; // Boomerang range is measured in grid cells.
  let x = 0;
  let y = 0;
  let facingX = 0;
  let facingY = -1;
  let previousTime = 0;
  const INITIAL_LIVES = 5;
  const RESPAWN_DELAY_MS = 3000;
  const RESPAWN_INVINCIBILITY_MS = 3000;
  const START_INVINCIBILITY_MS = 5000;
  let lives = INITIAL_LIVES;
  let gameState = "configuring";
  let respawnEndsAt = 0;
  let invincibleUntil = 0;

  const enemyProjectiles = [];
  const REAPER_FIRE_INTERVAL_MS = 3600;
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
    playerRadius.x = desiredSize / 2;
    playerRadius.y = desiredSize / 2;
    player.style.setProperty("--player-scale", String(scale));
  }

  function fitEnemyToGrid() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const desiredSize = Math.min(cellWidth, cellHeight) * 0.72;
    for (const unit of enemyUnits) {
      unit.radius = desiredSize / 2;
      unit.element.style.setProperty("--drone-scale", String(desiredSize / ENEMY_BASE_SIZE));
    }
  }

  function cellKey(row, col) {
    return `${row},${col}`;
  }

  function isWalkableCell(row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLUMNS &&
      STAGE_MAP[row][col] === "0" && !softBlockCells.has(cellKey(row, col));
  }

  function canEnemyEnterCell(unit, row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLUMNS &&
      STAGE_MAP[row][col] === "0" && (unit.type.ignoresSoftBlocks || !softBlockCells.has(cellKey(row, col)));
  }

  const ENEMY_DIRECTIONS = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 }
  ];

  function createEnemyUnits() {
    enemyUnits.length = 0;
    arena.querySelectorAll(".enemy-drone").forEach(element => {
      if (element !== enemyDrone) element.remove();
    });
    let prototypeClaimed = false;
    let unitIndex = 0;
    for (const typeKey of Object.keys(ENEMY_TYPES)) {
      for (let instance = 0; instance < configuredEnemyCounts[typeKey]; instance += 1) {
        let element;
        if (typeKey === "drone" && !prototypeClaimed) {
          element = enemyDrone;
          prototypeClaimed = true;
        } else {
          element = enemyDrone.cloneNode(true);
          element.id = "enemy-" + typeKey + "-" + (instance + 1);
          arena.appendChild(element);
        }
        element.classList.remove(
          "enemy-tank", "enemy-scout", "enemy-hunter", "enemy-feint", "enemy-photon",
          "enemy-reaper", "enemy-dash", "enemy-zigzag", "enemy-fade",
          "is-exploding", "tank-hp-3", "tank-hp-2", "tank-hp-1"
        );
        if (typeKey !== "drone") element.classList.add("enemy-" + typeKey);
        element.hidden = false;
        element.setAttribute("aria-hidden", "false");
        element.setAttribute("aria-label", "敵キャラクター。" + typeKey.toUpperCase());
        element.dataset.enemyType = typeKey;
        const type = ENEMY_TYPES[typeKey];
        const unit = {
          element, type, typeKey, hp: type.hp, alive: true, x: 0, y: 0, row: 1, col: 1,
          directionX: unitIndex % 2 === 0 ? 1 : -1, directionY: 0,
          points: type.points, speed: type.speed,
          nextShotAt: performance.now() + 1800 + Math.random() * 1800,
          alerting: false
        };
        element.addEventListener("animationend", event => {
          if (event.animationName === "enemy-drone-explode" && !unit.alive) element.hidden = true;
        });
        enemyUnits.push(unit);
        unitIndex += 1;
      }
    }
    if (!prototypeClaimed) enemyDrone.hidden = true;
  }

  function randomWalkableCell(occupied, minimumDistance = 0) {
    const candidates = [];
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLUMNS - 1; col += 1) {
        if (!isWalkableCell(row, col)) continue;
        if (occupied.some(cell => Math.abs(cell.row - row) + Math.abs(cell.col - col) < minimumDistance)) continue;
        candidates.push({ row, col });
      }
    }
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];

    // If a large deployment makes the preferred spacing impossible, choose an
    // unoccupied walkable cell with the greatest distance from existing units.
    const fallback = [];
    let greatestNearestDistance = -1;
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLUMNS - 1; col += 1) {
        if (!isWalkableCell(row, col)) continue;
        if (occupied.some(cell => cell.row === row && cell.col === col)) continue;
        const nearestDistance = occupied.length
          ? Math.min(...occupied.map(cell => Math.abs(cell.row - row) + Math.abs(cell.col - col)))
          : GRID_ROWS + GRID_COLUMNS;
        if (nearestDistance > greatestNearestDistance) {
          greatestNearestDistance = nearestDistance;
          fallback.length = 0;
          fallback.push({ row, col });
        } else if (nearestDistance === greatestNearestDistance) {
          fallback.push({ row, col });
        }
      }
    }
    return fallback[Math.floor(Math.random() * fallback.length)] || { row: 1, col: 1 };
  }

  function placeEnemyAtStart() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const playerStart = { row: 1, col: 1 };
    const occupied = [playerStart];
    for (const unit of enemyUnits) {
      const cell = randomWalkableCell(occupied, 6);
      occupied.push(cell);
      unit.alive = true;
      unit.hp = unit.type.hp;
      unit.nextShotAt = performance.now() + 1800 + Math.random() * 1800;
      unit.alerting = false;
      unit.element.hidden = false;
      unit.element.setAttribute("aria-hidden", "false");
      unit.element.classList.remove("is-exploding");
      renderEnemyAppearance(unit);
      unit.row = cell.row;
      unit.col = cell.col;
      unit.x = (cell.col + 0.5) * cellWidth;
      unit.y = (cell.row + 0.5) * cellHeight;
      const directions = ENEMY_DIRECTIONS.filter(direction =>
        canEnemyEnterCell(unit, unit.row + direction.y, unit.col + direction.x)
      );
      const chosen = directions[Math.floor(Math.random() * directions.length)] || { x: 1, y: 0 };
      unit.directionX = chosen.x;
      unit.directionY = chosen.y;
      renderEnemy(unit);
    }
  }

  function renderEnemy(unit) {
    unit.element.style.left = `${unit.x}px`;
    unit.element.style.top = `${unit.y}px`;
  }

  function renderEnemyAppearance(unit) {
    unit.element.classList.remove("tank-hp-3", "tank-hp-2", "tank-hp-1");
    if (unit.typeKey === "tank") {
      unit.element.classList.add("tank-hp-" + Math.max(1, unit.hp));
      unit.element.dataset.hp = String(unit.hp);
    }
  }

  function chooseEnemyDirectionAtWall(unit) {
    const sideOptions = ENEMY_DIRECTIONS.filter(direction =>
      direction.x * unit.directionX + direction.y * unit.directionY === 0 &&
      canEnemyEnterCell(unit, unit.row + direction.y, unit.col + direction.x)
    );
    const turnChance = unit.type.turnChance ?? unit.type.fallbackTurnChance ?? 0.40;
    if (sideOptions.length > 0 && Math.random() < turnChance) {
      const chosen = sideOptions[Math.floor(Math.random() * sideOptions.length)];
      unit.directionX = chosen.x;
      unit.directionY = chosen.y;
    } else {
      unit.directionX *= -1;
      unit.directionY *= -1;
    }
  }

  function getPlayerGridCell(cellWidth, cellHeight) {
    const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / cellHeight)));
    const col = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(x / cellWidth)));
    if (isWalkableCell(row, col)) return { row, col };

    // Collision normally keeps the player on floor cells; recover gracefully at boundaries.
    let nearest = null;
    let nearestDistance = Infinity;
    for (let candidateRow = 1; candidateRow < GRID_ROWS - 1; candidateRow += 1) {
      for (let candidateCol = 1; candidateCol < GRID_COLUMNS - 1; candidateCol += 1) {
        if (!isWalkableCell(candidateRow, candidateCol)) continue;
        const distance = Math.abs(candidateRow - row) + Math.abs(candidateCol - col);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { row: candidateRow, col: candidateCol };
        }
      }
    }
    return nearest;
  }

  function getReachableCellDistances(startRow, startCol) {
    const distances = new Map();
    if (!isWalkableCell(startRow, startCol)) return distances;

    distances.set(cellKey(startRow, startCol), 0);
    const queue = [{ row: startRow, col: startCol }];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const nextDistance = distances.get(cellKey(current.row, current.col)) + 1;
      for (const direction of ENEMY_DIRECTIONS) {
        const row = current.row + direction.y;
        const col = current.col + direction.x;
        const key = cellKey(row, col);
        if (!isWalkableCell(row, col) || distances.has(key)) continue;
        distances.set(key, nextDistance);
        queue.push({ row, col });
      }
    }
    return distances;
  }

  function chooseStrategicDirection(unit, cellWidth, cellHeight) {
    if (unit.type.behavior !== "chase" && unit.type.behavior !== "flee") return null;

    const playerCell = getPlayerGridCell(cellWidth, cellHeight);
    if (!playerCell) return null;
    const distances = getReachableCellDistances(playerCell.row, playerCell.col);
    const currentDistance = distances.get(cellKey(unit.row, unit.col));

    // If walls or destructible blocks separate the unit from the player, keep patrolling.
    if (currentDistance === undefined) return null;

    const options = ENEMY_DIRECTIONS
      .map(direction => ({
        direction,
        row: unit.row + direction.y,
        col: unit.col + direction.x
      }))
      .filter(candidate =>
        isWalkableCell(candidate.row, candidate.col) &&
        distances.has(cellKey(candidate.row, candidate.col))
      )
      .map(candidate => ({
        direction: candidate.direction,
        distance: distances.get(cellKey(candidate.row, candidate.col))
      }));

    if (!options.length) return null;
    const bestDistance = unit.type.behavior === "chase"
      ? Math.min(...options.map(option => option.distance))
      : Math.max(...options.map(option => option.distance));
    const bestOptions = options.filter(option => option.distance === bestDistance);
    return bestOptions[Math.floor(Math.random() * bestOptions.length)].direction;
  }

  function isDashLineClear(unit, playerCell) {
    if (unit.row !== playerCell.row && unit.col !== playerCell.col) return false;
    const dr = Math.sign(playerCell.row - unit.row), dc = Math.sign(playerCell.col - unit.col);
    let row = unit.row + dr, col = unit.col + dc;
    while (row !== playerCell.row || col !== playerCell.col) {
      if (STAGE_MAP[row]?.[col] !== "0" || softBlockCells.has(cellKey(row, col))) return false;
      row += dr; col += dc;
    }
    return true;
  }

  function updateEnemy(unit, delta, time = performance.now()) {
    if (!unit.alive) return;
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const playerCell = getPlayerGridCell(cellWidth, cellHeight);
    unit.alerting = unit.type.behavior === "dash" && playerCell && isDashLineClear(unit, playerCell);
    let remaining = ENEMY_SPEED * (unit.alerting ? unit.type.alertSpeed : unit.speed) * delta;
    if (unit.type.behavior === "reaper" && time >= unit.nextShotAt) {
      launchEnemyBoomerang(unit);
      unit.nextShotAt = time + REAPER_FIRE_INTERVAL_MS + Math.random() * 900;
    }
    let guard = 0;
    while (remaining > 0 && guard < 8) {
      const centerX = (unit.col + 0.5) * cellWidth;
      const centerY = (unit.row + 0.5) * cellHeight;
      const atCellCenter = Math.abs(unit.x - centerX) < 0.01 && Math.abs(unit.y - centerY) < 0.01;
      if (atCellCenter && unit.type.behavior === "zigzag") {
        const exits = ENEMY_DIRECTIONS.filter(d => canEnemyEnterCell(unit, unit.row + d.y, unit.col + d.x));
        if (exits.length >= 3 && Math.random() < unit.type.turnChance) {
          const options = exits.filter(d => d.x !== unit.directionX || d.y !== unit.directionY);
          if (options.length) { const chosen = options[Math.floor(Math.random() * options.length)]; unit.directionX = chosen.x; unit.directionY = chosen.y; }
        }
      } else if (atCellCenter && unit.type.behavior) {
        const strategicDirection = chooseStrategicDirection(unit, cellWidth, cellHeight);
        if (strategicDirection) { unit.directionX = strategicDirection.x; unit.directionY = strategicDirection.y; }
      }
      let nextRow = unit.row + unit.directionY;
      let nextCol = unit.col + unit.directionX;
      if (!canEnemyEnterCell(unit, nextRow, nextCol)) {
        chooseEnemyDirectionAtWall(unit);
        nextRow = unit.row + unit.directionY;
        nextCol = unit.col + unit.directionX;
      }
      if (!canEnemyEnterCell(unit, nextRow, nextCol)) break;
      const targetX = (nextCol + 0.5) * cellWidth;
      const targetY = (nextRow + 0.5) * cellHeight;
      const offsetX = targetX - unit.x;
      const offsetY = targetY - unit.y;
      const distance = Math.hypot(offsetX, offsetY);
      if (distance < 0.001) {
        unit.col = nextCol;
        unit.row = nextRow;
        guard += 1;
        continue;
      }
      const step = Math.min(remaining, distance);
      unit.x += (offsetX / distance) * step;
      unit.y += (offsetY / distance) * step;
      remaining -= step;
      if (step >= distance - 0.001) {
        unit.x = targetX;
        unit.y = targetY;
        unit.col = nextCol;
        unit.row = nextRow;
        guard += 1;
      } else {
        break;
      }
    }
    renderEnemy(unit);
  }

  function renderScore() {
    scoreCount.textContent = String(score);
  }

  function updateAttackCooldown(time) {
    const remainingMs = Math.max(0, attackCooldownEndsAt - time);
    const isCooling = remainingMs > 0;
    const remainingRatio = Math.min(1, remainingMs / ATTACK_COOLDOWN_MS);
    const angle = isCooling ? remainingRatio * 360 : 360;
    attackCooldownRing.style.setProperty("--cooldown-angle", `${angle}deg`);
    attackCooldown.classList.toggle("is-cooling", isCooling);
    attackCooldown.classList.toggle("is-ready", !isCooling);
    attackCooldownValue.textContent = isCooling ? (remainingMs / 1000).toFixed(1) : "GO";
    attackCooldown.setAttribute(
      "aria-label",
      isCooling ? `攻撃クールタイム残り ${(remainingMs / 1000).toFixed(1)} 秒` : "攻撃可能"
    );
  }

  function startAttackCooldown(time) {
    attackCooldownEndsAt = time + ATTACK_COOLDOWN_MS;
    updateAttackCooldown(time);
  }

  function collectEnemyPoints(unit) {
    score += unit.points;
    renderScore();
  }

  function leaveFadeTrail(unit) {
    const trail = unit.element.cloneNode(true);
    trail.removeAttribute("id"); trail.classList.add("enemy-fade-trail"); trail.classList.remove("is-exploding");
    trail.hidden = false; trail.setAttribute("aria-hidden", "true");
    trail.style.left = unit.x + "px"; trail.style.top = unit.y + "px"; arena.appendChild(trail);
    window.setTimeout(() => trail.remove(), 650);
  }

  function teleportFade(unit) {
    const options = [], cw = arena.clientWidth / GRID_COLUMNS, ch = arena.clientHeight / GRID_ROWS;
    for (let row = 1; row < GRID_ROWS - 1; row++) for (let col = 1; col < GRID_COLUMNS - 1; col++) {
      const md = Math.abs(row - unit.row) + Math.abs(col - unit.col);
      if (md < 2 || md > 6 || !isWalkableCell(row, col)) continue;
      if (Math.hypot((col + .5) * cw - x, (row + .5) * ch - y) < cw * 1.1) continue;
      options.push({row, col});
    }
    if (!options.length) return;
    leaveFadeTrail(unit);
    const cell = options[Math.floor(Math.random() * options.length)];
    unit.row = cell.row; unit.col = cell.col; unit.x = (cell.col + .5) * cw; unit.y = (cell.row + .5) * ch;
    renderEnemy(unit);
  }

  function launchEnemyBoomerang(unit) {
    const element = projectileElement.cloneNode(true);
    element.removeAttribute("id"); element.classList.add("enemy-projectile");
    element.hidden = false; element.setAttribute("aria-hidden", "true"); arena.appendChild(element);
    const dx = x - unit.x, dy = y - unit.y;
    const directionX = Math.abs(dx) >= Math.abs(dy) ? (Math.sign(dx) || unit.directionX) : 0;
    const directionY = directionX === 0 ? (Math.sign(dy) || unit.directionY) : 0;
    const cellSize = Math.min(arena.clientWidth / GRID_COLUMNS, arena.clientHeight / GRID_ROWS);
    enemyProjectiles.push({element, owner: unit, x: unit.x, y: unit.y, directionX, directionY, distance: 0, maxDistance: cellSize * 3, returning: false});
  }

  function updateEnemyBoomerangs(delta, time) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const shot = enemyProjectiles[i];
      if (!shot.owner.alive) { shot.element.remove(); enemyProjectiles.splice(i, 1); continue; }
      if (!shot.returning) {
        const step = 300 * delta;
        shot.x += shot.directionX * step; shot.y += shot.directionY * step; shot.distance += step;
        if (shot.distance >= shot.maxDistance) shot.returning = true;
      } else {
        const dx = shot.owner.x - shot.x, dy = shot.owner.y - shot.y, d = Math.hypot(dx, dy), step = 300 * delta;
        if (d <= step + 5) { shot.element.remove(); enemyProjectiles.splice(i, 1); continue; }
        shot.x += dx / d * step; shot.y += dy / d * step;
      }
      shot.element.style.left = shot.x + "px"; shot.element.style.top = shot.y + "px";
      if (gameState === "playing" && time >= invincibleUntil && Math.hypot(x - shot.x, y - shot.y) <= Math.min(playerRadius.x, playerRadius.y) * .62 + 17) {
        shot.element.remove(); enemyProjectiles.splice(i, 1); takePlayerHit(time);
      }
    }
  }

  function takePlayerHit(time) {
    if (gameState !== "playing" || time < invincibleUntil) return;
    clearKeys(); resetProjectile();
    if (lives <= 0) { gameState = "dying-gameover"; player.classList.add("is-dying"); return; }
    lives -= 1; renderLives(); gameState = "respawning"; respawnEndsAt = time + RESPAWN_DELAY_MS;
    respawnCountdown.textContent = "3"; respawnOverlay.hidden = false;
    movementStatus.textContent = "RESPAWNING"; player.classList.add("is-dying");
  }

  function bounds() {
    // Player radius is cached by fitPlayerToGrid(), avoiding per-frame layout reads.
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

  function renderLives() {
    lifeCount.textContent = String(lives);
    lifeIcons.textContent = Array.from({ length: INITIAL_LIVES }, (_, index) =>
      index < lives ? "●" : "○"
    ).join(" ");
  }

  function placePlayerAtStart() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    x = cellWidth * 1.5;
    y = cellHeight * 1.5;
    facingX = 0;
    facingY = -1;
    keepInsideArena();
    renderPlayer();
  }

  function resetProjectile() {
    projectile.active = false;
    projectile.mode = "outbound";
    projectile.travelled = 0;
    projectile.maxDistance = 0;
    projectile.turnElapsed = 0;
    renderProjectile();
  }

  function clearEnemyBoomerangs() {
    for (const shot of enemyProjectiles) shot.element.remove();
    enemyProjectiles.length = 0;
  }

  function restartGame() {
    clearKeys();
    clearEnemyBoomerangs();
    lives = INITIAL_LIVES;
    score = 0;
    renderScore();
    gameState = "playing";
    respawnEndsAt = 0;
    invincibleUntil = performance.now() + START_INVINCIBILITY_MS;
    attackCooldownEndsAt = 0;
    updateAttackCooldown(performance.now());
    respawnOverlay.hidden = true;
    player.classList.remove("is-dying", "is-respawning", "is-invincible", "is-moving", "moving-left", "moving-right", "moving-up", "moving-down");
    player.classList.add("is-invincible");
    player.style.setProperty("--trail-x", "0px");
    player.style.setProperty("--trail-y", "0px");
    gameoverOverlay.hidden = true;
    movementStatus.textContent = "STANDBY";
    renderLives();
    resetProjectile();
    generateSoftBlocks();
    placePlayerAtStart();
    placeEnemyAtStart();
  }

  function showGameOver() {
    gameState = "gameover";
    clearKeys();
    gameoverOverlay.hidden = false;
    movementStatus.textContent = "GAMEOVER";
  }

  function handlePlayerEnemyCollision(time) {
    if (gameState !== "playing" || time < invincibleUntil) return;
    const playerHitRadius = Math.min(playerRadius.x, playerRadius.y) * 0.62;
    for (const unit of enemyUnits) {
      if (!unit.alive) continue;
      if (Math.hypot(x - unit.x, y - unit.y) <= playerHitRadius + (unit.radius || ENEMY_BASE_SIZE / 2)) { takePlayerHit(time); return; }
    }
  }

  function updateRespawnCountdown(time) {
    const remainingMs = Math.max(0, respawnEndsAt - time);
    const secondsRemaining = Math.ceil(remainingMs / 1000);
    const displayValue = String(secondsRemaining);
    if (respawnCountdown.textContent !== displayValue) {
      respawnCountdown.textContent = displayValue;
    }

    if (remainingMs <= 0) {
      respawnOverlay.hidden = true;
      player.classList.remove("is-dying", "is-respawning");
      placePlayerAtStart();
      gameState = "playing";
      invincibleUntil = time + RESPAWN_INVINCIBILITY_MS;
      player.classList.add("is-invincible");
      movementStatus.textContent = "STANDBY";
    }
  }

  function updateInvincibility(time) {
    if (invincibleUntil > 0 && time >= invincibleUntil) {
      invincibleUntil = 0;
      player.classList.remove("is-invincible");
    }
  }

  player.addEventListener("animationend", event => {
    if (event.animationName !== "player-death") return;
    player.classList.remove("is-dying");
    if (gameState === "dying-gameover") {
      showGameOver();
      return;
    }
    if (gameState === "respawning") {
      player.classList.add("is-respawning");
    }
  });

  // Stage layout: 1 = hard block, 0 = floor. Soft blocks are generated onto floor cells.
  const STAGE_MAP = [
    "11111111111111111111111",
    "10000000000010000000001",
    "10111010101010101010101",
    "10000000000010000000001",
    "10101010101010101010101",
    "10000000000010000000001",
    "10101010101011101010101",
    "10000010000000000010001",
    "10101010101010101010101",
    "10000010000000000000001",
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

  function getBaseFloorNeighbors(row, col) {
    return ENEMY_DIRECTIONS
      .map(direction => ({ row: row + direction.y, col: col + direction.x }))
      .filter(cell =>
        cell.row > 0 && cell.row < GRID_ROWS - 1 &&
        cell.col > 0 && cell.col < GRID_COLUMNS - 1 &&
        STAGE_MAP[cell.row][cell.col] === "0"
      );
  }

  function countBaseFloorNeighbors(row, col) {
    return getBaseFloorNeighbors(row, col).length;
  }

  function wouldCreateThreeInARow(row, col, candidateKey) {
    const isBlocked = (checkRow, checkCol) => {
      const key = cellKey(checkRow, checkCol);
      return key === candidateKey || softBlockCells.has(key);
    };

    // Three consecutive blocks in a one-cell lane feel like a sealed wall.
    for (const [dy, dx] of [[0, 1], [1, 0]]) {
      for (let offset = -2; offset <= 0; offset += 1) {
        let allBlocked = true;
        for (let step = 0; step < 3; step += 1) {
          const checkRow = row + (offset + step) * dy;
          const checkCol = col + (offset + step) * dx;
          if (
            checkRow <= 0 || checkRow >= GRID_ROWS - 1 ||
            checkCol <= 0 || checkCol >= GRID_COLUMNS - 1 ||
            STAGE_MAP[checkRow][checkCol] !== "0" ||
            !isBlocked(checkRow, checkCol)
          ) {
            allBlocked = false;
            break;
          }
        }
        if (allBlocked) return true;
      }
    }
    return false;
  }

  function keepsFloorConnected(candidateKey) {
    let startCell = null;
    let totalOpenCells = 0;

    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLUMNS - 1; col += 1) {
        if (STAGE_MAP[row][col] !== "0") continue;
        const key = cellKey(row, col);
        if (key === candidateKey || softBlockCells.has(key)) continue;
        totalOpenCells += 1;
        if (!startCell) startCell = { row, col };
      }
    }
    if (!startCell) return false;

    const visited = new Set([cellKey(startCell.row, startCell.col)]);
    const queue = [startCell];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const neighbor of getBaseFloorNeighbors(current.row, current.col)) {
        const key = cellKey(neighbor.row, neighbor.col);
        if (key === candidateKey || softBlockCells.has(key) || visited.has(key)) continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }
    return visited.size === totalOpenCells;
  }

  function canPlaceSoftBlock(cell, currentClusterKeys) {
    const { row, col } = cell;
    const candidateKey = cellKey(row, col);

    if (STAGE_MAP[row][col] !== "0" || softBlockCells.has(candidateKey)) return false;
    // Intersections remain open. Blocks belong on corridor cells, not at decision points.
    if (countBaseFloorNeighbors(row, col) !== 2) return false;

    // Keep a small clear pocket around the player's spawn.
    if (Math.abs(row - 1) + Math.abs(col - 1) <= 2) return false;

    // Separate clusters from one another; only the current small cluster may touch this tile.
    for (const neighbor of getBaseFloorNeighbors(row, col)) {
      const neighborKey = cellKey(neighbor.row, neighbor.col);
      if (softBlockCells.has(neighborKey) && !currentClusterKeys.has(neighborKey)) {
        return false;
      }
    }

    if (wouldCreateThreeInARow(row, col, candidateKey)) return false;

    // Preserve at least two open exits at every intersection.
    for (let checkRow = 1; checkRow < GRID_ROWS - 1; checkRow += 1) {
      for (let checkCol = 1; checkCol < GRID_COLUMNS - 1; checkCol += 1) {
        if (STAGE_MAP[checkRow][checkCol] !== "0") continue;
        if (countBaseFloorNeighbors(checkRow, checkCol) < 3) continue;
        const openExits = getBaseFloorNeighbors(checkRow, checkCol).filter(exit => {
          const exitKey = cellKey(exit.row, exit.col);
          return exitKey !== candidateKey && !softBlockCells.has(exitKey);
        }).length;
        if (openExits < 2) return false;
      }
    }

    // Do not let the accumulated random layout split the floor into disconnected regions.
    return keepsFloorConnected(candidateKey);
  }

  function generateSoftBlocks() {
    stageBlocks.querySelectorAll(".soft-block").forEach(element => element.remove());
    softBlockCells.clear();

    const floorCells = [];
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLUMNS - 1; col += 1) {
        if (STAGE_MAP[row][col] === "0") floorCells.push({ row, col });
      }
    }

    // Stay near the lower end of the requested 25–33% range to reduce congestion.
    const targetCount = Math.round(floorCells.length * (0.25 + Math.random() * 0.04));
    const fragment = document.createDocumentFragment();

    function addSoftBlock(cell) {
      const element = document.createElement("div");
      element.className = "soft-block";
      element.dataset.hp = String(SOFT_BLOCK_HIT_POINTS);
      element.style.gridColumn = String(cell.col + 1);
      element.style.gridRow = String(cell.row + 1);
      softBlockCells.set(cellKey(cell.row, cell.col), {
        row: cell.row,
        col: cell.col,
        hp: SOFT_BLOCK_HIT_POINTS,
        element
      });
      fragment.appendChild(element);
    }

    // Build patches of two or three blocks, while all placement rules are checked per tile.
    let attempts = 0;
    while (softBlockCells.size < targetCount && attempts < floorCells.length * 8) {
      attempts += 1;
      const noCluster = new Set();
      const seedCandidates = floorCells.filter(cell => canPlaceSoftBlock(cell, noCluster));
      if (!seedCandidates.length) break;

      const seed = seedCandidates[Math.floor(Math.random() * seedCandidates.length)];
      const cluster = [seed];
      const clusterKeys = new Set([cellKey(seed.row, seed.col)]);
      addSoftBlock(seed);

      const clusterGoal = Math.min(
        2 + Math.floor(Math.random() * 2),
        targetCount - softBlockCells.size + 1
      );

      while (cluster.length < clusterGoal && softBlockCells.size < targetCount) {
        const options = new Map();
        for (const member of cluster) {
          for (const neighbor of getBaseFloorNeighbors(member.row, member.col)) {
            const key = cellKey(neighbor.row, neighbor.col);
            if (clusterKeys.has(key)) continue;
            if (canPlaceSoftBlock(neighbor, clusterKeys)) options.set(key, neighbor);
          }
        }
        if (!options.size) break;

        const choices = Array.from(options.values());
        const nextCell = choices[Math.floor(Math.random() * choices.length)];
        cluster.push(nextCell);
        clusterKeys.add(cellKey(nextCell.row, nextCell.col));
        addSoftBlock(nextCell);
      }
    }

    stageBlocks.appendChild(fragment);
  }
  function collidesWithSolidBlock(centerX, centerY) {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    // Keep the existing reduced hitbox so the sprite can comfortably use narrow lanes.
    const hitboxHalfWidth = cellWidth * 0.30;
    const hitboxHalfHeight = cellHeight * 0.30;
    const left = centerX - hitboxHalfWidth;
    const right = centerX + hitboxHalfWidth;
    const top = centerY - hitboxHalfHeight;
    const bottom = centerY + hitboxHalfHeight;
    const firstCol = Math.floor(left / cellWidth);
    const lastCol = Math.floor((right - 0.001) / cellWidth);
    const firstRow = Math.floor(top / cellHeight);
    const lastRow = Math.floor((bottom - 0.001) / cellHeight);

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let col = firstCol; col <= lastCol; col += 1) {
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLUMNS) return true;
        if (STAGE_MAP[row][col] === "1" || softBlockCells.has(cellKey(row, col))) return true;
      }
    }
    return false;
  }

  function movePlayer(dx, dy, delta) {
    const nextX = x + dx * speed * delta;
    const nextY = y + dy * speed * delta;

    // Resolve each axis separately so the player can slide along a wall.
    if (!collidesWithSolidBlock(nextX, y)) x = nextX;
    if (!collidesWithSolidBlock(x, nextY)) y = nextY;
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
    if (projectile.active || performance.now() < attackCooldownEndsAt) return;
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

  function checkProjectileSoftBlockCollision(time) {
    if (gameState !== "playing" || !projectile.active || projectile.mode !== "outbound") return;
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const col = Math.floor(projectile.x / cellWidth);
    const row = Math.floor(projectile.y / cellHeight);
    const block = softBlockCells.get(cellKey(row, col));
    if (!block) return;

    projectile.active = false;
    renderProjectile();
    damageSoftBlock(block);
    startAttackCooldown(time);
  }

  function damageSoftBlock(block) {
    block.hp -= 1;
    block.element.dataset.hp = String(block.hp);
    if (block.hp > 0) {
      block.element.classList.add("is-damaged");
      return;
    }

    // Remove it from collision and navigation immediately; the short animation is cosmetic.
    softBlockCells.delete(cellKey(block.row, block.col));
    block.element.classList.add("is-destroying");
    block.element.addEventListener("animationend", event => {
      if (event.animationName === "soft-block-break") block.element.remove();
    }, { once: true });
  }

  function explodeEnemy(unit) {
    if (!unit.alive) return;
    unit.hp -= 1;
    renderEnemyAppearance(unit);
    if (unit.hp > 0) { if (unit.typeKey === "fade") teleportFade(unit); return; }
    unit.alive = false;
    unit.element.setAttribute("aria-hidden", "true");
    unit.element.classList.add("is-exploding");
    collectEnemyPoints(unit);
  }

  function checkProjectileEnemyCollision(time) {
    if (gameState !== "playing" || !projectile.active) return;
    for (const unit of enemyUnits) {
      if (!unit.alive) continue;
      const enemyRadius = unit.radius || ENEMY_BASE_SIZE / 2;
      const contactDistance = enemyRadius + PROJECTILE_SIZE / 2;
      if (Math.hypot(projectile.x - unit.x, projectile.y - unit.y) <= contactDistance) {
        projectile.active = false;
        renderProjectile();
        explodeEnemy(unit);
        startAttackCooldown(time);
        return;
      }
    }
  }

  function onKeyDown(event) {
    if (gameState !== "playing") {
      if (event.code === "Space" || movementKeys.has(event.key.toLowerCase())) event.preventDefault();
      return;
    }
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
    updateAttackCooldown(time);

    if (gameState !== "playing") {
      // Keep the enemy patrolling during the countdown, but disable player input
      // and all collision checks until the player has returned.
      if (gameState === "respawning") {
        for (const unit of enemyUnits) updateEnemy(unit, delta);
        updateRespawnCountdown(time);
      }
      window.requestAnimationFrame(frame);
      return;
    }

    updateInvincibility(time);

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

    for (const unit of enemyUnits) updateEnemy(unit, delta);
    updateProjectile(delta);
    updateEnemyBoomerangs(delta, time);
    checkProjectileSoftBlockCollision(time);
    checkProjectileEnemyCollision(time);
    handlePlayerEnemyCollision(time);
    renderPlayer();
    window.requestAnimationFrame(frame);
  }

  function renderEnemyCountControl(typeKey) {
    const controls = enemyCountControls[typeKey];
    const limits = ENEMY_COUNT_LIMITS[typeKey];
    const count = configuredEnemyCounts[typeKey];
    const total = Object.values(configuredEnemyCounts).reduce((sum, n) => sum + n, 0);
    controls.value.textContent = String(count);
    controls.decrease.disabled = count <= limits.min;
    controls.increase.disabled = count >= limits.max || total >= MAX_TOTAL_ENEMIES;
    const totalLabel = document.querySelector("#enemy-total-count");
    if (totalLabel) totalLabel.textContent = total + " / " + MAX_TOTAL_ENEMIES + " UNITS DEPLOYED";
  }

  function renderEnemyCountControls() {
    for (const typeKey of Object.keys(ENEMY_TYPES)) renderEnemyCountControl(typeKey);
  }

  function startGame() {
    if (gameStarted) return;
    clearEnemyBoomerangs();
    gameStarted = true;
    // Clear any selection left by a drag before gameplay takes keyboard input.
    window.getSelection?.()?.removeAllRanges();
    stageSetup.hidden = true;
    gameplayView.hidden = false;
    stageTitle.innerHTML = "TEST <span>AREA</span>";
    stageBadge.innerHTML = '<span class="status-dot"></span> GRID 23 × 11';
    gameState = "playing";
    invincibleUntil = performance.now() + START_INVINCIBILITY_MS;
    player.classList.add("is-invincible");

    buildHardBlocks();
    generateSoftBlocks();
    fitPlayerToGrid();
    createEnemyUnits();
    fitEnemyToGrid();
    // Start in the upper-left walkable cell; enemy positions are randomized away from it.
    placePlayerAtStart();
    placeEnemyAtStart();
    renderLives();
    renderScore();
    renderPlayer();
    renderProjectile();
    arena.focus({ preventScroll: true });
  }

  for (const typeKey of Object.keys(ENEMY_TYPES)) {
    const controls = enemyCountControls[typeKey];
    const limits = ENEMY_COUNT_LIMITS[typeKey];
    controls.decrease.addEventListener("click", () => {
      configuredEnemyCounts[typeKey] = Math.max(limits.min, configuredEnemyCounts[typeKey] - 1);
      renderEnemyCountControls();
    });
    controls.increase.addEventListener("click", () => {
      const total = Object.values(configuredEnemyCounts).reduce((sum, n) => sum + n, 0);
      if (total < MAX_TOTAL_ENEMIES) configuredEnemyCounts[typeKey] = Math.min(limits.max, configuredEnemyCounts[typeKey] + 1);
      renderEnemyCountControls();
    });
  }
  gameStartButton.addEventListener("click", startGame);
  renderEnemyCountControls();

  restartButton.addEventListener("click", restartGame);
  gameoverRestart.addEventListener("click", restartGame);

  // The play screen is an application surface, not selectable document text.
  // The CSS rule handles normal cases; these guards cover browsers/extensions
  // that still try to start text selection or native dragging.
  document.addEventListener("selectstart", event => {
    if (gameStarted) event.preventDefault();
  }, true);
  document.addEventListener("dragstart", event => {
    if (gameStarted) event.preventDefault();
  }, true);

  // Capture controls early: WASD / arrows / Space should never fall through
  // to browser defaults such as text selection or page scrolling during play.
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });
  window.addEventListener("blur", clearKeys);
  window.addEventListener("resize", () => {
    if (!gameStarted) return;
    fitPlayerToGrid();
    fitEnemyToGrid();
    keepInsideArena();
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    for (const unit of enemyUnits) {
      unit.x = (unit.col + 0.5) * cellWidth;
      unit.y = (unit.row + 0.5) * cellHeight;
      renderEnemy(unit);
    }
    renderPlayer();
  });

  window.requestAnimationFrame(frame);
})();
