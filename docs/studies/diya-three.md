# Diya Three.js renderer

Diya in the main carousel now uses Three.js r180, vendored from the official npm package with its MIT license. Other card effects and the labeled reference-texture study remain unchanged.

The renderer uses an orthographic scene, a ray-marched fire volume in a BoxGeometry, a capsule-distance emitter, a seeded Data3DTexture sampled as advected noise, GPU Points for sparks, a custom aurora surface ShaderMaterial, a capsule rim, and an EffectComposer with UnrealBloomPass and OutputPass. No video is used in this renderer.

The camera is at z=2000 with a far plane of 4000, outside the volume even when scaled to a 230-pixel card. This is important: a camera at z=10 sits inside the scaled fire box and makes front faces disappear. Fire density falls away below and outside the curved shoulders, rather than starting at a horizontal baseline. Particle birth angle and lifetime use independent attributes to avoid visible rows.

The Three.js scene consumes the same interpolated position, activation, and decay values as the DOM icon and label. The other four cards retain their renderer. Reduced motion freezes shader time; hidden documents stop the frame loop. Dependencies are served from the same site, without a CDN at runtime.

Validation: browser shader diagnostics, active/inactive state, carousel transitions, emitter geometry and camera regression tests. Visual resemblance to the reference still requires user judgment; switching engines alone does not establish fidelity.
