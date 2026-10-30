import * as THREE from 'three';
import { ModelLayerSettings } from '../types';

export class PancreasModel extends THREE.Group {
  // Main anatomical groups
  pancreasGroup = new THREE.Group();
  ductGroup = new THREE.Group();
  duodenumGroup = new THREE.Group();
  vesselGroup = new THREE.Group();
  biliaryGroup = new THREE.Group();
  spleenGroup = new THREE.Group();
  histologyGroup = new THREE.Group();

  // Materials for live tweaking
  pancreasMaterials: THREE.MeshStandardMaterial[] = [];
  ductMaterial!: THREE.MeshStandardMaterial;
  accessoryDuctMaterial!: THREE.MeshStandardMaterial;
  bileDuctMaterial!: THREE.MeshStandardMaterial;
  duodenumMaterial!: THREE.MeshStandardMaterial;
  arteryMaterial!: THREE.MeshStandardMaterial;
  veinMaterial!: THREE.MeshStandardMaterial;

  // Highlight targets
  highlightableMeshes = new Map<string, THREE.Mesh[]>();

  constructor() {
    super();
    this.name = 'PancreasModelRoot';

    this.initMaterials();
    this.buildPancreasParenchyma();
    this.buildDuctSystem();
    this.buildDuodenum();
    this.buildVessels();
    this.buildBiliaryAndSpleen();
    this.buildHistologyCallout();

    this.add(
      this.pancreasGroup,
      this.ductGroup,
      this.duodenumGroup,
      this.vesselGroup,
      this.biliaryGroup,
      this.spleenGroup,
      this.histologyGroup
    );
  }

  private initMaterials() {
    // Procedural lobulated texture for pancreas acini
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#E8BD82';
      ctx.fillRect(0, 0, 256, 256);
      // Create organic cobblestone lobular bumps
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 4 + Math.random() * 9;
        const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(255, 235, 195, 0.45)');
        grad.addColorStop(0.7, 'rgba(225, 175, 110, 0.3)');
        grad.addColorStop(1, 'rgba(180, 120, 60, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const bumpTexture = new THREE.CanvasTexture(canvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(4, 3);

    const basePancreasMat = new THREE.MeshStandardMaterial({
      color: 0xe5a963,
      bumpMap: bumpTexture,
      bumpScale: 0.003,
      roughness: 0.52,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94,
      depthWrite: true,
    });
    this.pancreasMaterials.push(basePancreasMat);

    this.ductMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // vibrant sky blue/cyan duct
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });

