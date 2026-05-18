// Three.js 场景：增强版赛博朋克背景，支持星流与鼠标交互视差。
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

function randomRange(min, max) {
  return min + Math.random() * (max - min);
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
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    const starsCount = window.innerWidth > 900 ? 2200 : 1200;
    const starPositions = new Float32Array(starsCount * 3);
    const starVelocity = new Float32Array(starsCount);
    for (let i = 0, v = 0; i < starsCount * 3; i += 3, v += 1) {
      starPositions[i] = randomRange(-45, 45);
      starPositions[i + 1] = randomRange(-32, 32);
      starPositions[i + 2] = randomRange(-70, 18);
      starVelocity[v] = randomRange(0.08, 0.3);
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0x4cf2ff,
      size: 0.13,
      transparent: true,
      opacity: 0.85
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.19, 22, 120),
      new THREE.MeshBasicMaterial({
        color: 0xff4fd8,
        transparent: true,
        opacity: 0.36
      })
    );
    ringA.rotation.x = Math.PI * 0.38;
    scene.add(ringA);

    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.12, 18, 100),
      new THREE.MeshBasicMaterial({
        color: 0x42e9ff,
        transparent: true,
        opacity: 0.34
      })
    );
    ringB.rotation.x = Math.PI * 0.12;
    ringB.rotation.y = Math.PI * 0.2;
    scene.add(ringB);

    const wireCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.7, 1),
      new THREE.MeshBasicMaterial({
        color: 0xa05bff,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      })
    );
    scene.add(wireCore);

    const floorGrid = new THREE.GridHelper(120, 64, 0x2af2ff, 0x1f3060);
    floorGrid.position.y = -10;
    floorGrid.position.z = -8;
    floorGrid.rotation.x = Math.PI * 0.5;
    scene.add(floorGrid);

    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };
    const stage = { scrollProgress: 0, beatEnergy: 0 };
    const restScale = new THREE.Vector3(1, 1, 1);
    const onPointerMove = (event) => {
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onScrollProgress = (event) => {
      if (!event?.detail) {
        return;
      }
      stage.scrollProgress = Math.min(Math.max(event.detail.progress || 0, 0), 1);
    };
    window.addEventListener("cyber-scroll", onScrollProgress);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let rafId = 0;
    let pulseAt = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const positions = starsGeometry.attributes.position.array;
      stage.beatEnergy = Math.min(Math.max(Number(window.__cyberBeatEnergy || 0), 0), 1);

      const speedBoost = 1 + stage.scrollProgress * 2 + stage.beatEnergy * 2.6;
      const cameraTargetZ = 22 - stage.scrollProgress * 4.8 + stage.beatEnergy * 0.8;

      pointer.x += (pointerTarget.x - pointer.x) * 0.05;
      pointer.y += (pointerTarget.y - pointer.y) * 0.05;
      camera.position.x = pointer.x * 1.8;
      camera.position.y = -pointer.y * 1.2;
      camera.position.z += (cameraTargetZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);

      for (let i = 0, v = 0; i < positions.length; i += 3, v += 1) {
        positions[i + 2] += starVelocity[v] * speedBoost;
        if (positions[i + 2] > 20) {
          positions[i + 2] = randomRange(-72, -54);
          positions[i] = randomRange(-45, 45);
          positions[i + 1] = randomRange(-32, 32);
        }
      }
      starsGeometry.attributes.position.needsUpdate = true;

      wireCore.rotation.y = elapsed * (0.32 + stage.beatEnergy * 0.2);
      wireCore.rotation.x = elapsed * (0.15 + stage.scrollProgress * 0.07);
      ringA.rotation.z = elapsed * (0.15 + stage.scrollProgress * 0.2);
      ringB.rotation.z = -elapsed * (0.19 + stage.beatEnergy * 0.25);
      floorGrid.position.z = -8 + Math.sin(elapsed * 0.5 + stage.scrollProgress * 2) * (1.1 + stage.beatEnergy);
      stars.rotation.y = elapsed * 0.028;
      ringA.material.opacity = 0.28 + stage.beatEnergy * 0.55;
      ringB.material.opacity = 0.24 + stage.beatEnergy * 0.48;
      wireCore.material.opacity = 0.4 + stage.beatEnergy * 0.25;

      if (elapsed - pulseAt > 3.4) {
        pulseAt = elapsed;
        ringA.scale.setScalar(randomRange(1.02, 1.1));
        ringB.scale.setScalar(randomRange(0.95, 1.05));
      } else {
        ringA.scale.lerp(restScale, 0.05);
        ringB.scale.lerp(restScale, 0.05);
      }

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    animate();
    setStatus("Three.js Hyper Scene 在线 · Agent x Frontend");

    window.addEventListener("beforeunload", () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("cyber-scroll", onScrollProgress);
      starsGeometry.dispose();
      starsMaterial.dispose();
      ringA.geometry.dispose();
      ringB.geometry.dispose();
      wireCore.geometry.dispose();
      ringA.material.dispose();
      ringB.material.dispose();
      wireCore.material.dispose();
      renderer.dispose();
    });
  } catch (error) {
    console.error("Three.js 背景初始化失败：", error);
    setStatus("动态背景加载失败，已降级为静态模式。", true);
    canvas.style.display = "none";
  }
}

void initScene();
