class RasGL2DProgram {
    constructor(name,
                vertexShader,
                fragmentShader,
                readTextures,
                uniforms,
                vertexBuffer,
                context) {
        this.name = name;
        this.context = context;
        this.readTextures = readTextures;
        this.uniforms = uniforms;
        this.buffer = vertexBuffer;

        this.program = context.createProgram();
        context.attachShader(this.program, vertexShader.shader);
        context.attachShader(this.program, fragmentShader.shader);
        context.linkProgram(this.program);


	      if (!context.getProgramParameter(this.program, context.LINK_STATUS)) {
            var msg = 'ERROR linking program: '+name+'!\n';
            msg += context.getProgramInfoLog(this.program);
            throw new Error(msg);
	      }
	      context.validateProgram(this.program);
	      if (!context.getProgramParameter(this.program, context.VALIDATE_STATUS)) {
            var msg = 'ERROR validating program!\n';
            msg += context.getProgramInfoLog(this.program);
            throw new Error(msg);
        }
    }
}
