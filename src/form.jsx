import React from 'react';
import {TextField, Button} from '@material-ui/core';

class FunctionForm extends React.Component {
    constructor(props) {
        super(props);
        this.fString = props.fString;
        this.handleFChanged = this.handleFChanged.bind(this);
        this.onSubmitCallback = props.onSubmit;
    }

    handleFChanged(event) {
        const value = event.target.value;
        this.fString = value;
        this.setState({[event.target.name]: value});
    }

    render() {
        return (
            <form noValidate autoComplete={"off"} onSubmit={(event) => {
                event.preventDefault();
                this.onSubmitCallback(this.fString);
            }}>
                <TextField
                    id="func"
                    label="f(z)"
                    value={this.fString}
                    onChange={this.handleFChanged}
                    margin="normal"
                />
                <Button type="submit">Submit</Button>
            </form>
        );
    }
}

class ComplexNumberForm extends React.Component {
    constructor(props) {
        super(props);
        this.z = {
            re: props.re,
            im: props.im,
            abs: props.abs,
            arg: props.arg
        };

        this.fieldRefs = {
            re: React.createRef(),
            im: React.createRef(),
            abs: React.createRef(),
            arg: React.createRef()
        };

        this.decimalPlaces = props.decimalPlaces;

        this.onChangeCallback = props.onChange;
        this.handleReChanged = this.handleReChanged.bind(this);
        this.handleImChanged = this.handleImChanged.bind(this);
        this.handleAbsChanged = this.handleAbsChanged.bind(this);
        this.handleArgChanged = this.handleArgChanged.bind(this);
    }

    makeChangeHandler(id) {
        var func = function (event) {
            this.z[id] = event.target.value;
            this.onChangeCallback(this.z);
        }
        return func.bind(this);
    }

    handleReChanged(event) {
        const value = event.target.value;
        if (value == "" || value == undefined) {
            this.z.re = "";
            this.setState({[event.target.name]: ""});
            return;
        } else {
            this.z.re = value;
            const im = this.z.im;
            this.z.abs = Math.sqrt(value**2+im**2);
            var arg = Math.atan2(-im, value);
            if (arg < 0) {
                arg *= (-1);
            } else if (arg> 0) {
                arg = 2 * Math.PI - arg;
            };
            this.z.arg = arg;
            this.z.abs = this.z.abs.toFixed(this.decimalPlaces);
            this.z.arg = this.z.arg.toFixed(this.decimalPlaces);
            this.setState({[event.target.name]: event.target.value});
            this.exportZ();
        }
    }

    handleImChanged(event) {
        const value = event.target.value;
        if (value == "" || value == undefined) {
            this.z.im = "";
            this.setState({[event.target.name]: ""});
            return;
        } else {
            this.z.im = value;
            const re = this.z.re;
            this.z.abs = Math.sqrt(value**2+re**2);
            var arg = Math.atan2(-value, re);
            if (arg < 0) {
                arg *= (-1);
            } else if (arg> 0) {
                arg = 2 * Math.PI - arg;
            };
            this.z.arg = arg;
            this.z.abs = this.z.abs.toFixed(this.decimalPlaces);
            this.z.arg = this.z.arg.toFixed(this.decimalPlaces);
            this.setState({[event.target.name]: event.target.value});
            this.exportZ();
        }
    }

    handleAbsChanged(event) {
        const value = event.target.value;
        if (value == "" || value == undefined) {
            this.z.abs = "";
            this.setState({[event.target.name]: ""});
            return;
        } else {
            this.z.abs = value;
            const arg = this.z.arg;
            this.z.re = value*Math.cos(arg);
            this.z.im = value*Math.sin(arg);
            this.z.re = this.z.re.toFixed(this.decimalPlaces);
            this.z.im = this.z.im.toFixed(this.decimalPlaces);
            this.setState({[event.target.name]: event.target.value});
            this.exportZ();
        }
    }

    handleArgChanged(event) {
        const value = event.target.value;
        if (value == "" || value == undefined) {
            this.z.arg = "";
            this.setState({[event.target.name]: ""});
            return;
        } else {
            this.z.arg = value;
            const abs = this.z.abs;
            this.z.re = abs*Math.cos(value);
            this.z.im = abs*Math.sin(value);
            this.z.re = this.z.re.toFixed(this.decimalPlaces);
            this.z.im = this.z.im.toFixed(this.decimalPlaces);
            this.setState({[event.target.name]: event.target.value});
            this.exportZ();
        }
    }

    exportZ() {
        const z = this.z;
        var w = {
            re: z.re != "" ? z.re : 0,
            im: z.im != "" ? z.im : 0,
            abs: z.abs != "" ? z.abs : 0,
            arg: z.arg != "" ? z.arg : 0
        };
        this.onChangeCallback(w);
    }

    render() {
        const z = this.z;
        return (
            <form noValidate autoComplete={"off"}>
                <TextField
                    id="re"
                    label="Re(z)"
                    value={z.re}
                    onChange={this.handleReChanged}
                    type="number"
                    margin="normal"
                />
                <TextField
                    id="im"
                    label="Im(z)"
                    value={z.im}
                    onChange={this.handleImChanged}
                    type="number"
                    margin="normal"
                />
                <TextField
                    id="abs"
                    label="|z|"
                    value={z.abs}
                    onChange={this.handleAbsChanged}
                    type="number"
                    margin="normal"
                />
                <TextField
                    id="arg"
                    label="Arg(z)"
                    value={z.arg}
                    onChange={this.handleArgChanged}
                    type="number"
                    margin="normal"
                />
            </form>
        );
    }
}

export {FunctionForm, ComplexNumberForm};
