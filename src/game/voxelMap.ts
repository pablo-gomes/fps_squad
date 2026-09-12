import * as THREE from 'three';
import { getVoxelTexture } from '../services/textures';

export interface VoxelBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface JumpPad {
  position: THREE.Vector3;
  boostForce: number;
}

export interface Checkpoint {
  id: number;
  position: THREE.Vector3;
  radius: number;
}

export interface MapData {
  id: string;
  name: string;
  group: THREE.Group;
  colliders: VoxelBox[];
  jumpPads: JumpPad[];
  spawns: {
    blue: THREE.Vector3[];
    red: THREE.Vector3[];
    ffa: THREE.Vector3[];
  };
  pointZone?: {
    position: THREE.Vector3;
    radius: number;
  };
  checkpoints?: Checkpoint[];
  deathY: number;
}

// Helper to create a textured voxel cube
function createBlock(
  group: THREE.Group,
  colliders: VoxelBox[],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  textureName: string,
  repeatU: number = 1,
  repeatV: number = 1
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const tex = getVoxelTexture(textureName).clone();
  tex.repeat.set(repeatU, repeatV);
  tex.needsUpdate = true;

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  colliders.push({
    min: new THREE.Vector3(x, y, z),
    max: new THREE.Vector3(x + w, y + h, z + d),
  });

  return mesh;
}

