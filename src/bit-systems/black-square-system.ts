import * as THREE from "three";

interface BlackSquareContext {
  blackSquareMesh: THREE.Mesh | null;
  blackTextSprite: THREE.Sprite | null;
  blackSquareCanvas: HTMLCanvasElement | null;
  blackSquareCtx: CanvasRenderingContext2D | null;
  blackSquareTexture: THREE.Texture | null;
}

export function addBlackSquareToCamera(context: BlackSquareContext): void {
  const cameraRig = document.querySelector("#avatar-pov-node");

  if (!cameraRig) {
    console.warn("❌ avatar-pov-node not found.");
    return;
  }

  const rig = (cameraRig as any).object3D;

  const geometry = new THREE.PlaneGeometry(8, 0.3);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    depthTest: false,
  });

  const square = new THREE.Mesh(geometry, material);
  square.position.set(0, -1.4, -2);
  square.renderOrder = 9999;
  rig.add(square);
  context.blackSquareMesh = square;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;

  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillText("Waiting...", 512, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const textSprite = new THREE.Sprite(spriteMaterial);
  textSprite.scale.set(4, 0.3, 1);
  textSprite.position.set(0, -1.4, -1.99);
  textSprite.renderOrder = 10000;
  rig.add(textSprite);

  context.blackSquareCanvas = canvas;
  context.blackSquareCtx = ctx;
  context.blackSquareTexture = texture;
  context.blackTextSprite = textSprite;

  console.log("✅ Black square and dynamic text added.");
}

export function removeBlackSquareFromCamera(context: BlackSquareContext): void {
  const cameraRig = document.querySelector("#avatar-pov-node");
  if (!cameraRig) return;

  const rig = (cameraRig as any).object3D;

  if (context.blackSquareMesh) {
    rig.remove(context.blackSquareMesh);
    context.blackSquareMesh.geometry.dispose();
    (context.blackSquareMesh.material as THREE.Material).dispose();
    context.blackSquareMesh = null;
  }

  if (context.blackTextSprite) {
    rig.remove(context.blackTextSprite);
    (context.blackTextSprite.material as THREE.Material).dispose();
    context.blackTextSprite = null;
  }

  context.blackSquareCanvas = null;
  context.blackSquareCtx = null;
  context.blackSquareTexture = null;

  console.log("🗑️ Black square and text removed.");
}

export function clearBlackSquareText(context: BlackSquareContext): void {
  if (context.blackSquareCtx && context.blackSquareTexture) {
    context.blackSquareCtx.clearRect(0, 0, 512, 128);
    context.blackSquareTexture.needsUpdate = true;
    console.log("🧼 Cleared black square text.");
  }
}
