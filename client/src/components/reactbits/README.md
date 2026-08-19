# React Bits components

Vendored from [react-bits](https://github.com/DavidHDev/react-bits) (`src/ts-default`),
the TypeScript + plain-CSS variant — this project has no Tailwind.

The `.tsx` and `.css` files here are **upstream source**, kept as close to
unmodified as possible so they stay easy to diff against a newer version.

The single deviation: `AnimatedList.tsx` exports its `AnimatedItem` wrapper
(upstream keeps it private). Upstream `AnimatedList` only accepts `string[]`,
and the notifications feed needs real rows — a title, a body, a timestamp and a
read state. Exporting the wrapper reuses the animation without forking the
component, and it is one word to reapply after an upgrade. Everything that adapts
them to UniFind's soft-skeuomorphic look lives in `client/src/index.css` under
section 22, so no local change is ever lost to an upgrade.

Peer dependencies: `motion` (AnimatedList, CountUp, ShinyText, Stack, TiltedCard)
and `gsap` (FadeContent, ScrollReveal, Masonry). SpotlightCard, Magnet, Dock and
DriftWall need neither.
