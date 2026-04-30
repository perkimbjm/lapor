/**
 * Generate PWA icons dari favicon.svg
 * Jalankan: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public', 'favicon.svg');
const iconsDir = resolve(root, 'public', 'icons');

mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(svgPath);

const icons = [
  { name: 'icon-72x72.png',   size: 72  },
  { name: 'icon-96x96.png',   size: 96  },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'maskable-icon-512x512.png', size: 512, padding: 0.1 },
];

for (const icon of icons) {
  const size = icon.size;
  let pipeline = sharp(svgBuffer, { density: 300 }).resize(size, size);

  if (icon.padding) {
    // Untuk maskable: tambah padding 10% agar icon aman di semua mask shape
    const innerSize = Math.round(size * (1 - icon.padding * 2));
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 29, g: 78, b: 216, alpha: 1 }, // biru #1d4ed8
      }
    }).composite([{
      input: await sharp(svgBuffer, { density: 300 })
        .resize(innerSize, innerSize)
        .toBuffer(),
      gravity: 'center',
    }]);
  }

  const outPath = resolve(iconsDir, icon.name);
  await pipeline.png().toFile(outPath);
  console.log(`✓ ${icon.name} (${size}x${size})`);
}

// favicon.ico (32x32)
await sharp(svgBuffer, { density: 300 })
  .resize(32, 32)
  .png()
  .toFile(resolve(root, 'public', 'favicon-32x32.png'));
console.log('✓ favicon-32x32.png');

// Screenshot untuk manifest (opsional - 1280x720 placeholder)
await sharp({
  create: {
    width: 1280,
    height: 720,
    channels: 4,
    background: { r: 29, g: 78, b: 216, alpha: 1 },
  }
}).composite([{
  input: await sharp(svgBuffer, { density: 300 }).resize(200, 200).toBuffer(),
  gravity: 'center',
}]).png().toFile(resolve(root, 'public', 'screenshot-wide.png'));
console.log('✓ screenshot-wide.png');

await sharp({
  create: {
    width: 390,
    height: 844,
    channels: 4,
    background: { r: 29, g: 78, b: 216, alpha: 1 },
  }
}).composite([{
  input: await sharp(svgBuffer, { density: 300 }).resize(150, 150).toBuffer(),
  gravity: 'center',
}]).png().toFile(resolve(root, 'public', 'screenshot-narrow.png'));
console.log('✓ screenshot-narrow.png');

console.log('\n✅ Semua icon berhasil dibuat di public/icons/');
