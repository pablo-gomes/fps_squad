import * as THREE from 'three';
import { PlayerData, WeaponType } from '../types/game';

export class VoxelCharacter {
  public group: THREE.Group;
  public head: THREE.Mesh;
  public torso: THREE.Mesh;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public weaponMesh: THREE.Group;
  public nameplate: THREE.Sprite;
  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public targetRotY: number = 0;
  public targetPitch: number = 0;
  public walkCycle: number = 0;
  public isLocal: boolean = false;
  private canvasCtx: CanvasRenderingContext2D;
  private nameplateTex: THREE.CanvasTexture;

  constructor(player: PlayerData, isLocal: boolean = false) {
    this.isLocal = isLocal;
    this.group = new THREE.Group();

    // Determine colors
    const teamColor = player.team === 'blue' ? 0x3b82f6 : player.team === 'red' ? 0xef4444 : 0x10b981;
    const bodyColor = player.color ? parseInt(player.color.replace('#', '0x'), 16) : teamColor;

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 }); // skin tone
    const shirtMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const visorMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.4 });

    // 1. Torso (0.6w, 0.75h, 0.35d)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.75, 0.35);
    this.torso = new THREE.Mesh(torsoGeo, shirtMat);
    this.torso.position.y = 0.95;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // 2. Head (0.45w, 0.45h, 0.45d)
    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.6;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Head Visor / Goggles
    const visorGeo = new THREE.BoxGeometry(0.46, 0.12, 0.2);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.05, 0.16);
    this.head.add(visor);

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);

    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.42, 0.9, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.42, 0.9, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // 4. Weapon attached to right arm
    this.weaponMesh = new THREE.Group();
    this.buildWeaponMesh('rifle');
    this.weaponMesh.position.set(0, -0.25, 0.3);
    this.rightArm.add(this.weaponMesh);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);

    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.16, 0.325, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.16, 0.325, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // 6. 3D Floating Nameplate and HP bar (Billboard)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    this.canvasCtx = canvas.getContext('2d')!;
    this.nameplateTex = new THREE.CanvasTexture(canvas);
    this.nameplateTex.magFilter = THREE.LinearFilter;
    this.nameplateTex.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({ map: this.nameplateTex, transparent: true, depthTest: false });
    this.nameplate = new THREE.Sprite(spriteMat);
    this.nameplate.position.set(0, 2.1, 0);
    this.nameplate.scale.set(1.6, 0.5, 1);
    this.group.add(this.nameplate);

    this.updateNameplate(player.name, player.hp, player.maxHp, player.team);

    // If local player, hide third-person body from camera to not block view
    if (isLocal) {
      this.nameplate.visible = false;
      this.group.visible = false;
    }
  }

  public setWeapon(weapon: WeaponType) {
    // Clear old weapon parts
    while (this.weaponMesh.children.length > 0) {
      this.weaponMesh.remove(this.weaponMesh.children[0]);
    }
    this.buildWeaponMesh(weapon);
  }

  private buildWeaponMesh(weapon: WeaponType) {
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });

    if (weapon === 'rifle') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.6), darkMat);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), metalMat);
      barrel.position.z = 0.4;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.12), accentMat);
      mag.position.set(0, -0.12, 0.05);
      this.weaponMesh.add(body, barrel, mag);
    } else if (weapon === 'shotgun') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.5), darkMat);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), metalMat);
      barrel.position.z = 0.35;
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.16), accentMat);
      pump.position.set(0, -0.06, 0.2);
      this.weaponMesh.add(body, barrel, pump);
    } else if (weapon === 'sniper') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.8), darkMat);
      const longBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), metalMat);
      longBarrel.position.z = 0.6;
      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), metalMat);
      scope.position.set(0, 0.11, 0.1);
      this.weaponMesh.add(body, longBarrel, scope);
    } else if (weapon === 'knife') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), darkMat);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.3), metalMat);
      blade.position.z = 0.2;
      this.weaponMesh.add(handle, blade);
    }
  }

  public updateNameplate(name: string, hp: number, maxHp: number, team: string) {
    const ctx = this.canvasCtx;
    const w = 256;
    const h = 80;
    ctx.clearRect(0, 0, w, h);

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.roundRect(10, 5, w - 20, h - 10, 8);
    ctx.fill();

    // Team badge color
    const teamBadge = team === 'blue' ? '#3b82f6' : team === 'red' ? '#ef4444' : '#10b981';
    ctx.fillStyle = teamBadge;
    ctx.beginPath();
    ctx.arc(28, 28, 7, 0, Math.PI * 2);
    ctx.fill();

    // Name text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Chakra Petch, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name.length > 14 ? name.substring(0, 13) + '..' : name, 44, 34);

    // HP Bar background
    ctx.fillStyle = '#334155';
    ctx.fillRect(20, 48, w - 40, 14);

    // HP Bar fill
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(20, 48, (w - 40) * pct, 14);

    // Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 48, w - 40, 14);

    this.nameplateTex.needsUpdate = true;
  }

  public update(delta: number, isMoving: boolean, isShooting: boolean, isCrouching: boolean) {
    // Lerp position & rotation towards target
    this.group.position.lerp(this.targetPos, 0.25);

    // Lerp Y rotation
    let rotDiff = this.targetRotY - this.group.rotation.y;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    this.group.rotation.y += rotDiff * 0.25;

    // Pitch head
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, this.targetPitch, 0.25);

    // Crouching scale
    const targetScaleY = isCrouching ? 0.7 : 1.0;
    this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, targetScaleY, 0.2);

    // Walk animation (swing arms & legs)
    if (isMoving) {
      this.walkCycle += delta * 12;
      const swing = Math.sin(this.walkCycle) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      if (!isShooting) {
        this.rightArm.rotation.x = swing * 0.8 - 0.5; // Aim forward
      }
    } else {
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 0.2);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 0.2);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 0.2);
      if (!isShooting) {
        this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -0.4, 0.2);
      }
    }

    // Shooting recoil animation
    if (isShooting) {
      this.rightArm.rotation.x = -0.9;
    }
  }

  public destroy() {
    this.nameplateTex.dispose();
    this.group.traverse(child => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }
}
