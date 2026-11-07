const FRAME_BUDGET_MS = 8;

const jobs: Array<() => void> = [];
let scheduled = false;

function pump(): void {
  scheduled = false;
  const start = performance.now();
  while (jobs.length && performance.now() - start < FRAME_BUDGET_MS) {
    const job = jobs.shift();
    job?.();
  }
  if (jobs.length) schedule();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(pump);
}

export function enqueue(job: () => void): () => void {
  jobs.push(job);
  schedule();
  return () => {
    const index = jobs.indexOf(job);
    if (index >= 0) jobs.splice(index, 1);
  };
}
