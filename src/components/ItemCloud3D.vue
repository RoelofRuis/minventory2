<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { Package, Lock, Smile, Zap, Target, Heart } from 'lucide-vue-next';
import FilterBar from './FilterBar.vue';
import { formatStat, isDefined, getStatColor } from '../utils/formatters';
import {useItemStore} from "../stores/item.ts";
import {useCategoryStore} from "../stores/category.ts";

const { showPrivate } = useAuthStore();
const { categories, fetchCategories, getCategoryName, getCategoryColor } = useCategoryStore();
const visibleCategories = computed(() => showPrivate.value ? categories.value : categories.value.filter(c => !c.private));
const {
  items,
  loading,
  filteredItems,
  totalIndividualItems,
  fetchItems,
  fetchObjectUrl,
} = useItemStore();

const container = ref<HTMLElement | null>(null);
const selectedItem = ref<any>(null);

// Three.js and Cloud state
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let animationFrameId: number;
const spriteGroup = new THREE.Group();
const textureCache = new Map<number, THREE.Texture>();
const CLOUD_RANGE = 800;
const FADE_ZONE = 50;

const updateSpriteOpacities = () => {
  const visibleIds = new Set(filteredItems.value.map(i => i.id));

  spriteGroup.children.forEach((child: any) => {
    if (child.userData && child.userData.id) {
      child.userData.baseOpacity = visibleIds.has(child.userData.id) ? 1.0 : 0.1;
    }
  });
};


watch(filteredItems, () => {
  updateSpriteOpacities();
}, { deep: true });

watch(items, () => {
  rebuildCloud();
});

watch(() => showPrivate, async (val) => {
  if (val) {
    loading.value = true;
    await fetchData(true);
    rebuildCloud();
    loading.value = false;
  }
});

const fetchData = async (force = false) => {
  try {
    await Promise.all([
      fetchItems(force),
      fetchCategories(force)
    ]);
  } catch (err) {
    console.error('Failed to fetch data', err);
  } finally {
    loading.value = false;
  }
};

const initThree = () => {
  if (!container.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  scene.fog = new THREE.FogExp2(0x0f172a, 0.0008);

  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  scene.add(spriteGroup);

  // Add stars/particles background
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 1000;
  const posArray = new Float32Array(particlesCount * 3);
  for(let i=0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 1500;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    size: 2,
    color: 0xa78bfa,
    transparent: true,
    opacity: 0.5
  });
  const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);

  updateSpriteOpacities();
  animate();

  window.addEventListener('resize', onWindowResize);
};

