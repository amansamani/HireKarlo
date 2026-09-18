import { parentPort, workerData } from 'node:worker_threads';
try {
  const buffer = Buffer.from(workerData.bytes);
  let text;
  if (workerData.extension === 'pdf') {
    await import('pdf-parse/worker');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else {
    const { default: mammoth } = await import('mammoth');
    text = (await mammoth.extractRawText({ buffer })).value;
  }
  parentPort.postMessage({ text: text.slice(0, 100_000) });
} catch { parentPort.postMessage({ error: 'PARSING_FAILED' }); }
