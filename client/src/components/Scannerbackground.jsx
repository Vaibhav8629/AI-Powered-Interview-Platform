import React, { useEffect, useRef } from "react";
import "./Scannerbackground.css";

/**
 * ScannerBackground
 * -------------------------------------------------------------------------
 * A fixed, full-viewport WebGL background: slow, flowing aurora-like
 * bands of green light drifting behind the page. No UI, no text, no
 * mouse interaction — purely decorative and always inert to pointer
 * events. Designed to sit behind scrolling page content on a premium
 * AI / SaaS landing page.
 *
 * Usage:
 *   <>
 *     <ScannerBackground />
 *     <PageContent />
 *   </>
 *
 * Notes:
 * - Single self-contained component: owns its own <canvas>, WebGL
 *   context, shader program, and animation loop.
 * - Animation automatically pauses when the browser tab is hidden
 *   (visibilitychange) and resumes when it becomes visible again.
 * - Resizes with the viewport via a debounced resize listener,
 *   respecting devicePixelRatio (capped for performance).
 * - No dependency on any third-party WebGL/animation library.
 */

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// Soft, low-contrast flowing noise field. Multiple large-scale sine/noise
// layers are blended to read as slow aurora sheets rather than bands or
// scanlines. Colors interpolate between three green tones with very
// gentle contrast and a soft vignette so the effect stays readable
// behind foreground content.
const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 1.9;
      amplitude *= 0.55;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 aspectUv = uv;
    aspectUv.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.035; // slow, continuous drift

    vec2 flowA = aspectUv * 1.1 + vec2(t * 0.6, t * 0.25);
    vec2 flowB = aspectUv * 1.6 - vec2(t * 0.35, t * 0.4);

    float n1 = fbm(flowA);
    float n2 = fbm(flowB + n1 * 0.6);
    float field = fbm(aspectUv * 0.8 + n2 * 0.8 + vec2(0.0, t * 0.2));

    float bands = smoothstep(0.15, 0.85, sin(field * 3.14159 + t * 0.8) * 0.5 + 0.5);

    float drift = sin(aspectUv.x * 1.6 + t * 1.1) * 0.08;
    float verticalMask = smoothstep(0.0, 1.0, 1.0 - abs((aspectUv.y - 0.5 - drift) * 1.4));

    float intensity = mix(field, bands, 0.55) * 0.65 + verticalMask * 0.35;
    intensity = clamp(intensity, 0.0, 1.0);

    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 0.7, intensity));
    color = mix(color, uColor3, smoothstep(0.55, 1.0, intensity) * 0.5);

    vec2 centered = uv - 0.5;
    float vignette = 1.0 - smoothstep(0.35, 0.95, length(centered));

    float alpha = intensity * 0.28 * vignette;

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function hexToRgb01(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function ScannerBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const isVisibleRef = useRef(true);
  const startTimeRef = useRef(performance.now());
  const uniformsRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true }) ||
      canvas.getContext("experimental-webgl", { alpha: true });

    if (!gl) {
      // No WebGL support: leave a fully transparent, inert background
      // rather than crashing the host page.
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }
    gl.useProgram(program);

    // Fullscreen triangle strip covering clip space.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uColor1: gl.getUniformLocation(program, "uColor1"),
      uColor2: gl.getUniformLocation(program, "uColor2"),
      uColor3: gl.getUniformLocation(program, "uColor3"),
    };

    const color1 = hexToRgb01("#00E676"); // vibrant emerald
    const color2 = hexToRgb01("#7CFFB2"); // soft neon green
    const color3 = hexToRgb01("#E8FFF1"); // near-white green highlight
    gl.uniform3f(uniformsRef.current.uColor1, ...color1);
    gl.uniform3f(uniformsRef.current.uColor2, ...color2);
    gl.uniform3f(uniformsRef.current.uColor3, ...color3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const maxDpr = 1.5; // cap devicePixelRatio to keep GPU cost low as a background layer

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const displayWidth = Math.floor(window.innerWidth * dpr);
      const displayHeight = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniformsRef.current.uResolution, canvas.width, canvas.height);
    }

    resize();

    let resizeTimeout = null;
    function handleResize() {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    }
    window.addEventListener("resize", handleResize);

    function handleVisibilityChange() {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(render);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function render(now) {
      if (!isVisibleRef.current) {
        rafRef.current = null;
        return;
      }
      const elapsed = (now - startTimeRef.current) / 1000;
      gl.uniform1f(uniformsRef.current.uTime, elapsed);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    }
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <div className="scanner-background" aria-hidden="true">
      <canvas ref={canvasRef} className="scanner-background__canvas" />
    </div>
  );
}