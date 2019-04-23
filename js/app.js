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
            data.switches[i+3] = digits[3];

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
        this.gl = initGL(canvas);
        const gl = this.gl;
        checkIfOK(gl);

        // Initialize the data to send to the GPU.
        const initData = createInitialData(this.stateSize, 3.6, [-0.640625,-0.3125]);

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
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers.switches);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,
                                gl.COLOR_ATTACHMENT0,
                                gl.TEXTURE_2D,
                                t.switches1,
                                0);

        // Bind the buffer that contains the corners of the square we are drawing our texture onto.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.updateQuad);

        // Bind switches0 and masterSwitches textures.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, t.switches0);
        gl.activeTexture(gl.TEXTURE0+1);
        gl.bindTexture(gl.TEXTURE_2D, t.switchesMaster);

        // Render into a viewport with a size of stateSize.
        gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);

        // Send attribute and uniform data to GPU.
        setupAttributePointer(gl, program, 'quad', 2);
        setupUniform(gl, program, 'state', 'li', 0);
        setupUniform(gl, program, 'master', 'li',1);
        setupUniform(gl, program, 'reset', 'li', this.shouldReset);

        // Render updates to texture offscreen.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Swap switches textures.
        // New becomes old.
        var tmp = t.switches1;
        t.switches1 = t.switches0;
        t.switches0 = tmp;

        // Setup reset for next time.
        if (this.shouldReset === 1) {
            this.shouldReset = 0;
        }
        this.counter++;
        if (this.counter % 2**this.k === 0) {
            this.shouldReset = 1
        }
    }

    addTerm(term) {
        const gl = this.gl;
        const program = this.programs.updatePoints;
        const t = this.textures;

        // Tell WebGL to use the updateSwitches program.
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

        // Bind textures for points and switches.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, t.points0);
        gl.activeTexture(gl.TEXTURE0+1);
        gl.bindTexture(gl.TEXTURE_2D, t.switches0);

        // Render into a viewport with a size of stateSize.
        gl.viewport(0, 0, this.stateSize[0], this.stateSize[1]);

        // Send uniform and attribute data to the GPU.
        setupAttributePointer(gl, program, 'quad', 2, 0, 0);
        setupUniform(gl, program, 'points', 'li', 0);
        setupUniform(gl, program, 'switches', 'li', 1);
        setupUniform(gl, program, 'windowsize', '1f', this.width);
        setupUniform(gl, program, 'newTerm', '2fv', term);
        setupUniform(gl, program, 'offset', '2fv', this.offset);

        // Render updates to texture offscreen.
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Swap switches textures.
        // New becomes old.
        var tmp = t.points1;
        t.points1 = t.points0;
        t.points0 = tmp;
    }

    draw(translation) {
        const gl = this.gl;
        const program = this.programs.draw;
        const t = this.textures;

        // Tell WebGL to use the updateSwitches program.
        gl.useProgram(program);

        // Bind the default framebuffer for rendering to the display.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Bind the buffer that contains the indexes for the points.
        // One index pair per point/subseries.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.indexes);

        // Bind texture containing point data.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, t.points0);

        // Render into a viewport the size of the canvas.
        gl.viewport(0, 0, this.viewSize[0], this.viewSize[1]);

        // Send uniform and attribute data to the GPU.
        setupAttributePointer(gl, program, 'index', 2, 0, 0);
        setupUniform(gl, program, 'points', '1i', 0);
        setupUniform(gl, program, 'statesize', '2fv', this.stateSize);
        setupUniform(gl, program, 'windowsize', '1f', this.width);
        setupUniform(gl, program, 'offset', '2fv', this.offset);
        setupUniform(gl, program, 'translation', '2fv', translation);

        // Render to the screen.
        gl.drawArrays(gl.POINTS, 0, 2**this.k);
    }

    setupForDrawLoop(fString, real, imag) {
        if (this.fString != fString) {
            this.fString = fString;
            this.coeffs = getCoeffs(this.fString, this.k);
        }
        this.powers = getPowers(real, imag, this.k);
        this.terms = [];
        for (var i = 0; i < this.k; i++){
            const c = this.coeffs[i];
            const zn = this.powers[i];
            const term = scalarComplexMult(c, zn);
            this.terms.push(term)
        }

        var translation = {re:0, im:0};
        var realMin = this.terms[0].re;
        var imagMin = this.terms[0].im;
        var realMax = this.terms[0].re;
        var imagMax = this.terms[0].im;
        for (var i = 0; i < 12; i++){
            const t = this.terms[i];
            if (t.re < realMin) {
                realMin = t.re;
            }
            if (t.im < imagMin) {
                imagMin = t.im;
            }
            if (t.re > realMax) {
                realMax = t.re;
            }
            if (t.im > imagMax) {
                imagMax = t.im;
            }
            translation = complexAdd(translation, t);
        }
        translation = scalarComplexMult(-0.5, translation);
        this.translation = [translation.re, translation.im];
        this.offset = [realMin, imagMin];
        var k = 0;
        var temp = Math.sqrt(real**2+imag**2);
        if (k < temp) {
            k = temp;
        }
        temp = Math.sqrt((this.coeffs[0]-real)**2+imag**2);
        if (k < temp) {
            k = temp;
        }
        temp = Math.sqrt(((this.coeffs[1]-1)**2)*(real**2+imag**2));
        if (k < temp) {
            k = temp;
        }
        temp = Math.sqrt((this.coeffs[0]+(this.coeffs[1]-1)*real)**2+((this.coeffs[1]-1)*imag)**2);
        if (k < temp) {
            k = temp;
        }

        var seriesForComputingWidth = 0;
        for (var i = 2; i < 12; i++){
            seriesForComputingWidth += Math.abs(this.coeffs[i])*(Math.sqrt(real**2+imag**2))**i;
        }
        this.width = k+seriesForComputingWidth;
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

        // Swap switches textures.
        // New becomes old.
        var tmp = t.points1;
        t.points1 = t.points0;
        t.points0 = tmp;
    }
}
