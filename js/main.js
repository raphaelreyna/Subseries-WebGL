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
const kInput = document.getElementById("k");
const rotButton = document.getElementById('rotButton');
const help = document.getElementById('help');
const modal = document.getElementById('modal');
const close = document.getElementById('closeModal');
const pulseIcon = document.getElementById('pulseIcon');
var rotating = false;
var lw = false;
var success = true;
var app = null;
var f = "1/(1-x)";
rotButton.addEventListener("click", toggleRotation);
cXInput.addEventListener("keyup", updateBounds);
cYInput.addEventListener("keyup", updateBounds);
widthInput.addEventListener("keyup", updateBounds);
reInput.addEventListener("keyup", updateReal);
imInput.addEventListener("keyup", updateImag);
rInput.addEventListener("keyup", updateMagnitude);
thetaInput.addEventListener("keyup", updateTheta);
fxn.addEventListener("keyup", updateFxn);
kInput.addEventListener("keyup", updateK);
help.addEventListener("click", toggleModal);
close.addEventListener("click", toggleModal);
var modalHidden = true;

var tracker = React.createRef();

function makeNewPlotter(degree) {
    try {
        app = new App(glCanvas, degree);
    } catch(err) {
        glCanvas.innerHTML = err.message;
        alert(err.message);
        success = false;
    }
}

function toggleModal(event) {
    modalHidden = !modalHidden;
    if (modalHidden) {
        modal.classList.add('hidden');
    } else {
        modal.classList.remove('hidden');
    }
    pulseIcon.classList.remove('pulse');
}

function toggleRotation() {
    rotating = !rotating;
    if (rotating) {
        rotationLoop();
        rotButton.innerHTML = "Stop"
    } else {
        rotButton.innerHTML = "Rotate"
    }
}

function toggleLW() {
    if (app.lw === 0) {
        app.lw = 1;
        lwButton.innerHTML = "Subseries Mode";
    } else {
        app.lw = 0;
        lwButton.innerHTML = "Littlewood (beta)";
    }
    if (!rotating){
        run();
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
        if (window.innerWidth >= 668) {
            tracker.current.setState(
                {
                    mouse: {
                        x: real, y: imag
                    }
                });
        }
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
        if (window.innerWidth >= 668) {
            tracker.current.setState(
                {
                    mouse: {
                        x: real, y: imag
                    }
                });
        }
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
        if (window.innerWidth >= 668) {
            tracker.current.setState(
                {
                    mouse: {
                        x: real, y: imag
                    }
                });
        }
    }
}

function updateTheta(event) {
    if (event.keyCode === 13) {
        theta = parseFloat(thetaInput.value);
        real = r*Math.cos(theta);
        reInput.value = real;
        imag = r*Math.sin(theta);
        imInput.value = imag.toFixed(3);
        if (window.innerWidth >= 668) {
            tracker.current.setState(
                {
                    mouse: {
                        x: real, y: imag
                    }
                });
        } else {
            run();
        }
    }
}

function updateBounds(event) {
    const cx = parseFloat(cXInput.value);
    const cy = parseFloat(cYInput.value);
    const w = parseFloat(widthInput.value);
    if (event.keyCode === 13 && !isNaN(cx) && !isNaN(cy) && !isNaN(w) && window.innerWidth >= 668) {
        tracker.current.setState({
            bounds: {
                horizontal: intervalFromLenCen(w, cx),
                vertical: intervalFromLenCen(w, cy)
            }
        });
    }
}

function updateK(event) {
    if (event.keyCode === 13 && !isNaN(parseFloat(kInput.value))) {
        makeNewPlotter(kInput.value);
        run();
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
    if (rotating){
        window.requestAnimationFrame(rotationLoop);
    }
}

async function run() {
    await app.setupForDrawLoop(f, real, imag);
    requestAnimationFrame(gldrawloop);
}

function handleMouseChanged(data) {
    real = data.x;
    imag = data.y;
    r = data.abs;
    theta = data.arg;

    reInput.value = real.toFixed(4);
    imInput.value = imag.toFixed(4);
    rInput.value = r.toFixed(4);
    thetaInput.value = theta.toFixed(4);
    run();
}

makeNewPlotter(kInput.value);

if (success) {
    render(<TrackerCartesianPlane
           id={"tracker"}
           ref={tracker}
           onMouseMoved={handleMouseChanged}
           width={nplaneSize} height={nplaneSize}
           bounds={{
               horizontal: intervalFromLenCen(3,0),
               vertical: intervalFromLenCen(3,0),
           }}/>, document.querySelector("#picker"));
    run(0.5, 0.5);
}
