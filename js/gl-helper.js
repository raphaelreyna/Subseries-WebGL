function initGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
		    console.log('WebGL not supported, falling back on experimental-webgl');
		    gl = canvas.getContext('experimental-webgl');
	  }

	  if (!gl) {
		    alert('Your browser does not support WebGL');
	  }

	  gl.clearColor(0.1, 0.1, 0.1, 1.0);
	  gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    return gl;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling shader!', gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
	  gl.attachShader(program, vertexShader);
	  gl.attachShader(program, fragmentShader);
	  gl.linkProgram(program);
	  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		    console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		    return;
	  }
	  gl.validateProgram(program);
	  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		    console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		    return;
    }
    return program;
}

function initArrayBuffer(gl, data) {
    var buffer = gl.createBuffer();
	  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

function initElementArrayBuffer(gl, data) {
    var buffer = gl.createBuffer();
	  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
	  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return buffer;
}

function setupAttributePointer(gl,
                              program,
                              name,
                              elementsPerAttribute,
                              size,
                              offset
                             ) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,
                           elementsPerAttribute,
                           gl.FLOAT,
                           gl.FALSE,
                           size * Float32Array.BYTES_PER_ELEMENT,
                           offset * Float32Array.BYTES_PER_ELEMENT
                          );
    return location;
}

function setupTextureFromImage(gl, imageID) {
    var texture = gl.createTexture();
	  gl.bindTexture(gl.TEXTURE_2D, texture);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	  gl.texImage2D(
		    gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		    gl.UNSIGNED_BYTE,
		    document.getElementById(imageID)
	  );
	  gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function loadMatrixUniform(gl, program, name, matrixData) {
    var location = gl.getUniformLocation(program, name);
    gl.uniformMatrix4fv(location, gl.FALSE, matrixData);
    return location;
}

function makeEmptyTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texImage2D(
		//     gl.TEXTURE_2D, // Target
    //     0, // Level
    //     gl.RGBA, // Internal format
    //     width, // Width
    //     height, // Height
    //     0, // Border
    //     gl.RGBA, //Format
		//     gl.UNSIGNED_BYTE, // Type
		//     null // Data
	  // );
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function randomizeTexture(gl, texture, size) {
    const area = size[0]*size[1];
    const rgbaData = new Uint8Array(area*4);
    for (var i = 0; i < area; i++) {
        const ii = i*4;
        rgbaData[ii + 0] = rgbaData[ii + 1] = rgbaData[ii + 2] = Math.random() < 0.5 ? 255 : 0;
        rgbaData[ii + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size[0], size[1], gl.RGBA, gl.UNSIGNED_BYTE, rgbaData);
}

function initFrameBuffer(gl, texture) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, // Target
                            gl.COLOR_ATTACHMENT0, // Attachment
                            gl.TEXTURE_2D, // Texture Target
                            texture, // Texture
                            0 // Level
                           );
    return framebuffer;
}

function squareBuffer(gl) {
    const data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    return initArrayBuffer(gl, data);
}
