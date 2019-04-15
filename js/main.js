const canvas = document.getElementById('glCanvas');

var xhr = new XMLHttpRequest();
xhr.open("GET", "terms.csv");
xhr.send();
var csvFile = xhr.responseText;
var termData = $.csv.toArrays(fetch("terms.csv"));

var terms = [];
for (var i = 0; i < terms.length; i++) {
    const term = termData[i];
    terms[i] = Float32Array.from([parseFloat(term[0]), parseFloat(term[1])]);
}

const k = 12;

var app = new App(canvas, 2**k, terms);
var counter = 0;

app.timer = setInterval(function(){
    const i = counter % termData.length;
    counter++;

    const term = [termData[i][0],  termData[i][1]];

    app.step(Float32Array.from(term));
    app.draw();
}, 10);

