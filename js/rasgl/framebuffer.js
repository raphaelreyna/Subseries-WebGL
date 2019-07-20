class Framebuffer {
    constructor(name, texture, context) {
        this.name = name;
        this.texture = texture;
        this.size = texture.size;
        this.context = context;
        this.framebuffer = context.createFramebuffer();
    }

    bind() {
        const ctx = this.context;
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.framebuffer);
        ctx.framebufferTexture2D(ctx.FRAMEBUFFER,
                                 ctx.COLOR_ATTACHMENT0,
                                 ctx.TEXTURE_2D,
                                 this.texture.write,
                                 0);
        ctx.viewport(0, 0, this.size.width, this.size.height);
    }
}