const drawCircularItem = (ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, name: string, itemCategories: any[], isIsolated: boolean = false) => {
  ctx.clearRect(0, 0, 128, 128);

  ctx.save();

  if (isIsolated && img) {
    // For isolated items, draw scaled to fit
    const scale = Math.min(128 / img.width, 128 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h);

    // Soft fade at very edges
    ctx.globalCompositeOperation = 'destination-in';
    const radialGrad = ctx.createRadialGradient(64, 64, 56, 64, 64, 64);
    radialGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    radialGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 128, 128);
  } else {
    // Regular items: circular crop with fadeout
    if (img) {
      const size = Math.min(img.width, img.height);
      ctx.drawImage(
          img,
          (img.width - size) / 2, (img.height - size) / 2, size, size,
          0, 0, 128, 128
      );
    } else {
      const grad = ctx.createLinearGradient(0, 0, 128, 128);
      grad.addColorStop(0, '#334155');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }

    // Circular fadeout mask
    ctx.globalCompositeOperation = 'destination-in';
    const radialGrad = ctx.createRadialGradient(64, 64, 48, 64, 64, 64);
    radialGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    radialGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 128, 128);
  }

  ctx.restore();

  // Category Blips
  if (itemCategories.length > 0) {
    const blipRadius = isIsolated ? 54 : 48;
    itemCategories.slice(0, 5).forEach((cat, i) => {
      ctx.beginPath();
      const angle = (i / Math.min(itemCategories.length, 5)) * Math.PI * 2 - Math.PI / 2;
      const r = blipRadius;
      const bx = 64 + Math.cos(angle) * r;
      const by = 64 + Math.sin(angle) * r;
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fillStyle = cat.color || '#a78bfa';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // Title label (drawn after clipping so it never gets cropped)
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = 112; // leave small side padding within the 128px canvas
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  let hasMore = false;
  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? '';
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length === 2) {
          hasMore = true;
          break;
        }
      } else {
        // Single word too long for the line
        currentLine = word;
        lines.push(currentLine);
        currentLine = '';
        if (lines.length === 2) {
          if (i < words.length - 1) hasMore = true;
          break;
        }
      }
    }
  }
  if (lines.length < 2 && currentLine) lines.push(currentLine);

  // If there's more text than fits in 2 lines, ensure the last line has an ellipsis
  if (hasMore && lines.length === 2) {
    let l = lines[1] || '';
    while (l.length > 0 && ctx.measureText(l + '…').width > maxWidth) {
      l = l.slice(0, -1);
    }
    lines[1] = l + '…';
  }

  lines.forEach((line, idx) => {
    let l = line;
    if (ctx.measureText(l).width > maxWidth) {
      while (l.length > 0 && ctx.measureText(l + '…').width > maxWidth) {
        l = l.slice(0, -1);
      }
      lines[idx] = l + '…';
    }
  });

  // Background pill for readability
  const paddingX = 8;
  const paddingY = 4;
  const lineHeight = 15;
  const totalTextHeight = lines.length * lineHeight;

  let maxW = 0;
  lines.forEach(l => {
    maxW = Math.max(maxW, ctx.measureText(l).width);
  });

  const rectW = Math.min(maxWidth + paddingX * 2, maxW + paddingX * 2);
  const rectH = totalTextHeight + paddingY * 2;
  const rx = 64 - rectW / 2;
  // Keep it near top
  const finalRy = 12;
  const radius = 8;

  ctx.beginPath();
  ctx.moveTo(rx + radius, finalRy);
  ctx.arcTo(rx + rectW, finalRy, rx + rectW, finalRy + rectH, radius);
  ctx.arcTo(rx + rectW, finalRy + rectH, rx, finalRy + rectH, radius);
  ctx.arcTo(rx, finalRy + rectH, rx, finalRy, radius);
  ctx.arcTo(rx, finalRy, rx + rectW, finalRy, radius);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Text with subtle shadow for contrast
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 3;

  lines.forEach((line, i) => {
    ctx.fillText(line, 64, finalRy + paddingY + (i + 0.5) * lineHeight);
  });

  ctx.shadowBlur = 0;
};


const createItemsCloud = () => {
  const halfRange = CLOUD_RANGE / 2;
  textureCache.clear();

  const srcItems = items.value;

  srcItems.forEach((item) => {
    const qty = Math.max(1, item.quantity || 1);

    // Reuse texture for the same item record to save memory
    let texture = textureCache.get(item.id);

    if (!texture) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d', { alpha: true })!;

      texture = new THREE.CanvasTexture(canvas);
      textureCache.set(item.id, texture);

      const itemCats = categories.value.filter(c => item.categoryIds?.includes(c.id));

      const useThumb = async () => {
        const targetUrl = item.thumbUrl || item.imageUrl;
        if (targetUrl) {
          const objUrl = await fetchObjectUrl(targetUrl);
          if (objUrl) {
            const img = new Image();
            img.onload = () => {
              drawCircularItem(ctx, img, item.name, itemCats, item.isIsolated);
              if (texture) texture.needsUpdate = true;
            };
            img.src = objUrl;
            return;
          }
        }
        if (item.image) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            drawCircularItem(ctx, img, item.name, itemCats, item.isIsolated);
            if (texture) texture.needsUpdate = true;
          };
          img.src = item.image;
          return;
        }
        drawCircularItem(ctx, null, item.name, itemCats, item.isIsolated);
        if (texture) texture.needsUpdate = true;
      };
      useThumb();
    }

    for (let i = 0; i < qty; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.0 // Animate will set correct opacity based on position
      });
      const sprite = new THREE.Sprite(material);

      // Random position within a spherical volume
      const radius = halfRange * Math.pow(Math.random(), 1/3);
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      sprite.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
      );

      sprite.scale.set(60, 60, 1);

      // Store item data and a random drift velocity
      sprite.userData = {
        ...item,
        baseOpacity: 1.0,
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        )
      };

      spriteGroup.add(sprite);
    }
  });
};

