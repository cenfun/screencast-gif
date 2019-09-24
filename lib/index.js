const fs = require("fs");
const omggif = require("omggif");
const UPNG = require("upng-js");
const neuquant = require('./neuquant.js');

const framePngHandler = async (option) => {

    option.frameList.forEach((frame) => {
        let img = UPNG.decode(frame.buffer);

        frame.width = img.width;
        frame.height = img.height;

        //rgba list: png.data.byteLength = png.width * png.height * 4
        let nq = neuquant(img);
        frame.palette = nq.palette;
        frame.indices = nq.indices;

    });

};

const frameBufferHandler = async (option) => {
    let frameList = option.frames.map((frame) => {
        if (!frame) {
            return;
        }
        if (Buffer.isBuffer(frame)) {
            return {
                buffer: frame
            };
        }

        if (typeof(frame) === "string" && fs.existsSync(frame)) {
            let buffer = fs.readFileSync(frame);
            if (buffer) {
                return {
                    buffer: buffer
                };
            }
            return;
        }

        if (Buffer.isBuffer(frame.buffer)) {
            return frame;
        }

        if (typeof(frame.path) === "string" && fs.existsSync(frame.path)) {
            let buffer = fs.readFileSync(frame.path);
            if (buffer) {
                frame.buffer = buffer;
                return frame;
            }
            return;
        }

    });

    frameList = frameList.filter((item) => {
        return item && item.buffer;
    });

    option.frameList = frameList;
};

const GifMaker = async (option) => {

    option = Object.assign({
        frames: [],
        output: ""
    }, option);

    await frameBufferHandler(option);
    await framePngHandler(option);
    // console.log(option.frameList);

    let maxWidth = Math.max.apply(Math, option.frameList.map(frame => frame.width));
    let maxHeight = Math.max.apply(Math, option.frameList.map(frame => frame.height));

    let buf = Buffer.alloc(maxWidth * maxHeight * option.frameList.length + 1024);
    var gif = new omggif.GifWriter(buf, maxWidth, maxHeight, {
        loop: 0
    });

    option.frameList.forEach((frame) => {
        gif.addFrame(0, 0, frame.width, frame.height, frame.indices, {
            palette: frame.palette,
            delay: 10
        });
    });

    let out = buf.slice(0, gif.end());

    fs.writeFileSync(option.output, out);

};


module.exports = GifMaker;
