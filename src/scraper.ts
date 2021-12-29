import path from "path";

const Piscina = require('piscina');

const piscina = new Piscina({
    filename: path.join(__dirname, "worker.ts")
});
