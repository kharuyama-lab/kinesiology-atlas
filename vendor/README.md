# Bundled runtime

Three.js 0.160.0: copied without modifications from the pinned npm package. Includes the module build, OrbitControls, GLTFLoader, DRACOLoader and BufferGeometryUtils. MIT license: `three/LICENSE`.

Draco decoders: copied without modifications from the same Three.js package. Apache-2.0 license: `three/draco/LICENSE`; upstream documentation: `three/draco/README.md`.

These files are served from the atlas itself. No jsDelivr connection is needed to load the runtime or decode GLBs. GLBs remain external reference assets (or local `.cache/` preview files); they are not redistributed in this repository.
