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
    battery: { value: document.querySelector("#enemy-battery-count-value"), decrease: document.querySelector("#enemy-battery-count-decrease"), increase: document.querySelector("#enemy-battery-count-increase") },
    photon: { value: document.querySelector("#enemy-photon-count-value"), decrease: document.querySelector("#enemy-photon-count-decrease"), increase: document.querySelector("#enemy-photon-count-increase") },
    reaper: { value: document.querySelector("#enemy-reaper-count-value"), decrease: document.querySelector("#enemy-reaper-count-decrease"), increase: document.querySelector("#enemy-reaper-count-increase") },
    dash: { value: document.querySelector("#enemy-dash-count-value"), decrease: document.querySelector("#enemy-dash-count-decrease"), increase: document.querySelector("#enemy-dash-count-increase") },
    zigzag: { value: document.querySelector("#enemy-zigzag-count-value"), decrease: document.querySelector("#enemy-zigzag-count-decrease"), increase: document.querySelector("#enemy-zigzag-count-increase") },
    fade: { value: document.querySelector("#enemy-fade-count-value"), decrease: document.querySelector("#enemy-fade-count-decrease"), increase: document.querySelector("#enemy-fade-count-increase") },
    fox: { value: document.querySelector("#enemy-fox-count-value"), decrease: document.querySelector("#enemy-fox-count-decrease"), increase: document.querySelector("#enemy-fox-count-increase") },
    acidfox: { value: document.querySelector("#enemy-acidfox-count-value"), decrease: document.querySelector("#enemy-acidfox-count-decrease"), increase: document.querySelector("#enemy-acidfox-count-increase") },
    chameleon: { value: document.querySelector("#enemy-chameleon-count-value"), decrease: document.querySelector("#enemy-chameleon-count-decrease"), increase: document.querySelector("#enemy-chameleon-count-increase") }
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
    drone: { hp: 1, points: 100, speed: 1, bounceChance: 0.40 },
    tank: { hp: 3, points: 200, speed: 0.55, turnChance: 0.80 },
    scout: { hp: 2, points: 250, speed: 2, turnChance: 0.60 },
    hunter: { hp: 2, points: 400, speed: 0.85, behavior: "chase", turnChance: 0.50, fallbackTurnChance: 0.50, chaseRadius: 5, disengageRadius: 8 },
    battery: { hp: 2, points: 400, speed: 0, behavior: "battery" },
    photon: { hp: 3, points: 500, speed: 3.5, turnChance: 0.25 },
    reaper: { hp: 5, points: 1000, speed: 0.9, turnChance: 0.50, behavior: "reaper" },
    dash: { hp: 2, points: 250, speed: 1, turnChance: 0.45, behavior: "dash", alertSpeed: 2.5 },
    zigzag: { hp: 1, points: 400, speed: 2.7, turnChance: 0.60, junctionTurnChance: 0.50, behavior: "zigzag", ignoresSoftBlocks: true },
    fade: { hp: 4, points: 800, speed: 1.5, turnChance: 0.50, behavior: "fade" },
    fox: { hp: 3, points: 1600, speed: 1.3, turnChance: 0.60, behavior: "fox", guardsFront: true },
    acidfox: { hp: 5, points: 6400, speed: 1.5, turnChance: 0.90, behavior: "acidfox", guardsFront: true, poisonAttack: true },
    chameleon: { hp: 2, points: 800, speed: 1, turnChance: 0.30, behavior: "chameleon" }
  };
  const configuredEnemyCounts = { drone: 3, tank: 0, scout: 0, hunter: 0, battery: 0, photon: 0, reaper: 0, dash: 0, zigzag: 0, fade: 0, fox: 0, acidfox: 0, chameleon: 0 };
  const MAX_TOTAL_ENEMIES = 20;
  const ENEMY_COUNT_LIMITS = {
    drone: { min: 0, max: 8 }, tank: { min: 0, max: 8 }, scout: { min: 0, max: 8 },
    hunter: { min: 0, max: 8 }, battery: { min: 0, max: 8 }, photon: { min: 0, max: 8 },
    reaper: { min: 0, max: 8 }, dash: { min: 0, max: 8 }, zigzag: { min: 0, max: 8 }, fade: { min: 0, max: 8 },
    fox: { min: 0, max: 8 }, acidfox: { min: 0, max: 8 }, chameleon: { min: 0, max: 8 }
  };
  let gameStarted = false;
  const enemyUnits = [];
  const softBlockCells = new Map();
  let score = 0;
  const PROJECTILE_SIZE = 40;
  const PLAYER_BOOMERANG_SPEED_VALUE = 4; // x4, equivalent to 288 CSS px/s.
  const PLAYER_BOOMERANG_RETURN_SPEED_VALUE = PLAYER_BOOMERANG_SPEED_VALUE * (17 / 15); // Preserve the 340:300 return/outbound ratio.
  const REAPER_BOOMERANG_SPEED_VALUE = PLAYER_BOOMERANG_SPEED_VALUE * 0.8; // x3.2.
  const PLAYER_BOOMERANG_SPEED = ENEMY_SPEED * PLAYER_BOOMERANG_SPEED_VALUE;
  const PLAYER_BOOMERANG_RETURN_SPEED = ENEMY_SPEED * PLAYER_BOOMERANG_RETURN_SPEED_VALUE;
  const REAPER_BOOMERANG_SPEED = ENEMY_SPEED * REAPER_BOOMERANG_SPEED_VALUE;
  const SOFT_BLOCK_HIT_POINTS = 2;
  const ATTACK_COOLDOWN_MS = 1500;
  let attackCooldownEndsAt = 0;
  let lastAttackCooldownDisplay = null;
  let lastAttackCooldownState = null;
  let projectileRangeCells = 3; // Boomerang range is measured in grid cells.
  let x = 0;
  let y = 0;
  let facingX = 0;
  let facingY = -1;
  let previousTime = 0;
  let nextFrameAt = 0;
  const INITIAL_LIVES = 5;
  const RESPAWN_DELAY_MS = 3000;
  const RESPAWN_INVINCIBILITY_MS = 3000;
  const START_INVINCIBILITY_MS = 5000;
  let lives = INITIAL_LIVES;
  let gameState = "configuring";
  let respawnEndsAt = 0;
  let invincibleUntil = 0;

  const enemyProjectiles = [];
  const REAPER_FIRE_INTERVAL_MS = 12000;
  const REAPER_PREPARE_DURATION_MS = 1500;
  const REAPER_RECOVERY_DURATION_MS = 750;
  const ACID_POISON_MIN_MS = 8000;
  const ACID_POISON_MAX_MS = 10000;
  const BATTERY_FIRE_INTERVAL_MS = 10000;
  const BATTERY_WARNING_BLINK_INTERVAL_MS = 600;
  const BATTERY_WARNING_BLINK_COUNT = 3;
  const BATTERY_WARNING_DURATION_MS = BATTERY_WARNING_BLINK_INTERVAL_MS * BATTERY_WARNING_BLINK_COUNT;
  const ACID_POISON_PROJECTILE_SPEED_VALUE = 2.5;
  const BATTERY_PROJECTILE_SPEED_VALUE = PLAYER_BOOMERANG_SPEED_VALUE * 0.6; // x2.4; preserve the previous turret/player ratio.
  const ACID_POISON_PROJECTILE_SPEED = ENEMY_SPEED * ACID_POISON_PROJECTILE_SPEED_VALUE;
  const BATTERY_PROJECTILE_SPEED = ENEMY_SPEED * BATTERY_PROJECTILE_SPEED_VALUE;
  const REAPER_DIRECT_AIM_DISTANCE_CELLS = 5;
  const DASH_WINDUP_MS = 750;
  const FADE_ESCAPE_SPEED = 6;
  const FADE_ESCAPE_MAX_CELLS = 5;
  const TARGET_FRAME_INTERVAL_MS = 1000 / 60;

  function getInitialActionAt(typeKey, now) {
    if (typeKey === "battery") return now + BATTERY_FIRE_INTERVAL_MS - BATTERY_WARNING_DURATION_MS;
    if (typeKey === "reaper") return now + 1800 + Math.random() * 1800 - REAPER_PREPARE_DURATION_MS;
    if (typeKey === "acidfox") return now + ACID_POISON_MIN_MS + Math.random() * (ACID_POISON_MAX_MS - ACID_POISON_MIN_MS);
    return now + 1800 + Math.random() * 1800;
  }

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
          "enemy-tank", "enemy-scout", "enemy-hunter", "enemy-battery", "enemy-photon",
          "enemy-reaper", "enemy-dash", "enemy-zigzag", "enemy-fade",
          "enemy-fox", "enemy-acidfox", "enemy-chameleon",
          "is-exploding", "is-guarding", "is-disguised", "is-chasing", "is-charging", "is-winding-up", "is-phasing", "is-recovering", "tank-hp-3", "tank-hp-2", "tank-hp-1"
        );
        element.classList.toggle("enemy-drone-unit", typeKey === "drone" || typeKey === "scout" || typeKey === "photon");
        if (typeKey !== "drone") element.classList.add("enemy-" + typeKey);
        element.hidden = false;
        element.setAttribute("aria-hidden", "false");
        element.setAttribute("aria-label", typeKey === "drone" ? "敵キャラクター。ドローン" : "敵キャラクター。" + typeKey.toUpperCase());
        element.dataset.enemyType = typeKey;
        const type = ENEMY_TYPES[typeKey];
        const unit = {
          element, type, typeKey, hp: type.hp, alive: true, x: 0, y: 0, row: 1, col: 1,
          directionX: unitIndex % 2 === 0 ? 1 : -1, directionY: 0,
          points: type.points, speed: type.speed,
          nextShotAt: getInitialActionAt(typeKey, performance.now()),
          dashPhase: "patrol",
          dashPhaseEndsAt: 0,
          dashTargetRow: 0,
          dashTargetCol: 0,
          dashArmed: true,
          fadeEscaping: false,
          fadeEscapePath: [],
          fadeEscapeIndex: 0,
          reaperPhase: "moving",
          reaperPhaseEndsAt: 0,
          batteryCharging: false,
          batteryFireAt: 0,
          alerting: false,
          chasing: false,
          nextDisguiseAt: performance.now() + 15000,
          disguisedUntil: 0,
          disguised: false
        };
        renderEnemyAppearance(unit);
        element.addEventListener("animationend", event => {
          if ((event.animationName === "enemy-drone-explode" || event.animationName === "enemy-drone-unit-explode" || event.animationName === "enemy-tank-explode") && !unit.alive) element.hidden = true;
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

  function randomHardBlockCell(usedHardBlockKeys) {
    const candidates = hardBlockCells.filter(cell =>
      cell.row > 0 && cell.row < GRID_ROWS - 1 &&
      cell.col > 0 && cell.col < GRID_COLUMNS - 1 &&
      STAGE_MAP[cell.row][cell.col] === "1" &&
      !usedHardBlockKeys.has(cellKey(cell.row, cell.col))
    );
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    const fallback = hardBlockCells.filter(cell =>
      cell.row > 0 && cell.row < GRID_ROWS - 1 &&
      cell.col > 0 && cell.col < GRID_COLUMNS - 1 &&
      STAGE_MAP[cell.row][cell.col] === "1"
    );
    return fallback[Math.floor(Math.random() * fallback.length)] || { row: 1, col: 1 };
  }

  function placeEnemyAtStart() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    const playerStart = { row: 1, col: 1 };
    const occupied = [playerStart];
    const usedHardBlockKeys = new Set();
    for (const unit of enemyUnits) {
      const cell = unit.typeKey === "battery"
        ? randomHardBlockCell(usedHardBlockKeys)
        : randomWalkableCell(occupied, 6);
      if (unit.typeKey === "battery") usedHardBlockKeys.add(cellKey(cell.row, cell.col));
      occupied.push(cell);
      unit.alive = true;
      unit.hp = unit.type.hp;
      unit.speed = unit.type.speed;
      unit.disguised = false;
      unit.disguisedUntil = 0;
      unit.nextDisguiseAt = performance.now() + 15000;
      unit.chasing = false;
      unit.element.classList.remove("is-guarding", "is-disguised", "is-chasing", "is-charging", "is-winding-up", "is-phasing", "is-recovering");
      unit.nextShotAt = getInitialActionAt(unit.typeKey, performance.now());
      unit.dashPhase = "patrol";
      unit.dashPhaseEndsAt = 0;
      unit.dashTargetRow = unit.row;
      unit.dashTargetCol = unit.col;
      unit.dashArmed = true;
      unit.fadeEscaping = false;
      unit.fadeEscapePath = [];
      unit.fadeEscapeIndex = 0;
      unit.reaperPhase = "moving";
      unit.reaperPhaseEndsAt = 0;
      unit.batteryCharging = false;
      unit.batteryFireAt = 0;
      unit.alerting = false;
      unit.element.hidden = false;
      unit.element.setAttribute("aria-hidden", "false");
      unit.element.classList.remove("is-exploding");
      renderEnemyAppearance(unit);
      unit.row = cell.row;
      unit.col = cell.col;
      unit.x = (cell.col + 0.5) * cellWidth;
      unit.y = (cell.row + 0.5) * cellHeight;
      if (unit.typeKey === "battery") {
        unit.directionX = 0;
        unit.directionY = -1;
        unit.element.style.setProperty("--battery-aim-angle", "0deg");
      } else {
        const directions = ENEMY_DIRECTIONS.filter(direction =>
          canEnemyEnterCell(unit, unit.row + direction.y, unit.col + direction.x)
        );
        const chosen = directions[Math.floor(Math.random() * directions.length)] || { x: 1, y: 0 };
        unit.directionX = chosen.x;
        unit.directionY = chosen.y;
      }
      renderEnemy(unit);
    }
  }

  function renderEnemy(unit) {
    if (unit.lastRenderedX !== unit.x) {
      unit.lastRenderedX = unit.x;
      unit.element.style.left = `${unit.x}px`;
    }
    if (unit.lastRenderedY !== unit.y) {
      unit.lastRenderedY = unit.y;
      unit.element.style.top = `${unit.y}px`;
    }
    const angle = Math.atan2(unit.directionY, unit.directionX) * 180 / Math.PI + 90;
    if (unit.lastFacingAngle !== angle) {
      unit.lastFacingAngle = angle;
      unit.element.style.setProperty("--enemy-facing-angle", angle + "deg");
    }
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
    // Drone bounceChance is the probability of reversing at a junction; other enemies use turnChance.
    const chanceToTurn = unit.type.bounceChance == null ? turnChance : 1 - unit.type.bounceChance;
    if (sideOptions.length > 0 && Math.random() < chanceToTurn) {
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

  function getReachableCellDistances(startRow, startCol, movingUnit = null) {
    const canEnter = movingUnit ? (row, col) => canEnemyEnterCell(movingUnit, row, col) : isWalkableCell;
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
        if (!canEnter(row, col) || distances.has(key)) continue;
        distances.set(key, nextDistance);
        queue.push({ row, col });
      }
    }
    return distances;
  }

  function chooseStrategicDirection(unit, cellWidth, cellHeight) {
    const behavior = unit.type.behavior;
    if (!["chase", "flee", "fox", "acidfox"].includes(behavior)) return null;
    const playerCell = getPlayerGridCell(cellWidth, cellHeight);
    if (!playerCell) return null;
    const distances = getReachableCellDistances(playerCell.row, playerCell.col, unit);
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
        canEnemyEnterCell(unit, candidate.row, candidate.col) &&
        distances.has(cellKey(candidate.row, candidate.col))
      )
      .map(candidate => ({
        direction: candidate.direction,
        distance: distances.get(cellKey(candidate.row, candidate.col))
      }));

    if (!options.length) return null;
    const bestDistance = behavior === "flee"
      ? Math.max(...options.map(option => option.distance))
      : Math.min(...options.map(option => option.distance));
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

  function updateChameleonState(unit, time) {
    if (unit.typeKey !== "chameleon") return;
    if (!unit.disguised && time >= unit.nextDisguiseAt) {
      unit.disguised = true;
      unit.disguisedUntil = time + 10000;
      unit.nextDisguiseAt = time + 15000;
      unit.element.classList.add("is-disguised");
    } else if (unit.disguised && time >= unit.disguisedUntil) {
      unit.disguised = false;
      unit.element.classList.remove("is-disguised");
    }
  }

  function createEnemyUpdateContext() {
    const cellWidth = arena.clientWidth / GRID_COLUMNS;
    const cellHeight = arena.clientHeight / GRID_ROWS;
    return { cellWidth, cellHeight, playerCell: getPlayerGridCell(cellWidth, cellHeight) };
  }

  function updateEnemy(unit, delta, time = performance.now(), context = null) {
    if (!unit.alive) return;
    updateChameleonState(unit, time);
    const updateContext = context || createEnemyUpdateContext();
    const { cellWidth, cellHeight, playerCell } = updateContext;
    const dashHasLine = unit.typeKey === "dash" && playerCell && isDashLineClear(unit, playerCell);
    if (unit.typeKey === "dash") {
      // DASH can re-arm only after its line of sight has been broken.
      if (!dashHasLine && unit.dashPhase === "patrol") unit.dashArmed = true;
      if (unit.dashPhase === "windup" && time >= unit.dashPhaseEndsAt) {
        unit.dashPhase = "charging";
        unit.element.classList.remove("is-winding-up");
        unit.element.classList.add("is-charging");
      }
      unit.alerting = unit.dashPhase === "charging";
    } else {
      unit.alerting = false;
    }
    if (unit.typeKey === "hunter" && playerCell) {
      const playerDistance = Math.abs(playerCell.col - unit.col) + Math.abs(playerCell.row - unit.row);
      if (!unit.chasing && playerDistance <= unit.type.chaseRadius) unit.chasing = true;
      else if (unit.chasing && playerDistance > unit.type.disengageRadius) unit.chasing = false;
      unit.element.classList.toggle("is-chasing", unit.chasing);
    }
    let remaining = unit.typeKey === "dash" && unit.dashPhase === "windup"
      ? 0
      : ENEMY_SPEED * (unit.fadeEscaping ? FADE_ESCAPE_SPEED : unit.alerting ? unit.type.alertSpeed : unit.speed) * delta;
    if (unit.typeKey === "reaper") {
      if (unit.reaperPhase === "moving" && time >= unit.nextShotAt) {
        unit.reaperPhase = "charging";
        unit.reaperPhaseEndsAt = time + REAPER_PREPARE_DURATION_MS;
        unit.element.classList.add("is-charging");
      }
      if (unit.reaperPhase === "charging") {
        remaining = 0;
        if (time >= unit.reaperPhaseEndsAt) {
          launchEnemyBoomerang(unit);
          unit.element.classList.remove("is-charging");
          unit.element.classList.add("is-recovering");
          unit.reaperPhase = "recovery";
          unit.reaperPhaseEndsAt = time + REAPER_RECOVERY_DURATION_MS;
          unit.nextShotAt = time + REAPER_FIRE_INTERVAL_MS - REAPER_PREPARE_DURATION_MS;
        }
      } else if (unit.reaperPhase === "recovery") {
        remaining = 0;
        if (time >= unit.reaperPhaseEndsAt) {
          unit.reaperPhase = "moving";
          unit.element.classList.remove("is-recovering");
        }
      }
    }
    if (unit.typeKey === "battery" && playerCell) {
      if (!unit.batteryCharging && time >= unit.nextShotAt) {
        unit.batteryCharging = true;
        unit.batteryFireAt = time + BATTERY_WARNING_DURATION_MS;
        unit.element.classList.add("is-charging");
      }
      if (unit.batteryCharging && time >= unit.batteryFireAt) {
        launchBatteryShot(unit);
        unit.batteryCharging = false;
        unit.batteryFireAt = 0;
        unit.element.classList.remove("is-charging");
        unit.nextShotAt = time + BATTERY_FIRE_INTERVAL_MS - BATTERY_WARNING_DURATION_MS;
      }
    }
    if (unit.type.behavior === "acidfox" && time >= unit.nextShotAt) {
      launchEnemyPoison(unit);
      unit.nextShotAt = time + ACID_POISON_MIN_MS + Math.random() * (ACID_POISON_MAX_MS - ACID_POISON_MIN_MS);
    }
    let guard = 0;
    while (remaining > 0 && guard < 8) {
      const centerX = (unit.col + 0.5) * cellWidth;
      const centerY = (unit.row + 0.5) * cellHeight;
      const atCellCenter = Math.abs(unit.x - centerX) < 0.01 && Math.abs(unit.y - centerY) < 0.01;
      if (atCellCenter && unit.typeKey === "dash" && unit.dashPhase === "patrol") {
        // Sense the player only at a tile center, so a charge always starts aligned to the grid.
        const dashPlayerCell = playerCell;
        if (unit.dashArmed && dashPlayerCell && isDashLineClear(unit, dashPlayerCell)) {
          if (dashPlayerCell.row === unit.row && dashPlayerCell.col === unit.col) {
            const towardX = x - unit.x;
            const towardY = y - unit.y;
            if (Math.abs(towardX) >= Math.abs(towardY) && Math.abs(towardX) > 0.01) {
              unit.directionX = Math.sign(towardX);
              unit.directionY = 0;
            } else if (Math.abs(towardY) > 0.01) {
              unit.directionX = 0;
              unit.directionY = Math.sign(towardY);
            }
          } else if (dashPlayerCell.row === unit.row) {
            unit.directionX = Math.sign(dashPlayerCell.col - unit.col);
            unit.directionY = 0;
          } else {
            unit.directionX = 0;
            unit.directionY = Math.sign(dashPlayerCell.row - unit.row);
          }
          unit.dashPhase = "windup";
          unit.dashPhaseEndsAt = time + DASH_WINDUP_MS;
          unit.dashArmed = false;
          unit.element.classList.add("is-winding-up");
          remaining = 0;
          break;
        }
      } else if (atCellCenter && unit.typeKey === "dash" && unit.dashPhase === "charging") {
        const nextChargeRow = unit.row + unit.directionY;
        const nextChargeCol = unit.col + unit.directionX;
        // The charge ends only when the next tile is blocked. It never turns mid-charge.
        if (!canEnemyEnterCell(unit, nextChargeRow, nextChargeCol)) {
          unit.dashPhase = "patrol";
          unit.dashArmed = true;
          unit.alerting = false;
          unit.element.classList.remove("is-charging");
          remaining = 0;
          break;
        }
      } else if (atCellCenter && unit.typeKey === "fade" && unit.fadeEscaping) {
        while (unit.fadeEscapeIndex < unit.fadeEscapePath.length) {
          const nextPathCell = unit.fadeEscapePath[unit.fadeEscapeIndex];
          if (nextPathCell.row !== unit.row || nextPathCell.col !== unit.col) break;
          unit.fadeEscapeIndex += 1;
        }
        if (unit.fadeEscapeIndex >= unit.fadeEscapePath.length) {
          unit.fadeEscaping = false;
          unit.fadeEscapePath = [];
          unit.fadeEscapeIndex = 0;
          unit.speed = unit.type.speed;
          unit.element.classList.remove("is-phasing");
          remaining = 0;
          break;
        }
        const escapeCell = unit.fadeEscapePath[unit.fadeEscapeIndex];
        leaveFadeTrail(unit);
        unit.directionX = Math.sign(escapeCell.col - unit.col);
        unit.directionY = Math.sign(escapeCell.row - unit.row);
      } else if (atCellCenter && (unit.type.behavior === "fox" || unit.type.behavior === "acidfox")) {
        if (Math.random() < unit.type.turnChance) {
          const strategicDirection = chooseStrategicDirection(unit, cellWidth, cellHeight);
          if (strategicDirection) { unit.directionX = strategicDirection.x; unit.directionY = strategicDirection.y; }
        }
      } else if (atCellCenter && unit.type.behavior === "zigzag") {
        const exits = ENEMY_DIRECTIONS.filter(d => canEnemyEnterCell(unit, unit.row + d.y, unit.col + d.x));
        if (exits.length >= 3 && Math.random() < (unit.type.junctionTurnChance ?? unit.type.turnChance)) {
          const options = exits.filter(d => d.x !== unit.directionX || d.y !== unit.directionY);
          if (options.length) { const chosen = options[Math.floor(Math.random() * options.length)]; unit.directionX = chosen.x; unit.directionY = chosen.y; }
        }
      } else if (atCellCenter && unit.typeKey === "hunter" && unit.chasing) {
        const strategicDirection = chooseStrategicDirection(unit, cellWidth, cellHeight);
        if (strategicDirection) { unit.directionX = strategicDirection.x; unit.directionY = strategicDirection.y; }
      } else if (atCellCenter && unit.type.behavior && unit.typeKey !== "hunter") {
        const strategicDirection = chooseStrategicDirection(unit, cellWidth, cellHeight);
        if (strategicDirection) { unit.directionX = strategicDirection.x; unit.directionY = strategicDirection.y; }
      }
      let nextRow = unit.row + unit.directionY;
      let nextCol = unit.col + unit.directionX;
      if (!canEnemyEnterCell(unit, nextRow, nextCol)) {
        if (unit.typeKey === "dash" && unit.dashPhase === "charging") {
          chooseEnemyDirectionAtWall(unit);
          unit.dashPhase = "patrol";
          unit.alerting = false;
          unit.element.classList.remove("is-charging");
          remaining = 0;
          break;
        }
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
    const display = isCooling ? (remainingMs / 1000).toFixed(1) : "GO";
    // The HUD displays tenths of a second, so updating it every frame only creates needless DOM work.
    if (display === lastAttackCooldownDisplay && isCooling === lastAttackCooldownState) return;
    lastAttackCooldownDisplay = display;
    lastAttackCooldownState = isCooling;
    const remainingRatio = Math.min(1, remainingMs / ATTACK_COOLDOWN_MS);
    const angle = isCooling ? remainingRatio * 360 : 360;
    attackCooldownRing.style.setProperty("--cooldown-angle", `${angle}deg`);
    attackCooldown.classList.toggle("is-cooling", isCooling);
    attackCooldown.classList.toggle("is-ready", !isCooling);
    attackCooldownValue.textContent = display;
    attackCooldown.setAttribute(
      "aria-label",
      isCooling ? `攻撃クールタイム残り ${display} 秒` : "攻撃可能"
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
    // A lightweight silhouette is cheaper than cloning the enemy's whole animated DOM.
    const trail = document.createElement("div");
    trail.className = "enemy-drone enemy-fade enemy-fade-trail";
    trail.setAttribute("aria-hidden", "true");
    for (const className of ["drone-ring", "drone-eye", "drone-light drone-light-left", "drone-light drone-light-right"]) {
      const detail = document.createElement("span");
      detail.className = className;
      detail.setAttribute("aria-hidden", "true");
      trail.appendChild(detail);
    }
    trail.style.left = unit.x + "px";
    trail.style.top = unit.y + "px";
    arena.appendChild(trail);
    window.setTimeout(() => trail.remove(), 420);
  }

  function findFadeEscapePath(unit, playerCell) {
    if (!playerCell) return [];
    const startDistance = Math.abs(playerCell.row - unit.row) + Math.abs(playerCell.col - unit.col);
    const candidates = [];

    // Build only straight cardinal paths. Fade does not weave while phasing.
    for (const direction of ENEMY_DIRECTIONS) {
      const path = [];
      let row = unit.row;
      let col = unit.col;
      for (let step = 0; step < FADE_ESCAPE_MAX_CELLS; step += 1) {
        const nextRow = row + direction.y;
        const nextCol = col + direction.x;
        if (!canEnemyEnterCell(unit, nextRow, nextCol)) break;
        row = nextRow;
        col = nextCol;
        path.push({ row, col });
      }
      if (!path.length) continue;
      const playerDistance = Math.abs(playerCell.row - row) + Math.abs(playerCell.col - col);
      if (playerDistance > startDistance) candidates.push({ path, playerDistance });
    }

    if (!candidates.length) return [];
    const greatestDistance = Math.max(...candidates.map(candidate => candidate.playerDistance));
    const bestCandidates = candidates.filter(candidate => candidate.playerDistance === greatestDistance);
    return bestCandidates[Math.floor(Math.random() * bestCandidates.length)].path;
  }

  function teleportFade(unit, time = performance.now()) {
    const playerCell = getPlayerGridCell(arena.clientWidth / GRID_COLUMNS, arena.clientHeight / GRID_ROWS);
    if (!playerCell) return;
    const distanceToPlayer = Math.abs(playerCell.row - unit.row) + Math.abs(playerCell.col - unit.col);
    if (distanceToPlayer > FADE_ESCAPE_MAX_CELLS) return;

    const path = findFadeEscapePath(unit, playerCell);
    if (!path.length) return;
    leaveFadeTrail(unit);
    unit.fadeEscapePath = path;
    unit.fadeEscapeIndex = 0;
    unit.fadeEscaping = true;
    unit.speed = FADE_ESCAPE_SPEED;
    unit.element.classList.add("is-phasing");
  }

  function createEnemyProjectileElement(extraClass = "", initialX = 0, initialY = 0) {
    const element = projectileElement.cloneNode(true);
    element.removeAttribute("id");
    element.classList.add("enemy-projectile");
    if (extraClass) element.classList.add(extraClass);
    element.hidden = false;
    element.style.left = initialX + "px";
    element.style.top = initialY + "px";
    element.setAttribute("aria-hidden", "true");
    arena.appendChild(element);
    return element;
  }

  function launchEnemyBoomerang(unit) {
    const dx = x - unit.x, dy = y - unit.y;
    const playerCell = getPlayerGridCell(arena.clientWidth / GRID_COLUMNS, arena.clientHeight / GRID_ROWS);
    const gridDistance = playerCell
      ? Math.abs(playerCell.col - unit.col) + Math.abs(playerCell.row - unit.row)
      : Infinity;
    let directionX = unit.directionX;
    let directionY = unit.directionY;
    const directDistance = Math.hypot(dx, dy);
    if (gridDistance <= REAPER_DIRECT_AIM_DISTANCE_CELLS && directDistance > 0.001) {
      directionX = dx / directDistance;
      directionY = dy / directDistance;
    }
    const cellSize = Math.min(arena.clientWidth / GRID_COLUMNS, arena.clientHeight / GRID_ROWS);
    const element = createEnemyProjectileElement("", unit.x, unit.y);
    enemyProjectiles.push({
      kind: "boomerang", element, owner: unit, x: unit.x, y: unit.y,
      directionX, directionY, distance: 0,
      maxDistance: cellSize * projectileRangeCells,
      returning: false, speed: REAPER_BOOMERANG_SPEED
    });
  }

  function launchEnemyPoison(unit) {
    const element = createEnemyProjectileElement("enemy-poison-projectile", unit.x, unit.y);
    enemyProjectiles.push({kind: "poison", element, owner: unit, x: unit.x, y: unit.y, directionX: unit.directionX, directionY: unit.directionY, returning: false, speed: ACID_POISON_PROJECTILE_SPEED});
  }

  function launchBatteryShot(unit) {
    const dx = x - unit.x;
    const dy = y - unit.y;
    const distance = Math.hypot(dx, dy) || 1;
    const directionX = dx / distance;
    const directionY = dy / distance;
    const aimAngle = Math.atan2(directionY, directionX) * 180 / Math.PI + 90;
    unit.element.style.setProperty("--battery-aim-angle", aimAngle + "deg");
    const muzzleX = unit.x + directionX * 12;
    const muzzleY = unit.y + directionY * 12;
    const element = createEnemyProjectileElement("enemy-battery-projectile", muzzleX, muzzleY);
    element.style.setProperty("--battery-projectile-angle", Math.atan2(directionY, directionX) * 180 / Math.PI + "deg");
    enemyProjectiles.push({
      kind: "battery", element, owner: unit,
      x: muzzleX, y: muzzleY, directionX, directionY,
      returning: false, speed: BATTERY_PROJECTILE_SPEED
    });
  }

  function updateEnemyBoomerangs(delta, time) {
    const cellWidth = arena.clientWidth / GRID_COLUMNS, cellHeight = arena.clientHeight / GRID_ROWS;
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const shot = enemyProjectiles[i];
      const removeShot = () => { shot.element.remove(); enemyProjectiles.splice(i, 1); };
      if (!shot.owner.alive) { removeShot(); continue; }
      if (shot.kind === "battery") {
        // Battery rounds pierce both hard and soft blocks and travel to the arena edge.
        shot.x += shot.directionX * shot.speed * delta;
        shot.y += shot.directionY * shot.speed * delta;
        const outsideArena = shot.x < 0 || shot.x > arena.clientWidth ||
          shot.y < 0 || shot.y > arena.clientHeight;
        if (outsideArena) { removeShot(); continue; }
      } else if (shot.kind === "poison") {
        shot.x += shot.directionX * shot.speed * delta;
        shot.y += shot.directionY * shot.speed * delta;
        const row = Math.floor(shot.y / cellHeight), col = Math.floor(shot.x / cellWidth);
        const outsideArena = row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLUMNS;
        const hitHardBlock = !outsideArena && STAGE_MAP[row][col] === "1";
        if (outsideArena || hitHardBlock) { removeShot(); continue; }
      } else if (!shot.returning) {
        const step = shot.speed * delta;
        shot.x += shot.directionX * step; shot.y += shot.directionY * step; shot.distance += step;
        if (shot.distance >= shot.maxDistance) shot.returning = true;
      } else {
        const dx = shot.owner.x - shot.x, dy = shot.owner.y - shot.y, d = Math.hypot(dx, dy), step = shot.speed * delta;
        if (d <= step + 5) { removeShot(); continue; }
        shot.x += dx / d * step; shot.y += dy / d * step;
      }
      shot.element.style.left = shot.x + "px";
      shot.element.style.top = shot.y + "px";
      if (gameState === "playing" && time >= invincibleUntil && Math.hypot(x - shot.x, y - shot.y) <= Math.min(playerRadius.x, playerRadius.y) * .62 + 17) {
        removeShot();
        takePlayerHit(time);
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
    if (gameState !== "playing") return;
    const playerHitRadius = Math.min(playerRadius.x, playerRadius.y) * 0.62;
    for (const unit of enemyUnits) {
      // While FADE is phasing, it neither damages the player nor takes hits.
      if (!unit.alive || (unit.typeKey === "fade" && unit.fadeEscaping)) continue;
      if (Math.hypot(x - unit.x, y - unit.y) > playerHitRadius + (unit.radius || ENEMY_BASE_SIZE / 2)) continue;
      if (time < invincibleUntil) continue;
      takePlayerHit(time);
      return;
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
      const step = Math.min(PLAYER_BOOMERANG_SPEED * delta, Math.max(0, remaining));
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
      const step = PLAYER_BOOMERANG_RETURN_SPEED * delta;
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

  function createEnemyExplosionEffect(unit) {
    // Draw the burst as independent DOM layers, rather than relying only on pseudo-elements
    // and filtered gradients attached to the enemy being hidden.
    const effect = document.createElement("div");
    effect.className = "enemy-explosion";
    effect.setAttribute("aria-hidden", "true");
    effect.style.left = unit.x + "px";
    effect.style.top = unit.y + "px";

    const flash = document.createElement("span");
    flash.className = "enemy-explosion-flash";
    effect.appendChild(flash);

    const ring = document.createElement("span");
    ring.className = "enemy-explosion-ring";
    effect.appendChild(ring);

    [0, 90, 180, 270].forEach(angle => {
      const spark = document.createElement("span");
      spark.className = "enemy-explosion-spark";
      spark.style.setProperty("--spark-angle", angle + "deg");
      effect.appendChild(spark);
    });

    arena.appendChild(effect);
    // A timeout is used instead of animationend so the effect is cleaned up even if
    // the browser skips an animation event during backgrounding or compositing changes.
    window.setTimeout(() => effect.remove(), 1120);
  }

  function defeatEnemy(unit, awardPoints = true) {
    if (!unit.alive) return;
    unit.alive = false;
    unit.element.setAttribute("aria-hidden", "true");
    unit.element.classList.remove("is-guarding", "is-charging", "is-winding-up", "is-phasing", "is-recovering");
    unit.fadeEscaping = false;
    unit.fadeEscapePath = [];
    unit.fadeEscapeIndex = 0;
    unit.element.classList.add("is-exploding");
    createEnemyExplosionEffect(unit);
    if (awardPoints) collectEnemyPoints(unit);
  }

  function explodeEnemy(unit, time = performance.now()) {
    if (!unit.alive) return;
    if (unit.typeKey === "fade" && unit.fadeEscaping) return;
    if (unit.typeKey === "chameleon" && unit.disguised) return;
    unit.hp -= 1;
    renderEnemyAppearance(unit);
    if (unit.hp > 0) {
      if (unit.typeKey === "fade") teleportFade(unit, time);
      return;
    }
    defeatEnemy(unit, true);
  }

  function checkProjectileEnemyCollision(time) {
    if (gameState !== "playing" || !projectile.active) return;
    for (const unit of enemyUnits) {
      if (!unit.alive || unit.typeKey === "fade" && unit.fadeEscaping) continue;
      const enemyRadius = unit.radius || ENEMY_BASE_SIZE / 2;
      const contactDistance = enemyRadius + PROJECTILE_SIZE / 2;
      if (Math.hypot(projectile.x - unit.x, projectile.y - unit.y) <= contactDistance) {
        projectile.active = false;
        renderProjectile();
        const frontDot = unit.directionX * (projectile.x - unit.x) + unit.directionY * (projectile.y - unit.y);
        if (unit.typeKey === "chameleon" && unit.disguised) {
          // A disguised chameleon absorbs the attack without losing HP.
        } else if (unit.type.guardsFront && frontDot > 0) {
          unit.element.classList.add("is-guarding");
          window.setTimeout(() => unit.element.classList.remove("is-guarding"), 240);
        } else {
          explodeEnemy(unit, time);
        }
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
    window.requestAnimationFrame(frame);
    if (time < nextFrameAt) return;
    nextFrameAt = time + TARGET_FRAME_INTERVAL_MS;
    if (!previousTime) previousTime = time;
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    updateAttackCooldown(time);

    if (gameState !== "playing") {
      // Keep the enemy patrolling during the countdown, but disable player input
      // and all collision checks until the player has returned.
      if (gameState === "respawning") {
        const enemyContext = createEnemyUpdateContext();
        for (const unit of enemyUnits) updateEnemy(unit, delta, time, enemyContext);
        updateRespawnCountdown(time);
      }
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

    const enemyContext = createEnemyUpdateContext();
    for (const unit of enemyUnits) updateEnemy(unit, delta, time, enemyContext);
    updateProjectile(delta);
    updateEnemyBoomerangs(delta, time);
    checkProjectileSoftBlockCollision(time);
    checkProjectileEnemyCollision(time);
    handlePlayerEnemyCollision(time);
    renderPlayer();
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
    if (totalLabel && totalLabel.textContent !== total + " / " + MAX_TOTAL_ENEMIES + " UNITS DEPLOYED") totalLabel.textContent = total + " / " + MAX_TOTAL_ENEMIES + " UNITS DEPLOYED";
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

  stageSetup.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest(".quantity-button");
    if (!button || !stageSetup.contains(button)) return;
    const entry = Object.entries(enemyCountControls).find(([, controls]) =>
      controls.increase === button || controls.decrease === button
    );
    if (!entry) return;
    const [typeKey, controls] = entry;
    const limits = ENEMY_COUNT_LIMITS[typeKey];
    if (controls.increase === button) {
      const total = Object.values(configuredEnemyCounts).reduce((sum, value) => sum + value, 0);
      if (total < MAX_TOTAL_ENEMIES) configuredEnemyCounts[typeKey] = Math.min(limits.max, configuredEnemyCounts[typeKey] + 1);
    } else {
      configuredEnemyCounts[typeKey] = Math.max(limits.min, configuredEnemyCounts[typeKey] - 1);
    }
    renderEnemyCountControls();
  });

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
