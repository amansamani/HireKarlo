process.once('message', async workerData => {
try {
  const buffer = Buffer.from(workerData.bytes);
  let text;
  if (workerData.extension === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else {
    const { default: mammoth } = await import('mammoth');
    text = (await mammoth.extractRawText({ buffer })).value;
  }
  process.send?.({ text: text.slice(0, 100_000) }, () => process.disconnect());
} catch { process.send?.({ error: 'PARSING_FAILED' }, () => process.disconnect()); }
});
