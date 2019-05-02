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
const app = new App(glCanvas, 16);
const imInput = document.getElementById('imag');
const reInput = document.getElementById('real');
const rInput = document.getElementById('r');
const thetaInput = document.getElementById('theta');
const fxn = document.getElementById("fxn");
const planeRect = planeCanvas.getBoundingClientRect();
var rotating = false;


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
    reInput.value = real
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
        app.draw(app.translation);
    }
}

function rotationLoop() {
    const currentTheta = parseFloat(thetaInput.value);
    thetaInput.value = currentTheta+0.001;
    updateTheta();
    const fString = fxn.value;
    app.setupForDrawLoop(fString, real, imag);
    for (var i = 0; i < app.k; i++) {
        const t = app.terms[app.counter];
        app.addTerm([t.re, t.im]);
        app.updateSwitches();
    }
    app.draw(app.translation);
    if (rotating){
        window.requestAnimationFrame(rotationLoop);
    }
}

function run() {
    const fString = fxn.value;
    app.setupForDrawLoop(fString, real, imag);
    requestAnimationFrame(gldrawloop);
}

function toggleRotation() {
    rotating = !rotating;
    if (rotating) {
        rotationLoop();
    }
}

function setupPlaneCanvas() {
    planeCanvas.style.width = planeSize;
    planeCanvas.style.height = planeSize;
    planeCanvas.width = nplaneSize;
    planeCanvas.height = nplaneSize;
}

function update() {
    ctx.font = "normal 12px Verdana";
    ctx.fillStyle = "#FF6A6A";
    ctx.clearRect(0, 0, nplaneSize, nplaneSize);
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#191919";
    ctx.arc(center, center, 0.99 * center, 0, 2 * Math.PI, true);
    ctx.fill();
    ctx.closePath();

    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#6a6a6a";
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, nplaneSize);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(nplaneSize, center);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
    //------
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mouseX, center);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = "#FF6A6A";
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(center, mouseY);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = "#FF6A6A";
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    if (mouseX < center) {
        ctx.textAlign = "left";
    } else {
        ctx.textAlign = "right";
    }
    ctx.fillText("Re(x)", mouseX, center);
    if (mouseY < center) {
        ctx.textBaseline = "top";
    } else {
        ctx.textBaseline = "ideographic";
    }
    ctx.fillText("Im(x)", center, mouseY);

    ctx.beginPath();
    ctx.arc(center, center, 20, 0, (-1) * theta, true);
    ctx.strokeStyle = "#FF6A6A";
    ctx.stroke();
    ctx.closePath();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-0.9 * Math.sqrt(theta));
    ctx.translate(30, 0);
    ctx.fillText("θ", 0, 0);
    ctx.restore();

    ctx.save();
    if (mouseY > center) {
        ctx.textBaseline = "top";
    } else {
        ctx.textBaseline = "ideographic";
    }
    ctx.translate(center, center);
    ctx.rotate(-theta);
    ctx.translate(0.47 * r * center, 0);
    if (mouseX < center) {
        ctx.rotate(Math.PI);
    }
    ctx.fillText("r", 0, 0);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = "#FF6A6A";
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 5, 0, 2 * Math.PI, true);
    ctx.fillStyle = "#FF6A6A";
    ctx.fill();
    ctx.closePath();

    requestAnimationFrame(update);
}

function getMousePos(evt) {
    if (tracking) {
        const x = evt.clientX - planeRect.left;
        const y = evt.clientY - planeRect.top;
        const tx = transformPoint(x);
        const ty = transformPoint(y);
        r = Math.sqrt(tx ** 2 + ty ** 2);
        theta = Math.atan2(ty, tx);
        if (theta < 0) {
            theta = (-1) * theta;
        } else if (theta > 0) {
            theta = 2 * Math.PI - theta;
        }
        if (r <= 1) {
            mouseX = x;
            mouseY = y;
            real = tx;
            imag = -ty;
            reInput.value = tx.toFixed(5);
            imInput.value = -ty.toFixed(5);
            rInput.value = r.toFixed(5);
            thetaInput.value = theta.toFixed(5);
            run();
        }
    }
}

function toggleTracking(evt) {
    tracking = !tracking;
    getMousePos(evt);
}

function transformPoint(x) {
    return (2 / nplaneSize) * x - 1;
}

function transformPointInverse(x) {
    return (center) * (x + 1);
}

planeCanvas.addEventListener("mousemove", getMousePos, false);
planeCanvas.addEventListener("click", toggleTracking);
setupPlaneCanvas();
update();
run();
toggleRotation();
