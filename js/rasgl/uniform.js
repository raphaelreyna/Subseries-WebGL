class Uniform {
    constructor(name, type, defaultValue, context) {
        this.name = name;
        this.type = type;
        this.defaultValue = defaultValue;
        this.value = null;
        this.context = context;
    }

    setupForProgram(program, value) {
        const ctx = this.context;
        const location = ctx.getUniformLocation(program, this.name);
        const data = value ? value : this.defaultValue;
        switch (this.type) {
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
