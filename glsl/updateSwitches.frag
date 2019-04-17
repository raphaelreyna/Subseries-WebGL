precision highp float;
precision mediump int;

varying vec2 index;

uniform sampler2D state;
uniform sampler2D master;
uniform int reset;

const float BASE = 256.0;

vec4 encode(float value) {
  vec4 encoded;
  float quotient = value;
  for (int i = 0; i < 4; i++) {
    encoded[i] = mod(quotient, BASE);
    quotient = floor(quotient / BASE);
  }
  return encoded / BASE;
}

float decode(vec4 data) {
  float value = data.x;
  value += data.y*BASE;
  value += data.z*BASE*BASE;
  value += data.w*BASE*BASE*BASE;
  return floor(value*BASE);
}

void main() {
  if (reset == 0) {
    vec4 sampledData = texture2D(state, index);
    float value = decode(sampledData);
    value = floor(value / 2.0);
    gl_FragColor = encode(value);
  }
  else {
    gl_FragColor = texture2D(master, index);
  }
}
