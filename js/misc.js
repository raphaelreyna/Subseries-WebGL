const BASE = 255;

function fetch(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, Boolean(callback));
    xhr.send();
    return xhr.responseText;
}

function Nfetch(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, Boolean(callback));
    xhr.send();
    return JSON.parse(xhr.responseText);
}

function complexMult(a, b) {
    const real = a.re*b.re-a.im*b.im;
    const imag = a.re*b.im+a.im*b.re;
    return {re: real, im: imag};
}

function scalarComplexMult(s, z) {
    return {re:s*z.re,
            im:s*z.im};
}

function complexAdd(a, b) {
    const real = a.re + b.re;
    const imag = a.im + b.im;
    return {re:real, im: imag};
}

function abs(a) {
    return Math.sqrt(a.re**2+a.im**2);
}

// Encode the switch integer as a 4 digit base 256 number.
// This encoding allows us to store the integers as a rgba texture.
function encodeSwitch(value) {
    var digits = [];
    var quotient = value;
    for (var i = 0; i < 4; i++) {
        digits[i] = quotient % BASE;
        quotient = Math.floor(quotient / BASE);
    }
    return digits;
}

// Encode a complex number as a 4 digit base 256 number.
// This encoding allows us to store the numbers as a rgba texture.
function encodePoint(re, im, scale, offset) {
    const normalizedRe = scale*(re - offset[0]);
    const normalizedIm = scale*(im - offset[1]);
    const encodedPoint = [normalizedRe % BASE,
                          Math.floor(normalizedRe / BASE),
                          normalizedIm % BASE,
                          Math.floor(normalizedIm / BASE)];
    return encodedPoint;
}

function getCoeffs(fString, k, remote) {
    const zero = {x:0};
    var coeffsList = [];

    if (remote === true) {
        var url = "http://54.219.71.48/?fxn=" + encodeURIComponent(fString);
        url = url+"&deg="+k.toString();
        coeffsList = Nfetch(url);
    } else {
        var counter = 1;
        var factorial = 1;
        var coeff = 0;

        var f = math.parse(fString);
        const kk = parseFloat(k)+2;

        for (var i = 0; i < kk; i++) {
            coeff = f.eval(zero)/factorial;
            factorial *= counter;
            counter++;
            f = math.derivative(f,'x');
            coeffsList.push(coeff);
        }
    }
    return coeffsList;
}

function getPowers(real, imag, k) {
    var z = {re:real, im: imag};
    var z0 = {re: 1, im: 0};
    var powers = [z0];
    for (var i = 0; i < k; i++){
        const p = complexMult(powers[i], z);
        powers.push(p);
    }
    return powers;
}
