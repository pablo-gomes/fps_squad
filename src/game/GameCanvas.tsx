import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PlayerData, RoomState, WeaponType, WEAPONS, ClientMessage } from '../types/game';
import { buildMap, MapData } from './voxelMap';
import { VoxelCharacter } from './voxelPlayer';
import { sound } from '../services/sound';
import { GameSettings } from '../components/SettingsModal';

interface GameCanvasProps {
  room: RoomState;
  currentUserId: string;
  settings: GameSettings;
  lastBullet?: {
    shooterId: string;
    weapon: WeaponType;
    origin: [number, number, number];
    target: [number, number, number];
    seq: number;
  } | null;
  onSendMessage: (msg: ClientMessage) => void;
  onOpenScoreboard: () => void;
  onTriggerHitmarker: () => void;
  onTriggerDamageFlash: () => void;
  onDashCooldownChange: (pct: number) => void;
  onReloadStatusChange: (reloading: boolean) => void;
  isAimingDownSights: boolean;
  setIsAimingDownSights: (ads: boolean) => void;
  isMobile: boolean;
  touchFireRef: React.MutableRefObject<boolean>;
  touchJumpRef: React.MutableRefObject<boolean>;
  touchDashRef: React.MutableRefObject<boolean>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  room,
  currentUserId,
  settings,
  lastBullet,
  onSendMessage,
  onOpenScoreboard,
  onTriggerHitmarker,
  onTriggerDamageFlash,
  onDashCooldownChange,
  onReloadStatusChange,
  isAimingDownSights,
  setIsAimingDownSights,
  isMobile,
  touchFireRef,
  touchJumpRef,
  touchDashRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // References to keep game loop fast, reactive, and garbage-collection free
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mapDataRef = useRef<MapData | null>(null);
  const otherCharactersRef = useRef<Map<string, VoxelCharacter>>(new Map());

  // Keep live props in refs to avoid re-mounting Three.js scene
  const roomRef = useRef(room);
  roomRef.current = room;

  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onSendMessageRef = useRef(onSendMessage);
  onSendMessageRef.current = onSendMessage;

  const onOpenScoreboardRef = useRef(onOpenScoreboard);
  onOpenScoreboardRef.current = onOpenScoreboard;

  const onTriggerHitmarkerRef = useRef(onTriggerHitmarker);
  onTriggerHitmarkerRef.current = onTriggerHitmarker;

  const onTriggerDamageFlashRef = useRef(onTriggerDamageFlash);
  onTriggerDamageFlashRef.current = onTriggerDamageFlash;

  const onDashCooldownChangeRef = useRef(onDashCooldownChange);
  onDashCooldownChangeRef.current = onDashCooldownChange;

  const onReloadStatusChangeRef = useRef(onReloadStatusChange);
  onReloadStatusChangeRef.current = onReloadStatusChange;

  const isAimingDownSightsRef = useRef(isAimingDownSights);
  isAimingDownSightsRef.current = isAimingDownSights;

  const wasAliveRef = useRef(true);

  // Player physics state
  const posRef = useRef(new THREE.Vector3(0, 2, 0));
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isGroundedRef = useRef(false);
  const isCrouchingRef = useRef(false);

  // Weapon & Abilities state
  const lastShotTimeRef = useRef(0);
  const isReloadingRef = useRef(false);
  const dashLastUsedRef = useRef(0);
  const DASH_COOLDOWN_MS = 2500;
  const currentWeaponRef = useRef<WeaponType>('rifle');
  const ammoRef = useRef<number>(30);

