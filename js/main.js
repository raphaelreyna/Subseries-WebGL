import React from 'react';
import {render} from 'react-dom';
import {TrackerCartesianPlane, intervalFromLenCen} from '@rreyna/react-tracker-canvas';

const winHeight = window.innerHeight;
const winWidth = window.innerWidth;
const winDiameter = Math.max(winHeight, winWidth);
const winmin = Math.min(winHeight, winWidth);
const glCanvas = document.getElementById('glCanvas');
glCanvas.height = winmin;
glCanvas.width = winmin;
const left = document.getElementById('left');
const planeSize = window.getComputedStyle(left).width;
const nplaneSize = parseFloat(planeSize);
const center = nplaneSize / 2;
var r = 0.7071;
var theta = 0.7853;
var real = 0.5;
var imag = 0.5;
var tracking = false;
const imInput = document.getElementById('imag');
const reInput = document.getElementById('real');
const rInput = document.getElementById('r');
const thetaInput = document.getElementById('theta');
const cXInput = document.getElementById('centerX');
const cYInput = document.getElementById('centerY');
const widthInput = document.getElementById('width');
const fxn = document.getElementById("fxn");
var rotating = false;
var lw = false;
const lwButton = document.getElementById("lwButton");
var success = true;
var app = null;
var f = "1/(1-x)";
document.getElementById('rotButton').addEventListener("click", toggleRotation);
cXInput.addEventListener("keyup", updateBounds);
cYInput.addEventListener("keyup", updateBounds);
widthInput.addEventListener("keyup", updateBounds);
reInput.addEventListener("keyup", updateReal);
imInput.addEventListener("keyup", updateImag);
rInput.addEventListener("keyup", updateMagnitude);
thetaInput.addEventListener("keyup", updateTheta);
fxn.addEventListener("keyup", updateFxn);
lwButton.addEventListener("click", toggleLW);


var tracker = React.createRef();

try {
    app = new App(glCanvas, 17);
} catch(err) {
    glCanvas.innerHTML = err.message;
    alert(err.message);
    success = false;
}

function toggleRotation() {
    rotating = !rotating;
    if (rotating) {
        rotationLoop();
    }
}

function updateFxn(event) {
    if (event.keyCode === 13) {
        f = fxn.value;
        run();
    }
}

function updateReal(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        real = parseFloat(reInput.value);
        r = Math.sqrt(real*real+imag*imag);
        rInput.value = r;
        theta = Math.atan2(imag, real);
        if (theta < 0) {
            theta = theta+2*Math.PI;
        }
        thetaInput.value = theta;
        tracker.current.setState(
            {
                mouse: {
                    x: real, y: imag
                }
            });
    }
}

function updateImag(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        imag = parseFloat(imInput.value);
        r = Math.sqrt(real*real+imag*imag);
        rInput.value = r;
        theta = Math.atan2(imag, real);
        if (theta < 0) {
            theta = theta+2*Math.PI;
        }
        thetaInput.value = theta;
        tracker.current.setState(
            {
                mouse: {
                    x: real, y: imag
                }
            });
    }
}

function updateMagnitude(event){
    if (event.keyCode === 13) {
        event.preventDefault();
        r = parseFloat(rInput.value);
        real = r*Math.cos(theta);
        reInput.value = real;
        imag = r*Math.sin(theta);
        imInput.value = imag;
        tracker.current.setState(
            {
                mouse: {
                    x: real, y: imag
                }
            });
    }
}

function updateTheta(event) {
    if (event.keyCode === 13) {
        theta = parseFloat(thetaInput.value);
        real = r*Math.cos(theta);
        reInput.value = real;
        imag = r*Math.sin(theta);
        imInput.value = imag;
        tracker.current.setState(
            {
                mouse: {
                    x: real, y: imag
                }
            });
    }
}

function updateBounds(event) {
    const cx = parseFloat(cXInput.value);
    const cy = parseFloat(cYInput.value);
    const w = parseFloat(widthInput.value);
    if (event.keyCode === 13) {
        tracker.current.setState({
            bounds: {
                horizontal: intervalFromLenCen(w, cx),
                vertical: intervalFromLenCen(w, cy)
            }
        });
    }
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

function rotationLoop() {
    const currentTheta = parseFloat(thetaInput.value);
    thetaInput.value = currentTheta+0.001;
    updateTheta({keyCode: 13});
    const fString = fxn.value;
    const mouse = {
        x: real, y: imag
    };
    tracker.current.setState({mouse});
    if (rotating){
        window.requestAnimationFrame(rotationLoop);
    }
}

function run() {
    app.setupForDrawLoop(f, real, imag);
    requestAnimationFrame(gldrawloop);
}

function toggleLW() {
    if (app.lw === 0) {
        app.lw = 1;
        lwButton.innerHTML = "Switch to subseries";
    } else {
        app.lw = 0;
        lwButton.innerHTML = "Switch to Littlewood (experimental)";
    }
    if (!rotating){
        run();
    }
}

function handleMouseChanged(data) {
    real = data.x;
    imag = data.y;
    r = data.abs;
    theta = data.arg;

    reInput.value = real;
    imInput.value = imag;
    rInput.value = r;
    thetaInput.value = theta;
    run();
}

if (success) {
    render(<TrackerCartesianPlane
           ref={tracker}
           onMouseMoved={handleMouseChanged}
           width={nplaneSize} height={nplaneSize}
           bounds={{
               horizontal: intervalFromLenCen(2,0),
               vertical: intervalFromLenCen(2,0),
           }}/>, document.querySelector("#picker"));
    run(0.5, 0.5);
}

