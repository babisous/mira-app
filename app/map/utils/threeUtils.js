/**
 * Utilitaires Three.js pour les modèles 3D
 */

/**
 * Crée le matériau wireframe rouge pour les artworks
 */
export function createArtworkMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xff0004,
    metalness: 0.0,
    roughness: 0.5,
    wireframe: true,
  });
}

/**
 * Configure l'éclairage de la scène
 */
export function setupSceneLighting(THREE, scene) {
  // Lumière ambiante
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Lumière directionnelle 1
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(0, -70, 100).normalize();
  directionalLight1.castShadow = false;
  scene.add(directionalLight1);

  // Lumière directionnelle 2
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(0, 70, 100).normalize();
  directionalLight2.castShadow = false;
  scene.add(directionalLight2);
}

/**
 * Applique le matériau à tous les meshes d'un modèle
 */
export function applyMaterialToModel(model, material) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
}

/**
 * Calcule la matrice de transformation pour un modèle
 */
export function computeModelMatrix(THREE, modelTransform, scale, matrix) {
  const rotationX = new THREE.Matrix4().makeRotationAxis(
    new THREE.Vector3(1, 0, 0),
    modelTransform.rotateX
  );
  const rotationY = new THREE.Matrix4().makeRotationAxis(
    new THREE.Vector3(0, 1, 0),
    modelTransform.rotateY
  );
  const rotationZ = new THREE.Matrix4().makeRotationAxis(
    new THREE.Vector3(0, 0, 1),
    modelTransform.rotateZ
  );

  const m = new THREE.Matrix4().fromArray(matrix);
  const l = new THREE.Matrix4()
    .makeTranslation(
      modelTransform.translateX,
      modelTransform.translateY,
      modelTransform.translateZ
    )
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(rotationX)
    .multiply(rotationY)
    .multiply(rotationZ);

  return m.multiply(l);
}
