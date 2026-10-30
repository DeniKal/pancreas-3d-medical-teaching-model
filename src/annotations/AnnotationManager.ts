import * as THREE from 'three';
import { ANATOMICAL_STRUCTURES } from '../anatomyData';
import { AnatomicalStructure } from '../types';

export interface PinItem {
  structure: AnatomicalStructure;
  group: THREE.Group;
  markerMesh: THREE.Mesh;
  pulseRing: THREE.Mesh;
  billboardSprite: THREE.Sprite;
  baseY: number;
}

export class AnnotationManager extends THREE.Group {
  pins: PinItem[] = [];
  selectedStructureId: string | null = null;
  hoveredStructureId: string | null = null;
  onStructureSelected?: (structure: AnatomicalStructure) => void;

  private leaderLine: THREE.Line;
  private leaderLineGeom: THREE.BufferGeometry;

  constructor(onStructureSelected?: (structure: AnatomicalStructure) => void) {
    super();
    this.name = 'AnnotationManager';
    this.onStructureSelected = onStructureSelected;

    // Leader line connecting selected pin to callout target
    this.leaderLineGeom = new THREE.BufferGeometry();
    const linePositions = new Float32Array([0, 0, 0, 0, 0, 0]);
    this.leaderLineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.leaderLine = new THREE.Line(
      this.leaderLineGeom,
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      })
    );
    this.leaderLine.visible = false;
    this.add(this.leaderLine);

    this.createPins();
  }

  private createPins() {
    const sphereGeom = new THREE.SphereGeometry(0.012, 16, 16);
    const ringGeom = new THREE.RingGeometry(0.014, 0.02, 24);

    ANATOMICAL_STRUCTURES.forEach((struct) => {
      const pinGroup = new THREE.Group();
      pinGroup.position.set(...struct.pinPosition);
      pinGroup.name = `Pin_${struct.id}`;

      // Colored marker sphere
      const markerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(struct.color),
        emissive: new THREE.Color(struct.color),
        emissiveIntensity: 0.5,
        roughness: 0.2,
      });
      const markerMesh = new THREE.Mesh(sphereGeom, markerMat);
      markerMesh.userData = { structureId: struct.id, isAnnotationPin: true };
      pinGroup.add(markerMesh);

      // Pulsing indicator ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(struct.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const pulseRing = new THREE.Mesh(ringGeom, ringMat);
      pulseRing.rotation.x = Math.PI / 2;
      pinGroup.add(pulseRing);

      // 3D Billboard text label
      const sprite = this.createLabelSprite(struct.name, struct.color);
      sprite.position.set(0, 0.035, 0);
      pinGroup.add(sprite);

      this.add(pinGroup);

      this.pins.push({
        structure: struct,
        group: pinGroup,
        markerMesh,
        pulseRing,
        billboardSprite: sprite,
        baseY: struct.pinPosition[1],
      });
    });
  }

  private createLabelSprite(text: string, colorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Rounded pill badge background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 4;
      const r = 24;
      const x = 6;
      const y = 6;
      const w = 500;
      const h = 116;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.font = 'bold 36px "Google Sans", system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.18, 0.045, 1);
    return sprite;
  }

  selectStructure(id: string | null) {
    if (this.selectedStructureId === id) return;
    this.selectedStructureId = id;

    this.pins.forEach((pin) => {
      const isSelected = pin.structure.id === id;
      const isHovered = pin.structure.id === this.hoveredStructureId;

      // Scale and visual emphasis
      const targetScale = isSelected ? 1.4 : isHovered ? 1.2 : 1.0;
      pin.markerMesh.scale.setScalar(targetScale);

      // Emissive boost
      const mat = pin.markerMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.7 : 0.45;

      // Label visibility: Selected gets prominent size, others slightly subtle
      pin.billboardSprite.scale.set(
        isSelected ? 0.22 : 0.17,
        isSelected ? 0.055 : 0.042,
        1
      );
    });
  }

  setHoveredStructure(id: string | null) {
    if (this.hoveredStructureId === id) return;
    this.hoveredStructureId = id;
    this.pins.forEach((pin) => {
      if (pin.structure.id !== this.selectedStructureId) {
        const isHovered = pin.structure.id === id;
        pin.markerMesh.scale.setScalar(isHovered ? 1.2 : 1.0);
        const mat = pin.markerMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isHovered ? 0.75 : 0.45;
      }
    });
  }

  update(time: number, cameraPos?: THREE.Vector3) {
    // Pulse animation for rings
    this.pins.forEach((pin, index) => {
      const isSelected = pin.structure.id === this.selectedStructureId;
      const speed = isSelected ? 4 : 2;
      const phase = time * speed + index * 0.4;
      const scale = 1.0 + 0.5 * Math.sin(phase);
      pin.pulseRing.scale.setScalar(scale);

      const ringMat = pin.pulseRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = Math.max(0.15, 0.6 - 0.3 * Math.sin(phase));

      // Subtle hover bobbing
      pin.group.position.y = pin.baseY + Math.sin(time * 2 + index * 0.5) * 0.003;

      // Face ring to camera if available
      if (cameraPos) {
        pin.pulseRing.lookAt(cameraPos);
      }
    });
  }

  setPinsVisible(visible: boolean) {
    this.visible = visible;
  }

  dispose() {
    this.pins.forEach((pin) => {
      pin.markerMesh.geometry.dispose();
      (pin.markerMesh.material as THREE.Material).dispose();
      pin.pulseRing.geometry.dispose();
      (pin.pulseRing.material as THREE.Material).dispose();
      (pin.billboardSprite.material as THREE.Material).dispose();
    });
    this.leaderLineGeom.dispose();
    (this.leaderLine.material as THREE.Material).dispose();
  }
}
