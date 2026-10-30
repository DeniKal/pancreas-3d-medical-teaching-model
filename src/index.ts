import * as THREE from 'three';
import * as xb from 'xrblocks';
import { ANATOMICAL_STRUCTURES } from './anatomyData';
import { AnnotationManager } from './annotations/AnnotationManager';
import { PancreasModel } from './models/PancreasModel';
import { AnatomicalStructure, ModelLayerSettings } from './types';
import { PancreasTeachingUI } from './ui/PancreasTeachingUI';

class PancreasTeachingScene extends xb.Script {
  modelRoot = new THREE.Group();
  pancreasModel!: PancreasModel;
  annotationManager!: AnnotationManager;
  teachingUI!: PancreasTeachingUI;

  // Raycasting for desktop and XR
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  init() {
    this.setupLighting();
    this.setupModelAndAnnotations();
    this.setupSpatialUI();
    this.setupPointerListeners();

    // Select the head of the pancreas by default
    this.selectStructure(ANATOMICAL_STRUCTURES[0]);
  }

  private setupLighting() {
    // Ambient / Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 2.5);
    this.add(hemiLight);

    // Key directional light
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.add(keyLight);

    // Soft fill light from the left
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.6);
    fillLight.position.set(-3, 2, 2);
    this.add(fillLight);

    // Rim light from behind to accentuate organ contours
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(0, 2, -3);
    this.add(rimLight);
  }

  private setupModelAndAnnotations() {
    this.modelRoot.name = 'PancreasModelManipulableRoot';
    this.modelRoot.position.set(-0.16, 1.38, -0.85);
    this.modelRoot.scale.setScalar(1.2);

    // Enable direct user manipulation in XR so medical students can reposition or rotate the organ
    (this.modelRoot as any).xb = { manipulation: true };

    this.pancreasModel = new PancreasModel();
    this.modelRoot.add(this.pancreasModel);

    // 3D Annotations mounted onto modelRoot so they follow any manipulation
    this.annotationManager = new AnnotationManager((struct) => {
      this.selectStructure(struct);
    });
    this.modelRoot.add(this.annotationManager);

    this.add(this.modelRoot);
  }

  private setupSpatialUI() {
    this.teachingUI = new PancreasTeachingUI();

    // When structure selected from UI (Next/Prev/Duct buttons)
    this.teachingUI.onStructureSelected = (struct) => {
      this.selectStructure(struct);
    };

    // When layer display settings modified
    this.teachingUI.onLayerSettingsChanged = (settings: ModelLayerSettings) => {
      this.pancreasModel.updateLayers(settings);
      this.annotationManager.setPinsVisible(settings.showAnnotations);
    };

    this.add(this.teachingUI.card);
  }

  private setupPointerListeners() {
    // Desktop mouse interaction for 3D pins
    window.addEventListener('pointerdown', (event: MouseEvent) => {
      // Ignore if clicking on 2D DOM buttons or canvas edge
      if ((event.target as HTMLElement)?.tagName === 'BUTTON') return;

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const camera = xb.core.camera;
      if (!camera) return;

      this.raycaster.setFromCamera(this.mouse, camera);

      // Check intersection with pins
      const pinMeshes = this.annotationManager.pins.map((p) => p.markerMesh);
      const intersects = this.raycaster.intersectObjects(pinMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const structId = hit.userData?.structureId;
        if (structId) {
          const struct = ANATOMICAL_STRUCTURES.find((s) => s.id === structId);
          if (struct) {
            this.selectStructure(struct);
            this.teachingUI.handleQuizAnswerAttempt(structId);
          }
        }
      }
    });

    // Desktop hover feedback
    window.addEventListener('pointermove', (event: MouseEvent) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const camera = xb.core.camera;
      if (!camera) return;

      this.raycaster.setFromCamera(this.mouse, camera);
      const pinMeshes = this.annotationManager.pins.map((p) => p.markerMesh);
      const intersects = this.raycaster.intersectObjects(pinMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        this.annotationManager.setHoveredStructure(hit.userData?.structureId || null);
      } else {
        this.annotationManager.setHoveredStructure(null);
      }
    });
  }

  /**
   * Handle XR pointer selection and pinch events
   */
  onSelectStart(event: any) {
    const target = event?.target;
    if (target?.userData?.isAnnotationPin) {
      const structId = target.userData.structureId;
      const struct = ANATOMICAL_STRUCTURES.find((s) => s.id === structId);
      if (struct) {
        this.selectStructure(struct);
        this.teachingUI.handleQuizAnswerAttempt(structId);
      }
      event?.stopPropagation?.();
    }
  }

  private currentSelectedId: string | null = null;

  private selectStructure(struct: AnatomicalStructure) {
    if (this.currentSelectedId === struct.id) return;
    this.currentSelectedId = struct.id;
    this.annotationManager.selectStructure(struct.id);
    this.pancreasModel.setHighlightedStructure(struct.id);
    this.teachingUI.selectStructureById(struct.id);
  }

  update() {
    const time = performance.now() * 0.001;

    // Auto-rotate organ if enabled
    if (this.teachingUI.settings.autoRotate) {
      this.modelRoot.rotation.y += 0.008;
    }

    // Update pulsing rings and billboard facing
    const camera = xb.core.camera;
    this.annotationManager.update(time, camera?.position);
  }

  dispose() {
    this.pancreasModel.dispose();
    this.annotationManager.dispose();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.enableHands();
  options.enableReticles();
  options.hands.visualization = true;
  options.setAppTitle('Pancreas 3D Medical Teaching Model');
  options.setAppDescription(
    'Interactive anatomical teaching model of the pancreas with textual annotations, internal duct cutaways, and clinical correlates.'
  );

  xb.add(new PancreasTeachingScene());
  await xb.init(options);
});
