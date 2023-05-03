const SHADER_DRAW_FRAG = `precision highp float;

varying float counter;

const float BASE = 255.0;

vec3 rgb2hsv(vec3 c)
{
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float decode(vec4 data) {
  float value = data.x;
  value += data.y*BASE;
  value += data.z*BASE*BASE;
  value += data.w*BASE*BASE*BASE;
  return floor(value*BASE);
}
void main() {
  float c = (BASE/12.0)*counter;
  gl_FragColor = vec4(1.0 - c, 0.0, c, 1.0);
}
`

const SHADER_DRAW_VERT = `precision highp float;

attribute vec2 index;

uniform sampler2D points;
uniform sampler2D switches;

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
`

const SHADER_RESET_POINTS_GLSL = `precision highp float;
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
`

const SHADER_UPDATE_VERT = `precision highp float;

attribute vec2 quad;
varying vec2 index;

void main()
{
  index = (quad + 1.0) / 2.0;
  gl_Position = vec4(quad, 0.0, 1.0);
}
`

const SHADER_UPDATE_POINTS_FRAG = `precision highp float;
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
`

const SHADER_UPDATE_SWITCHES_FRAG = `precision highp float;
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
`

// Initialize indexes as [x0,y0,x1,y1,x2,y2,...].
// Initialize all points as 0+0i, encoded.
// Initialize switches as [a0,b0,c0,d0,a1,b1,c1,d2,...],
// where a,b,c,d are the 4 base 256 digits of the encoded switch integer.
function createInitialData(stateSize, windowSize, offset) {
    const size = 4*stateSize[0]*stateSize[1];
    var data = {
        indexes: [],
        switches: new Uint8Array(size),
        points: new Uint8Array(size),
    };
    const encodedZero = encodePoint(0.0, 0.0, BASE*BASE/windowSize, offset);
    var switchCode = 0;
    for (var y = 0; y < stateSize[1]; y++) {
        for (var x = 0; x < stateSize[0]; x++) {
            const j = y*stateSize[0]*2+x*2;
            const i = y*stateSize[0]*4+x*4;
            const digits = encodeSwitch(switchCode);
            switchCode++;
            data.indexes[j] = x;
            data.indexes[j+1] = y;

            data.switches[i] = digits[0];
            data.switches[i+1] = digits[1];
            data.switches[i+2] = digits[2];
            data.switches[i+3] = 0;

            data.points[i] = encodedZero[0];
            data.points[i+1] = encodedZero[1];
            data.points[i+2] = encodedZero[2];
            data.points[i+3] = encodedZero[3];
        }
    }
    return data;
}

class App {
    constructor(canvas, k){
        this.coeffs = [];
        this.fString = "";
        this.powers = [];
        this.terms = [];
        this.offset = null;
        this.translation = null;
        this.width = 0;
        this.lw = 0; // 0 for false, 1 for true
        // This is for a k-subautomatic subseries.
        this.k = k;

        // Grab the canvas and its size then compute the scale.
        this.canvas = canvas;
        this.viewSize = new Float32Array([canvas.width, canvas.height]);
        this.scale = Math.floor(Math.pow(BASE, 2) / Math.max(canvas.width, canvas.height));

        // Compute the size of the state textures
        this.stateSize = new Float32Array([Math.ceil(Math.sqrt(2**k)), Math.floor(Math.sqrt(2**k))]);

        // Keep track of the switches and when to reset them.
        this.shouldReset = 0;
        this.counter = 0;

        // Grab the WebGL context and check if it does what we need.
        this.gl = initGL(canvas, [0,0,0,1]);
        const gl = this.gl;
        checkIfOK(gl);

        // Initialize the data to send to the GPU.
        const initData = createInitialData(this.stateSize, 2.3, [-0.640625,-0.3125]);

        // Create the programs from their shaders' paths.
        this.programs = {
            draw: createProgram(gl,
                                SHADER_DRAW_VERT,
                                SHADER_DRAW_FRAG),
            updateSwitches: createProgram(gl,
                                          SHADER_UPDATE_VERT,
                                          SHADER_UPDATE_SWITCHES_FRAG),
            updatePoints: createProgram(gl,
                                        SHADER_UPDATE_VERT,
                                        SHADER_UPDATE_POINTS_FRAG),
            resetPoints: createProgram(gl,
                                       SHADER_UPDATE_VERT,
                                       SHADER_RESET_POINTS_GLSL)};

        // Initialize the buffers and send their data over to the GPU.
        this.buffers = {
            updateQuad: squareBuffer(gl),
            indexes: initArrayBuffer(gl, initData.indexes)};

        // Initialize the textures and send their initial data over to the GPU.
        this.textures = {
            points0: makeTexture(gl,
                                 this.stateSize,
                                 initData.points),
            points1: makeTexture(gl,
                                 this.stateSize),
            switches0: makeTexture(gl,
                                   this.stateSize,
                                   initData.switches),
            switches1: makeTexture(gl,
                                   this.stateSize),
            switchesMaster: makeTexture(gl,
                                        this.stateSize,
                                        initData.switches)};

        // Initialize the framebuffers for rendering offscreen.
        this.frameBuffers = {
            points: initFrameBuffer(gl, this.textures.points1),
            switches: initFrameBuffer(gl, this.textures.switches1)};
    };

