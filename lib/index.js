const fs = require("fs");
const omggif = require("omggif");
const UPNG = require("upng-js");
const neuquant = require('./neuquant.js');

const initOption = (option) => {
    let defaultOption = {
        loop: 0,

        defaultFrameOption: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,

            delay: 10,

            palette: [],
            indices: []
        },
        frames: [],
        output: ""
    };
    option = Object.assign(defaultOption, option);
    return option;
};

const generateFrameList = (frames) => {
    //frame buffer handler
    let frameList = frames.map((frame) => {
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

    //frame decode and neuquant handler
    frameList.forEach((frame) => {
        let img = UPNG.decode(frame.buffer);
        frame.width = img.width;
        frame.height = img.height;
        let nq = neuquant(img);
        frame.palette = nq.palette;
        frame.indices = nq.indices;
    });

    return frameList;
};

const ScreencastGIF = (option) => {

    option = initOption(option);

    let frameList = generateFrameList(option.frames);

    //canvas size
    let maxWidth = Math.max.apply(Math, frameList.map(frame => frame.width));
    let maxHeight = Math.max.apply(Math, frameList.map(frame => frame.height));

    let buf = Buffer.alloc(maxWidth * maxHeight * frameList.length + 1024);
    var gif = new omggif.GifWriter(buf, maxWidth, maxHeight, {
        loop: option.loop
    });

    frameList.forEach((frame) => {
        frame = Object.assign({}, option.defaultFrameOption, frame);
        gif.addFrame(frame.x, frame.y, frame.width, frame.height, frame.indices, {
            palette: frame.palette,
            delay: frame.delay
        });
    });

    return buf.slice(0, gif.end());
};


module.exports = ScreencastGIF;
