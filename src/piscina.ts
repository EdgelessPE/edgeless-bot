import Piscina from 'piscina';
import path from "path";

export const piscina = new Piscina({
    filename: path.resolve(__dirname, 'worker.js')
});
