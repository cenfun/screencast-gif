/* NeuQuant Neural-Net Quantization Algorithm
 * ------------------------------------------
 *
 * Copyright (c) 1994 Anthony Dekker
 *
 * NEUQUANT Neural-Net quantization algorithm by Anthony Dekker, 1994.
 * See "Kohonen neural networks for optimal colour quantization"
 * in "Network: Computation in Neural Systems" Vol. 5 (1994) pp 351-367.
 * for a discussion of the algorithm.
 * See also  http://members.ozemail.com.au/~dekker/NEUQUANT.HTML
 *
 * Any party obtaining a copy of these files from the author, directly or
 * indirectly, is granted, free of charge, a full and unrestricted irrevocable,
 * world-wide, paid up, royalty-free, nonexclusive right and license to deal
 * in this software and documentation files (the "Software"), including without
 * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons who receive
 * copies from any such party to do so, with the only requirement being
 * that this copyright notice remain intact.
 *
 * JavaScript port 2012 by Johan Nordberg
 */

// number of learning cycles
const ncycles = 100;
// number of colors used
const netsize = 256;
const maxnetpos = netsize - 1;

// defs for freq and bias

// bias for colour values
const netbiasshift = 4;
// bias for fractions
const intbiasshift = 16;
const intbias = (1 << intbiasshift);
const gammashift = 10;

const betashift = 10;

/* beta = 1/1024 */
const beta = (intbias >> betashift);
const betagamma = (intbias << (gammashift - betashift));

// defs for decreasing radius factor
// for 256 cols, radius starts
const initrad = (netsize >> 3);
// at 32.0 biased by 6 bits
const radiusbiasshift = 6;
const radiusbias = (1 << radiusbiasshift);
// and decreases by a
const initradius = (initrad * radiusbias);
// factor of 1/30 each cycle
const radiusdec = 30;

// defs for decreasing alpha factor

// alpha starts at 1.0
const alphabiasshift = 10;
const initalpha = (1 << alphabiasshift);

// radbias and alpharadbias used for radpower calculation
const radbiasshift = 8;
const radbias = (1 << radbiasshift);
const alpharadbshift = (alphabiasshift + radbiasshift);
const alpharadbias = (1 << alpharadbshift);

// four primes near 500 - assume no image has a length so large that it is
// divisible by all four primes
const prime1 = 499;
const prime2 = 491;
const prime3 = 487;
const prime4 = 503;
const minpicturebytes = (3 * prime4);

/**
 * NeuQuant constructor
 * pixels - array of pixels in RGB format
 * samplefac - sampling factor 1 to 30 where lower is better quality
 */
class NeuQuant {

    constructor(pixels, samplefac) {
        this.pixels = pixels;
        this.samplefac = samplefac;

        this.network = [];
        this.netindex = new Int32Array(256);
        this.bias = new Int32Array(netsize);
        this.freq = new Int32Array(netsize);
        this.radpower = new Int32Array(netsize >> 3);

        let i; let
            v;
        for (i = 0; i < netsize; i++) {
            v = (i << (netbiasshift + 8)) / netsize;
            this.network[i] = new Float64Array([v, v, v, 0]);
            this.freq[i] = intbias / netsize;
            this.bias[i] = 0;
        }
    }

    // Moves neuron *i* towards biased (b,g,r) by factor *alpha*
    altersingle(alpha, i, b, g, r) {
        this.network[i][0] -= (alpha * (this.network[i][0] - b)) / initalpha;
        this.network[i][1] -= (alpha * (this.network[i][1] - g)) / initalpha;
        this.network[i][2] -= (alpha * (this.network[i][2] - r)) / initalpha;
    }

