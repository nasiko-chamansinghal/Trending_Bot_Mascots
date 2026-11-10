const PNG_SIZE = 1024;
const PADDING = 0.12;

function paddedViewBox(svg: SVGSVGElement): string {
  const { x, y, width, height } = svg.viewBox.baseVal;
  const padX = width * PADDING;
  const padY = height * PADDING;
  return `${x - padX} ${y - padY} ${width + padX * 2} ${height + padY * 2}`;
}

export function standaloneSvg(svg: SVGSVGElement, size = PNG_SIZE): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', paddedViewBox(svg));
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  return new XMLSerializer().serializeToString(clone).replace(/<!--[\s\S]*?-->/g, '');
}

function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}

export async function renderPng(svg: SVGSVGElement): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(
    new Blob([standaloneSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = PNG_SIZE;
    canvas.height = PNG_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    context.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
    return await encode(canvas);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function renderSvg(svg: SVGSVGElement): Blob {
  return new Blob([standaloneSvg(svg)], { type: 'image/svg+xml;charset=utf-8' });
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
}

export async function copyPng(svg: SVGSVGElement): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng(svg) })]);
}

export async function copySvg(svg: SVGSVGElement): Promise<void> {
  await navigator.clipboard.writeText(standaloneSvg(svg));
}
