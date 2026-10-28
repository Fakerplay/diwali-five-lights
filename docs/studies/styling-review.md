# Reference styling review
Compared the supplied video at 15.4 seconds against the Three.js version, using a crop around the active card.

Observed mismatches: the flame formed a tall orange cone; the card's surface was a pale smooth fill; the border read as a thin neutral stroke; Arial fallback and viewport-sized labels changed the type proportions; reflections looked like isolated gradient blobs.

Revision: shortened and broadened the flame crown with independently changing lobes; redder fire color ramp and filament density; a shader rim following the capsule; a moving color field reconstructed from 30 reference palette samples; locally served Inter at true weight 500 with sizes relative to card width; a mirrored, fading Three.js surface and a subdued floor light. Removed the added descriptive caption.

Approved smaller icons and the five-card content remain. This is a styling refinement, not a claim of pixel-identical motion. Reference-derived video is still confined to the explicitly labeled earlier study; the carousel's Diya remains a procedural Three.js/WebGL renderer.
