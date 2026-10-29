"use client";

import { useEffect, useRef } from "react";

// Cenas 3D leves em Three.js: pétalas, luzes suaves e alianças. Carregam sob demanda, param fora da tela
// e respeitam "reduzir movimento". Sem WebGL, simplesmente não aparecem.

export type SceneKind = "petals" | "lights" | "rings";
export type SceneColors = { background: string; surface: string; accent: string; ink: string };
type Three = typeof import("three");

type Props = { kinds: SceneKind[]; colors: SceneColors; className?: string; density?: number };

export default function Scene3D({ kinds, colors, className, density = 1 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const key = `${kinds.join()}|${colors.background}|${colors.surface}|${colors.accent}|${colors.ink}|${density}`;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup = () => {};
    let gone = false;
    import("three").then((THREE) => {
      if (!gone) cleanup = mount(THREE, el, kinds, colors, density);
    });
    return () => {
      gone = true;
      cleanup();
    };
    // `key` resume kinds, cores e densidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={host} className={`scene3d ${className ?? ""}`} aria-hidden="true" />;
}

function mount(THREE: Three, el: HTMLElement, kinds: SceneKind[], colors: SceneColors, density: number) {
  let renderer: InstanceType<Three["WebGLRenderer"]>;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  const small = el.clientWidth < 640;
  const view = { w: 1, h: 1 };
  const updates: ((t: number, dt: number) => void)[] = [];
  const disposables: { dispose(): void }[] = [];
  const c = (hex: string) => new THREE.Color(hex);

  if (kinds.includes("petals")) {
    // Pétala levemente curvada; cada instância gira e balança enquanto cai.
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.42, -0.25, 0.36, 0.32, 0, 0.5);
    shape.bezierCurveTo(-0.36, 0.32, -0.42, -0.25, 0, -0.5);
    const geo = new THREE.ShapeGeometry(shape, 10);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, (pos.getX(i) ** 2) * 0.9 - (pos.getY(i) ** 2) * 0.25);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.75, transparent: true, opacity: 0.82 });
    const count = Math.round((small ? 22 : 40) * density);
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const tones = [c(colors.accent), c(colors.surface).lerp(c(colors.accent), 0.35), c("#FFFFFF").lerp(c(colors.accent), 0.18), c(colors.surface)];
    const items = Array.from({ length: count }, (_, i) => {
      mesh.setColorAt(i, tones[i % tones.length]);
      return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: -3 + Math.random() * 5,
        s: 0.22 + Math.random() * 0.22,
        fall: 0.25 + Math.random() * 0.3,
        sway: Math.random() * Math.PI * 2,
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        spin: (Math.random() - 0.5) * 1.6,
      };
    });
    const d = new THREE.Object3D();
    updates.push((t, dt) => {
      for (let i = 0; i < count; i++) {
        const p = items[i];
        const depth = 1 + p.z * -0.1;
        p.y -= (p.fall * dt) / (view.h * 0.5 * depth);
        if (p.y < -1.15) {
          p.y = 1.15;
          p.x = Math.random() * 2 - 1;
        }
        d.position.set(p.x * view.w * 0.5 * depth + Math.sin(t * 0.6 + p.sway) * 0.4, p.y * view.h * 0.5 * depth, p.z);
        d.rotation.set(p.rx + t * p.spin, p.ry + t * p.spin * 0.7, Math.sin(t * 0.8 + p.sway) * 0.6);
        d.scale.setScalar(p.s);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
    scene.add(mesh);
    disposables.push(geo, mat);
  }

  if (kinds.includes("lights")) {
    // Pontos de luz desfocados que sobem devagar, como bokeh.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const g = canvas.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const count = Math.round((small ? 36 : 70) * density);
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const seed = Array.from({ length: count }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, -4 + Math.random() * 6, Math.random() * 6]);
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const glow = c(colors.accent).lerp(c("#FFFFFF"), 0.25);
    const mat = new THREE.PointsMaterial({ map: tex, color: glow, size: small ? 0.5 : 0.62, transparent: true, opacity: 0.55, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    updates.push((t) => {
      for (let i = 0; i < count; i++) {
        const [x, y, z, ph] = seed[i];
        const yy = ((((y + 1 + t * 0.03 * (1 + ph * 0.1)) % 2) + 2) % 2) - 1;
        p[i * 3] = x * view.w * 0.55 + Math.sin(t * 0.3 + ph) * 0.3;
        p[i * 3 + 1] = yy * view.h * 0.55;
        p[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.45 + Math.sin(t * 0.8) * 0.08;
    });
    scene.add(pts);
    disposables.push(geo, mat, tex);
  }

  if (kinds.includes("rings")) {
    // Duas alianças entrelaçadas, douradas, refletindo um ambiente neutro.
    const pmrem = new THREE.PMREMGenerator(renderer);
    disposables.push(pmrem);
    import("three/examples/jsm/environments/RoomEnvironment.js").then(({ RoomEnvironment }) => {
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      disposables.push(env);
    });
    const geo = new THREE.TorusGeometry(1, 0.11, 40, 140);
    const gold = new THREE.MeshPhysicalMaterial({ color: c("#D9B776").lerp(c(colors.accent), 0.12), metalness: 1, roughness: 0.22, clearcoat: 0.6 });
    const a = new THREE.Mesh(geo, gold);
    const b = new THREE.Mesh(geo, gold);
    a.position.x = -0.55;
    b.position.x = 0.55;
    b.rotation.x = Math.PI / 2;
    const pair = new THREE.Group();
    pair.add(a, b);
    pair.rotation.set(0.35, -0.4, 0.15);
    scene.add(pair);
    updates.push((t) => {
      pair.rotation.y = -0.4 + t * 0.35;
      pair.position.y = Math.sin(t * 0.9) * 0.12;
      const fit = Math.min(view.w, view.h) / 3.4;
      pair.scale.setScalar(Math.min(fit, 1.6));
    });
    disposables.push(geo, gold);
  }

  // Leve paralaxe com o mouse (só em dispositivos com ponteiro preciso).
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    look.tx = (e.clientX / window.innerWidth - 0.5) * 0.8;
    look.ty = (e.clientY / window.innerHeight - 0.5) * -0.5;
  };
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (fine) window.addEventListener("pointermove", onMove, { passive: true });

  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.h = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    view.w = view.h * camera.aspect;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let t = 0;
  let frame = 0;
  let visible = false;
  const draw = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    look.x += (look.tx - look.x) * 0.04;
    look.y += (look.ty - look.y) * 0.04;
    camera.position.x = look.x;
    camera.position.y = look.y;
    camera.lookAt(0, 0, 0);
    for (const u of updates) u(t, dt);
    renderer.render(scene, camera);
  };
  const loop = () => {
    frame = 0;
    if (!visible || document.hidden) return;
    draw();
    frame = requestAnimationFrame(loop);
  };
  const start = () => {
    if (still) {
      // Sem animação: um quadro parado, já com as peças espalhadas.
      t = 8;
      draw();
      setTimeout(draw, 400);
      return;
    }
    if (!frame) {
      clock.getDelta();
      frame = requestAnimationFrame(loop);
    }
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  });
  io.observe(el);
  const onVisibility = () => !document.hidden && visible && start();
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onMove);
    for (const d of disposables) d.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
