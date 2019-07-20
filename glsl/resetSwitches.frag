precision highp float;
precision mediump int;

varying vec2 index;

uniform sampler2D master;

const float BASE = 255.0;

void main() {
    gl_FragColor = texture2D(master, index);
}
