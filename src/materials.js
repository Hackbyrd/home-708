import * as THREE from 'three';
import { upgradeSurfaces } from './surfaces.js';

// ---------- canvas texture helpers ----------
function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(ctx, w, h, alpha, n = 800) {
  for (let i = 0; i < n; i++) {
    const g = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// oak plank floor
function oakFloorTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    const plankW = 64;
    for (let x = 0; x < w; x += plankW) {
      for (let y = 0, i = 0; y < h; y += 128, i++) {
        const off = (x / plankW) % 2 ? 64 : 0;
        const base = 196 + Math.random() * 22;
        ctx.fillStyle = `rgb(${base},${base * 0.86},${base * 0.66})`;
        ctx.fillRect(x, y - off, plankW - 1, 127);
        // grain
        ctx.strokeStyle = 'rgba(120,90,60,0.18)';
        for (let g = 0; g < 5; g++) {
          ctx.beginPath();
          const gx = x + 6 + Math.random() * (plankW - 12);
          ctx.moveTo(gx, y - off);
          ctx.bezierCurveTo(gx + 6, y - off + 40, gx - 6, y - off + 80, gx + 3, y - off + 127);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(90,70,50,0.35)';
    for (let x = 0; x < w; x += plankW) ctx.fillRect(x, 0, 1, h);
    noise(ctx, w, h, 0.03);
  }, 4, 4);
}

// painted white brick — cream-white bricks, soft warm mortar, subtle variation
function brickTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e2ddd4'; ctx.fillRect(0, 0, w, h); // mortar
    const bw = 64, bh = 26;
    for (let y = 0, r = 0; y < h; y += bh, r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const shade = 0.965 + Math.random() * 0.055;
        ctx.fillStyle = `rgb(${Math.floor(250 * shade)},${Math.floor(247 * shade)},${Math.floor(240 * shade)})`;
        ctx.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      }
    }
    noise(ctx, w, h, 0.02);
  }, 3, 3);
}

// travertine / stone tile
function stoneTex(base = [221, 214, 201]) {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(160,148,125,${0.05 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 90, 8 + Math.random() * 20, Math.random() * 3, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,110,95,0.35)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 256) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 256) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    noise(ctx, w, h, 0.03);
  }, 3, 3);
}

// vertical oak slats (feature walls)
function slatTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1d1b18'; ctx.fillRect(0, 0, w, h); // felt behind
    const sw = 26, gap = 10;
    for (let x = 0; x < w; x += sw + gap) {
      const base = 180 + Math.random() * 25;
      const grd = ctx.createLinearGradient(x, 0, x + sw, 0);
      grd.addColorStop(0, `rgb(${base * 0.75},${base * 0.62},${base * 0.45})`);
      grd.addColorStop(0.5, `rgb(${base},${base * 0.84},${base * 0.62})`);
      grd.addColorStop(1, `rgb(${base * 0.7},${base * 0.58},${base * 0.42})`);
      ctx.fillStyle = grd;
      ctx.fillRect(x, 0, sw, h);
    }
  }, 3, 1);
}

// fluted dark stone (waterfall backer / dining wall)
function flutedTex(rgb = [24, 24, 26], light = 0.35) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const fw = 32;
    for (let x = 0; x < w; x += fw) {
      const grd = ctx.createLinearGradient(x, 0, x + fw, 0);
      grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      grd.addColorStop(0.5, `rgba(${Math.min(255, rgb[0] + 255 * light)},${Math.min(255, rgb[1] + 255 * light)},${Math.min(255, rgb[2] + 255 * light)},1)`);
      grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      ctx.fillStyle = grd;
      ctx.fillRect(x, 0, fw, h);
    }
  }, 4, 1);
}

