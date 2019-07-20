class RasGL2DRenderProgram extends RasGL2DProgram {
    constructor(name,
                vertexShader,
                fragmentShader,
                readTextures,
                vertexBuffer,
                uniforms,
                size,
                context) {
        super(name,
              vertexShader,
              fragmentShader,
              readTextures,
              uniforms,
              vertexBuffer,
              context);
        this.size = size;
        this.count = vertexBuffer.size;
    }

    run() {
        const ctx = this.context;
        const program = this.program;

        // Tell WebGL to use this program program.
        ctx.useProgram(program);

        // Bind the default framebuffer to render to the screen.
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);

        // Render into a viewport with a size of size.
        ctx.viewport(0, 0, this.size[0], this.size[1]);

        // Bind the buffer that contains the indexes of all of the points we will render.
        this.buffer.bind(program);

        // Bind read only data textures.
        for (var i=0; i < this.readTextures.length; i++) {
            const texture = this.readTextures[i];
            texture.bind(i+1);
        }

        // Send uniform data to GPU.
        for (var i = 0; i < this.uniforms.length; i++) {
            const uniform = this.uniforms[i];
            uniform.setupForProgram(program);
        }

        // Render to the screen.
        ctx.clear(ctx.COLOR_BUFFER_BIT);
        ctx.enable(ctx.BLEND);
        ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);
        ctx.drawArrays(ctx.POINTS, 0, 20000);
        ctx.disable(ctx.BLEND);
    }
}
