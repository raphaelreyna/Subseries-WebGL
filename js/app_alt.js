// Initialize indexes as [x0,y0,x1,y1,x2,y2,...].
// Initialize all points as 0+0i, encoded.
// Initialize switches as [a0,b0,c0,d0,a1,b1,c1,d2,...],
// where a,b,c,d are the 4 base 256 digits of the encoded switch integer.
function createInitialData(stateSize, windowSize, offset) {
    const size = 4*stateSize.width*stateSize.height;
    var data = {
        switches: new Uint8Array(size),
        points: new Uint8Array(size),
    };
    const encodedZero = encodePoint(0.0, 0.0, BASE*BASE/windowSize, offset);
    var switchCode = 0;
    for (var y = 0; y < stateSize.height; y++) {
        for (var x = 0; x < stateSize.width; x++) {
            const j = y*stateSize.width*2+x*2;
            const i = y*stateSize.width*4+x*4;
            const digits = encodeSwitch(switchCode);
            switchCode += 1;

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

class Applet {
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
        this.stateSize = {width: Math.ceil(Math.sqrt(2**k)),
                          height: Math.floor(Math.sqrt(2**k))};

        // Keep track of the switches and when to reset them.
        this.shouldReset = 0;
        this.counter = 0;
        this.rasgl = new RasGL2D(this.canvas, 2**k);
        const r = this.rasgl;
        const initData = createInitialData(this.stateSize, 2.3, [-0.640625, -0.3125]);

        r.newVertexShader('drawVShader', '../glsl/draw.vert');
        r.newVertexShader('computeVShader', '../glsl/update.vert');

        r.newFragmentShader('resetSwitchesFShader', '../glsl/resetSwitches.frag');
        r.newFragmentShader('updateSwitchesFShader','../glsl/updateSwitches.frag');
        r.newFragmentShader('updatePointsFShader', '../glsl/updatePoints.frag');
        r.newFragmentShader('resetPointsFShader', '../glsl/resetPoints.frag');
        r.newFragmentShader('drawFShader', '../glsl/draw.frag');

        r.newReadWriteTexture('points', initData.points, this.stateSize);
        r.newReadWriteTexture('switches', initData.switches, this.stateSize);

        r.newReadTexture('master', initData.switches, this.stateSize);

        r.newFramebuffer('pointsFramebuffer', 'points');
        r.newFramebuffer('switchesFramebuffer', 'switches');

        r.newUniform('switches', '1i', 0);
        r.newUniform('master', '1i', 1);
        r.newUniform('points', '1i', 1);
        r.newUniform('windowsize', '1f', 2.3);
        r.newUniform('newTerm', '2f', [0,0]);
        r.newUniform('offset', '2f', [-0.640625,-0.3125]);
        r.newUniform('lw', '1i', 0);
        r.newUniform('statesize', '2f', [this.stateSize.width,this.stateSize.height]);
        r.newUniform('translation', '2f', [0.5, 0.5]);

        r.newComputeProgram('resetSwitches',
                            'computeVShader',
                            'resetSwitchesFShader',
                            'switches',
                            ['master'],
                            ['switches','master'],
                            'switchesFramebuffer');
        r.newComputeProgram('updateSwitches',
                            'computeVShader',
                            'updateSwitchesFShader',
                            'switches',
                            [],
                            ['switches'],
                            'switchesFramebuffer');
        r.newComputeProgram('resetPoints',
                            'computeVShader',
                            'resetPointsFShader',
                            null,
                            [],
                            ['offset', 'windowsize'],
                            'pointsFramebuffer');
        r.newComputeProgram('updatePoints',
                            'computeVShader',
                            'updatePointsFShader',
                            'points',
                            ['switches'],
                            ['points','switches','newTerm', 'offset','windowsize', 'lw'],
                            'pointsFramebuffer');
        r.newRenderProgram('draw',
                           'drawVShader',
                           'drawFShader',
                           ['switches', 'points'],
                           ['switches', 'points', 'statesize', 'offset', 'translation', 'windowsize'],
                           this.viewSize);
        this.counter = 0;
    }

    updateSwitches() {
        if (this.counter % this.k == 0) {
            this.rasgl.programs['resetSwitches'].run();
        } else {
            this.rasgl.programs['updateSwitches'].run();
        }
        this.counter += 1;
    }

    addTerm(term) {
        console.log(term);
        const r = this.rasgl;
        r.uniforms['newTerm'].value = Float32Array.from(term);
        r.uniforms['points'].value = 0;
        r.uniforms['switches'].value = 1;
        r.programs['updatePoints'].run();
        r.uniforms['points'].value = null
        r.uniforms['switches'].value = null;
        r.uniforms['newTerm'].value = null;
    }

    draw() {
        const r = this.rasgl;
        r.programs['draw'].run();
    }

    setupForDrawLoop(fString, real, imag) {
        // Check if function has changed.
        // If so, we need to recompute the coefficients
        if (this.fString != fString) {
            this.fString = fString;
            this.coeffs = getCoeffs(this.fString, this.k);
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
            this.updateSwitches();
            this.counter = 0;
        }
    }

    resetPoints(){
        const r = this.rasgl;
        r.programs['resetPoints'].run();
    }
}
