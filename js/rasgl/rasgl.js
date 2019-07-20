class RasGL2D {
    constructor(canvas, pointCount) {
        var context = canvas.getContext('webgl');
        if (!context) {
		        context = canvas.getContext('experimental-webgl');
	      }
	      if (!context) {
            throw new Error('WebGL not supported');
	      }
        if (context.getParameter(context.MAX_VERTEX_TEXTURE_IMAGE_UNITS) === 0) {
            var msg = 'Vertex shader texture access not available.' +
                'Try again on another platform.';
            throw new Error(msg);
        }

        context.disable(context.DEPTH_TEST);
        context.clear(context.COLOR_BUFFER_BIT);
        this.context = context;
        this.canvas = canvas;
        this.shaders = {
            vertex: {},
            fragment: {}
        };
        this.framebuffers = {};
        this.pointCount = pointCount;
        this.readTextures = {};
        this.readWriteTextures = {};
        const quadData = new Float32Array([-1,-1,1,-1,-1,1,1,1]);
        this.buffers = {
            quad: new Buffer('quad', quadData, context),
            indexes: this.makeIndexesBuffer(pointCount)
        };
        this.uniforms = {};
        this.programs = {};
        this.jobs = {};
    }

    makeIndexesBuffer(count) {
        const indexes = [];
        const sqrt = Math.sqrt(count);
        for (var y = 0; y < Math.ceil(sqrt); y++) {
            for (var x = 0; x < Math.floor(sqrt); x++) {
                const j = 2*(y*Math.ceil(sqrt)+x);
                indexes[j] = x;
                indexes[j+1] = y;
            }
        }
        this.pointCount = count;
        return new Buffer('index', indexes, this.context);
    }

    newReadTexture(name, data, size) {
        if (this.readTextures[name]) {
            return;
        }
        const texture = new ReadTexture(name, size, data, this.context);
        this.readTextures[name] = texture;
    }

    newReadWriteTexture(name, data, size) {
        if (this.readWriteTextures[name]) {
            return;
        }
        const texture = new ReadWriteTexture(name, size, data, this.context);
        this.readWriteTextures[name] = texture;
    }

    newFramebuffer(name, texture) {
        if (this.framebuffers[name]) {
            return;
        }
        const txt = this.readWriteTextures[texture];
        const framebuffer = new Framebuffer(name, txt, this.context);
        this.framebuffers[name] = framebuffer;
    }

    newVertexShader(name, sourcePath) {
        if (this.shaders.vertex[name]) {
            return;
        }
        const shader = new Shader(name,
                                  'vertex',
                                  sourcePath,
                                  this.context);
        this.shaders.vertex[name] = shader;
    }

    newFragmentShader(name, sourcePath) {
        if (this.shaders.fragment[name]) {
            return;
        }
        const shader = new Shader(name,
                                  'fragment',
                                  sourcePath,
                                  this.context);
        this.shaders.fragment[name] = shader;
    }

    newUniform(name, type, defaultValue) {
        if (this.uniforms[name]) {
            return;
        }
        const uniform = new Uniform(name, type, defaultValue, this.context);
        this.uniforms[name] = uniform;
    }

    newComputeProgram(name,
                      vShaderName,
                      fShaderName,
                      rwTextureName,
                      rTextureNames,
                      uniformNames,
                      framebufferName) {
        if (this.programs[name]) {
            return;
        }
        const ctx =  this.context;
        const vShader = this.shaders.vertex[vShaderName];
        const fShader = this.shaders.fragment[fShaderName];
        var rwTexture = null;
        if (rwTextureName) {
            rwTexture = this.readWriteTextures[rwTextureName];
        }
        var rTextures = [];
        for (var i = 0; i < rTextureNames.length; i++){
            const name = rTextureNames[i];
            const texture = this.readTextures[name];
            if (texture) {
                rTextures.push(texture);
            }
        }
        var uniforms = [];
        for (var i = 0; i < uniformNames.length; i++) {
            const name = uniformNames[i];
            const uniform = this.uniforms[name];
            uniforms.push(uniform);
        }
        const framebuffer = this.framebuffers[framebufferName];

        const program = new RasGL2DComputeProgram(name,
                                                  vShader,
                                                  fShader,
                                                  rTextures,
                                                  rwTexture,
                                                  uniforms,
                                                  framebuffer,
                                                  this.buffers.quad,
                                                  this.context);
        this.programs[name] = program;
    }

    newRenderProgram(name,
                     vShaderName,
                     fShaderName,
                     rTextureNames,
                     uniformNames,
                     size) {
        if (this.programs[name]) {
            return;
        }
        const ctx =  this.context;
        const vShader = this.shaders.vertex[vShaderName];
        const fShader = this.shaders.fragment[fShaderName];
        var rTextures = [];
        for (var i = 0; i < rTextureNames.length; i++){
            const name = rTextureNames[i];
            const texture = this.readWriteTextures[name];
            rTextures.push(texture);
        }
        var uniforms = [];
        for (var i = 0; i < uniformNames.length; i++) {
            const name = uniformNames[i];
            const uniform = this.uniforms[name];
            uniforms.push(uniform);
        }

        this.context.bindFramebuffer(this.context.FRAMEBUFFER, null);
        const program = new RasGL2DRenderProgram(name,
                                                 vShader,
                                                 fShader,
                                                 rTextures,
                                                 this.buffers.indexes,
                                                 uniforms,
                                                 size,
                                                 this.context);
        this.programs[name] = program;
    }

    createJob(name, programNames) {
        const job = [];
        for (var i = 0; i < programNames.length; i++) {
            const name = programNames[i];
            job.push(this.programs[name]);
        }
        this.jobs[name] = job;
    }

    run(jobName) {
        const job = this.jobs[jobName];
        for (var i = 0; i < job.length; i++) {
            const programName = job[i];
            const program = this.programs[programName];
            program.run();
        }
    }
}