    // Searches for biased BGR values
    /*
    finds closest neuron (min dist) and updates freq
    finds best neuron (min dist-bias) and returns position
    for frequently chosen neurons, freq[i] is high and bias[i] is negative
    bias[i] = gamma * ((1 / netsize) - freq[i])
    */
    contest(b, g, r) {

        let bestd = ~(1 << 31);
        let bestbiasd = bestd;
        let bestpos = -1;
        let bestbiaspos = bestpos;

        let i;
        let n;
        let dist;
        let biasdist;
        let betafreq;

        for (i = 0; i < netsize; i++) {
            n = this.network[i];

            dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
            if (dist < bestd) {
                bestd = dist;
                bestpos = i;
            }

            biasdist = dist - ((this.bias[i]) >> (intbiasshift - netbiasshift));
            if (biasdist < bestbiasd) {
                bestbiasd = biasdist;
                bestbiaspos = i;
            }

            betafreq = (this.freq[i] >> betashift);
            this.freq[i] -= betafreq;
            this.bias[i] += (betafreq << gammashift);
        }

        this.freq[bestpos] += beta;
        this.bias[bestpos] -= betagamma;

        return bestbiaspos;
    }

    // Moves neurons in *radius* around index *i* towards biased (b,g,r) by factor *alpha*
    alterneigh(radius, i, b, g, r) {
        const lo = Math.abs(i - radius);
        const hi = Math.min(i + radius, netsize);

        let j = i + 1;
        let k = i - 1;
        let m = 1;

        let p; let
            a;
        while ((j < hi) || (k > lo)) {
            a = this.radpower[m++];

            if (j < hi) {
                p = this.network[j++];
                p[0] -= (a * (p[0] - b)) / alpharadbias;
                p[1] -= (a * (p[1] - g)) / alpharadbias;
                p[2] -= (a * (p[2] - r)) / alpharadbias;
            }

            if (k > lo) {
                p = this.network[k--];
                p[0] -= (a * (p[0] - b)) / alpharadbias;
                p[1] -= (a * (p[1] - g)) / alpharadbias;
                p[2] -= (a * (p[2] - r)) / alpharadbias;
            }
        }
    }

    // Main Learning Loop
    /* eslint-disable complexity, no-negated-condition */
    learn() {
        let i;

        const lengthcount = this.pixels.length;
        const alphadec = 30 + ((this.samplefac - 1) / 3);
        const samplepixels = lengthcount / (3 * this.samplefac);
        let delta = samplepixels / ncycles | 0;
        let alpha = initalpha;
        let radius = initradius;

        let rad = radius >> radiusbiasshift;

        if (rad <= 1) {
            rad = 0;
        }
        for (i = 0; i < rad; i++) {
            this.radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
        }

        let step;
        if (lengthcount < minpicturebytes) {
            this.samplefac = 1;
            step = 3;
        } else if ((lengthcount % prime1) !== 0) {
            step = 3 * prime1;
        } else if ((lengthcount % prime2) !== 0) {
            step = 3 * prime2;
        } else if ((lengthcount % prime3) !== 0) {
            step = 3 * prime3;
        } else {
            step = 3 * prime4;
        }

        let b;
        let g;
        let r;
        let j;
        // current pixel
        let pix = 0;

        i = 0;
        while (i < samplepixels) {
            b = (this.pixels[pix] & 0xff) << netbiasshift;
            g = (this.pixels[pix + 1] & 0xff) << netbiasshift;
            r = (this.pixels[pix + 2] & 0xff) << netbiasshift;

            j = this.contest(b, g, r);

            this.altersingle(alpha, j, b, g, r);
            if (rad !== 0) {
                // alter neighbours
                this.alterneigh(rad, j, b, g, r);
            }

            pix += step;
            if (pix >= lengthcount) {
                pix -= lengthcount;
            }

            i++;

            if (delta === 0) {
                delta = 1;
            }
            if (i % delta === 0) {
                alpha -= alpha / alphadec;
                radius -= radius / radiusdec;
                rad = radius >> radiusbiasshift;

                if (rad <= 1) {
                    rad = 0;
                }
                for (j = 0; j < rad; j++) {
                    this.radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
                }
            }
        }
    }
    /* eslint-enable */

    // Unbiases network to give byte values 0..255 and record position i to prepare for sort
    unbiasnet() {
        for (let i = 0; i < netsize; i++) {
            this.network[i][0] >>= netbiasshift;
            this.network[i][1] >>= netbiasshift;
            this.network[i][2] >>= netbiasshift;
            // record color number
            this.network[i][3] = i;
        }
    }

