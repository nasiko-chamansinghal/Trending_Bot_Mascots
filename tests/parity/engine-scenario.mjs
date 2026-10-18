export const scenario = ({ exclude = [] } = {}) => {
  const out = {};
  const MM = window.MoodMates;
  const EB = window.EmotionBall;
  const adv = (ms) => window.__advance(ms);

  const fresh = () => {
    const el = document.createElement('div');
    el.style.cssText = 'width:240px;height:240px;position:absolute;left:0;top:0';
    document.body.appendChild(el);
    return el;
  };
  const dispose = (engine, el) => {
    engine.destroy();
    el.remove();
  };
  const nameOf = (d) => (d.en?.name ? d.en.name : d.name);
  const descOf = (d) => (d.en?.desc ? d.en.desc : d.desc || '');
  const groupOf = (g) => (g.en && typeof g.en === 'string' ? g.en : g.name);

  const mmChars = MM.characters.list().filter((c) => !exclude.includes(c.id));
  out['mm/meta/characters'] = JSON.stringify(
    mmChars.map((c) => ({
      id: c.id,
      name: nameOf(c),
      industry: c.industry,
      variants: MM.characters
        .variants(c.id)
        .map((v) => ({ id: v.id, name: v.en?.name ? v.en.name : v.name })),
    })),
  );
  out['mm/meta/groups'] = JSON.stringify(MM.config.groups().map((g) => ({ key: g.key, name: groupOf(g) })));
  out['mm/meta/emotions'] = JSON.stringify(
    MM.config.list().map((d) => ({ id: d.id, group: d.group, name: nameOf(d), desc: descOf(d) })),
  );
  out['mm/meta/version'] = String(MM.version);

  const mmIds = MM.config.list().map((d) => d.id);
  for (const ch of mmChars) {
    const variants = ['', ...MM.characters.variants(ch.id).map((v) => v.id)];
    for (const variant of variants) {
      for (const id of mmIds) {
        const el = fresh();
        const eng = MM.create(el, {
          character: ch.id,
          variant,
          emotion: id,
          idle: { standbyAfter: 60000, sleepAfter: 180000 },
          label: 'stage',
        });
        adv(3000);
        out[`mm/${ch.id}/${variant || 'base'}/${id}`] = el.innerHTML;
        dispose(eng, el);
      }
    }
    const el = fresh();
    const eng = MM.create(el, { character: ch.id, emotion: '02', label: 'stage' });
    const step = (key, fn, ms) => {
      fn();
      adv(ms);
      out[`mm/${ch.id}/action/${key}`] = el.innerHTML;
    };
    adv(500);
    step('celebrate', () => eng.celebrate(1), 1500);
    step('signature', () => eng.signature(1), 1200);
    step('spin', () => eng.spin(2), 1000);
    step('bounce', () => eng.bounce(), 400);
    step('burst', () => eng.burst(20), 300);
    step('gaze', () => eng.setGaze(0.7, -0.4), 800);
    step('sketch', () => eng.setStyle({ sketch: 1 }), 400);
    step('unsketch', () => eng.setStyle({ sketch: 0 }), 400);
    step(
      'ai',
      () => (out[`mm/${ch.id}/ai/ok`] = String(eng.handleAIMessage('{"emotionId":"30","tips":"x"}'))),
      1500,
    );
    out[`mm/${ch.id}/ai/bad`] = String(eng.handleAIMessage('{"emotionId":"99"}'));
    out[`mm/${ch.id}/ai/broken`] = String(eng.handleAIMessage('{not json'));
    out[`mm/${ch.id}/ai/missing`] = String(eng.handleAIMessage({ nope: 1 }));
    out[`mm/${ch.id}/ai/after`] = String(eng.emotionId);
    const events = [];
    eng.on('change', (e) => events.push(e.id));
    eng.startTour(['00', '10', '30'], 1000);
    adv(3500);
    out[`mm/${ch.id}/tour`] = `${eng.touring}|${events.join(',')}|${el.innerHTML}`;
    eng.stopTour();
    dispose(eng, el);

    const lite = fresh();
    const liteEng = MM.create(lite, {
      character: ch.id,
      emotion: '10',
      lite: true,
      eyeScale: 1.35,
      label: 'lite',
    });
    adv(1500);
    out[`mm/${ch.id}/lite`] = lite.innerHTML;
    dispose(liteEng, lite);

    const stat = fresh();
    const statEng = MM.create(stat, { character: ch.id, emotion: '14', autostart: false, label: 'static' });
    out[`mm/${ch.id}/static`] = stat.innerHTML;
    statEng.setActive(true);
    statEng.replay();
    adv(800);
    out[`mm/${ch.id}/static-hover`] = stat.innerHTML;
    dispose(statEng, stat);

    const idle = fresh();
    const idleEng = MM.create(idle, {
      character: ch.id,
      emotion: '10',
      idle: { standbyAfter: 1000, sleepAfter: 3000 },
      label: 'idle',
    });
    adv(1500);
    const afterStandby = idleEng.emotionId;
    adv(2500);
    out[`mm/${ch.id}/idle`] = `${afterStandby}|${idleEng.emotionId}`;
    dispose(idleEng, idle);
  }

  out['mm/config/roundtrip'] = (() => {
    const exported = JSON.parse(MM.config.exportConfig());
    return `${exported.length}|${exported.map((e) => e.id).join(',')}`;
  })();

  out['eb/meta/groups'] = JSON.stringify(EB.config.groups().map((g) => ({ key: g.key, name: groupOf(g) })));
  out['eb/meta/emotions'] = JSON.stringify(
    EB.config.list().map((d) => ({ id: d.id, group: d.group, name: nameOf(d), desc: descOf(d) })),
  );
  out['eb/meta/version'] = String(EB.version);

  const ebIds = EB.config.list().map((d) => d.id);
  for (const shape of ['blob', 'wedge', 'gem']) {
    for (const id of ebIds) {
      const el = fresh();
      const eng = EB.create(el, {
        emotion: id,
        shape,
        idle: { standbyAfter: 60000, sleepAfter: 180000 },
        label: 'stage',
      });
      adv(3000);
      out[`eb/${shape}/${id}`] = el.innerHTML;
      dispose(eng, el);
    }
  }
  const el = fresh();
  const eng = EB.create(el, { emotion: '02', shape: 'blob', label: 'stage' });
  adv(500);
  const step = (key, fn, ms) => {
    fn();
    adv(ms);
    out[`eb/action/${key}`] = el.innerHTML;
  };
  step('spin', () => eng.spin(2), 1500);
  step('bounce', () => eng.bounce(), 400);
  step('burst', () => eng.burst(20), 300);
  step('gaze', () => eng.setGaze(0.7, -0.4), 800);
  step('sketch', () => eng.setStyle({ sketch: 1 }), 400);
  step('unsketch', () => eng.setStyle({ sketch: 0 }), 400);
  step('thinking', () => eng.setEmotion('30'), 3000);
  step('ai', () => (out['eb/ai/ok'] = String(eng.handleAIMessage('{"emotionId":"31","tips":"x"}'))), 1500);
  out['eb/ai/bad'] = String(eng.handleAIMessage('{"emotionId":"99"}'));
  out['eb/ai/broken'] = String(eng.handleAIMessage('{not json'));
  out['eb/ai/missing'] = String(eng.handleAIMessage({ nope: 1 }));
  out['eb/ai/after'] = String(eng.emotionId);
  const events = [];
  eng.on('change', (e) => events.push(e.id));
  eng.startTour(['00', '10', '30'], 1000);
  adv(3500);
  out['eb/tour'] = `${eng.touring}|${events.join(',')}|${el.innerHTML}`;
  eng.stopTour();
  dispose(eng, el);

  const baby = fresh();
  const babyEng = EB.create(baby, {
    emotion: '19',
    color: '#54B9A6',
    shape: 'wedge',
    lite: true,
    eyeScale: 1.7,
    label: 'baby',
  });
  adv(1500);
  out['eb/baby'] = baby.innerHTML;
  dispose(babyEng, baby);

  const stat = fresh();
  const statEng = EB.create(stat, { emotion: '14', autostart: false, label: 'static' });
  out['eb/static'] = stat.innerHTML;
  statEng.setActive(true);
  statEng.replay();
  adv(800);
  out['eb/static-hover'] = stat.innerHTML;
  dispose(statEng, stat);

  out['eb/config/roundtrip'] = (() => {
    const exported = JSON.parse(EB.config.exportConfig());
    return `${exported.length}|${exported.map((e) => e.id).join(',')}`;
  })();

  return out;
};
