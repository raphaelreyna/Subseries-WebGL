# Subseries-WebGL
Compute and plot evaluations of subseries of holomorphic functions using WebGL entirely in your browser.

[Check it out](https://rphlrn.com/Subseries-WebGL)

### What are subseries?
A subseries is to a series what a subsequence is to a sequence.

Formally, given a series S=a<sub>0</sub>+a<sub>1</sub>+a<sub>2</sub>+..., 
a subseries of S is any series S'= b<sub>0</sub>+b<sub>1</sub>+b<sub>2</sub>+... where either b<sub>j</sub>=a<sub>j</sub> or b<sub>j</sub>=0.

A well known subseries of the [harmonic series](https://en.wikipedia.org/wiki/Harmonic_series_(mathematics)) is the [Kempner series](https://en.wikipedia.org/wiki/Kempner_series).

### Acknowledements
General technique of how to use WebGL for more general computing is based on this [excellent blog post by Chris Wellons](https://nullprogram.com/blog/2014/06/10/).


Taylor series expansion is normally handled by a python [backend](https://github.com/raphaelreyna/sympy-api) I wrote using [Sympy](https://www.sympy.org/en/index.html). However, sometimes this backend server is unavailable, and when this happens, the Taylor series are computed using the [math-expressions](https://github.com/kisonecat/math-expressions) by kisonecat.
