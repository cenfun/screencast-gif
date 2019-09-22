const fs = require("fs");
const GifMaker = require("../");

const generate = async () => {

    let time_start = Date.now();
    let frames = fs.readdirSync("elf").map((filename) => {
        return "elf/" + filename;
    });
    await GifMaker({
        frames: frames,
        output: "elf.gif"
    });
    console.log((Date.now() - time_start).toLocaleString() + "ms - elf.gif");


    time_start = Date.now();
    frames = fs.readdirSync("screenshot").map((filename) => {
        return "screenshot/" + filename;
    });
    await GifMaker({
        frames: frames,
        output: "screenshot.gif"
    });
    console.log((Date.now() - time_start).toLocaleString() + "ms - screenshot.gif");

};


generate();