import { DYE_RAMP_RANGE } from './dye';

export const PASS = { body: 0, shell: 1, strand: 2 } as const;
export const SOCKET_PAD = 3.8;

const float = (n: number): string => (Number.isInteger(n) ? `${n}.` : `${n}`);

const passes = `const int BODY = ${PASS.body}, SHELL = ${PASS.shell}, STRAND = ${PASS.strand};`;

const socketField = `
uniform highp sampler2D eyeField;
uniform vec4 eyeRegion[2];
uniform vec2 eyeSize[2];
const float FAR = ${float(SOCKET_PAD)};

float socketDistance(vec2 screen, float facing, out vec2 uv, out vec3 local) {
  uv = vec2(0.);
  local = vec3(0.);
  if (facing < .03) return FAR;
  for (int i = 0; i < 2; i++) {
    vec4 e = eyeRegion[i];
    vec2 delta = screen - e.xy;
    if (e.z > 0. && max(abs(delta.x), abs(delta.y)) < e.z * .49) {
      vec2 coords = delta / e.z;
      vec2 sampleUV = (coords + .5 + vec2(float(i), 0.)) * vec2(.5, 1.);
      float d = (textureLod(eyeField, sampleUV, 0.).r - .5) * ${float(2 * SOCKET_PAD)};
      if (d >= 3.77) continue;
      uv = sampleUV;
      local.xy = 2. * delta / max(eyeSize[i], vec2(.01));
      local.z = smoothstep(.35, 1.5, eyeSize[i].y / max(.01, eyeSize[i].x));
      return d * mix(1.5, 1., local.z);
    }
  }
  return FAR;
}`;

export const vertexShader = `#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 seed;
uniform mat3 view;
uniform float radius, shell, pileScale;
uniform float strandWidth;
uniform int pass;
out vec3 S, N, V, Vn, pilePosition, lean;
out float tip, variation, across, pocketDepth;
${passes}
${socketField}

void main() {
  vec3 n = normalize(normal), p = position;
  vec3 nv = view * n;
  vec3 shadingNormal = n;
  pilePosition = position;
  float wave = .21 * sin(dot(position, vec3(.11, .045, .08))) + .14 * sin(.13 * position.y - .07 * position.z);
  float angle = .22 + .94 * nv.x + wave;
  vec3 sweep = transpose(view) * vec3(sin(angle), cos(angle), .18);
  lean = sweep - n * dot(n, sweep);

  vec2 uv;
  vec3 local;
  vec3 flat0 = view * position;
  float d = socketDistance(flat0.xy, nv.z, uv, local);
  float seat = .9 * smoothstep(.03, .45, nv.z);
  float dome = sqrt(max(0., 1. - dot(local.xy, local.xy)));
  float cap = mix(smoothstep(0., 1.3, -d), dome, local.z) * smoothstep(-.15, .38, -d);
  float floorDepth = 1. - smoothstep(-.15, 1.65, d);
  p += n * seat * (.56 * cap - .98 * floorDepth);
  float loft = mix(.4, 1., smoothstep(.75, 3.7, d));
  float lip = smoothstep(-.10, 1., d) * (1. - smoothstep(1., 2.85, d));
  if (pass == BODY) p += n * seat * .15 * lip;
  pilePosition = p;

  tip = 0.;
  variation = .5;
  across = 0.;
  if (pass == SHELL) {
    p += n * shell * 1.10 * loft * pileScale;
    p += lean * (1.05 * shell * loft * pileScale);
  }
  if (pass == STRAND) {
    tip = float(gl_VertexID / 2) / 3.;
    across = float(gl_VertexID % 2) * 2. - 1.;
    vec3 tangent = normalize(cross(n, abs(n.y) < .93 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
    vec3 bitangent = cross(n, tangent);
    float flow = 2.3 * sin(.24 * p.x + .13 * p.z + sin(.22 * p.y)) + 1.3 * sin(.32 * p.y - .15 * p.x);
    float turn = flow + (seed.x - .5) * 2.6;
    vec3 comb = lean + .24 * (tangent * cos(turn) + bitangent * sin(turn));
    if (d < 3.5) {
      vec3 cs = view * comb;
      vec2 radial = normalize(local.xy * vec2(1.7, 1.) + vec2(.001));
      vec2 alongEdge = vec2(-radial.y, radial.x);
      cs.xy = mix(cs.xy, alongEdge * (dot(cs.xy, alongEdge) < 0. ? -1. : 1.), .88 * (1. - smoothstep(.4, 3.5, d)));
      comb = transpose(view) * cs;
    }
    vec3 bend = cross(n, comb);
    float len = mix(1.6, 3.8, seed.y) * loft * pileScale;
    vec3 direction = n * (.30 + .18 * tip) + comb * (.93 - .12 * tip) + bend * (seed.x - .5) * .45 * tip;
    pilePosition += comb * (.7 * len * tip);
    p += n * .52 * loft * pileScale;
    float width = (.073 + .11 * seed.y) * strandWidth * sqrt(pileScale);
    p += .065 * n + len * tip * direction;
    vec3 screenDir = view * (direction + .06 * comb);
    vec2 widthDir = normalize(vec2(-screenDir.y, screenDir.x) + vec2(.0001, 0));
    p += transpose(view) * vec3(widthDir * across * width * (1. - .94 * tip), 0);
    shadingNormal = normalize(shadingNormal + .19 * comb);
    variation = seed.x;
  }

  vec3 projected = view * p;
  pocketDepth = dot(position - p, n) / max(.01, seat);
  S = projected;
  N = view * shadingNormal;
  V = n;
  Vn = nv;
  gl_Position = vec4(projected.x, -projected.y, -projected.z, radius) / radius;
}`;

