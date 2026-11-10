import { drawFrame, type Look, makeCanvas, paint, recordTimeline, type Segment } from './recorder';

export { type Look, type Segment, themeBackdrop } from './recorder';

const FPS = 30;

export const VIDEO_SIZE = 512;
export const EMOTION_VIDEO_MS = 4000;

export class VideoUnsupportedError extends Error {
  constructor() {
    super('This browser cannot record video');
  }
}

export interface VideoOptions extends Look {
  /** Emotions in order with how long each plays. */
  timeline: Segment[];
  backdrop: 'white' | 'dark';
  onProgress?: (done: number) => void;
}

/** Records a timeline of emotions as an H.264 MP4 at 30 fps. */
export async function renderVideo(o: VideoOptions): Promise<Blob> {
  if (!o.timeline.length) throw new Error('Nothing to record');
  const size = VIDEO_SIZE;
  const { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } =
    await import('mediabunny');
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: size, height: size });
  if (!codec) throw new VideoUnsupportedError();

  const [canvas, ctx] = makeCanvas(size, size, false);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH, keyFrameInterval: 1 });
  output.addVideoTrack(source, { frameRate: FPS });

  try {
    await output.start();
    await recordTimeline(o, o.timeline, 1000 / FPS, async (svg, i, frames) => {
      paint(ctx, o.backdrop, size, size);
      await drawFrame(ctx, svg, 0, 0, size);
      await source.add(i / FPS, 1 / FPS);
      o.onProgress?.((i + 1) / frames);
    });
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer) throw new Error('The video was empty');
    return new Blob([buffer], { type: 'video/mp4' });
  } catch (e) {
    await output.cancel().catch(() => undefined);
    throw e;
  }
}
