'use client';

import { useEffect, useRef, useState } from 'react';

const tones = {
  red: { background: 'rgba(217, 72, 95, .35)', border: '#D9485F' },
  amber: { background: 'rgba(217, 144, 24, .35)', border: '#D99018' },
  blue: { background: 'rgba(66, 99, 235, .3)', border: '#4263EB' },
};

function targetText(annotation, resume) {
  const bySection = {
    personal: [resume.fullName, resume.email, 'Contact'],
    summary: ['Summary', String(resume.summary || '').slice(0, 55)],
    experience: ['Experience', resume.experience?.[0]?.title, resume.experience?.[0]?.description],
    skills: ['Skills', resume.skills?.[0]],
    achievements: ['Achievements', resume.achievements?.[0]],
    certifications: ['Certifications', resume.certifications?.[0]?.name],
  };
  return [annotation.quote, ...(bySection[annotation.section] || [])].filter(Boolean);
}

function textNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('mark, style, script')) continue;
    if (node.textContent?.trim()) nodes.push(node);
  }
  return nodes;
}

function findSegments(root, phrase) {
  const pdfLayers = [...root.querySelectorAll('.compare-pdf-text-layer')];
  const docxBlocks = [...root.querySelectorAll('.docx p, .docx h1, .docx h2, .docx h3, .docx li')];
  const groups = pdfLayers.length ? pdfLayers : docxBlocks.length ? docxBlocks : [root];
  const needle = phrase.replace(/\s/g, '').toLowerCase();
  if (!needle) return null;
  for (const group of groups) {
    const nodes = textNodes(group);
    const locations = [];
    let compact = '';
    for (const node of nodes) {
      for (let offset = 0; offset < node.textContent.length; offset += 1) {
        const character = node.textContent[offset];
        if (/\s/.test(character)) continue;
        compact += character.toLowerCase();
        locations.push({ node, offset });
      }
    }
    const start = compact.indexOf(needle);
    if (start < 0) continue;
    const first = locations[start];
    const last = locations[start + needle.length - 1];
    const firstIndex = nodes.indexOf(first.node);
    const lastIndex = nodes.indexOf(last.node);
    return nodes.slice(firstIndex, lastIndex + 1).map((node, index) => ({
      node,
      start: index === 0 ? first.offset : 0,
      end: firstIndex + index === lastIndex ? last.offset + 1 : node.textContent.length,
    })).filter((segment) => segment.end > segment.start);
  }
  return null;
}

function annotate(root, annotations, resume, showTooltip, hideTooltip) {
  const grouped = new Map();
  const ordered = [...annotations].sort((a, b) => Number(Boolean(b.quote)) - Number(Boolean(a.quote)));
  for (const annotation of ordered) {
    if (!annotation.quote) {
      const existing = [...grouped.keys()].find((mark) => mark.dataset.section === annotation.section);
      if (existing) {
        grouped.get(existing).push(annotation);
        continue;
      }
    }
    const phrases = targetText(annotation, resume);
    for (const phrase of phrases) {
      if (!phrase) continue;
      const segments = findSegments(root, phrase);
      if (!segments?.length) continue;
      const marks = [];
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        const range = document.createRange();
        range.setStart(segment.node, segment.start);
        range.setEnd(segment.node, segment.end);
        const mark = document.createElement('mark');
        const tone = tones[annotation.color] || tones.blue;
        mark.tabIndex = 0;
        mark.style.cssText = `background:${tone.background};border-bottom:2px solid ${tone.border};border-radius:2px;cursor:help;color:inherit`;
        range.surroundContents(mark);
        marks[index] = mark;
      }
      const comments = [annotation];
      marks[0].dataset.testid = `document-highlight-${annotation.id}`;
      marks[0].dataset.section = annotation.section;
      grouped.set(marks[0], comments);
      for (const mark of marks) {
        const reveal = () => showTooltip(comments, mark.getBoundingClientRect());
        mark.addEventListener('mouseenter', reveal);
        mark.addEventListener('focus', reveal);
        mark.addEventListener('mouseleave', hideTooltip);
        mark.addEventListener('blur', hideTooltip);
      }
      break;
    }
  }
}

async function renderPdf(blob, container, signal) {
  const pdfjs = await import('pdfjs-dist');
  if (signal.aborted) return () => {};
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const data = new Uint8Array(await blob.arrayBuffer());
  if (signal.aborted) return () => {};
  const documentTask = pdfjs.getDocument({ data });
  const abort = () => { documentTask.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  const pdf = await documentTask.promise;
  for (let number = 1; number <= pdf.numPages; number += 1) {
    if (signal.aborted) break;
    const page = await pdf.getPage(number);
    const natural = page.getViewport({ scale: 1 });
    const scale = Math.min(1.45, 760 / natural.width);
    const viewport = page.getViewport({ scale });
    const sheet = document.createElement('div');
    sheet.className = 'compare-pdf-page';
    sheet.style.width = `${viewport.width}px`;
    sheet.style.height = `${viewport.height}px`;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(viewport.width * dpr);
    canvas.height = Math.ceil(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, canvas, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] }).promise;
    if (signal.aborted) break;
    sheet.appendChild(canvas);
    const layer = document.createElement('div');
    layer.className = 'compare-pdf-text-layer';
    layer.style.setProperty('--total-scale-factor', String(scale));
    sheet.appendChild(layer);
    container.appendChild(sheet);
    const textLayer = new pdfjs.TextLayer({ textContentSource: await page.getTextContent(), container: layer, viewport });
    await textLayer.render();
  }
  return () => {
    signal.removeEventListener('abort', abort);
    documentTask.destroy();
  };
}

