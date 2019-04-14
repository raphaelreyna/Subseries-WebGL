precision highp float;
precision mediump int;

varying vec2 index;

uniform sampler2D points;
uniform sampler2D switches;
uniform vec2 statesize;
uniform vec2 windowSize;
uniform vec2 newTerm;
uniform vec2 offset;

const float BASE = 256.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

float decodeSwitch(vec4 data) {
  float value = floor(data[0]*BASE);
  value += floor(data[1]*BASE*BASE);
  value += floor(data[2]*BASE*BASE*BASE);
  value += floor(data[3]*BASE*BASE*BASE*BASE);
  return value;
}

float getSwitchFromCode(float code) {
  return mod(float(code), 2.0);
}

vec4 encodePoint(vec2 point) {
  vec2 scale = vec2(BASE*BASE/windowSize.x,BASE*BASE/windowSize.y);
  vec2 normalizedPoint = scale*point-offset;
  return vec4(mod(normalizedPoint.x, BASE),
              floor(normalizedPoint.x / BASE),
              mod(normalizedPoint.y, BASE),
              floor(normalizedPoint.y / BASE))/BASE;
}

vec2 decodePoint(vec4 data) {
  vec2 reData = data.xy;
  vec2 imData = data.zw;
  vec2 scale = vec2(BASE*BASE/windowSize.x,BASE*BASE/windowSize.y);
  float re = (dot(DECODER, reData)/scale.x)+offset.x;
  float im = (dot(DECODER, imData)/scale.y)+offset.y;
  return vec2(re, im);
}

void main() {
  vec4 pointData = texture2D(points, index);
  vec4 switchData = texture2D(switches, index);
  vec2 p = decodePoint(pointData);
  float s = decodeSwitch(switchData);
  float sw = getSwitchFromCode(s);
  p += sw*newTerm;
  gl_FragColor = encodePoint(p);
}
