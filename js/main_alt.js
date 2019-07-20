const winHeight = window.innerHeight;
const winWidth = window.innerWidth;
const winDiameter = Math.max(winHeight, winWidth);
const glCanvas = document.getElementById('glCanvas');
glCanvas.height = 0.75*winDiameter;
glCanvas.width = 0.75*winDiameter;
const planeCanvas = document.getElementById('cPlane');
const left = document.getElementById('left');
const planeSize = window.getComputedStyle(left).width;
const nplaneSize = parseFloat(planeSize);
const center = nplaneSize / 2;
const ctx = planeCanvas.getContext('2d');
var mouseX = transformPointInverse(0.5);
var mouseY = transformPointInverse(-0.5);
var r = 0.7071;
var theta = 0.7853;
var real = 0.5;
var imag = 0.5;
var tracking = false;
const imInput = document.getElementById('imag');
const reInput = document.getElementById('real');
const rInput = document.getElementById('r');
const thetaInput = document.getElementById('theta');
const fxn = document.getElementById("fxn");
const planeRect = planeCanvas.getBoundingClientRect();
var rotating = false;
var lw = false;
const lwButton = document.getElementById("lwButton");
var success = true;
var app = null;
try {
    app = new Applet(glCanvas, 17);
} catch(err) {
    glCanvas.innerHTML = err.message;
    alert(err.message);
    success = false;
}

function updateReal() {
    real = parseFloat(reInput.value);
    r = Math.sqrt(real*real+imag*imag);
    rInput.value = r;
    theta = Math.atan2(imag, real);
    if (theta < 0) {
        theta = theta+2*Math.PI;
    }
    thetaInput.value = theta;
    mouseX = transformPointInverse(real);
}

function updateImag() {
    imag = parseFloat(imInput.value);
    r = Math.sqrt(real*real+imag*imag);
    rInput.value = r;
    theta = Math.atan2(imag, real);
    if (theta < 0) {
        theta = theta+2*Math.PI;
     }
    thetaInput.value = theta;
    mouseY = transformPointInverse(-imag);
}

function updateMagnitude(){
    r = parseFloat(rInput.value);
    real = r*Math.cos(theta);
    reInput.value = real;
    imag = r*Math.sin(theta);
    imInput.value = imag;
    mouseX = transformPointInverse(real);
    mouseY = transformPointInverse(-imag);
}

function updateTheta() {
    theta = parseFloat(thetaInput.value);
    real = r*Math.cos(theta);
    reInput.value = real;
    imag = r*Math.sin(theta);
    imInput.value = imag;
    mouseX = transformPointInverse(real);
    mouseY = transformPointInverse(-imag);
}

function gldrawloop() {
    if (app.counter < app.k) {
        const t = app.terms[app.counter];
        app.addTerm([t.re, t.im]);
        app.updateSwitches();
        requestAnimationFrame(gldrawloop);
    } else {
        app.draw();
    }
}

function run() {
    const fString = fxn.value;
    app.setupForDrawLoop(fString, real, imag);
    requestAnimationFrame(gldrawloop);
}




