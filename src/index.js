import React from 'react';
import {render} from 'react-dom';
import SubseriesPlotter from './react-subseries-plotter.js';
import {ControlledTrackerPlane} from '@rreyna/react-tracker-canvas';

class App extends React.Component {
    render() {
        return (
            <div>
                <SubseriesPlotter/>
                <ControlledTrackerPlane
                    canvasDimensions={{width: 500, height: 500}}
                />
            </div>
        );
    }
}

render(<App/>, document.querySelector("#App"));
