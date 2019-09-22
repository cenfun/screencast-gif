const fs = require("fs");
const omggif = require("omggif");
const UPNG = require("upng-js");

const getPalette = require('image-palette');
const nextPow2 = require('next-pow-2');


const framePngHandler = async (option) => {

    var list = [];
    option.frameList.forEach((frame) => {
        let img = UPNG.decode(frame.buffer);

        frame.width = img.width;
        frame.height = img.height;
        //rgba list: png.data.byteLength = png.width * png.height * 4
        frame.data = img.data;
        list.push(img.data);
    });

    var res = UPNG.quantize(list, 256);

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

        if (typeof (frame) === "string" && fs.existsSync(frame)) {
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

        if (typeof (frame.path) === "string" && fs.existsSync(frame.path)) {
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
        gif.addFrame(0, 0, frame.width, frame.height, frame.ins, {
            palette: frame.palette,
            delay: 50
        });
    });

    let out = buf.slice(0, gif.end());

    fs.writeFileSync(option.output, out);

};


module.exports = GifMaker;