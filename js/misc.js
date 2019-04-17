function fetch(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, Boolean(callback));
    xhr.send();
    return xhr.responseText;
}

function now() {
    return Math.floor(Date.now() / 1000);
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
