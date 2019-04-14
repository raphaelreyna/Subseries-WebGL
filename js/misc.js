function fetch(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, Boolean(callback));
    xhr.send();
    return xhr.responseText;
}

function now() {
    return Math.floor(Date.now() / 1000);
}
