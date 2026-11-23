import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./ThreeCanvas.css";

const ThreeCanvas = forwardRef(({ 
  code, 
  onError, 
  onSuccess,
  onCodeGenerated,
  className = "" 
}, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Three.js instances stored in refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const animateCallbackRef = useRef(null);
  const initialCamPosRef = useRef(new THREE.Vector3(0, 2, 7));

  // Clean disposal of scene objects to prevent GPU memory leaks
  const cleanupScene = useCallback((scene) => {
    if (!scene) return;
    while (scene.children.length > 0) {
      const obj = scene.children[0];
      scene.remove(obj);
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }, []);

  // Studio 3-Point & Hemisphere Lighting Rig (Ensures models are never in dark)
  const addStudioLighting = useCallback((scene) => {
    if (!scene) return;

    // 1. Omnidirectional ambient light to brighten shadowed faces
    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambient);

    // 2. Hemisphere bounce light (sky white, ground soft slate)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2b2b3a, 1.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // 3. Primary Key Light (bright top-front-right illumination)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    // 4. Fill Light (soft cool fill from back-left to eliminate dark corners)
    const fillLight = new THREE.DirectionalLight(0xa5c4ff, 2.0);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    // 5. Front Fill Light (directly shines toward the front of models from camera angle)
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.4);
    frontLight.position.set(0, 0, 8);
    scene.add(frontLight);

    // 6. Warm Crimson Rim Light (creates subtle outline brilliance)
    const rimLight = new THREE.DirectionalLight(0xff4466, 1.6);
    rimLight.position.set(0, -6, -8);
    scene.add(rimLight);
  }, []);

  // Expose exportGLB and importGLB to parent via ref
  useImperativeHandle(ref, () => ({
    exportGLB: () => {
      if (!sceneRef.current) return;
      const exporter = new GLTFExporter();
      exporter.parse(
        sceneRef.current,
        (gltf) => {
          const blob = new Blob([gltf], { type: "model/gltf-binary" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `aerix-3d-model-${Date.now()}.glb`;
          link.click();
        },
        (error) => console.error("Export error:", error),
        { binary: true }
      );
    },
    importGLB: (file) => {
      if (!file || !sceneRef.current || !cameraRef.current) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target.result;
        const loader = new GLTFLoader();
        loader.parse(
          contents,
          "",
          (gltf) => {
            const scene = sceneRef.current;
            cleanupScene(scene);
            addStudioLighting(scene);

            // Add cyber studio ground grid
            const grid = new THREE.GridHelper(30, 30, 0xff3344, 0x222235);
            grid.material.opacity = 0.22;
            grid.material.transparent = true;
            scene.add(grid);

            // Double-sided materials for imported model
            gltf.scene.traverse((obj) => {
              if (obj.isMesh && obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m) => { m.side = THREE.DoubleSide; });
                } else {
                  obj.material.side = THREE.DoubleSide;
                }
              }
            });

            scene.add(gltf.scene);

            // Center and scale camera to fit model bounds at 3/4 elevated angle
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 2;

            gltf.scene.position.sub(center);
            grid.position.y = -maxDim * 0.5 - 0.02;

            const dist = Math.max(maxDim * 1.8, 4.5);
            cameraRef.current.position.set(dist * 0.6, dist * 0.45, dist * 0.8);
            cameraRef.current.lookAt(0, 0, 0);
            if (controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }

            // Smooth rotational animation loop
            animateCallbackRef.current = (time) => {
              gltf.scene.rotation.y = time * 0.35;
            };

            // Trigger appear animation
            if (canvasRef.current) {
              canvasRef.current.classList.remove("canvas-appear");
              void canvasRef.current.offsetWidth;
              canvasRef.current.classList.add("canvas-appear");
            }

            if (onCodeGenerated) {
              onCodeGenerated(
                `// Imported GLB Model: ${file.name}\n// File Size: ${(file.size / 1024).toFixed(1)} KB\n// Auto-centered with Box3 bounding volume\n\nscene.add(new THREE.AmbientLight(0xffffff, 1.2));\nconst dirLight = new THREE.DirectionalLight(0xffffff, 2.0);\ndirLight.position.set(5, 10, 7);\nscene.add(dirLight);\n\nreturn function animate(time) {\n    scene.children.forEach(c => {\n        if (c.type === 'Group') c.rotation.y = time * 0.35;\n    });\n};`
              );
            }
          },
          (err) => {
            console.error("[GLTFLoader Error]:", err);
            alert("Failed to parse GLB file. Please ensure it is a valid .glb or .gltf model.");
          }
        );
      };
      reader.readAsArrayBuffer(file);
    }
  }));

  // Initialize Three.js viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene (transparent background to reveal studio radial vignette)
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.copy(initialCamPosRef.current);
    cameraRef.current = camera;

    // 3. WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 60;
    controls.minDistance = 0.8;
    controlsRef.current = controls;

    // 5. Resize listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // 6. Master Animation Loop
    let startTime = performance.now();
    const renderLoop = () => {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      controls.update();

      if (animateCallbackRef.current) {
        const elapsed = (performance.now() - startTime) / 1000;
        try {
          animateCallbackRef.current(elapsed);
        } catch (err) {
          console.warn("[ThreeCanvas Runtime Warning]:", err);
        }
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      cleanupScene(scene);
      controls.dispose();
      renderer.dispose();
    };
  }, [cleanupScene]);

  // Execute or update dynamic code
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !code) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // Client-side sanitization
    let executable = code ? code.trim() : "";
    if (executable.startsWith("{") && executable.includes('"code"')) {
      try {
        const parsed = JSON.parse(executable);
        if (parsed.code) executable = parsed.code;
      } catch (_) {
        const m = executable.match(/"code"\s*:\s*"([\s\S]*?)"\s*[,}]/);
        if (m) {
          executable = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        }
      }
    }
    executable = executable.replace(/^```(?:javascript|js|json)?\s*/im, "").replace(/```$/gm, "").trim();
    const funcMatch = executable.match(/^function\s*(?:[a-zA-Z0-9_$]+)?\s*\([^)]*\)\s*\{([\s\S]*)\}\s*;?$/);
    if (funcMatch) {
      executable = funcMatch[1].trim();
    }

    try {
      cleanupScene(scene);
      addStudioLighting(scene);
      animateCallbackRef.current = null;

      // Studio cyber ground grid
      const grid = new THREE.GridHelper(30, 30, 0xff3344, 0x222235);
      grid.material.opacity = 0.22;
      grid.material.transparent = true;
      scene.add(grid);

      camera.position.set(3, 2.5, 5);
      camera.lookAt(0, 0, 0);
      initialCamPosRef.current.copy(camera.position);

      // eslint-disable-next-line no-new-func
      const sceneBuilder = new Function("scene", "camera", "renderer", "THREE", executable);
      const maybeAnimate = sceneBuilder(scene, camera, renderer, THREE);

      if (typeof maybeAnimate === "function") {
        animateCallbackRef.current = maybeAnimate;
      }

      // Ensure double-sided materials on all procedural meshes
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj !== grid) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => { m.side = THREE.DoubleSide; });
          } else {
            obj.material.side = THREE.DoubleSide;
          }
        }
      });

      // Auto-frame scene at an elevated 3/4 perspective hero angle
      const box = new THREE.Box3();
      scene.traverse((child) => {
        if (child.isMesh && child !== grid) {
          box.expandByObject(child);
        }
      });

      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0.05) {
          grid.position.y = box.min.y - 0.02;

          const dist = Math.max(maxDim * 1.8, 5.0);
          camera.position.set(center.x + dist * 0.6, center.y + dist * 0.45, center.z + dist * 0.8);
          camera.lookAt(center);

          if (controlsRef.current) {
            controlsRef.current.target.copy(center);
            controlsRef.current.update();
          }
        }
      }

      initialCamPosRef.current.copy(camera.position);

      // Trigger smooth canvas appear transition
      if (canvasRef.current) {
        canvasRef.current.classList.remove("canvas-appear");
        void canvasRef.current.offsetWidth;
        canvasRef.current.classList.add("canvas-appear");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("[ThreeCanvas Execution Error]:", err);
      if (onError) onError(err);
    }
  }, [code, cleanupScene, addStudioLighting, onSuccess, onError]);

  // Drag and drop GLB support onto canvas
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
        ref.current?.importGLB(file);
      }
    }
  };

  return (
    <div 
      className={`three-canvas-wrapper ${className}`} 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} className="three-viewport canvas-appear" />
    </div>
  );
});

export default ThreeCanvas;
