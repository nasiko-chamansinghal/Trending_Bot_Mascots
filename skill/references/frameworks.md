# Framework recipes

Every recipe does the same four things: load the library once, create the mascot after the element exists in the browser, update emotions when state changes, and `destroy()` on unmount. Replace `LIBRARY` with the self-hosted path (`/mascot/mood-mates.js`) for production. The examples use `{{EXAMPLE_CHARACTER}}`; any id from [characters.md](characters.md) works.

## Shared loader

Put this next to the component (or in a `lib/` file) so the script is only added once, however many mascots the page has:

```js
const LIBRARY = '{{SITE_URL}}/mood-mates.js';
let loading;

export function loadMoodMates() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.MoodMates) return Promise.resolve(window.MoodMates);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LIBRARY;
    script.async = true;
    script.onload = () => resolve(window.MoodMates);
    script.onerror = () => {
      loading = undefined;
      reject(new Error(`Could not load ${LIBRARY}`));
    };
    document.head.appendChild(script);
  });
  return loading;
}
```

## React (Vite, CRA) and Next.js

In the Next.js App Router, put `'use client';` at the top of the file. Nothing runs on the server because all work happens in effects.

```jsx
'use client';
import { useEffect, useRef } from 'react';
import { loadMoodMates } from './loadMoodMates';

export function Mascot({ character = '{{EXAMPLE_CHARACTER}}', emotion = '02', color, size = 200 }) {
  const host = useRef(null);
  const bot = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadMoodMates().then((MoodMates) => {
      if (cancelled || !host.current) return;
      bot.current = MoodMates.create(host.current, { character, emotion, color, idle: true });
    });
    return () => {
      cancelled = true;
      bot.current?.destroy();
      bot.current = null;
    };
    // Recreate only when the character or colour changes; emotion changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, color]);

  useEffect(() => {
    bot.current?.setEmotion(emotion);
  }, [emotion]);

  return <div ref={host} style={{ width: size, height: size }} aria-hidden="true" />;
}
```

Usage: `<Mascot emotion={isLoading ? '{{LOADING_ID}}' : error ? '{{ERROR_ID}}' : '{{IDLE_ID}}'} />`.

For TypeScript, add `declare global { interface Window { MoodMates?: any } }` or the fuller types in [api.md](api.md).

## Vue 3 and Nuxt

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { loadMoodMates } from './loadMoodMates';

const props = defineProps({ character: { default: '{{EXAMPLE_CHARACTER}}' }, emotion: { default: '02' }, size: { default: 200 } });
const host = ref(null);
let bot = null;

onMounted(async () => {
  const MoodMates = await loadMoodMates();
  if (host.value) bot = MoodMates.create(host.value, { character: props.character, emotion: props.emotion, idle: true });
});
watch(() => props.emotion, (id) => bot?.setEmotion(id));
onBeforeUnmount(() => bot?.destroy());
</script>

<template>
  <div ref="host" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true" />
</template>
```

In Nuxt, `onMounted` only runs in the browser, so this works as is; wrap it in `<ClientOnly>` if a parent renders it during SSR and you see hydration warnings.

## Svelte and SvelteKit

```svelte
<script>
  import { onMount } from 'svelte';
  import { loadMoodMates } from './loadMoodMates';

  export let character = '{{EXAMPLE_CHARACTER}}';
  export let emotion = '02';
  export let size = 200;
  let host;
  let bot;

  onMount(() => {
    let cancelled = false;
    loadMoodMates().then((MoodMates) => {
      if (!cancelled) bot = MoodMates.create(host, { character, emotion, idle: true });
    });
    return () => {
      cancelled = true;
      bot?.destroy();
    };
  });

  $: bot && bot.setEmotion(emotion);
</script>

<div bind:this={host} style="width:{size}px;height:{size}px" aria-hidden="true"></div>
```

## Angular

```ts
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { loadMoodMates } from './load-mood-mates';

@Component({
  selector: 'app-mascot',
  standalone: true,
  template: `<div #host [style.width.px]="size" [style.height.px]="size" aria-hidden="true"></div>`,
})
export class MascotComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() character = '{{EXAMPLE_CHARACTER}}';
  @Input() emotion = '02';
  @Input() size = 200;
  @ViewChild('host') host!: ElementRef<HTMLDivElement>;
  private bot: any = null;

  async ngAfterViewInit() {
    if (typeof window === 'undefined') return; // SSR
    const MoodMates = await loadMoodMates();
    this.bot = MoodMates.create(this.host.nativeElement, { character: this.character, emotion: this.emotion, idle: true });
  }

  ngOnChanges() {
    this.bot?.setEmotion(this.emotion);
  }

  ngOnDestroy() {
    this.bot?.destroy();
  }
}
```

## Plain HTML, WordPress, Webflow, Shopify

Paste the quick-start snippet from SKILL.md where the mascot should appear (a custom HTML block or theme template). Give each mascot its own element id if there are several on one page.

## A corner companion that follows the cursor

```js
const el = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
Object.assign(el.style, { position: 'fixed', right: '24px', bottom: '24px', width: '120px', height: '120px', zIndex: 50 });
document.body.appendChild(el);
const bot = MoodMates.create(el, { character: '{{EXAMPLE_CHARACTER}}', idle: true });
// Then add the gaze listener from SKILL.md ("Cursor, clicks and cleanup").
```

On phones (`matchMedia('(pointer: coarse)')`), make it smaller or dock it to an edge; there is no cursor to follow there.