    updateSwitches() {
        const gl = this.gl;
        const program = this.programs.updateSwitches;
        const t = this.textures;

        // Tell WebGL to use the updateSwitches program.
        gl.useProgram(program);

        // Bind the switches framebuffer for offscreen rendering.
        // Then, set it to render to into the switches1 texture.
        useFramebufferWithTex(gl, this.frameBuffers.switches, t.switches1);

        // Render into a viewport with a size of stateSize.
        gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);

        // Bind the buffer that contains the corners of the square we are drawing our texture onto.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.updateQuad);

        // Bind switches0 and masterSwitches textures.
        bindTexture(gl, 0, t.switches0);
        bindTexture(gl, 1, t.switchesMaster);

        // Send attribute and uniform data to GPU.
        setupAttributePointer(gl, program, 'quad', 2);
        setupUniform(gl, program, 'state', 'li', 0);
        setupUniform(gl, program, 'master', 'li',1);
        setupUniform(gl, program, 'reset', 'li', this.shouldReset);

        // Render updates to texture offscreen.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Swap textures so we read from the newly updated texture next time.
        this.swapSwitchesTextures();

        // Update the counter that controls when the switches are reset.
        this.updateResetCounter();
}

    addTerm(term) {
        const gl = this.gl;
        const program = this.programs.updatePoints;
        const t = this.textures;

        // Tell WebGL to use the updateSwitches program.
        gl.useProgram(program);

        // Bind the points framebuffer for offscreen rendering.
        // Then, set it to render to into the points1 texture.
        useFramebufferWithTex(gl, this.frameBuffers.points, t.points1);

        // Render into a viewport with a size of stateSize.
        gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);

        // Bind the buffer that contains the corners of the square we are drawing our texture onto.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.updateQuad);

        // Bind textures for points and switches.
        bindTexture(gl, 0, t.points0);
        bindTexture(gl, 1, t.switches0);

        // Send uniform and attribute data to the GPU.
        setupAttributePointer(gl, program, 'quad', 2, 0, 0);
        setupUniform(gl, program, 'points', 'li', 0);
        setupUniform(gl, program, 'switches', 'li', 1);
        setupUniform(gl, program, 'windowsize', '1f', this.width);
        setupUniform(gl, program, 'newTerm', '2fv', term);
        setupUniform(gl, program, 'offset', '2fv', this.offset);
        setupUniform(gl, program, 'lw', 'li', this.lw);

        // Render updates to texture offscreen.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Swap switches textures.
        // New becomes old.
        this.swapPointsTextures();
    }

    draw() {
        const gl = this.gl;
        const program = this.programs.draw;
        const t = this.textures;

        // Tell WebGL to use the updateSwitches program.
        gl.useProgram(program);

        // Bind the default framebuffer for rendering to the display.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Render into a viewport the size of the canvas.
        gl.viewport(0, 0, this.viewSize[0], this.viewSize[1]);

        // Bind the buffer that contains the indexes for the points.
        // One index pair per point/subseries.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.indexes);

        // Bind texture containing point data.
        bindTexture(gl, 0, t.points0);

        // Bind texture containing switches/counter data.
        bindTexture(gl, 1, t.switches0);

        // Send uniform and attribute data to the GPU.
        setupAttributePointer(gl, program, 'index', 2, 0, 0);
        setupUniform(gl, program, 'points', '1i', 0);
        setupUniform(gl, program,'switches', 'li', 1);
        setupUniform(gl, program, 'statesize', '2fv', this.stateSize);
        setupUniform(gl, program, 'windowsize', '1f', this.width);
        setupUniform(gl, program, 'offset', '2fv', this.offset);
        setupUniform(gl, program, 'translation', '2fv', this.translation);

        // Render to the screen.
        drawPointsWithBlending(gl, 2**this.k);
    }

    async setupForDrawLoop(fString, real, imag) {
        // Check if function has changed.
        // If so, we need to recompute the coefficients
        if (this.fString != fString) {
            this.fString = fString;
            this.coeffs = await getCoeffs(this.fString, this.k, true);
            if (this.coeffs === null) {
                alert("Could not connect to backend server on Heroku.\n It was probably asleep and is now spinning back up.\n Please try reloading the page.");
            }
        }
        // Compute the sequence of powers for the given complex number.
        this.powers = getPowers(real, imag, this.k);
        // Compute the terms of the function evaluation at the given complex number.
        this.terms = [];
        for (var i = 0; i < this.k; i++){
            const c = this.coeffs[i];
            const zn = this.powers[i];
            const term = scalarComplexMult(c, zn);
            this.terms.push(term);
        }

        // Check if we are computing a subseries or Littlewood series.
        // Otherwise we set the translation for drawing to the origin.
        if (this.lw === 0) {
            // If we are computing a subseries, calculate the translation for drawing and offset for encoding.
            var translation = {re:0, im:0};
            var offsetX = 0;
            var offsetY = 0;
            for (var i = 0; i < this.k; i++){
                const t = this.terms[i];
                if (t.re < 0) {
                    offsetX += t.re;
                }
                if (t.im < 0) {
                    offsetY += t.im;
                }
                translation = complexAdd(translation, t);
            }
            translation = scalarComplexMult(-0.5, translation);
            this.translation = [translation.re, translation.im];
            this.offset = [offsetX, offsetY];

            // Compute the width of the set for encoding and drawing.
            var wn = {re: 1, im: 0};
            const w = {re: real, im: imag};
            var cSeriesForComputingWidth = {re: 0, im: 0};
            for (var i = 0; i < this.k; i++){
                const term = scalarComplexMult(this.coeffs[i], wn);
                cSeriesForComputingWidth = complexAdd(term, cSeriesForComputingWidth);
                wn = complexMult(w, wn);
            }
            const midpoint = 0.5*abs(cSeriesForComputingWidth);
            var seriesForComputingWidth = 0;
            for (var i = 0; i < this.k; i++){
                seriesForComputingWidth += Math.abs(this.coeffs[i])*(Math.sqrt(real**2+imag**2))**i;
            }
            this.width = midpoint+seriesForComputingWidth;

        } else {
            this.translation = [0,0];
            const modulus = Math.sqrt(real**2+imag**2);
            this.offset = [-1/(1-modulus),-1/(1-modulus)];

            this.width = 0;
            for (var i = 0; i < this.k; i++){
                this.width += Math.abs(this.coeffs[i])*(modulus)**i;
            }
            this.width *= 2;
        }
        if (this.fString != "") {
            this.resetPoints();
            this.shouldReset = 1;
            this.updateSwitches();
            this.counter = 0;
            this.shouldReset = 0;
        }
    }

    resetPoints(){
        const gl = this.gl;
        const program = this.programs.resetPoints;
        const t = this.textures;

        // Tell WebGL to use the resetPoints program.
        gl.useProgram(program);

        // Bind the points framebuffer for offscreen rendering.
        // Then, set it to render to into the points1 texture.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.points);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,
                                gl.COLOR_ATTACHMENT0,
                                gl.TEXTURE_2D,
                                t.points1,
                                0);

        // Bind the buffer that contains the corners of the square we are drawing our texture onto.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.updateQuad);

        // Render into a viewport with a size of stateSize.
        gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);

        // Send uniform and attribute data to the GPU.
        setupAttributePointer(gl, program, 'quad', 2, 0, 0);
        setupUniform(gl, program, 'windowsize', '1f', this.width);
        setupUniform(gl, program, 'offset', '2fv', this.offset);

        // Render updates to texture offscreen.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.swapPointsTextures();
    }

    swapSwitchesTextures() {
        const temp = this.textures.switches0;
        this.textures.switches0 = this.textures.switches1;
        this.textures.switches1 = temp;
    }

    swapPointsTextures() {
        const temp = this.textures.points0;
        this.textures.points0 = this.textures.points1;
        this.textures.points1 = temp;
    }

    updateResetCounter() {
        // Setup reset for next time.
        if (this.shouldReset === 1) {
            this.shouldReset = 0;
        }
        this.counter++;
        if (this.counter % 2**this.k === 0) {
            this.shouldReset = 1
        }

    }
}
