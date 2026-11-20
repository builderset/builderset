'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/*
 * The hero's stage: a dark sky, a cobalt horizon whose rim burns slowly and
 * flares toward the pointer, and the product rising out of it — tilted back
 * at first, upright as the page scrolls. The light is a small WebGL shader
 * (no library); without WebGL the CSS gradient under it stays, and with
 * reduced motion it draws one still frame.
 */

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;      // canvas size, device pixels
uniform float uTime;
uniform float uHorizon; // the rim's top, device pixels from the top
uniform float uRadius;  // the horizon's radius, device pixels
uniform vec2 uPointer;  // device pixels from the top-left
uniform float uNear;    // 0..1, how much the pointer pulls the flame
uniform float uScale;   // device pixel ratio

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = vec2(uRes.x * 0.5, uHorizon + uRadius);
  vec2 v = p - c;
  float d = (length(v) - uRadius) / uScale;      // css px; < 0 inside the disc
  float ang = atan(v.x, -v.y);                    // 0 at the top of the rim

  // The rim is brightest at the top and fades round the sides.
  float arc = smoothstep(1.35, 0.0, abs(ang));

  // The pointer's angle on the rim, and how close to the rim it is.
  vec2 pv = uPointer - c;
  float pang = atan(pv.x, -pv.y);
  float pd = abs(length(pv) - uRadius) / uScale;
  float pull = uNear * exp(-pow((ang - pang) * 5.0, 2.0)) * exp(-pd / 220.0);

  float t = uTime;
  float flick = fbm(vec2(ang * 7.0, t * 0.35));
  float tongues = fbm(vec2(ang * 16.0 + t * 0.15, max(d, 0.0) * 0.022 - t * 0.9));

  // The thin bright line, the flame above it, a soft light inside.
  float line = exp(-abs(d) / (1.4 + 2.6 * flick)) * arc;
  float reach = 40.0 + 120.0 * flick + 160.0 * pull;
  float flame = (d > 0.0 ? exp(-d / reach) : 0.0) * arc * (0.35 + 0.95 * tongues) * (0.75 + 1.4 * pull);
  float inner = (d < 0.0 ? exp(d / 26.0) : 0.0) * arc * 0.55;
  float halo = exp(-abs(d) / 520.0) * arc * 0.22;

  vec3 sky = vec3(0.027, 0.035, 0.051);
  vec3 disc = vec3(0.016, 0.02, 0.031);
  vec3 col = d < 0.0 ? mix(disc, sky, smoothstep(-500.0, 0.0, d) * 0.3) : sky;

  vec3 deep = vec3(0.08, 0.17, 0.62);    // the far glow
  vec3 cobalt = vec3(0.24, 0.42, 0.98);  // the flame
  vec3 ice = vec3(0.78, 0.86, 1.0);      // the line's core

  col += deep * halo;
  col += cobalt * flame * 0.9;
  col += cobalt * inner;
  col += ice * line * 1.1;
  col += vec3(1.0) * pow(line, 3.0) * 0.6;
  col += ice * pull * line * 0.6;

  // A little grain, so the gradient does not band.
  col += (hash(p + t) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Horizon({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const product = useRef<HTMLDivElement>(null);

  // Upright as the page scrolls: --lift goes from 0 to 1 over the first screen.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const lift = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55)));
      element.style.setProperty('--lift', lift.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const box = stage.current?.parentElement;
    if (!element || !box) return;
    const gl = element.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      res: at('uRes'),
      time: at('uTime'),
      horizon: at('uHorizon'),
      radius: at('uRadius'),
      pointer: at('uPointer'),
      near: at('uNear'),
      scale: at('uScale'),
    };

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ratio = 1;
    let horizon = 0;
    let radius = 0;
    const pointer = { x: 0, y: 0, near: 0, target: 0 };

    const size = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = element.getBoundingClientRect();
      element.width = Math.round(rect.width * ratio);
      element.height = Math.round(rect.height * ratio);
      gl.viewport(0, 0, element.width, element.height);
      // The rim sits a little above the product's top edge.
      const top = product.current
        ? product.current.getBoundingClientRect().top - rect.top - 36
        : rect.height * 0.55;
      horizon = top * ratio;
      radius = Math.max(rect.width * 0.9, 900) * ratio;
      pointer.x = element.width / 2;
      pointer.y = horizon;
    };

    const draw = (time: number) => {
      pointer.near += (pointer.target - pointer.near) * 0.06;
      gl.uniform2f(u.res, element.width, element.height);
      gl.uniform1f(u.time, still ? 4 : time / 1000);
      gl.uniform1f(u.horizon, horizon);
      gl.uniform1f(u.radius, radius);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.near, pointer.near);
      gl.uniform1f(u.scale, ratio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    let visible = true;
    const loop = (time: number) => {
      frame = 0;
      draw(time);
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && !still) frame = requestAnimationFrame(loop);
    };

    size();
    element.dataset.ready = '';
    if (still) draw(0);
    else start();

    const resize = new ResizeObserver(() => {
      size();
      if (still) draw(0);
    });
    resize.observe(element);
    const seen = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
    });
    seen.observe(element);
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) * ratio;
      pointer.y = (event.clientY - rect.top) * ratio;
      pointer.target = 1;
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    const onVisible = () => {
      if (!document.hidden) start();
    };
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="lp-horizon" aria-hidden="true" />
      <div ref={stage} className="lp-stage-hero">
        <div ref={product} className="lp-product">
          {children}
        </div>
      </div>
    </>
  );
}
