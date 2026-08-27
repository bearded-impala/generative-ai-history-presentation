import * as THREE from "three";
import type { CameraWaypoint, Vec3 } from "../presentation/types";
import { restingWaypoint } from "./camera";



const STAGE_CHROME = {
  title: '[data-stage-chrome="title"]',
  guide: '[data-stage-chrome="guide"]',
  timeline: '[data-stage-chrome="timeline"]',
} as const;

const HUD_PAD_PX = 24;

const TIMELINE_LABEL_OVERFLOW_PX = 40;

export const STAGE_FILL = 0.86;
const MIN_DIST = 1.2;
const MAX_DIST = 96;
const MAX_LOCAL_SIZE = 64;

interface SafeRect {
  left: number;
  top: number;
  width: number;
  height: number;
  canvasW: number;
  canvasH: number;
}

export const audienceStage = {
  slideId: null as string | null,
  group: null as THREE.Object3D | null,
};

export const stageControl = {
  resting: false,
  userOrbiting: false,
};

export function registerAudienceStage(slideId: string, group: THREE.Object3D | null) {
  if (!group) return;
  audienceStage.slideId = slideId;
  audienceStage.group = group;
}

export function unregisterAudienceStage(slideId: string, group: THREE.Object3D | null) {
  if (audienceStage.slideId === slideId && audienceStage.group === group) {
    audienceStage.group = null;
  }
}

export function measureSafeRect(canvas: HTMLElement, fallbackW: number, fallbackH: number): SafeRect {
  const cr = canvas.getBoundingClientRect();
  const canvasW = cr.width || fallbackW;
  const canvasH = cr.height || fallbackH;

  const insetL = 32;
  let insetR = 24;
  let insetT = 24;
  let insetB = 96;

  const title = document.querySelector(STAGE_CHROME.title);
  if (title) {
    const r = title.getBoundingClientRect();
    insetT = Math.max(insetT, r.bottom - cr.top + HUD_PAD_PX);
  }

  const guide = document.querySelector(STAGE_CHROME.guide);
  if (guide) {
    const r = guide.getBoundingClientRect();
    insetR = Math.max(insetR, cr.right - r.left + HUD_PAD_PX);
  }

  const timeline = document.querySelector(STAGE_CHROME.timeline);
  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const topOfChrome = r.top - TIMELINE_LABEL_OVERFLOW_PX;
    insetB = Math.max(insetB, cr.bottom - topOfChrome + HUD_PAD_PX);
  }

  const width = Math.max(64, canvasW - insetL - insetR);
  const height = Math.max(64, canvasH - insetT - insetB);
  return { left: insetL, top: insetT, width, height, canvasW, canvasH };
}

function safeRectCenterNdc(safe: SafeRect): { x: number; y: number } {
  const cx = safe.left + safe.width * 0.5;
  const cy = safe.top + safe.height * 0.5;
  return {
    x: (cx / safe.canvasW) * 2 - 1,
    y: 1 - (cy / safe.canvasH) * 2,
  };
}

const _size = new THREE.Vector3();
const _geoBox = new THREE.Box3();
const _invRoot = new THREE.Matrix4();

function isWorldVisible(obj: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = obj;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}

function isStageFloor(obj: THREE.Object3D): boolean {
  const mat = (obj as THREE.Mesh).material;
  const materials = Array.isArray(mat) ? mat : mat ? [mat] : [];
  for (const m of materials) {
    const uniforms = (m as THREE.ShaderMaterial).uniforms;
    if (uniforms?.fadeDistance) return true;
  }
  let node: THREE.Object3D | null = obj;
  while (node) {
    if (node.type === "GridHelper" || node.name === "Grid") return true;
    node = node.parent;
  }
  return false;
}


export function collectLocalBox(root: THREE.Object3D): THREE.Box3 | null {
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  _invRoot.copy(root.matrixWorld).invert();

  root.traverse((obj) => {
    if (!isWorldVisible(obj) || isStageFloor(obj)) return;
    const geom = (obj as THREE.Mesh).geometry;
    if (!geom) return;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const bb = geom.boundingBox;
    if (!bb || bb.isEmpty()) return;

    _geoBox.copy(bb).applyMatrix4(obj.matrixWorld).applyMatrix4(_invRoot);
    if (_geoBox.isEmpty()) return;
    _geoBox.getSize(_size);
    if (!Number.isFinite(_size.x) || _size.length() > MAX_LOCAL_SIZE) return;
    box.union(_geoBox);
  });

  if (box.isEmpty()) return null;
  box.getSize(_size);
  if (_size.x + _size.y + _size.z < 0.05) return null;
  return box;
}

