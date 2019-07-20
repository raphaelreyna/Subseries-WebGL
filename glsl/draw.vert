precision highp float;

attribute vec2 index;

uniform sampler2D switches;
uniform sampler2D points;

uniform vec2 statesize;
uniform vec2 offset;
uniform vec2 translation;
uniform float windowsize;

const float POINT_SIZE = 1.0;
const float BASE = 255.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

varying float counter;

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
  counter = texture2D(switches, index / statesize).w;
  vec2 point = decodePoint(pointData);
  gl_Position = vec4(2.0*(point+translation)/windowsize, 0, 1);
  gl_PointSize = POINT_SIZE;
}