// backlit onyx (penthouse bar)
function onyxTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#e8b96a'); grd.addColorStop(0.45, '#d89a45');
    grd.addColorStop(0.75, '#b06f2a'); grd.addColorStop(1, '#7c4a1c');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(255,240,200,${0.2 + Math.random() * 0.4})`;
      ctx.lineWidth = 1 + Math.random() * 5;
      ctx.beginPath();
      let y = Math.random() * h;
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) {
        y += (Math.random() - 0.5) * 46;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 1, 1);
}

// quartzite counter
function quartziteTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9e2d2'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(150,135,110,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      let y = Math.random() * h;
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 20) { y += (Math.random() - 0.5) * 24; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, 2, 2);
}

// gray fieldstone (watertable base)
function fieldstoneTex() {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8c877f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const g = 120 + Math.random() * 70;
      ctx.fillStyle = `rgb(${g},${g * 0.98},${g * 0.93})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 30, 10 + Math.random() * 14, Math.random() * 3, 0, 7);
      ctx.fill();
    }
    noise(ctx, w, h, 0.06);
  }, 4, 1);
}

// dark board & batten panel (rear volumes)
function panelBrownTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#57504a'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = 'rgba(30,26,22,0.5)';
      ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 6, 0, 2, h);
    }
    noise(ctx, w, h, 0.03);
  }, 2, 1);
}

// cream lap siding (rear wing)
function sidingCreamTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ddd5c4'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      ctx.fillStyle = 'rgba(90,80,66,0.45)';
      ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, y + 3, w, 3);
    }
    noise(ctx, w, h, 0.02);
  }, 2, 2);
}

// charcoal slate shingles (mansard)
function shingleTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b2e33'; ctx.fillRect(0, 0, w, h);
    const sw = 42, sh = 34;
    for (let y = 0, r = 0; y < h + sh; y += sh, r++) {
      const off = r % 2 ? sw / 2 : 0;
      for (let x = -sw; x < w + sw; x += sw) {
        const g = 40 + Math.random() * 18;
        ctx.fillStyle = `rgb(${g},${g + 2},${g + 6})`;
        ctx.beginPath();
        ctx.roundRect(x + off + 1.5, y + 1.5, sw - 3, sh - 3, [0, 0, 10, 10]);
        ctx.fill();
      }
    }
    noise(ctx, w, h, 0.05);
  }, 3, 3);
}

// red brick pavers (entry walk)
function paverRedTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b09a86'; ctx.fillRect(0, 0, w, h);
    const bw = 62, bh = 30;
    for (let y = 0, r = 0; y < h; y += bh, r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const s = 0.82 + Math.random() * 0.35;
        ctx.fillStyle = `rgb(${Math.floor(176 * s)},${Math.floor(108 * s)},${Math.floor(78 * s)})`;
        ctx.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      }
    }
    noise(ctx, w, h, 0.05);
  }, 2, 2);
}

function paversTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#b5aca0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,65,58,0.5)'; ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 170) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 170) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    noise(ctx, w, h, 0.05, 1500);
  }, 3, 3);
}

// metallic circle-pattern wallcovering used in the double-height entry gallery
function galleryWallpaperTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b7aba2'; ctx.fillRect(0, 0, w, h);
    for (let y = 12, row = 0; y < h; y += 22, row++) {
      for (let x = row % 2 ? 11 : 0; x < w; x += 22) {
        ctx.fillStyle = 'rgba(68,62,59,0.72)';
        ctx.beginPath(); ctx.arc(x, y, 7.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(232,222,214,0.55)';
        ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 3.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    noise(ctx, w, h, 0.025, 500);
  }, 2, 4);
}

