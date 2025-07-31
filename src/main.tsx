import { render } from "preact"
import "./index.css"

import "./monkey_patch"

import { DemoSim } from "./DemoSim.tsx"


function App ()
{
    return <div>
        <DemoSim />
        <div id="debug_output"></div>
    </div>
}

render(<App />, document.getElementById("app")!)
