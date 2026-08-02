import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import zlib from "node:zlib";

// Minimal ZIP (DEFLATE) writer — packages dist/ contents (manifest.json at root)
// into pickit-upload.zip for Chrome Web Store upload. No external deps.

const SRC = "C:/Users/smhong/claude_dev/pickit/dist";
const OUT = "C:/Users/smhong/claude_dev/pickit/pickit-upload.zip";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}

function walk(dir, base, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(full);
  }
  return out;
}

const files = walk(SRC, SRC).sort();
const locals = [];
const centrals = [];
let offset = 0;

for (const full of files) {
  const name = relative(SRC, full).split("\\").join("/");
  const data = readFileSync(full);
  const crc = crc32(data);
  const comp = zlib.deflateRawSync(data);
  const nameBuf = Buffer.from(name, "utf8");

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(8, 8); // deflate
  lh.writeUInt16LE(0, 10); // mod time
  lh.writeUInt16LE(33, 12); // mod date = 1980-01-01 (valid DOS date)
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18);
  lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28);
  locals.push(lh, nameBuf, comp);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0, 8);
  ch.writeUInt16LE(8, 10);
  ch.writeUInt16LE(0, 12); // mod time
  ch.writeUInt16LE(33, 14); // mod date = 1980-01-01
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(comp.length, 20);
  ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(nameBuf.length, 28);
  ch.writeUInt32LE(0, 42); // local header offset
  ch.writeUInt32LE(offset, 42);
  centrals.push(ch, nameBuf);

  offset += lh.length + nameBuf.length + comp.length;
}

const localPart = Buffer.concat(locals);
const centralPart = Buffer.concat(centrals);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralPart.length, 12);
eocd.writeUInt32LE(localPart.length, 16);

writeFileSync(OUT, Buffer.concat([localPart, centralPart, eocd]));
console.log(`wrote ${OUT} (${files.length} files, ${(Buffer.concat([localPart, centralPart, eocd]).length / 1024).toFixed(0)} KB)`);
