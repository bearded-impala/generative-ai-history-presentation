# The Inception of Generative AI

A cinematic 3D presentation tracing generative AI from Turing's imitation game to modern scaling laws. It pairs a clean audience view with a synchronized presenter view containing the script, timing, slide navigation, and live previews.

## Stack

| Library | Why and how it is used |
| --- | --- |
| React | Structures the audience and presenter views and keeps their interfaces reactive. |
| Three.js + React Three Fiber | Renders each slide's procedural 3D scene through React components. |
| Drei + React Three Postprocessing | Provides camera controls, 3D text, helpers, and visual effects. |
| Tailwind CSS | Styles the audience overlays and presenter interface with utility classes. |
| Lucide React | Supplies the presenter interface icons. |

## Run

```bash
npm install
npm run dev
```

Open the presenter view and follow the instructions shown there while presenting.
