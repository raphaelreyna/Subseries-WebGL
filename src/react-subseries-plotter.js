import React from 'react';
import ReactDOM from 'react-dom';
import {TrackerCanvas} from '@rreyna/react-tracker-canvas';

const BASE = 255;

function fetch(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, Boolean(callback));
    xhr.send();
    return xhr.responseText;
}

function complexMult(a, b) {
    const real = a.re*b.re-a.im*b.im;
    const imag = a.re*b.im+a.im*b.re;
    return {re: real, im: imag};
}

function scalarComplexMult(s, z) {
    return {re:s*z.re, im:s*z.im};
}

function complexAdd(a, b) {
    const real = a.re + b.re;
    const imag = a.im + b.im;
    return {re:real, im: imag};
}

function abs(a) {
    return Math.sqrt(a.re**2+a.im**2);
}

// Encode the switch integer as a 4 digit base 256 number.
// This encoding allows us to store the integers as a rgba texture.
function encodeSwitch(value) {
    var digits = [];
    var quotient = value;
    for (var i = 0; i < 4; i++) {
        digits[i] = quotient % BASE;
        quotient = Math.floor(quotient / BASE);
    }
    return digits;
}

// Encode a complex number as a 4 digit base 256 number.
// This encoding allows us to store the numbers as a rgba texture.
function encodePoint(re, im, scale, offset) {
    const normalizedRe = scale*(re - offset[0]);
    const normalizedIm = scale*(im - offset[1]);
    const encodedPoint = [normalizedRe % BASE,
                          Math.floor(normalizedRe / BASE),
                          normalizedIm % BASE,
                          Math.floor(normalizedIm / BASE)];
    return encodedPoint;
}

function getCoeffs(fString, k) {
    const zero = {x:0};
    var coeffsList = [];

    var counter = 1;
    var factorial = 1;
    var coeff = 0;

    var f = math.parse(fString);

    for (var i = 0; i < k+2; i++) {
        coeff = f.eval(zero)/factorial;
        factorial *= counter;
        counter++;
        f = math.derivative(f,'x');
        coeffsList.push(coeff);
    }
    return coeffsList;
}

function getPowers(real, imag, k) {
    var z = {re:real, im: imag};
    var z0 = {re: 1, im: 0};
    var powers = [z0];
    for (var i = 0; i < k; i++){
        const p = complexMult(powers[i], z);
        powers.push(p);
    }
    return powers;
}

function initGL(canvas, clearColor) {
    var gl = canvas.getContext('webgl');
    if (!gl) {
		    gl = canvas.getContext('experimental-webgl');
	  }

	  if (!gl) {
        throw new Error('WebGL not supported');
	  }

	  gl.clearColor(clearColor[0],
                  clearColor[1],
                  clearColor[2],
                  clearColor[3]);
	  gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    return gl;
}

function checkIfOK(gl) {
    if (gl == null) {
        throw new Error('No WebGL');
    }
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) === 0) {
        var msg = 'Vertex shader texture access not available.' +
            'Try again on another platform.';
        throw new Error(msg);
    }
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling shader!', gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(gl, vertexShaderPath, fragmentShaderPath) {
    const vShader = compileShader(gl,
                                  gl.VERTEX_SHADER,
                                  fetch(vertexShaderPath));
    const fShader = compileShader(gl,
                                  gl.FRAGMENT_SHADER,
                                  fetch(fragmentShaderPath));
    var program = gl.createProgram();
	  gl.attachShader(program, vShader);
	  gl.attachShader(program, fShader);
	  gl.linkProgram(program);
	  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		    console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		    return null;
	  }
	  gl.validateProgram(program);
	  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		    console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		    return null;
    }
    return program;
}

function initArrayBuffer(gl, data) {
    var buffer = gl.createBuffer();
	  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

function setupAttributePointer(gl,
                              program,
                              name,
                              elementsPerAttribute,
                              size,
                              offset
                             ) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,
                           elementsPerAttribute,
                           gl.FLOAT,
                           gl.FALSE,
                           size?size * Float32Array.BYTES_PER_ELEMENT:0,
                           offset?offset * Float32Array.BYTES_PER_ELEMENT:0
                          );
    return location;
}

function setupUniform(gl,
                      program,
                      name,
                      type,
                      data) {
    const location = gl.getUniformLocation(program, name);
    switch (type) {
    case 'li':
        gl.uniform1i(location, data);
        break;
    case '1f':
        gl.uniform1f(location, data);
        break;
    case '2fv':
        const packedData = Float32Array.from(data);
        gl.uniform2fv(location, packedData);
        break;
    }
}

function makeTexture(gl, size, data) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
		    gl.TEXTURE_2D, // Target
        0, // Level
        gl.RGBA, // Internal format
        size[0], // Width
        size[1], // Height
        0, // Border
        gl.RGBA, //Format
		    gl.UNSIGNED_BYTE, // Type
		    data // Data
	  );
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function bindTexture(gl, location, texture) {
    gl.activeTexture(gl.TEXTURE0 + location);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

function initFrameBuffer(gl, texture) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, // Target
                            gl.COLOR_ATTACHMENT0, // Attachment
                            gl.TEXTURE_2D, // Texture Target
                            texture, // Texture
                            0 // Level
                           );
    return framebuffer;
}

function useFramebufferWithTex(gl, framebuffer, texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,
                            gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D,
                            texture,
                            0);
}

