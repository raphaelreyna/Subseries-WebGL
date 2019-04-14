precision highp float;

attribute vec2 index;

uniform sampler2D points;
uniform vec2 statesize;
uniform vec2 windowsize;
uniform vec2 offset;

const float POINT_SIZE = 3.0;
const float BASE = 256.0;
const vec2 DECODER = vec2(BASE, BASE*BASE);

vec2 decodePoint(vec4 data) {
  vec2 reData = data.xy;
  vec2 imData = data.zw;
  vec2 scale = vec2(BASE*BASE/windowsize.x,BASE*BASE/windowsize.y);
  float re = (dot(DECODER, reData)/scale.x)+offset.x;
  float im = (dot(DECODER, imData)/scale.y)+offset.y;
  return vec2(re, im);
}

void main() {
  vec4 pointData = texture2D(points, index / statesize);
  vec2 point = decodePoint(pointData)-0.7*vec2(1.0,1.0);
  gl_Position = vec4(point, 0, 1);
  gl_PointSize = POINT_SIZE;
}
