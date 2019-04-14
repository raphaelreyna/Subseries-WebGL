const BASE = 255;
function encodeSwitch(value) {
    var digits = [];
    var quotient = value;
    for (var i = 0; i < 4; i++) {
        digits[i] = quotient % BASE;
        quotient = Math.floor(quotient / BASE);
    }
    return digits;
}

function encodePoint(re, im, scale, offset) {
    const normalizedRe = scale*re - offset;
    const normalizedIm = scale*im - offset;
    const encodedPoint = [normalizedRe % BASE,
                          Math.floor(normalizedRe / BASE),
                          normalizedIm % BASE,
                          Math.floor(normalizedIm / BASE)];
    return encodedPoint;
}

class App {
    constructor(canvas, k){
        this.k = k;
        this.canvas = canvas;
        this.viewSize = new Float32Array([canvas.width, canvas.height]);
        this.stateSize = new Float32Array([Math.ceil(Math.sqrt(k)), Math.floor(Math.sqrt(k))]);
        this.scale = Math.floor(Math.pow(BASE, 2) / Math.max(canvas.width, canvas.height));
        this.shouldReset = 1;
        this.counter = 0;
        this.timer = null;
        this.lastTick = now();
        this.gl = initGL(canvas);
        if (this.gl == null) {
            alert('Could not initialize WebGL!');
            throw new Error('No WebGL');
        }
        if (this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) === 0) {
            var msg = 'Vertex shader texture access not available.' +
                'Try again on another platform.';
            alert(msg);
            throw new Error(msg);
        }
        const drawVertShader = compileShader(this.gl, this.gl.VERTEX_SHADER, fetch('glsl/draw.vert'));
        const drawFragShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, fetch('glsl/draw.frag'));
        const updateVertShader = compileShader(this.gl, this.gl.VERTEX_SHADER, fetch('glsl/update.vert'));
        const updatePointsFragShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, fetch('glsl/updatePoints.frag'));
        const updateSwitchesFragShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, fetch('glsl/updateSwitches.frag'));
        this.programs = {
            draw: createProgram(this.gl, drawVertShader, drawFragShader),
            updateSwitches: createProgram(this.gl, updateVertShader, updateSwitchesFragShader),
            updatePoints: createProgram(this.gl, updateVertShader, updatePointsFragShader)
        };
        var indexes = [];
        var switches = new Uint8Array(4*this.stateSize[0]*this.stateSize[1]);
        var points = new Uint8Array(4*this.stateSize[0]*this.stateSize[1]);
        const encodedZero = encodePoint(0.0, 0.0, this.scale, 0);
        var switchCode = 0;
        for (var y = 0; y < this.stateSize[1]; y++) {
            for (var x = 0; x < this.stateSize[0]; x++) {
                const j = y*this.stateSize[0]*2+x*2;
                const i = y*this.stateSize[0]*4+x*4;
                indexes[j] = x;
                indexes[j+1] = y;
                const digits = encodeSwitch(switchCode);
                switches[i] = digits[0];
                switches[i+1] = digits[1];
                switches[i+2] = digits[2];
                switches[i+3] = digits[3];
                switchCode++;
                points[i] = encodedZero[0];
                points[i+1] = encodedZero[1];
                points[i+2] = encodedZero[2];
                points[i+3] = encodedZero[3];
            }
        }
        this.buffers = {
            updateQuad: squareBuffer(this.gl),
            indexes: initArrayBuffer(this.gl, indexes)
        };
        this.textures = {
            points0: makeEmptyTexture(this.gl),
            points1: makeEmptyTexture(this.gl),
            switches0: makeEmptyTexture(this.gl),
            switches1: makeEmptyTexture(this.gl),
            switchesMaster: makeEmptyTexture(this.gl)
        };
        this.frameBuffers = {
            points: initFrameBuffer(this.gl, this.textures.points0),
            switches: initFrameBuffer(this.gl, this.textures.switches)
        };
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switchesMaster);
        this.gl.texImage2D(this.gl.TEXTURE_2D,
                           0,
                           this.gl.RGBA,
                           this.stateSize[0],
                           this.stateSize[1],
                           0,
                           this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE,
                           switches);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.points0);
        this.gl.texImage2D(this.gl.TEXTURE_2D,
                           0,
                           this.gl.RGBA,
                           this.stateSize[0],
                           this.stateSize[1],
                           0,
                           this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE,
                           points);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.points1);
        this.gl.texImage2D(this.gl.TEXTURE_2D,
                           0,
                           this.gl.RGBA,
                           this.stateSize[0],
                           this.stateSize[1],
                           0,
                           this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE,
                           null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switches0);
        this.gl.texImage2D(this.gl.TEXTURE_2D,
                           0,
                           this.gl.RGBA,
                           this.stateSize[0],
                           this.stateSize[1],
                           0,
                           this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE,
                           switches);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switches1);
        this.gl.texImage2D(this.gl.TEXTURE_2D,
                           0,
                           this.gl.RGBA,
                           this.stateSize[0],
                           this.stateSize[1],
                           0,
                           this.gl.RGBA,
                           this.gl.UNSIGNED_BYTE,
                           switches);
    }

    step(term) {
        const rightNow = now();
        if (rightNow != this.lastTick) {
            this.lastTick = rightNow;
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffers.points);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,
                                     this.gl.COLOR_ATTACHMENT0,
                                     this.gl.TEXTURE_2D,
                                     this.textures.points1,
                                     0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.points0);
        this.gl.activeTexture(this.gl.TEXTURE0+1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switches0);
        this.gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);
        this.gl.useProgram(this.programs.updatePoints);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.updateQuad);
        setupAttributePointer(this.gl, this.programs.updatePoints, 'quad', 2, 0, 0);
        const pointsUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'points');
        this.gl.uniform1i(pointsUnifLoc, 0);
        const switchesUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'switches');
        this.gl.uniform1i(switchesUnifLoc, 1);
        var stateSizeUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'stateSize');
        this.gl.uniform2fv(stateSizeUnifLoc, Float32Array.from(this.stateSize));
        const winSizeUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'windowSize');
        this.gl.uniform2fv(winSizeUnifLoc, Float32Array.from([1024,1024]));
        const newTermUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'newTerm');
        this.gl.uniform2fv(newTermUnifLoc, term);
        const offsetUnifLoc = this.gl.getUniformLocation(this.programs.updatePoints, 'offset');
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        var tmp = this.textures.points1;
        this.textures.points1 = this.textures.points0;
        this.textures.points0 = tmp;


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffers.switches);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,
                                     this.gl.COLOR_ATTACHMENT0,
                                     this.gl.TEXTURE_2D,
                                     this.textures.switches1,
                                     0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switches0);
        this.gl.activeTexture(this.gl.TEXTURE0+1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.switchesMaster);
        this.gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);
        this.gl.useProgram(this.programs.updateSwitches);
        setupAttributePointer(this.gl, this.programs.updateSwitches, 'quad', 2, 0, 0);
        const stateUnifLoc = this.gl.getUniformLocation(this.programs.updateSwitches, 'state');
        this.gl.uniform1i(stateUnifLoc, 0);
        const mastersUnifLoc = this.gl.getUniformLocation(this.programs.updateSwitches, 'master');
        this.gl.uniform1i(mastersUnifLoc, 1);
        stateSizeUnifLoc = this.gl.getUniformLocation(this.programs.updateSwitches, 'statesize');
        this.gl.uniform2fv(stateSizeUnifLoc, Float32Array.from([32,32]));
        const resetUnifLoc = this.gl.getUniformLocation(this.programs.updateSwitches, 'reset');
        this.gl.uniform1i(resetUnifLoc, this.shoulReset);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        tmp = this.textures.switches1;
        this.textures.switches1 = this.textures.switches0;
        this.textures.switches0 = tmp;

        if (this.shouldReset === 1) {
            this.shouldReset = 0;
        }
        this.counter++;
        if (this.counter % this.k === 0) {
            this.shouldReset = 1
        }
    }

    draw() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.points0);
        this.gl.viewport(0, 0, this.viewSize[0], this.viewSize[1]);
        this.gl.useProgram(this.programs.draw);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.indexes);
        setupAttributePointer(this.gl, this.programs.draw, 'index', 2, 0, 0);
        const pointsUnifLoc = this.gl.getUniformLocation(this.programs.draw, 'points');
        this.gl.uniform1i(pointsUnifLoc, 0);
        const stateSizeUnifLoc = this.gl.getUniformLocation(this.programs.draw, 'statesize');
        this.gl.uniform2fv(stateSizeUnifLoc, Float32Array.from([32,32]));
        const winSizeUnifLoc = this.gl.getUniformLocation(this.programs.draw, 'windowsize');
        this.gl.uniform2fv(winSizeUnifLoc, Float32Array.from([1024,1024]));
        const offsetUnifLoc = this.gl.getUniformLocation(this.programs.draw, 'offset');
        this.gl.uniform2fv(offsetUnifLoc, Float32Array.from([0,0]));

        this.gl.drawArrays(this.gl.POINTS, 0, this.k);
    }
}
