/**
 * Terepgömb — the 3D globe renderer behind the Discover globe view.
 *
 * Framework-agnostic on purpose: React only mounts and feeds it (see
 * GlobeDiscover.tsx). Everything here is plain three.js, so the renderer can be
 * tested, reused, or replaced without touching the page.
 *
 * Design notes:
 *  - The earth texture is generated from world-atlas by
 *    `scripts/build-globe-texture.py`; both live in `public/globe/`.
 *  - Markers carry their geocode provenance. Country-centroid coordinates are
 *    placeholders, so those markers are drawn smaller, dimmer, and fanned out
 *    around the centroid — otherwise every Hungarian trip would sit on one
 *    pixel in the middle of Hungary and claim to be a real location.
 *  - The render loop pauses when the canvas is off-screen or the tab is hidden.
 */

import {
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';

const GLOBE_RADIUS = 1;
const MIN_ZOOM = 1.6;
const MAX_ZOOM = 4.2;
const DEFAULT_ZOOM = 2.6;
// Radians per second. A globe that finishes a turn in ~3 minutes reads as
// alive; anything near a turn per minute makes the page feel restless.
const AUTO_ROTATE_RAD_PER_SEC = 0.035;
const IDLE_BEFORE_AUTOROTATE_MS = 2500;
const MAX_PITCH = 1.35; // radians, keeps the poles from flipping over
const DRAG_SENSITIVITY = 0.005;
// Small enough that neighbouring trips stay countable at default zoom —
// Central Europe alone carries twenty of them within a few degrees.
const MARKER_BASE_RADIUS = 0.0105;
// How close the pointer must get to a marker's centre, in CSS pixels. Roughly
// a fingertip on mobile and a comfortable mouse target on desktop.
const HIT_RADIUS_PX = 16;

const DEFAULTS = {
  textureUrl: '/globe/earth-texture.png',
  markerColor: '#0D9488', // --trevu-teal
  atmosphereColor: '#14B8A6', // --trevu-teal-light
  autoRotate: true,
  initialLat: 47.5,
  initialLng: 19.0, // Central Europe — the home market
};

/** Converts WGS84 degrees to a point on the globe of the given radius. */
export function latLngToVector3(lat, lng, radius = GLOBE_RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** True when the browser can give us a WebGL context at all. */
export function isWebGLAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Deterministic fan-out for markers that share a coordinate. Same input always
 * produces the same offsets, so the globe does not reshuffle between renders.
 */
function spreadOffsets(count) {
  if (count <= 1) return [[0, 0]];
  const offsets = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const radius = 0.55 * Math.sqrt((index + 0.5) / count); // degrees
    const angle = index * goldenAngle;
    offsets.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return offsets;
}

const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
    gl_FragColor = vec4(glowColor, 1.0) * intensity;
  }
`;

export class Terepgomb {
  constructor(container, options = {}) {
    if (!container) throw new Error('Terepgomb: container element is required');
    if (!isWebGLAvailable()) throw new Error('Terepgomb: WebGL is not available');

    this.container = container;
    this.options = { ...DEFAULTS, ...options };
    this.markers = [];
    this.markerMeshes = [];
    this.hovered = null;
    this.pointerScreen = null;
    this.disposed = false;
    this.visible = true;
    this.lastInteractionAt = 0;

    this.rotation = {
      // Face the initial coordinates on first paint.
      yaw: -((this.options.initialLng + 180) * Math.PI) / 180 + Math.PI / 2,
      pitch: (this.options.initialLat * Math.PI) / 180,
      velocityYaw: 0,
      velocityPitch: 0,
    };
    this.zoom = DEFAULT_ZOOM;

    this.#initScene();
    this.#initGlobe();
    this.#initEvents();
    this.#start();
  }

  // ── setup ───────────────────────────────────────────────────────────────

  #initScene() {
    const { clientWidth, clientHeight } = this.container;
    const width = Math.max(1, clientWidth);
    const height = Math.max(1, clientHeight);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, this.zoom);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'pan-y';
    this.renderer.domElement.setAttribute('data-testid', 'globe-canvas');
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new AmbientLight(0xffffff, 1.15));
    const sun = new DirectionalLight(0xffffff, 1.1);
    sun.position.set(-1.4, 0.8, 2.2);
    this.scene.add(sun);

    this.globeGroup = new Group();
    this.scene.add(this.globeGroup);

    this.markerGroup = new Group();
    this.globeGroup.add(this.markerGroup);

  }

  #initGlobe() {
    const geometry = new SphereGeometry(GLOBE_RADIUS, 72, 48);
    // A flat fallback colour shows instantly; the texture swaps in when loaded.
    this.globeMaterial = new MeshPhongMaterial({
      color: new Color('#152238'),
      shininess: 6,
      specular: new Color('#0b1220'),
    });
    this.globe = new Mesh(geometry, this.globeMaterial);
    this.globeGroup.add(this.globe);

    this.textureLoader = new TextureLoader();
    this.textureLoader.load(
      this.options.textureUrl,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = Math.min(
          4,
          this.renderer.capabilities.getMaxAnisotropy?.() ?? 1
        );
        this.globeMaterial.map = texture;
        this.globeMaterial.color.set('#ffffff');
        this.globeMaterial.needsUpdate = true;
        this.earthTexture = texture;
      },
      undefined,
      () => {
        // Missing texture is not fatal — the flat sphere still works.
        console.warn('[Terepgomb] earth texture failed to load, using flat colour');
      }
    );

    const atmosphereGeometry = new SphereGeometry(GLOBE_RADIUS * 1.14, 48, 32);
    this.atmosphereMaterial = new ShaderMaterial({
      uniforms: { glowColor: { value: new Color(this.options.atmosphereColor) } },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphere = new Mesh(atmosphereGeometry, this.atmosphereMaterial);
    this.scene.add(this.atmosphere);
  }

  #initEvents() {
    const canvas = this.renderer.domElement;

    this.handlePointerDown = (event) => {
      this.dragging = true;
      this.dragMoved = false;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.lastInteractionAt = performance.now();
      canvas.setPointerCapture?.(event.pointerId);
    };

    this.handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointerScreen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.lastInteractionAt = performance.now();

      if (!this.dragging) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.rotation.velocityYaw = dx * DRAG_SENSITIVITY;
      this.rotation.velocityPitch = dy * DRAG_SENSITIVITY;
      this.lastInteractionAt = performance.now();
    };

    this.handlePointerUp = (event) => {
      if (this.dragging && !this.dragMoved) this.#handleClick();
      this.dragging = false;
      this.lastInteractionAt = performance.now();
      canvas.releasePointerCapture?.(event.pointerId);
    };

    this.handlePointerLeave = () => {
      this.dragging = false;
      this.pointerScreen = null;
      if (this.hovered) {
        this.hovered = null;
        this.options.onMarkerHover?.(null, null);
      }
    };

    this.handleWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY * 0.0016;
      this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta));
      this.lastInteractionAt = performance.now();
    };

    this.handleKeyDown = (event) => {
      const step = 0.12;
      if (event.key === 'ArrowLeft') this.rotation.yaw -= step;
      else if (event.key === 'ArrowRight') this.rotation.yaw += step;
      else if (event.key === 'ArrowUp') this.rotation.pitch = Math.min(MAX_PITCH, this.rotation.pitch + step);
      else if (event.key === 'ArrowDown') this.rotation.pitch = Math.max(-MAX_PITCH, this.rotation.pitch - step);
      else return;
      event.preventDefault();
      this.lastInteractionAt = performance.now();
    };

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.tabIndex = 0;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );
    this.intersectionObserver.observe(this.container);

    this.handleVisibility = () => {
      this.visible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  // ── markers ─────────────────────────────────────────────────────────────

  setMarkers(markers) {
    this.#clearMarkers();
    this.markers = Array.isArray(markers) ? markers : [];

    // Group by rounded coordinate so stacked trips can be fanned out.
    const buckets = new Map();
    for (const marker of this.markers) {
      if (!Number.isFinite(marker?.lat) || !Number.isFinite(marker?.lng)) continue;
      const key = `${marker.lat.toFixed(3)}|${marker.lng.toFixed(3)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(marker);
    }

    const geometry = new SphereGeometry(MARKER_BASE_RADIUS, 14, 12);
    this.markerGeometry = geometry;

    for (const group of buckets.values()) {
      const offsets = spreadOffsets(group.length);
      group.forEach((marker, index) => {
        const [dLat, dLng] = offsets[index];
        const approximate = marker.geocodeSource === 'country_centroid';
        const color = new Color(marker.categoryColor || this.options.markerColor);

        const material = new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: approximate ? 0.72 : 1,
        });
        const mesh = new Mesh(geometry, material);
        const scale = approximate ? 0.8 : 1;
        mesh.scale.setScalar(scale);
        mesh.position.copy(
          latLngToVector3(marker.lat + dLat, marker.lng + dLng, GLOBE_RADIUS * 1.012)
        );
        mesh.userData.marker = marker;
        mesh.userData.baseScale = scale;
        mesh.userData.material = material;
        this.markerGroup.add(mesh);
        this.markerMeshes.push(mesh);
      });
    }
  }

  #clearMarkers() {
    for (const mesh of this.markerMeshes) {
      this.markerGroup.remove(mesh);
      mesh.userData.material?.dispose();
    }
    this.markerMeshes = [];
    this.markerGeometry?.dispose();
    this.markerGeometry = null;
    this.hovered = null;
  }

  /**
   * Finds the marker under the pointer by projecting markers to screen space
   * and taking the closest one within HIT_RADIUS_PX.
   *
   * Deliberately not a raycast: a marker is ~4 px wide at default zoom, and
   * requiring a pixel-perfect hit on the mesh makes the globe feel broken.
   * Screen-space distance decouples the target size from the dot size, so the
   * markers can stay small and still be easy to hit.
   */
  /**
   * Screen position of every marker currently facing the camera, in CSS pixels
   * relative to the canvas. Drives hit testing, and lets tests aim at a marker
   * without guessing its pixel position from a screenshot.
   */
  getMarkerScreenPositions() {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return [];

    const worldPosition = new Vector3();
    const toCamera = new Vector3();
    const positions = [];

    for (const mesh of this.markerMeshes) {
      mesh.getWorldPosition(worldPosition);

      // Skip the far side of the globe: those markers are behind the surface.
      toCamera.copy(this.camera.position).sub(worldPosition).normalize();
      if (worldPosition.clone().normalize().dot(toCamera) <= 0.05) continue;

      worldPosition.project(this.camera);
      positions.push({
        marker: mesh.userData.marker,
        mesh,
        x: (worldPosition.x * 0.5 + 0.5) * rect.width,
        y: (-worldPosition.y * 0.5 + 0.5) * rect.height,
      });
    }

    return positions;
  }

  #intersectMarkers() {
    if (!this.pointerScreen || this.markerMeshes.length === 0) return null;

    let closest = null;
    let closestDistance = HIT_RADIUS_PX;

    for (const candidate of this.getMarkerScreenPositions()) {
      const distance = Math.hypot(
        candidate.x - this.pointerScreen.x,
        candidate.y - this.pointerScreen.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = candidate.mesh;
      }
    }

    return closest;
  }

  #handleClick() {
    const mesh = this.#intersectMarkers();
    if (mesh?.userData.marker) this.options.onMarkerClick?.(mesh.userData.marker);
  }

  #updateHover() {
    if (this.dragging) return;
    const mesh = this.#intersectMarkers();
    if (mesh === this.hovered) return;

    if (this.hovered) {
      this.hovered.scale.setScalar(this.hovered.userData.baseScale);
    }
    this.hovered = mesh;

    if (mesh) {
      mesh.scale.setScalar(mesh.userData.baseScale * 2.1);
      this.renderer.domElement.style.cursor = 'pointer';
      this.options.onMarkerHover?.(mesh.userData.marker, this.pointerScreen);
    } else {
      this.renderer.domElement.style.cursor = 'grab';
      this.options.onMarkerHover?.(null, null);
    }
  }

  // ── public controls ─────────────────────────────────────────────────────

  /** Rotates the globe so the given coordinates face the camera. */
  focusOn(lat, lng) {
    this.rotation.yaw = -((lng + 180) * Math.PI) / 180 + Math.PI / 2;
    this.rotation.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, (lat * Math.PI) / 180));
    this.rotation.velocityYaw = 0;
    this.rotation.velocityPitch = 0;
    this.lastInteractionAt = performance.now();
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ── loop ────────────────────────────────────────────────────────────────

  #start() {
    let previousFrameAt = performance.now();

    const tick = () => {
      if (this.disposed) return;
      this.frameHandle = requestAnimationFrame(tick);

      const now = performance.now();
      // Clamped so a backgrounded tab cannot resume with a huge jump.
      const deltaSeconds = Math.min(0.1, (now - previousFrameAt) / 1000);
      previousFrameAt = now;

      if (!this.visible) return;

      const idle = now - this.lastInteractionAt > IDLE_BEFORE_AUTOROTATE_MS;
      if (!this.dragging) {
        // Inertia after a drag, then a slow idle spin.
        this.rotation.yaw += this.rotation.velocityYaw;
        this.rotation.pitch += this.rotation.velocityPitch;
        this.rotation.velocityYaw *= 0.93;
        this.rotation.velocityPitch *= 0.93;
        if (Math.abs(this.rotation.velocityYaw) < 1e-5) this.rotation.velocityYaw = 0;
        if (Math.abs(this.rotation.velocityPitch) < 1e-5) this.rotation.velocityPitch = 0;

        // Never rotate while the pointer is over the globe: the user is
        // reading or aiming at a marker, and a moving target is unusable.
        const pointerOnGlobe = this.pointerScreen !== null && this.pointerScreen !== undefined;
        if (this.options.autoRotate && !this.prefersReducedMotion && idle && !pointerOnGlobe) {
          this.rotation.yaw += AUTO_ROTATE_RAD_PER_SEC * deltaSeconds;
        }
      } else {
        this.rotation.yaw += this.rotation.velocityYaw;
        this.rotation.pitch += this.rotation.velocityPitch;
        this.rotation.velocityYaw *= 0.6;
        this.rotation.velocityPitch *= 0.6;
      }

      this.rotation.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.rotation.pitch));
      this.globeGroup.rotation.y = this.rotation.yaw;
      this.globeGroup.rotation.x = this.rotation.pitch;

      this.camera.position.z += (this.zoom - this.camera.position.z) * 0.12;
      this.atmosphere.scale.setScalar(1);

      this.#updateHover();
      this.renderer.render(this.scene, this.camera);
    };

    this.lastInteractionAt = performance.now();
    tick();
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    this.#clearMarkers();
    this.globe.geometry.dispose();
    this.globeMaterial.dispose();
    this.earthTexture?.dispose();
    this.atmosphere.geometry.dispose();
    this.atmosphereMaterial.dispose();
    this.renderer.dispose();
    canvas.parentNode?.removeChild(canvas);
  }
}

export default Terepgomb;
