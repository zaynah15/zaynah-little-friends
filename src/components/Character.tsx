import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { CharacterState } from "../state/types";

type Props = {
  state: CharacterState;
  side: "right";
  x: number;
  y: number;
  attention?: { mode: "none" | "talk"; lean: number };
  physicsX?: number;
  physicsY?: number;
  physicsRotation?: number;
  fallen?: boolean;
};

type SceneRefs = {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  hair: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftArmMesh: THREE.Mesh;
  rightArmMesh: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  eyes: THREE.Mesh[];
  mouth: THREE.Mesh;
  orb: THREE.Mesh;
  book: THREE.Group;
  shadow: THREE.Mesh;
};

const PALETTE: Record<CharacterState, { body: number; hair: number }> = {
  idle: { body: 0x70b957, hair: 0x3d6b31 },
  happy: { body: 0xf07ab3, hair: 0x8d3c70 },
  angry: { body: 0xe95454, hair: 0x6f2c2c },
  thinking: { body: 0x4e86e8, hair: 0x294b9b },
  reading: { body: 0xf2b63f, hair: 0x8b5b24 },
};

function material(color: number, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
  });
}

function capsule(radius: number, length: number, color: number) {
  return new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 8, 16),
    material(color)
  );
}

function makeHair(color: number) {
  const group = new THREE.Group();
  const mat = material(color, 0.9);
  for (let i = 0; i < 9; i += 1) {
    const strand = new THREE.Mesh(
      new THREE.SphereGeometry(0.25 + (i % 3) * 0.018, 12, 10),
      mat
    );
    const angle = (i / 9) * Math.PI * 2;
    strand.position.set(Math.cos(angle) * 0.39, Math.sin(angle) * 0.37, -0.02);
    strand.scale.set(0.9, 1.15, 0.72);
    group.add(strand);
  }
  return group;
}

function createCharacterScene(canvas: HTMLCanvasElement, initialState: CharacterState) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.65, -1.35, 0.1, 20);
  camera.position.set(0, 0.15, 6);
  camera.lookAt(0, 0.15, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xffd8c0, 1.2, 8);
  rim.position.set(2, 1, 3);
  scene.add(rim);

  const root = new THREE.Group();
  root.position.y = -0.12;
  scene.add(root);

  const palette = PALETTE[initialState];
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.63, 24, 20), material(palette.body));
  body.scale.set(0.92, 1.18, 0.68);
  body.position.y = -0.35;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 22), material(0xffdcc5, 0.88));
  head.position.y = 0.48;
  head.scale.set(1, 0.98, 0.9);
  root.add(head);

  const hair = makeHair(palette.hair);
  hair.position.set(0, 0.52, -0.12);
  hair.scale.set(1.02, 1.08, 1);
  root.add(hair);

  const eyeMat = material(0x352a2a, 0.55);
  const eyes: THREE.Mesh[] = [];
  [-0.17, 0.17].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeMat);
    eye.position.set(x, 0.49, 0.42);
    eye.scale.set(1, 1.35, 0.55);
    root.add(eye);
    eyes.push(eye);
  });

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 18, Math.PI), eyeMat);
  mouth.position.set(0, 0.32, 0.42);
  mouth.rotation.z = Math.PI;
  root.add(mouth);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const armL = capsule(0.11, 0.38, palette.body);
  const armR = capsule(0.11, 0.38, palette.body);
  armL.position.y = -0.1; armL.rotation.z = -0.85; leftArm.add(armL);
  armR.position.y = -0.1; armR.rotation.z = 0.85; rightArm.add(armR);
  leftArm.position.set(-0.54, -0.22, 0.02);
  rightArm.position.set(0.54, -0.22, 0.02);
  root.add(leftArm, rightArm);

  const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), material(palette.body));
  const rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), material(palette.body));
  leftFoot.scale.set(1.25, 0.62, 0.95); rightFoot.scale.set(1.25, 0.62, 0.95);
  leftFoot.position.set(-0.25, -1.0, 0.03); rightFoot.position.set(0.25, -1.0, 0.03);
  root.add(leftFoot, rightFoot);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffc928, emissive: 0xffb300, emissiveIntensity: 1.8, roughness: 0.35 })
  );
  orb.position.set(0, 1.25, 0.1);
  orb.visible = false;
  root.add(orb);

  const book = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.46), material(0x355f46, 0.75));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.075, 0.4), material(0xfff1c9, 0.95));
  pages.position.y = 0.045;
  book.add(cover, pages);
  book.position.set(0, 0.08, 0.55);
  book.rotation.x = -0.35;
  book.visible = false;
  root.add(book);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.17, -0.25);
  root.add(shadow);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
  }

  const refs: SceneRefs = { root, body, head, hair, leftArm, rightArm, leftArmMesh: armL, rightArmMesh: armR, leftFoot, rightFoot, eyes, mouth, orb, book, shadow };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return { scene, camera, renderer, refs, observer };
}

