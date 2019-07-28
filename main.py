from flask import Flask, request, jsonify
from flask_cors import CORS
from sympy.parsing.sympy_parser import parse_expr
from sympy import symbols, series, Poly

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello_world():
    fxn = request.args.get('fxn')
    deg = request.args.get('deg')
    x = symbols('x')
    f = parse_expr(fxn)
    f = series(f,x,n=int(deg)+1).removeO()
    f = Poly(f,x)
    coeffs = f.all_coeffs()
    coeffs = reversed(coeffs)
    response = {}
    i = 0
    for c in coeffs:
        response[str(i)] = float(c)
        i += 1
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0')
