class RasGL2DComputeProgram extends RasGL2DProgram {
    constructor(name,
                vertexShader,
                fragmentShader,
                readTextures,
                readwriteTexture,
                uniforms,
                framebuffer,
                vertexBuffer,
                context) {
        super(name,
              vertexShader,
              fragmentShader,
              readTextures,
              uniforms,
              vertexBuffer,
              context);
        this.framebuffer = framebuffer;
        this.readWriteTexture = readwriteTexture;
        this.args = {};
    }

    run() {
        const ctx = this.context;
        const program = this.program;

        // Tell WebGL to use the updateSwitches program.
        ctx.useProgram(program);

        // Bind the framebuffer for offscreen rendering into a texture.
        this.framebuffer.bind();

        this.buffer.bind(program);

        // Bind read write textures.
        if (this.readWriteTexture){
            this.readWriteTexture.bind(0);
        }
        // Bind read only textures.
        for (var i=0; i < this.readTextures.length; i++) {
            const texture = this.readTextures[i];
            texture.bind(i+1);
        }

        // Send uniform data to GPU.
        for (var i = 0; i < this.uniforms.length; i++) {
            const uniform = this.uniforms[i];
            uniform.setupForProgram(this.program);
        }

        // Render updates to texture offscreen.
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);

        // Swap textures so we read from the newly updated texture next time.
        this.framebuffer.texture.swap();
    }
}
