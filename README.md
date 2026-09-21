# Un universo amarillo para ti

Experiencia romántica 3D fullscreen construida con React, TypeScript, Vite, Three.js, React Three Fiber, Drei, GSAP y postprocesado selectivo.

## Ejecutar

```bash
npm install
npm run dev
```

Validación de producción:

```bash
npm run lint
npm run build
```

## Personalización

Los textos, el nombre y la fecha se editan en `src/config/experience.ts`.

El audio ambiental es opcional. Para activarlo, añade `public/audio/music.mp3`. Los recursos futuros pueden colocarse en:

- `public/models/`
- `public/textures/`
- `public/audio/`

La versión actual no depende de recursos remotos: flores, halos, estrellas, polvo y pétalos se generan de forma procedural.
