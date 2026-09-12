import * as THREE from 'three';

// Procedural 16x16 / 32x32 voxel textures generated via canvas for optimal performance and pure voxel aesthetic

const textureCache: Record<string, THREE.CanvasTexture> = {};

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function getVoxelTexture(name: string): THREE.CanvasTexture {
  if (textureCache[name]) {
    return textureCache[name];
  }

  let tex: THREE.CanvasTexture;

  switch (name) {
    case 'stone_brick':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(0, 0, w, h);
        // Mortar lines
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, 15, w, 2);
        ctx.fillRect(0, 31, w, 2);
        ctx.fillRect(15, 0, 2, 16);
        ctx.fillRect(31, 0, 2, 16);
        ctx.fillRect(7, 16, 2, 16);
        ctx.fillRect(23, 16, 2, 16);

        // Subtle noise
        for (let i = 0; i < 40; i++) {
          const px = Math.floor(Math.random() * w);
          const py = Math.floor(Math.random() * h);
          ctx.fillStyle = Math.random() > 0.5 ? '#9ca3af' : '#4b5563';
          ctx.fillRect(px, py, 2, 2);
        }
      });
      break;

    case 'grass_top':
      tex = createCanvasTexture(16, 16, (ctx, w, h) => {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) {
          const px = Math.floor(Math.random() * w);
          const py = Math.floor(Math.random() * h);
          ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#86efac';
          ctx.fillRect(px, py, 1, 1);
        }
      });
      break;

    case 'crate':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, w, h);
        // Border
        ctx.fillStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
        // Cross
        ctx.beginPath();
        ctx.moveTo(3, 3);
        ctx.lineTo(w - 3, h - 3);
        ctx.moveTo(w - 3, 3);
        ctx.lineTo(3, h - 3);
        ctx.stroke();
        // Inner fill
        ctx.fillStyle = '#d97706';
        ctx.fillRect(6, 6, 8, 8);
        ctx.fillRect(18, 6, 8, 8);
        ctx.fillRect(6, 18, 8, 8);
        ctx.fillRect(18, 18, 8, 8);
      });
      break;

    case 'sand':
      tex = createCanvasTexture(16, 16, (ctx, w, h) => {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 20; i++) {
          const px = Math.floor(Math.random() * w);
          const py = Math.floor(Math.random() * h);
          ctx.fillStyle = Math.random() > 0.5 ? '#f59e0b' : '#fde68a';
          ctx.fillRect(px, py, 1, 1);
        }
      });
      break;

    case 'neon_cyber':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        // Glow center dot
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(14, 14, 4, 4);
      });
      break;

    case 'jump_pad':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, w - 4, h - 4);

        // Glowing up-arrows
        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.moveTo(16, 6);
        ctx.lineTo(8, 16);
        ctx.lineTo(13, 16);
        ctx.lineTo(13, 26);
        ctx.lineTo(19, 26);
        ctx.lineTo(19, 16);
        ctx.lineTo(24, 16);
        ctx.closePath();
        ctx.fill();
      });
      break;

    case 'metal_panel':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#334155';
        ctx.strokeRect(1, 1, w - 2, h - 2);
        // Rivets in corners
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(3, 3, 2, 2);
        ctx.fillRect(w - 5, 3, 2, 2);
        ctx.fillRect(3, h - 5, 2, 2);
        ctx.fillRect(w - 5, h - 5, 2, 2);
      });
      break;

    case 'parkour_platform':
      tex = createCanvasTexture(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
        ctx.fillStyle = '#ffedd5';
        ctx.fillRect(6, 6, 20, 20);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(10, 10, 12, 12);
      });
      break;

    default:
      tex = createCanvasTexture(16, 16, (ctx, w, h) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 0, w, h);
      });
  }

  textureCache[name] = tex;
  return tex;
}
