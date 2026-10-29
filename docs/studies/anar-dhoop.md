# Anar and Dhoop animation upgrade

The two cards now use the same Three.js renderer, orthographic camera, glow pipeline and lifecycle clock as Diya. The approved icons remain unchanged. Diya, Chakri and Kamal retain their current animations.

Anar: 112 preallocated GPU spark heads and instanced tapered trails. The emitters start along the upper capsule crown, launch in a fan, rise and fall under gravity, and fade before passing through the label area. Births are staggered over the full lifetime for a continuous fountain. The rim lingers briefly while the fountain decays. The surface, rim and reflections use the card's emerald/gold palette.

Dhoop: a ray-marched translucent smoke volume, shaped as an asymmetric primary curl and a fainter secondary wisp. Vertically stretched advected noise and folded cross-sections create internal variation rather than solid mirrored tubes. The streams begin at the shoulders, rise around the curved cap and dissolve at the top. During exit they separate and lift as opacity decays. The surface and reflections use lavender, pearl and violet.

Both effects consume interpolated card coordinates, delayed ignition, growth, and outgoing decay. Reduced motion freezes time and disables autoplay. No reference footage is used in these effects. The reference informs quality, flow and transition behavior; the Diwali-specific motifs remain a spark fountain and incense smoke.

Validation: ballistics and shared-motion tests, browser shader diagnostics, active/exit transitions and preview capture.
