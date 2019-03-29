var vertexShaderText = 
[
'precision mediump float;',
'',
'attribute vec3 vertPosition;',
'attribute vec2 vertTexCoord;',
'varying vec2 fragTexCoord;',
'uniform mat4 mWorld;',
'uniform mat4 mView;',
'uniform mat4 mProj;',
'',
'void main()',
'{',
'  fragTexCoord = vertTexCoord;',
'  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);',
'}'
].join('\n');

var fragmentShaderText =
[
'precision mediump float;',
'',
'varying vec2 fragTexCoord;',
'uniform sampler2D sampler;',
'',
'void main()',
'{',
'  gl_FragColor = texture2D(sampler, fragTexCoord);',
'}'
].join('\n');

var main = function () {
	  var canvas = document.getElementById('canvas');
	  var gl = initGL(canvas);
	  var vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderText);
    var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
    const program = createProgram(gl, vertexShader, fragmentShader);


	  var boxVertices = 
	      [ // X, Y, Z           U, V
		        -1.0, 1.0, -1.0,   0, 0,
		        -1.0, 1.0, 1.0,    0, 1,
		        1.0, 1.0, 1.0,     1, 1,
		        1.0, 1.0, -1.0,    1, 0,
	      ];

	  var boxIndices =
	      [
		        0, 1, 2,
		        0, 2, 3,
	      ];

    var boxVertexBufferObject = initArrayBuffer(gl, boxVertices);
    var boxIndexBufferObject = initElementArrayBuffer(gl, boxIndices);

    var positionAttribLocation = setupAttributePointer(gl, program, 'vertPosition',
                                                       3, // Number of elements for attribute
                                                       5, // Number of elements per vertex
                                                       0 // Number of elements to offset by
                                                      );
    var texCoordAttribLocation = setupAttributePointer(gl, program, 'vertTexCoord',
                                                       2, // Number of elements for attribute
                                                       5, // Number of elements per vertex
                                                       3 // Number of elements to offset by
                                                      );

    var boxTexture = setupTextureFromImage(gl, 'crate-image');

	  // Tell OpenGL state machine which program should be active.
	  gl.useProgram(program);

    // Create and load matrix uniforms
    var worldMatrix = new Float32Array(16);
    mat4.identity(worldMatrix);
	  var matWorldUniformLocation = loadMatrixUniform(gl, program, 'mWorld', worldMatrix);

    var viewMatrix = new Float32Array(16);
    mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
	  var matViewUniformLocation = loadMatrixUniform(gl, program, 'mView', viewMatrix);

    var projMatrix = new Float32Array(16);
    mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);
	  var matProjUniformLocation = loadMatrixUniform(gl, program, 'mProj', projMatrix);

    renderLoop(gl,
               worldMatrix,
               viewMatrix,
               projMatrix,
               matWorldUniformLocation,
               boxTexture,
               boxIndices
              );
};

function initGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
		    console.log('WebGL not supported, falling back on experimental-webgl');
		    gl = canvas.getContext('experimental-webgl');
	  }

	  if (!gl) {
		    alert('Your browser does not support WebGL');
	  }

	  gl.clearColor(0.75, 0.85, 0.8, 1.0);
	  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	  gl.enable(gl.DEPTH_TEST);
	  gl.enable(gl.CULL_FACE);
	  gl.frontFace(gl.CCW);
	  gl.cullFace(gl.BACK);

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
    gl.vertexAttribPointer(location,
                           elementsPerAttribute,
                           gl.FLOAT,
                           gl.FALSE,
                           size * Float32Array.BYTES_PER_ELEMENT,
                           offset * Float32Array.BYTES_PER_ELEMENT
                          );
    gl.enableVertexAttribArray(location);
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

function renderLoop(gl,
                    worldMatrix,
                    viewMatrix,
                    projMatrix,
                    matWorldUniformLocation,
                    boxTexture,
                    boxIndices
                   ) {
    var xRotationMatrix = new Float32Array(16);
    var identityMatrix = new Float32Array(16);
	  mat4.identity(identityMatrix);
	  var angle = 3*Math.PI/2;
	  var loop = function () {
		    mat4.rotate(xRotationMatrix, identityMatrix, angle, [1, 0, 0]);
		    mat4.mul(worldMatrix, xRotationMatrix, identityMatrix);
		    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		    gl.clearColor(0.75, 0.85, 0.8, 1.0);
		    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
		    gl.activeTexture(gl.TEXTURE0);

		    gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);

		    //requestAnimationFrame(loop);
	  };
	  requestAnimationFrame(loop);
}
