#!/usr/bin/python3

import sys
import json
import argparse
from sympy.parsing.sympy_parser import parse_expr
from sympy import symbols, series, Poly

x = symbols('x')

def graphqldFields():
    return "[\"taylor(function: String!, degree: Int!): TaylorResponse!\"]"

def run():
    parser = argparse.ArgumentParser(description='taylor')
    parser.add_argument('--function')
    parser.add_argument('--degree')
    args = vars(parser.parse_args())

    function = parse_expr(args['function'])
    degree = int(args['degree']) + 1

    f_expanded = series(function, x, n=degree, x0=0).removeO()
    f_expanded = Poly(f_expanded, x)

    np_coeffs = f_expanded.all_coeffs()
    np_coeffs = reversed(np_coeffs)
    coeffs = []
    for c in np_coeffs:
        coeffs.append(float(c))

    print(json.dumps({"coefficients": coeffs}))

if __name__ == '__main__':
    args = sys.argv
    if 1 < len(args):
        if args[1] == "--graphqld-fields":
            print(graphqldFields())
        else:
            run()