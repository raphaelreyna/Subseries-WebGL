precision highp float;

attribute vec2 index;

uniform sampler2D points;
uniform vec2 statesize;
uniform vec2 offset;
uniform vec2 translation;
uniform float windowsize;

const float POINT_SIZE = 3.0;
const float BASE = 256.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

vec2 decodePoint(vec4 data) {
  vec2 reData = data.xy;
  vec2 imData = data.zw;
  float scale = BASE*BASE/windowsize;
  float re = (dot(DECODER, reData)/scale)+offset.x;
  float im = (dot(DECODER, imData)/scale)+offset.y;
  return vec2(re, im);
}

void main() {
  vec4 pointData = texture2D(points, index / statesize);
  vec2 point = decodePoint(pointData);
  gl_Position = vec4((2.0*point/(1.1*windowsize)+translation), 0, 1);
  gl_PointSize = POINT_SIZE;
}
