export const vertexShader = /* glsl */ `
uniform float uBend;
uniform vec2 uPlaneSize;
uniform float uVelocity;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;

  // Exact Weichie bend: edges pull toward local -Z (ring center when facing out)
  float halfW = uPlaneSize.x * 0.5;
  float distX = clamp(abs(p.x) / max(halfW, 0.0001), 0.0, 1.0);
  p.z -= uBend * distX * distX;

  // Light skew only while dragging (kept tiny — no fake “motion blur”)
  float vel = clamp(uVelocity, -0.8, 0.8);
  p.x += position.y * vel * 0.02;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform float uRadius;
uniform float uOpacity;

varying vec2 vUv;

vec2 coverUV(vec2 uv, vec2 imageSize, vec2 planeSize) {
  float planeAspect = planeSize.x / planeSize.y;
  float imageAspect = imageSize.x / imageSize.y;
  vec2 ratio = imageAspect > planeAspect
    ? vec2(planeAspect / imageAspect, 1.0)
    : vec2(1.0, imageAspect / planeAspect);
  return uv * ratio + (1.0 - ratio) * 0.5;
}

// Linear → sRGB (OETF). Custom ShaderMaterial on a transparent canvas often
// skips drawing-buffer encode, so photos would stay linear (= too dark).
vec3 linearToSRGB(vec3 value) {
  return mix(
    value * 12.92,
    pow(value, vec3(1.0 / 2.4)) * 1.055 - 0.055,
    step(vec3(0.0031308), value)
  );
}

void main() {
  float r = uRadius;
  vec2 d = abs(vUv - 0.5) - (0.5 - r);
  float dist = length(max(d, 0.0)) - r;
  float mask = 1.0 - smoothstep(-0.002, 0.002, dist);
  float alpha = mask * uOpacity;
  if (alpha < 0.02) discard;

  vec2 uv = coverUV(
    gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y),
    uImageSize,
    uPlaneSize
  );
  vec4 tex = texture2D(uMap, uv);
  vec3 color = gl_FrontFacing ? tex.rgb : tex.rgb * 0.9;
  color = linearToSRGB(color);
  gl_FragColor = vec4(color, tex.a * alpha);
}
`;
