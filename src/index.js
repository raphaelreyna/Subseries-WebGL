import React from 'react';
import {render} from 'react-dom';
import SubseriesPlotter from './react-subseries-plotter.js';
import {FunctionForm, ComplexNumberForm} from './form.jsx'
import {ControlledTrackerPlane} from '@rreyna/react-tracker-canvas';

import {Grid} from '@material-ui/core';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.plotterRef = React.createRef();
        this.handleCNFormChange = this.handleCNFormChange.bind(this);
        this.handleFunctionFormSubmission = this.handleFunctionFormSubmission.bind(this);
        this.handleMouseMoved = this.handleMouseMoved.bind(this);
        this.fString = "1/(1-x)";
        this.z = {re: null, im: null};
    }

    handleMouseMoved(mouse) {
        const z = mouse.cartesian;
        this.z = {
            re: z.x,
            im: z.y
        };
        this.setPlotterState();
    }

    setPlotterState() {
        const plotter = this.plotterRef.current;
        plotter.setState({
            z: this.z,
            f: this.fString
        });
    }

    handleCNFormChange(input) {
        if (input.re == "" || input.im == "" || input.abs == "" || input.arg == "") {
            return;
        } else {
            this.z = {re: parseFloat(input.re), im: parseFloat(input.im)};
            this.setPlotterState();
        }
    }

    handleFunctionFormSubmission(fString) {
        this.fString = fString;
        this.setPlotterState();
    }

    render() {
        return (
            <Grid container
                  direction={"row"}>
                <Grid container item
                      direction={"column"}
                      xs={4}>
                    <Grid item>
                        <FunctionForm onSubmit={this.handleFunctionFormSubmission} fString={this.fString}/>
                    </Grid>
                    <Grid item>
                        <ComplexNumberForm
                            re={0.5} im={0.5}
                            abs={0.7071} arg={0.7853}
                            decimalPlaces={6}
                            onChange={this.handleCNFormChange}/>
                    </Grid>
                    <Grid item>
                        <ControlledTrackerPlane
                            canvasDimensions={{width: 300, height: 300}}
                            onMouseMoved={this.handleMouseMoved}
                        />
                    </Grid>
                </Grid>
                <Grid container item
                      xs={8}>
                    <Grid item>
                        <SubseriesPlotter
                            ref={this.plotterRef}
                            z={{re: 0.5, im: 0.5}}
                            f={this.fString} k={16}
                            width={600} height={600}/>
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}

render(<App/>, document.querySelector("#App"));
