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
                                'Subseries-WebGL/glsl/draw.vert',
                                'Subseries-WebGL/glsl/draw.frag'),
            updateSwitches: createProgram(gl,
                                          'Subseries-WebGL/glsl/update.vert',
                                          'Subseries-WebGL/glsl/updateSwitches.frag'),
            updatePoints: createProgram(gl,
                                        'Subseries-WebGL/glsl/update.vert',
                                        'Subseries-WebGL/glsl/updatePoints.frag'),
            resetPoints: createProgram(gl,
                                       'Subseries-WebGL/glsl/update.vert',
                                       'Subseries-WebGL/glsl/resetPoints.glsl')};

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

    setupForDrawLoop(fString, real, imag) {
        // Check if function has changed.
        // If so, we need to recompute the coefficients
        if (this.fString != fString) {
            this.fString = fString;
            this.coeffs = getCoeffs(this.fString, this.k, true);
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