// blue-gray figured stone slab behind the owner's bath soaking tub
function marbleVeinTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d8dce0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = `rgba(${45 + i % 3 * 18},${52 + i % 4 * 13},${62 + i % 5 * 12},${0.2 + (i % 4) * 0.08})`;
      ctx.lineWidth = 2 + (i % 5) * 1.4;
      ctx.beginPath();
      let x = -40 + i * 18;
      ctx.moveTo(x, h);
      for (let y = h; y >= 0; y -= 24) {
        x += Math.sin(y * 0.035 + i) * 10 + 2.4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

// pale gray-brown herringbone deck tile used across the penthouse terraces
function terraceDeckTex() {
  const texture=canvasTex(512,512,(c,w,h)=>{
    c.fillStyle='#67655f';c.fillRect(0,0,w,h);
    const unit=32,L=4;
    const plank=(x,y,vertical)=>{
      const pw=vertical?unit:unit*L, ph=vertical?unit*L:unit;
      const shade=148+((x*13+y*7)%23+23)%23;
      c.fillStyle=`rgb(${shade},${shade-5},${shade-11})`;c.fillRect(x+1,y+1,pw-2,ph-2);
      for(let k=4;k<(vertical?pw:ph);k+=4){
        c.strokeStyle='rgba(60,51,40,.13)';c.lineWidth=.6;c.beginPath();
        c.moveTo(x+(vertical?k:3),y+(vertical?3:k));
        c.lineTo(x+(vertical?k:pw-3),y+(vertical?ph-3:k));c.stroke();
      }
    };
    for(let y=-8;y<24;y++)for(let i=-4;i<4;i++)plank((y+8*i)*unit,y*unit,false);
    for(let x=-8;x<24;x++)for(let i=-4;i<4;i++)plank(x*unit,(x-7+8*i)*unit,true);
  });
  texture.rotation=Math.PI/4;return texture;
}

// Reference fabrics are generated at a repeatable physical scale, so patterns
// remain legible in close views without shipping large photographic textures.
function referenceFabric(kind) {
  return canvasTex(512,512,(c,w,h)=>{
    c.fillStyle = {office:'#545360',loft:'#c5beb4',magenta:'#b92787',chair:'#eee9df',quilt:'#c8c5c0',stripe:'#a9a49c'}[kind];
    c.fillRect(0,0,w,h);
    if(kind==='office'||kind==='chair') {
      c.strokeStyle=kind==='office'?'#d5cdbf':'#88817a';c.lineWidth=kind==='office'?7:2;
      for(let y=-100;y<600;y+=128)for(let x=-100;x<600;x+=128){
        c.beginPath();c.moveTo(x,y+64);c.lineTo(x+44,y+48);c.lineTo(x+64,y);c.lineTo(x+84,y+48);c.lineTo(x+128,y+64);c.lineTo(x+84,y+80);c.lineTo(x+64,y+128);c.lineTo(x+44,y+80);c.closePath();c.stroke();
      }
    } else if(kind==='magenta') {
      c.strokeStyle='#f3e9ea';c.lineWidth=5;
      for(let y=-25;y<540;y+=58)for(let x=-30;x<540;x+=55){
        c.beginPath();c.ellipse(x+(y%3)*4,y,12,19,Math.sin(x+y),0,Math.PI*1.65);c.stroke();
      }
    } else if(kind==='loft') {
      for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128){c.fillStyle=['#ded9cd','#b5ada6','#ece6d7','#aeadb0'][(x/128+3*y/128)%4];c.fillRect(x,y,128,128);}
    } else if(kind==='stripe') {
      for(let x=0;x<512;x+=128){c.fillStyle='#d7d0c2';c.fillRect(x,0,48,512);c.fillStyle='#88857f';c.fillRect(x+80,0,26,512);}
    } else {
      c.strokeStyle='#b6b2ab';c.lineWidth=1;
      for(let k=-512;k<1024;k+=24){c.beginPath();c.moveTo(k,0);c.lineTo(k+512,512);c.stroke();c.beginPath();c.moveTo(k,0);c.lineTo(k-512,512);c.stroke();}
    }
    for(let y=0;y<512;y+=3){c.fillStyle='rgba(255,255,255,.06)';c.fillRect(0,y,512,1);}
  });
}

