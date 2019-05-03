precision highp float;
precision mediump int;

varying vec2 index;

uniform sampler2D points;
uniform sampler2D switches;
uniform vec2 newTerm;
uniform vec2 offset;
uniform float windowsize;
uniform int lw;

const float BASE = 255.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

float decodeSwitch(vec4 data) {
  float value = data[0]*BASE;
  value += data[1]*BASE*BASE;
  value += data[2]*BASE*BASE*BASE;
  return floor(value);
}

float getSwitchFromCode(float code) {
  return mod(code, 2.0);
}

vec4 encodePoint(vec2 point) {
  vec2 scale = vec2(BASE*BASE/windowsize,BASE*BASE/windowsize);
  vec2 normalizedPoint = scale*(point-offset);
  return vec4(mod(normalizedPoint.x, BASE),
              floor(normalizedPoint.x / BASE),
              mod(normalizedPoint.y, BASE),
              floor(normalizedPoint.y / BASE))/BASE;
}

vec2 decodePoint(vec4 data) {
  vec2 reData = data.xy;
  vec2 imData = data.zw;
  float scale = BASE*BASE/windowsize;
  float re = (dot(DECODER, reData)/scale)+offset.x;
  float im = (dot(DECODER, imData)/scale)+offset.y;
  return vec2(re, im);
}

void main() {
  vec4 pointData = texture2D(points, index);
  vec4 switchData = texture2D(switches, index);
  vec2 p = decodePoint(pointData);
  float s = decodeSwitch(switchData);
  float sw = getSwitchFromCode(s);
  if (lw == 0) {
    p += sw*newTerm;
  } else {
    p += (2.0*(sw-1.0)+1.0)*newTerm;
  }
  gl_FragColor = encodePoint(p);
}