    // Sorts network and builds netindex[0..255]
    inxbuild() {
        let i;
        let j;
        let p;
        let q;
        let smallpos;
        let smallval;
        let previouscol = 0;
        let startpos = 0;
        for (i = 0; i < netsize; i++) {
            p = this.network[i];
            smallpos = i;
            // index on g
            smallval = p[1];
            // find smallest in i..netsize-1
            for (j = i + 1; j < netsize; j++) {
                q = this.network[j];
                // index on g
                if (q[1] < smallval) {
                    smallpos = j;
                    // index on g
                    smallval = q[1];
                }
            }
            q = this.network[smallpos];
            // swap p (i) and q (smallpos) entries
            if (i !== smallpos) {
                j = q[0];
                q[0] = p[0];
                p[0] = j;
                j = q[1];
                q[1] = p[1];
                p[1] = j;
                j = q[2];
                q[2] = p[2];
                p[2] = j;
                j = q[3];
                q[3] = p[3];
                p[3] = j;
            }
            // smallval entry is now in position i

            if (smallval !== previouscol) {
                this.netindex[previouscol] = (startpos + i) >> 1;
                for (j = previouscol + 1; j < smallval; j++) {
                    this.netindex[j] = i;
                }
                previouscol = smallval;
                startpos = i;
            }
        }
        this.netindex[previouscol] = (startpos + maxnetpos) >> 1;
        for (j = previouscol + 1; j < 256; j++) {
            // really 256
            this.netindex[j] = maxnetpos;
        }
    }


    /**
     * 1. initializes network
     * 2. trains it
     * 3. removes misconceptions
     * 4. builds colorindex
     */
    buildColorMap() {
        this.learn();
        this.unbiasnet();
        this.inxbuild();

        const map = Buffer.alloc(netsize * 3);
        const index = Buffer.alloc(netsize);

        for (let i = 0; i < netsize; i++) {
            index[this.network[i][3]] = i;
        }

        let k = 0;
        for (let l = 0; l < netsize; l++) {
            const j = index[l];
            map[k++] = this.network[j][0] & 0xff;
            map[k++] = this.network[j][1] & 0xff;
            map[k++] = this.network[j][2] & 0xff;
        }

        return map;
    }
}

// ============================================================================

// Helper function that finds the closest palette index for the given color
const findClosestRGB = (palette, r, g, b) => {
    let minpos = 0;
    let dmin = 256 * 256 * 256;
    for (let i = 0, l = palette.length; i < l; i++) {
        const dr = r - palette[i++];
        const dg = g - palette[i++];
        const db = b - palette[i];
        const d = dr * dr + dg * dg + db * db;
        const index = i / 3 | 0;
        if (d < dmin) {
            dmin = d;
            minpos = index;
        }
    }
    return minpos;
};

const generateIndices = (pixels, palette) => {
    const l = pixels.length;
    const indices = Buffer.alloc(l / 3);
    let i = 0;
    let j = 0;
    const cache = {};
    while (i < l) {
        const r = pixels[i++];
        const g = pixels[i++];
        const b = pixels[i++];
        const k = r << 16 | g << 8 | b;
        if (Object.prototype.hasOwnProperty.call(cache, k)) {
            indices[j++] = cache[k];
        } else {
            const index = findClosestRGB(palette, r, g, b);
            cache[k] = index;
            indices[j++] = index;
        }
    }
    return indices;
};

const neuquant = (pixels, quality = 10) => {
    const nq = new NeuQuant(pixels, quality);
    const colorMap = nq.buildColorMap();
    const indices = generateIndices(pixels, colorMap);

    const l = colorMap.length;
    const palette = new Int32Array(l / 3);
    let i = 0;
    let j = 0;
    while (i < l) {
        const r = colorMap[i++];
        const g = colorMap[i++];
        const b = colorMap[i++];
        const k = (r << 16) + (g << 8) + b;
        palette[j++] = k;
    }

    return {
        palette,
        indices
    };
};

module.exports = neuquant;
