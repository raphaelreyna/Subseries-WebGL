const glCanvas = document.getElementById('glCanvas');
const planeCanvas = document.getElementById('cPlane');
const left = document.getElementById('left');
const planeSize =  window.getComputedStyle(left).width;
const nplaneSize = parseFloat(planeSize);
const ctx = planeCanvas.getContext('2d');
var mouseX = transformPointInverse(0.5);
var mouseY = transformPointInverse(-0.5);
var tracking = false;
const app = new App(glCanvas, 12);
const im = document.getElementById('imag');
const re = document.getElementById('real');
const fxn = document.getElementById("fxn");

function gldrawloop(){
    if (app.counter < app.k) {
        const t = app.terms[app.counter];
        app.addTerm([t.re, t.im]);
        app.updateSwitches();
        app.draw(app.translation);
        requestAnimationFrame(gldrawloop);
    }
}

function run(){
    const fString = fxn.value;
    var real = parseFloat(re.value);
    var imag = parseFloat(im.value);
    app.setupForDrawLoop(fString, real, imag);
    requestAnimationFrame(gldrawloop);
}

function setupPlaneCanvas(){
    planeCanvas.style.width=planeSize;
    planeCanvas.style.height=planeSize;
    planeCanvas.width=nplaneSize;
    planeCanvas.height=nplaneSize;
}

function update(){
    ctx.clearRect(0, 0, nplaneSize, nplaneSize);
    ctx.beginPath();
    ctx.arc(nplaneSize/2, nplaneSize/2, nplaneSize/2, 0, 2*Math.PI, true);
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
    if (tracking){
        var rect = planeCanvas.getBoundingClientRect();
        mouseX = evt.clientX - rect.left;
        mouseY = evt.clientY - rect.top;
        re.value = transformPoint(mouseX);
        im.value = (-1)*transformPoint(mouseY);
        run();
    }
}

function toggleTracking(evt) {
    tracking = !tracking;
    getMousePos(evt);
}

function transformPoint(x) {
    return (2/nplaneSize)*x-1;
}

function transformPointInverse(x) {
    return (nplaneSize/2)*(x+1);
}

planeCanvas.addEventListener("mousemove", getMousePos, false);
planeCanvas.addEventListener("click", toggleTracking);
setupPlaneCanvas();
update();
