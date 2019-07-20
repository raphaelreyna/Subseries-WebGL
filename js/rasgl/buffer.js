class Buffer {
    constructor(name, data, context) {
        this.name = name;
        this.context = context;
        this.size = data.length;
        this.buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, this.buffer);
        context.bufferData(context.ARRAY_BUFFER,
                           new Float32Array(data),
                           context.STATIC_DRAW);
        context.bindBuffer(context.ARRAY_BUFFER, null);
    }

    bind(program) {
        this.context.bindBuffer(this.context.ARRAY_BUFFER,
                                this.buffer);
        const location = this.context.getAttribLocation(program, this.name);
        this.context.enableVertexAttribArray(location);
        this.context.vertexAttribPointer(location,
                                         2,
                                         this.context.FLOAT,
                                         this.context.FALSE,
                                         0,
                                         0);
    }
}
