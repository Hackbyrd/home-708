import * as THREE from 'three';

// Local, repeatable material samples. Dimensions below are in plan-space feet.
// Color and relief are separate so dark grain does not become a deep crevice.
function sample(draw, seed = 708, size = 512) {
  const color = document.createElement('canvas');
  const height = document.createElement('canvas');
  color.width = color.height = height.width = height.height = size;
  const c = color.getContext('2d'), h = height.getContext('2d');
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  draw(c, h, size, random);
  const texture = (canvas, colorSpace) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = colorSpace;
    return t;
  };
  return { map: texture(color, THREE.SRGBColorSpace), bumpMap: texture(height, THREE.NoColorSpace) };
}

function masonry(kind) {
  return sample((c, h, s, random) => {
    c.fillStyle = kind === 'brick' ? '#c5c1b7' : kind === 'slate' ? '#25292c' : '#8c877f';
    c.fillRect(0, 0, s, s);
    h.fillStyle = '#303030'; h.fillRect(0, 0, s, s);
    const rows = kind === 'brick' ? 16 : 8, cols = kind === 'brick' ? 8 : 4;
    const bh = s / rows, bw = s / cols;
    for (let row = 0; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * bw + (row % 2) * bw / 2, y = row * bh;
        const v = random();
        c.fillStyle = kind === 'brick' ? `hsl(42 15% ${89 + v * 6}%)`
          : kind === 'slate' ? `hsl(212 9% ${18 + v * 6}%)` : `hsl(35 8% ${48 + v * 20}%)`;
        c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        const relief = h.createLinearGradient(0, y, 0, y + bh);
        relief.addColorStop(0, '#555'); relief.addColorStop(0.14, '#ddd');
        relief.addColorStop(0.85, '#c8c8c8'); relief.addColorStop(1, '#555');
        h.fillStyle = relief; h.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(x + 2, y + 2, bw - 4, 1);
      }
    }
    for (let i = 0; i < 28000; i++) {
      const x = random() * s, y = random() * s, a = random();
      c.fillStyle = `rgba(65,59,51,${a * 0.09})`; c.fillRect(x, y, 1.5, 1);
      h.fillStyle = `rgba(50,50,50,${a * 0.15})`; h.fillRect(x, y, 1.5, 1);
    }
  }, 708 + kind.length);
}

function wood(planks) {
  return sample((c, h, s, random) => {
    c.fillStyle = '#ded0b8'; c.fillRect(0, 0, s, s);
    h.fillStyle = '#b8b8b8'; h.fillRect(0, 0, s, s);
    const count = planks ? 8 : 1, width = s / count;
    for (let i = 0; i < count; i++) {
      const x = i * width;
      c.fillStyle = `hsl(34 31% ${70 + random() * 12}%)`; c.fillRect(x, 0, width, s);
      for (let j = 0; j < (planks ? 65 : 450); j++) {
        const gx = x + random() * width, phase = random() * Math.PI * 2;
        c.strokeStyle = `rgba(86,54,28,${0.025 + random() * 0.13})`;
        c.lineWidth = 0.4 + random() * 0.7; c.beginPath();
        for (let y = 0; y <= s; y += 4) {
          const xx = gx + Math.sin(y / s * Math.PI * 2 + phase) * (planks ? 2 : 7)
            + Math.sin(y / s * Math.PI * 6 + phase) * 0.7;
          if (y === 0) c.moveTo(xx, y); else c.lineTo(xx, y);
        }
        c.stroke();
      }
      if (planks) {
        const joint = (i * 173) % s;
        c.fillStyle = 'rgba(54,34,23,.4)'; c.fillRect(x, 0, 1, s); c.fillRect(x, joint, width, 1.2);
        h.fillStyle = '#606060'; h.fillRect(x, 0, 1.5, s); h.fillRect(x, joint, width, 1.5);
      }
    }
  }, 1741);
}

function microSurface(kind) {
  return sample((c, h, s, random) => {
    c.fillStyle = '#f4f1e9'; c.fillRect(0, 0, s, s);
    h.fillStyle = '#aaa'; h.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      for (let x = 0; x < s; x += 4) {
        const shade = 110 + random() * 80;
        h.fillStyle = `rgb(${shade},${shade},${shade})`;
        if (kind === 'weave') {
          const vertical = (x / 4 + y / 4) % 2 === 0;
          h.fillRect(x, y, vertical ? 2 : 4, vertical ? 4 : 2);
          c.fillStyle = `rgba(83,75,61,${random() * 0.12})`;
          c.fillRect(x, y, vertical ? 2 : 4, vertical ? 4 : 2);
        } else {
          h.fillRect(x, y, 1 + random() * 3, 1 + random() * 3);
          c.fillStyle = `rgba(80,75,65,${random() * 0.05})`; c.fillRect(x, y, 2, 2);
        }
      }
    }
  }, kind.length * 98, 256);
}