export default function CompareDocumentPreview({ blob, filename, annotations, resume }) {
  const containerRef = useRef(null);
  const originalResume = useRef(resume);
  const [tooltip, setTooltip] = useState(null);
  const [error, setError] = useState('');
  const [renderVersion, setRenderVersion] = useState(0);
  const showTooltip = (annotationsForMark, rect) => setTooltip({
    annotations: annotationsForMark,
    top: Math.min(window.innerHeight - 180, rect.bottom + 8),
    left: Math.min(window.innerWidth - 330, Math.max(8, rect.left)),
  });
  const hideTooltip = () => setTooltip(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    const container = containerRef.current;
    const controller = new AbortController();
    let dispose = () => {};
    container.replaceChildren();
    setError('');
    const render = async () => {
      const staging = document.createElement('div');
      staging.style.cssText = container.style.cssText;
      if (filename.toLowerCase().endsWith('.docx')) {
        const { renderAsync } = await import('docx-preview');
        if (controller.signal.aborted) return;
        await renderAsync(blob, staging, undefined, { breakPages: true });
      } else {
        dispose = await renderPdf(blob, staging, controller.signal);
      }
      if (controller.signal.aborted) return;
      container.replaceChildren(...staging.childNodes);
      setRenderVersion((version) => version + 1);
    };
    render().catch(() => !controller.signal.aborted && setError('Could not render the uploaded document.'));
    return () => {
      controller.abort();
      dispose();
      container.replaceChildren();
    };
  }, [blob, filename]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !renderVersion) return;
    container.querySelectorAll('mark[data-testid^="document-highlight-"]').forEach((mark) => {
      mark.replaceWith(...mark.childNodes);
    });
    setTooltip(null);
    annotate(container, annotations, originalResume.current, showTooltip, hideTooltip);
  }, [annotations, renderVersion]);

  return (
    <section data-testid="compare-document-preview" style={{ border: '1px solid var(--jb-v3-line)', background: 'var(--jb-v3-panel)', padding: 16 }}>
      <h3 style={{ margin: '0 0 5px', fontSize: 16 }}>Uploaded résumé</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>Colored areas show where to review the original file. Hover or focus a highlight for a suggested fix.</p>
      {error && <div role="alert">{error}</div>}
      <div className="compare-document-scroll" style={{ overflow: 'auto', maxHeight: 760, background: '#e7e9ee', padding: 12 }}>
        <div ref={containerRef} style={{ display: 'grid', justifyItems: 'center', gap: 16 }} />
      </div>
      {tooltip && (
        <div role="tooltip" style={{ position: 'fixed', zIndex: 1000, top: tooltip.top, left: tooltip.left, width: 310, padding: 12, background: 'var(--jb-v3-panel)', color: 'var(--jb-v3-fg)', border: `1px solid ${tones[tooltip.annotations[0]?.color]?.border || tones.blue.border}`, boxShadow: '0 12px 34px #0003', fontSize: 12, lineHeight: 1.5 }}>
          {tooltip.annotations.map((annotation) => <div key={annotation.id} style={{ marginBottom: 8 }}><strong>{annotation.message}</strong><br />{annotation.fix}</div>)}
        </div>
      )}
      <style jsx global>{`
        .compare-pdf-page { position: relative; flex: none; background: white; box-shadow: 0 3px 12px #0002; }
        .compare-pdf-text-layer { position: absolute; inset: 0; overflow: clip; line-height: 1; text-align: initial; transform-origin: 0 0; --min-font-size: 1; --min-font-size-inv: 1; --text-scale-factor: var(--total-scale-factor); }
        .compare-pdf-text-layer span, .compare-pdf-text-layer br { position: absolute; color: transparent; white-space: pre; transform-origin: 0 0; cursor: text; }
        .compare-pdf-text-layer > span { font-size: calc(var(--text-scale-factor) * var(--font-height)); transform: rotate(var(--rotate)) scaleX(var(--scale-x)); }
        .compare-pdf-text-layer mark { color: transparent !important; }
        .compare-document-scroll .docx-wrapper { width: max-content; min-width: 100%; padding: 0; background: transparent; }
        .compare-document-scroll .docx { box-shadow: 0 3px 12px #0002; }
      `}</style>
    </section>
  );
}
