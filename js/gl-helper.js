function initGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
		    console.log('WebGL not supported, falling back on experimental-webgl');
		    gl = canvas.getContext('experimental-webgl');
	  }

	  if (!gl) {
		    alert('Your browser does not support WebGL');
	  }

	  gl.clearColor(0.0, 0.0, 0.0, 1.0);
	  gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    return gl;
}

function checkIfOK(gl) {
    if (gl == null) {
        alert('Could not initialize WebGL!');
        throw new Error('No WebGL');
    }
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) === 0) {
        var msg = 'Vertex shader texture access not available.' +
            'Try again on another platform.';
        alert(msg);
        throw new Error(msg);
    }
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

function createProgram(gl, vertexShaderPath, fragmentShaderPath) {
    const vShader = compileShader(gl,
                                  gl.VERTEX_SHADER,
                                  fetch(vertexShaderPath));
    const fShader = compileShader(gl,
                                  gl.FRAGMENT_SHADER,
                                  fetch(fragmentShaderPath));
    var program = gl.createProgram();
	  gl.attachShader(program, vShader);
	  gl.attachShader(program, fShader);
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
                           size?size * Float32Array.BYTES_PER_ELEMENT:0,
                           offset?offset * Float32Array.BYTES_PER_ELEMENT:0
                          );
    return location;
}

function setupUniform(gl,
                      program,
                      name,
                      type,
                      data) {
    const location = gl.getUniformLocation(program, name);
    switch (type) {
    case 'li':
        gl.uniform1i(location, data);
        break;
    case '1f':
        gl.uniform1f(location, data);
        break;
    case '2fv':
        const packedData = Float32Array.from(data);
        gl.uniform2fv(location, packedData);
        break;
    }
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

function makeTexture(gl, size, data) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
		    gl.TEXTURE_2D, // Target
        0, // Level
        gl.RGBA, // Internal format
        size[0], // Width
        size[1], // Height
        0, // Border
        gl.RGBA, //Format
		    gl.UNSIGNED_BYTE, // Type
		    data // Data
	  );
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function makeRandomTexture(gl, size) {
    const area = size[0]*size[1];
    const randomData = new Uint8Array(area*4);
    for (var i = 0; i < area; i++) {
        const ii = i*4;
        randomData[ii + 0] =  Math.random() < 0.5 ? 255 : 0;
        randomData[ii + 1] =  Math.random() < 0.5 ? 255 : 0;
        randomData[ii + 2] =  Math.random() < 0.5 ? 255 : 0;
        randomData[ii + 3] =  Math.random() < 0.5 ? 255 : 0;
    }
    return makeTexture(gl, size, rgbaData);
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