  // Movement inputs
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    dash: false,
    shoot: false,
  });

  // Touch joystick tracking
  const touchJoystickRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    active: false,
  });

  const touchLookRef = useRef<{ lastX: number; lastY: number; active: boolean }>({
    lastX: 0,
    lastY: 0,
    active: false,
  });

  // FPS Viewmodel (Gun held by player)
  const viewmodelRef = useRef<THREE.Group | null>(null);
  const walkBobTimerRef = useRef(0);

  // Initialize weapon ammo and current weapon from player data
  const me = room.players[currentUserId];
  useEffect(() => {
    if (me) {
      currentWeaponRef.current = me.currentWeapon;
      ammoRef.current = me.ammo;
    }
  }, [me?.currentWeapon, me?.ammo]);

  // Handle pointer lock request
  const requestPointerLock = () => {
    if (containerRef.current && !isMobile) {
      containerRef.current.requestPointerLock();
    }
  };

  // Helper to build viewmodel gun in first person
  const rebuildViewmodel = (weapon: WeaponType) => {
    if (!viewmodelRef.current) return;
    while (viewmodelRef.current.children.length > 0) {
      viewmodelRef.current.remove(viewmodelRef.current.children[0]);
    }

    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });

    // Right hand voxel holding gun
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), skinMat);
    hand.position.set(0.04, -0.05, 0.05);
    viewmodelRef.current.add(hand);

    if (weapon === 'rifle') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.65), darkMat);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), metalMat);
      barrel.position.z = -0.4;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.12), accentMat);
      mag.position.set(0, -0.12, 0);
      viewmodelRef.current.add(body, barrel, mag);
    } else if (weapon === 'shotgun') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.55), darkMat);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.35), metalMat);
      barrel.position.z = -0.35;
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.16), accentMat);
      pump.position.set(0, -0.06, -0.15);
      viewmodelRef.current.add(body, barrel, pump);
    } else if (weapon === 'sniper') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.8), darkMat);
      const longBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), metalMat);
      longBarrel.position.z = -0.55;
      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.3), metalMat);
      scope.position.set(0, 0.1, -0.1);
      viewmodelRef.current.add(body, longBarrel, scope);
    } else if (weapon === 'knife') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.22), darkMat);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.35), metalMat);
      blade.position.z = -0.25;
      viewmodelRef.current.add(handle, blade);
    }
  };

  // Switch weapon handler
  const switchWeapon = useCallback((weapon: WeaponType) => {
    if (isReloadingRef.current) return;
    currentWeaponRef.current = weapon;
    ammoRef.current = WEAPONS[weapon].magSize;
    onSendMessageRef.current({ type: 'player_switch_weapon', weapon });
    rebuildViewmodel(weapon);
  }, []);

  // Reload handler
  const reload = useCallback(() => {
    if (isReloadingRef.current || currentWeaponRef.current === 'knife') return;
    const w = WEAPONS[currentWeaponRef.current];
    if (ammoRef.current >= w.magSize) return;

    isReloadingRef.current = true;
    onReloadStatusChangeRef.current(true);
    sound.playReload();

    setTimeout(() => {
      isReloadingRef.current = false;
      onReloadStatusChangeRef.current(false);
      ammoRef.current = w.magSize;
      onSendMessageRef.current({ type: 'player_reload' });
    }, w.reloadTimeMs);
  }, []);

  // Visual tracer bullet
  const spawnTracer = useCallback((originArr: [number, number, number], targetArr: [number, number, number], weapon: WeaponType) => {
    if (!sceneRef.current) return;
    const origin = new THREE.Vector3(...originArr);
    const target = new THREE.Vector3(...targetArr);
    if (origin.distanceTo(target) < 0.1) return;

    const color = weapon === 'sniper' ? 0x38bdf8 : weapon === 'shotgun' ? 0xf97316 : 0xfde047;
    const mat = new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    const geo = new THREE.BufferGeometry().setFromPoints([origin, target]);
    const line = new THREE.Line(geo, mat);
    sceneRef.current.add(line);

    // Muzzle flash particle at origin
    const flashGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea75, transparent: true, opacity: 0.9 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(origin);
    sceneRef.current.add(flashMesh);

    setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.remove(line);
        sceneRef.current.remove(flashMesh);
      }
      geo.dispose();
      mat.dispose();
      flashGeo.dispose();
      flashMat.dispose();
    }, 100);
  }, []);

  // Watch for bullets fired across the room
  useEffect(() => {
    if (!lastBullet || !sceneRef.current) return;
    spawnTracer(lastBullet.origin, lastBullet.target, lastBullet.weapon);

    // If fired by another player or bot, play sound based on proximity
    if (lastBullet.shooterId !== currentUserIdRef.current && cameraRef.current) {
      const shooterPos = new THREE.Vector3(...lastBullet.origin);
      const dist = cameraRef.current.position.distanceTo(shooterPos);
      if (dist < 70) {
        sound.playShoot(lastBullet.weapon);
      }
    }
  }, [lastBullet, spawnTracer]);

  // Perform shooting
  const triggerShoot = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current || isReloadingRef.current) return;
    const now = Date.now();
    const weapon = WEAPONS[currentWeaponRef.current];

    if (now - lastShotTimeRef.current < weapon.fireRateMs) return;
    if (weapon.id !== 'knife' && ammoRef.current <= 0) {
      sound.playEmpty();
      reload();
      return;
    }

    lastShotTimeRef.current = now;
    if (weapon.id !== 'knife') {
      ammoRef.current--;
    }

    // Play gunshot sound
    sound.playShoot(weapon.id);

    // Camera recoil kick
    pitchRef.current = Math.min(Math.PI / 2.1, pitchRef.current + weapon.recoil);

    // Viewmodel punch back animation
    if (viewmodelRef.current) {
      viewmodelRef.current.position.z += 0.08;
    }

    // Raycast for hits
    const cam = cameraRef.current;
    const origin = cam.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();

    // Spread
    if (weapon.spread > 0 && !isAimingDownSightsRef.current) {
      forward.x += (Math.random() - 0.5) * weapon.spread;
      forward.y += (Math.random() - 0.5) * weapon.spread;
      forward.normalize();
    }

    // Default tracer end
    const tracerEnd = origin.clone().add(forward.clone().multiplyScalar(weapon.range));

    // Check hit candidates among other living characters
    let hitPlayerId: string | undefined = undefined;
    let isHeadshot = false;
    let closestDist = weapon.range;

    const raycaster = new THREE.Raycaster(origin, forward, 0.1, weapon.range);

    otherCharactersRef.current.forEach((char, pId) => {
      const otherData = roomRef.current.players[pId];
      if (!otherData || !otherData.isAlive) return;

      const intersects = raycaster.intersectObjects(char.group.children, true);
      if (intersects.length > 0) {
        const firstHit = intersects[0];
        if (firstHit.distance < closestDist) {
          closestDist = firstHit.distance;
          hitPlayerId = pId;
          tracerEnd.copy(firstHit.point);
          isHeadshot = firstHit.point.y > char.group.position.y + 1.4;
        }
      }
    });

    // Instant local tracer
    spawnTracer(
      [origin.x, origin.y - 0.15, origin.z],
      [tracerEnd.x, tracerEnd.y, tracerEnd.z],
      weapon.id
    );

    if (hitPlayerId) {
      sound.playHitmarker();
      onTriggerHitmarkerRef.current();
    }

    // Send shot to server
    onSendMessageRef.current({
      type: 'player_shoot',
      weapon: weapon.id,
      origin: [origin.x, origin.y, origin.z],
      direction: [forward.x, forward.y, forward.z],
      hitPlayerId,
      isHeadshot,
    });
  }, [reload, spawnTracer]);

  // Dash execution
  const triggerDash = useCallback(() => {
    const now = Date.now();
    if (now - dashLastUsedRef.current < DASH_COOLDOWN_MS) return;

    dashLastUsedRef.current = now;
    sound.playDash();

    // Forward vector
    const dir = new THREE.Vector3(
      -Math.sin(yawRef.current),
      0,
      -Math.cos(yawRef.current)
    ).normalize();

    velRef.current.x += dir.x * 22;
    velRef.current.z += dir.z * 22;
    velRef.current.y += 3.5;
  }, []);

  // Jump execution
  const triggerJump = useCallback(() => {
    if (isGroundedRef.current) {
      velRef.current.y = 10.5;
      isGroundedRef.current = false;
      sound.playJump();
    }
  }, []);

  // Dynamic references for listeners to avoid re-binding
  const triggerShootRef = useRef(triggerShoot);
  triggerShootRef.current = triggerShoot;

  const triggerJumpRef = useRef(triggerJump);
  triggerJumpRef.current = triggerJump;

  const triggerDashRef = useRef(triggerDash);
  triggerDashRef.current = triggerDash;

  const switchWeaponRef = useRef(switchWeapon);
  switchWeaponRef.current = switchWeapon;

  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Set up Three.js scene & main game loop (ONLY re-runs if map changes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(room.mapId === 'neon' ? 0x050811 : 0x7dd3fc);
    scene.fog = new THREE.FogExp2(room.mapId === 'neon' ? 0x050811 : 0x7dd3fc, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(settingsRef.current.fov, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;
    scene.add(camera);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, room.mapId === 'neon' ? 0.4 : 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, room.mapId === 'neon' ? 0.8 : 1.2);
    dirLight.position.set(30, 60, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 150;
    const d = 40;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Load Map
    const mapData = buildMap(room.mapId);
    scene.add(mapData.group);
    mapDataRef.current = mapData;

    // Pick initial spawn point
    const spawns = room.mode === 'TEAM'
      ? (me?.team === 'blue' ? mapData.spawns.blue : mapData.spawns.red)
      : mapData.spawns.ffa;
    const initialSpawn = spawns[Math.floor(Math.random() * spawns.length)] || new THREE.Vector3(0, 2, 0);
    posRef.current.copy(initialSpawn);
    camera.position.copy(initialSpawn);

    // First Person Viewmodel Group attached to camera
    const viewmodel = new THREE.Group();
    viewmodel.position.set(0.24, -0.22, -0.45);
    camera.add(viewmodel);
    viewmodelRef.current = viewmodel;
    rebuildViewmodel(currentWeaponRef.current);

    // Pointer Lock events
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === container;
      setIsPointerLocked(locked);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Mouse Move event
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      const sens = 0.002 * (settingsRef.current.mouseSensitivity || 1.0);
      yawRef.current -= e.movementX * sens;
      const invert = settingsRef.current.invertY ? -1 : 1;
      pitchRef.current -= e.movementY * sens * invert;
      pitchRef.current = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitchRef.current));
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Mouse Click & ADS (Zoom)
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;
      if (e.button === 0) {
        keysRef.current.shoot = true;
        triggerShootRef.current();
      } else if (e.button === 2) {
        setIsAimingDownSights(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        keysRef.current.shoot = false;
      } else if (e.button === 2) {
        setIsAimingDownSights(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'KeyW':
          keysRef.current.forward = true;
          break;
        case 'KeyS':
          keysRef.current.backward = true;
          break;
        case 'KeyA':
          keysRef.current.left = true;
          break;
        case 'KeyD':
          keysRef.current.right = true;
          break;
        case 'Space':
          triggerJumpRef.current();
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          isCrouchingRef.current = true;
          break;
        case 'KeyE':
          triggerDashRef.current();
          break;
        case 'KeyR':
          reloadRef.current();
          break;
        case 'Tab':
          onOpenScoreboardRef.current();
          e.preventDefault();
          break;
        case 'Digit1':
          switchWeaponRef.current('rifle');
          break;
        case 'Digit2':
          switchWeaponRef.current('shotgun');
          break;
        case 'Digit3':
          switchWeaponRef.current('sniper');
          break;
        case 'Digit4':
          switchWeaponRef.current('knife');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'KeyW':
          keysRef.current.forward = false;
          break;
        case 'KeyS':
          keysRef.current.backward = false;
          break;
        case 'KeyA':
          keysRef.current.left = false;
          break;
        case 'KeyD':
          keysRef.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          isCrouchingRef.current = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    // Physics collision check against map voxels
    const checkCollision = (nextPos: THREE.Vector3, playerRadius: number, playerHeight: number): { x: number; y: number; z: number; hitGround: boolean } => {
      const colliders = mapData.colliders;
      let x = nextPos.x;
      let y = nextPos.y;
      let z = nextPos.z;
      let hitGround = false;

      const minP = new THREE.Vector3(x - playerRadius, y, z - playerRadius);
      const maxP = new THREE.Vector3(x + playerRadius, y + playerHeight, z + playerRadius);

      for (let i = 0; i < colliders.length; i++) {
        const box = colliders[i];
        if (
          minP.x < box.max.x &&
          maxP.x > box.min.x &&
          minP.y < box.max.y &&
          maxP.y > box.min.y &&
          minP.z < box.max.z &&
          maxP.z > box.min.z
        ) {
          const overlapYTop = box.max.y - minP.y;
          if (overlapYTop < 0.6 && velRef.current.y <= 0) {
            y = box.max.y;
            hitGround = true;
          }
        }
      }

      return { x, y, z, hitGround };
    };

    // Main Game Animation Loop
    let lastTime = performance.now();
    let networkSendTimer = 0;
    let animFrameId: number;

    const gameLoop = (time: number) => {
      animFrameId = requestAnimationFrame(gameLoop);

      const delta = Math.min(0.06, (time - lastTime) / 1000);
      lastTime = time;

      // Dash cooldown calculation
      const elapsedSinceDash = Date.now() - dashLastUsedRef.current;
      const cooldownPct = Math.max(0, 1 - elapsedSinceDash / DASH_COOLDOWN_MS);
      onDashCooldownChangeRef.current(cooldownPct);

      // Handle touch triggers
      if (touchJumpRef.current) {
        triggerJumpRef.current();
        touchJumpRef.current = false;
      }
      if (touchDashRef.current) {
        triggerDashRef.current();
        touchDashRef.current = false;
      }
      if (touchFireRef.current) {
        triggerShootRef.current();
      }

      // Automatic fire if holding left mouse button with rifle
      if (keysRef.current.shoot && currentWeaponRef.current === 'rifle') {
        triggerShootRef.current();
      }

      // 1. Calculate Movement Vector
      const eyeHeight = isCrouchingRef.current ? 1.1 : 1.7;
      const moveSpeed = isCrouchingRef.current ? 5.5 : 9.5;

      let moveX = 0;
      let moveZ = 0;

      if (keysRef.current.forward) moveZ -= 1;
      if (keysRef.current.backward) moveZ += 1;
      if (keysRef.current.left) moveX -= 1;
      if (keysRef.current.right) moveX += 1;

      // Joystick touch inputs
      if (touchJoystickRef.current.active) {
        const dx = touchJoystickRef.current.currentX - touchJoystickRef.current.startX;
        const dy = touchJoystickRef.current.currentY - touchJoystickRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          moveX = dx / Math.max(50, dist);
          moveZ = dy / Math.max(50, dist);
        }
      }

      const inputLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (inputLen > 0) {
        moveX /= inputLen;
        moveZ /= inputLen;
      }

      // Rotate input by yaw
      const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
      const rightDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);

      const targetVelX = (rightDir.x * moveX + forwardDir.x * -moveZ) * moveSpeed;
      const targetVelZ = (rightDir.z * moveX + forwardDir.z * -moveZ) * moveSpeed;

      // Friction & Acceleration
      const accel = isGroundedRef.current ? 18 : 6;
      velRef.current.x += (targetVelX - velRef.current.x) * accel * delta;
      velRef.current.z += (targetVelZ - velRef.current.z) * accel * delta;

      // Gravity
      velRef.current.y -= 28 * delta;

      // Candidate position
      const nextPos = posRef.current.clone();
      nextPos.x += velRef.current.x * delta;
      nextPos.y += velRef.current.y * delta;
      nextPos.z += velRef.current.z * delta;

      // Collision Detection
      const col = checkCollision(nextPos, 0.4, eyeHeight);
      posRef.current.x = col.x;
      posRef.current.y = col.y;
      posRef.current.z = col.z;

      if (col.hitGround) {
        velRef.current.y = 0;
        isGroundedRef.current = true;
      } else {
        isGroundedRef.current = false;
      }

      // Check Jump Pads
      mapData.jumpPads.forEach(pad => {
        const dist = Math.sqrt((posRef.current.x - pad.position.x) ** 2 + (posRef.current.z - pad.position.z) ** 2);
        if (dist < 1.5 && Math.abs(posRef.current.y - pad.position.y) < 1.2) {
          velRef.current.y = pad.boostForce;
          isGroundedRef.current = false;
          sound.playJumpPad();
        }
      });

      // Check Sky Parkour Checkpoints
      if (roomRef.current.mode === 'PARKOUR' && mapData.checkpoints) {
        mapData.checkpoints.forEach(cp => {
          const d = posRef.current.distanceTo(cp.position);
          if (d < cp.radius) {
            const currentMe = roomRef.current.players[currentUserIdRef.current];
            const currentCp = currentMe?.parkourCheckpoint || 0;
            if (cp.id > currentCp) {
              onSendMessageRef.current({
                type: 'parkour_checkpoint',
                checkpoint: cp.id,
                time: Date.now() - roomRef.current.createdAt,
              });
              sound.playKill(true);
            }
          }
        });
      }

      // Void death check
      if (posRef.current.y < mapData.deathY) {
        const safeSpawn = spawns[0] || new THREE.Vector3(0, 3, 0);
        posRef.current.copy(safeSpawn);
        velRef.current.set(0, 0, 0);
        sound.playHurt();
      }

      // Check local player respawn transition
      const currentMe = roomRef.current.players[currentUserIdRef.current];
      if (currentMe) {
        if (!wasAliveRef.current && currentMe.isAlive) {
          posRef.current.set(currentMe.x, currentMe.y, currentMe.z);
          velRef.current.set(0, 0, 0);
        }
        wasAliveRef.current = currentMe.isAlive;
      }

      // 2. Camera Updates
      camera.position.set(posRef.current.x, posRef.current.y + eyeHeight, posRef.current.z);
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;

      // Smooth ADS zoom FOV
      const baseFov = settingsRef.current.fov || 85;
      const targetFov = isAimingDownSightsRef.current ? (WEAPONS[currentWeaponRef.current].zoomFov || 45) : baseFov;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.25);
      camera.updateProjectionMatrix();

      // Viewmodel bobbing & recoil lerp
      if (viewmodel) {
        const isMoving = inputLen > 0.1 && isGroundedRef.current;
        if (isMoving) {
          walkBobTimerRef.current += delta * 10;
          const bobX = Math.cos(walkBobTimerRef.current * 0.5) * 0.015;
          const bobY = Math.sin(walkBobTimerRef.current) * 0.015;
          viewmodel.position.x = 0.24 + bobX;
          viewmodel.position.y = -0.22 + bobY;
        } else {
          viewmodel.position.x = THREE.MathUtils.lerp(viewmodel.position.x, 0.24, 0.1);
          viewmodel.position.y = THREE.MathUtils.lerp(viewmodel.position.y, -0.22, 0.1);
        }
        viewmodel.position.z = THREE.MathUtils.lerp(viewmodel.position.z, -0.45, 0.15);
      }

      // 3. Update Other Players and Bots Voxel Meshes
      const currentPlayers = roomRef.current.players;
      const charsMap = otherCharactersRef.current;

      (Object.values(currentPlayers) as PlayerData[]).forEach(p => {
        if (p.id === currentUserIdRef.current) return;

        let char = charsMap.get(p.id);
        if (!char) {
          char = new VoxelCharacter(p, false);
          scene.add(char.group);
          charsMap.set(p.id, char);
        }

        char.targetPos.set(p.x, p.y, p.z);
        char.targetRotY = p.rotY;
        char.targetPitch = p.pitch;
        char.group.visible = p.isAlive;
        char.updateNameplate(p.name, p.hp, p.maxHp, p.team);
        char.setWeapon(p.currentWeapon);

        const isOtherMoving = char.group.position.distanceTo(char.targetPos) > 0.05;
        char.update(delta, isOtherMoving, !!p.isShooting, !!p.isCrouching);
      });

      // Remove players/bots who left
      charsMap.forEach((char, pId) => {
        if (!currentPlayers[pId]) {
          scene.remove(char.group);
          char.destroy();
          charsMap.delete(pId);
        }
      });

      // 4. Send position update to server at ~20Hz
      networkSendTimer += delta;
      if (networkSendTimer >= 0.05) {
        networkSendTimer = 0;
        onSendMessageRef.current({
          type: 'player_move',
          x: posRef.current.x,
          y: posRef.current.y,
          z: posRef.current.z,
          rotY: yawRef.current,
          pitch: pitchRef.current,
          isDashing: elapsedSinceDash < 400,
          isCrouching: isCrouchingRef.current,
        });
      }

      // Render
      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();

      otherCharactersRef.current.forEach(char => {
        scene.remove(char.group);
        char.destroy();
      });
      otherCharactersRef.current.clear();

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [room.mapId]);

  // Touch screen swipe to look
  const handleTouchStartLook = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchLookRef.current = {
      lastX: touch.clientX,
      lastY: touch.clientY,
      active: true,
    };
  };

  const handleTouchMoveLook = (e: React.TouchEvent) => {
    if (!touchLookRef.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchLookRef.current.lastX;
    const dy = touch.clientY - touchLookRef.current.lastY;
    touchLookRef.current.lastX = touch.clientX;
    touchLookRef.current.lastY = touch.clientY;

    const sens = 0.004 * (settingsRef.current.mouseSensitivity || 1.0);
    yawRef.current -= dx * sens;
    const invert = settingsRef.current.invertY ? -1 : 1;
    pitchRef.current -= dy * sens * invert;
    pitchRef.current = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitchRef.current));
  };

  const handleTouchEndLook = () => {
    touchLookRef.current.active = false;
  };

  // Touch joystick touch handlers
  const handleTouchStartJoy = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchJoystickRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      active: true,
    };
  };

  const handleTouchMoveJoy = (e: React.TouchEvent) => {
    if (!touchJoystickRef.current.active) return;
    const touch = e.touches[0];
    touchJoystickRef.current.currentX = touch.clientX;
    touchJoystickRef.current.currentY = touch.clientY;
  };

  const handleTouchEndJoy = () => {
    touchJoystickRef.current.active = false;
  };

  return (
    <div
      id="game-canvas-container"
      ref={containerRef}
      onClick={requestPointerLock}
      className="relative w-full h-full select-none overflow-hidden cursor-crosshair"
    >
      {/* Click to lock mouse prompt (Desktop only) */}
      {!isMobile && !isPointerLocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 text-center shadow-2xl max-w-sm pointer-events-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-black">
              🖱️
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Clique para Controlar</h3>
            <p className="text-slate-400 text-xs mb-4">
              Bloqueie o cursor para mirar em 360°, atirar e movimentar livremente pelo mapa.
            </p>
            <button
              onClick={requestPointerLock}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Iniciar Partida
            </button>
          </div>
        </div>
      )}

      {/* Mobile Touch Overlay */}
      {isMobile && (
        <div className="absolute inset-0 pointer-events-auto flex">
          {/* Left half: Virtual Movement Joystick */}
          <div
            className="w-1/2 h-full touch-none relative"
            onTouchStart={handleTouchStartJoy}
            onTouchMove={handleTouchMoveJoy}
            onTouchEnd={handleTouchEndJoy}
          >
            <div className="absolute bottom-10 left-10 w-28 h-28 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-amber-500/40 border border-amber-400/60" />
            </div>
          </div>

          {/* Right half: Touch swipe to look */}
          <div
            className="w-1/2 h-full touch-none"
            onTouchStart={handleTouchStartLook}
            onTouchMove={handleTouchMoveLook}
            onTouchEnd={handleTouchEndLook}
          />
        </div>
      )}
    </div>
  );
};
