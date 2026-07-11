// Vercel serverless function entry point.
// The Express app is pre-built by esbuild (artifacts/api-server/build.mjs)
// and exported as default from app.mjs.  Vercel calls this module as a
// standard Node.js HTTP handler — no app.listen() needed.
export { default } from '../artifacts/api-server/dist/app.mjs';