const onWindowResize = () => {
  if (!container.value || !camera || !renderer) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const rebuildCloud = () => {
  // Properly dispose and clear existing sprites and materials
  const materials = new Set<THREE.SpriteMaterial>();
  const textures = new Set<THREE.Texture>();

  spriteGroup.children.forEach((child: any) => {
    if (child.material) {
      materials.add(child.material as THREE.SpriteMaterial);
      if ((child.material as THREE.SpriteMaterial).map) {
        textures.add((child.material as THREE.SpriteMaterial).map!);
      }
    }
    if (child.geometry) child.geometry.dispose();
  });

  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
  textureCache.clear();

  while (spriteGroup.children.length > 0) {
    const child = spriteGroup.children[0];
    if (child) spriteGroup.remove(child);
  }

  createItemsCloud();
  updateSpriteOpacities();
};

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  controls.update();

  const halfRange = CLOUD_RANGE / 2;

  spriteGroup.children.forEach((child: any) => {
    if (child.userData && child.userData.velocity) {
      child.position.add(child.userData.velocity);

      // Wrap around the boundary for a continuous cloud feel
      const dist = child.position.length();
      if (dist > halfRange) {
        child.position.setLength(halfRange - 1);
        child.position.multiplyScalar(-1);
      }

      // Smooth fade out at boundaries
      const boundaryOpacity = Math.min(1.0, (halfRange - dist) / FADE_ZONE);

      if (child.material) {
        child.material.opacity = Math.max(0, boundaryOpacity) * (child.userData.baseOpacity || 1.0);
      }
    }
  });

  // Slow overall rotation for extra depth
  spriteGroup.rotation.y += 0.0001;

  renderer.render(scene, camera);
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const startMousePos = ref({ x: 0, y: 0 });

const onMouseDown = (event: MouseEvent) => {
  startMousePos.value = { x: event.clientX, y: event.clientY };
};

const onMouseUp = async (event: MouseEvent) => {
  if (!container.value || !renderer) return;

  const diffX = Math.abs(event.clientX - startMousePos.value.x);
  const diffY = Math.abs(event.clientY - startMousePos.value.y);

  // Only proceed if it was a click (minimal movement)
  if (diffX > 5 || diffY > 5) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(spriteGroup.children);

  if (intersects.length > 0 && intersects[0]) {
    const item = intersects[0].object.userData;
    // Fetch full item details to match Dashboard behavior
    try {
      const res = await axios.get(`/api/items/${item.id}`);
      selectedItem.value = res.data;
    } catch (err) {
      selectedItem.value = item;
    }
  }
};

onMounted(async () => {
  await fetchData();
  initThree();
  rebuildCloud(); // Build immediately after setup
  if (renderer) {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
  }
});

onUnmounted(() => {
  nextTick(() => {
    if (document.querySelectorAll('.modal-overlay').length === 0) {
      document.body.classList.remove('modal-open');
    }
  });
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) {
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.domElement.removeEventListener('mouseup', onMouseUp);

    // Proper disposal
    const materials = new Set<THREE.SpriteMaterial>();
    const textures = new Set<THREE.Texture>();

    spriteGroup.children.forEach((child: any) => {
      if (child.material) {
        materials.add(child.material as THREE.SpriteMaterial);
        if ((child.material as THREE.SpriteMaterial).map) {
          textures.add((child.material as THREE.SpriteMaterial).map!);
        }
      }
      if (child.geometry) child.geometry.dispose();
    });

    textures.forEach(t => t.dispose());
    materials.forEach(m => m.dispose());
    textureCache.clear();

    renderer.dispose();
  }
});
</script>