const _proj = new THREE.Vector3();
const _scratchCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
const _boxCenter = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _corners: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());

function boxCorners(box: THREE.Box3, target: THREE.Vector3[]) {
  const { min, max } = box;
  target[0].set(min.x, min.y, min.z);
  target[1].set(min.x, min.y, max.z);
  target[2].set(min.x, max.y, min.z);
  target[3].set(min.x, max.y, max.z);
  target[4].set(max.x, min.y, min.z);
  target[5].set(max.x, min.y, max.z);
  target[6].set(max.x, max.y, min.z);
  target[7].set(max.x, max.y, max.z);
}

interface FittedPose {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export function fitPoseToBox(
  authored: CameraWaypoint | CameraWaypoint[],
  localBox: THREE.Box3,
  restAnchor: Vec3,
  safe: SafeRect,
  aspect: number
): FittedPose | null {
  const wp = restingWaypoint(authored);
  const fov = wp.fov ?? 50;

  const worldBox = localBox.clone();
  worldBox.min.x += restAnchor[0];
  worldBox.min.y += restAnchor[1];
  worldBox.min.z += restAnchor[2];
  worldBox.max.x += restAnchor[0];
  worldBox.max.y += restAnchor[1];
  worldBox.max.z += restAnchor[2];
  worldBox.getCenter(_boxCenter);

  _forward.set(wp.lookAt[0] - wp.position[0], wp.lookAt[1] - wp.position[1], wp.lookAt[2] - wp.position[2]);
  if (_forward.lengthSq() < 1e-8) _forward.set(0, 0, 1);
  _forward.normalize();

  const safeFracX = safe.width / safe.canvasW;
  const safeFracY = safe.height / safe.canvasH;
  if (safeFracX < 0.05 || safeFracY < 0.05) return null;
  _scratchCam.aspect = Math.max(aspect, 0.1);
  _pos.copy(_boxCenter).addScaledVector(_forward, -10);
  _scratchCam.position.copy(_pos);
  _scratchCam.lookAt(_boxCenter);
  _scratchCam.updateMatrixWorld();

  boxCorners(worldBox, _corners);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    _proj.copy(_corners[i]).applyMatrix4(_scratchCam.matrixWorldInverse);
    if (!Number.isFinite(_proj.x) || !Number.isFinite(_proj.y)) continue;
    minX = Math.min(minX, _proj.x);
    maxX = Math.max(maxX, _proj.x);
    minY = Math.min(minY, _proj.y);
    maxY = Math.max(maxY, _proj.y);
  }
  const viewW = Math.max(maxX - minX, 1e-4);
  const viewH = Math.max(maxY - minY, 1e-4);

  const halfH = Math.tan(((fov * Math.PI) / 180) * 0.5);
  const halfW = halfH * Math.max(aspect, 0.1);
  const dist = THREE.MathUtils.clamp(
    Math.max(viewW / (2 * halfW * safeFracX * STAGE_FILL), viewH / (2 * halfH * safeFracY * STAGE_FILL)),
    MIN_DIST,
    MAX_DIST
  );

  _pos.copy(_boxCenter).addScaledVector(_forward, -dist);
  return {
    position: [_pos.x, _pos.y, _pos.z],
    lookAt: [_boxCenter.x, _boxCenter.y, _boxCenter.z],
    fov,
  };
}

export function applyProjectionShift(camera: THREE.PerspectiveCamera, safe: SafeRect) {
  const ndc = safeRectCenterNdc(safe);
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[8] -= ndc.x;
  camera.projectionMatrix.elements[9] -= ndc.y;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

export function dampVec3(current: Vec3, target: Vec3, lambda: number, dt: number) {
  const k = 1 - Math.exp(-lambda * dt);
  current[0] += (target[0] - current[0]) * k;
  current[1] += (target[1] - current[1]) * k;
  current[2] += (target[2] - current[2]) * k;
}
