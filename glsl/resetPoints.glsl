precision highp float;
precision mediump int;

uniform vec2 offset;
uniform float windowsize;

const float BASE = 256.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

vec4 encodePoint(vec2 point) {
  vec2 scale = vec2(BASE*BASE/windowsize,BASE*BASE/windowsize);
  vec2 normalizedPoint = scale*(point-offset);
  return vec4(mod(normalizedPoint.x, BASE),
              floor(normalizedPoint.x / BASE),
              mod(normalizedPoint.y, BASE),
              floor(normalizedPoint.y / BASE))/BASE;
}

void main() {
  gl_FragColor = encodePoint(vec2(0.0,0.0));
}