<template>
  <div class="cloud-view">
    <div class="container" style="padding-top: 0; padding-bottom: 0; max-width: 1000px; margin: 0 auto;">
      <FilterBar :categories="visibleCategories" :totalItems="totalIndividualItems" style="margin-top: 10px;" />
    </div>
    
    <div ref="container" class="canvas-container">
      <div v-if="loading" class="loading-overlay">
        <div class="silver-text">Loading items...</div>
      </div>
      
      <div v-if="selectedItem" class="item-info-overlay" @click.self="selectedItem = null">
        <div class="item-card sliding-card">
          <div class="item-image-wrapper">
            <div class="quantity-badge" :title="'Quantity: ' + selectedItem.quantity">{{ selectedItem.quantity }}</div>
            <img v-if="selectedItem.image" :src="selectedItem.image" style="height: 100%; width: 100%; object-fit: cover;" />
            <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <Package :size="32" :stroke-width="1.5" class="silver-text" style="opacity: 0.8;" />
            </div>
            <h3 class="item-title-overlay">
              <Lock v-if="selectedItem.private" :size="12" color="#f59e0b" style="margin-right: 4px; vertical-align: middle;" title="Private" />
              {{ selectedItem.name }}
            </h3>
          </div>

          <div class="item-stats-row" v-if="isDefined(selectedItem.joy) || isDefined(selectedItem.usageFrequency) || isDefined(selectedItem.intention) || isDefined(selectedItem.attachment)">
            <div v-if="isDefined(selectedItem.joy)" class="item-stat" :title="'Joy: ' + formatStat(selectedItem.joy)">
              <Smile :size="14" :style="{ color: getStatColor(selectedItem.joy || 'medium') }" /> <span class="stat-text">{{ formatStat(selectedItem.joy) }}</span>
            </div>
            <div v-if="isDefined(selectedItem.usageFrequency)" class="item-stat" :title="'Usage: ' + formatStat(selectedItem.usageFrequency)">
              <Zap :size="14" :style="{ color: getStatColor(selectedItem.usageFrequency || 'undefined') }" /> <span class="stat-text">{{ formatStat(selectedItem.usageFrequency) }}</span>
            </div>
            <div v-if="isDefined(selectedItem.intention)" class="item-stat" :title="'Intention: ' + formatStat(selectedItem.intention)">
              <Target :size="14" :style="{ color: getStatColor(selectedItem.intention || 'undecided') }" /> <span class="stat-text">{{ formatStat(selectedItem.intention) }}</span>
            </div>
            <div v-if="isDefined(selectedItem.attachment)" class="item-stat" :title="'Attachment: ' + formatStat(selectedItem.attachment)">
              <Heart :size="14" :style="{ color: getStatColor(selectedItem.attachment || 'undefined') }" /> <span class="stat-text">{{ formatStat(selectedItem.attachment) }}</span>
            </div>
          </div>
          
          <div v-if="selectedItem.categoryIds && selectedItem.categoryIds.length > 0">
            <span v-for="catId in selectedItem.categoryIds" :key="catId" class="item-badge" 
              :style="{ backgroundColor: getCategoryColor(catId) + '11', color: getCategoryColor(catId) }">
              {{ getCategoryName(catId) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="!selectedItem" class="instructions silver-text">
        Drag to rotate • Scroll to zoom • Click an item to view
      </div>
    </div>
  </div>
</template>

<style scoped>
.cloud-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.8);
  z-index: 10;
}

.instructions {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  font-size: 0.8rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.item-info-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  background-color: transparent;
  cursor: default;
}

.sliding-card {
  position: relative;
  width: 100%;
  max-width: 280px;
  margin-bottom: 20px;
  animation: slide-up 0.3s ease-out;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.04);
}

.sliding-card:hover {
  border-color: var(--border-color);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.04);
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