function useDefaultFramebuffer(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function squareBuffer(gl) {
    const data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    return initArrayBuffer(gl, data);
}

function drawPointsWithBlending(gl, count) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, count-2);
    gl.disable(gl.BLEND);
}

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

class SubseriesPlotterLogic {
    constructor(canvas, k, postDrawCallback){
        this.postDrawCallback = postDrawCallback ? postDrawCallback : ()=>{};
        this.coeffs = [];
        this.powers = [];
        this.terms = [];
        this.offset = null;
        this.translation = null;
        this.width = 0;
        this.lw = 0; // 0 for false, 1 for true
        // This is for a k-subautomatic subseries.
        this.k = k;

        // Grab the canvas and its size.
        this.canvas = canvas;
        this.canvasSize = new Float32Array([canvas.width, canvas.height]);

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
                                'glsl/draw.vert',
                                'glsl/draw.frag'),
            updateSwitches: createProgram(gl,
                                          'glsl/update.vert',
                                          'glsl/updateSwitches.frag'),
            updatePoints: createProgram(gl,
                                        'glsl/update.vert',
                                        'glsl/updatePoints.frag'),
            resetPoints: createProgram(gl,
                                       'glsl/update.vert',
                                       'glsl/resetPoints.glsl')};

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

    addTerm() {
        const term = this.terms[this.counter];
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
        setupUniform(gl, program, 'newTerm', '2fv', [term.re,term.im]);
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
        gl.viewport(0, 0, this.canvasSize[0], this.canvasSize[1]);

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
        this.postDrawCallback(gl);
    }

    setupForDrawLoop(real, imag, coeffs) {
        this.coeffs = coeffs;
        // Compute the sequence of powers for the given complex number.
        this.powers = getPowers(real, imag, this.k);
        // Compute the terms of the function evaluation at the given complex number.
        this.terms = [];
        for (var i = 0; i <= this.k; i++){
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
            var cSeriesForComputingWidth = {re: 0, im: 0};
            for (var i = 0; i <= this.k; i++){
                cSeriesForComputingWidth = complexAdd(this.terms[i], cSeriesForComputingWidth);
            }
            const midpoint = 0.5*abs(cSeriesForComputingWidth);
            var seriesForComputingWidth = 0;
            for (var i = 0; i <= this.k; i++){
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
        this.resetPoints();
        this.shouldReset = 1;
        this.updateSwitches();
        this.counter = 0;
        this.shouldReset = 0;
        this.needsAnimationFrame = true;
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
            this.shouldReset = 1;
        }

    }

    step() {
        if (this.counter < this.k) {
            this.addTerm();
            this.updateSwitches();
            this.needsAnimationFrame = true;
        } else {
            this.draw();
            this.needsAnimationFrame = false;
        }
    }
}
class SubseriesPlotter extends TrackerCanvas {
    constructor(props) {
        super(props);
        this.state = {
            z: props.z,
            f: props.f
        };
        this.logic = null;
        this.glDrawLoop = this.glDrawLoop.bind(this);
        this.coeffs = [];
        this.k = props.k;
        this.postDrawCallback = this.postDrawCallback.bind(this);
    }

    componentDidMount() {
        this.updateCanvasInfo()
            .initCanvas()
            .mounted = true;
        const canvas = this.canvas;
        canvas.element = ReactDOM.findDOMNode(canvas.ref.current);
        this.logic = new SubseriesPlotterLogic(canvas.element, this.k, this.postDrawCallback);
        this.computeCoeffs(this.state.f);
        this.logic.setupForDrawLoop(this.state.z.re, this.state.z.im, this.coeffs);
        requestAnimationFrame(this.glDrawLoop);
        return this;
    }

    componentDidUpdate() {
        this.computeCoeffs(this.state.f);
        this.logic.setupForDrawLoop(this.state.z.re, this.state.z.im, this.coeffs);
        requestAnimationFrame(this.glDrawLoop);
    }

    updateCanvasInfo() {
        const canvas = this.canvas;
        canvas.element = ReactDOM.findDOMNode(this.canvas.ref.current);
        const computedStyle = window.getComputedStyle(canvas.element);
        canvas.computedWidth = parseFloat(computedStyle.width);
        canvas.computedHeight = parseFloat(computedStyle.height);
        canvas.boundingClientRect = canvas.element.getBoundingClientRect();
        return this;
    }
    glDrawLoop() {
        const logic = this.logic;
        while (logic.needsAnimationFrame) {
            logic.step();
        }
    }

    computeCoeffs(fString) {
        if (this.fString != fString) {
            this.fString = fString;
            this.coeffs = getCoeffs(this.fString, this.k);
        }
    }

    plot(fString, re, im) {
        this.computeCoeffs(fString);
        this.logic.setupForDrawLoop(re, im, this.coeffs);
        requestAnimationFrame(this.glDrawLoop);
    }

    postDrawCallback(gl) {
        var pixel = new Uint8Array(4);
        gl.readPixels(this.rawMouse.x, gl.drawingBufferHeight-this.rawMouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        console.log(pixel);
    }

    redraw() {
        this.logic.draw();
    }

    render() {
        return (
                <canvas
            ref={this.canvas.ref}
            width={this.props.canvasDimensions.width}
            height={this.props.canvasDimensions.height}
            ></canvas>
        );
    }
}

export default SubseriesPlotter;