export const fragmentShader = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D pile;
uniform sampler2D dyeRamp;
uniform sampler2D paint;
uniform highp sampler3D brushedPile;
uniform vec3 color, ink;
uniform int pass;
uniform float shell, radius, paintOn;
in vec3 S, N, V, Vn, pilePosition, lean;
in float tip, variation, across, pocketDepth;
out vec4 result;
${passes}
${socketField}

float fiberMap(vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(5.));
  w /= max(.001, w.x + w.y + w.z);
  return dot(w, vec3(texture(pile, p.zy / 16.).r, texture(pile, p.xz / 16.).r, texture(pile, p.xy / 16.).r));
}

float brushedHeight() {
  vec3 uvw = pilePosition / 15.;
  vec3 stepUV = lean * .019;
  float locks = 4. * texture(brushedPile, uvw).r;
  for (int i = 1; i <= 3; i++) {
    vec3 delta = float(i) * stepUV;
    locks += (4. - float(i)) * (texture(brushedPile, uvw + delta).r + texture(brushedPile, uvw - delta).r);
  }
  float tuft = texture(brushedPile, uvw * .42).r;
  return clamp(.5 + 1.65 * (locks / 16. - .5) + .16 * (tuft - .5), 0., 1.);
}

void main() {
  vec3 n = normalize(N);
  vec3 light = normalize(vec3(-.52, -.83, .62));
  float diffuse = dot(n, light);
  float wrap = clamp((diffuse + .65) / 1.65, 0., 1.);
  float facingLight = clamp(.66 + .34 * diffuse, 0., 1.);
  float diffuseLevel = .87 + .13 * wrap;
  float sheen = .014 * wrap * wrap;
  float rimExposure = 1.;

  vec2 uv;
  vec3 local;
  float d = socketDistance(S.xy, normalize(Vn).z, uv, local);
  if (pass == SHELL && d < .1) discard;
  if (pass == STRAND && d < .10 - .08 * variation) discard;

  float height = brushedHeight();
  float pileFill = .925 + .075 * smoothstep(.22, .81, height);
  if (pass == STRAND) {
    float edge = min(1., abs(across));
    float glint = smoothstep(.08, .82, tip) * (1. - .32 * edge * edge);
    diffuseLevel *= .935 + .11 * variation + .035 * clamp(tip, 0., 1.);
    sheen += (.012 + .20 * glint) * (.44 + .56 * variation) * facingLight;
  } else {
    float layer = pass == SHELL ? shell : 0.;
    if (pass == SHELL && height < .21 + .59 * layer) discard;
    diffuseLevel *= .895 + .16 * height + .035 * layer;
    sheen += (.012 + .13 * smoothstep(.41, .86, height) + .022 * layer) * facingLight;
    rimExposure = .80 + .34 * layer;
  }

  float grazing = 1. - smoothstep(.09, .83, abs(n.z));
  float backlit = smoothstep(-.20, .79, dot(n.xy, vec2(.66, -.75)));

  float upper = 0., crease = 0., pileRelief = 0., contact = 0., lipLight = 0.;
  if (d < 3.7) {
    vec2 texel = 1. / vec2(textureSize(eyeField, 0));
    vec2 g = vec2(texture(eyeField, uv + vec2(texel.x, 0)).r - texture(eyeField, uv - vec2(texel.x, 0)).r,
                  texture(eyeField, uv + vec2(0, texel.y)).r - texture(eyeField, uv - vec2(0, texel.y)).r);
    vec2 outward = g / max(length(g), .001);
    upper = dot(outward, normalize(vec2(.96, -.28)));
    float fibers = fiberMap(pilePosition, normalize(V));
    float buried = smoothstep(-.12, .82, pocketDepth);
    crease = .25 * (1. - smoothstep(-.12, 1.65 + 1.30 * upper + .6 * (fibers - .5), d)) * mix(.24, 1., buried);
    if (pass == STRAND) {
      pileRelief = ((tip - .46) * .16 + (fibers - .48) * .11) * (1. - smoothstep(1.5, 3.65, d));
    }
    contact = .3 * (1. - smoothstep(-.04, .38, d)) * mix(.35, 1., buried);
    float lip = smoothstep(.03, .49, d) * (1. - smoothstep(1.10, 3.65, d));
    float gathered = clamp(.22 - .52 * outward.x + 1.14 * outward.y, 0., 1.22);
    float tipLight = .14 + .22 * fibers;
    lipLight = .3 * tipLight * gathered * lip * mix(.40, 1., local.z);
  }
  float occlusion = crease * (.76 + .18 * upper);
  float fiberLight = (sheen + .46 * grazing * backlit * rimExposure) * (1. - crease) + lipLight;
  diffuseLevel = (diffuseLevel * (1. - .48 * occlusion) + pileRelief) * (1. - (.36 + .04 * upper) * contact);

  float backing = diffuseLevel * pileFill;
  float exposure = backing * backing * (.72 + .39 * wrap) + 1.45 * fiberLight * pileFill;
  vec4 ramp = texture(dyeRamp, vec2(exposure / ${float(DYE_RAMP_RANGE)}, .5));
  vec3 base = ramp.rgb;
  if (ramp.a > 0.) {
    float value = max(color.r, max(color.g, color.b));
    vec3 dye = color / max(value, .001);
    float weakest = min(dye.r, min(dye.g, dye.b));
    vec3 scatter = (1. - dye) * (.09 + .91 * (dye - weakest)) * clamp(1.85 * fiberLight, 0., 1.);
    float brightness = clamp(value * diffuseLevel + (.35 + .65 * value) * fiberLight, 0., 1.);
    base = mix(base, (dye + scatter) * brightness * pileFill, ramp.a);
  }

  if (paintOn > 0.) {
    vec4 inlay = texture(paint, vec2(S.x, S.y) / radius * .5 + .5);
    if (inlay.a > .004) {
      float shading = clamp(.5 + .55 * exposure, .3, 1.1);
      base = mix(base, clamp(inlay.rgb * shading, 0., 1.), inlay.a);
    }
  }

  if (pass == BODY && d < 3.7) {
    vec2 curve = local.xy * .94;
    vec3 dome = normalize(vec3(curve, sqrt(max(.02, 1. - dot(curve, curve)))));
    vec3 beadNormal = dome;
    vec2 key = beadNormal.xy - vec2(.59, -.865);
    key = vec2(key.x - .76 * key.y, key.y) / vec2(.55, .70);
    vec2 fill = beadNormal.xy - vec2(.61, -.195);
    fill = vec2(fill.x - .37 * fill.y, fill.y) / vec2(.47, 1.01);
    float inkValue = max(ink.r, max(ink.g, ink.b));
    float gloss = 1. - .65 * inkValue;
    float stripLight = .22 * gloss * exp(-dot(key, key));
    float sideLight = .07 * gloss * exp(-dot(fill, fill));
    vec3 bead = ink * (.86 + .14 * beadNormal.z);
    vec3 reflection = mix(vec3(1.), color, .28) * stripLight + mix(vec3(1.), color, .72) * sideLight;
    bead += reflection * smoothstep(-.12, .55, -d);
    float aa = max(.15, fwidth(d));
    base = mix(bead, base, smoothstep(-aa * .5, aa * .5, d));
  }
  result = vec4(base, 1.);
}`;