// ---------- the material kit ----------
export function makeMaterials() {
  const M = {};
  const std = (opts) => new THREE.MeshStandardMaterial(opts);

  M.brick       = std({ map: brickTex(), roughness: 0.92 });
  M.wall        = std({ color: 0xD5CEC7, roughness: 0.95 });          // White Dove
  M.plaster     = std({ color: 0xE8E2D6, roughness: 0.85 });          // roman clay
  M.iron        = std({ color: 0x2E3230, roughness: 0.6 });           // Iron Ore millwork
  M.plum        = std({ color: 0x2B3038, roughness: 0.75 });          // Cheating Heart
  M.walnut      = std({ color: 0x5C4433, roughness: 0.55 });
  M.oakWood     = std({ color: 0xC9AE8C, roughness: 0.65 });
  M.stairWood   = std({ color: 0x3B241A, roughness: 0.42 });          // espresso-stained treads and handrail
  M.deepWalnut  = std({ color: 0x241711, roughness: 0.5 });
  M.cabinetGray = std({ color: 0xA9A8AA, roughness: 0.5 });
  M.charcoalCabinet = std({ color: 0x343237, roughness: 0.48 });
  M.brass       = std({ color: 0xB08D57, roughness: 0.32, metalness: 0.85 });
  M.blackSteel  = std({ color: 0x24262a, roughness: 0.45, metalness: 0.7 });
  M.oakFloor    = std({ map: oakFloorTex(), roughness: 0.7 });
  M.darkOakFloor= std({ map: oakFloorTex(), color: 0x68554A, roughness: 0.62 });
  M.stoneFloor  = std({ map: stoneTex(), roughness: 0.85 });
  M.pavers      = std({ map: paversTex(), roughness: 0.9 });
  M.terraceDeck = std({ map: terraceDeckTex(), roughness: 0.78 });
  M.tileWhite   = std({ color: 0xEDE8DF, roughness: 0.4 });
  M.carpetIvory = std({ color: 0xD8D1C8, roughness: 1 });
  M.carpetGray  = std({ color: 0xAAA6A3, roughness: 1 });
  M.carpetStriped = std({ color: 0xA9A39A, roughness: 1 });
  M.galleryWallpaper = std({ map: galleryWallpaperTex(), roughness: 0.72, metalness: 0.08 });
  M.marbleVein  = std({ map: marbleVeinTex(), roughness: 0.32 });
  M.mediaGold   = std({ color: 0xB39A43, roughness: 0.92 });
  M.laundryPeach= std({ color: 0xD8AA7D, roughness: 0.95 });
  M.magenta     = std({ color: 0xC1268F, roughness: 0.8 });
  M.sunYellow   = std({ color: 0xE8B928, roughness: 0.65 });
  M.terracePurple = std({ color: 0x7A3C91, roughness: 0.9 });
  M.rubber      = std({ color: 0x3a3a3c, roughness: 0.95 });
  M.concrete    = std({ color: 0x9a948c, roughness: 0.9 });
  M.slat        = std({ map: slatTex(), roughness: 0.7 });
  M.flutedBlack = std({ map: flutedTex([20, 20, 23], 0.28), roughness: 0.35 });
  M.flutedPlum  = std({ map: flutedTex([36, 41, 50], 0.22), roughness: 0.6 });
  M.marqina     = std({ color: 0x17171a, roughness: 0.18 });
  M.quartzite   = std({ map: quartziteTex(), roughness: 0.35 });
  M.limestone   = std({ map: stoneTex([206, 199, 184]), roughness: 0.8 });
  M.trimStone   = std({ map: stoneTex([214, 205, 186]), roughness: 0.8 });  // cream cast stone (matches the real house)
  M.basalt      = std({ map: stoneTex([94, 92, 88]), roughness: 0.75 });    // dark hearth stone
  M.fieldstone  = std({ map: fieldstoneTex(), roughness: 0.95 });
  M.panelBrown  = std({ map: panelBrownTex(), roughness: 0.85 });
  M.sidingCream = std({ map: sidingCreamTex(), roughness: 0.9 });
  M.shingle     = std({ map: shingleTex(), roughness: 0.85 });
  M.paverRed    = std({ map: paverRedTex(), roughness: 0.95 });
  M.bronze      = std({ color: 0x453629, roughness: 0.5, metalness: 0.35 }); // window frames
  M.taupe       = std({ color: 0x6a5c4e, roughness: 0.85 });                 // entry surround paint
  M.hoodMetal   = std({ color: 0x43414f, roughness: 0.55, metalness: 0.3 }); // plum-charcoal standing seam
  M.oakDoor     = std({ color: 0x9a6b3a, roughness: 0.55 });                 // stained oak front door
  M.hedge       = std({ color: 0x3f5a33, roughness: 1 });
  M.onyx        = new THREE.MeshStandardMaterial({ map: onyxTex(), emissiveMap: onyxTex(), emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.3 });
  M.glass       = new THREE.MeshPhysicalMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide });
  M.glassRail   = new THREE.MeshPhysicalMaterial({ color: 0xaebfc4, transparent: true, opacity: 0.18, roughness: 0.1, side: THREE.DoubleSide });
  M.mirror      = std({ color: 0xcfd6d4, roughness: 0.05, metalness: 0.95 });
  M.waterGlass  = new THREE.MeshPhysicalMaterial({ color: 0x9fc4c9, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 });

  // fabrics & leathers
  M.linenCream  = std({ color: 0xEDE7DA, roughness: 1 });
  M.velvetChar  = std({ color: 0x3a3f3c, roughness: 1 });
  M.velvetSlate = std({ color: 0x4A4E57, roughness: 1 });
  M.leatherCamel= std({ color: 0xA97B4F, roughness: 0.7 });
  M.leatherCognac=std({ color: 0x8a5a33, roughness: 0.65 });
  M.shearling   = std({ color: 0xEFEAE0, roughness: 1 });
  M.greige      = std({ color: 0xD9D2C4, roughness: 1 });
  M.teak        = std({ color: 0xA8815A, roughness: 0.7 });
  M.graphite    = std({ color: 0x4c4f52, roughness: 1 });
  M.matBlack    = std({ color: 0x1c1c1e, roughness: 0.7 });
  M.white       = std({ color: 0xf4f2ee, roughness: 0.35 });
  M.green       = std({ color: 0x5e6f4f, roughness: 1 });
  M.terracotta  = std({ color: 0x9c6b52, roughness: 0.9 });
  M.roofMembrane= std({ color: 0x54504a, roughness: 0.95 });
  M.slate       = std({ color: 0x2c2f33, roughness: 0.85 });
  M.subfloor    = std({ color: 0xcfc6b8, roughness: 0.95 });  // slab edges read as limestone string courses
  M.darkPlaster = std({ color: 0x2a2a28, roughness: 0.8 });

  // emissives for evening
  M.warmGlow    = new THREE.MeshStandardMaterial({ color: 0xffd9a3, emissive: 0xffc37a, emissiveIntensity: 0.0 });
  M.fire        = new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff7a1c, emissiveIntensity: 1.4 });
  M.screenGlow  = new THREE.MeshStandardMaterial({ color: 0x111114, emissive: 0x25303c, emissiveIntensity: 0.6, roughness: 0.2 });

  upgradeSurfaces(M);
  const fabric = (name,kind,size) => {
    M[name]=M.linenCream.clone();M[name].color.set(0xffffff);
    M[name].map=referenceFabric(kind);M[name].map.repeat.set(1/size[0],1/size[1]);
    M[name].userData.textureSize=size;M[name].name=name;
  };
  fabric('officeRug','office',[4,4]); fabric('chairPattern','chair',[2.2,2.2]);
  fabric('loftRug','loft',[12.5,10.5]); fabric('magentaPattern','magenta',[2.5,2.5]);
  fabric('bedQuilt','quilt',[2,2]);
  M.carpetStriped.map=referenceFabric('stripe');M.carpetStriped.map.repeat.set(.2,.2);M.carpetStriped.color.set(0xffffff);
  M.carpetStriped.userData.textureSize=[5,5];
  M.brickRelief=M.brick.clone();M.brickRelief.color.set(0x88867e);M.brickRelief.name='brickRelief';
  M.pergola=M.teak.clone();M.pergola.color.set(0x575146);M.pergola.name='pergola';
  M.terraceTable=M.teak.clone();M.terraceTable.color.set(0x7d817c);M.terraceTable.name='terraceTable';
  M.shadeCanvas=M.linenCream.clone();M.shadeCanvas.color.set(0xb9a485);M.shadeCanvas.name='shadeCanvas';
  M.glass.opacity=.55;M.glass.color.set(0x7596a1);M.glass.roughness=.1;
  M.roofMembrane.color.set(0x292b2e);
  M.bronze.color.set(0x29292b);
  M.panelBrown.color.set(0xbdb9b0);
  M.darkOakFloor.color.set(0x514137);
  M.stairWood.roughness=.29;
  M.hoodMetal.color.set(0x393940);


  // The whole house is rendered inside a mirrored (scale.x = -1) root so the
  // model matches the real plans; DoubleSide keeps faces visible under the flip.
  for (const mat of Object.values(M)) mat.side = THREE.DoubleSide;

  return M;
}