export default function Character({ state, x, y, attention = { mode: "none", lean: 0 }, physicsX = 0, physicsY = 0, physicsRotation = 0, fallen = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const [webglError, setWebglError] = useState(false);
  const attentionRef = useRef(attention);
  const physicsRef = useRef({ x: physicsX, y: physicsY, rotation: physicsRotation, fallen });

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { attentionRef.current = attention; }, [attention]);
  useEffect(() => { physicsRef.current = { x: physicsX, y: physicsY, rotation: physicsRotation, fallen }; }, [physicsX, physicsY, physicsRotation, fallen]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let resources: ReturnType<typeof createCharacterScene> | null = null;
    try {
      resources = createCharacterScene(canvasRef.current, state);
      setWebglError(false);
    } catch (error) {
      console.error("3D character could not initialize", error);
      setWebglError(true);
      return;
    }

    const { scene, camera, renderer, refs, observer } = resources;
    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const t = now / 1000;
      const currentState = stateRef.current;
      const physics = physicsRef.current;
      const palette = PALETTE[currentState];

      (refs.body.material as THREE.MeshStandardMaterial).color.setHex(palette.body);
      (refs.leftArmMesh.material as THREE.MeshStandardMaterial).color.setHex(palette.body);
      (refs.rightArmMesh.material as THREE.MeshStandardMaterial).color.setHex(palette.body);
      (refs.leftFoot.material as THREE.MeshStandardMaterial).color.setHex(palette.body);
      (refs.rightFoot.material as THREE.MeshStandardMaterial).color.setHex(palette.body);
      refs.hair.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material && !Array.isArray(mesh.material)) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(palette.hair);
        }
      });

      refs.root.position.x = physics.x / 170;
      refs.root.position.y = physics.y / 170;
      refs.root.rotation.x = 0;
      refs.root.rotation.z = THREE.MathUtils.degToRad(physics.rotation);
      refs.head.rotation.z = 0;
      refs.head.position.x = 0;

      const bob = Math.sin(t * 2.1) * 0.025;
      refs.root.position.y += bob;
      refs.root.rotation.y = Math.sin(t * 0.9) * 0.035;

      refs.orb.visible = currentState === "thinking";
      refs.orb.scale.setScalar(1 + Math.sin(t * 4.5) * 0.13);
      refs.orb.position.y = 1.25 + Math.sin(t * 3) * 0.035;

      refs.book.visible = currentState === "reading";
      refs.shadow.visible = !physics.fallen;

      if (currentState === "happy") {
        refs.leftArm.position.set(-0.54, -0.22, 0.02);
        refs.rightArm.position.set(0.54, -0.22, 0.02);
        refs.root.position.y += Math.abs(Math.sin(t * 4)) * 0.08;
        refs.leftArm.rotation.z = -0.95 + Math.sin(t * 7) * 0.18;
        refs.rightArm.rotation.z = 0.95 - Math.sin(t * 7) * 0.18;
      } else if (currentState === "angry") {
        refs.leftArm.position.set(-0.54, -0.22, 0.02);
        refs.rightArm.position.set(0.54, -0.22, 0.02);
        refs.root.position.x += Math.sin(t * 28) * 0.025;
        refs.head.rotation.z = Math.sin(t * 18) * 0.045;
        refs.leftArm.rotation.z = -0.72 + Math.sin(t * 14) * 0.08;
        refs.rightArm.rotation.z = 0.72 - Math.sin(t * 14) * 0.08;
      } else if (currentState === "thinking") {
        refs.leftArm.position.set(-0.43, 0.22, 0.18);
        refs.rightArm.position.set(0.43, 0.22, 0.18);
        refs.leftArm.rotation.z = -1.15;
        refs.rightArm.rotation.z = 1.15;
      } else if (currentState === "reading") {
        refs.leftArm.position.set(-0.54, -0.22, 0.02);
        refs.rightArm.position.set(0.54, -0.22, 0.02);
        refs.root.rotation.z = THREE.MathUtils.degToRad(physics.rotation) - 0.10;
        refs.root.rotation.x = -0.18;
        refs.book.rotation.z = Math.sin(t * 1.8) * 0.025;
        refs.leftArm.rotation.z = -1.0;
        refs.rightArm.rotation.z = 1.0;
      } else {
        refs.leftArm.position.set(-0.54, -0.22, 0.02);
        refs.rightArm.position.set(0.54, -0.22, 0.02);
        refs.leftArm.rotation.z = -0.85;
        refs.rightArm.rotation.z = 0.85;
        refs.root.rotation.x = 0;
      }

      if (attentionRef.current.mode === "talk") {
        refs.head.rotation.z = THREE.MathUtils.degToRad(attentionRef.current.lean);
        refs.head.position.x = Math.sin(t * 3.5) * 0.025;
      } else {
        refs.head.rotation.z *= Math.pow(0.001, dt);
        refs.head.position.x *= Math.pow(0.001, dt);
      }

      if (physics.fallen) {
        refs.root.position.y -= 0.95;
        refs.root.rotation.z += 0.7;
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((m) => m.dispose());
        }
      });
    };
  }, []);

  return (
    <div
      className={`character-3d character-3d-${state} ${fallen ? "character-3d-fallen" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`3D little friend: ${state}`}
    >
      <canvas ref={canvasRef} className="character-3d-canvas" aria-hidden="true" />
      {webglError && <div className="character-3d-fallback" role="status">3D character unavailable in this browser.</div>}
    </div>
  );
}
