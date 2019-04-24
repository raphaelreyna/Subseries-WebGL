precision highp float;
precision mediump int;

varying vec2 index;

uniform sampler2D state;
uniform sampler2D master;
uniform int reset;

const float BASE = 255.0;

vec4 encode(float value) {
  vec4 encoded;
  float quotient = value;
  for (int i = 0; i < 3; i++) {
    encoded[i] = mod(quotient, BASE);
    quotient = floor(quotient / BASE);
  }
  encoded[3] = 0.0;
  return encoded / BASE;
}

float decode(vec4 data) {
  float value = data.x;
  value += data.y*BASE;
  value += data.z*BASE*BASE;
  return floor(value*BASE);
}

void main() {
  vec4 sampledData = texture2D(state, index);
  float counter = 255.0*sampledData.w;
  if (reset == 0) {
    float value = decode(sampledData);
    value = floor(value / 2.0);
    if (floor(mod(value, 2.0)) == 0.0) {
      counter = counter + 1.0;
    }
    gl_FragColor = vec4(encode(value).xyz, counter/BASE);
  }
  else {
    gl_FragColor = texture2D(master, index);
  }
}
