class ReadTexture {
    constructor(name, size, data, context) {
        this.context = context;
        this.size = size;
        this.name = name;
        this.read = this.createTexture(size, data);
    }

    createTexture(size, data) {
        const ctx = this.context;
        const texture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
	      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
	      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
	      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
        ctx.texImage2D(
		        ctx.TEXTURE_2D, // Target
            0, // Level
            ctx.RGBA, // Internal format
            size.width, // Width
            size.height, // Height
            0, // Border
            ctx.RGBA, //Format
		        ctx.UNSIGNED_BYTE, // Type
		        data // Data
	      );
        ctx.bindTexture(ctx.TEXTURE_2D, null);
        return texture;
    }

    bind(location) {
        const ctx = this.context;
        ctx.activeTexture(ctx.TEXTURE0+location);
        ctx.bindTexture(ctx.TEXTURE_2D, this.read);
    }
}

class ReadWriteTexture extends ReadTexture {
    constructor(name, size, data, context) {
        super(name, size, data, context);
        this.write = this.createTexture(size, data);
    }

    swap() {
        const temp = this.write;
        this.write = this.read;
        this.read = temp;
    }
}