function tile() {
  return sample((c, h, s, random) => {
    c.fillStyle = '#c2bfb8'; c.fillRect(0, 0, s, s);
    h.fillStyle = '#444'; h.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += s / 2) for (let x = 0; x < s; x += s / 2) {
      c.fillStyle = `hsl(42 12% ${91 + random() * 4}%)`;
      c.fillRect(x + 1, y + 1, s / 2 - 2, s / 2 - 2);
      h.fillStyle = '#ccc'; h.fillRect(x + 1, y + 1, s / 2 - 2, s / 2 - 2);
    }
  });
}

export function upgradeSurfaces(M) {
  const apply = (keys, maps, size, relief, roughness) => {
    for (const key of keys) {
      const material = M[key];
      material.map?.dispose();
      Object.assign(material, maps, { bumpScale: relief });
      material.userData.textureSize = size;
      for (const texture of Object.values(maps)) texture.repeat.set(1 / size[0], 1 / size[1]);
      if (roughness !== undefined) material.roughness = roughness;
    }
  };
  apply(['brick'], masonry('brick'), [5.33, 3.67], 0.035, 0.9);
  apply(['fieldstone'], masonry('stone'), [6, 3], 0.065, 0.94);
  apply(['shingle'], masonry('slate'), [2.8, 3], 0.035, 0.82);
  apply(['oakFloor', 'darkOakFloor'], wood(true), [3.33, 8], 0.012, 0.4);
  apply(['walnut', 'deepWalnut', 'oakWood', 'stairWood', 'oakDoor', 'teak'], wood(false), [2, 8], 0.009, 0.42);
  const woven = microSurface('weave');
  apply(['linenCream', 'velvetChar', 'velvetSlate', 'shearling', 'greige', 'graphite',
    'carpetIvory', 'carpetGray', 'carpetStriped', 'terracePurple'], woven, [2, 2], 0.018, 0.95);
  apply(['leatherCamel', 'leatherCognac'], microSurface('leather'), [1, 1], 0.008, 0.48);
  apply(['tileWhite'], tile(), [4, 4], 0.012, 0.3);
  const plaster = microSurface('plaster');
  for (const key of ['wall', 'plaster', 'concrete', 'darkPlaster', 'roofMembrane', 'terracotta']) {
    M[key].bumpMap = plaster.bumpMap; M[key].bumpScale = 0.008;
    M[key].userData.textureSize = [3, 3];
  }
  plaster.map.dispose();
  plaster.bumpMap.repeat.set(1 / 3, 1 / 3);
  for (const key of ['quartzite', 'marbleVein', 'marqina', 'white', 'cabinetGray', 'charcoalCabinet']) {
    const previous = M[key];
    const physical = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(physical, previous);
    physical.clearcoat = key.includes('Cabinet') || key === 'cabinetGray' ? 0.2 : 0.42;
    physical.clearcoatRoughness = 0.24;
    M[key] = physical; previous.dispose();
  }
  for (const key of ['glass', 'glassRail', 'waterGlass']) {
    Object.assign(M[key], { color: new THREE.Color(0xdbe9e9), metalness: 0, roughness: 0.06,
      ior: 1.5, reflectivity: 0.65, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false });
  }
  for (const [key, material] of Object.entries(M)) {
    const dimensions = { stoneFloor: [8, 8], pavers: [9, 9], terraceDeck: [6, 6],
      limestone: [10, 10], trimStone: [10, 10], basalt: [8, 8], slat: [3, 8],
      flutedBlack: [3, 8], flutedPlum: [3, 8], quartzite: [6, 6], marbleVein: [8, 8],
      panelBrown: [4, 8], sidingCream: [8, 4], paverRed: [3, 3], galleryWallpaper: [3, 3], onyx: [7, 7] }[key];
    if (dimensions) {
      material.userData.textureSize = dimensions;
      material.map?.repeat.set(1 / dimensions[0], 1 / dimensions[1]);
      material.emissiveMap?.repeat.set(1 / dimensions[0], 1 / dimensions[1]);
    }
    material.userData.textureSize ??= [1, 1];
    material.name = key;
    material.side = THREE.DoubleSide;
  }
}

// Project each face in feet; shared materials keep a single texture allocation.
// Never touch positions, picking metadata, or the mirrored root transform.
export function surfaceUVs(geometry, material, offset = [0, 0, 0]) {
  const size = material?.userData.textureSize;
  if (!size || !geometry.attributes.uv) return geometry;
  const { position, normal, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + offset[0], y = position.getY(i) + offset[1], z = position.getZ(i) + offset[2];
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
    const u = ny > nx && ny > nz ? x : nx > nz ? z : x;
    const v = ny > nx && ny > nz ? z : y;
    // Feet live in geometry; repeat density lives on each finish, so swapping
    // a room from carpet to oak in the editor also changes its texture scale.
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geometry;
}
