/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this project (a stray lockfile in a parent
  // directory otherwise makes Next guess the wrong workspace root).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
