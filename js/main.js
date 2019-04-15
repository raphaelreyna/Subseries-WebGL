const canvas = document.getElementById('glCanvas');

const k = 12;
var app = new App(canvas, 2**k);

const zero = {x:0};

function run(){
    const fString = document.getElementById("fxn").value;
    const real = document.getElementById("real").value;
    const imag = document.getElementById("imag").value;
    const z0 = {re:real, im:imag};

    var counter = 1;
    var factorial = 1;
    var coeff = 0;
    var zn = {re:1,im:0};
    var term = 0;

    var f = math.parse(fString);

    app.timer = setInterval(function(){
        coeff = f.eval(zero)/factorial;
        term = scalarComplexMult(coeff, zn);
        factorial *= counter;
        counter++;
        f = math.derivative(f,'x');
        zn = complexMult(z0, zn);

        app.step(Float32Array.from([term.re,term.im]));
        app.draw();
    }, 2);

    app.endTimer = setInterval(function(){
        if (counter === k+1) {
            clearInterval(app.timer);
        }
    }, 1);
    document.getElementById("msg").innerHTML = "You will need to refresh this page to run again.";
}
