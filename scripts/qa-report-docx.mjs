#!/usr/bin/env node
/**
 * scripts/qa-report-docx.mjs
 *
 * Generates MASTER_TEST_LOG.docx from MASTER_TEST_LOG.md.
 *
 * Strategy:
 *   1. If `pandoc` is available → use it (preserves headings, tables, emojis)
 *   2. Otherwise → fall back to a minimal pure-JS DOCX writer (basic but valid)
 *
 * Called automatically from qa-report.mjs after writing the .md.
 *
 * Usage:
 *   node scripts/qa-report-docx.mjs                  # writes MASTER_TEST_LOG.docx
 *   node scripts/qa-report-docx.mjs --output=foo.docx
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const arg = (n) => {
  const i = args.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i < 0) return null;
  if (args[i].includes('=')) return args[i].split('=')[1];
  return args[i + 1] ?? null;
};

const MD = arg('input') || join(PROJECT_ROOT, 'MASTER_TEST_LOG.md');
const OUT = arg('output') || join(PROJECT_ROOT, 'MASTER_TEST_LOG.docx');

if (!existsSync(MD)) {
  console.error(`Source not found: ${MD}`);
  process.exit(2);
}

function hasPandoc() {
  const r = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

async function generateWithPandoc() {
  // First, prepend a styled cover paragraph so the docx looks polished, not raw md.
  const md = await readFile(MD, 'utf8');
  const today = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const cover = `---
title: "Trevu — Master QA Report"
subtitle: "Ultimate Adventure Tool"
author: "Trevu QA Pipeline"
date: "${today}"
lang: hu
---

`;
  // Write the augmented markdown to the OS tmp dir so we don't leave
  // sibling .tmp.md files in the project root.
  const tmpMd = join(tmpdir(), `trevu-qa-${Date.now()}.md`);
  await writeFile(tmpMd, cover + md);
  // Try modern pandoc (3.x with gfm) first, fall back to plain markdown reader.
  const tryConvert = (fromFmt) => spawnSync(
    'pandoc',
    [
      tmpMd,
      '-o', OUT,
      '--from', fromFmt,
      '--to', 'docx',
      '--standalone',
      '--toc',
      '--toc-depth=2',
    ],
    { encoding: 'utf8' },
  );
  let r = tryConvert('gfm+yaml_metadata_block');
  if (r.status !== 0) r = tryConvert('markdown');
  if (r.status !== 0) r = tryConvert('commonmark+yaml_metadata_block');
  await unlink(tmpMd).catch(() => {});
  if (r.status !== 0) {
    throw new Error(`pandoc failed: ${r.stderr || r.stdout}`);
  }
}

/**
 * Minimal fallback: writes a barely-valid .docx using ZIP of static XML files.
 * No tables, no styling — just paragraphs from the markdown line-by-line.
 * Used only if pandoc is unavailable.
 */
async function generateFallback() {
  // Minimal DOCX structure: [Content_Types].xml, _rels/.rels, word/document.xml, word/_rels/document.xml.rels
  const md = await readFile(MD, 'utf8');
  const lines = md.split('\n');

  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const paras = lines.map((line) => {
    if (!line.trim()) return '<w:p/>';
    if (line.startsWith('# '))
      return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">${escape(line.slice(2))}</w:t></w:r></w:p>`;
    if (line.startsWith('## '))
      return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t xml:space="preserve">${escape(line.slice(3))}</w:t></w:r></w:p>`;
    if (line.startsWith('### '))
      return `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t xml:space="preserve">${escape(line.slice(4))}</w:t></w:r></w:p>`;
    return `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`;
  }).join('');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paras}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  // Build minimal ZIP using Node's built-in zlib
  const { default: zlib } = await import('node:zlib');
  const files = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels',          data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml',    data: Buffer.from(docXml, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(docRels, 'utf8') },
  ];

  // Build a ZIP file structure manually (store-only, no compression for simplicity).
  // CRC-32 — required by ZIP spec.
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const localHeaders = [];
  const centralDir = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const size = f.data.length;
    // Local file header
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);    // version
    lh.writeUInt16LE(0, 6);     // flags
    lh.writeUInt16LE(0, 8);     // method (0 = store)
    lh.writeUInt16LE(0, 10);    // mod time
    lh.writeUInt16LE(0, 12);    // mod date
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    localHeaders.push(Buffer.concat([lh, nameBuf, f.data]));

    // Central dir entry
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    centralDir.push(Buffer.concat([cd, nameBuf]));

    offset += lh.length + nameBuf.length + size;
  }

  const cdBuf = Buffer.concat(centralDir);
  const lhBuf = Buffer.concat(localHeaders);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(lhBuf.length, 16);
  eocd.writeUInt16LE(0, 20);

  await writeFile(OUT, Buffer.concat([lhBuf, cdBuf, eocd]));
}

console.log(`\n📄 docx export: ${MD} → ${OUT}\n`);

if (hasPandoc()) {
  try {
    await generateWithPandoc();
    console.log('  ✅ pandoc generálta a fájlt.\n');
    process.exit(0);
  } catch (e) {
    console.warn(`  ⚠️  pandoc hiba (${e.message}), fallback futtatása…`);
  }
}

await generateFallback();
console.log('  ✅ minimal fallback DOCX kész (csak alap formázás).');
console.log('     Profibb output-hoz: brew install pandoc\n');
