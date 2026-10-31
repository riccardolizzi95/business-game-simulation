/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next build` e `next dev` condividono `.next`: lanciare una build mentre il dev server gira
  // gli cancella i chunk sotto i piedi, e la pagina resta senza JavaScript (404 su main-app.js,
  // nessun bottone risponde). Succedeva ogni volta che il gate girava a server acceso.
  // Con questa variabile la build del gate scrive altrove e le due cose non si pestano i piedi.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
