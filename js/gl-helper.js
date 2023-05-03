function initGL(canvas, clearColor) {
    var gl = canvas.getContext('webgl');
    if (!gl) {
		    gl = canvas.getContext('experimental-webgl');
	  }

	  if (!gl) {
        throw new Error('WebGL not supported');
	  }

	  gl.clearColor(clearColor[0],
                  clearColor[1],
                  clearColor[2],
                  clearColor[3]);
	  gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    return gl;
}

function checkIfOK(gl) {
    if (gl == null) {
        throw new Error('No WebGL');
    }
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) === 0) {
        var msg = 'Vertex shader texture access not available.' +
            'Try again on another platform.';
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

function createProgram(gl, vertexShader, fragmentShader) {
    console.log('compiling vertex shader', vertexShader);
    const vShader = compileShader(gl,
                                  gl.VERTEX_SHADER,
                                  vertexShader);
    console.log('compiling fragment shader', fragmentShader);
    const fShader = compileShader(gl,
                                  gl.FRAGMENT_SHADER,
                                  fragmentShader);
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

function bindTexture(gl, location, texture) {
    gl.activeTexture(gl.TEXTURE0 + location);
    gl.bindTexture(gl.TEXTURE_2D, texture);
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

function useFramebufferWithTex(gl, framebuffer, texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,
                            gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D,
                            texture,
                            0);
}

function useDefaultFramebuffer(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function squareBuffer(gl) {
    const data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    return initArrayBuffer(gl, data);
}

function drawPointsWithBlending(gl, count) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, count-2);
    gl.disable(gl.BLEND);
}
