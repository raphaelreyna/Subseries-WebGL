const canvas = document.getElementById('glCanvas');

const k = 12;
var app = new App(canvas, k);

var counter = 0;

var terms = [];

var ran = false;

function getTerms(fString, z, d) {
    const zero = {x:0};
    var termsList = [];

    var c = 1;
    var factorial = 1;
    var coeff = 0;
    var zn = {re:1,im:0};
    var term = 0;

    var f = math.parse(fString);

    for (var i = 0; i < k+2; i++) {
        coeff = f.eval(zero)/factorial;
        term = scalarComplexMult(coeff, zn);
        factorial *= c;
        c++;
        f = math.derivative(f,'x');
        zn = complexMult(z, zn);
        termsList.push(term);
    }
    return termsList;
}

function stop(){
    clearInterval(app.timer);
    clearInterval(app.endTimer);
    ran = true;
}

function run(){
    if (ran) {
        app.resetPoints();
        app.shouldReset = 1;
        app.updateSwitches();
        app.counter = 0;
        app.shouldReset = 0;
        terms = [];
        counter = 0;
    }

    const fString = document.getElementById("fxn").value;
    var real = parseFloat(document.getElementById("real").value);
    var imag = parseFloat(document.getElementById("imag").value);
    terms = getTerms(fString, {re: real, im: imag});
    var offset = {re:0, im:0};
    for (var i = 0; i < 12; i++){
        offset = complexAdd(offset, terms[i]);
    }
    offset = scalarComplexMult(0.5, offset);

    app.timer = setInterval(function(){
        const t = terms[counter];
        counter++;
        app.step([t.re,t.im]);
        app.draw();
        if (counter === k) {
            stop();
        }
        console.log(counter);
    }, 2);
}
