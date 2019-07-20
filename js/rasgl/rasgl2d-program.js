class RasGL2DProgram {
    constructor(context,
                vertexShader,
                fragmentShader,
                constantTextures,
                vertexBuffer) {
        this.context = context;
        this.glProgram = context.createProgram();
        context.attachShader(this.glProgram, vertexShader);
        context.attachShader(this.glProgram, fragmentShader);
        context.linkProgram(this.glProgram);

	      if (!context.getProgramParameter(this.glProgram, context.LINK_STATUS)) {
            var msg = 'ERROR linking program!\n';
            msg += context.getProgramInfoLog(this.glProgram);
            throw new Error(msg);
	      }
	      context.validateProgram(this.glProgram);
	      if (!context.getProgramParameter(this.glProgram, context.VALIDATE_STATUS)) {
            var msg = 'ERROR linking program!\n';
            msg += context.getProgramInfoLog(this.glProgram);
            throw new Error(msg);
        }
        this.constantTextures = constantTextures;
        this.buffer = vertexBuffer;
        this.arguments = null;
    }

    addArgument(name, type, defaultValue) {
        if (this.arguments[name] == null) {
            const argument = {
                name: name,
                type: type,
                default: defaultValue
            };
            this.arguments[name] = argument;
        } else {
            throw new Error("ERROR added the same argument twice!");
        }
    }

    setupUniform(name, type, data) {
        const ctx = this.context;
        const location = ctx.getUniformLocation(this.glProgram, name);
        switch (type) {
        case '1i':
            ctx.uniform1i(location, data);
            break;
        case '1f':
            ctx.uniform1f(location, data);
            break;
        case '2f':
            const packedData = Float32Array.from(data);
            ctx.uniform2fv(location, packedData);
            break;
        }
    }
}
