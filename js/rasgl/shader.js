class Shader {
    constructor(name, type, sourcePath, context) {
        this.name = name;
        this.type = type;
        this.sourcePath = sourcePath;
        this.context = context;
        this.shader = null;
        this.build();
    }

    build() {
        const ctx = this.context;
        const source = fetch(this.sourcePath);
        switch (this.type) {
        case 'vertex':
            this.shader = ctx.createShader(ctx.VERTEX_SHADER);
            break;
        case 'fragment':
            this.shader = ctx.createShader(ctx.FRAGMENT_SHADER);
        }
        ctx.shaderSource(this.shader, source);
        ctx.compileShader(this.shader);

        if (!ctx.getShaderParameter(this.shader, ctx.COMPILE_STATUS)) {
            var msg = "Error compiling shader name: "+this.name+"\n";
            msg += ctx.getShaderInfoLog(this.shader);
            throw new Error(msg);
        }
    }
}
