"use client";

/**
 * Visionneuse 3D du modèle artwork
 * Utilise le même material wireframe rouge que sur la map
 */

import { useEffect, useRef } from "react";

export default function ModelViewer({ modelUrl }) {
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    let mounted = true;

    const initScene = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls");

      if (!mounted || !containerRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x415eae);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 5);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2;

      // Lighting (same as map)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(0, -70, 100).normalize();
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight2.position.set(0, 70, 100).normalize();
      scene.add(directionalLight2);

      // Material (same as map - red wireframe)
      const material = new THREE.MeshStandardMaterial({
        color: 0xff0004,
        metalness: 0.0,
        roughness: 0.5,
        wireframe: true,
      });

      // Load model
      const loader = new GLTFLoader();

      // Construire l'URL proxy
      const filename = modelUrl.split("/").pop();
      const proxyUrl = `${process.env.NEXT_PUBLIC_API_URL}/proxy/models/${filename}`;

      loader.load(
        proxyUrl,
        (gltf) => {
          if (!mounted) return;

          const model = gltf.scene;

          // Apply material to all meshes
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = material;
            }
          });

          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;

          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));

          scene.add(model);
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
        }
      );

      // Animation loop
      let animationId;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      // Cleanup function
      cleanupRef.current = () => {
        mounted = false;
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", handleResize);
        controls.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    initScene();

    return () => {
      cleanupRef.current?.();
    };
  }, [modelUrl]);

  return <div ref={containerRef} className="model-viewer" />;
}
