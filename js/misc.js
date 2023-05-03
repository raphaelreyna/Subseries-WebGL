const BASE = 255;
const graphURL = `https://api.rphlrn.com/sympy-graph`;
const expandQuery = `
query expand($function: String!, $degree: Int!) {
  taylor(function: $function, degree: $degree) {
    coefficients
  }
}
`;

async function Nfetch(fn, d) {
    const xhr = new XMLHttpRequest();
    const payload = `{ taylor(function: "${fn}", degree: ${d}) { coefficients } }`
    const resp = await fetch(graphURL + `?query=${encodeURIComponent(payload)}`,
        {
            method: 'GET',
            headers: {'Accept': 'application/json'}
        },
    ).then(response => response.json())
    return resp;
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

async function getCoeffs(fString, k, remote) {
    const zero = {x:0};
    var coeffsList = [];

    if (remote === true) {
        coeffsList = (await Nfetch(fString, k)).data.taylor.coefficients;
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
