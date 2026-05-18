// Three.js 场景：构建轻量赛博朋克动态背景，并在失败时优雅降级。
const canvas = document.getElementById("bg-canvas");
const statusNode = document.getElementById("render-status");

function setStatus(message, isError = false) {
  if (!statusNode) {
    return;
  }
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff7dcf" : "#38f2ff";
}

async function loadThreeModule() {
  try {
    return await import("https://unpkg.com/three@0.166.1/build/three.module.js");
  } catch (firstError) {
    console.warn("unpkg 加载 three.js 失败，尝试 jsDelivr。", firstError);
    return import("https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js");
  }
}

async function initScene() {
  if (!canvas) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setStatus("检测到减少动态效果偏好，已切换静态背景。");
    canvas.style.display = "none";
    return;
  }

  try {
    const THREE = await loadThreeModule();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1500;
    const positions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = (Math.random() - 0.5) * 50;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0x43eeff,
      size: 0.12,
      transparent: true,
      opacity: 0.9
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.18, 18, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff4fd8,
        transparent: true,
        opacity: 0.35
      })
    );
    neonRing.rotation.x = Math.PI * 0.38;
    scene.add(neonRing);

    const wireCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4, 1),
      new THREE.MeshBasicMaterial({
        color: 0x9a4dff,
        wireframe: true,
        transparent: true,
        opacity: 0.42
      })
    );
    scene.add(wireCore);

    const floorGrid = new THREE.GridHelper(90, 48, 0x38f2ff, 0x203267);
    floorGrid.position.y = -9;
    floorGrid.position.z = -6;
    floorGrid.rotation.x = Math.PI * 0.5;
    scene.add(floorGrid);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      stars.rotation.y = elapsed * 0.025;
      stars.rotation.x = Math.sin(elapsed * 0.15) * 0.08;
      wireCore.rotation.y = elapsed * 0.2;
      wireCore.rotation.x = elapsed * 0.13;
      neonRing.rotation.z = elapsed * 0.12;
      floorGrid.position.z = -6 + Math.sin(elapsed * 0.4) * 0.6;

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    animate();
    setStatus("Three.js 场景已启动 · AI x Frontend");

    window.addEventListener("beforeunload", () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    });
  } catch (error) {
    console.error("Three.js 背景初始化失败：", error);
    setStatus("动态背景加载失败，已降级为静态模式。", true);
    canvas.style.display = "none";
  }
}

void initScene();
