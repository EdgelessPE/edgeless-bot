import {ProducerRegister} from "../../src/class";

const regArray: Array<ProducerRegister> = [
    {
        name: "Click to Install",
        entrance: "Click2Install",
        description: "Create a shortcut on the desktop to allow user's manually install or click to run;" +
            "\nSuggested buildManifest : ['${taskName}.wcs','${taskName}/${downloadedFile}']"
    }
]

export default regArray
