import {ProducerRegister} from "../../class";
import Click2Install from "./Click2Install";

const regArray: Array<ProducerRegister> = [
    {
        name: "Click to install",
        entrance: Click2Install,
        description: "Create a shortcut on the desktop to allow user's manually install or click to run;" +
            "\nSuggested buildManifest : ['${taskName}.wcs','${taskName}/${downloadedFile}']"
    }
]

export default regArray