    this.accessoryDuctMaterial = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
    });

    this.bileDuctMaterial = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // vibrant emerald green for bile
      roughness: 0.3,
      metalness: 0.15,
      emissive: 0x15803d,
      emissiveIntensity: 0.35,
    });

    this.duodenumMaterial = new THREE.MeshStandardMaterial({
      color: 0xde7a7a,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.arteryMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444, // bright arterial red
      roughness: 0.35,
      metalness: 0.2,
      emissive: 0x991b1b,
      emissiveIntensity: 0.2,
    });

    this.veinMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // deep venous blue
      roughness: 0.4,
      metalness: 0.15,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2,
    });
  }

  // 1. Pancreas Parenchyma (Head, Uncinate, Neck, Body, Tail)
  private buildPancreasParenchyma() {
    const mat = this.pancreasMaterials[0];

    // Spline curve for the main pancreas body and tail
    // Extending from tail [-0.38, 0.19, 0.02] down through body, neck, and head [0.18, 0.02, 0.04]
    const points = [
      new THREE.Vector3(-0.38, 0.19, 0.02), // Tail tip
      new THREE.Vector3(-0.30, 0.17, 0.03), // Tail mid
      new THREE.Vector3(-0.20, 0.14, 0.04), // Body distal
      new THREE.Vector3(-0.10, 0.11, 0.04), // Body mid
      new THREE.Vector3(-0.02, 0.09, 0.04), // Body proximal
      new THREE.Vector3(0.06, 0.07, 0.04),  // Neck
      new THREE.Vector3(0.14, 0.04, 0.03),  // Head upper
      new THREE.Vector3(0.18, 0.00, 0.02),  // Head center
    ];
    const spineCurve = new THREE.CatmullRomCurve3(points);

    // Custom tapered tube / loft mesh for the pancreatic body & tail
    const segments = 48;
    const radialSegments = 24;
    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const curvePoints = spineCurve.getPoints(segments);
    const tangents = spineCurve.computeFrenetFrames(segments, false);

    // Radius function along the spine: narrow at tail, thickest at body and head
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = curvePoints[i];
      const N = tangents.normals[i];
      const B = tangents.binormals[i];

      // Organic cross-section profile: slightly prismatic/triangular
      // Radius variation along the gland
      let rX = 0.028 + 0.028 * Math.sin(t * Math.PI); // width
      let rY = 0.032 + 0.035 * Math.sin(t * Math.PI); // height
      if (t < 0.2) {
        // Tail is narrow and flattened
        rX *= 0.4 + 0.6 * (t / 0.2);
        rY *= 0.4 + 0.6 * (t / 0.2);
      } else if (t > 0.8) {
        // Head transition
        rX *= 1.35;
        rY *= 1.45;
      }

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        // Add subtle organic surface lobulation
        const lobule = 1.0 + 0.06 * Math.sin(theta * 6 + i * 0.8) + 0.04 * Math.cos(theta * 4 - i * 0.5);
        const xOffset = Math.cos(theta) * rX * lobule;
        const yOffset = Math.sin(theta) * rY * lobule;

        const vertex = new THREE.Vector3()
          .copy(pt)
          .addScaledVector(N, xOffset)
          .addScaledVector(B, yOffset);

        vertices.push(vertex.x, vertex.y, vertex.z);

        const normal = new THREE.Vector3()
          .addScaledVector(N, Math.cos(theta))
          .addScaledVector(B, Math.sin(theta))
          .normalize();
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(t, j / radialSegments);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(geom, mat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.pancreasGroup.add(bodyMesh);

    // Register highlight targets for body, tail, neck
    this.highlightableMeshes.set('body', [bodyMesh]);
    this.highlightableMeshes.set('tail', [bodyMesh]);
    this.highlightableMeshes.set('neck', [bodyMesh]);

    // Head of pancreas: large rounded, lobulated bulb filling the duodenal C-loop
    const headGeom = new THREE.SphereGeometry(0.065, 32, 24);
    // Deform into characteristic flattened C-loop nest shape
    const headPos = headGeom.attributes.position;
    for (let k = 0; k < headPos.count; k++) {
      let x = headPos.getX(k);
      let y = headPos.getY(k);
      let z = headPos.getZ(k);
      // Flatten in Z, expand in X/Y with lobulation
      z *= 0.65;
      x *= 1.25;
      y *= 1.35;
      // organic bumps
      const bump = 1.0 + 0.05 * Math.sin(x * 60) * Math.cos(y * 60);
      headPos.setXYZ(k, x * bump, y * bump, z * bump);
    }
    headGeom.computeVertexNormals();

    const headMesh = new THREE.Mesh(headGeom, mat);
    headMesh.position.set(0.18, 0.01, 0.02);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.pancreasGroup.add(headMesh);
    this.highlightableMeshes.set('head', [headMesh]);

    // Uncinate process: hook curving down and posteromedially
    const uncinateCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.16, -0.04, 0.01),
      new THREE.Vector3(0.14, -0.09, 0.0),
      new THREE.Vector3(0.10, -0.12, -0.015),
      new THREE.Vector3(0.07, -0.13, -0.02),
    ]);
    const uncinateGeom = new THREE.TubeGeometry(uncinateCurve, 20, 0.028, 16, false);
    const uncinateMesh = new THREE.Mesh(uncinateGeom, mat);
    uncinateMesh.castShadow = true;
    this.pancreasGroup.add(uncinateMesh);
    this.highlightableMeshes.set('uncinate', [uncinateMesh]);
  }

  // 2. Internal Duct System (Wirsung, Santorini, Tributaries, Common Bile Duct, Ampulla)
  private buildDuctSystem() {
    // Main Pancreatic Duct (Wirsung)
    const wirsungPoints = [
      new THREE.Vector3(-0.36, 0.19, 0.02),
      new THREE.Vector3(-0.28, 0.17, 0.03),
      new THREE.Vector3(-0.18, 0.14, 0.04),
      new THREE.Vector3(-0.08, 0.10, 0.04),
      new THREE.Vector3(0.02, 0.08, 0.04),
      new THREE.Vector3(0.10, 0.06, 0.03),
      new THREE.Vector3(0.16, 0.02, 0.02),
      new THREE.Vector3(0.20, -0.02, 0.02),
      new THREE.Vector3(0.26, -0.04, 0.025), // Junction at Ampulla of Vater
    ];
    const wirsungCurve = new THREE.CatmullRomCurve3(wirsungPoints);
    const wirsungGeom = new THREE.TubeGeometry(wirsungCurve, 64, 0.0055, 12, false);
    const wirsungMesh = new THREE.Mesh(wirsungGeom, this.ductMaterial);
    this.ductGroup.add(wirsungMesh);
    this.highlightableMeshes.set('main_duct', [wirsungMesh]);

    // Multiple secondary interlobular tributary ducts in herringbone arrangement
    const tributaries: THREE.Vector3[][] = [
      // Tail & body branches
      [new THREE.Vector3(-0.31, 0.19, 0.03), new THREE.Vector3(-0.33, 0.22, 0.03)],
      [new THREE.Vector3(-0.29, 0.16, 0.03), new THREE.Vector3(-0.30, 0.13, 0.02)],
      [new THREE.Vector3(-0.24, 0.16, 0.035), new THREE.Vector3(-0.25, 0.19, 0.04)],
      [new THREE.Vector3(-0.22, 0.14, 0.035), new THREE.Vector3(-0.23, 0.10, 0.025)],
      [new THREE.Vector3(-0.15, 0.13, 0.04), new THREE.Vector3(-0.16, 0.16, 0.045)],
      [new THREE.Vector3(-0.13, 0.11, 0.04), new THREE.Vector3(-0.14, 0.07, 0.03)],
      [new THREE.Vector3(-0.05, 0.10, 0.04), new THREE.Vector3(-0.06, 0.13, 0.045)],
      [new THREE.Vector3(-0.03, 0.08, 0.04), new THREE.Vector3(-0.04, 0.05, 0.03)],
      // Head branches
      [new THREE.Vector3(0.12, 0.06, 0.03), new THREE.Vector3(0.10, 0.09, 0.035)],
      [new THREE.Vector3(0.17, 0.00, 0.02), new THREE.Vector3(0.14, -0.05, 0.01)],
      [new THREE.Vector3(0.18, -0.03, 0.015), new THREE.Vector3(0.12, -0.09, -0.005)], // to uncinate
    ];

    tributaries.forEach((pair) => {
      const curve = new THREE.LineCurve3(pair[0], pair[1]);
      const geom = new THREE.TubeGeometry(curve, 8, 0.0025, 8, false);
      const mesh = new THREE.Mesh(geom, this.ductMaterial);
      this.ductGroup.add(mesh);
    });

    // Accessory Pancreatic Duct (Santorini)
    const santoriniPoints = [
      new THREE.Vector3(0.16, 0.02, 0.02),
      new THREE.Vector3(0.19, 0.05, 0.03),
      new THREE.Vector3(0.24, 0.08, 0.035), // Minor papilla
    ];
    const santoriniCurve = new THREE.CatmullRomCurve3(santoriniPoints);
    const santoriniGeom = new THREE.TubeGeometry(santoriniCurve, 20, 0.004, 10, false);
    const santoriniMesh = new THREE.Mesh(santoriniGeom, this.accessoryDuctMaterial);
    this.ductGroup.add(santoriniMesh);
    this.highlightableMeshes.set('accessory_duct', [santoriniMesh]);

    // Common Bile Duct (CBD)
    const cbdPoints = [
      new THREE.Vector3(0.24, 0.28, -0.03), // from hepatic ducts
      new THREE.Vector3(0.23, 0.20, -0.035),
      new THREE.Vector3(0.22, 0.12, -0.035), // posterior to duodenum bulb
      new THREE.Vector3(0.22, 0.04, -0.02),  // in groove behind head
      new THREE.Vector3(0.24, -0.01, 0.0),
      new THREE.Vector3(0.26, -0.04, 0.025), // Merges at Ampulla of Vater
    ];
    const cbdCurve = new THREE.CatmullRomCurve3(cbdPoints);
    const cbdGeom = new THREE.TubeGeometry(cbdCurve, 32, 0.007, 12, false);
    const cbdMesh = new THREE.Mesh(cbdGeom, this.bileDuctMaterial);
    this.biliaryGroup.add(cbdMesh);
    this.highlightableMeshes.set('common_bile_duct', [cbdMesh]);

    // Ampulla of Vater & Major Duodenal Papilla
    const ampullaGeom = new THREE.SphereGeometry(0.012, 16, 16);
    const ampullaMesh = new THREE.Mesh(
      ampullaGeom,
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      })
    );
    ampullaMesh.position.set(0.265, -0.04, 0.028);
    this.ductGroup.add(ampullaMesh);

    // Sphincter of Oddi muscular ring representation
    const sphincterGeom = new THREE.TorusGeometry(0.011, 0.0035, 12, 24);
    const sphincterMesh = new THREE.Mesh(
      sphincterGeom,
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        roughness: 0.5,
      })
    );
    sphincterMesh.position.copy(ampullaMesh.position);
    sphincterMesh.rotation.y = Math.PI / 2;
    this.ductGroup.add(sphincterMesh);

    this.highlightableMeshes.set('ampulla_vater', [ampullaMesh, sphincterMesh]);
  }

  // 3. Duodenum C-Loop with Internal Mucosal Surface
  private buildDuodenum() {
    // Duodenum C-loop spine curve
    const duodPoints = [
      new THREE.Vector3(0.12, 0.22, 0.01),  // 1st part (bulb) origin from pylorus
      new THREE.Vector3(0.22, 0.24, 0.0),   // Superior duodenal flexure
      new THREE.Vector3(0.32, 0.18, 0.01),  // 2nd part (descending) upper
      new THREE.Vector3(0.34, 0.05, 0.02),  // 2nd part mid (at papilla level)
      new THREE.Vector3(0.33, -0.08, 0.02), // 2nd part lower
      new THREE.Vector3(0.28, -0.18, 0.01), // Inferior duodenal flexure
      new THREE.Vector3(0.14, -0.21, 0.0),  // 3rd part (horizontal/inferior)
      new THREE.Vector3(0.00, -0.20, -0.01),
      new THREE.Vector3(-0.06, -0.14, -0.02), // 4th part (ascending)
      new THREE.Vector3(-0.08, -0.07, -0.025), // Duodenojejunal flexure (Ligament of Treitz)
    ];
    const duodCurve = new THREE.CatmullRomCurve3(duodPoints);
    const duodGeom = new THREE.TubeGeometry(duodCurve, 64, 0.038, 20, false);
    const duodMesh = new THREE.Mesh(duodGeom, this.duodenumMaterial);
    duodMesh.castShadow = true;
    duodMesh.receiveShadow = true;
    this.duodenumGroup.add(duodMesh);

    // Duodenal papillae inside / on surface
    const majorPapillaGeom = new THREE.ConeGeometry(0.008, 0.016, 16);
    const papillaMat = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      roughness: 0.4,
    });
    const majorPapilla = new THREE.Mesh(majorPapillaGeom, papillaMat);
    majorPapilla.position.set(0.27, -0.04, 0.025);
    majorPapilla.rotation.z = -Math.PI / 2;
    this.duodenumGroup.add(majorPapilla);

    const minorPapilla = new THREE.Mesh(majorPapillaGeom.clone().scale(0.65, 0.65, 0.65), papillaMat);
    minorPapilla.position.set(0.26, 0.08, 0.03);
    minorPapilla.rotation.z = -Math.PI / 2;
    this.duodenumGroup.add(minorPapilla);

    this.highlightableMeshes.set('duodenum', [duodMesh, majorPapilla, minorPapilla]);
  }

  // 4. Vascular System (Splenic Artery & Vein, SMA, SMV, Portal Vein)
  private buildVessels() {
    // Tortuous, wavy Splenic Artery running along superior pancreatic border
    const splenicArtPoints: THREE.Vector3[] = [];
    const numPoints = 28;
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      // X from celiac trunk (0.02) to spleen (-0.44)
      const x = 0.02 - t * 0.46;
      // Y tracks upper border with sinusoidal tortuous undulations
      const y = 0.12 + t * 0.10 + Math.sin(t * Math.PI * 6) * 0.014;
      // Z slight wobble
      const z = 0.02 + Math.cos(t * Math.PI * 5) * 0.012;
      splenicArtPoints.push(new THREE.Vector3(x, y, z));
    }
    const splenicArtCurve = new THREE.CatmullRomCurve3(splenicArtPoints);
    const splenicArtGeom = new THREE.TubeGeometry(splenicArtCurve, 48, 0.0065, 12, false);
    const splenicArtMesh = new THREE.Mesh(splenicArtGeom, this.arteryMaterial);
    this.vesselGroup.add(splenicArtMesh);

    // Pancreatic branches from splenic artery (a. pancreatica magna)
    const magnaCurve = new THREE.LineCurve3(
      new THREE.Vector3(-0.18, 0.17, 0.02),
      new THREE.Vector3(-0.19, 0.09, 0.03)
    );
    const magnaMesh = new THREE.Mesh(
      new THREE.TubeGeometry(magnaCurve, 8, 0.0028, 8, false),
      this.arteryMaterial
    );
    this.vesselGroup.add(magnaMesh);

    // Splenic Vein: wider, smoother, running in the posterior groove of pancreas
    const splenicVeinPoints = [
      new THREE.Vector3(-0.43, 0.20, -0.01),
      new THREE.Vector3(-0.32, 0.17, -0.015),
      new THREE.Vector3(-0.20, 0.13, -0.015),
      new THREE.Vector3(-0.08, 0.10, -0.015),
      new THREE.Vector3(0.04, 0.07, -0.01), // Merges with SMV behind neck
    ];
    const splenicVeinCurve = new THREE.CatmullRomCurve3(splenicVeinPoints);
    const splenicVeinGeom = new THREE.TubeGeometry(splenicVeinCurve, 32, 0.008, 12, false);
    const splenicVeinMesh = new THREE.Mesh(splenicVeinGeom, this.veinMaterial);
    this.vesselGroup.add(splenicVeinMesh);

    // Superior Mesenteric Artery (SMA): passes in front of uncinate, behind neck
    const smaPoints = [
      new THREE.Vector3(0.03, 0.14, -0.02),  // from abdominal aorta
      new THREE.Vector3(0.05, 0.08, -0.01),  // behind neck
      new THREE.Vector3(0.07, 0.0, 0.02),    // emerges anterior to uncinate
      new THREE.Vector3(0.08, -0.10, 0.025), // crosses 3rd duodenal part
      new THREE.Vector3(0.09, -0.22, 0.03),  // into mesentery
    ];
    const smaCurve = new THREE.CatmullRomCurve3(smaPoints);
    const smaGeom = new THREE.TubeGeometry(smaCurve, 32, 0.007, 12, false);
    const smaMesh = new THREE.Mesh(smaGeom, this.arteryMaterial);
    this.vesselGroup.add(smaMesh);

    // Superior Mesenteric Vein (SMV) & Portal Vein confluence
    const smvPoints = [
      new THREE.Vector3(0.12, -0.22, 0.03), // from mesentery
      new THREE.Vector3(0.11, -0.10, 0.025),
      new THREE.Vector3(0.09, 0.0, 0.02),
      new THREE.Vector3(0.06, 0.07, -0.01), // Joins splenic vein behind neck
    ];
    const smvCurve = new THREE.CatmullRomCurve3(smvPoints);
    const smvGeom = new THREE.TubeGeometry(smvCurve, 32, 0.0085, 12, false);
    const smvMesh = new THREE.Mesh(smvGeom, this.veinMaterial);
    this.vesselGroup.add(smvMesh);

    // Hepatic Portal Vein (ascends toward liver hilum)
    const portalPoints = [
      new THREE.Vector3(0.05, 0.07, -0.01), // union of SV + SMV
      new THREE.Vector3(0.09, 0.16, -0.02),
      new THREE.Vector3(0.13, 0.25, -0.025), // ascends in hepatoduodenal ligament
    ];
    const portalCurve = new THREE.CatmullRomCurve3(portalPoints);
    const portalGeom = new THREE.TubeGeometry(portalCurve, 16, 0.01, 14, false);
    const portalMesh = new THREE.Mesh(portalGeom, this.veinMaterial);
    this.vesselGroup.add(portalMesh);

    this.highlightableMeshes.set('splenic_vessels', [splenicArtMesh, splenicVeinMesh]);
    this.highlightableMeshes.set('sma_smv', [smaMesh, smvMesh, portalMesh]);
  }

  // 5. Biliary System & Spleen
  private buildBiliaryAndSpleen() {
    // Gallbladder: pear-shaped green/amber sac
    const gbGeom = new THREE.SphereGeometry(0.032, 24, 20);
    const gbPos = gbGeom.attributes.position;
    for (let i = 0; i < gbPos.count; i++) {
      let x = gbPos.getX(i);
      let y = gbPos.getY(i);
      let z = gbPos.getZ(i);
      // elongate in Y to look pear-shaped
      if (y > 0) y *= 1.35;
      gbPos.setXYZ(i, x, y, z);
    }
    gbGeom.computeVertexNormals();

    const gbMat = new THREE.MeshStandardMaterial({
      color: 0x3e8e41,
      roughness: 0.35,
      metalness: 0.1,
    });
    const gbMesh = new THREE.Mesh(gbGeom, gbMat);
    gbMesh.position.set(0.30, 0.32, -0.04);
    gbMesh.rotation.z = -0.3;
    this.biliaryGroup.add(gbMesh);

    // Cystic Duct connecting Gallbladder to Common Hepatic Duct
    const cysticPoints = [
      new THREE.Vector3(0.30, 0.30, -0.04),
      new THREE.Vector3(0.27, 0.29, -0.035),
      new THREE.Vector3(0.24, 0.28, -0.03),
    ];
    const cysticCurve = new THREE.CatmullRomCurve3(cysticPoints);
    const cysticMesh = new THREE.Mesh(
      new THREE.TubeGeometry(cysticCurve, 16, 0.004, 10, false),
      this.bileDuctMaterial
    );
    this.biliaryGroup.add(cysticMesh);

    // Spleen: Purplish-crimson bean/crescent-shaped organ at the pancreatic tail
    const spleenGeom = new THREE.SphereGeometry(0.068, 28, 22);
    const spleenPos = spleenGeom.attributes.position;
    for (let i = 0; i < spleenPos.count; i++) {
      let x = spleenPos.getX(i);
      let y = spleenPos.getY(i);
      let z = spleenPos.getZ(i);
      // Flatten into convex diaphragmatic surface and concave visceral surface
      x *= 0.65;
      y *= 1.45;
      z *= 1.05;
      // concave hilum on medial side
      if (x > 0) x *= 0.75;
      spleenPos.setXYZ(i, x, y, z);
    }
    spleenGeom.computeVertexNormals();

    const spleenMat = new THREE.MeshStandardMaterial({
      color: 0x6b285b,
      roughness: 0.45,
      metalness: 0.1,
    });
    const spleenMesh = new THREE.Mesh(spleenGeom, spleenMat);
    spleenMesh.position.set(-0.46, 0.23, 0.03);
    spleenMesh.rotation.z = 0.25;
    spleenMesh.rotation.y = -0.2;
    this.spleenGroup.add(spleenMesh);
    this.highlightableMeshes.set('spleen', [spleenMesh]);
  }

  // 6. Histological Microscopic Unit: Islet of Langerhans 3D Callout
  private buildHistologyCallout() {
    // A floating spherical cutaway model showing endocrine vs exocrine architecture
    const calloutRoot = new THREE.Group();
    calloutRoot.position.set(-0.02, 0.22, 0.12);
    calloutRoot.scale.setScalar(0.06);

    // Outer spherical shell (Exocrine Acinar cluster)
    const shellGeom = new THREE.SphereGeometry(1.0, 32, 24, 0, Math.PI * 1.5); // 3/4 cutaway
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xe59866,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const shellMesh = new THREE.Mesh(shellGeom, shellMat);
    calloutRoot.add(shellMesh);

    // Inner Core: Endocrine Islet of Langerhans
    // Beta cells (65% - Insulin, Cyan/Blue)
    const betaGroup = new THREE.Group();
    const cellGeom = new THREE.SphereGeometry(0.11, 12, 10);
    const betaMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    for (let i = 0; i < 35; i++) {
      const cell = new THREE.Mesh(cellGeom, betaMat);
      // Distribute in central core
      const r = Math.pow(Math.random(), 0.6) * 0.65;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      cell.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      betaGroup.add(cell);
    }
    calloutRoot.add(betaGroup);

    // Alpha cells (20% - Glucagon, Coral/Orange)
    const alphaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xc2410c,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    for (let i = 0; i < 14; i++) {
      const cell = new THREE.Mesh(cellGeom, alphaMat);
      // Periphery distribution
      const r = 0.55 + Math.random() * 0.25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      cell.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      calloutRoot.add(cell);
    }

    // Delta cells (5% - Somatostatin, Emerald Green)
    const deltaMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    for (let i = 0; i < 6; i++) {
      const cell = new THREE.Mesh(cellGeom, deltaMat);
      const r = 0.5 + Math.random() * 0.25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      cell.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      calloutRoot.add(cell);
    }

    // Microscopic capillaries weaving through the islet
    const capillaryPoints = [
      new THREE.Vector3(-0.8, -0.6, 0.2),
      new THREE.Vector3(-0.3, -0.2, 0.4),
      new THREE.Vector3(0.2, 0.1, 0.3),
      new THREE.Vector3(0.7, 0.5, 0.1),
    ];
    const capillaryCurve = new THREE.CatmullRomCurve3(capillaryPoints);
    const capillaryMesh = new THREE.Mesh(
      new THREE.TubeGeometry(capillaryCurve, 20, 0.035, 8, false),
      this.arteryMaterial
    );
    calloutRoot.add(capillaryMesh);

    this.histologyGroup.add(calloutRoot);
    this.highlightableMeshes.set('islets_langerhans', [shellMesh]);
  }

  // Update layer display settings (opacity, cutaway, layer visibility)
  updateLayers(settings: ModelLayerSettings) {
    // Pancreas transparency / X-ray
    for (const mat of this.pancreasMaterials) {
      mat.opacity = settings.pancreasOpacity;
      mat.transparent = settings.pancreasOpacity < 0.99;
      mat.depthWrite = settings.pancreasOpacity > 0.6;
    }

    // Cutaway mode highlights the interior duct system dramatically
    if (settings.showDuctCutaway) {
      this.ductMaterial.emissiveIntensity = 0.8;
      this.accessoryDuctMaterial.emissiveIntensity = 0.7;
    } else {
      this.ductMaterial.emissiveIntensity = 0.35;
      this.accessoryDuctMaterial.emissiveIntensity = 0.3;
    }

    this.duodenumGroup.visible = settings.showDuodenum;
    this.vesselGroup.visible = settings.showVessels;
    this.biliaryGroup.visible = settings.showBiliary;
    this.spleenGroup.visible = settings.showSpleen;
    this.histologyGroup.visible = settings.showHistologyCallout;
  }

  // Highlight a specific anatomical structure by ID
  setHighlightedStructure(id: string | null) {
    // Reset all mesh emissives
    this.highlightableMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => {
        if (mesh.material && 'emissive' in mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });
    });

    if (!id) return;

    const meshes = this.highlightableMeshes.get(id);
    if (meshes) {
      meshes.forEach((mesh) => {
        if (mesh.material && 'emissive' in mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xf59e0b); // golden highlight glow
          mat.emissiveIntensity = 0.6;
        }
      });
    }
  }

  dispose() {
    this.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