export function buildMap(mapId: 'castle' | 'desert' | 'neon' | 'parkour'): MapData {
  const group = new THREE.Group();
  const colliders: VoxelBox[] = [];
  const jumpPads: JumpPad[] = [];

  // 1. CASTLE BLOCKS
  if (mapId === 'castle') {
    // Floor
    createBlock(group, colliders, -30, -2, -30, 60, 2, 60, 'grass_top', 15, 15);

    // Castle boundary walls
    createBlock(group, colliders, -28, 0, -28, 56, 6, 2, 'stone_brick', 14, 2);
    createBlock(group, colliders, -28, 0, 26, 56, 6, 2, 'stone_brick', 14, 2);
    createBlock(group, colliders, -28, 0, -26, 2, 6, 52, 'stone_brick', 2, 13);
    createBlock(group, colliders, 26, 0, -26, 2, 6, 52, 'stone_brick', 2, 13);

    // Corner towers (high platforms)
    const towerCoords = [
      [-26, -26],
      [18, -26],
      [-26, 18],
      [18, 18],
    ];
    towerCoords.forEach(([tx, tz]) => {
      createBlock(group, colliders, tx, 0, tz, 8, 10, 8, 'stone_brick', 4, 5);
      // Tower parapets
      createBlock(group, colliders, tx, 10, tz, 8, 1.5, 1, 'stone_brick', 4, 1);
      createBlock(group, colliders, tx, 10, tz + 7, 8, 1.5, 1, 'stone_brick', 4, 1);
      createBlock(group, colliders, tx, 10, tz + 1, 1, 1.5, 6, 'stone_brick', 1, 3);
      createBlock(group, colliders, tx + 7, 10, tz + 1, 1, 1.5, 6, 'stone_brick', 1, 3);
    });

    // Central courtyard bridge / structure
    createBlock(group, colliders, -6, 0, -6, 12, 4, 12, 'stone_brick', 4, 2);
    createBlock(group, colliders, -4, 4, -4, 8, 0.5, 8, 'metal_panel', 2, 2);

    // Walkways connecting towers to center
    createBlock(group, colliders, -26, 4, -2, 20, 1, 4, 'stone_brick', 5, 1);
    createBlock(group, colliders, 6, 4, -2, 20, 1, 4, 'stone_brick', 5, 1);

    // Crates and tactical covers
    createBlock(group, colliders, -12, 0, -14, 3, 3, 3, 'crate', 1, 1);
    createBlock(group, colliders, -15, 0, -14, 3, 2, 2, 'crate', 1, 1);
    createBlock(group, colliders, 10, 0, 12, 3, 3, 3, 'crate', 1, 1);
    createBlock(group, colliders, 12, 0, 9, 2, 2, 2, 'crate', 1, 1);
    createBlock(group, colliders, -14, 0, 10, 4, 2.5, 2, 'stone_brick', 2, 1);
    createBlock(group, colliders, 12, 0, -12, 4, 2.5, 2, 'stone_brick', 2, 1);

    // Jump pads launching players onto towers or center bridge
    jumpPads.push({ position: new THREE.Vector3(-18, 0, 0), boostForce: 16 });
    jumpPads.push({ position: new THREE.Vector3(18, 0, 0), boostForce: 16 });

    // Visual jump pads
    jumpPads.forEach(pad => {
      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.3, 2.5),
        new THREE.MeshLambertMaterial({ map: getVoxelTexture('jump_pad'), emissive: 0x9333ea, emissiveIntensity: 0.3 })
      );
      padMesh.position.set(pad.position.x, 0.15, pad.position.z);
      group.add(padMesh);
    });

    return {
      id: 'castle',
      name: 'Castle Blocks',
      group,
      colliders,
      jumpPads,
      spawns: {
        blue: [new THREE.Vector3(-20, 1, -20), new THREE.Vector3(-15, 1, -22), new THREE.Vector3(-22, 1, -15)],
        red: [new THREE.Vector3(20, 1, 20), new THREE.Vector3(15, 1, 22), new THREE.Vector3(22, 1, 15)],
        ffa: [
          new THREE.Vector3(-20, 1, -20),
          new THREE.Vector3(20, 1, 20),
          new THREE.Vector3(-20, 1, 20),
          new THREE.Vector3(20, 1, -20),
          new THREE.Vector3(0, 5, 0),
          new THREE.Vector3(-10, 1, 0),
          new THREE.Vector3(10, 1, 0),
        ],
      },
      pointZone: {
        position: new THREE.Vector3(0, 4.5, 0),
        radius: 5,
      },
      deathY: -10,
    };
  }

  // 2. DESERT DUST
  if (mapId === 'desert') {
    // Sand ground
    createBlock(group, colliders, -35, -2, -35, 70, 2, 70, 'sand', 18, 18);

    // Outer canyon walls
    createBlock(group, colliders, -32, 0, -32, 64, 8, 3, 'stone_brick', 16, 3);
    createBlock(group, colliders, -32, 0, 29, 64, 8, 3, 'stone_brick', 16, 3);
    createBlock(group, colliders, -32, 0, -29, 3, 8, 58, 'stone_brick', 3, 15);
    createBlock(group, colliders, 29, 0, -29, 3, 8, 58, 'stone_brick', 3, 15);

    // Central Arch / Bridge
    createBlock(group, colliders, -5, 0, -12, 10, 5, 4, 'stone_brick', 4, 2);
    createBlock(group, colliders, -5, 0, 8, 10, 5, 4, 'stone_brick', 4, 2);
    createBlock(group, colliders, -4, 5, -8, 8, 1, 16, 'stone_brick', 3, 5);

    // Maze / covers
    createBlock(group, colliders, -18, 0, -18, 8, 3.5, 3, 'stone_brick', 3, 2);
    createBlock(group, colliders, -18, 0, -15, 3, 3.5, 10, 'stone_brick', 2, 4);
    createBlock(group, colliders, 12, 0, 8, 8, 3.5, 3, 'stone_brick', 3, 2);
    createBlock(group, colliders, 17, 0, 11, 3, 3.5, 10, 'stone_brick', 2, 4);

    // Crates
    createBlock(group, colliders, -8, 0, 2, 4, 3, 4, 'crate', 1, 1);
    createBlock(group, colliders, 6, 0, -4, 3, 2, 3, 'crate', 1, 1);
    createBlock(group, colliders, 0, 6, -1, 2, 2, 2, 'crate', 1, 1);

    // Sniper tower
    createBlock(group, colliders, -25, 0, 18, 6, 9, 6, 'stone_brick', 3, 4);
    createBlock(group, colliders, 19, 0, -24, 6, 9, 6, 'stone_brick', 3, 4);

    jumpPads.push({ position: new THREE.Vector3(-18, 0, 21), boostForce: 16 });
    jumpPads.push({ position: new THREE.Vector3(14, 0, -21), boostForce: 16 });

    jumpPads.forEach(pad => {
      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.3, 2.5),
        new THREE.MeshLambertMaterial({ map: getVoxelTexture('jump_pad'), emissive: 0xd97706, emissiveIntensity: 0.3 })
      );
      padMesh.position.set(pad.position.x, 0.15, pad.position.z);
      group.add(padMesh);
    });

    return {
      id: 'desert',
      name: 'Desert Dust',
      group,
      colliders,
      jumpPads,
      spawns: {
        blue: [new THREE.Vector3(-24, 1, -22), new THREE.Vector3(-20, 1, -25)],
        red: [new THREE.Vector3(24, 1, 22), new THREE.Vector3(20, 1, 25)],
        ffa: [
          new THREE.Vector3(-24, 1, -22),
          new THREE.Vector3(24, 1, 22),
          new THREE.Vector3(-24, 1, 22),
          new THREE.Vector3(24, 1, -22),
          new THREE.Vector3(0, 7, 0),
          new THREE.Vector3(-10, 1, -5),
          new THREE.Vector3(10, 1, 5),
        ],
      },
      pointZone: {
        position: new THREE.Vector3(0, 6, 0),
        radius: 4.5,
      },
      deathY: -10,
    };
  }

  // 3. NEON CYBER
  if (mapId === 'neon') {
    // Glowing grid floor
    createBlock(group, colliders, -25, -2, -25, 50, 2, 50, 'neon_cyber', 10, 10);

    // Glowing boundary glass/walls
    createBlock(group, colliders, -24, 0, -24, 48, 4, 1, 'metal_panel', 12, 1);
    createBlock(group, colliders, -24, 0, 23, 48, 4, 1, 'metal_panel', 12, 1);
    createBlock(group, colliders, -24, 0, -23, 1, 4, 46, 'metal_panel', 1, 12);
    createBlock(group, colliders, 23, 0, -23, 1, 4, 46, 'metal_panel', 1, 12);

    // Cyber Pillars & Platforms
    createBlock(group, colliders, -12, 0, -12, 4, 7, 4, 'metal_panel', 1, 3);
    createBlock(group, colliders, 8, 0, -12, 4, 7, 4, 'metal_panel', 1, 3);
    createBlock(group, colliders, -12, 0, 8, 4, 7, 4, 'metal_panel', 1, 3);
    createBlock(group, colliders, 8, 0, 8, 4, 7, 4, 'metal_panel', 1, 3);

    // Elevated center ring
    createBlock(group, colliders, -6, 4, -6, 12, 0.8, 12, 'neon_cyber', 4, 4);

    // Elevated bridges
    createBlock(group, colliders, -12, 6.5, -3, 6, 0.5, 6, 'metal_panel', 2, 2);
    createBlock(group, colliders, 6, 6.5, -3, 6, 0.5, 6, 'metal_panel', 2, 2);

    jumpPads.push({ position: new THREE.Vector3(0, 0, -16), boostForce: 18 });
    jumpPads.push({ position: new THREE.Vector3(0, 0, 16), boostForce: 18 });

    jumpPads.forEach(pad => {
      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.3, 2.5),
        new THREE.MeshLambertMaterial({ map: getVoxelTexture('jump_pad'), emissive: 0x06b6d4, emissiveIntensity: 0.5 })
      );
      padMesh.position.set(pad.position.x, 0.15, pad.position.z);
      group.add(padMesh);
    });

    return {
      id: 'neon',
      name: 'Neon Cyber',
      group,
      colliders,
      jumpPads,
      spawns: {
        blue: [new THREE.Vector3(-18, 1, -18), new THREE.Vector3(-15, 1, -18)],
        red: [new THREE.Vector3(18, 1, 18), new THREE.Vector3(15, 1, 18)],
        ffa: [
          new THREE.Vector3(-18, 1, -18),
          new THREE.Vector3(18, 1, 18),
          new THREE.Vector3(-18, 1, 18),
          new THREE.Vector3(18, 1, -18),
          new THREE.Vector3(0, 5, 0),
          new THREE.Vector3(0, 1, -10),
          new THREE.Vector3(0, 1, 10),
        ],
      },
      pointZone: {
        position: new THREE.Vector3(0, 4.8, 0),
        radius: 4,
      },
      deathY: -10,
    };
  }

  // 4. SKY PARKOUR
  // A linear obstacle course in the sky where players jump between voxel platforms with checkpoints
  const checkpoints: Checkpoint[] = [];

  // Start Platform (Checkpoint 0)
  createBlock(group, colliders, -5, 0, -5, 10, 2, 10, 'parkour_platform', 2, 2);
  checkpoints.push({ id: 0, position: new THREE.Vector3(0, 2.5, 0), radius: 4 });

  // Section 1: Stepping stones
  createBlock(group, colliders, -2, 1, 8, 4, 1, 4, 'stone_brick', 1, 1);
  createBlock(group, colliders, -2, 2, 16, 4, 1, 4, 'stone_brick', 1, 1);
  createBlock(group, colliders, 4, 3, 22, 4, 1, 4, 'stone_brick', 1, 1);
  createBlock(group, colliders, 12, 4, 22, 4, 1, 4, 'stone_brick', 1, 1);

  // Checkpoint 1 Island
  createBlock(group, colliders, 20, 5, 18, 8, 1.5, 8, 'parkour_platform', 2, 2);
  checkpoints.push({ id: 1, position: new THREE.Vector3(24, 7, 22), radius: 3.5 });

  // Section 2: Narrow beams and high jumps
  createBlock(group, colliders, 22, 6, 8, 4, 1, 6, 'crate', 1, 1);
  createBlock(group, colliders, 22, 7.5, -2, 3, 1, 6, 'crate', 1, 1);
  createBlock(group, colliders, 16, 9, -10, 4, 1, 4, 'metal_panel', 1, 1);

  // Jump pad to High Tower
  jumpPads.push({ position: new THREE.Vector3(8, 9, -10), boostForce: 19 });
  createBlock(group, colliders, 6, 8.5, -12, 4, 0.5, 4, 'stone_brick', 1, 1);

  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.3, 2.5),
    new THREE.MeshLambertMaterial({ map: getVoxelTexture('jump_pad'), emissive: 0xf97316, emissiveIntensity: 0.5 })
  );
  padMesh.position.set(8, 9.15, -10);
  group.add(padMesh);

  // Checkpoint 2 Island (Sky High)
  createBlock(group, colliders, -4, 18, -20, 8, 1.5, 8, 'parkour_platform', 2, 2);
  checkpoints.push({ id: 2, position: new THREE.Vector3(0, 20, -16), radius: 3.5 });

  // Section 3: Final spiral to Victory Flag
  createBlock(group, colliders, -12, 19, -14, 4, 1, 4, 'stone_brick', 1, 1);
  createBlock(group, colliders, -20, 20.5, -14, 4, 1, 4, 'stone_brick', 1, 1);
  createBlock(group, colliders, -26, 22, -8, 4, 1, 4, 'metal_panel', 1, 1);
  createBlock(group, colliders, -26, 23.5, 0, 4, 1, 4, 'metal_panel', 1, 1);

  // Final Victory Platform (Checkpoint 3 - Goal)
  createBlock(group, colliders, -28, 25, 8, 10, 2, 10, 'parkour_platform', 3, 3);
  checkpoints.push({ id: 3, position: new THREE.Vector3(-23, 27.5, 13), radius: 4 });

  // Victory Gold Trophy / Flag Pole
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 5, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.3 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(-23, 29.5, 13);
  group.add(pole);

  // Flag mesh
  const flagGeo = new THREE.BoxGeometry(1.5, 1, 0.1);
  const flagMat = new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.3 });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(-22.2, 31, 13);
  group.add(flag);

  return {
    id: 'parkour',
    name: 'Sky Parkour',
    group,
    colliders,
    jumpPads,
    checkpoints,
    spawns: {
      blue: [new THREE.Vector3(0, 2.5, 0)],
      red: [new THREE.Vector3(0, 2.5, 0)],
      ffa: [new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(1, 2.5, 1), new THREE.Vector3(-1, 2.5, -1)],
    },
    deathY: -5,
  };
}
