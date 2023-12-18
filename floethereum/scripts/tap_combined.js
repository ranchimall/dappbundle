/******
 * 
 START OF BASE SECTION 
 * 
 * 
 ******/
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */

var base = {};
var taproot = {};
var secp = {};
var hashmini = {};

(function () {
    base.bytes = base.stringToBytes = base.str = base.bytesToString = base.hex = base.utf8 = base.bech32m = base.bech32 = base.base58check = base.base58xmr = base.base58xrp = base.base58flickr = base.base58 = base.base64url = base.base64 = base.base32crockford = base.base32hex = base.base32 = base.base16 = base.utils = base.assertNumber = void 0;
    // Utilities
    function assertNumber(n) {
        if (!Number.isSafeInteger(n))
            throw new Error("Wrong integer: ".concat(n));
    }
    base.assertNumber = assertNumber;
    function chain() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Wrap call in closure so JIT can inline calls
        var wrap = function (a, b) { return function (c) { return a(b(c)); }; };
        // Construct chain of args[-1].encode(args[-2].encode([...]))
        var encode = Array.from(args)
            .reverse()
            .reduce(function (acc, i) { return (acc ? wrap(acc, i.encode) : i.encode); }, undefined);
        // Construct chain of args[0].decode(args[1].decode(...))
        var decode = args.reduce(function (acc, i) { return (acc ? wrap(acc, i.decode) : i.decode); }, undefined);
        return { encode: encode, decode: decode };
    }
    // Encodes integer radix representation to array of strings using alphabet and back
    function alphabet(alphabet) {
        return {
            encode: function (digits) {
                if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                    throw new Error('alphabet.encode input should be an array of numbers');
                return digits.map(function (i) {
                    assertNumber(i);
                    if (i < 0 || i >= alphabet.length)
                        throw new Error("Digit index outside alphabet: ".concat(i, " (alphabet: ").concat(alphabet.length, ")"));
                    return alphabet[i];
                });
            },
            decode: function (input) {
                if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                    throw new Error('alphabet.decode input should be array of strings');
                return input.map(function (letter) {
                    if (typeof letter !== 'string')
                        throw new Error("alphabet.decode: not string element=".concat(letter));
                    var index = alphabet.indexOf(letter);
                    if (index === -1)
                        throw new Error("Unknown letter: \"".concat(letter, "\". Allowed: ").concat(alphabet));
                    return index;
                });
            },
        };
    }
    function join(separator) {
        if (separator === void 0) { separator = ''; }
        if (typeof separator !== 'string')
            throw new Error('join separator should be string');
        return {
            encode: function (from) {
                if (!Array.isArray(from) || (from.length && typeof from[0] !== 'string'))
                    throw new Error('join.encode input should be array of strings');
                for (var _i = 0, from_1 = from; _i < from_1.length; _i++) {
                    var i = from_1[_i];
                    if (typeof i !== 'string')
                        throw new Error("join.encode: non-string input=".concat(i));
                }
                return from.join(separator);
            },
            decode: function (to) {
                if (typeof to !== 'string')
                    throw new Error('join.decode input should be string');
                return to.split(separator);
            },
        };
    }
    // Pad strings array so it has integer number of bits
    function padding(bits, chr) {
        if (chr === void 0) { chr = '='; }
        assertNumber(bits);
        if (typeof chr !== 'string')
            throw new Error('padding chr should be string');
        return {
            encode: function (data) {
                if (!Array.isArray(data) || (data.length && typeof data[0] !== 'string'))
                    throw new Error('padding.encode input should be array of strings');
                for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                    var i = data_1[_i];
                    if (typeof i !== 'string')
                        throw new Error("padding.encode: non-string input=".concat(i));
                }
                while ((data.length * bits) % 8)
                    data.push(chr);
                return data;
            },
            decode: function (input) {
                if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                    throw new Error('padding.encode input should be array of strings');
                for (var _i = 0, input_1 = input; _i < input_1.length; _i++) {
                    var i = input_1[_i];
                    if (typeof i !== 'string')
                        throw new Error("padding.decode: non-string input=".concat(i));
                }
                var end = input.length;
                if ((end * bits) % 8)
                    throw new Error('Invalid padding: string should have whole number of bytes');
                for (; end > 0 && input[end - 1] === chr; end--) {
                    if (!(((end - 1) * bits) % 8))
                        throw new Error('Invalid padding: string has too much padding');
                }
                return input.slice(0, end);
            },
        };
    }
    function normalize(fn) {
        if (typeof fn !== 'function')
            throw new Error('normalize fn should be function');
        return { encode: function (from) { return from; }, decode: function (to) { return fn(to); } };
    }
    // NOTE: it has quadratic time complexity
    function convertRadix(data, from, to) {
        // base 1 is impossible
        if (from < 2)
            throw new Error("convertRadix: wrong from=".concat(from, ", base cannot be less than 2"));
        if (to < 2)
            throw new Error("convertRadix: wrong to=".concat(to, ", base cannot be less than 2"));
        if (!Array.isArray(data))
            throw new Error('convertRadix: data should be array');
        if (!data.length)
            return [];
        var pos = 0;
        var res = [];
        var digits = Array.from(data);
        digits.forEach(function (d) {
            assertNumber(d);
            if (d < 0 || d >= from)
                throw new Error("Wrong integer: ".concat(d));
        });
        while (true) {
            var carry = 0;
            var done = true;
            for (var i = pos; i < digits.length; i++) {
                var digit = digits[i];
                var digitBase = from * carry + digit;
                if (!Number.isSafeInteger(digitBase) ||
                    (from * carry) / from !== carry ||
                    digitBase - digit !== from * carry) {
                    throw new Error('convertRadix: carry overflow');
                }
                carry = digitBase % to;
                digits[i] = Math.floor(digitBase / to);
                if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase)
                    throw new Error('convertRadix: carry overflow');
                if (!done)
                    continue;
                else if (!digits[i])
                    pos = i;
                else
                    done = false;
            }
            res.push(carry);
            if (done)
                break;
        }
        for (var i = 0; i < data.length - 1 && data[i] === 0; i++)
            res.push(0);
        return res.reverse();
    }
    var gcd = function (a, b) { return (!b ? a : gcd(b, a % b)); };
    var radix2carry = function (from, to) { return from + (to - gcd(from, to)); };
    // BigInt is 5x slower
    function convertRadix2(data, from, to, padding) {
        if (!Array.isArray(data))
            throw new Error('convertRadix2: data should be array');
        if (from <= 0 || from > 32)
            throw new Error("convertRadix2: wrong from=".concat(from));
        if (to <= 0 || to > 32)
            throw new Error("convertRadix2: wrong to=".concat(to));
        if (radix2carry(from, to) > 32) {
            throw new Error("convertRadix2: carry overflow from=".concat(from, " to=").concat(to, " carryBits=").concat(radix2carry(from, to)));
        }
        var carry = 0;
        var pos = 0; // bitwise position in current element
        var mask = Math.pow(2, to) - 1;
        var res = [];
        for (var _i = 0, data_2 = data; _i < data_2.length; _i++) {
            var n = data_2[_i];
            assertNumber(n);
            if (n >= Math.pow(2, from))
                throw new Error("convertRadix2: invalid data word=".concat(n, " from=").concat(from));
            carry = (carry << from) | n;
            if (pos + from > 32)
                throw new Error("convertRadix2: carry overflow pos=".concat(pos, " from=").concat(from));
            pos += from;
            for (; pos >= to; pos -= to)
                res.push(((carry >> (pos - to)) & mask) >>> 0);
            carry &= Math.pow(2, pos) - 1; // clean carry, otherwise it will cause overflow
        }
        carry = (carry << (to - pos)) & mask;
        if (!padding && pos >= from)
            throw new Error('Excess padding');
        if (!padding && carry)
            throw new Error("Non-zero padding: ".concat(carry));
        if (padding && pos > 0)
            res.push(carry >>> 0);
        return res;
    }
    function radix(num) {
        assertNumber(num);
        return {
            encode: function (bytes) {
                if (!(bytes instanceof Uint8Array))
                    throw new Error('radix.encode input should be Uint8Array');
                return convertRadix(Array.from(bytes), Math.pow(2, 8), num);
            },
            decode: function (digits) {
                if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                    throw new Error('radix.decode input should be array of strings');
                return Uint8Array.from(convertRadix(digits, num, Math.pow(2, 8)));
            },
        };
    }
    // If both bases are power of same number (like `2**8 <-> 2**64`),
    // there is a linear algorithm. For now we have implementation for power-of-two bases only
    function radix2(bits, revPadding) {
        if (revPadding === void 0) { revPadding = false; }
        assertNumber(bits);
        if (bits <= 0 || bits > 32)
            throw new Error('radix2: bits should be in (0..32]');
        if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
            throw new Error('radix2: carry overflow');
        return {
            encode: function (bytes) {
                if (!(bytes instanceof Uint8Array))
                    throw new Error('radix2.encode input should be Uint8Array');
                return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
            },
            decode: function (digits) {
                if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                    throw new Error('radix2.decode input should be array of strings');
                return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
            },
        };
    }
    function unsafeWrapper(fn) {
        if (typeof fn !== 'function')
            throw new Error('unsafeWrapper fn should be function');
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            try {
                return fn.apply(null, args);
            }
            catch (e) { }
        };
    }
    function checksum(len, fn) {
        assertNumber(len);
        if (typeof fn !== 'function')
            throw new Error('checksum fn should be function');
        return {
            encode: function (data) {
                if (!(data instanceof Uint8Array))
                    throw new Error('checksum.encode: input should be Uint8Array');
                var checksum = fn(data).slice(0, len);
                var res = new Uint8Array(data.length + len);
                res.set(data);
                res.set(checksum, data.length);
                return res;
            },
            decode: function (data) {
                if (!(data instanceof Uint8Array))
                    throw new Error('checksum.decode: input should be Uint8Array');
                var payload = data.slice(0, -len);
                var newChecksum = fn(payload).slice(0, len);
                var oldChecksum = data.slice(-len);
                for (var i = 0; i < len; i++)
                    if (newChecksum[i] !== oldChecksum[i])
                        throw new Error('Invalid checksum');
                return payload;
            },
        };
    }
    base.utils = { alphabet: alphabet, chain: chain, checksum: checksum, radix: radix, radix2: radix2, join: join, padding: padding };
    // RFC 4648 aka RFC 3548
    // ---------------------
    base.base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
    base.base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
    base.base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
    base.base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(function (s) { return s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1'); }));
    base.base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
    base.base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
    // base58 code
    // -----------
    var genBase58 = function (abc) { return chain(radix(58), alphabet(abc), join('')); };
    base.base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
    base.base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
    base.base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
    // xmr ver is done in 8-byte blocks (which equals 11 chars in decoding). Last (non-full) block padded with '1' to size in XMR_BLOCK_LEN.
    // Block encoding significantly reduces quadratic complexity of base58.
    // Data len (index) -> encoded block len
    var XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
    base.base58xmr = {
        encode: function (data) {
            var res = '';
            for (var i = 0; i < data.length; i += 8) {
                var block = data.subarray(i, i + 8);
                res += base.base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
            }
            return res;
        },
        decode: function (str) {
            var res = [];
            for (var i = 0; i < str.length; i += 11) {
                var slice = str.slice(i, i + 11);
                var blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
                var block = base.base58.decode(slice);
                for (var j = 0; j < block.length - blockLen; j++) {
                    if (block[j] !== 0)
                        throw new Error('base58xmr: wrong padding');
                }
                res = res.concat(Array.from(block.slice(block.length - blockLen)));
            }
            return Uint8Array.from(res);
        },
    };
    var base58check = function (sha256) {
        return chain(checksum(4, function (data) { return sha256(sha256(data)); }), base.base58);
    };
    base.base58check = base58check;
    var BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
    var POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    function bech32Polymod(pre) {
        var b = pre >> 25;
        var chk = (pre & 0x1ffffff) << 5;
        for (var i = 0; i < POLYMOD_GENERATORS.length; i++) {
            if (((b >> i) & 1) === 1)
                chk ^= POLYMOD_GENERATORS[i];
        }
        return chk;
    }
    function bechChecksum(prefix, words, encodingConst) {
        if (encodingConst === void 0) { encodingConst = 1; }
        var len = prefix.length;
        var chk = 1;
        for (var i = 0; i < len; i++) {
            var c = prefix.charCodeAt(i);
            if (c < 33 || c > 126)
                throw new Error("Invalid prefix (".concat(prefix, ")"));
            chk = bech32Polymod(chk) ^ (c >> 5);
        }
        chk = bech32Polymod(chk);
        for (var i = 0; i < len; i++)
            chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
        for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
            var v = words_1[_i];
            chk = bech32Polymod(chk) ^ v;
        }
        for (var i = 0; i < 6; i++)
            chk = bech32Polymod(chk);
        chk ^= encodingConst;
        return BECH_ALPHABET.encode(convertRadix2([chk % Math.pow(2, 30)], 30, 5, false));
    }
    function genBech32(encoding) {
        var ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
        var _words = radix2(5);
        var fromWords = _words.decode;
        var toWords = _words.encode;
        var fromWordsUnsafe = unsafeWrapper(fromWords);
        function encode(prefix, words, limit) {
            if (limit === void 0) { limit = 90; }
            if (typeof prefix !== 'string')
                throw new Error("bech32.encode prefix should be string, not ".concat(typeof prefix));
            if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
                throw new Error("bech32.encode words should be array of numbers, not ".concat(typeof words));
            var actualLength = prefix.length + 7 + words.length;
            if (limit !== false && actualLength > limit)
                throw new TypeError("Length ".concat(actualLength, " exceeds limit ").concat(limit));
            prefix = prefix.toLowerCase();
            return "".concat(prefix, "1").concat(BECH_ALPHABET.encode(words)).concat(bechChecksum(prefix, words, ENCODING_CONST));
        }
        function decode(str, limit) {
            if (limit === void 0) { limit = 90; }
            if (typeof str !== 'string')
                throw new Error("bech32.decode input should be string, not ".concat(typeof str));
            if (str.length < 8 || (limit !== false && str.length > limit))
                throw new TypeError("Wrong string length: ".concat(str.length, " (").concat(str, "). Expected (8..").concat(limit, ")"));
            // don't allow mixed case
            var lowered = str.toLowerCase();
            if (str !== lowered && str !== str.toUpperCase())
                throw new Error("String must be lowercase or uppercase");
            str = lowered;
            var sepIndex = str.lastIndexOf('1');
            if (sepIndex === 0 || sepIndex === -1)
                throw new Error("Letter \"1\" must be present between prefix and data only");
            var prefix = str.slice(0, sepIndex);
            var _words = str.slice(sepIndex + 1);
            if (_words.length < 6)
                throw new Error('Data must be at least 6 characters long');
            var words = BECH_ALPHABET.decode(_words).slice(0, -6);
            var sum = bechChecksum(prefix, words, ENCODING_CONST);
            if (!_words.endsWith(sum))
                throw new Error("Invalid checksum in ".concat(str, ": expected \"").concat(sum, "\""));
            return { prefix: prefix, words: words };
        }
        var decodeUnsafe = unsafeWrapper(decode);
        function decodeToBytes(str) {
            var _a = decode(str, false), prefix = _a.prefix, words = _a.words;
            return { prefix: prefix, words: words, bytes: fromWords(words) };
        }
        return { encode: encode, decode: decode, decodeToBytes: decodeToBytes, decodeUnsafe: decodeUnsafe, fromWords: fromWords, fromWordsUnsafe: fromWordsUnsafe, toWords: toWords };
    }
    base.bech32 = genBech32('bech32');
    base.bech32m = genBech32('bech32m');
    base.utf8 = {
        encode: function (data) { return new TextDecoder().decode(data); },
        decode: function (str) { return new TextEncoder().encode(str); },
    };
    base.hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(function (s) {
        if (typeof s !== 'string' || s.length % 2)
            throw new TypeError("hex.decode: expected string, got ".concat(typeof s, " with length ").concat(s.length));
        return s.toLowerCase();
    }));
    // prettier-ignore
    var CODERS = {
        utf8: base.utf8,
        hex: base.hex,
        base16: base.base16,
        base32: base.base32,
        base64: base.base64,
        base64url: base.base64url,
        base58: base.base58,
        base58xmr: base.base58xmr
    };
    var coderTypeError = "Invalid encoding type. Available types: ".concat(Object.keys(CODERS).join(', '));
    var bytesToString = function (type, bytes) {
        if (typeof type !== 'string' || !CODERS.hasOwnProperty(type))
            throw new TypeError(coderTypeError);
        if (!(bytes instanceof Uint8Array))
            throw new TypeError('bytesToString() expects Uint8Array');
        return CODERS[type].encode(bytes);
    };
    base.bytesToString = bytesToString;
    base.str = base.bytesToString; // as in python, but for bytes only
    var stringToBytes = function (type, str) {
        if (!CODERS.hasOwnProperty(type))
            throw new TypeError(coderTypeError);
        if (typeof str !== 'string')
            throw new TypeError('stringToBytes() expects string');
        return CODERS[type].decode(str);
    };
    base.stringToBytes = stringToBytes;
    base.bytes = base.stringToBytes;


    /****
     * 
     * 
     START OF SECP AND SCHNORR SECTION
     * 
     * 
     *****/


    const _nodeResolve_empty = {};

    const nodeCrypto = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    /*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    var _2n = BigInt(2);
    var _3n = BigInt(3);
    var _8n = BigInt(8);
    const CURVE = Object.freeze({
        a: _0n,
        b: BigInt(7),
        P: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
        n: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
        h: _1n,
        Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
        Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
    });
    function weistrass(x) {
        const { a, b } = CURVE;
        const x2 = mod(x * x);
        const x3 = mod(x2 * x);
        return mod(x3 + a * x + b);
    }
    const USE_ENDOMORPHISM = CURVE.a === _0n;
    class ShaError extends Error {
        constructor(message) {
            super(message);
        }
    }
    class JacobianPoint {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        static fromAffine(p) {
            if (!(p instanceof Point)) {
                throw new TypeError('JacobianPoint#fromAffine: expected Point');
            }
            return new JacobianPoint(p.x, p.y, _1n);
        }
        static toAffineBatch(points) {
            const toInv = invertBatch(points.map((p) => p.z));
            return points.map((p, i) => p.toAffine(toInv[i]));
        }
        static normalizeZ(points) {
            return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
        }
        equals(other) {
            if (!(other instanceof JacobianPoint))
                throw new TypeError('JacobianPoint expected');
            const { x: X1, y: Y1, z: Z1 } = this;
            const { x: X2, y: Y2, z: Z2 } = other;
            const Z1Z1 = mod(Z1 * Z1);
            const Z2Z2 = mod(Z2 * Z2);
            const U1 = mod(X1 * Z2Z2);
            const U2 = mod(X2 * Z1Z1);
            const S1 = mod(mod(Y1 * Z2) * Z2Z2);
            const S2 = mod(mod(Y2 * Z1) * Z1Z1);
            return U1 === U2 && S1 === S2;
        }
        negate() {
            return new JacobianPoint(this.x, mod(-this.y), this.z);
        }
        double() {
            const { x: X1, y: Y1, z: Z1 } = this;
            const A = mod(X1 * X1);
            const B = mod(Y1 * Y1);
            const C = mod(B * B);
            const x1b = X1 + B;
            const D = mod(_2n * (mod(x1b * x1b) - A - C));
            const E = mod(_3n * A);
            const F = mod(E * E);
            const X3 = mod(F - _2n * D);
            const Y3 = mod(E * (D - X3) - _8n * C);
            const Z3 = mod(_2n * Y1 * Z1);
            return new JacobianPoint(X3, Y3, Z3);
        }
        add(other) {
            if (!(other instanceof JacobianPoint))
                throw new TypeError('JacobianPoint expected');
            const { x: X1, y: Y1, z: Z1 } = this;
            const { x: X2, y: Y2, z: Z2 } = other;
            if (X2 === _0n || Y2 === _0n)
                return this;
            if (X1 === _0n || Y1 === _0n)
                return other;
            const Z1Z1 = mod(Z1 * Z1);
            const Z2Z2 = mod(Z2 * Z2);
            const U1 = mod(X1 * Z2Z2);
            const U2 = mod(X2 * Z1Z1);
            const S1 = mod(mod(Y1 * Z2) * Z2Z2);
            const S2 = mod(mod(Y2 * Z1) * Z1Z1);
            const H = mod(U2 - U1);
            const r = mod(S2 - S1);
            if (H === _0n) {
                if (r === _0n) {
                    return this.double();
                }
                else {
                    return JacobianPoint.ZERO;
                }
            }
            const HH = mod(H * H);
            const HHH = mod(H * HH);
            const V = mod(U1 * HH);
            const X3 = mod(r * r - HHH - _2n * V);
            const Y3 = mod(r * (V - X3) - S1 * HHH);
            const Z3 = mod(Z1 * Z2 * H);
            return new JacobianPoint(X3, Y3, Z3);
        }
        subtract(other) {
            return this.add(other.negate());
        }
        multiplyUnsafe(scalar) {
            const P0 = JacobianPoint.ZERO;
            if (typeof scalar === 'bigint' && scalar === _0n)
                return P0;
            let n = normalizeScalar(scalar);
            if (n === _1n)
                return this;
            if (!USE_ENDOMORPHISM) {
                let p = P0;
                let d = this;
                while (n > _0n) {
                    if (n & _1n)
                        p = p.add(d);
                    d = d.double();
                    n >>= _1n;
                }
                return p;
            }
            let { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
            let k1p = P0;
            let k2p = P0;
            let d = this;
            while (k1 > _0n || k2 > _0n) {
                if (k1 & _1n)
                    k1p = k1p.add(d);
                if (k2 & _1n)
                    k2p = k2p.add(d);
                d = d.double();
                k1 >>= _1n;
                k2 >>= _1n;
            }
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
            return k1p.add(k2p);
        }
        precomputeWindow(W) {
            const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
            const points = [];
            let p = this;
            let base = p;
            for (let window = 0; window < windows; window++) {
                base = p;
                points.push(base);
                for (let i = 1; i < 2 ** (W - 1); i++) {
                    base = base.add(p);
                    points.push(base);
                }
                p = base.double();
            }
            return points;
        }
        wNAF(n, affinePoint) {
            if (!affinePoint && this.equals(JacobianPoint.BASE))
                affinePoint = Point.BASE;
            const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;
            if (256 % W) {
                throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
            }
            let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
            if (!precomputes) {
                precomputes = this.precomputeWindow(W);
                if (affinePoint && W !== 1) {
                    precomputes = JacobianPoint.normalizeZ(precomputes);
                    pointPrecomputes.set(affinePoint, precomputes);
                }
            }
            let p = JacobianPoint.ZERO;
            let f = JacobianPoint.ZERO;
            const windows = 1 + (USE_ENDOMORPHISM ? 128 / W : 256 / W);
            const windowSize = 2 ** (W - 1);
            const mask = BigInt(2 ** W - 1);
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                let wbits = Number(n & mask);
                n >>= shiftBy;
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += _1n;
                }
                if (wbits === 0) {
                    let pr = precomputes[offset];
                    if (window % 2)
                        pr = pr.negate();
                    f = f.add(pr);
                }
                else {
                    let cached = precomputes[offset + Math.abs(wbits) - 1];
                    if (wbits < 0)
                        cached = cached.negate();
                    p = p.add(cached);
                }
            }
            return { p, f };
        }
        multiply(scalar, affinePoint) {
            let n = normalizeScalar(scalar);
            let point;
            let fake;
            if (USE_ENDOMORPHISM) {
                const { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
                let { p: k1p, f: f1p } = this.wNAF(k1, affinePoint);
                let { p: k2p, f: f2p } = this.wNAF(k2, affinePoint);
                if (k1neg)
                    k1p = k1p.negate();
                if (k2neg)
                    k2p = k2p.negate();
                k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
                point = k1p.add(k2p);
                fake = f1p.add(f2p);
            }
            else {
                const { p, f } = this.wNAF(n, affinePoint);
                point = p;
                fake = f;
            }
            return JacobianPoint.normalizeZ([point, fake])[0];
        }
        toAffine(invZ = invert(this.z)) {
            const { x, y, z } = this;
            const iz1 = invZ;
            const iz2 = mod(iz1 * iz1);
            const iz3 = mod(iz2 * iz1);
            const ax = mod(x * iz2);
            const ay = mod(y * iz3);
            const zz = mod(z * iz1);
            if (zz !== _1n)
                throw new Error('invZ was invalid');
            return new Point(ax, ay);
        }
    }
    JacobianPoint.BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n);
    JacobianPoint.ZERO = new JacobianPoint(_0n, _1n, _0n);
    const pointPrecomputes = new WeakMap();
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        _setWindowSize(windowSize) {
            this._WINDOW_SIZE = windowSize;
            pointPrecomputes.delete(this);
        }
        hasEvenY() {
            return this.y % _2n === _0n;
        }
        static fromCompressedHex(bytes) {
            const isShort = bytes.length === 32;
            const x = bytesToNumber(isShort ? bytes : bytes.subarray(1));
            if (!isValidFieldElement(x))
                throw new Error('Point is not on curve');
            const y2 = weistrass(x);
            let y = sqrtMod(y2);
            const isYOdd = (y & _1n) === _1n;
            if (isShort) {
                if (isYOdd)
                    y = mod(-y);
            }
            else {
                const isFirstByteOdd = (bytes[0] & 1) === 1;
                if (isFirstByteOdd !== isYOdd)
                    y = mod(-y);
            }
            const point = new Point(x, y);
            point.assertValidity();
            return point;
        }
        static fromUncompressedHex(bytes) {
            const x = bytesToNumber(bytes.subarray(1, 33));
            const y = bytesToNumber(bytes.subarray(33, 65));
            const point = new Point(x, y);
            point.assertValidity();
            return point;
        }
        static fromHex(hex) {
            const bytes = ensureBytes(hex);
            const len = bytes.length;
            const header = bytes[0];
            if (len === 32 || (len === 33 && (header === 0x02 || header === 0x03))) {
                return this.fromCompressedHex(bytes);
            }
            if (len === 65 && header === 0x04)
                return this.fromUncompressedHex(bytes);
            throw new Error(`Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ${len}`);
        }
        static fromPrivateKey(privateKey) {
            return Point.BASE.multiply(normalizePrivateKey(privateKey));
        }
        static fromSignature(msgHash, signature, recovery) {
            msgHash = ensureBytes(msgHash);
            const h = truncateHash(msgHash);
            const { r, s } = normalizeSignature(signature);
            if (recovery !== 0 && recovery !== 1) {
                throw new Error('Cannot recover signature: invalid recovery bit');
            }
            const prefix = recovery & 1 ? '03' : '02';
            const R = Point.fromHex(prefix + numTo32bStr(r));
            const { n } = CURVE;
            const rinv = invert(r, n);
            const u1 = mod(-h * rinv, n);
            const u2 = mod(s * rinv, n);
            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2);
            if (!Q)
                throw new Error('Cannot recover signature: point at infinify');
            Q.assertValidity();
            return Q;
        }
        toRawBytes(isCompressed = false) {
            return hexToBytes(this.toHex(isCompressed));
        }
        toHex(isCompressed = false) {
            const x = numTo32bStr(this.x);
            if (isCompressed) {
                const prefix = this.hasEvenY() ? '02' : '03';
                return `${prefix}${x}`;
            }
            else {
                return `04${x}${numTo32bStr(this.y)}`;
            }
        }
        toHexX() {
            return this.toHex(true).slice(2);
        }
        toRawX() {
            return this.toRawBytes(true).slice(1);
        }
        assertValidity() {
            const msg = 'Point is not on elliptic curve';
            const { x, y } = this;
            if (!isValidFieldElement(x) || !isValidFieldElement(y))
                throw new Error(msg);
            const left = mod(y * y);
            const right = weistrass(x);
            if (mod(left - right) !== _0n)
                throw new Error(msg);
        }
        equals(other) {
            return this.x === other.x && this.y === other.y;
        }
        negate() {
            return new Point(this.x, mod(-this.y));
        }
        double() {
            return JacobianPoint.fromAffine(this).double().toAffine();
        }
        add(other) {
            return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
        }
        subtract(other) {
            return this.add(other.negate());
        }
        multiply(scalar) {
            return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
        }
        multiplyAndAddUnsafe(Q, a, b) {
            const P = JacobianPoint.fromAffine(this);
            const aP = a === _0n || a === _1n || this !== Point.BASE ? P.multiplyUnsafe(a) : P.multiply(a);
            const bQ = JacobianPoint.fromAffine(Q).multiplyUnsafe(b);
            const sum = aP.add(bQ);
            return sum.equals(JacobianPoint.ZERO) ? undefined : sum.toAffine();
        }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy);
    Point.ZERO = new Point(_0n, _0n);
    function sliceDER(s) {
        return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
    }
    function parseDERInt(data) {
        if (data.length < 2 || data[0] !== 0x02) {
            throw new Error(`Invalid signature integer tag: ${bytesToHex(data)}`);
        }
        const len = data[1];
        const res = data.subarray(2, len + 2);
        if (!len || res.length !== len) {
            throw new Error(`Invalid signature integer: wrong length`);
        }
        if (res[0] === 0x00 && res[1] <= 0x7f) {
            throw new Error('Invalid signature integer: trailing length');
        }
        return { data: bytesToNumber(res), left: data.subarray(len + 2) };
    }
    function parseDERSignature(data) {
        if (data.length < 2 || data[0] != 0x30) {
            throw new Error(`Invalid signature tag: ${bytesToHex(data)}`);
        }
        if (data[1] !== data.length - 2) {
            throw new Error('Invalid signature: incorrect length');
        }
        const { data: r, left: sBytes } = parseDERInt(data.subarray(2));
        const { data: s, left: rBytesLeft } = parseDERInt(sBytes);
        if (rBytesLeft.length) {
            throw new Error(`Invalid signature: left bytes after parsing: ${bytesToHex(rBytesLeft)}`);
        }
        return { r, s };
    }
    class Signature {
        constructor(r, s) {
            this.r = r;
            this.s = s;
            this.assertValidity();
        }
        static fromCompact(hex) {
            const arr = hex instanceof Uint8Array;
            const name = 'Signature.fromCompact';
            if (typeof hex !== 'string' && !arr)
                throw new TypeError(`${name}: Expected string or Uint8Array`);
            const str = arr ? bytesToHex(hex) : hex;
            if (str.length !== 128)
                throw new Error(`${name}: Expected 64-byte hex`);
            return new Signature(hexToNumber(str.slice(0, 64)), hexToNumber(str.slice(64, 128)));
        }
        static fromDER(hex) {
            const arr = hex instanceof Uint8Array;
            if (typeof hex !== 'string' && !arr)
                throw new TypeError(`Signature.fromDER: Expected string or Uint8Array`);
            const { r, s } = parseDERSignature(arr ? hex : hexToBytes(hex));
            return new Signature(r, s);
        }
        static fromHex(hex) {
            return this.fromDER(hex);
        }
        assertValidity() {
            const { r, s } = this;
            if (!isWithinCurveOrder(r))
                throw new Error('Invalid Signature: r must be 0 < r < n');
            if (!isWithinCurveOrder(s))
                throw new Error('Invalid Signature: s must be 0 < s < n');
        }
        hasHighS() {
            const HALF = CURVE.n >> _1n;
            return this.s > HALF;
        }
        normalizeS() {
            return this.hasHighS() ? new Signature(this.r, CURVE.n - this.s) : this;
        }
        toDERRawBytes(isCompressed = false) {
            return hexToBytes(this.toDERHex(isCompressed));
        }
        toDERHex(isCompressed = false) {
            const sHex = sliceDER(numberToHexUnpadded(this.s));
            if (isCompressed)
                return sHex;
            const rHex = sliceDER(numberToHexUnpadded(this.r));
            const rLen = numberToHexUnpadded(rHex.length / 2);
            const sLen = numberToHexUnpadded(sHex.length / 2);
            const length = numberToHexUnpadded(rHex.length / 2 + sHex.length / 2 + 4);
            return `30${length}02${rLen}${rHex}02${sLen}${sHex}`;
        }
        toRawBytes() {
            return this.toDERRawBytes();
        }
        toHex() {
            return this.toDERHex();
        }
        toCompactRawBytes() {
            return hexToBytes(this.toCompactHex());
        }
        toCompactHex() {
            return numTo32bStr(this.r) + numTo32bStr(this.s);
        }
    }
    function concatBytes(...arrays) {
        if (!arrays.every((b) => b instanceof Uint8Array))
            throw new Error('Uint8Array list expected');
        if (arrays.length === 1)
            return arrays[0];
        const length = arrays.reduce((a, arr) => a + arr.length, 0);
        const result = new Uint8Array(length);
        for (let i = 0, pad = 0; i < arrays.length; i++) {
            const arr = arrays[i];
            result.set(arr, pad);
            pad += arr.length;
        }
        return result;
    }
    var hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
    function bytesToHex(uint8a) {
        if (!(uint8a instanceof Uint8Array))
            throw new Error('Expected Uint8Array');
        let hex = '';
        for (let i = 0; i < uint8a.length; i++) {
            hex += hexes[uint8a[i]];
        }
        return hex;
    }

    secp.bytesToHex = bytesToHex

    const POW_2_256 = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000');
    function numTo32bStr(num) {
        if (typeof num !== 'bigint')
            throw new Error('Expected bigint');
        if (!(_0n <= num && num < POW_2_256))
            throw new Error('Expected number < 2^256');
        return num.toString(16).padStart(64, '0');
    }
    function numTo32b(num) {
        const b = hexToBytes(numTo32bStr(num));
        if (b.length !== 32)
            throw new Error('Error: expected 32 bytes');
        return b;
    }
    function numberToHexUnpadded(num) {
        const hex = num.toString(16);
        return hex.length & 1 ? `0${hex}` : hex;
    }
    function hexToNumber(hex) {
        if (typeof hex !== 'string') {
            throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
        }
        return BigInt(`0x${hex}`);
    }

    secp.hexToNumber = hexToNumber;

    function hexToBytes(hex) {
        if (typeof hex !== 'string') {
            throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
        }
        if (hex.length % 2)
            throw new Error('hexToBytes: received invalid unpadded hex' + hex.length);
        const array = new Uint8Array(hex.length / 2);
        for (let i = 0; i < array.length; i++) {
            const j = i * 2;
            const hexByte = hex.slice(j, j + 2);
            const byte = Number.parseInt(hexByte, 16);
            if (Number.isNaN(byte) || byte < 0)
                throw new Error('Invalid byte sequence');
            array[i] = byte;
        }
        return array;
    }

    secp.hexToBytes = hexToBytes;

    function bytesToNumber(bytes) {
        return hexToNumber(bytesToHex(bytes));
    }

    secp.bytesToNumber = bytesToNumber;

    function ensureBytes(hex) {
        return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
    }
    function normalizeScalar(num) {
        if (typeof num === 'number' && Number.isSafeInteger(num) && num > 0)
            return BigInt(num);
        if (typeof num === 'bigint' && isWithinCurveOrder(num))
            return num;
        throw new TypeError('Expected valid private scalar: 0 < scalar < curve.n');
    }
    function mod(a, b = CURVE.P) {
        const result = a % b;
        return result >= _0n ? result : b + result;
    }
    function pow2(x, power) {
        const { P } = CURVE;
        let res = x;
        while (power-- > _0n) {
            res *= res;
            res %= P;
        }
        return res;
    }
    function sqrtMod(x) {
        const { P } = CURVE;
        const _6n = BigInt(6);
        const _11n = BigInt(11);
        const _22n = BigInt(22);
        const _23n = BigInt(23);
        const _44n = BigInt(44);
        const _88n = BigInt(88);
        const b2 = (x * x * x) % P;
        const b3 = (b2 * b2 * x) % P;
        const b6 = (pow2(b3, _3n) * b3) % P;
        const b9 = (pow2(b6, _3n) * b3) % P;
        const b11 = (pow2(b9, _2n) * b2) % P;
        const b22 = (pow2(b11, _11n) * b11) % P;
        const b44 = (pow2(b22, _22n) * b22) % P;
        const b88 = (pow2(b44, _44n) * b44) % P;
        const b176 = (pow2(b88, _88n) * b88) % P;
        const b220 = (pow2(b176, _44n) * b44) % P;
        const b223 = (pow2(b220, _3n) * b3) % P;
        const t1 = (pow2(b223, _23n) * b22) % P;
        const t2 = (pow2(t1, _6n) * b2) % P;
        return pow2(t2, _2n);
    }
    function invert(number, modulo = CURVE.P) {
        if (number === _0n || modulo <= _0n) {
            throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
        }
        let a = mod(number, modulo);
        let b = modulo;
        let x = _0n, u = _1n;
        while (a !== _0n) {
            const q = b / a;
            const r = b % a;
            const m = x - u * q;
            b = a, a = r, x = u, u = m;
        }
        const gcd = b;
        if (gcd !== _1n)
            throw new Error('invert: does not exist');
        return mod(x, modulo);
    }
    function invertBatch(nums, p = CURVE.P) {
        const scratch = new Array(nums.length);
        const lastMultiplied = nums.reduce((acc, num, i) => {
            if (num === _0n)
                return acc;
            scratch[i] = acc;
            return mod(acc * num, p);
        }, _1n);
        const inverted = invert(lastMultiplied, p);
        nums.reduceRight((acc, num, i) => {
            if (num === _0n)
                return acc;
            scratch[i] = mod(acc * scratch[i], p);
            return mod(acc * num, p);
        }, inverted);
        return scratch;
    }
    const divNearest = (a, b) => (a + b / _2n) / b;
    const ENDO = {
        a1: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
        b1: -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3'),
        a2: BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8'),
        b2: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
        POW_2_128: BigInt('0x100000000000000000000000000000000'),
    };
    function splitScalarEndo(k) {
        const { n } = CURVE;
        const { a1, b1, a2, b2, POW_2_128 } = ENDO;
        const c1 = divNearest(b2 * k, n);
        const c2 = divNearest(-b1 * k, n);
        let k1 = mod(k - c1 * a1 - c2 * a2, n);
        let k2 = mod(-c1 * b1 - c2 * b2, n);
        const k1neg = k1 > POW_2_128;
        const k2neg = k2 > POW_2_128;
        if (k1neg)
            k1 = n - k1;
        if (k2neg)
            k2 = n - k2;
        if (k1 > POW_2_128 || k2 > POW_2_128) {
            throw new Error('splitScalarEndo: Endomorphism failed, k=' + k);
        }
        return { k1neg, k1, k2neg, k2 };
    }
    function truncateHash(hash) {
        const { n } = CURVE;
        const byteLength = hash.length;
        const delta = byteLength * 8 - 256;
        let h = bytesToNumber(hash);
        if (delta > 0)
            h = h >> BigInt(delta);
        if (h >= n)
            h -= n;
        return h;
    }
    let _sha256Sync;
    let _hmacSha256Sync;
    class HmacDrbg {
        constructor() {
            this.v = new Uint8Array(32).fill(1);
            this.k = new Uint8Array(32).fill(0);
            this.counter = 0;
        }
        hmac(...values) {
            return utils.hmacSha256(this.k, ...values);
        }
        hmacSync(...values) {
            return _hmacSha256Sync(this.k, ...values);
        }
        checkSync() {
            if (typeof _hmacSha256Sync !== 'function')
                throw new ShaError('hmacSha256Sync needs to be set');
        }
        incr() {
            if (this.counter >= 1000)
                throw new Error('Tried 1,000 k values for sign(), all were invalid');
            this.counter += 1;
        }
        async reseed(seed = new Uint8Array()) {
            this.k = await this.hmac(this.v, Uint8Array.from([0x00]), seed);
            this.v = await this.hmac(this.v);
            if (seed.length === 0)
                return;
            this.k = await this.hmac(this.v, Uint8Array.from([0x01]), seed);
            this.v = await this.hmac(this.v);
        }
        reseedSync(seed = new Uint8Array()) {
            this.checkSync();
            this.k = this.hmacSync(this.v, Uint8Array.from([0x00]), seed);
            this.v = this.hmacSync(this.v);
            if (seed.length === 0)
                return;
            this.k = this.hmacSync(this.v, Uint8Array.from([0x01]), seed);
            this.v = this.hmacSync(this.v);
        }
        async generate() {
            this.incr();
            this.v = await this.hmac(this.v);
            return this.v;
        }
        generateSync() {
            this.checkSync();
            this.incr();
            this.v = this.hmacSync(this.v);
            return this.v;
        }
    }
    function isWithinCurveOrder(num) {
        return _0n < num && num < CURVE.n;
    }
    function isValidFieldElement(num) {
        return _0n < num && num < CURVE.P;
    }
    function kmdToSig(kBytes, m, d) {
        const k = bytesToNumber(kBytes);
        if (!isWithinCurveOrder(k))
            return;
        const { n } = CURVE;
        const q = Point.BASE.multiply(k);
        const r = mod(q.x, n);
        if (r === _0n)
            return;
        const s = mod(invert(k, n) * mod(m + d * r, n), n);
        if (s === _0n)
            return;
        const sig = new Signature(r, s);
        const recovery = (q.x === sig.r ? 0 : 2) | Number(q.y & _1n);
        return { sig, recovery };
    }
    function normalizePrivateKey(key) {
        let num;
        if (typeof key === 'bigint') {
            num = key;
        }
        else if (typeof key === 'number' && Number.isSafeInteger(key) && key > 0) {
            num = BigInt(key);
        }
        else if (typeof key === 'string') {
            if (key.length !== 64)
                throw new Error('Expected 32 bytes of private key');
            num = hexToNumber(key);
        }
        else if (key instanceof Uint8Array) {
            if (key.length !== 32)
                throw new Error('Expected 32 bytes of private key');
            num = bytesToNumber(key);
        }
        else {
            throw new TypeError('Expected valid private key');
        }
        if (!isWithinCurveOrder(num))
            throw new Error('Expected private key: 0 < key < n');
        return num;
    }
    function normalizePublicKey(publicKey) {
        if (publicKey instanceof Point) {
            publicKey.assertValidity();
            return publicKey;
        }
        else {
            return Point.fromHex(publicKey);
        }
    }
    function normalizeSignature(signature) {
        if (signature instanceof Signature) {
            signature.assertValidity();
            return signature;
        }
        try {
            return Signature.fromDER(signature);
        }
        catch (error) {
            return Signature.fromCompact(signature);
        }
    }
    function getPublicKey(privateKey, isCompressed = false) {
        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
    }
    function recoverPublicKey(msgHash, signature, recovery, isCompressed = false) {
        return Point.fromSignature(msgHash, signature, recovery).toRawBytes(isCompressed);
    }
    function isProbPub(item) {
        const arr = item instanceof Uint8Array;
        const str = typeof item === 'string';
        const len = (arr || str) && item.length;
        if (arr)
            return len === 33 || len === 65;
        if (str)
            return len === 66 || len === 130;
        if (item instanceof Point)
            return true;
        return false;
    }
    function getSharedSecret(privateA, publicB, isCompressed = false) {
        if (isProbPub(privateA))
            throw new TypeError('getSharedSecret: first arg must be private key');
        if (!isProbPub(publicB))
            throw new TypeError('getSharedSecret: second arg must be public key');
        const b = normalizePublicKey(publicB);
        b.assertValidity();
        return b.multiply(normalizePrivateKey(privateA)).toRawBytes(isCompressed);
    }
    function bits2int(bytes) {
        const slice = bytes.length > 32 ? bytes.slice(0, 32) : bytes;
        return bytesToNumber(slice);
    }
    function bits2octets(bytes) {
        const z1 = bits2int(bytes);
        const z2 = mod(z1, CURVE.n);
        return int2octets(z2 < _0n ? z1 : z2);
    }
    function int2octets(num) {
        return numTo32b(num);
    }
    function initSigArgs(msgHash, privateKey, extraEntropy) {
        if (msgHash == null)
            throw new Error(`sign: expected valid message hash, not "${msgHash}"`);
        const h1 = ensureBytes(msgHash);
        const d = normalizePrivateKey(privateKey);
        const seedArgs = [int2octets(d), bits2octets(h1)];
        if (extraEntropy != null) {
            if (extraEntropy === true)
                extraEntropy = utils.randomBytes(32);
            const e = ensureBytes(extraEntropy);
            if (e.length !== 32)
                throw new Error('sign: Expected 32 bytes of extra data');
            seedArgs.push(e);
        }
        const seed = concatBytes(...seedArgs);
        const m = bits2int(h1);
        return { seed, m, d };
    }
    function finalizeSig(recSig, opts) {
        let { sig, recovery } = recSig;
        const { canonical, der, recovered } = Object.assign({ canonical: true, der: true }, opts);
        if (canonical && sig.hasHighS()) {
            sig = sig.normalizeS();
            recovery ^= 1;
        }
        const hashed = der ? sig.toDERRawBytes() : sig.toCompactRawBytes();
        return recovered ? [hashed, recovery] : hashed;
    }
    async function sign(msgHash, privKey, opts = {}) {
        const { seed, m, d } = initSigArgs(msgHash, privKey, opts.extraEntropy);
        let sig;
        const drbg = new HmacDrbg();
        await drbg.reseed(seed);
        while (!(sig = kmdToSig(await drbg.generate(), m, d)))
            await drbg.reseed();
        return finalizeSig(sig, opts);
    }
    function signSync(msgHash, privKey, opts = {}) {
        const { seed, m, d } = initSigArgs(msgHash, privKey, opts.extraEntropy);
        let sig;
        const drbg = new HmacDrbg();
        drbg.reseedSync(seed);
        while (!(sig = kmdToSig(drbg.generateSync(), m, d)))
            drbg.reseedSync();
        return finalizeSig(sig, opts);
    }
    const vopts = { strict: true };
    function verify(signature, msgHash, publicKey, opts = vopts) {
        let sig;
        try {
            sig = normalizeSignature(signature);
            msgHash = ensureBytes(msgHash);
        }
        catch (error) {
            return false;
        }
        const { r, s } = sig;
        if (opts.strict && sig.hasHighS())
            return false;
        const h = truncateHash(msgHash);
        let P;
        try {
            P = normalizePublicKey(publicKey);
        }
        catch (error) {
            return false;
        }
        const { n } = CURVE;
        const sinv = invert(s, n);
        const u1 = mod(h * sinv, n);
        const u2 = mod(r * sinv, n);
        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2);
        if (!R)
            return false;
        const v = mod(R.x, n);
        return v === r;
    }
    function schnorrChallengeFinalize(ch) {
        return mod(bytesToNumber(ch), CURVE.n);
    }
    class SchnorrSignature {
        constructor(r, s) {
            this.r = r;
            this.s = s;
            this.assertValidity();
        }
        static fromHex(hex) {
            const bytes = ensureBytes(hex);
            if (bytes.length !== 64)
                throw new TypeError(`SchnorrSignature.fromHex: expected 64 bytes, not ${bytes.length}`);
            const r = bytesToNumber(bytes.subarray(0, 32));
            const s = bytesToNumber(bytes.subarray(32, 64));
            return new SchnorrSignature(r, s);
        }
        assertValidity() {
            const { r, s } = this;
            if (!isValidFieldElement(r) || !isWithinCurveOrder(s))
                throw new Error('Invalid signature');
        }
        toHex() {
            return numTo32bStr(this.r) + numTo32bStr(this.s);
        }
        toRawBytes() {
            return hexToBytes(this.toHex());
        }
    }
    function schnorrGetPublicKey(privateKey) {
        return Point.fromPrivateKey(privateKey).toRawX();
    }
    class InternalSchnorrSignature {
        constructor(message, privateKey, auxRand = utils.randomBytes()) {
            if (message == null)
                throw new TypeError(`sign: Expected valid message, not "${message}"`);
            this.m = ensureBytes(message);
            const { x, scalar } = this.getScalar(normalizePrivateKey(privateKey));
            this.px = x;
            this.d = scalar;
            this.rand = ensureBytes(auxRand);
            if (this.rand.length !== 32)
                throw new TypeError('sign: Expected 32 bytes of aux randomness');
        }
        getScalar(priv) {
            const point = Point.fromPrivateKey(priv);
            const scalar = point.hasEvenY() ? priv : CURVE.n - priv;
            return { point, scalar, x: point.toRawX() };
        }
        initNonce(d, t0h) {
            return numTo32b(d ^ bytesToNumber(t0h));
        }
        finalizeNonce(k0h) {
            const k0 = mod(bytesToNumber(k0h), CURVE.n);
            if (k0 === _0n)
                throw new Error('sign: Creation of signature failed. k is zero');
            const { point: R, x: rx, scalar: k } = this.getScalar(k0);
            return { R, rx, k };
        }
        finalizeSig(R, k, e, d) {
            return new SchnorrSignature(R.x, mod(k + e * d, CURVE.n)).toRawBytes();
        }
        error() {
            throw new Error('sign: Invalid signature produced');
        }
        async calc() {
            const { m, d, px, rand } = this;
            const tag = utils.taggedHash;
            const t = this.initNonce(d, await tag(TAGS.aux, rand));
            const { R, rx, k } = this.finalizeNonce(await tag(TAGS.nonce, t, px, m));
            const e = schnorrChallengeFinalize(await tag(TAGS.challenge, rx, px, m));
            const sig = this.finalizeSig(R, k, e, d);
            if (!(await schnorrVerify(sig, m, px)))
                this.error();
            return sig;
        }
        calcSync() {
            const { m, d, px, rand } = this;
            const tag = utils.taggedHashSync;
            const t = this.initNonce(d, tag(TAGS.aux, rand));
            const { R, rx, k } = this.finalizeNonce(tag(TAGS.nonce, t, px, m));
            const e = schnorrChallengeFinalize(tag(TAGS.challenge, rx, px, m));
            const sig = this.finalizeSig(R, k, e, d);
            if (!schnorrVerifySync(sig, m, px))
                this.error();
            return sig;
        }
    }
    async function schnorrSign(msg, privKey, auxRand) {
        return new InternalSchnorrSignature(msg, privKey, auxRand).calc();
    }
    function schnorrSignSync(msg, privKey, auxRand) {
        return new InternalSchnorrSignature(msg, privKey, auxRand).calcSync();
    }
    function initSchnorrVerify(signature, message, publicKey) {
        const raw = signature instanceof SchnorrSignature;
        const sig = raw ? signature : SchnorrSignature.fromHex(signature);
        if (raw)
            sig.assertValidity();
        return {
            ...sig,
            m: ensureBytes(message),
            P: normalizePublicKey(publicKey),
        };
    }
    function finalizeSchnorrVerify(r, P, s, e) {
        const R = Point.BASE.multiplyAndAddUnsafe(P, normalizePrivateKey(s), mod(-e, CURVE.n));
        if (!R || !R.hasEvenY() || R.x !== r)
            return false;
        return true;
    }
    async function schnorrVerify(signature, message, publicKey) {
        try {
            const { r, s, m, P } = initSchnorrVerify(signature, message, publicKey);
            const e = schnorrChallengeFinalize(await utils.taggedHash(TAGS.challenge, numTo32b(r), P.toRawX(), m));
            return finalizeSchnorrVerify(r, P, s, e);
        }
        catch (error) {
            return false;
        }
    }
    function schnorrVerifySync(signature, message, publicKey) {
        try {
            const { r, s, m, P } = initSchnorrVerify(signature, message, publicKey);
            const e = schnorrChallengeFinalize(utils.taggedHashSync(TAGS.challenge, numTo32b(r), P.toRawX(), m));
            return finalizeSchnorrVerify(r, P, s, e);
        }
        catch (error) {
            if (error instanceof ShaError)
                throw error;
            return false;
        }
    }
    const schnorr = {
        Signature: SchnorrSignature,
        getPublicKey: schnorrGetPublicKey,
        sign: schnorrSign,
        verify: schnorrVerify,
        signSync: schnorrSignSync,
        verifySync: schnorrVerifySync,
    };
    Point.BASE._setWindowSize(8);
    const crypto = {
        node: nodeCrypto,
        web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined,
    };
    const TAGS = {
        challenge: 'BIP0340/challenge',
        aux: 'BIP0340/aux',
        nonce: 'BIP0340/nonce',
    };
    const TAGGED_HASH_PREFIXES = {};
    var utils = {
        bytesToHex,
        hexToBytes,
        randomBytes,
        concatBytes,
        mod,
        invert,
        isValidPrivateKey(privateKey) {
            try {
                normalizePrivateKey(privateKey);
                return true;
            }
            catch (error) {
                return false;
            }
        },
        _bigintTo32Bytes: numTo32b,
        _normalizePrivateKey: normalizePrivateKey,
        hashToPrivateKey: (hash) => {
            hash = ensureBytes(hash);
            if (hash.length < 40 || hash.length > 1024)
                throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
            const num = mod(bytesToNumber(hash), CURVE.n - _1n) + _1n;
            return numTo32b(num);
        },
        randomBytes: (bytesLength = 32) => {
            if (crypto.web) {
                return crypto.web.getRandomValues(new Uint8Array(bytesLength));
            }
            else if (crypto.node) {
                const { randomBytes } = crypto.node;
                return Uint8Array.from(randomBytes(bytesLength));
            }
            else {
                throw new Error("The environment doesn't have randomBytes function");
            }
        },
        randomPrivateKey: () => {
            return utils.hashToPrivateKey(utils.randomBytes(40));
        },
        sha256: async (...messages) => {
            if (crypto.web) {
                const buffer = await crypto.web.subtle.digest('SHA-256', concatBytes(...messages));
                return new Uint8Array(buffer);
            }
            else if (crypto.node) {
                const { createHash } = crypto.node;
                const hash = createHash('sha256');
                messages.forEach((m) => hash.update(m));
                return Uint8Array.from(hash.digest());
            }
            else {
                throw new Error("The environment doesn't have sha256 function");
            }
        },
        hmacSha256: async (key, ...messages) => {
            if (crypto.web) {
                const ckey = await crypto.web.subtle.importKey('raw', key, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign']);
                const message = concatBytes(...messages);
                const buffer = await crypto.web.subtle.sign('HMAC', ckey, message);
                return new Uint8Array(buffer);
            }
            else if (crypto.node) {
                const { createHmac } = crypto.node;
                const hash = createHmac('sha256', key);
                messages.forEach((m) => hash.update(m));
                return Uint8Array.from(hash.digest());
            }
            else {
                throw new Error("The environment doesn't have hmac-sha256 function");
            }
        },
        sha256Sync: undefined,
        hmacSha256Sync: undefined,
        taggedHash: async (tag, ...messages) => {
            let tagP = TAGGED_HASH_PREFIXES[tag];
            if (tagP === undefined) {
                const tagH = await utils.sha256(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
                tagP = concatBytes(tagH, tagH);
                TAGGED_HASH_PREFIXES[tag] = tagP;
            }
            return utils.sha256(tagP, ...messages);
        },
        taggedHashSync: (tag, ...messages) => {
            if (typeof _sha256Sync !== 'function')
                throw new ShaError('sha256Sync is undefined, you need to set it');
            let tagP = TAGGED_HASH_PREFIXES[tag];
            if (tagP === undefined) {
                const tagH = _sha256Sync(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
                tagP = concatBytes(tagH, tagH);
                TAGGED_HASH_PREFIXES[tag] = tagP;
            }
            return _sha256Sync(tagP, ...messages);
        },
        precompute(windowSize = 8, point = Point.BASE) {
            const cached = point === Point.BASE ? point : new Point(point.x, point.y);
            cached._setWindowSize(windowSize);
            cached.multiply(_3n);
            return cached;
        },
    };
    Object.defineProperties(utils, {
        sha256Sync: {
            configurable: false,
            get() {
                return _sha256Sync;
            },
            set(val) {
                if (!_sha256Sync)
                    _sha256Sync = val;
            },
        },
        hmacSha256Sync: {
            configurable: false,
            get() {
                return _hmacSha256Sync;
            },
            set(val) {
                if (!_hmacSha256Sync)
                    _hmacSha256Sync = val;
            },
        },
    });

    //var secp = {};

    secp.CURVE = CURVE;
    secp.Point = Point;
    secp.Signature = Signature;
    secp.getPublicKey = getPublicKey;
    secp.getSharedSecret = getSharedSecret;
    secp.recoverPublicKey = recoverPublicKey;
    secp.schnorr = schnorr;
    secp.sign = sign;
    secp.signSync = signSync;
    secp.utils = utils;
    secp.verify = verify;



    /******
     * 
     START OF HASH SECTION 
     * 
     * 
     ******/


    //hashmini = {};
    /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // Cast array to different type
    const u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    // Cast array to view
    const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    // The rotate right (circular right shift) operation for uint32
    const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
    const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
    // There is almost no big endian hardware, but js typed arrays uses platform specific endianness.
    // So, just to be sure not to corrupt anything.
    if (!isLE)
        throw new Error('Non little-endian hardware is not supported');
    var hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
    /**
     * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
     */
    function bytesToHex(uint8a) {
        // pre-caching improves the speed 6x
        if (!(uint8a instanceof Uint8Array))
            throw new Error('Uint8Array expected');
        let hex = '';
        for (let i = 0; i < uint8a.length; i++) {
            hex += hexes[uint8a[i]];
        }
        return hex;
    }
    /**
     * @example hexToBytes('deadbeef')
     */
    function hexToBytes(hex) {
        if (typeof hex !== 'string') {
            throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
        }
        if (hex.length % 2)
            throw new Error('hexToBytes: received invalid unpadded hex');
        const array = new Uint8Array(hex.length / 2);
        for (let i = 0; i < array.length; i++) {
            const j = i * 2;
            const hexByte = hex.slice(j, j + 2);
            const byte = Number.parseInt(hexByte, 16);
            if (Number.isNaN(byte) || byte < 0)
                throw new Error('Invalid byte sequence');
            array[i] = byte;
        }
        return array;
    }
    // There is no setImmediate in browser and setTimeout is slow. However, call to async function will return Promise
    // which will be fullfiled only on next scheduler queue processing step and this is exactly what we need.
    const nextTick = async () => { };
    // Returns control to thread each 'tick' ms to avoid blocking
    async function asyncLoop(iters, tick, cb) {
        let ts = Date.now();
        for (let i = 0; i < iters; i++) {
            cb(i);
            // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
            const diff = Date.now() - ts;
            if (diff >= 0 && diff < tick)
                continue;
            await nextTick();
            ts += diff;
        }
    }
    function utf8ToBytes(str) {
        if (typeof str !== 'string') {
            throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
        }
        return new TextEncoder().encode(str);
    }
    function toBytes(data) {
        if (typeof data === 'string')
            data = utf8ToBytes(data);
        if (!(data instanceof Uint8Array))
            throw new TypeError(`Expected input type is Uint8Array (got ${typeof data})`);
        return data;
    }
    // For runtime check if class implements interface
    class Hash {
        // Safe version that clones internal state
        clone() {
            return this._cloneInto();
        }
    }
    // Check if object doens't have custom constructor (like Uint8Array/Array)
    var isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
    function checkOpts(defaults, opts) {
        if (opts !== undefined && (typeof opts !== 'object' || !isPlainObject(opts)))
            throw new TypeError('Options should be object or undefined');
        const merged = Object.assign(defaults, opts);
        return merged;
    }
    function wrapConstructor(hashConstructor) {
        const hashC = (message) => hashConstructor().update(toBytes(message)).digest();
        const tmp = hashConstructor();
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = () => hashConstructor();
        return hashC;
    }
    function wrapConstructorWithOpts(hashCons) {
        const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
        const tmp = hashCons({});
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = (opts) => hashCons(opts);
        return hashC;
    }
    /**
     * Secure PRNG
     */
    function randomBytes(bytesLength = 32) {
        if (crypto.crypto.web) {
            return crypto.crypto.web.getRandomValues(new Uint8Array(bytesLength));
        }
        else if (crypto.crypto.node) {
            return new Uint8Array(crypto.crypto.node.randomBytes(bytesLength).buffer);
        }
        else {
            throw new Error("The environment doesn't have randomBytes function");
        }
    }

    function number(n) {
        if (!Number.isSafeInteger(n) || n < 0)
            throw new Error(`Wrong positive integer: ${n}`);
    }
    function bool(b) {
        if (typeof b !== 'boolean')
            throw new Error(`Expected boolean, not ${b}`);
    }
    function bytes(b, ...lengths) {
        if (!(b instanceof Uint8Array))
            throw new TypeError('Expected Uint8Array');
        if (lengths.length > 0 && !lengths.includes(b.length))
            throw new TypeError(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
    }
    function isNumber(inputValue) {
        return !isNaN(parseFloat(inputValue)) && isFinite(inputValue);
    }
    function hash(hash) {
        if (typeof hash !== 'function' || typeof hash.create !== 'function')
            throw new Error('Hash should be wrapped by utils.wrapConstructor');
        //ROHIT I put it inTry catch block because it was crashing the Transaction Signature
        try {
            isNumber(hash.outputLen);
            isNumber(hash.blockLen);
        } catch (error) {
            return;
        }
    }

    /* //ORIGINAL FUNCTION
        function hash(hash) {
            if (typeof hash !== 'function' || typeof hash.create !== 'function')
                throw new Error('Hash should be wrapped by utils.wrapConstructor');
            
            number(hash.outputLen);
            number(hash.blockLen);
            
        }*/

    function exists(instance, checkFinished = true) {
        if (instance.destroyed)
            throw new Error('Hash instance has been destroyed');
        if (checkFinished && instance.finished)
            throw new Error('Hash#digest() has already been called');
    }
    function output(out, instance) {
        bytes(out);
        const min = instance.outputLen;
        if (out.length < min) {
            throw new Error(`digestInto() expects output buffer of length at least ${min}`);
        }
    }
    const assert = {
        number,
        bool,
        bytes,
        hash,
        exists,
        output,
    };

    // prettier-ignore
    const SIGMA$1 = new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
        11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
        7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
        9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
        2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
        12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
        13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
        6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
        10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
        // For BLAKE2b, the two extra permutations for rounds 10 and 11 are SIGMA[10..11] = SIGMA[0..1].
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    ]);
    class BLAKE2 extends Hash {
        constructor(blockLen, outputLen, opts = {}, keyLen, saltLen, persLen) {
            super();
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.length = 0;
            this.pos = 0;
            this.finished = false;
            this.destroyed = false;
            assert.number(blockLen);
            assert.number(outputLen);
            assert.number(keyLen);
            if (outputLen < 0 || outputLen > keyLen)
                throw new Error('Blake2: outputLen bigger than keyLen');
            if (opts.key !== undefined && (opts.key.length < 1 || opts.key.length > keyLen))
                throw new Error(`Key should be up 1..${keyLen} byte long or undefined`);
            if (opts.salt !== undefined && opts.salt.length !== saltLen)
                throw new Error(`Salt should be ${saltLen} byte long or undefined`);
            if (opts.personalization !== undefined && opts.personalization.length !== persLen)
                throw new Error(`Personalization should be ${persLen} byte long or undefined`);
            this.buffer32 = u32((this.buffer = new Uint8Array(blockLen)));
        }
        update(data) {
            assert.exists(this);
            // Main difference with other hashes: there is flag for last block,
            // so we cannot process current block before we know that there
            // is the next one. This significantly complicates logic and reduces ability
            // to do zero-copy processing
            const { blockLen, buffer, buffer32 } = this;
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                // If buffer is full and we still have input (don't process last block, same as blake2s)
                if (this.pos === blockLen) {
                    this.compress(buffer32, 0, false);
                    this.pos = 0;
                }
                const take = Math.min(blockLen - this.pos, len - pos);
                const dataOffset = data.byteOffset + pos;
                // full block && aligned to 4 bytes && not last in input
                if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
                    const data32 = new Uint32Array(data.buffer, dataOffset, Math.floor((len - pos) / 4));
                    for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
                        this.length += blockLen;
                        this.compress(data32, pos32, false);
                    }
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                this.length += take;
                pos += take;
            }
            return this;
        }
        digestInto(out) {
            assert.exists(this);
            assert.output(out, this);
            const { pos, buffer32 } = this;
            this.finished = true;
            // Padding
            this.buffer.subarray(pos).fill(0);
            this.compress(buffer32, 0, true);
            const out32 = u32(out);
            this.get().forEach((v, i) => (out32[i] = v));
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            const { buffer, length, finished, destroyed, outputLen, pos } = this;
            to || (to = new this.constructor({ dkLen: outputLen }));
            to.set(...this.get());
            to.length = length;
            to.finished = finished;
            to.destroyed = destroyed;
            to.outputLen = outputLen;
            to.buffer.set(buffer);
            to.pos = pos;
            return to;
        }
    }

    const U32_MASK64 = BigInt(2 ** 32 - 1);
    const _32n = BigInt(32);
    // We are not using BigUint64Array, because they are extremely slow as per 2022
    function fromBig(n, le = false) {
        if (le)
            return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
        return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
    }
    function split(lst, le = false) {
        let Ah = new Uint32Array(lst.length);
        let Al = new Uint32Array(lst.length);
        for (let i = 0; i < lst.length; i++) {
            const { h, l } = fromBig(lst[i], le);
            [Ah[i], Al[i]] = [h, l];
        }
        return [Ah, Al];
    }
    const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
    // for Shift in [0, 32)
    const shrSH = (h, l, s) => h >>> s;
    const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // Right rotate for Shift in [1, 32)
    const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
    const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // Right rotate for Shift in (32, 64), NOTE: 32 is special case.
    const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
    const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
    // Right rotate for shift===32 (just swaps l&h)
    const rotr32H = (h, l) => l;
    const rotr32L = (h, l) => h;
    // Left rotate for Shift in [1, 32)
    const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
    const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
    // Left rotate for Shift in (32, 64), NOTE: 32 is special case.
    const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
    const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
    // JS uses 32-bit signed integers for bitwise operations which means we cannot
    // simple take carry out of low bit sum by shift, we need to use division.
    // Removing "export" has 5% perf penalty -_-
    function add(Ah, Al, Bh, Bl) {
        const l = (Al >>> 0) + (Bl >>> 0);
        return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
    }
    // Addition with more than 2 elements
    const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
    const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
    const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
    const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
    const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
    // prettier-ignore
    const u64 = {
        fromBig, split, toBig,
        shrSH, shrSL,
        rotrSH, rotrSL, rotrBH, rotrBL,
        rotr32H, rotr32L,
        rotlSH, rotlSL, rotlBH, rotlBL,
        add, add3L, add3H, add4L, add4H, add5H, add5L,
    };

    // Same as SHA-512 but LE
    // prettier-ignore
    const IV$2 = new Uint32Array([
        0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
        0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19
    ]);
    // Temporary buffer
    const BUF$1 = new Uint32Array(32);
    // Mixing function G splitted in two halfs
    function G1$1(a, b, c, d, msg, x) {
        // NOTE: V is LE here
        const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
        let Al = BUF$1[2 * a], Ah = BUF$1[2 * a + 1]; // prettier-ignore
        let Bl = BUF$1[2 * b], Bh = BUF$1[2 * b + 1]; // prettier-ignore
        let Cl = BUF$1[2 * c], Ch = BUF$1[2 * c + 1]; // prettier-ignore
        let Dl = BUF$1[2 * d], Dh = BUF$1[2 * d + 1]; // prettier-ignore
        // v[a] = (v[a] + v[b] + x) | 0;
        let ll = u64.add3L(Al, Bl, Xl);
        Ah = u64.add3H(ll, Ah, Bh, Xh);
        Al = ll | 0;
        // v[d] = rotr(v[d] ^ v[a], 32)
        ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
        ({ Dh, Dl } = { Dh: u64.rotr32H(Dh, Dl), Dl: u64.rotr32L(Dh, Dl) });
        // v[c] = (v[c] + v[d]) | 0;
        ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
        // v[b] = rotr(v[b] ^ v[c], 24)
        ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
        ({ Bh, Bl } = { Bh: u64.rotrSH(Bh, Bl, 24), Bl: u64.rotrSL(Bh, Bl, 24) });
        (BUF$1[2 * a] = Al), (BUF$1[2 * a + 1] = Ah);
        (BUF$1[2 * b] = Bl), (BUF$1[2 * b + 1] = Bh);
        (BUF$1[2 * c] = Cl), (BUF$1[2 * c + 1] = Ch);
        (BUF$1[2 * d] = Dl), (BUF$1[2 * d + 1] = Dh);
    }
    function G2$1(a, b, c, d, msg, x) {
        // NOTE: V is LE here
        const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
        let Al = BUF$1[2 * a], Ah = BUF$1[2 * a + 1]; // prettier-ignore
        let Bl = BUF$1[2 * b], Bh = BUF$1[2 * b + 1]; // prettier-ignore
        let Cl = BUF$1[2 * c], Ch = BUF$1[2 * c + 1]; // prettier-ignore
        let Dl = BUF$1[2 * d], Dh = BUF$1[2 * d + 1]; // prettier-ignore
        // v[a] = (v[a] + v[b] + x) | 0;
        let ll = u64.add3L(Al, Bl, Xl);
        Ah = u64.add3H(ll, Ah, Bh, Xh);
        Al = ll | 0;
        // v[d] = rotr(v[d] ^ v[a], 16)
        ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
        ({ Dh, Dl } = { Dh: u64.rotrSH(Dh, Dl, 16), Dl: u64.rotrSL(Dh, Dl, 16) });
        // v[c] = (v[c] + v[d]) | 0;
        ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
        // v[b] = rotr(v[b] ^ v[c], 63)
        ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
        ({ Bh, Bl } = { Bh: u64.rotrBH(Bh, Bl, 63), Bl: u64.rotrBL(Bh, Bl, 63) });
        (BUF$1[2 * a] = Al), (BUF$1[2 * a + 1] = Ah);
        (BUF$1[2 * b] = Bl), (BUF$1[2 * b + 1] = Bh);
        (BUF$1[2 * c] = Cl), (BUF$1[2 * c + 1] = Ch);
        (BUF$1[2 * d] = Dl), (BUF$1[2 * d + 1] = Dh);
    }
    class BLAKE2b extends BLAKE2 {
        constructor(opts = {}) {
            super(128, opts.dkLen === undefined ? 64 : opts.dkLen, opts, 64, 16, 16);
            // Same as SHA-512, but LE
            this.v0l = IV$2[0] | 0;
            this.v0h = IV$2[1] | 0;
            this.v1l = IV$2[2] | 0;
            this.v1h = IV$2[3] | 0;
            this.v2l = IV$2[4] | 0;
            this.v2h = IV$2[5] | 0;
            this.v3l = IV$2[6] | 0;
            this.v3h = IV$2[7] | 0;
            this.v4l = IV$2[8] | 0;
            this.v4h = IV$2[9] | 0;
            this.v5l = IV$2[10] | 0;
            this.v5h = IV$2[11] | 0;
            this.v6l = IV$2[12] | 0;
            this.v6h = IV$2[13] | 0;
            this.v7l = IV$2[14] | 0;
            this.v7h = IV$2[15] | 0;
            const keyLength = opts.key ? opts.key.length : 0;
            this.v0l ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
            if (opts.salt) {
                const salt = u32(toBytes(opts.salt));
                this.v4l ^= salt[0];
                this.v4h ^= salt[1];
                this.v5l ^= salt[2];
                this.v5h ^= salt[3];
            }
            if (opts.personalization) {
                const pers = u32(toBytes(opts.personalization));
                this.v6l ^= pers[0];
                this.v6h ^= pers[1];
                this.v7l ^= pers[2];
                this.v7h ^= pers[3];
            }
            if (opts.key) {
                // Pad to blockLen and update
                const tmp = new Uint8Array(this.blockLen);
                tmp.set(toBytes(opts.key));
                this.update(tmp);
            }
        }
        // prettier-ignore
        get() {
            let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
            return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
        }
        // prettier-ignore
        set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
            this.v0l = v0l | 0;
            this.v0h = v0h | 0;
            this.v1l = v1l | 0;
            this.v1h = v1h | 0;
            this.v2l = v2l | 0;
            this.v2h = v2h | 0;
            this.v3l = v3l | 0;
            this.v3h = v3h | 0;
            this.v4l = v4l | 0;
            this.v4h = v4h | 0;
            this.v5l = v5l | 0;
            this.v5h = v5h | 0;
            this.v6l = v6l | 0;
            this.v6h = v6h | 0;
            this.v7l = v7l | 0;
            this.v7h = v7h | 0;
        }
        compress(msg, offset, isLast) {
            this.get().forEach((v, i) => (BUF$1[i] = v)); // First half from state.
            BUF$1.set(IV$2, 16); // Second half from IV.
            let { h, l } = u64.fromBig(BigInt(this.length));
            BUF$1[24] = IV$2[8] ^ l; // Low word of the offset.
            BUF$1[25] = IV$2[9] ^ h; // High word.
            // Invert all bits for last block
            if (isLast) {
                BUF$1[28] = ~BUF$1[28];
                BUF$1[29] = ~BUF$1[29];
            }
            let j = 0;
            const s = SIGMA$1;
            for (let i = 0; i < 12; i++) {
                G1$1(0, 4, 8, 12, msg, offset + 2 * s[j++]);
                G2$1(0, 4, 8, 12, msg, offset + 2 * s[j++]);
                G1$1(1, 5, 9, 13, msg, offset + 2 * s[j++]);
                G2$1(1, 5, 9, 13, msg, offset + 2 * s[j++]);
                G1$1(2, 6, 10, 14, msg, offset + 2 * s[j++]);
                G2$1(2, 6, 10, 14, msg, offset + 2 * s[j++]);
                G1$1(3, 7, 11, 15, msg, offset + 2 * s[j++]);
                G2$1(3, 7, 11, 15, msg, offset + 2 * s[j++]);
                G1$1(0, 5, 10, 15, msg, offset + 2 * s[j++]);
                G2$1(0, 5, 10, 15, msg, offset + 2 * s[j++]);
                G1$1(1, 6, 11, 12, msg, offset + 2 * s[j++]);
                G2$1(1, 6, 11, 12, msg, offset + 2 * s[j++]);
                G1$1(2, 7, 8, 13, msg, offset + 2 * s[j++]);
                G2$1(2, 7, 8, 13, msg, offset + 2 * s[j++]);
                G1$1(3, 4, 9, 14, msg, offset + 2 * s[j++]);
                G2$1(3, 4, 9, 14, msg, offset + 2 * s[j++]);
            }
            this.v0l ^= BUF$1[0] ^ BUF$1[16];
            this.v0h ^= BUF$1[1] ^ BUF$1[17];
            this.v1l ^= BUF$1[2] ^ BUF$1[18];
            this.v1h ^= BUF$1[3] ^ BUF$1[19];
            this.v2l ^= BUF$1[4] ^ BUF$1[20];
            this.v2h ^= BUF$1[5] ^ BUF$1[21];
            this.v3l ^= BUF$1[6] ^ BUF$1[22];
            this.v3h ^= BUF$1[7] ^ BUF$1[23];
            this.v4l ^= BUF$1[8] ^ BUF$1[24];
            this.v4h ^= BUF$1[9] ^ BUF$1[25];
            this.v5l ^= BUF$1[10] ^ BUF$1[26];
            this.v5h ^= BUF$1[11] ^ BUF$1[27];
            this.v6l ^= BUF$1[12] ^ BUF$1[28];
            this.v6h ^= BUF$1[13] ^ BUF$1[29];
            this.v7l ^= BUF$1[14] ^ BUF$1[30];
            this.v7h ^= BUF$1[15] ^ BUF$1[31];
            BUF$1.fill(0);
        }
        destroy() {
            this.destroyed = true;
            this.buffer32.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    /**
     * BLAKE2b - optimized for 64-bit platforms. JS doesn't have uint64, so it's slower than BLAKE2s.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, salt, personalization
     */
    const blake2b = wrapConstructorWithOpts((opts) => new BLAKE2b(opts));

    // Initial state:
    // first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19)
    // same as SHA-256
    // prettier-ignore
    const IV$1 = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    // Mixing function G splitted in two halfs
    function G1(a, b, c, d, x) {
        a = (a + b + x) | 0;
        d = rotr(d ^ a, 16);
        c = (c + d) | 0;
        b = rotr(b ^ c, 12);
        return { a, b, c, d };
    }
    function G2(a, b, c, d, x) {
        a = (a + b + x) | 0;
        d = rotr(d ^ a, 8);
        c = (c + d) | 0;
        b = rotr(b ^ c, 7);
        return { a, b, c, d };
    }
    // prettier-ignore
    function compress(s, offset, msg, rounds, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
        let j = 0;
        for (let i = 0; i < rounds; i++) {
            ({ a: v0, b: v4, c: v8, d: v12 } = G1(v0, v4, v8, v12, msg[offset + s[j++]]));
            ({ a: v0, b: v4, c: v8, d: v12 } = G2(v0, v4, v8, v12, msg[offset + s[j++]]));
            ({ a: v1, b: v5, c: v9, d: v13 } = G1(v1, v5, v9, v13, msg[offset + s[j++]]));
            ({ a: v1, b: v5, c: v9, d: v13 } = G2(v1, v5, v9, v13, msg[offset + s[j++]]));
            ({ a: v2, b: v6, c: v10, d: v14 } = G1(v2, v6, v10, v14, msg[offset + s[j++]]));
            ({ a: v2, b: v6, c: v10, d: v14 } = G2(v2, v6, v10, v14, msg[offset + s[j++]]));
            ({ a: v3, b: v7, c: v11, d: v15 } = G1(v3, v7, v11, v15, msg[offset + s[j++]]));
            ({ a: v3, b: v7, c: v11, d: v15 } = G2(v3, v7, v11, v15, msg[offset + s[j++]]));
            ({ a: v0, b: v5, c: v10, d: v15 } = G1(v0, v5, v10, v15, msg[offset + s[j++]]));
            ({ a: v0, b: v5, c: v10, d: v15 } = G2(v0, v5, v10, v15, msg[offset + s[j++]]));
            ({ a: v1, b: v6, c: v11, d: v12 } = G1(v1, v6, v11, v12, msg[offset + s[j++]]));
            ({ a: v1, b: v6, c: v11, d: v12 } = G2(v1, v6, v11, v12, msg[offset + s[j++]]));
            ({ a: v2, b: v7, c: v8, d: v13 } = G1(v2, v7, v8, v13, msg[offset + s[j++]]));
            ({ a: v2, b: v7, c: v8, d: v13 } = G2(v2, v7, v8, v13, msg[offset + s[j++]]));
            ({ a: v3, b: v4, c: v9, d: v14 } = G1(v3, v4, v9, v14, msg[offset + s[j++]]));
            ({ a: v3, b: v4, c: v9, d: v14 } = G2(v3, v4, v9, v14, msg[offset + s[j++]]));
        }
        return { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 };
    }
    class BLAKE2s extends BLAKE2 {
        constructor(opts = {}) {
            super(64, opts.dkLen === undefined ? 32 : opts.dkLen, opts, 32, 8, 8);
            // Internal state, same as SHA-256
            this.v0 = IV$1[0] | 0;
            this.v1 = IV$1[1] | 0;
            this.v2 = IV$1[2] | 0;
            this.v3 = IV$1[3] | 0;
            this.v4 = IV$1[4] | 0;
            this.v5 = IV$1[5] | 0;
            this.v6 = IV$1[6] | 0;
            this.v7 = IV$1[7] | 0;
            const keyLength = opts.key ? opts.key.length : 0;
            this.v0 ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
            if (opts.salt) {
                const salt = u32(toBytes(opts.salt));
                this.v4 ^= salt[0];
                this.v5 ^= salt[1];
            }
            if (opts.personalization) {
                const pers = u32(toBytes(opts.personalization));
                this.v6 ^= pers[0];
                this.v7 ^= pers[1];
            }
            if (opts.key) {
                // Pad to blockLen and update
                const tmp = new Uint8Array(this.blockLen);
                tmp.set(toBytes(opts.key));
                this.update(tmp);
            }
        }
        get() {
            const { v0, v1, v2, v3, v4, v5, v6, v7 } = this;
            return [v0, v1, v2, v3, v4, v5, v6, v7];
        }
        // prettier-ignore
        set(v0, v1, v2, v3, v4, v5, v6, v7) {
            this.v0 = v0 | 0;
            this.v1 = v1 | 0;
            this.v2 = v2 | 0;
            this.v3 = v3 | 0;
            this.v4 = v4 | 0;
            this.v5 = v5 | 0;
            this.v6 = v6 | 0;
            this.v7 = v7 | 0;
        }
        compress(msg, offset, isLast) {
            const { h, l } = u64.fromBig(BigInt(this.length));
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA$1, offset, msg, 10, this.v0, this.v1, this.v2, this.v3, this.v4, this.v5, this.v6, this.v7, IV$1[0], IV$1[1], IV$1[2], IV$1[3], l ^ IV$1[4], h ^ IV$1[5], isLast ? ~IV$1[6] : IV$1[6], IV$1[7]);
            this.v0 ^= v0 ^ v8;
            this.v1 ^= v1 ^ v9;
            this.v2 ^= v2 ^ v10;
            this.v3 ^= v3 ^ v11;
            this.v4 ^= v4 ^ v12;
            this.v5 ^= v5 ^ v13;
            this.v6 ^= v6 ^ v14;
            this.v7 ^= v7 ^ v15;
        }
        destroy() {
            this.destroyed = true;
            this.buffer32.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    /**
     * BLAKE2s - optimized for 32-bit platforms. JS doesn't have uint64, so it's faster than BLAKE2b.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, salt, personalization
     */
    const blake2s = wrapConstructorWithOpts((opts) => new BLAKE2s(opts));

    // Flag bitset
    var Flags;
    (function (Flags) {
        Flags[Flags["CHUNK_START"] = 1] = "CHUNK_START";
        Flags[Flags["CHUNK_END"] = 2] = "CHUNK_END";
        Flags[Flags["PARENT"] = 4] = "PARENT";
        Flags[Flags["ROOT"] = 8] = "ROOT";
        Flags[Flags["KEYED_HASH"] = 16] = "KEYED_HASH";
        Flags[Flags["DERIVE_KEY_CONTEXT"] = 32] = "DERIVE_KEY_CONTEXT";
        Flags[Flags["DERIVE_KEY_MATERIAL"] = 64] = "DERIVE_KEY_MATERIAL";
    })(Flags || (Flags = {}));
    const SIGMA = (() => {
        const Id = Array.from({ length: 16 }, (_, i) => i);
        const permute = (arr) => [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8].map((i) => arr[i]);
        const res = [];
        for (let i = 0, v = Id; i < 7; i++, v = permute(v))
            res.push(...v);
        return Uint8Array.from(res);
    })();
    // Why is this so slow? It should be 6x faster than blake2b.
    // - There is only 30% reduction in number of rounds from blake2s
    // - This function uses tree mode to achive parallelisation via SIMD and threading,
    //   however in JS we don't have threads and SIMD, so we get only overhead from tree structure
    // - It is possible to speed it up via Web Workers, hovewer it will make code singnificantly more
    //   complicated, which we are trying to avoid, since this library is intended to be used
    //   for cryptographic purposes. Also, parallelization happens only on chunk level (1024 bytes),
    //   which won't really benefit small inputs.
    class BLAKE3 extends BLAKE2 {
        constructor(opts = {}, flags = 0) {
            super(64, opts.dkLen === undefined ? 32 : opts.dkLen, {}, Number.MAX_SAFE_INTEGER, 0, 0);
            this.flags = 0 | 0;
            this.chunkPos = 0; // Position of current block in chunk
            this.chunksDone = 0; // How many chunks we already have
            this.stack = [];
            // Output
            this.posOut = 0;
            this.bufferOut32 = new Uint32Array(16);
            this.chunkOut = 0; // index of output chunk
            this.enableXOF = true;
            this.outputLen = opts.dkLen === undefined ? 32 : opts.dkLen;
            assert.number(this.outputLen);
            if (opts.key !== undefined && opts.context !== undefined)
                throw new Error('Blake3: only key or context can be specified at same time');
            else if (opts.key !== undefined) {
                const key = toBytes(opts.key);
                if (key.length !== 32)
                    throw new Error('Blake3: key should be 32 byte');
                this.IV = u32(key);
                this.flags = flags | Flags.KEYED_HASH;
            }
            else if (opts.context !== undefined) {
                const context_key = new BLAKE3({ dkLen: 32 }, Flags.DERIVE_KEY_CONTEXT)
                    .update(opts.context)
                    .digest();
                this.IV = u32(context_key);
                this.flags = flags | Flags.DERIVE_KEY_MATERIAL;
            }
            else {
                this.IV = IV$1.slice();
                this.flags = flags;
            }
            this.state = this.IV.slice();
            this.bufferOut = u8(this.bufferOut32);
        }
        // Unused
        get() {
            return [];
        }
        set() { }
        b2Compress(counter, flags, buf, bufPos = 0) {
            const { state: s, pos } = this;
            const { h, l } = u64.fromBig(BigInt(counter), true);
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA, bufPos, buf, 7, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], IV$1[0], IV$1[1], IV$1[2], IV$1[3], h, l, pos, flags);
            s[0] = v0 ^ v8;
            s[1] = v1 ^ v9;
            s[2] = v2 ^ v10;
            s[3] = v3 ^ v11;
            s[4] = v4 ^ v12;
            s[5] = v5 ^ v13;
            s[6] = v6 ^ v14;
            s[7] = v7 ^ v15;
        }
        compress(buf, bufPos = 0, isLast = false) {
            // Compress last block
            let flags = this.flags;
            if (!this.chunkPos)
                flags |= Flags.CHUNK_START;
            if (this.chunkPos === 15 || isLast)
                flags |= Flags.CHUNK_END;
            if (!isLast)
                this.pos = this.blockLen;
            this.b2Compress(this.chunksDone, flags, buf, bufPos);
            this.chunkPos += 1;
            // If current block is last in chunk (16 blocks), then compress chunks
            if (this.chunkPos === 16 || isLast) {
                let chunk = this.state;
                this.state = this.IV.slice();
                // If not the last one, compress only when there are trailing zeros in chunk counter
                // chunks used as binary tree where current stack is path. Zero means current leaf is finished and can be compressed.
                // 1 (001) - leaf not finished (just push current chunk to stack)
                // 2 (010) - leaf finished at depth=1 (merge with last elm on stack and push back)
                // 3 (011) - last leaf not finished
                // 4 (100) - leafs finished at depth=1 and depth=2
                for (let last, chunks = this.chunksDone + 1; isLast || !(chunks & 1); chunks >>= 1) {
                    if (!(last = this.stack.pop()))
                        break;
                    this.buffer32.set(last, 0);
                    this.buffer32.set(chunk, 8);
                    this.pos = this.blockLen;
                    this.b2Compress(0, this.flags | Flags.PARENT, this.buffer32, 0);
                    chunk = this.state;
                    this.state = this.IV.slice();
                }
                this.chunksDone++;
                this.chunkPos = 0;
                this.stack.push(chunk);
            }
            this.pos = 0;
        }
        _cloneInto(to) {
            to = super._cloneInto(to);
            const { IV, flags, state, chunkPos, posOut, chunkOut, stack, chunksDone } = this;
            to.state.set(state.slice());
            to.stack = stack.map((i) => Uint32Array.from(i));
            to.IV.set(IV);
            to.flags = flags;
            to.chunkPos = chunkPos;
            to.chunksDone = chunksDone;
            to.posOut = posOut;
            to.chunkOut = chunkOut;
            to.enableXOF = this.enableXOF;
            to.bufferOut32.set(this.bufferOut32);
            return to;
        }
        destroy() {
            this.destroyed = true;
            this.state.fill(0);
            this.buffer32.fill(0);
            this.IV.fill(0);
            this.bufferOut32.fill(0);
            for (let i of this.stack)
                i.fill(0);
        }
        // Same as b2Compress, but doesn't modify state and returns 16 u32 array (instead of 8)
        b2CompressOut() {
            const { state: s, pos, flags, buffer32, bufferOut32: out32 } = this;
            const { h, l } = u64.fromBig(BigInt(this.chunkOut++));
            // prettier-ignore
            const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(SIGMA, 0, buffer32, 7, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], IV$1[0], IV$1[1], IV$1[2], IV$1[3], l, h, pos, flags);
            out32[0] = v0 ^ v8;
            out32[1] = v1 ^ v9;
            out32[2] = v2 ^ v10;
            out32[3] = v3 ^ v11;
            out32[4] = v4 ^ v12;
            out32[5] = v5 ^ v13;
            out32[6] = v6 ^ v14;
            out32[7] = v7 ^ v15;
            out32[8] = s[0] ^ v8;
            out32[9] = s[1] ^ v9;
            out32[10] = s[2] ^ v10;
            out32[11] = s[3] ^ v11;
            out32[12] = s[4] ^ v12;
            out32[13] = s[5] ^ v13;
            out32[14] = s[6] ^ v14;
            out32[15] = s[7] ^ v15;
            this.posOut = 0;
        }
        finish() {
            if (this.finished)
                return;
            this.finished = true;
            // Padding
            this.buffer.fill(0, this.pos);
            // Process last chunk
            let flags = this.flags | Flags.ROOT;
            if (this.stack.length) {
                flags |= Flags.PARENT;
                this.compress(this.buffer32, 0, true);
                this.chunksDone = 0;
                this.pos = this.blockLen;
            }
            else {
                flags |= (!this.chunkPos ? Flags.CHUNK_START : 0) | Flags.CHUNK_END;
            }
            this.flags = flags;
            this.b2CompressOut();
        }
        writeInto(out) {
            assert.exists(this, false);
            assert.bytes(out);
            this.finish();
            const { blockLen, bufferOut } = this;
            for (let pos = 0, len = out.length; pos < len;) {
                if (this.posOut >= blockLen)
                    this.b2CompressOut();
                const take = Math.min(blockLen - this.posOut, len - pos);
                out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
                this.posOut += take;
                pos += take;
            }
            return out;
        }
        xofInto(out) {
            if (!this.enableXOF)
                throw new Error('XOF is not possible after digest call');
            return this.writeInto(out);
        }
        xof(bytes) {
            assert.number(bytes);
            return this.xofInto(new Uint8Array(bytes));
        }
        digestInto(out) {
            assert.output(out, this);
            if (this.finished)
                throw new Error('digest() was already called');
            this.enableXOF = false;
            this.writeInto(out);
            this.destroy();
            return out;
        }
        digest() {
            return this.digestInto(new Uint8Array(this.outputLen));
        }
    }
    /**
     * BLAKE3 hash function.
     * @param msg - message that would be hashed
     * @param opts - dkLen, key, context
     */
    const blake3 = wrapConstructorWithOpts((opts) => new BLAKE3(opts));

    // HMAC (RFC 2104)
    class HMAC extends Hash {
        constructor(hash, _key) {
            super();
            this.finished = false;
            this.destroyed = false;
            assert.hash(hash);
            const key = toBytes(_key);
            this.iHash = hash.create();
            if (typeof this.iHash.update !== 'function')
                throw new TypeError('Expected instance of class which extends utils.Hash');
            this.blockLen = this.iHash.blockLen;
            this.outputLen = this.iHash.outputLen;
            const blockLen = this.blockLen;
            const pad = new Uint8Array(blockLen);
            // blockLen can be bigger than outputLen
            pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36;
            this.iHash.update(pad);
            // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
            this.oHash = hash.create();
            // Undo internal XOR && apply outer XOR
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36 ^ 0x5c;
            this.oHash.update(pad);
            pad.fill(0);
        }
        update(buf) {
            assert.exists(this);
            this.iHash.update(buf);
            return this;
        }
        digestInto(out) {
            assert.exists(this);
            assert.bytes(out, this.outputLen);
            this.finished = true;
            this.iHash.digestInto(out);
            this.oHash.update(out);
            this.oHash.digestInto(out);
            this.destroy();
        }
        digest() {
            const out = new Uint8Array(this.oHash.outputLen);
            this.digestInto(out);
            return out;
        }
        _cloneInto(to) {
            // Create new instance without calling constructor since key already in state and we don't know it.
            to || (to = Object.create(Object.getPrototypeOf(this), {}));
            const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
            to = to;
            to.finished = finished;
            to.destroyed = destroyed;
            to.blockLen = blockLen;
            to.outputLen = outputLen;
            to.oHash = oHash._cloneInto(to.oHash);
            to.iHash = iHash._cloneInto(to.iHash);
            return to;
        }
        destroy() {
            this.destroyed = true;
            this.oHash.destroy();
            this.iHash.destroy();
        }
    }
    /**
     * HMAC: RFC2104 message authentication code.
     * @param hash - function that would be used e.g. sha256
     * @param key - message key
     * @param message - message data
     */
    const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
    hmac.create = (hash, key) => new HMAC(hash, key);

    // HKDF (RFC 5869)
    // https://soatok.blog/2021/11/17/understanding-hkdf/
    /**
     * HKDF-Extract(IKM, salt) -> PRK
     * Arguments position differs from spec (IKM is first one, since it is not optional)
     * @param hash
     * @param ikm
     * @param salt
     * @returns
     */
    function extract(hash, ikm, salt) {
        assert.hash(hash);
        // NOTE: some libraries treat zero-length array as 'not provided';
        // we don't, since we have undefined as 'not provided'
        // https://github.com/RustCrypto/KDFs/issues/15
        if (salt === undefined)
            salt = new Uint8Array(hash.outputLen); // if not provided, it is set to a string of HashLen zeros
        return hmac(hash, toBytes(salt), toBytes(ikm));
    }
    // HKDF-Expand(PRK, info, L) -> OKM
    const HKDF_COUNTER = new Uint8Array([0]);
    const EMPTY_BUFFER = new Uint8Array();
    /**
     * HKDF-expand from the spec.
     * @param prk - a pseudorandom key of at least HashLen octets (usually, the output from the extract step)
     * @param info - optional context and application specific information (can be a zero-length string)
     * @param length - length of output keying material in octets
     */
    function expand(hash, prk, info, length = 32) {
        assert.hash(hash);
        assert.number(length);
        if (length > 255 * hash.outputLen)
            throw new Error('Length should be <= 255*HashLen');
        const blocks = Math.ceil(length / hash.outputLen);
        if (info === undefined)
            info = EMPTY_BUFFER;
        // first L(ength) octets of T
        const okm = new Uint8Array(blocks * hash.outputLen);
        // Re-use HMAC instance between blocks
        const HMAC = hmac.create(hash, prk);
        const HMACTmp = HMAC._cloneInto();
        const T = new Uint8Array(HMAC.outputLen);
        for (let counter = 0; counter < blocks; counter++) {
            HKDF_COUNTER[0] = counter + 1;
            // T(0) = empty string (zero length)
            // T(N) = HMAC-Hash(PRK, T(N-1) | info | N)
            HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T)
                .update(info)
                .update(HKDF_COUNTER)
                .digestInto(T);
            okm.set(T, hash.outputLen * counter);
            HMAC._cloneInto(HMACTmp);
        }
        HMAC.destroy();
        HMACTmp.destroy();
        T.fill(0);
        HKDF_COUNTER.fill(0);
        return okm.slice(0, length);
    }
    /**
     * HKDF (RFC 5869): extract + expand in one step.
     * @param hash - hash function that would be used (e.g. sha256)
     * @param ikm - input keying material, the initial key
     * @param salt - optional salt value (a non-secret random value)
     * @param info - optional context and application specific information
     * @param length - length of output keying material in octets
     */
    const hkdf = (hash, ikm, salt, info, length) => expand(hash, extract(hash, ikm, salt), info, length);

    // Common prologue and epilogue for sync/async functions
    function pbkdf2Init(hash, _password, _salt, _opts) {
        assert.hash(hash);
        const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
        const { c, dkLen, asyncTick } = opts;
        assert.number(c);
        assert.number(dkLen);
        assert.number(asyncTick);
        if (c < 1)
            throw new Error('PBKDF2: iterations (c) should be >= 1');
        const password = toBytes(_password);
        const salt = toBytes(_salt);
        // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
        const DK = new Uint8Array(dkLen);
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        const PRF = hmac.create(hash, password);
        const PRFSalt = PRF._cloneInto().update(salt);
        return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
    }
    function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
        PRF.destroy();
        PRFSalt.destroy();
        if (prfW)
            prfW.destroy();
        u.fill(0);
        return DK;
    }
    /**
     * PBKDF2-HMAC: RFC 2898 key derivation function
     * @param hash - hash function that would be used e.g. sha256
     * @param password - password from which a derived key is generated
     * @param salt - cryptographic salt
     * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
     */
    function pbkdf2$1(hash, password, salt, opts) {
        const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
        let prfW; // Working copy
        const arr = new Uint8Array(4);
        const view = createView(arr);
        const u = new Uint8Array(PRF.outputLen);
        // DK = T1 + T2 + ⋯ + Tdklen/hlen
        for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
            // Ti = F(Password, Salt, c, i)
            const Ti = DK.subarray(pos, pos + PRF.outputLen);
            view.setInt32(0, ti, false);
            // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
            // U1 = PRF(Password, Salt + INT_32_BE(i))
            (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
            Ti.set(u.subarray(0, Ti.length));
            for (let ui = 1; ui < c; ui++) {
                // Uc = PRF(Password, Uc−1)
                PRF._cloneInto(prfW).update(u).digestInto(u);
                for (let i = 0; i < Ti.length; i++)
                    Ti[i] ^= u[i];
            }
        }
        return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
    }
    async function pbkdf2Async(hash, password, salt, opts) {
        const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
        let prfW; // Working copy
        const arr = new Uint8Array(4);
        const view = createView(arr);
        const u = new Uint8Array(PRF.outputLen);
        // DK = T1 + T2 + ⋯ + Tdklen/hlen
        for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
            // Ti = F(Password, Salt, c, i)
            const Ti = DK.subarray(pos, pos + PRF.outputLen);
            view.setInt32(0, ti, false);
            // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
            // U1 = PRF(Password, Salt + INT_32_BE(i))
            (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
            Ti.set(u.subarray(0, Ti.length));
            await asyncLoop(c - 1, asyncTick, (i) => {
                // Uc = PRF(Password, Uc−1)
                PRF._cloneInto(prfW).update(u).digestInto(u);
                for (let i = 0; i < Ti.length; i++)
                    Ti[i] ^= u[i];
            });
        }
        return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
    }

    // Polyfill for Safari 14
    function setBigUint64(view, byteOffset, value, isLE) {
        if (typeof view.setBigUint64 === 'function')
            return view.setBigUint64(byteOffset, value, isLE);
        const _32n = BigInt(32);
        const _u32_max = BigInt(0xffffffff);
        const wh = Number((value >> _32n) & _u32_max);
        const wl = Number(value & _u32_max);
        const h = isLE ? 4 : 0;
        const l = isLE ? 0 : 4;
        view.setUint32(byteOffset + h, wh, isLE);
        view.setUint32(byteOffset + l, wl, isLE);
    }
    // Base SHA2 class (RFC 6234)
    class SHA2 extends Hash {
        constructor(blockLen, outputLen, padOffset, isLE) {
            super();
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.padOffset = padOffset;
            this.isLE = isLE;
            this.finished = false;
            this.length = 0;
            this.pos = 0;
            this.destroyed = false;
            this.buffer = new Uint8Array(blockLen);
            this.view = createView(this.buffer);
        }
        update(data) {
            assert.exists(this);
            const { view, buffer, blockLen } = this;
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path: we have at least one block in input, cast it to view and process
                if (take === blockLen) {
                    const dataView = createView(data);
                    for (; blockLen <= len - pos; pos += blockLen)
                        this.process(dataView, pos);
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                pos += take;
                if (this.pos === blockLen) {
                    this.process(view, 0);
                    this.pos = 0;
                }
            }
            this.length += data.length;
            this.roundClean();
            return this;
        }
        digestInto(out) {
            assert.exists(this);
            assert.output(out, this);
            this.finished = true;
            // Padding
            // We can avoid allocation of buffer for padding completely if it
            // was previously not allocated here. But it won't change performance.
            const { buffer, view, blockLen, isLE } = this;
            let { pos } = this;
            // append the bit '1' to the message
            buffer[pos++] = 0b10000000;
            this.buffer.subarray(pos).fill(0);
            // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
            if (this.padOffset > blockLen - pos) {
                this.process(view, 0);
                pos = 0;
            }
            // Pad until full block byte with zeros
            for (let i = pos; i < blockLen; i++)
                buffer[i] = 0;
            // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
            // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
            // So we just write lowest 64 bits of that value.
            setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
            this.process(view, 0);
            const oview = createView(out);
            this.get().forEach((v, i) => oview.setUint32(4 * i, v, isLE));
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            to || (to = new this.constructor());
            to.set(...this.get());
            const { blockLen, buffer, length, finished, destroyed, pos } = this;
            to.length = length;
            to.pos = pos;
            to.finished = finished;
            to.destroyed = destroyed;
            if (length % blockLen)
                to.buffer.set(buffer);
            return to;
        }
    }

    // https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
    // https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
    const Rho = new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]);
    const Id = Uint8Array.from({ length: 16 }, (_, i) => i);
    const Pi = Id.map((i) => (9 * i + 5) % 16);
    let idxL = [Id];
    let idxR = [Pi];
    for (let i = 0; i < 4; i++)
        for (let j of [idxL, idxR])
            j.push(j[i].map((k) => Rho[k]));
    const shifts = [
        [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
        [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
        [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
        [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
        [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
    ].map((i) => new Uint8Array(i));
    const shiftsL = idxL.map((idx, i) => idx.map((j) => shifts[i][j]));
    const shiftsR = idxR.map((idx, i) => idx.map((j) => shifts[i][j]));
    const Kl = new Uint32Array([0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e]);
    const Kr = new Uint32Array([0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000]);
    // The rotate left (circular left shift) operation for uint32
    const rotl$1 = (word, shift) => (word << shift) | (word >>> (32 - shift));
    // It's called f() in spec.
    function f(group, x, y, z) {
        if (group === 0)
            return x ^ y ^ z;
        else if (group === 1)
            return (x & y) | (~x & z);
        else if (group === 2)
            return (x | ~y) ^ z;
        else if (group === 3)
            return (x & z) | (y & ~z);
        else
            return x ^ (y | ~z);
    }
    // Temporary buffer, not used to store anything between runs
    const BUF = new Uint32Array(16);
    class RIPEMD160 extends SHA2 {
        constructor() {
            super(64, 20, 8, true);
            this.h0 = 0x67452301 | 0;
            this.h1 = 0xefcdab89 | 0;
            this.h2 = 0x98badcfe | 0;
            this.h3 = 0x10325476 | 0;
            this.h4 = 0xc3d2e1f0 | 0;
        }
        get() {
            const { h0, h1, h2, h3, h4 } = this;
            return [h0, h1, h2, h3, h4];
        }
        set(h0, h1, h2, h3, h4) {
            this.h0 = h0 | 0;
            this.h1 = h1 | 0;
            this.h2 = h2 | 0;
            this.h3 = h3 | 0;
            this.h4 = h4 | 0;
        }
        process(view, offset) {
            for (let i = 0; i < 16; i++, offset += 4)
                BUF[i] = view.getUint32(offset, true);
            // prettier-ignore
            let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
            // Instead of iterating 0 to 80, we split it into 5 groups
            // And use the groups in constants, functions, etc. Much simpler
            for (let group = 0; group < 5; group++) {
                const rGroup = 4 - group;
                const hbl = Kl[group], hbr = Kr[group]; // prettier-ignore
                const rl = idxL[group], rr = idxR[group]; // prettier-ignore
                const sl = shiftsL[group], sr = shiftsR[group]; // prettier-ignore
                for (let i = 0; i < 16; i++) {
                    const tl = (rotl$1(al + f(group, bl, cl, dl) + BUF[rl[i]] + hbl, sl[i]) + el) | 0;
                    al = el, el = dl, dl = rotl$1(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
                }
                // 2 loops are 10% faster
                for (let i = 0; i < 16; i++) {
                    const tr = (rotl$1(ar + f(rGroup, br, cr, dr) + BUF[rr[i]] + hbr, sr[i]) + er) | 0;
                    ar = er, er = dr, dr = rotl$1(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
                }
            }
            // Add the compressed chunk to the current hash value
            this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
        }
        roundClean() {
            BUF.fill(0);
        }
        destroy() {
            this.destroyed = true;
            this.buffer.fill(0);
            this.set(0, 0, 0, 0, 0);
        }
    }
    /**
     * RIPEMD-160 - a hash function from 1990s.
     * @param message - msg that would be hashed
     */
    const ripemd160 = wrapConstructor(() => new RIPEMD160());

    // Choice: a ? b : c
    const Chi = (a, b, c) => (a & b) ^ (~a & c);
    // Majority function, true if any two inpust is true
    const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
    // Round constants:
    // first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
    // prettier-ignore
    const SHA256_K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
    // prettier-ignore
    const IV = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    // Temporary buffer, not used to store anything between runs
    // Named this way because it matches specification.
    const SHA256_W = new Uint32Array(64);
    class SHA256 extends SHA2 {
        constructor() {
            super(64, 32, 8, false);
            // We cannot use array here since array allows indexing by variable
            // which means optimizer/compiler cannot use registers.
            this.A = IV[0] | 0;
            this.B = IV[1] | 0;
            this.C = IV[2] | 0;
            this.D = IV[3] | 0;
            this.E = IV[4] | 0;
            this.F = IV[5] | 0;
            this.G = IV[6] | 0;
            this.H = IV[7] | 0;
        }
        get() {
            const { A, B, C, D, E, F, G, H } = this;
            return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
            this.A = A | 0;
            this.B = B | 0;
            this.C = C | 0;
            this.D = D | 0;
            this.E = E | 0;
            this.F = F | 0;
            this.G = G | 0;
            this.H = H | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4)
                SHA256_W[i] = view.getUint32(offset, false);
            for (let i = 16; i < 64; i++) {
                const W15 = SHA256_W[i - 15];
                const W2 = SHA256_W[i - 2];
                const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
                const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
            }
            // Compression function main loop, 64 rounds
            let { A, B, C, D, E, F, G, H } = this;
            for (let i = 0; i < 64; i++) {
                const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
                const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
                const T2 = (sigma0 + Maj(A, B, C)) | 0;
                H = G;
                G = F;
                F = E;
                E = (D + T1) | 0;
                D = C;
                C = B;
                B = A;
                A = (T1 + T2) | 0;
            }
            // Add the compressed chunk to the current hash value
            A = (A + this.A) | 0;
            B = (B + this.B) | 0;
            C = (C + this.C) | 0;
            D = (D + this.D) | 0;
            E = (E + this.E) | 0;
            F = (F + this.F) | 0;
            G = (G + this.G) | 0;
            H = (H + this.H) | 0;
            this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
            SHA256_W.fill(0);
        }
        destroy() {
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            this.buffer.fill(0);
        }
    }
    /**
     * SHA2-256 hash function
     * @param message - data that would be hashed
     */
    const sha256 = wrapConstructor(() => new SHA256());

    // RFC 7914 Scrypt KDF
    // Left rotate for uint32
    const rotl = (a, b) => (a << b) | (a >>> (32 - b));
    // The main Scrypt loop: uses Salsa extensively.
    // Six versions of the function were tried, this is the fastest one.
    // prettier-ignore
    function XorAndSalsa(prev, pi, input, ii, out, oi) {
        // Based on https://cr.yp.to/salsa20.html
        // Xor blocks
        let y00 = prev[pi++] ^ input[ii++], y01 = prev[pi++] ^ input[ii++];
        let y02 = prev[pi++] ^ input[ii++], y03 = prev[pi++] ^ input[ii++];
        let y04 = prev[pi++] ^ input[ii++], y05 = prev[pi++] ^ input[ii++];
        let y06 = prev[pi++] ^ input[ii++], y07 = prev[pi++] ^ input[ii++];
        let y08 = prev[pi++] ^ input[ii++], y09 = prev[pi++] ^ input[ii++];
        let y10 = prev[pi++] ^ input[ii++], y11 = prev[pi++] ^ input[ii++];
        let y12 = prev[pi++] ^ input[ii++], y13 = prev[pi++] ^ input[ii++];
        let y14 = prev[pi++] ^ input[ii++], y15 = prev[pi++] ^ input[ii++];
        // Save state to temporary variables (salsa)
        let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
        // Main loop (salsa)
        for (let i = 0; i < 8; i += 2) {
            x04 ^= rotl(x00 + x12 | 0, 7);
            x08 ^= rotl(x04 + x00 | 0, 9);
            x12 ^= rotl(x08 + x04 | 0, 13);
            x00 ^= rotl(x12 + x08 | 0, 18);
            x09 ^= rotl(x05 + x01 | 0, 7);
            x13 ^= rotl(x09 + x05 | 0, 9);
            x01 ^= rotl(x13 + x09 | 0, 13);
            x05 ^= rotl(x01 + x13 | 0, 18);
            x14 ^= rotl(x10 + x06 | 0, 7);
            x02 ^= rotl(x14 + x10 | 0, 9);
            x06 ^= rotl(x02 + x14 | 0, 13);
            x10 ^= rotl(x06 + x02 | 0, 18);
            x03 ^= rotl(x15 + x11 | 0, 7);
            x07 ^= rotl(x03 + x15 | 0, 9);
            x11 ^= rotl(x07 + x03 | 0, 13);
            x15 ^= rotl(x11 + x07 | 0, 18);
            x01 ^= rotl(x00 + x03 | 0, 7);
            x02 ^= rotl(x01 + x00 | 0, 9);
            x03 ^= rotl(x02 + x01 | 0, 13);
            x00 ^= rotl(x03 + x02 | 0, 18);
            x06 ^= rotl(x05 + x04 | 0, 7);
            x07 ^= rotl(x06 + x05 | 0, 9);
            x04 ^= rotl(x07 + x06 | 0, 13);
            x05 ^= rotl(x04 + x07 | 0, 18);
            x11 ^= rotl(x10 + x09 | 0, 7);
            x08 ^= rotl(x11 + x10 | 0, 9);
            x09 ^= rotl(x08 + x11 | 0, 13);
            x10 ^= rotl(x09 + x08 | 0, 18);
            x12 ^= rotl(x15 + x14 | 0, 7);
            x13 ^= rotl(x12 + x15 | 0, 9);
            x14 ^= rotl(x13 + x12 | 0, 13);
            x15 ^= rotl(x14 + x13 | 0, 18);
        }
        // Write output (salsa)
        out[oi++] = (y00 + x00) | 0;
        out[oi++] = (y01 + x01) | 0;
        out[oi++] = (y02 + x02) | 0;
        out[oi++] = (y03 + x03) | 0;
        out[oi++] = (y04 + x04) | 0;
        out[oi++] = (y05 + x05) | 0;
        out[oi++] = (y06 + x06) | 0;
        out[oi++] = (y07 + x07) | 0;
        out[oi++] = (y08 + x08) | 0;
        out[oi++] = (y09 + x09) | 0;
        out[oi++] = (y10 + x10) | 0;
        out[oi++] = (y11 + x11) | 0;
        out[oi++] = (y12 + x12) | 0;
        out[oi++] = (y13 + x13) | 0;
        out[oi++] = (y14 + x14) | 0;
        out[oi++] = (y15 + x15) | 0;
    }
    function BlockMix(input, ii, out, oi, r) {
        // The block B is r 128-byte chunks (which is equivalent of 2r 64-byte chunks)
        let head = oi + 0;
        let tail = oi + 16 * r;
        for (let i = 0; i < 16; i++)
            out[tail + i] = input[ii + (2 * r - 1) * 16 + i]; // X ← B[2r−1]
        for (let i = 0; i < r; i++, head += 16, ii += 16) {
            // We write odd & even Yi at same time. Even: 0bXXXXX0 Odd:  0bXXXXX1
            XorAndSalsa(out, tail, input, ii, out, head); // head[i] = Salsa(blockIn[2*i] ^ tail[i-1])
            if (i > 0)
                tail += 16; // First iteration overwrites tmp value in tail
            XorAndSalsa(out, head, input, (ii += 16), out, tail); // tail[i] = Salsa(blockIn[2*i+1] ^ head[i])
        }
    }
    // Common prologue and epilogue for sync/async functions
    function scryptInit(password, salt, _opts) {
        // Maxmem - 1GB+1KB by default
        const opts = checkOpts({
            dkLen: 32,
            asyncTick: 10,
            maxmem: 1024 ** 3 + 1024,
        }, _opts);
        const { N, r, p, dkLen, asyncTick, maxmem, onProgress } = opts;
        assert.number(N);
        assert.number(r);
        assert.number(p);
        assert.number(dkLen);
        assert.number(asyncTick);
        assert.number(maxmem);
        if (onProgress !== undefined && typeof onProgress !== 'function')
            throw new Error('progressCb should be function');
        const blockSize = 128 * r;
        const blockSize32 = blockSize / 4;
        if (N <= 1 || (N & (N - 1)) !== 0 || N >= 2 ** (blockSize / 8) || N > 2 ** 32) {
            // NOTE: we limit N to be less than 2**32 because of 32 bit variant of Integrify function
            // There is no JS engines that allows alocate more than 4GB per single Uint8Array for now, but can change in future.
            throw new Error('Scrypt: N must be larger than 1, a power of 2, less than 2^(128 * r / 8) and less than 2^32');
        }
        if (p < 0 || p > ((2 ** 32 - 1) * 32) / blockSize) {
            throw new Error('Scrypt: p must be a positive integer less than or equal to ((2^32 - 1) * 32) / (128 * r)');
        }
        if (dkLen < 0 || dkLen > (2 ** 32 - 1) * 32) {
            throw new Error('Scrypt: dkLen should be positive integer less than or equal to (2^32 - 1) * 32');
        }
        const memUsed = blockSize * (N + p);
        if (memUsed > maxmem) {
            throw new Error(`Scrypt: parameters too large, ${memUsed} (128 * r * (N + p)) > ${maxmem} (maxmem)`);
        }
        // [B0...Bp−1] ← PBKDF2HMAC-SHA256(Passphrase, Salt, 1, blockSize*ParallelizationFactor)
        // Since it has only one iteration there is no reason to use async variant
        const B = pbkdf2$1(sha256, password, salt, { c: 1, dkLen: blockSize * p });
        const B32 = u32(B);
        // Re-used between parallel iterations. Array(iterations) of B
        const V = u32(new Uint8Array(blockSize * N));
        const tmp = u32(new Uint8Array(blockSize));
        let blockMixCb = () => { };
        if (onProgress) {
            const totalBlockMix = 2 * N * p;
            // Invoke callback if progress changes from 10.01 to 10.02
            // Allows to draw smooth progress bar on up to 8K screen
            const callbackPer = Math.max(Math.floor(totalBlockMix / 10000), 1);
            let blockMixCnt = 0;
            blockMixCb = () => {
                blockMixCnt++;
                if (onProgress && (!(blockMixCnt % callbackPer) || blockMixCnt === totalBlockMix))
                    onProgress(blockMixCnt / totalBlockMix);
            };
        }
        return { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick };
    }
    function scryptOutput(password, dkLen, B, V, tmp) {
        const res = pbkdf2$1(sha256, password, B, { c: 1, dkLen });
        B.fill(0);
        V.fill(0);
        tmp.fill(0);
        return res;
    }
    /**
     * Scrypt KDF from RFC 7914.
     * @param password - pass
     * @param salt - salt
     * @param opts - parameters
     * - `N` is cpu/mem work factor (power of 2 e.g. 2**18)
     * - `r` is block size (8 is common), fine-tunes sequential memory read size and performance
     * - `p` is parallelization factor (1 is common)
     * - `dkLen` is output key length in bytes e.g. 32.
     * - `asyncTick` - (default: 10) max time in ms for which async function can block execution
     * - `maxmem` - (default: `1024 ** 3 + 1024` aka 1GB+1KB). A limit that the app could use for scrypt
     * - `onProgress` - callback function that would be executed for progress report
     * @returns Derived key
     */
    function scrypt$1(password, salt, opts) {
        const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb } = scryptInit(password, salt, opts);
        for (let pi = 0; pi < p; pi++) {
            const Pi = blockSize32 * pi;
            for (let i = 0; i < blockSize32; i++)
                V[i] = B32[Pi + i]; // V[0] = B[i]
            for (let i = 0, pos = 0; i < N - 1; i++) {
                BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
                blockMixCb();
            }
            BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
            blockMixCb();
            for (let i = 0; i < N; i++) {
                // First u32 of the last 64-byte block (u32 is LE)
                const j = B32[Pi + blockSize32 - 16] % N; // j = Integrify(X) % iterations
                for (let k = 0; k < blockSize32; k++)
                    tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k]; // tmp = B ^ V[j]
                BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
                blockMixCb();
            }
        }
        return scryptOutput(password, dkLen, B, V, tmp);
    }
    /**
     * Scrypt KDF from RFC 7914.
     */
    async function scryptAsync(password, salt, opts) {
        const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick } = scryptInit(password, salt, opts);
        for (let pi = 0; pi < p; pi++) {
            const Pi = blockSize32 * pi;
            for (let i = 0; i < blockSize32; i++)
                V[i] = B32[Pi + i]; // V[0] = B[i]
            let pos = 0;
            await asyncLoop(N - 1, asyncTick, (i) => {
                BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
                blockMixCb();
            });
            BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
            blockMixCb();
            await asyncLoop(N, asyncTick, (i) => {
                // First u32 of the last 64-byte block (u32 is LE)
                const j = B32[Pi + blockSize32 - 16] % N; // j = Integrify(X) % iterations
                for (let k = 0; k < blockSize32; k++)
                    tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k]; // tmp = B ^ V[j]
                BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
                blockMixCb();
            });
        }
        return scryptOutput(password, dkLen, B, V, tmp);
    }

    // Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
    // prettier-ignore
    const [SHA512_Kh, SHA512_Kl] = u64.split([
        '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
        '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
        '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
        '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
        '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
        '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
        '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
        '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
        '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
        '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
        '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
        '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
        '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
        '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
        '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
        '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
        '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
        '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
        '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
        '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
    ].map(n => BigInt(n)));
    // Temporary buffer, not used to store anything between runs
    const SHA512_W_H = new Uint32Array(80);
    const SHA512_W_L = new Uint32Array(80);
    class SHA512 extends SHA2 {
        constructor() {
            super(128, 64, 16, false);
            // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
            // Also looks cleaner and easier to verify with spec.
            // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0x6a09e667 | 0;
            this.Al = 0xf3bcc908 | 0;
            this.Bh = 0xbb67ae85 | 0;
            this.Bl = 0x84caa73b | 0;
            this.Ch = 0x3c6ef372 | 0;
            this.Cl = 0xfe94f82b | 0;
            this.Dh = 0xa54ff53a | 0;
            this.Dl = 0x5f1d36f1 | 0;
            this.Eh = 0x510e527f | 0;
            this.El = 0xade682d1 | 0;
            this.Fh = 0x9b05688c | 0;
            this.Fl = 0x2b3e6c1f | 0;
            this.Gh = 0x1f83d9ab | 0;
            this.Gl = 0xfb41bd6b | 0;
            this.Hh = 0x5be0cd19 | 0;
            this.Hl = 0x137e2179 | 0;
        }
        // prettier-ignore
        get() {
            const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
        }
        // prettier-ignore
        set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
            this.Ah = Ah | 0;
            this.Al = Al | 0;
            this.Bh = Bh | 0;
            this.Bl = Bl | 0;
            this.Ch = Ch | 0;
            this.Cl = Cl | 0;
            this.Dh = Dh | 0;
            this.Dl = Dl | 0;
            this.Eh = Eh | 0;
            this.El = El | 0;
            this.Fh = Fh | 0;
            this.Fl = Fl | 0;
            this.Gh = Gh | 0;
            this.Gl = Gl | 0;
            this.Hh = Hh | 0;
            this.Hl = Hl | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4) {
                SHA512_W_H[i] = view.getUint32(offset);
                SHA512_W_L[i] = view.getUint32((offset += 4));
            }
            for (let i = 16; i < 80; i++) {
                // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
                const W15h = SHA512_W_H[i - 15] | 0;
                const W15l = SHA512_W_L[i - 15] | 0;
                const s0h = u64.rotrSH(W15h, W15l, 1) ^ u64.rotrSH(W15h, W15l, 8) ^ u64.shrSH(W15h, W15l, 7);
                const s0l = u64.rotrSL(W15h, W15l, 1) ^ u64.rotrSL(W15h, W15l, 8) ^ u64.shrSL(W15h, W15l, 7);
                // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
                const W2h = SHA512_W_H[i - 2] | 0;
                const W2l = SHA512_W_L[i - 2] | 0;
                const s1h = u64.rotrSH(W2h, W2l, 19) ^ u64.rotrBH(W2h, W2l, 61) ^ u64.shrSH(W2h, W2l, 6);
                const s1l = u64.rotrSL(W2h, W2l, 19) ^ u64.rotrBL(W2h, W2l, 61) ^ u64.shrSL(W2h, W2l, 6);
                // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
                const SUMl = u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
                const SUMh = u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
                SHA512_W_H[i] = SUMh | 0;
                SHA512_W_L[i] = SUMl | 0;
            }
            let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            // Compression function main loop, 80 rounds
            for (let i = 0; i < 80; i++) {
                // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
                const sigma1h = u64.rotrSH(Eh, El, 14) ^ u64.rotrSH(Eh, El, 18) ^ u64.rotrBH(Eh, El, 41);
                const sigma1l = u64.rotrSL(Eh, El, 14) ^ u64.rotrSL(Eh, El, 18) ^ u64.rotrBL(Eh, El, 41);
                //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const CHIh = (Eh & Fh) ^ (~Eh & Gh);
                const CHIl = (El & Fl) ^ (~El & Gl);
                // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
                // prettier-ignore
                const T1ll = u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
                const T1h = u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
                const T1l = T1ll | 0;
                // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
                const sigma0h = u64.rotrSH(Ah, Al, 28) ^ u64.rotrBH(Ah, Al, 34) ^ u64.rotrBH(Ah, Al, 39);
                const sigma0l = u64.rotrSL(Ah, Al, 28) ^ u64.rotrBL(Ah, Al, 34) ^ u64.rotrBL(Ah, Al, 39);
                const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
                const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
                Hh = Gh | 0;
                Hl = Gl | 0;
                Gh = Fh | 0;
                Gl = Fl | 0;
                Fh = Eh | 0;
                Fl = El | 0;
                ({ h: Eh, l: El } = u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
                Dh = Ch | 0;
                Dl = Cl | 0;
                Ch = Bh | 0;
                Cl = Bl | 0;
                Bh = Ah | 0;
                Bl = Al | 0;
                const All = u64.add3L(T1l, sigma0l, MAJl);
                Ah = u64.add3H(All, T1h, sigma0h, MAJh);
                Al = All | 0;
            }
            // Add the compressed chunk to the current hash value
            ({ h: Ah, l: Al } = u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
            ({ h: Bh, l: Bl } = u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
            ({ h: Ch, l: Cl } = u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
            ({ h: Dh, l: Dl } = u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
            ({ h: Eh, l: El } = u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
            ({ h: Fh, l: Fl } = u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
            ({ h: Gh, l: Gl } = u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
            ({ h: Hh, l: Hl } = u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
            this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
        }
        roundClean() {
            SHA512_W_H.fill(0);
            SHA512_W_L.fill(0);
        }
        destroy() {
            this.buffer.fill(0);
            this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    class SHA512_256 extends SHA512 {
        constructor() {
            super();
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0x22312194 | 0;
            this.Al = 0xfc2bf72c | 0;
            this.Bh = 0x9f555fa3 | 0;
            this.Bl = 0xc84c64c2 | 0;
            this.Ch = 0x2393b86b | 0;
            this.Cl = 0x6f53b151 | 0;
            this.Dh = 0x96387719 | 0;
            this.Dl = 0x5940eabd | 0;
            this.Eh = 0x96283ee2 | 0;
            this.El = 0xa88effe3 | 0;
            this.Fh = 0xbe5e1e25 | 0;
            this.Fl = 0x53863992 | 0;
            this.Gh = 0x2b0199fc | 0;
            this.Gl = 0x2c85b8aa | 0;
            this.Hh = 0x0eb72ddc | 0;
            this.Hl = 0x81c52ca2 | 0;
            this.outputLen = 32;
        }
    }
    class SHA384 extends SHA512 {
        constructor() {
            super();
            // h -- high 32 bits, l -- low 32 bits
            this.Ah = 0xcbbb9d5d | 0;
            this.Al = 0xc1059ed8 | 0;
            this.Bh = 0x629a292a | 0;
            this.Bl = 0x367cd507 | 0;
            this.Ch = 0x9159015a | 0;
            this.Cl = 0x3070dd17 | 0;
            this.Dh = 0x152fecd8 | 0;
            this.Dl = 0xf70e5939 | 0;
            this.Eh = 0x67332667 | 0;
            this.El = 0xffc00b31 | 0;
            this.Fh = 0x8eb44a87 | 0;
            this.Fl = 0x68581511 | 0;
            this.Gh = 0xdb0c2e0d | 0;
            this.Gl = 0x64f98fa7 | 0;
            this.Hh = 0x47b5481d | 0;
            this.Hl = 0xbefa4fa4 | 0;
            this.outputLen = 48;
        }
    }
    const sha512 = wrapConstructor(() => new SHA512());
    wrapConstructor(() => new SHA512_256());
    wrapConstructor(() => new SHA384());

    // Various per round constants calculations
    const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    var _2n = BigInt(2);
    var _7n = BigInt(7);
    const _256n = BigInt(256);
    const _0x71n = BigInt(0x71);
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
        // Pi
        [x, y] = [y, (2 * x + 3 * y) % 5];
        SHA3_PI.push(2 * (5 * y + x));
        // Rotational
        SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
        // Iota
        let t = _0n;
        for (let j = 0; j < 7; j++) {
            R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
            if (R & _2n)
                t ^= _1n << ((_1n << BigInt(j)) - _1n);
        }
        _SHA3_IOTA.push(t);
    }
    const [SHA3_IOTA_H, SHA3_IOTA_L] = u64.split(_SHA3_IOTA, true);
    // Left rotation (without 0, 32, 64)
    const rotlH = (h, l, s) => s > 32 ? u64.rotlBH(h, l, s) : u64.rotlSH(h, l, s);
    const rotlL = (h, l, s) => s > 32 ? u64.rotlBL(h, l, s) : u64.rotlSL(h, l, s);
    // Same as keccakf1600, but allows to skip some rounds
    function keccakP(s, rounds = 24) {
        const B = new Uint32Array(5 * 2);
        // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
        for (let round = 24 - rounds; round < 24; round++) {
            // Theta θ
            for (let x = 0; x < 10; x++)
                B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
            for (let x = 0; x < 10; x += 2) {
                const idx1 = (x + 8) % 10;
                const idx0 = (x + 2) % 10;
                const B0 = B[idx0];
                const B1 = B[idx0 + 1];
                const Th = rotlH(B0, B1, 1) ^ B[idx1];
                const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
                for (let y = 0; y < 50; y += 10) {
                    s[x + y] ^= Th;
                    s[x + y + 1] ^= Tl;
                }
            }
            // Rho (ρ) and Pi (π)
            let curH = s[2];
            let curL = s[3];
            for (let t = 0; t < 24; t++) {
                const shift = SHA3_ROTL[t];
                const Th = rotlH(curH, curL, shift);
                const Tl = rotlL(curH, curL, shift);
                const PI = SHA3_PI[t];
                curH = s[PI];
                curL = s[PI + 1];
                s[PI] = Th;
                s[PI + 1] = Tl;
            }
            // Chi (χ)
            for (let y = 0; y < 50; y += 10) {
                for (let x = 0; x < 10; x++)
                    B[x] = s[y + x];
                for (let x = 0; x < 10; x++)
                    s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
            }
            // Iota (ι)
            s[0] ^= SHA3_IOTA_H[round];
            s[1] ^= SHA3_IOTA_L[round];
        }
        B.fill(0);
    }
    class Keccak extends Hash {
        // NOTE: we accept arguments in bytes instead of bits here.
        constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
            super();
            this.blockLen = blockLen;
            this.suffix = suffix;
            this.outputLen = outputLen;
            this.enableXOF = enableXOF;
            this.rounds = rounds;
            this.pos = 0;
            this.posOut = 0;
            this.finished = false;
            this.destroyed = false;
            // Can be passed from user as dkLen
            assert.number(outputLen);
            // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
            if (0 >= this.blockLen || this.blockLen >= 200)
                throw new Error('Sha3 supports only keccak-f1600 function');
            this.state = new Uint8Array(200);
            this.state32 = u32(this.state);
        }
        keccak() {
            keccakP(this.state32, this.rounds);
            this.posOut = 0;
            this.pos = 0;
        }
        update(data) {
            assert.exists(this);
            const { blockLen, state } = this;
            data = toBytes(data);
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                for (let i = 0; i < take; i++)
                    state[this.pos++] ^= data[pos++];
                if (this.pos === blockLen)
                    this.keccak();
            }
            return this;
        }
        finish() {
            if (this.finished)
                return;
            this.finished = true;
            const { state, suffix, pos, blockLen } = this;
            // Do the padding
            state[pos] ^= suffix;
            if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
                this.keccak();
            state[blockLen - 1] ^= 0x80;
            this.keccak();
        }
        writeInto(out) {
            assert.exists(this, false);
            assert.bytes(out);
            this.finish();
            const bufferOut = this.state;
            const { blockLen } = this;
            for (let pos = 0, len = out.length; pos < len;) {
                if (this.posOut >= blockLen)
                    this.keccak();
                const take = Math.min(blockLen - this.posOut, len - pos);
                out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
                this.posOut += take;
                pos += take;
            }
            return out;
        }
        xofInto(out) {
            // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
            if (!this.enableXOF)
                throw new Error('XOF is not possible for this instance');
            return this.writeInto(out);
        }
        xof(bytes) {
            assert.number(bytes);
            return this.xofInto(new Uint8Array(bytes));
        }
        digestInto(out) {
            assert.output(out, this);
            if (this.finished)
                throw new Error('digest() was already called');
            this.writeInto(out);
            this.destroy();
            return out;
        }
        digest() {
            return this.digestInto(new Uint8Array(this.outputLen));
        }
        destroy() {
            this.destroyed = true;
            this.state.fill(0);
        }
        _cloneInto(to) {
            const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
            to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
            to.state32.set(this.state32);
            to.pos = this.pos;
            to.posOut = this.posOut;
            to.finished = this.finished;
            to.rounds = rounds;
            // Suffix can change in cSHAKE
            to.suffix = suffix;
            to.outputLen = outputLen;
            to.enableXOF = enableXOF;
            to.destroyed = this.destroyed;
            return to;
        }
    }
    const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
    const sha3_224 = gen(0x06, 144, 224 / 8);
    /**
     * SHA3-256 hash function
     * @param message - that would be hashed
     */
    const sha3_256 = gen(0x06, 136, 256 / 8);
    const sha3_384 = gen(0x06, 104, 384 / 8);
    const sha3_512 = gen(0x06, 72, 512 / 8);
    const keccak_224 = gen(0x01, 144, 224 / 8);
    /**
     * keccak-256 hash function. Different from SHA3-256.
     * @param message - that would be hashed
     */
    const keccak_256 = gen(0x01, 136, 256 / 8);
    const keccak_384 = gen(0x01, 104, 384 / 8);
    const keccak_512 = gen(0x01, 72, 512 / 8);
    const genShake = (suffix, blockLen, outputLen) => wrapConstructorWithOpts((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true));
    genShake(0x1f, 168, 128 / 8);
    genShake(0x1f, 136, 256 / 8);

    // cSHAKE && KMAC (NIST SP800-185)
    function leftEncode(n) {
        const res = [n & 0xff];
        n >>= 8;
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.unshift(res.length);
        return new Uint8Array(res);
    }
    function rightEncode(n) {
        const res = [n & 0xff];
        n >>= 8;
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.push(res.length);
        return new Uint8Array(res);
    }
    function chooseLen(opts, outputLen) {
        return opts.dkLen === undefined ? outputLen : opts.dkLen;
    }
    const toBytesOptional = (buf) => (buf !== undefined ? toBytes(buf) : new Uint8Array([]));
    // NOTE: second modulo is necessary since we don't need to add padding if current element takes whole block
    const getPadding = (len, block) => new Uint8Array((block - (len % block)) % block);
    // Personalization
    function cshakePers(hash, opts = {}) {
        if (!opts || (!opts.personalization && !opts.NISTfn))
            return hash;
        // Encode and pad inplace to avoid unneccesary memory copies/slices (so we don't need to zero them later)
        // bytepad(encode_string(N) || encode_string(S), 168)
        const blockLenBytes = leftEncode(hash.blockLen);
        const fn = toBytesOptional(opts.NISTfn);
        const fnLen = leftEncode(8 * fn.length); // length in bits
        const pers = toBytesOptional(opts.personalization);
        const persLen = leftEncode(8 * pers.length); // length in bits
        if (!fn.length && !pers.length)
            return hash;
        hash.suffix = 0x04;
        hash.update(blockLenBytes).update(fnLen).update(fn).update(persLen).update(pers);
        let totalLen = blockLenBytes.length + fnLen.length + fn.length + persLen.length + pers.length;
        hash.update(getPadding(totalLen, hash.blockLen));
        return hash;
    }
    const gencShake = (suffix, blockLen, outputLen) => wrapConstructorWithOpts((opts = {}) => cshakePers(new Keccak(blockLen, suffix, chooseLen(opts, outputLen), true), opts));
    const cshake128 = gencShake(0x1f, 168, 128 / 8);
    const cshake256 = gencShake(0x1f, 136, 256 / 8);
    class KMAC extends Keccak {
        constructor(blockLen, outputLen, enableXOF, key, opts = {}) {
            super(blockLen, 0x1f, outputLen, enableXOF);
            cshakePers(this, { NISTfn: 'KMAC', personalization: opts.personalization });
            key = toBytes(key);
            // 1. newX = bytepad(encode_string(K), 168) || X || right_encode(L).
            const blockLenBytes = leftEncode(this.blockLen);
            const keyLen = leftEncode(8 * key.length);
            this.update(blockLenBytes).update(keyLen).update(key);
            const totalLen = blockLenBytes.length + keyLen.length + key.length;
            this.update(getPadding(totalLen, this.blockLen));
        }
        finish() {
            if (!this.finished)
                this.update(rightEncode(this.enableXOF ? 0 : this.outputLen * 8)); // outputLen in bits
            super.finish();
        }
        _cloneInto(to) {
            // Create new instance without calling constructor since key already in state and we don't know it.
            // Force "to" to be instance of KMAC instead of Sha3.
            if (!to) {
                to = Object.create(Object.getPrototypeOf(this), {});
                to.state = this.state.slice();
                to.blockLen = this.blockLen;
                to.state32 = u32(to.state);
            }
            return super._cloneInto(to);
        }
        clone() {
            return this._cloneInto();
        }
    }
    function genKmac(blockLen, outputLen, xof = false) {
        const kmac = (key, message, opts) => kmac.create(key, opts).update(message).digest();
        kmac.create = (key, opts = {}) => new KMAC(blockLen, chooseLen(opts, outputLen), xof, key, opts);
        return kmac;
    }
    const kmac128 = genKmac(168, 128 / 8);
    const kmac256 = genKmac(136, 256 / 8);
    genKmac(168, 128 / 8, true);
    genKmac(136, 256 / 8, true);
    // Kangaroo
    // Same as NIST rightEncode, but returns [0] for zero string
    function rightEncodeK12(n) {
        const res = [];
        for (; n > 0; n >>= 8)
            res.unshift(n & 0xff);
        res.push(res.length);
        return new Uint8Array(res);
    }
    const EMPTY = new Uint8Array([]);
    class KangarooTwelve extends Keccak {
        constructor(blockLen, leafLen, outputLen, rounds, opts) {
            super(blockLen, 0x07, outputLen, true, rounds);
            this.leafLen = leafLen;
            this.chunkLen = 8192;
            this.chunkPos = 0; // Position of current block in chunk
            this.chunksDone = 0; // How many chunks we already have
            const { personalization } = opts;
            this.personalization = toBytesOptional(personalization);
        }
        update(data) {
            data = toBytes(data);
            const { chunkLen, blockLen, leafLen, rounds } = this;
            for (let pos = 0, len = data.length; pos < len;) {
                if (this.chunkPos == chunkLen) {
                    if (this.leafHash)
                        super.update(this.leafHash.digest());
                    else {
                        this.suffix = 0x06; // Its safe to change suffix here since its used only in digest()
                        super.update(new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0]));
                    }
                    this.leafHash = new Keccak(blockLen, 0x0b, leafLen, false, rounds);
                    this.chunksDone++;
                    this.chunkPos = 0;
                }
                const take = Math.min(chunkLen - this.chunkPos, len - pos);
                const chunk = data.subarray(pos, pos + take);
                if (this.leafHash)
                    this.leafHash.update(chunk);
                else
                    super.update(chunk);
                this.chunkPos += take;
                pos += take;
            }
            return this;
        }
        finish() {
            if (this.finished)
                return;
            const { personalization } = this;
            this.update(personalization).update(rightEncodeK12(personalization.length));
            // Leaf hash
            if (this.leafHash) {
                super.update(this.leafHash.digest());
                super.update(rightEncodeK12(this.chunksDone));
                super.update(new Uint8Array([0xff, 0xff]));
            }
            super.finish.call(this);
        }
        destroy() {
            super.destroy.call(this);
            if (this.leafHash)
                this.leafHash.destroy();
            // We cannot zero personalization buffer since it is user provided and we don't want to mutate user input
            this.personalization = EMPTY;
        }
        _cloneInto(to) {
            const { blockLen, leafLen, leafHash, outputLen, rounds } = this;
            to || (to = new KangarooTwelve(blockLen, leafLen, outputLen, rounds, {}));
            super._cloneInto(to);
            if (leafHash)
                to.leafHash = leafHash._cloneInto(to.leafHash);
            to.personalization.set(this.personalization);
            to.leafLen = this.leafLen;
            to.chunkPos = this.chunkPos;
            to.chunksDone = this.chunksDone;
            return to;
        }
        clone() {
            return this._cloneInto();
        }
    }
    // Default to 32 bytes, so it can be used without opts
    const k12 = wrapConstructorWithOpts((opts = {}) => new KangarooTwelve(168, 32, chooseLen(opts, 32), 12, opts));
    // MarsupilamiFourteen
    const m14 = wrapConstructorWithOpts((opts = {}) => new KangarooTwelve(136, 64, chooseLen(opts, 64), 14, opts));

    // A tiny KDF for various applications like AES key-gen
    const SCRYPT_FACTOR = 2 ** 19;
    const PBKDF2_FACTOR = 2 ** 17;
    // Scrypt KDF
    function scrypt(password, salt) {
        return scrypt$1(password, salt, { N: SCRYPT_FACTOR, r: 8, p: 1, dkLen: 32 });
    }
    // PBKDF2-HMAC-SHA256
    function pbkdf2(password, salt) {
        return pbkdf2$1(sha256, password, salt, { c: PBKDF2_FACTOR, dkLen: 32 });
    }
    // Combines two 32-byte byte arrays
    function xor32(a, b) {
        bytes(a, 32);
        bytes(b, 32);
        const arr = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            arr[i] = a[i] ^ b[i];
        }
        return arr;
    }
    function strHasLength(str, min, max) {
        return typeof str === 'string' && str.length >= min && str.length <= max;
    }
    /**
     * Derives main seed. Takes a lot of time. Prefer `eskdf` method instead.
     */
    function deriveMainSeed(username, password) {
        if (!strHasLength(username, 8, 255))
            throw new Error('invalid username');
        if (!strHasLength(password, 8, 255))
            throw new Error('invalid password');
        const scr = scrypt(password + '\u{1}', username + '\u{1}');
        const pbk = pbkdf2(password + '\u{2}', username + '\u{2}');
        const res = xor32(scr, pbk);
        scr.fill(0);
        pbk.fill(0);
        return res;
    }
    /**
     * Converts protocol & accountId pair to HKDF salt & info params.
     */
    function getSaltInfo(protocol, accountId = 0) {
        // Note that length here also repeats two lines below
        // We do an additional length check here to reduce the scope of DoS attacks
        if (!(strHasLength(protocol, 3, 15) && /^[a-z0-9]{3,15}$/.test(protocol))) {
            throw new Error('invalid protocol');
        }
        // Allow string account ids for some protocols
        const allowsStr = /^password\d{0,3}|ssh|tor|file$/.test(protocol);
        let salt; // Extract salt. Default is undefined.
        if (typeof accountId === 'string') {
            if (!allowsStr)
                throw new Error('accountId must be a number');
            if (!strHasLength(accountId, 1, 255))
                throw new Error('accountId must be valid string');
            salt = toBytes(accountId);
        }
        else if (Number.isSafeInteger(accountId)) {
            if (accountId < 0 || accountId > 2 ** 32 - 1)
                throw new Error('invalid accountId');
            // Convert to Big Endian Uint32
            salt = new Uint8Array(4);
            createView(salt).setUint32(0, accountId, false);
        }
        else {
            throw new Error(`accountId must be a number${allowsStr ? ' or string' : ''}`);
        }
        const info = toBytes(protocol);
        return { salt, info };
    }
    function countBytes(num) {
        if (typeof num !== 'bigint' || num <= BigInt(128))
            throw new Error('invalid number');
        return Math.ceil(num.toString(2).length / 8);
    }
    /**
     * Parses keyLength and modulus options to extract length of result key.
     * If modulus is used, adds 64 bits to it as per FIPS 186 B.4.1 to combat modulo bias.
     */
    function getKeyLength(options) {
        if (!options || typeof options !== 'object')
            return 32;
        const hasLen = 'keyLength' in options;
        const hasMod = 'modulus' in options;
        if (hasLen && hasMod)
            throw new Error('cannot combine keyLength and modulus options');
        if (!hasLen && !hasMod)
            throw new Error('must have either keyLength or modulus option');
        // FIPS 186 B.4.1 requires at least 64 more bits
        const l = hasMod ? countBytes(options.modulus) + 8 : options.keyLength;
        if (!(typeof l === 'number' && l >= 16 && l <= 8192))
            throw new Error('invalid keyLength');
        return l;
    }
    /**
     * Converts key to bigint and divides it by modulus. Big Endian.
     * Implements FIPS 186 B.4.1, which removes 0 and modulo bias from output.
     */
    function modReduceKey(key, modulus) {
        const _1 = BigInt(1);
        const num = BigInt('0x' + bytesToHex(key)); // check for ui8a, then bytesToNumber()
        const res = (num % (modulus - _1)) + _1; // Remove 0 from output
        if (res < _1)
            throw new Error('expected positive number'); // Guard against bad values
        const len = key.length - 8; // FIPS requires 64 more bits = 8 bytes
        const hex = res.toString(16).padStart(len * 2, '0'); // numberToHex()
        const bytes = hexToBytes(hex);
        if (bytes.length !== len)
            throw new Error('invalid length of result key');
        return bytes;
    }
    /**
     * ESKDF
     * @param username - username, email, or identifier, min: 8 characters, should have enough entropy
     * @param password - password, min: 8 characters, should have enough entropy
     * @example
     * const kdf = await eskdf('example-university', 'beginning-new-example');
     * const key = kdf.deriveChildKey('aes', 0);
     * console.log(kdf.fingerprint);
     * kdf.expire();
     */
    async function eskdf(username, password) {
        // We are using closure + object instead of class because
        // we want to make `seed` non-accessible for any external function.
        let seed = deriveMainSeed(username, password);
        function deriveCK(protocol, accountId = 0, options) {
            bytes(seed, 32);
            // Validates protocol & accountId
            const { salt, info } = getSaltInfo(protocol, accountId);
            // Validates options
            const keyLength = getKeyLength(options);
            const key = hkdf(sha256, seed, salt, info, keyLength);
            // Modulus has already been validated
            return options && 'modulus' in options ? modReduceKey(key, options.modulus) : key;
        }
        function expire() {
            if (seed)
                seed.fill(1);
            seed = undefined;
        }
        // prettier-ignore
        const fingerprint = Array.from(deriveCK('fingerprint', 0))
            .slice(0, 6)
            .map((char) => char.toString(16).padStart(2, '0').toUpperCase())
            .join(':');
        return Object.freeze({ deriveChildKey: deriveCK, expire, fingerprint });
    }


    // var utils = { bytesToHex, randomBytes }; CHECK THIS 

    var sha256_1 = {};//require("@noble/hashes/sha256");
    sha256_1.sha256 = sha256;

    var hmac_1 = {}; // require("@noble/hashes/hmac");
    hmac_1.hmac = hmac;

    var ripemd160_1 = {}; // require("@noble/hashes/ripemd160");
    ripemd160_1.ripemd160 = ripemd160;

    hashmini.blake2b = blake2b;
    hashmini.blake2s = blake2s;
    hashmini.blake3 = blake3;
    hashmini.cshake128 = cshake128;
    hashmini.cshake256 = cshake256;
    hashmini.eskdf = eskdf;
    hashmini.hkdf = hkdf;
    hashmini.hmac = hmac;
    hashmini.k12 = k12;
    hashmini.keccak_224 = keccak_224;
    hashmini.keccak_256 = keccak_256;
    hashmini.keccak_384 = keccak_384;
    hashmini.keccak_512 = keccak_512;
    hashmini.kmac128 = kmac128;
    hashmini.kmac256 = kmac256;
    hashmini.m14 = m14;
    hashmini.pbkdf2 = pbkdf2$1;
    hashmini.pbkdf2Async = pbkdf2Async;
    hashmini.ripemd160 = ripemd160;
    hashmini.scrypt = scrypt$1;
    hashmini.scryptAsync = scryptAsync;
    hashmini.sha256 = sha256;
    hashmini.sha3_224 = sha3_224;
    hashmini.sha3_256 = sha3_256;
    hashmini.sha3_384 = sha3_384;
    hashmini.sha3_512 = sha3_512;
    hashmini.sha512 = sha512;
    hashmini.utils = utils;


    Object.defineProperty(hashmini, '__esModule', { value: true });




    /******
    * 
    START OF MICRO PACKED SECTION 
    * 
    * 
    ******/


    var P = {};
    /*  //ROHIT THIS FUNCTION IS CREATING PROBLEMS
        var __assign = (this && this.__assign) || function () {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };*/

    //Alternative implementation through ChatGPT
    var __assign = (this && this.__assign) || function () {
        return Object.assign.apply(Object, arguments);
    };


    Object.defineProperty(P, "__esModule", { value: true });
    P.magicBytes = P.magic = P.optional = P.flagged = P.flag = P.bytesFormatted = P.lazy = P.validate = P.apply = P.hex = P.cstring = P.string = P.bytes = P.bool = P.I8 = P.U8 = P.I16BE = P.I16LE = P.U16BE = P.U16LE = P.I32BE = P.I32LE = P.U32BE = P.U32LE = P.int = P.I64BE = P.I64LE = P.U64BE = P.U64LE = P.I128BE = P.I128LE = P.U128BE = P.U128LE = P.I256BE = P.I256LE = P.U256BE = P.U256LE = P.bigint = P.bits = P.coders = P.isCoder = P.wrap = P.checkBounds = P.Writer = P.Reader = P.isBytes = P.concatBytes = P.equalBytes = P.NULL = P.EMPTY = void 0;
    P.debug = P.nothing = P.base64armor = P.pointer = P.padRight = P.padLeft = P.ZeroPad = P.bitset = P.mappedTag = P.tag = P.map = P.array = P.prefix = P.tuple = P.struct = P.constant = void 0;
    //NOT NEEDED AFTTER INTEGRATION var base = require("@scure/base");
    /**
     * TODO:
     * - Holes, simplify pointers. Hole is some sized element which is skipped at encoding,
     *   but later other elements can write to it by path
     * - Composite / tuple keys for dict
     * - Web UI for easier debugging. We can wrap every coder to something that would write
     *   start & end positions to; and we can colorize specific bytes used by specific coder
     */
    // Useful default values
    P.EMPTY = new Uint8Array(); // Empty bytes array
    P.NULL = new Uint8Array([0]); // NULL
    function equalBytes(a, b) {
        if (a.length !== b.length)
            return false;
        for (var i = 0; i < a.length; i++)
            if (a[i] !== b[i])
                return false;
        return true;
    }
    P.equalBytes = equalBytes;
    function concatBytes() {
        var arrays = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            arrays[_i] = arguments[_i];
        }
        if (arrays.length === 1)
            return arrays[0];
        var length = arrays.reduce(function (a, arr) { return a + arr.length; }, 0);
        var result = new Uint8Array(length);
        for (var i = 0, pad = 0; i < arrays.length; i++) {
            var arr = arrays[i];
            result.set(arr, pad);
            pad += arr.length;
        }
        return result;
    }
    P.concatBytes = concatBytes;
    var isBytes = function (b) { return b instanceof Uint8Array; };
    P.isBytes = isBytes;
    // Utils
    var Reader = /** @class */ (function () {
        function Reader(data, path, fieldPath) {
            if (path === void 0) { path = []; }
            if (fieldPath === void 0) { fieldPath = []; }
            this.data = data;
            this.path = path;
            this.fieldPath = fieldPath;
            this.pos = 0;
            this.hasPtr = false;
            this.bitBuf = 0;
            this.bitPos = 0;
        }
        Reader.prototype.err = function (msg) {
            return new Error("Reader(".concat(this.fieldPath.join('/'), "): ").concat(msg));
        };
        // read bytes by absolute offset
        Reader.prototype.absBytes = function (n) {
            if (n > this.data.length)
                throw new Error('absBytes: Unexpected end of buffer');
            return this.data.subarray(n);
        };
        Reader.prototype.bytes = function (n, peek) {
            if (peek === void 0) { peek = false; }
            if (this.bitPos)
                throw this.err('readBytes: bitPos not empty');
            if (!Number.isFinite(n))
                throw this.err("readBytes: wrong length=".concat(n));
            if (this.pos + n > this.data.length)
                throw this.err('readBytes: Unexpected end of buffer');
            var slice = this.data.subarray(this.pos, this.pos + n);
            if (!peek)
                this.pos += n;
            return slice;
        };
        Reader.prototype.byte = function (peek) {
            if (peek === void 0) { peek = false; }
            if (this.bitPos)
                throw this.err('readByte: bitPos not empty');
            return this.data[peek ? this.pos : this.pos++];
        };
        Object.defineProperty(Reader.prototype, "leftBytes", {
            get: function () {
                return this.data.length - this.pos;
            },
            enumerable: false,
            configurable: true
        });
        Reader.prototype.isEnd = function () {
            return this.pos >= this.data.length && !this.bitPos;
        };
        Reader.prototype.length = function (len) {
            var byteLen;
            if (isCoder(len))
                byteLen = Number(len.decodeStream(this));
            else if (typeof len === 'number')
                byteLen = len;
            else if (typeof len === 'string')
                byteLen = getPath(this.path, len.split('/'));
            if (typeof byteLen === 'bigint')
                byteLen = Number(byteLen);
            if (typeof byteLen !== 'number')
                throw this.err("Wrong length: ".concat(byteLen));
            return byteLen;
        };
        // Note: bits reads in BE (left to right) mode: (0b1000_0000).readBits(1) == 1
        Reader.prototype.bits = function (bits) {
            if (bits > 32)
                throw this.err('BitReader: cannot read more than 32 bits in single call');
            var out = 0;
            while (bits) {
                if (!this.bitPos) {
                    this.bitBuf = this.data[this.pos++];
                    this.bitPos = 8;
                }
                var take = Math.min(bits, this.bitPos);
                this.bitPos -= take;
                //      out = (out << take) | ((this.bitBuf >> this.bitPos) & (Math.pow(2, take) - 1));
                out = (out << take) | ((this.bitBuf >> this.bitPos) & (BigInt(2) ** BigInt(take) - 1));
                //       this.bitBuf &= Math.pow(2, this.bitPos) - 1;
                this.bitBuf &= BigInt(2) ** BigInt(this.bitPos) - 1;
                bits -= take;
            }
            // Fix signed integers
            return out >>> 0;
        };
        Reader.prototype.find = function (needle, pos) {
            if (pos === void 0) { pos = this.pos; }
            if (!(0, P.isBytes)(needle))
                throw this.err("find: needle is not bytes! ".concat(needle));
            if (this.bitPos)
                throw this.err('findByte: bitPos not empty');
            if (!needle.length)
                throw this.err("find: needle is empty");
            // indexOf should be faster than full equalBytes check
            for (var idx = pos; (idx = this.data.indexOf(needle[0], idx)) !== -1; idx++) {
                if (idx === -1)
                    return;
                var leftBytes = this.data.length - idx;
                if (leftBytes < needle.length)
                    return;
                if (equalBytes(needle, this.data.subarray(idx, idx + needle.length)))
                    return idx;
            }
        };
        Reader.prototype.finish = function () {
            if (this.isEnd() || this.hasPtr)
                return;
            throw this.err("".concat(this.leftBytes, " bytes ").concat(this.bitPos, " bits left after unpack: ").concat(base.hex.encode(this.data.slice(this.pos))));
        };
        Reader.prototype.fieldPathPush = function (s) {
            this.fieldPath.push(s);
        };
        Reader.prototype.fieldPathPop = function () {
            this.fieldPath.pop();
        };
        return Reader;
    }());
    P.Reader = Reader;
    var Writer = /** @class */ (function () {
        function Writer(path, fieldPath) {
            if (path === void 0) { path = []; }
            if (fieldPath === void 0) { fieldPath = []; }
            this.path = path;
            this.fieldPath = fieldPath;
            this.buffers = [];
            this.pos = 0;
            this.ptrs = [];
            this.bitBuf = 0;
            this.bitPos = 0;
        }
        Writer.prototype.err = function (msg) {
            return new Error("Writer(".concat(this.fieldPath.join('/'), "): ").concat(msg));
        };
        Writer.prototype.bytes = function (b) {
            if (this.bitPos)
                throw this.err('writeBytes: ends with non-empty bit buffer');
            this.buffers.push(b);
            this.pos += b.length;
        };
        Writer.prototype.byte = function (b) {
            if (this.bitPos)
                throw this.err('writeByte: ends with non-empty bit buffer');
            this.buffers.push(new Uint8Array([b]));
            this.pos++;
        };
        Object.defineProperty(Writer.prototype, "buffer", {
            get: function () {
                if (this.bitPos)
                    throw this.err('buffer: ends with non-empty bit buffer');
                var buf = concatBytes.apply(void 0, this.buffers);
                for (var _i = 0, _a = this.ptrs; _i < _a.length; _i++) {
                    var ptr = _a[_i];
                    var pos = buf.length;
                    buf = concatBytes(buf, ptr.buffer);
                    var val = ptr.ptr.encode(pos);
                    for (var i = 0; i < val.length; i++)
                        buf[ptr.pos + i] = val[i];
                }
                return buf;
            },
            enumerable: false,
            configurable: true
        });
        Writer.prototype.length = function (len, value) {
            if (len === null)
                return;
            if (isCoder(len))
                return len.encodeStream(this, value);
            var byteLen;
            if (typeof len === 'number')
                byteLen = len;
            else if (typeof len === 'string')
                byteLen = getPath(this.path, len.split('/'));
            if (typeof byteLen === 'bigint')
                byteLen = Number(byteLen);
            if (byteLen === undefined || byteLen !== value)
                throw this.err("Wrong length: ".concat(byteLen, " len=").concat(len, " exp=").concat(value));
        };
        Writer.prototype.bits = function (value, bits) {
            if (bits > 32)
                throw this.err('writeBits: cannot write more than 32 bits in single call');
            // if (value >= Math.pow(2, bits))
            if (value >= BigInt(2) ** BigInt(bits))
                throw this.err("writeBits: value (".concat(value, ") >= 2**bits (").concat(bits, ")"));
            while (bits) {
                var take = Math.min(bits, 8 - this.bitPos);
                this.bitBuf = (this.bitBuf << take) | (value >> (bits - take));
                this.bitPos += take;
                bits -= take;
                //       value &= Math.pow(2, bits) - 1;
                value &= BigInt(2) ** BigInt(bits) - 1;
                if (this.bitPos === 8) {
                    this.bitPos = 0;
                    this.buffers.push(new Uint8Array([this.bitBuf]));
                    this.pos++;
                }
            }
        };
        Writer.prototype.fieldPathPush = function (s) {
            this.fieldPath.push(s);
        };
        Writer.prototype.fieldPathPop = function () {
            this.fieldPath.pop();
        };
        return Writer;
    }());
    P.Writer = Writer;
    // Immutable LE<->BE
    var swap = function (b) { return Uint8Array.from(b).reverse(); };
    function checkBounds(p, value, bits, signed) {
        if (signed) {
            // [-(2**(32-1)), 2**(32-1)-1]
            //   var signBit = Math.pow(2n, (bits - 1n));
            var signBit = BigInt(2n) ** BigInt((bits - 1n));

            if (value < -signBit || value >= signBit)
                throw p.err('sInt: value out of bounds');
        }
        else {
            // [0, 2**32-1]
            //   if (0n > value || value >= Math.pow(2n, bits))
            if (0n > value || value >= BigInt(2n) ** BigInt(bits))//Math.pow(2n, bits))    
                throw p.err('uInt: value out of bounds');
        }
    }
    P.checkBounds = checkBounds;
    // Wrap stream encoder into generic encoder
    function wrap(inner) {
        return __assign(__assign({}, inner), {
            encode: function (value) {
                var w = new Writer();
                inner.encodeStream(w, value);
                return w.buffer;
            }, decode: function (data) {
                var r = new Reader(data);
                var res = inner.decodeStream(r);
                r.finish();
                return res;
            }
        });
    }
    P.wrap = wrap;
    function getPath(objPath, path) {
        objPath = Array.from(objPath);
        var i = 0;
        for (; i < path.length; i++) {
            if (path[i] === '..')
                objPath.pop();
            else
                break;
        }
        var cur = objPath.pop();
        for (; i < path.length; i++) {
            if (!cur || cur[path[i]] === undefined)
                return undefined;
            cur = cur[path[i]];
        }
        return cur;
    }
    function isCoder(elm) {
        return (typeof elm.encode === 'function' &&
            typeof elm.encodeStream === 'function' &&
            typeof elm.decode === 'function' &&
            typeof elm.decodeStream === 'function');
    }
    P.isCoder = isCoder;
    // Coders (like in @scure/base) for common operations
    // TODO:
    // - move to base? very generic converters, not releated to base and packed
    // - encode/decode -> from/to? coder->convert?
    function dict() {
        return {
            encode: function (from) {
                var to = {};
                for (var _i = 0, from_1 = from; _i < from_1.length; _i++) {
                    var _a = from_1[_i], name = _a[0], value = _a[1];
                    if (to[name] !== undefined)
                        throw new Error("coders.dict: same key(".concat(name, ") appears twice in struct"));
                    to[name] = value;
                }
                return to;
            },
            decode: function (to) { return Object.entries(to); },
        };
    }
    // Safely converts bigint to number
    // Sometimes pointers / tags use u64 or other big numbers which cannot be represented by number,
    // but we still can use them since real value will be smaller than u32
    var number = {
        encode: function (from) {
            if (from > BigInt(Number.MAX_SAFE_INTEGER))
                throw new Error("coders.number: element bigger than MAX_SAFE_INTEGER=".concat(from));
            return Number(from);
        },
        decode: function (to) { return BigInt(to); },
        //   decode: function (to) {if (!isNaN(to)) { return BigInt(to);} else { return to;} },
    };
    function tsEnum(e) {
        return {
            encode: function (from) { return e[from]; },
            decode: function (to) { return e[to]; },
        };
    }
    function decimal(precision) {
        //var decimalMask = Math.pow(10n, BigInt(precision)); //CHECK THIS
        var decimalMask = BitInt(10n) ** BigInt(precision);
        return {
            encode: function (from) {
                var s = (from < 0n ? -from : from).toString(10);
                var sep = s.length - precision;
                if (sep < 0) {
                    s = s.padStart(s.length - sep, '0');
                    sep = 0;
                }
                var i = s.length - 1;
                for (; i >= sep && s[i] === '0'; i--)
                    ;
                var _a = [s.slice(0, sep), s.slice(sep, i + 1)], int = _a[0], frac = _a[1];
                if (!int)
                    int = '0';
                if (from < 0n)
                    int = '-' + int;
                if (!frac)
                    return int;
                return "".concat(int, ".").concat(frac);
            },
            decode: function (to) {
                var neg = false;
                if (to.startsWith('-')) {
                    neg = true;
                    to = to.slice(1);
                }
                var sep = to.indexOf('.');
                sep = sep === -1 ? to.length : sep;
                var _a = [to.slice(0, sep), to.slice(sep + 1)], intS = _a[0], fracS = _a[1];
                var int = BigInt(intS) * decimalMask;
                var fracLen = Math.min(fracS.length, precision);
                // var frac = BigInt(fracS.slice(0, fracLen)) * Math.pow(10n, BigInt(precision - fracLen));
                var frac = BigInt(fracS.slice(0, fracLen)) * (BigInt(10n) ** BigInt(precision - fracLen));
                var value = int + frac;
                return neg ? -value : value;
            },
        };
    }

    /**
     * Allows to split big conditional coders into a small one; also sort of parser combinator:
     *
     *   `encode = [Ae, Be]; decode = [Ad, Bd]`
     *   ->
     *   `match([{encode: Ae, decode: Ad}, {encode: Be; decode: Bd}])`
     *
     * 1. It is easier to reason: encode/decode of specific part are closer to each other
     * 2. Allows composable coders and ability to add conditions on runtime
     * @param lst
     * @returns
     */
    function match(lst) {
        return {
            encode: function (from) {
                for (var _i = 0, lst_1 = lst; _i < lst_1.length; _i++) {
                    var c = lst_1[_i];
                    var elm = c.encode(from);
                    if (elm !== undefined)
                        return elm;
                }
                throw new Error("match/encode: cannot find match in ".concat(from));
            },
            decode: function (to) {
                for (var _i = 0, lst_2 = lst; _i < lst_2.length; _i++) {
                    var c = lst_2[_i];
                    var elm = c.decode(to);
                    if (elm !== undefined)
                        return elm;
                }
                throw new Error("match/decode: cannot find match in ".concat(to));
            },
        };
    }
    P.coders = { dict: dict, number: number, tsEnum: tsEnum, decimal: decimal, match: match };
    // PackedCoders
    var bits = function (len) {
        return wrap({
            encodeStream: function (w, value) { return w.bits(value, len); },
            decodeStream: function (r) { return r.bits(len); },
        });
    };
    P.bits = bits;
    var bigint = function (size, le, signed) {
        if (le === void 0) { le = false; }
        if (signed === void 0) { signed = false; }
        return wrap({
            size: size,
            encodeStream: function (w, value) {
                if (typeof value !== 'number' && typeof value !== 'bigint')
                    throw w.err("bigint: invalid value: ".concat(value));
                var _value = BigInt(value);
                var bLen = BigInt(size);
                checkBounds(w, _value, 8n * bLen, !!signed);
                //     var signBit = Math.pow(2n, (8n * bLen - 1n));
                var signBit = BigInt(2n) ** BigInt(8n * bLen - 1n);

                if (signed && _value < 0)
                    _value = _value | signBit;
                var b = [];
                for (var i = 0; i < size; i++) {
                    b.push(Number(_value & 255n));
                    _value >>= 8n;
                }
                var res = new Uint8Array(b).reverse();
                w.bytes(le ? res.reverse() : res);
            },
            decodeStream: function (r) {
                var bLen = BigInt(size);
                var value = r.bytes(size);
                if (le)
                    value = swap(value);
                var b = swap(value);
                //var signBit = Math.pow(2n, (8n * bLen - 1n));
                var signBit = BigInt(2n) ** BigInt(8n * bLen - 1n);
                var res = 0n;
                for (var i = 0; i < b.length; i++)
                    res |= BigInt(b[i]) << (8n * BigInt(i));
                if (signed && res & signBit)
                    res = (res ^ signBit) - signBit;
                checkBounds(r, res, 8n * bLen, !!signed);
                return res;
            },
        });
    };
    P.bigint = bigint;
    P.U256LE = (0, P.bigint)(32, true);
    P.U256BE = (0, P.bigint)(32, false);
    P.I256LE = (0, P.bigint)(32, true, true);
    P.I256BE = (0, P.bigint)(32, false, true);
    P.U128LE = (0, P.bigint)(16, true);
    P.U128BE = (0, P.bigint)(16, false);
    P.I128LE = (0, P.bigint)(16, true, true);
    P.I128BE = (0, P.bigint)(16, false, true);
    P.U64LE = (0, P.bigint)(8, true);
    P.U64BE = (0, P.bigint)(8, false);
    P.I64LE = (0, P.bigint)(8, true, true);
    P.I64BE = (0, P.bigint)(8, false, true);
    var int = function (size, le, signed) {
        if (le === void 0) { le = false; }
        if (signed === void 0) { signed = false; }
        if (size > 6)
            throw new Error('int supports size up to 6 bytes (48 bits), for other use bigint');
        return apply((0, P.bigint)(size, le, signed), P.coders.number);
    };
    P.int = int;
    P.U32LE = (0, P.int)(4, true);
    P.U32BE = (0, P.int)(4, false);
    P.I32LE = (0, P.int)(4, true, true);
    P.I32BE = (0, P.int)(4, false, true);
    P.U16LE = (0, P.int)(2, true);
    P.U16BE = (0, P.int)(2, false);
    P.I16LE = (0, P.int)(2, true, true);
    P.I16BE = (0, P.int)(2, false, true);
    P.U8 = (0, P.int)(1, false);
    P.I8 = (0, P.int)(1, false, true);
    P.bool = wrap({
        size: 1,
        encodeStream: function (w, value) { return w.byte(value ? 1 : 0); },
        decodeStream: function (r) {
            var value = r.byte();
            if (value !== 0 && value !== 1)
                throw r.err("bool: invalid value ".concat(value));
            return value === 1;
        },
    });
    // Can be done w array, but specific implementation should be
    // faster: no need to create js array of numbers.
    var bytes = function (len, le) {
        if (le === void 0) { le = false; }
        return wrap({
            size: typeof len === 'number' ? len : undefined,
            encodeStream: function (w, value) {
                if (!(0, P.isBytes)(value))
                    throw w.err("bytes: invalid value ".concat(value));
                if (!(0, P.isBytes)(len))
                    w.length(len, value.length);
                w.bytes(le ? swap(value) : value);
                if ((0, P.isBytes)(len))
                    w.bytes(len);
            },
            decodeStream: function (r) {
                var bytes;
                if ((0, P.isBytes)(len)) {
                    var tPos = r.find(len);
                    if (!tPos)
                        throw r.err("bytes: cannot find terminator");
                    bytes = r.bytes(tPos - r.pos);
                    r.bytes(len.length);
                }
                else
                    bytes = r.bytes(len === null ? r.leftBytes : r.length(len));
                return le ? swap(bytes) : bytes;
            },
        });
    };
    P.bytes = bytes;
    var string = function (len, le) {
        if (le === void 0) { le = false; }
        var inner = (0, P.bytes)(len, le);
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) { return inner.encodeStream(w, base.utf8.decode(value)); },
            decodeStream: function (r) { return base.utf8.encode(inner.decodeStream(r)); },
        });
    };
    P.string = string;
    P.cstring = (0, P.string)(P.NULL);
    var hex = function (len, le, withZero) {
        if (le === void 0) { le = false; }
        if (withZero === void 0) { withZero = false; }
        var inner = (0, P.bytes)(len, le);
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) {
                if (withZero && !value.startsWith('0x'))
                    throw new Error('hex(withZero=true).encode input should start with 0x');
                var bytes = base.hex.decode(withZero ? value.slice(2) : value);
                return inner.encodeStream(w, bytes);
            },
            decodeStream: function (r) {
                return (withZero ? '0x' : '') + base.hex.encode(inner.decodeStream(r));
            },
        });
    };
    P.hex = hex;
    // Interoperability with base
    function apply(inner, b) {
        if (!isCoder(inner))
            throw new Error("apply: invalid inner value ".concat(inner));
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) {
                var innerValue;
                try {
                    innerValue = b.decode(value);
                }
                catch (e) {
                    throw w.err('' + e);
                }
                return inner.encodeStream(w, innerValue);
            },
            decodeStream: function (r) {
                var innerValue = inner.decodeStream(r);
                try {
                    return b.encode(innerValue);
                }
                catch (e) {
                    throw r.err('' + e);
                }
            },
        });
    }
    P.apply = apply;
    // Additional check of values both on encode and decode steps.
    // E.g. to force uint32 to be 1..10
    function validate(inner, fn) {
        if (!isCoder(inner))
            throw new Error("validate: invalid inner value ".concat(inner));
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) { return inner.encodeStream(w, fn(value)); },
            decodeStream: function (r) { return fn(inner.decodeStream(r)); },
        });
    }
    P.validate = validate;
    function lazy(fn) {
        return wrap({
            encodeStream: function (w, value) { return fn().encodeStream(w, value); },
            decodeStream: function (r) { return fn().decodeStream(r); },
        });
    }
    P.lazy = lazy;
    var bytesFormatted = function (len, fmt, le) {
        if (le === void 0) { le = false; }
        var inner = (0, P.bytes)(len, le);
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) { return inner.encodeStream(w, base.bytes(fmt, value)); },
            decodeStream: function (r) { return base.str(fmt, inner.decodeStream(r)); },
        });
    };
    P.bytesFormatted = bytesFormatted;
    // Returns true if some marker exists, otherwise false. Xor argument flips behaviour
    var flag = function (flagValue, xor) {
        if (xor === void 0) { xor = false; }
        return wrap({
            size: flagValue.length,
            encodeStream: function (w, value) {
                if (!!value !== xor)
                    w.bytes(flagValue);
            },
            decodeStream: function (r) {
                var hasFlag = r.leftBytes >= flagValue.length;
                if (hasFlag) {
                    hasFlag = equalBytes(r.bytes(flagValue.length, true), flagValue);
                    // Found flag, advance cursor position
                    if (hasFlag)
                        r.bytes(flagValue.length);
                }
                // hasFlag ^ xor
                return hasFlag !== xor;
            },
        });
    };
    P.flag = flag;
    // Decode/encode only if flag found
    function flagged(path, inner, def) {
        if (!isCoder(inner))
            throw new Error("flagged: invalid inner value ".concat(inner));
        return wrap({
            encodeStream: function (w, value) {
                if (typeof path === 'string') {
                    if (getPath(w.path, path.split('/')))
                        inner.encodeStream(w, value);
                    else if (def)
                        inner.encodeStream(w, def);
                }
                else {
                    path.encodeStream(w, !!value);
                    if (!!value)
                        inner.encodeStream(w, value);
                    else if (def)
                        inner.encodeStream(w, def);
                }
            },
            decodeStream: function (r) {
                var hasFlag = false;
                if (typeof path === 'string')
                    hasFlag = getPath(r.path, path.split('/'));
                else
                    hasFlag = path.decodeStream(r);
                // If there is a flag -- decode and return value
                if (hasFlag)
                    return inner.decodeStream(r);
                else if (def)
                    inner.decodeStream(r);
            },
        });
    }
    P.flagged = flagged;
    function optional(flag, inner, def) {
        if (!isCoder(flag) || !isCoder(inner))
            throw new Error("optional: invalid flag or inner value flag=".concat(flag, " inner=").concat(inner));
        return wrap({
            size: def !== undefined && flag.size && inner.size ? flag.size + inner.size : undefined,
            encodeStream: function (w, value) {
                flag.encodeStream(w, !!value);
                if (value)
                    inner.encodeStream(w, value);
                else if (def !== undefined)
                    inner.encodeStream(w, def);
            },
            decodeStream: function (r) {
                if (flag.decodeStream(r))
                    return inner.decodeStream(r);
                else if (def !== undefined)
                    inner.decodeStream(r);
            },
        });
    }
    P.optional = optional;
    function magic(inner, constant, check) {
        if (check === void 0) { check = true; }
        if (!isCoder(inner))
            throw new Error("flagged: invalid inner value ".concat(inner));
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) { return inner.encodeStream(w, constant); },
            decodeStream: function (r) {
                var value = inner.decodeStream(r);
                if ((check && typeof value !== 'object' && value !== constant) ||
                    ((0, P.isBytes)(constant) && !equalBytes(constant, value))) {
                    throw r.err("magic: invalid value: ".concat(value, " !== ").concat(constant));
                }
                return;
            },
        });
    }
    P.magic = magic;
    var magicBytes = function (constant) {
        var c = typeof constant === 'string' ? base.utf8.decode(constant) : constant;
        return magic((0, P.bytes)(c.length), c);
    };
    P.magicBytes = magicBytes;
    function constant(c) {
        return wrap({
            encodeStream: function (w, value) {
                if (value !== c)
                    throw new Error("constant: invalid value ".concat(value, " (exp: ").concat(c, ")"));
            },
            decodeStream: function (r) { return c; },
        });
    }
    P.constant = constant;
    function sizeof(fields) {
        var size = 0;
        for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
            var f = fields_1[_i];
            if (!f.size)
                return;
            size += f.size;
        }
        return size;
    }
    function struct(fields) {
        if (Array.isArray(fields))
            throw new Error('Packed.Struct: got array instead of object');
        return wrap({
            size: sizeof(Object.values(fields)),
            encodeStream: function (w, value) {
                if (typeof value !== 'object' || value === null)
                    throw w.err("struct: invalid value ".concat(value));
                w.path.push(value);
                for (var name in fields) {
                    w.fieldPathPush(name);
                    var field = fields[name];
                    field.encodeStream(w, value[name]);
                    w.fieldPathPop();
                }
                w.path.pop();
            },
            decodeStream: function (r) {
                var res = {};
                r.path.push(res);
                for (var name in fields) {
                    r.fieldPathPush(name);
                    res[name] = fields[name].decodeStream(r);
                    r.fieldPathPop();
                }
                r.path.pop();
                return res;
            },
        });
    }
    P.struct = struct;
    function tuple(fields) {
        if (!Array.isArray(fields))
            throw new Error("Packed.Tuple: got ".concat(typeof fields, " instead of array"));
        return wrap({
            size: sizeof(fields),
            encodeStream: function (w, value) {
                if (!Array.isArray(value))
                    throw w.err("tuple: invalid value ".concat(value));
                w.path.push(value);
                for (var i = 0; i < fields.length; i++) {
                    w.fieldPathPush('' + i);
                    fields[i].encodeStream(w, value[i]);
                    w.fieldPathPop();
                }
                w.path.pop();
            },
            decodeStream: function (r) {
                var res = [];
                r.path.push(res);
                for (var i = 0; i < fields.length; i++) {
                    r.fieldPathPush('' + i);
                    res.push(fields[i].decodeStream(r));
                    r.fieldPathPop();
                }
                r.path.pop();
                return res;
            },
        });
    }
    P.tuple = tuple;
    function prefix(len, inner) {
        if (!isCoder(inner))
            throw new Error("prefix: invalid inner value ".concat(inner));
        if ((0, P.isBytes)(len))
            throw new Error("prefix: len cannot be Uint8Array");
        var b = (0, P.bytes)(len);
        return wrap({
            size: typeof len === 'number' ? len : undefined,
            encodeStream: function (w, value) {
                var wChild = new Writer(w.path, w.fieldPath);
                inner.encodeStream(wChild, value);
                b.encodeStream(w, wChild.buffer);
            },
            decodeStream: function (r) {
                var data = b.decodeStream(r);
                return inner.decodeStream(new Reader(data, r.path, r.fieldPath));
            },
        });
    }
    P.prefix = prefix;
    function array(len, inner) {
        if (!isCoder(inner))
            throw new Error("array: invalid inner value ".concat(inner));
        return wrap({
            size: typeof len === 'number' && inner.size ? len * inner.size : undefined,
            encodeStream: function (w, value) {
                if (!Array.isArray(value))
                    throw w.err("array: invalid value ".concat(value));
                if (!(0, P.isBytes)(len))
                    w.length(len, value.length);
                w.path.push(value);
                for (var i = 0; i < value.length; i++) {
                    w.fieldPathPush('' + i);
                    var elm = value[i];
                    var startPos = w.pos;
                    inner.encodeStream(w, elm);
                    if ((0, P.isBytes)(len)) {
                        // Terminator is bigger than elm size, so skip
                        if (len.length > w.pos - startPos)
                            continue;
                        var data = w.buffer.subarray(startPos, w.pos);
                        // There is still possible case when multiple elements create terminator,
                        // but it is hard to catch here, will be very slow
                        if (equalBytes(data.subarray(0, len.length), len))
                            throw w.err("array: inner element encoding same as separator. elm=".concat(elm, " data=").concat(data));
                    }
                    w.fieldPathPop();
                }
                w.path.pop();
                if ((0, P.isBytes)(len))
                    w.bytes(len);
            },
            decodeStream: function (r) {
                var res = [];
                if (len === null) {
                    var i = 0;
                    r.path.push(res);
                    while (!r.isEnd()) {
                        r.fieldPathPush('' + i++);
                        res.push(inner.decodeStream(r));
                        r.fieldPathPop();
                        if (inner.size && r.leftBytes < inner.size)
                            break;
                    }
                    r.path.pop();
                }
                else if ((0, P.isBytes)(len)) {
                    var i = 0;
                    r.path.push(res);
                    while (true) {
                        if (equalBytes(r.bytes(len.length, true), len)) {
                            // Advance cursor position if terminator found
                            r.bytes(len.length);
                            break;
                        }
                        r.fieldPathPush('' + i++);
                        res.push(inner.decodeStream(r));
                        r.fieldPathPop();
                    }
                    r.path.pop();
                }
                else {
                    r.fieldPathPush('arrayLen');
                    var length = r.length(len);
                    r.fieldPathPop();
                    r.path.push(res);
                    for (var i = 0; i < length; i++) {
                        r.fieldPathPush('' + i);
                        res.push(inner.decodeStream(r));
                        r.fieldPathPop();
                    }
                    r.path.pop();
                }
                return res;
            },
        });
    }
    P.array = array;
    function map(inner, variants) {
        if (!isCoder(inner))
            throw new Error("map: invalid inner value ".concat(inner));
        var variantNames = new Map();
        for (var k in variants)
            variantNames.set(variants[k], k);
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) {
                if (typeof value !== 'string')
                    throw w.err("map: invalid value ".concat(value));
                if (!(value in variants))
                    throw w.err("Map: unknown variant: ".concat(value));
                inner.encodeStream(w, variants[value]);
            },
            decodeStream: function (r) {
                var variant = inner.decodeStream(r);
                var name = variantNames.get(variant);
                if (name === undefined)
                    throw r.err("Enum: unknown value: ".concat(variant, " ").concat(Array.from(variantNames.keys())));
                return name;
            },
        });
    }
    P.map = map;
    function tag(tag, variants) {
        if (!isCoder(tag))
            throw new Error("tag: invalid tag value ".concat(tag));
        return wrap({
            size: tag.size,
            encodeStream: function (w, value) {
                var TAG = value.TAG, data = value.data;
                var dataType = variants[TAG];
                if (!dataType)
                    throw w.err("Tag: invalid tag ".concat(TAG.toString()));
                tag.encodeStream(w, TAG);
                dataType.encodeStream(w, data);
            },
            decodeStream: function (r) {
                var TAG = tag.decodeStream(r);
                var dataType = variants[TAG];
                if (!dataType)
                    throw r.err("Tag: invalid tag ".concat(TAG));
                return { TAG: TAG, data: dataType.decodeStream(r) };
            },
        });
    }
    P.tag = tag;
    // Takes {name: [value, coder]}
    function mappedTag(tagCoder, variants) {
        if (!isCoder(tagCoder))
            throw new Error("mappedTag: invalid tag value ".concat(tag));
        var mapValue = {};
        var tagValue = {};
        for (var key in variants) {
            mapValue[key] = variants[key][0];
            tagValue[key] = variants[key][1];
        }
        return tag(map(tagCoder, mapValue), tagValue);
    }
    P.mappedTag = mappedTag;
    function bitset(names, pad) {
        if (pad === void 0) { pad = false; }
        return wrap({
            encodeStream: function (w, value) {
                if (typeof value !== 'object' || value === null)
                    throw w.err("bitset: invalid value ".concat(value));
                for (var i = 0; i < names.length; i++)
                    w.bits(+value[names[i]], 1);
                if (pad && names.length % 8)
                    w.bits(0, 8 - (names.length % 8));
            },
            decodeStream: function (r) {
                var out = {};
                for (var i = 0; i < names.length; i++)
                    out[names[i]] = !!r.bits(1);
                if (pad && names.length % 8)
                    r.bits(8 - (names.length % 8));
                return out;
            },
        });
    }
    P.bitset = bitset;
    var ZeroPad = function (_) { return 0; };
    P.ZeroPad = ZeroPad;
    function padLength(blockSize, len) {
        if (len % blockSize === 0)
            return 0;
        return blockSize - (len % blockSize);
    }
    function padLeft(blockSize, inner, padFn) {
        if (!isCoder(inner))
            throw new Error("padLeft: invalid inner value ".concat(inner));
        var _padFn = padFn || P.ZeroPad;
        if (!inner.size)
            throw new Error('padLeft with dynamic size argument is impossible');
        return wrap({
            size: inner.size + padLength(blockSize, inner.size),
            encodeStream: function (w, value) {
                var padBytes = padLength(blockSize, inner.size);
                for (var i = 0; i < padBytes; i++)
                    w.byte(_padFn(i));
                inner.encodeStream(w, value);
            },
            decodeStream: function (r) {
                r.bytes(padLength(blockSize, inner.size));
                return inner.decodeStream(r);
            },
        });
    }
    P.padLeft = padLeft;
    function padRight(blockSize, inner, padFn) {
        if (!isCoder(inner))
            throw new Error("padRight: invalid inner value ".concat(inner));
        var _padFn = padFn || P.ZeroPad;
        return wrap({
            size: inner.size ? inner.size + padLength(blockSize, inner.size) : undefined,
            encodeStream: function (w, value) {
                var pos = w.pos;
                inner.encodeStream(w, value);
                var padBytes = padLength(blockSize, w.pos - pos);
                for (var i = 0; i < padBytes; i++)
                    w.byte(_padFn(i));
            },
            decodeStream: function (r) {
                var start = r.pos;
                var res = inner.decodeStream(r);
                r.bytes(padLength(blockSize, r.pos - start));
                return res;
            },
        });
    }
    P.padRight = padRight;
    function pointer(ptr, inner, sized) {
        if (sized === void 0) { sized = false; }
        if (!isCoder(ptr))
            throw new Error("pointer: invalid ptr value ".concat(ptr));
        if (!isCoder(inner))
            throw new Error("pointer: invalid inner value ".concat(inner));
        if (!ptr.size)
            throw new Error('Pointer: unsized ptr');
        return wrap({
            size: sized ? ptr.size : undefined,
            encodeStream: function (w, value) {
                var start = w.pos;
                ptr.encodeStream(w, 0);
                w.ptrs.push({ pos: start, ptr: ptr, buffer: inner.encode(value) });
            },
            decodeStream: function (r) {
                var ptrVal = ptr.decodeStream(r);
                // This check enforces termination of parser, if there is backwards pointers,
                // then it is possible to create loop and cause DoS.
                if (ptrVal < r.pos)
                    throw new Error('pointer.decodeStream pointer less than position');
                r.hasPtr = true;
                var rChild = new Reader(r.absBytes(ptrVal), r.path, r.fieldPath);
                return inner.decodeStream(rChild);
            },
        });
    }
    P.pointer = pointer;
    // lineLen: gpg=64, ssh=70
    function base64armor(name, lineLen, inner, checksum) {
        var markBegin = "-----BEGIN ".concat(name.toUpperCase(), "-----");
        var markEnd = "-----END ".concat(name.toUpperCase(), "-----");
        return {
            encode: function (value) {
                var data = inner.encode(value);
                var encoded = base.base64.encode(data);
                var lines = [];
                for (var i = 0; i < encoded.length; i += lineLen) {
                    var s = encoded.slice(i, i + lineLen);
                    if (s.length)
                        lines.push("".concat(encoded.slice(i, i + lineLen), "\n"));
                }
                var body = lines.join('');
                if (checksum)
                    body += "=".concat(base.base64.encode(checksum(data)), "\n");
                return "".concat(markBegin, "\n\n").concat(body).concat(markEnd, "\n");
            },
            decode: function (s) {
                var lines = s.replace(markBegin, '').replace(markEnd, '').trim().split('\n');
                lines = lines.map(function (l) { return l.replace('\r', '').trim(); });
                if (checksum && lines[lines.length - 1].startsWith('=')) {
                    var body = base.base64.decode(lines.slice(0, -1).join(''));
                    var cs = lines[lines.length - 1].slice(1);
                    var realCS = base.base64.encode(checksum(body));
                    if (realCS !== cs)
                        throw new Error("Base64Armor: invalid checksum ".concat(cs, " instead of ").concat(realCS));
                    return inner.decode(body);
                }
                return inner.decode(base.base64.decode(lines.join('')));
            },
        };
    }
    P.base64armor = base64armor;
    // Does nothing at all
    P.nothing = magic((0, P.bytes)(0), P.EMPTY);
    function debug(inner) {
        if (!isCoder(inner))
            throw new Error("debug: invalid inner value ".concat(inner));
        var log = function (name, rw, value) {
            console.log("DEBUG/".concat(name, "(").concat(rw.fieldPath.join('/'), "):"), { type: typeof value, value: value });
            return value;
        };
        return wrap({
            size: inner.size,
            encodeStream: function (w, value) { return inner.encodeStream(w, log('encode', w, value)); },
            decodeStream: function (r) { return log('decode', r, inner.decodeStream(r)); },
        });
    }
    P.debug = debug;


    /******
     * 
     START OF TAPROOT SECTION 
     * 
     * 
     ******/

    var __assign = (this && this.__assign) || function () {
        __assign = Object.assign || function (t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    //var taproot = {};
    Object.defineProperty(taproot, "__esModule", { value: true });
    taproot.Transaction = taproot.tapLeafHash = taproot.TAP_LEAF_VERSION = taproot._sortPubkeys = taproot.SigHashCoder = taproot.SignatureHash = taproot.Address = taproot.WIF = taproot.parseWitnessProgram = taproot.programToWitness = taproot.OutScript = taproot.p2tr_ms = taproot.p2tr_pk = taproot.p2tr_ns = taproot.combinations = taproot.p2tr = taproot.TAPROOT_UNSPENDABLE_KEY = taproot.taprootListToTree = taproot.p2ms = taproot.p2wpkh = taproot.p2wsh = taproot.p2sh = taproot.p2pkh = taproot.p2pk = taproot.RawPSBTV2 = taproot.RawPSBTV0 = taproot._DebugPSBT = taproot._RawPSBTV2 = taproot._RawPSBTV0 = taproot.TaprootControlBlock = taproot.RawTx = taproot.RawWitness = taproot.RawOutput = taproot.RawInput = taproot.VarBytes = taproot.BTCArray = taproot.CompactSize = taproot.Script = taproot.OPNum = taproot.OP = taproot.cmp = taproot.decimal = taproot.DEFAULT_SEQUENCE = taproot.DEFAULT_LOCKTIME = taproot.DEFAULT_VERSION = taproot.PRECISION = taproot.NETWORK = taproot.taprootTweakPubkey = taproot.taprootTweakPrivKey = taproot.base58check = void 0;
    taproot.PSBTCombine = taproot.bip32Path = taproot.sortedMultisig = taproot.multisig = taproot.getAddress = void 0;
    /*! micro-btc-signer - MIT License (c) 2022 Paul Miller (paulmillr.com) */

    /*****
    // ALL OF THESE ARE INTEGRATED ABOVE
    
    var secp = require("@noble/secp256k1");
    var base = require("@scure/base");
    var sha256_1 = require("@noble/hashes/sha256");
    var hmac_1 = require("@noble/hashes/hmac");
    var ripemd160_1 = require("@noble/hashes/ripemd160");
    var P = require("micro-packed");
    *****/

    var hash160 = function (msg) { return (0, ripemd160_1.ripemd160)((0, sha256_1.sha256)(msg)); };
    var sha256x2 = function () {
        var msgs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msgs[_i] = arguments[_i];
        }
        return (0, sha256_1.sha256)((0, sha256_1.sha256)(concat.apply(void 0, msgs)));
    };
    var concat = P.concatBytes;
    // Make base58check work
    taproot.base58check = base.base58check(sha256_1.sha256);
    // Enable sync API for noble-secp256k1
    secp.utils.hmacSha256Sync = function (key) {
        var msgs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            msgs[_i - 1] = arguments[_i];
        }
        return (0, hmac_1.hmac)(sha256_1.sha256, key, concat.apply(void 0, msgs));
    };
    secp.utils.sha256Sync = function () {
        var msgs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msgs[_i] = arguments[_i];
        }
        return (0, sha256_1.sha256)(concat.apply(void 0, msgs));
    };
    var taggedHash = secp.utils.taggedHashSync;
    var PubT;
    (function (PubT) {
        PubT[PubT["ecdsa"] = 0] = "ecdsa";
        PubT[PubT["schnorr"] = 1] = "schnorr";
    })(PubT || (PubT = {}));
    var validatePubkey = function (pub, type) {
        var len = pub.length;
        if (type === PubT.ecdsa) {
            if (len === 32)
                throw new Error('Expected non-Schnorr key');
        }
        else if (type === PubT.schnorr) {
            if (len !== 32)
                throw new Error('Expected 32-byte Schnorr key');
        }
        else {
            throw new Error('Unknown key type');
        }
        secp.Point.fromHex(pub); // does assertValidity
        return pub;
    };
    function isValidPubkey(pub, type) {
        try {
            return !!validatePubkey(pub, type);
        }
        catch (e) {
            return false;
        }
    }
    // Not best way, but closest to bitcoin implementation (easier to check)
    var hasLowR = function (sig) { return secp.Signature.fromHex(sig).toCompactRawBytes()[0] < 0x80; };
    // TODO: move to @noble/secp256k1?
    function signECDSA(hash, privateKey, lowR) {
        if (lowR === void 0) { lowR = false; }
        var sig = secp.signSync(hash, privateKey, { canonical: true });
        if (lowR && !hasLowR(sig)) {
            var extraEntropy = new Uint8Array(32);
            for (var cnt = 0; cnt < Number.MAX_SAFE_INTEGER; cnt++) {
                extraEntropy.set(P.U32LE.encode(cnt));
                sig = secp.signSync(hash, privateKey, { canonical: true, extraEntropy: extraEntropy });
                if (hasLowR(sig))
                    break;
            }
        }
        return sig;
    }
    function taprootTweakPrivKey(privKey, merkleRoot) {
        if (merkleRoot === void 0) { merkleRoot = new Uint8Array(); }
        var n = secp.CURVE.n;
        var priv = secp.utils._normalizePrivateKey(privKey);
        var point = secp.Point.fromPrivateKey(priv);
        var tweak = taggedHash('TapTweak', point.toRawX(), merkleRoot);
        var privWithProperY = point.hasEvenY() ? priv : n - priv;
        var tweaked = secp.utils.mod(privWithProperY + secp.utils._normalizePrivateKey(tweak), n);
        return secp.utils._bigintTo32Bytes(tweaked);
    }
    taproot.taprootTweakPrivKey = taprootTweakPrivKey;
    function taprootTweakPubkey(pubKey, h) {
        var tweak = taggedHash('TapTweak', pubKey, h);
        var tweaked = secp.Point.fromHex(pubKey).add(secp.Point.fromPrivateKey(tweak));
        return [tweaked.toRawX(), !tweaked.hasEvenY()];
    }
    taproot.taprootTweakPubkey = taprootTweakPubkey;
    // Can be 33 or 64 bytes
    var PubKeyECDSA = P.validate(P.bytes(null), function (pub) { return validatePubkey(pub, PubT.ecdsa); });
    var PubKeySchnorr = P.validate(P.bytes(32), function (pub) { return validatePubkey(pub, PubT.schnorr); });
    var SignatureSchnorr = P.validate(P.bytes(null), function (sig) {
        if (sig.length !== 64 && sig.length !== 65)
            throw new Error('Schnorr signature should be 64 or 65 bytes long');
        return sig;
    });
    function uniqPubkey(pubkeys) {
        var map = {};
        for (var _i = 0, pubkeys_1 = pubkeys; _i < pubkeys_1.length; _i++) {
            var pub = pubkeys_1[_i];
            var key = base.hex.encode(pub);
            if (map[key])
                throw new Error("Multisig: non-uniq pubkey: ".concat(pubkeys.map(base.hex.encode)));
            map[key] = true;
        }
    }
    taproot.NETWORK = {
        bech32: 'bc',
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
    };
    taproot.PRECISION = 8;
    taproot.DEFAULT_VERSION = 2;
    taproot.DEFAULT_LOCKTIME = 0;
    taproot.DEFAULT_SEQUENCE = 4294967293;
    var EMPTY32 = new Uint8Array(32);
    // Utils
    //ROHIT taproot.Decimal = 8;
    //taproot.Decimal = P.coders.decimal(taproot.PRECISION);//CHECK THIS


    var decimal = {};
    decimal.decode = function (numberAsString) { return parseInt(numberAsString * 100000000) };
    taproot.decimal = decimal;


    class Decimal {
        static decode(bitcoinAmount) {
            const bitcoinInSatoshis = BigInt(Math.floor(parseFloat(bitcoinAmount) * 100000000));
            return bitcoinInSatoshis;
        }

        static encode(satoshis) {
            const bitcoinAmount = (Number(satoshis) / 100000000).toFixed(8);
            return bitcoinAmount;
        }
    }

    taproot.Decimal = Decimal;


    function cmp(a, b) {
        if (a instanceof Uint8Array && b instanceof Uint8Array) {
            // -1 -> a<b, 0 -> a==b, 1 -> a>b
            var len = Math.min(a.length, b.length);
            for (var i = 0; i < len; i++)
                if (a[i] != b[i])
                    return Math.sign(a[i] - b[i]);
            return Math.sign(a.length - b.length);
        }
        else if (a instanceof Uint8Array || b instanceof Uint8Array)
            throw new Error("cmp: wrong values a=".concat(a, " b=").concat(b));
        if ((typeof a === 'bigint' && typeof b === 'number') ||
            (typeof a === 'number' && typeof b === 'bigint')) {
            a = BigInt(a);
            b = BigInt(b);
        }
        if (a === undefined || b === undefined)
            throw new Error("cmp: wrong values a=".concat(a, " b=").concat(b));
        // Default js comparasion
        return Number(a > b) - Number(a < b);
    }
    taproot.cmp = cmp;
    // Coders
    // prettier-ignore
    var OP;
    (function (OP) {
        OP[OP["OP_0"] = 0] = "OP_0";
        OP[OP["PUSHDATA1"] = 76] = "PUSHDATA1";
        OP[OP["PUSHDATA2"] = 77] = "PUSHDATA2";
        OP[OP["PUSHDATA4"] = 78] = "PUSHDATA4";
        OP[OP["1NEGATE"] = 79] = "1NEGATE";
        OP[OP["RESERVED"] = 80] = "RESERVED";
        OP[OP["OP_1"] = 81] = "OP_1";
        OP[OP["OP_2"] = 82] = "OP_2";
        OP[OP["OP_3"] = 83] = "OP_3";
        OP[OP["OP_4"] = 84] = "OP_4";
        OP[OP["OP_5"] = 85] = "OP_5";
        OP[OP["OP_6"] = 86] = "OP_6";
        OP[OP["OP_7"] = 87] = "OP_7";
        OP[OP["OP_8"] = 88] = "OP_8";
        OP[OP["OP_9"] = 89] = "OP_9";
        OP[OP["OP_10"] = 90] = "OP_10";
        OP[OP["OP_11"] = 91] = "OP_11";
        OP[OP["OP_12"] = 92] = "OP_12";
        OP[OP["OP_13"] = 93] = "OP_13";
        OP[OP["OP_14"] = 94] = "OP_14";
        OP[OP["OP_15"] = 95] = "OP_15";
        OP[OP["OP_16"] = 96] = "OP_16";
        // Control
        OP[OP["NOP"] = 97] = "NOP";
        OP[OP["VER"] = 98] = "VER";
        OP[OP["IF"] = 99] = "IF";
        OP[OP["NOTIF"] = 100] = "NOTIF";
        OP[OP["VERIF"] = 101] = "VERIF";
        OP[OP["VERNOTIF"] = 102] = "VERNOTIF";
        OP[OP["ELSE"] = 103] = "ELSE";
        OP[OP["ENDIF"] = 104] = "ENDIF";
        OP[OP["VERIFY"] = 105] = "VERIFY";
        OP[OP["RETURN"] = 106] = "RETURN";
        // Stack
        OP[OP["TOALTSTACK"] = 107] = "TOALTSTACK";
        OP[OP["FROMALTSTACK"] = 108] = "FROMALTSTACK";
        OP[OP["2DROP"] = 109] = "2DROP";
        OP[OP["2DUP"] = 110] = "2DUP";
        OP[OP["3DUP"] = 111] = "3DUP";
        OP[OP["2OVER"] = 112] = "2OVER";
        OP[OP["2ROT"] = 113] = "2ROT";
        OP[OP["2SWAP"] = 114] = "2SWAP";
        OP[OP["IFDUP"] = 115] = "IFDUP";
        OP[OP["DEPTH"] = 116] = "DEPTH";
        OP[OP["DROP"] = 117] = "DROP";
        OP[OP["DUP"] = 118] = "DUP";
        OP[OP["NIP"] = 119] = "NIP";
        OP[OP["OVER"] = 120] = "OVER";
        OP[OP["PICK"] = 121] = "PICK";
        OP[OP["ROLL"] = 122] = "ROLL";
        OP[OP["ROT"] = 123] = "ROT";
        OP[OP["SWAP"] = 124] = "SWAP";
        OP[OP["TUCK"] = 125] = "TUCK";
        // Splice
        OP[OP["CAT"] = 126] = "CAT";
        OP[OP["SUBSTR"] = 127] = "SUBSTR";
        OP[OP["LEFT"] = 128] = "LEFT";
        OP[OP["RIGHT"] = 129] = "RIGHT";
        OP[OP["SIZE"] = 130] = "SIZE";
        // Boolean logic
        OP[OP["INVERT"] = 131] = "INVERT";
        OP[OP["AND"] = 132] = "AND";
        OP[OP["OR"] = 133] = "OR";
        OP[OP["XOR"] = 134] = "XOR";
        OP[OP["EQUAL"] = 135] = "EQUAL";
        OP[OP["EQUALVERIFY"] = 136] = "EQUALVERIFY";
        OP[OP["RESERVED1"] = 137] = "RESERVED1";
        OP[OP["RESERVED2"] = 138] = "RESERVED2";
        // Numbers
        OP[OP["1ADD"] = 139] = "1ADD";
        OP[OP["1SUB"] = 140] = "1SUB";
        OP[OP["2MUL"] = 141] = "2MUL";
        OP[OP["2DIV"] = 142] = "2DIV";
        OP[OP["NEGATE"] = 143] = "NEGATE";
        OP[OP["ABS"] = 144] = "ABS";
        OP[OP["NOT"] = 145] = "NOT";
        OP[OP["0NOTEQUAL"] = 146] = "0NOTEQUAL";
        OP[OP["ADD"] = 147] = "ADD";
        OP[OP["SUB"] = 148] = "SUB";
        OP[OP["MUL"] = 149] = "MUL";
        OP[OP["DIV"] = 150] = "DIV";
        OP[OP["MOD"] = 151] = "MOD";
        OP[OP["LSHIFT"] = 152] = "LSHIFT";
        OP[OP["RSHIFT"] = 153] = "RSHIFT";
        OP[OP["BOOLAND"] = 154] = "BOOLAND";
        OP[OP["BOOLOR"] = 155] = "BOOLOR";
        OP[OP["NUMEQUAL"] = 156] = "NUMEQUAL";
        OP[OP["NUMEQUALVERIFY"] = 157] = "NUMEQUALVERIFY";
        OP[OP["NUMNOTEQUAL"] = 158] = "NUMNOTEQUAL";
        OP[OP["LESSTHAN"] = 159] = "LESSTHAN";
        OP[OP["GREATERTHAN"] = 160] = "GREATERTHAN";
        OP[OP["LESSTHANOREQUAL"] = 161] = "LESSTHANOREQUAL";
        OP[OP["GREATERTHANOREQUAL"] = 162] = "GREATERTHANOREQUAL";
        OP[OP["MIN"] = 163] = "MIN";
        OP[OP["MAX"] = 164] = "MAX";
        OP[OP["WITHIN"] = 165] = "WITHIN";
        // Crypto
        OP[OP["RIPEMD160"] = 166] = "RIPEMD160";
        OP[OP["SHA1"] = 167] = "SHA1";
        OP[OP["SHA256"] = 168] = "SHA256";
        OP[OP["HASH160"] = 169] = "HASH160";
        OP[OP["HASH256"] = 170] = "HASH256";
        OP[OP["CODESEPARATOR"] = 171] = "CODESEPARATOR";
        OP[OP["CHECKSIG"] = 172] = "CHECKSIG";
        OP[OP["CHECKSIGVERIFY"] = 173] = "CHECKSIGVERIFY";
        OP[OP["CHECKMULTISIG"] = 174] = "CHECKMULTISIG";
        OP[OP["CHECKMULTISIGVERIFY"] = 175] = "CHECKMULTISIGVERIFY";
        // Expansion
        OP[OP["NOP1"] = 176] = "NOP1";
        OP[OP["CHECKLOCKTIMEVERIFY"] = 177] = "CHECKLOCKTIMEVERIFY";
        OP[OP["CHECKSEQUENCEVERIFY"] = 178] = "CHECKSEQUENCEVERIFY";
        OP[OP["NOP4"] = 179] = "NOP4";
        OP[OP["NOP5"] = 180] = "NOP5";
        OP[OP["NOP6"] = 181] = "NOP6";
        OP[OP["NOP7"] = 182] = "NOP7";
        OP[OP["NOP8"] = 183] = "NOP8";
        OP[OP["NOP9"] = 184] = "NOP9";
        OP[OP["NOP10"] = 185] = "NOP10";
        // BIP 342
        OP[OP["CHECKSIGADD"] = 186] = "CHECKSIGADD";
        // Invalid
        OP[OP["INVALID"] = 255] = "INVALID";
    })(OP = taproot.OP || (taproot.OP = {}));
    // OP_\n to numeric value
    // TODO: maybe add numbers to script parser for this case?
    // prettier-ignore
    var OPNum;
    (function (OPNum) {
        OPNum[OPNum["OP_0"] = 0] = "OP_0";
        OPNum[OPNum["OP_1"] = 1] = "OP_1";
        OPNum[OPNum["OP_2"] = 2] = "OP_2";
        OPNum[OPNum["OP_3"] = 3] = "OP_3";
        OPNum[OPNum["OP_4"] = 4] = "OP_4";
        OPNum[OPNum["OP_5"] = 5] = "OP_5";
        OPNum[OPNum["OP_6"] = 6] = "OP_6";
        OPNum[OPNum["OP_7"] = 7] = "OP_7";
        OPNum[OPNum["OP_8"] = 8] = "OP_8";
        OPNum[OPNum["OP_9"] = 9] = "OP_9";
        OPNum[OPNum["OP_10"] = 10] = "OP_10";
        OPNum[OPNum["OP_11"] = 11] = "OP_11";
        OPNum[OPNum["OP_12"] = 12] = "OP_12";
        OPNum[OPNum["OP_13"] = 13] = "OP_13";
        OPNum[OPNum["OP_14"] = 14] = "OP_14";
        OPNum[OPNum["OP_15"] = 15] = "OP_15";
        OPNum[OPNum["OP_16"] = 16] = "OP_16";
    })(OPNum = taproot.OPNum || (taproot.OPNum = {}));
    function OPtoNumber(op) {
        if (typeof op === 'string' && OP[op] !== undefined && OPNum[op] !== undefined)
            return OPNum[op];
    }
    // Converts script bytes to parsed script
    // 5221030000000000000000000000000000000000000000000000000000000000000001210300000000000000000000000000000000000000000000000000000000000000022103000000000000000000000000000000000000000000000000000000000000000353ae
    // =>
    // OP_2
    //   030000000000000000000000000000000000000000000000000000000000000001
    //   030000000000000000000000000000000000000000000000000000000000000002
    //   030000000000000000000000000000000000000000000000000000000000000003
    //   OP_3
    //   CHECKMULTISIG
    // TODO: simplify like CompactSize?
    taproot.Script = P.wrap({
        encodeStream: function (w, value) {
            for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                var o = value_1[_i];
                if (typeof o === 'string') {
                    if (OP[o] === undefined)
                        throw new Error("Unknown opcode=".concat(o));
                    w.byte(OP[o]);
                    continue;
                }
                var len = o.length;
                if (len < OP.PUSHDATA1)
                    w.byte(len);
                else if (len <= 0xff) {
                    w.byte(OP.PUSHDATA1);
                    w.byte(len);
                }
                else if (len <= 0xffff) {
                    w.byte(OP.PUSHDATA2);
                    w.bytes(P.U16LE.encode(len));
                }
                else {
                    w.byte(OP.PUSHDATA4);
                    w.bytes(P.U32LE.encode(len));
                }
                w.bytes(o);
            }
        },
        decodeStream: function (r) {
            var out = [];
            while (!r.isEnd()) {
                var cur = r.byte();
                // if 0 < cur < 78
                if (OP.OP_0 < cur && cur <= OP.PUSHDATA4) {
                    var len = void 0;
                    if (cur < OP.PUSHDATA1)
                        len = cur;
                    else if (cur === OP.PUSHDATA1)
                        len = P.U8.decodeStream(r);
                    else if (cur === OP.PUSHDATA2)
                        len = P.U16LE.decodeStream(r);
                    else if (cur === OP.PUSHDATA4)
                        len = P.U32LE.decodeStream(r);
                    else
                        throw new Error('Should be not possible');
                    out.push(r.bytes(len));
                }
                else {
                    var op = OP[cur];
                    if (op === undefined)
                        throw new Error("Unknown opcode=".concat(cur.toString(16)));
                    out.push(op);
                }
            }
            return out;
        },
    });
    // BTC specific variable length integer encoding
    // https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
    var CSLimits = {
        0xfd: [0xfd, 2, 253n, 65535n],
        0xfe: [0xfe, 4, 65536n, 4294967295n],
        0xff: [0xff, 8, 4294967296n, 18446744073709551615n],
    };
    taproot.CompactSize = P.wrap({
        encodeStream: function (w, value) {
            if (typeof value === 'number')
                value = BigInt(value);
            if (0n <= value && value <= 252n)
                return w.byte(Number(value));
            for (var _i = 0, _a = Object.values(CSLimits); _i < _a.length; _i++) {
                var _b = _a[_i], flag = _b[0], bytes = _b[1], start = _b[2], stop = _b[3];
                if (start > value || value > stop)
                    continue;
                w.byte(flag);
                for (var i = 0; i < bytes; i++)
                    w.byte(Number((value >> (8n * BigInt(i))) & 0xffn));
                return;
            }
            throw w.err("VarInt too big: ".concat(value));
        },
        decodeStream: function (r) {
            var b0 = r.byte();
            if (b0 <= 0xfc)
                return BigInt(b0);
            var _a = CSLimits[b0], _ = _a[0], bytes = _a[1], start = _a[2];
            var num = 0n;
            for (var i = 0; i < bytes; i++)
                num |= BigInt(r.byte()) << (8n * BigInt(i));
            if (num < start)
                throw r.err("Wrong CompactSize(".concat(8 * bytes, ")"));
            return num;
        },
    });
    // Same thing, but in number instead of bigint. Checks for safe integer inside
    var CompactSizeLen = P.apply(taproot.CompactSize, P.coders.number);
    // Array of size <CompactSize>
    var BTCArray = function (t) { return P.array(taproot.CompactSize, t); };
    taproot.BTCArray = BTCArray;
    // ui8a of size <CompactSize>
    taproot.VarBytes = P.bytes(taproot.CompactSize);
    taproot.RawInput = P.struct({
        hash: P.bytes(32, true),
        index: P.U32LE,
        finalScriptSig: taproot.VarBytes,
        sequence: P.U32LE, // ?
    });
    taproot.RawOutput = P.struct({ amount: P.U64LE, script: taproot.VarBytes });
    var EMPTY_OUTPUT = {
        amount: 0xffffffffffffffffn,
        script: P.EMPTY,
    };
    // SegWit v0 stack of witness buffers
    taproot.RawWitness = P.array(CompactSizeLen, taproot.VarBytes);
    // https://en.bitcoin.it/wiki/Protocol_documentation#tx
    // TODO: more tests. Unsigned tx has version=2 for some reason,
    // probably we're exporting broken unsigned tx
    // Related: https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki
    var _RawTx = P.struct({
        version: P.I32LE,
        segwitFlag: P.flag(new Uint8Array([0x00, 0x01])),
        inputs: (0, taproot.BTCArray)(taproot.RawInput),
        outputs: (0, taproot.BTCArray)(taproot.RawOutput),
        witnesses: P.flagged('segwitFlag', P.array('inputs/length', taproot.RawWitness)),
        // Need to handle that?
        // < 500000000	Block number at which this transaction is unlocked
        // >= 500000000	UNIX timestamp at which this transaction is unlocked
        lockTime: P.U32LE,
    });
    function validateRawTx(tx) {
        if (tx.segwitFlag && tx.witnesses && !tx.witnesses.length)
            throw new Error('Segwit flag with empty witnesses array');
        return tx;
    }
    taproot.RawTx = P.validate(_RawTx, validateRawTx);
    var BIP32Der = P.struct({
        fingerprint: P.U32BE,
        path: P.array(null, P.U32LE),
    });
    // <control byte with leaf version and parity bit> <internal key p> <C> <E> <AB>
    var _TaprootControlBlock = P.struct({
        version: P.U8,
        internalKey: P.bytes(32),
        merklePath: P.array(null, P.bytes(32)),
    });
    taproot.TaprootControlBlock = P.validate(_TaprootControlBlock, function (cb) {
        if (cb.merklePath.length > 128)
            throw new Error('TaprootControlBlock: merklePath should be of length 0..128 (inclusive)');
        return cb;
    });
    var TaprootBIP32Der = P.struct({
        hashes: P.array(CompactSizeLen, P.bytes(32)),
        der: BIP32Der,
    });
    // {name: [tag, keyCoder, valueCoder]}
    var PSBTGlobal = {
        // TODO: RAW TX here
        unsignedTx: [0x00, false, taproot.RawTx, [0], [2], [0]],
        // The 78 byte serialized extended public key as defined by BIP 32.
        xpub: [0x01, P.bytes(78), BIP32Der, [], [], [0, 2]],
        txVersion: [0x02, false, P.U32LE, [2], [0], [2]],
        fallbackLocktime: [0x03, false, P.U32LE, [], [0], [2]],
        inputCount: [0x04, false, CompactSizeLen, [2], [0], [2]],
        outputCount: [0x05, false, CompactSizeLen, [2], [0], [2]],
        // bitfield
        txModifiable: [0x06, false, P.U8, [], [0], [2]],
        version: [0xfb, false, P.U32LE, [], [], [0, 2]],
        // key = <identifierlen> <identifier> <subtype> <subkeydata>
        propietary: [0xfc, P.bytes(null), P.bytes(null), [], [], [0, 2]],
    };
    var PSBTInput = {
        nonWitnessUtxo: [0x00, false, taproot.RawTx, [], [], [0, 2]],
        witnessUtxo: [0x01, false, taproot.RawOutput, [], [], [0, 2]],
        partialSig: [0x02, PubKeyECDSA, P.bytes(null), [], [], [0, 2]],
        sighashType: [0x03, false, P.U32LE, [], [], [0, 2]],
        redeemScript: [0x04, false, P.bytes(null), [], [], [0, 2]],
        witnessScript: [0x05, false, P.bytes(null), [], [], [0, 2]],
        bip32Derivation: [0x06, PubKeyECDSA, BIP32Der, [], [], [0, 2]],
        finalScriptSig: [0x07, false, P.bytes(null), [], [], [0, 2]],
        finalScriptWitness: [0x08, false, taproot.RawWitness, [], [], [0, 2]],
        porCommitment: [0x09, false, P.bytes(null), [], [], [0, 2]],
        ripemd160: [0x0a, P.bytes(20), P.bytes(null), [], [], [0, 2]],
        sha256: [0x0b, P.bytes(32), P.bytes(null), [], [], [0, 2]],
        hash160: [0x0c, P.bytes(20), P.bytes(null), [], [], [0, 2]],
        hash256: [0x0d, P.bytes(32), P.bytes(null), [], [], [0, 2]],
        hash: [0x0e, false, P.bytes(32), [2], [0], [2]],
        index: [0x0f, false, P.U32LE, [2], [0], [2]],
        sequence: [0x10, false, P.U32LE, [], [0], [2]],
        requiredTimeLocktime: [0x11, false, P.U32LE, [], [0], [2]],
        requiredHeightLocktime: [0x12, false, P.U32LE, [], [0], [2]],
        tapKeySig: [0x13, false, SignatureSchnorr, [], [], [0, 2]],
        tapScriptSig: [
            0x14,
            P.struct({ pubKey: PubKeySchnorr, leafHash: P.bytes(32) }),
            SignatureSchnorr,
            [],
            [],
            [0, 2],
        ],
        // value = <bytes script> <8-bit uint leaf version>
        tapLeafScript: [0x15, taproot.TaprootControlBlock, P.bytes(null), [], [], [0, 2]],
        tapBip32Derivation: [0x16, P.bytes(32), TaprootBIP32Der, [], [], [0, 2]],
        tapInternalKey: [0x17, false, PubKeySchnorr, [], [], [0, 2]],
        tapMerkleRoot: [0x18, false, P.bytes(32), [], [], [0, 2]],
        propietary: [0xfc, P.bytes(null), P.bytes(null), [], [], [0, 2]],
    };
    // All other keys removed when finalizing
    var PSBTInputFinalKeys = [
        'hash',
        'sequence',
        'index',
        'witnessUtxo',
        'nonWitnessUtxo',
        'finalScriptSig',
        'finalScriptWitness',
        'unknown',
    ];
    // Can be modified even on signed input
    var PSBTInputUnsignedKeys = [
        'partialSig',
        'finalScriptSig',
        'finalScriptWitness',
        'tapKeySig',
        'tapScriptSig',
    ];
    var PSBTOutput = {
        redeemScript: [0x00, false, P.bytes(null), [], [], [0, 2]],
        witnessScript: [0x01, false, P.bytes(null), [], [], [0, 2]],
        bip32Derivation: [0x02, PubKeyECDSA, BIP32Der, [], [], [0, 2]],
        amount: [0x03, false, P.I64LE, [2], [0], [2]],
        script: [0x04, false, P.bytes(null), [2], [0], [2]],
        tapInternalKey: [0x05, false, PubKeySchnorr, [], [], [0, 2]],
        /*
        {<8-bit uint depth> <8-bit uint leaf version> <compact size uint scriptlen> <bytes script>}*
        */
        tapTree: [
            0x06,
            false,
            P.array(null, P.struct({
                depth: P.U8,
                version: P.U8,
                script: taproot.VarBytes,
            })),
            [],
            [],
            [0, 2],
        ],
        tapBip32Derivation: [0x07, PubKeySchnorr, TaprootBIP32Der, [], [], [0, 2]],
        propietary: [0xfc, P.bytes(null), P.bytes(null), [], [], [0, 2]],
    };
    // Can be modified even on signed input
    var PSBTOutputUnsignedKeys = [];
    var PSBTKeyPair = P.array(P.NULL, P.struct({
        //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
        key: P.prefix(CompactSizeLen, P.struct({ type: CompactSizeLen, key: P.bytes(null) })),
        //  <value> := <valuelen> <valuedata>
        value: P.bytes(CompactSizeLen),
    }));
    var PSBTUnknownKey = P.struct({ type: CompactSizeLen, key: P.bytes(null) });
    // Key cannot be 'unknown', value coder cannot be array for elements with empty key
    function PSBTKeyMap(psbtEnum) {
        // -> Record<type, [keyName, ...coders]>
        var byType = {};
        for (var k in psbtEnum) {
            var _a = psbtEnum[k], num = _a[0], kc = _a[1], vc = _a[2];
            byType[num] = [k, kc, vc];
        }
        return P.wrap({
            encodeStream: function (w, value) {
                var out = [];
                var _loop_1 = function (name) {
                    var val = value[name];
                    if (val === undefined)
                        return "continue";
                    var _c = psbtEnum[name], type_1 = _c[0], kc = _c[1], vc = _c[2];
                    if (!kc)
                        out.push({ key: { type: type_1, key: P.EMPTY }, value: vc.encode(val) });
                    else {
                        // TODO: check here if there is duplicate keys
                        var kv = val.map(function (_a) {
                            var k = _a[0], v = _a[1];
                            return [
                                kc.encode(k),
                                vc.encode(v),
                            ];
                        });
                        // sort by keys
                        kv.sort(function (a, b) { return cmp(a[0], b[0]); });
                        for (var _d = 0, kv_1 = kv; _d < kv_1.length; _d++) {
                            var _e = kv_1[_d], key = _e[0], value_2 = _e[1];
                            out.push({ key: { key: key, type: type_1 }, value: value_2 });
                        }
                    }
                };
                // Because we use order of psbtEnum, keymap is sorted here
                for (var name in psbtEnum) {
                    _loop_1(name);
                }
                if (value.unknown) {
                    value.unknown.sort(function (a, b) { return cmp(a[0], b[0]); });
                    for (var _i = 0, _a = value.unknown; _i < _a.length; _i++) {
                        var _b = _a[_i], k = _b[0], v = _b[1];
                        out.push({ key: PSBTUnknownKey.decode(k), value: v });
                    }
                }
                PSBTKeyPair.encodeStream(w, out);
            },
            decodeStream: function (r) {
                var raw = PSBTKeyPair.decodeStream(r);
                var out = {};
                var noKey = {};
                for (var _i = 0, raw_1 = raw; _i < raw_1.length; _i++) {
                    var elm = raw_1[_i];
                    var name = 'unknown';
                    var key = elm.key.key;
                    var value = elm.value;
                    if (byType[elm.key.type]) {
                        var _a = byType[elm.key.type], _name = _a[0], kc = _a[1], vc = _a[2];
                        name = _name;
                        if (!kc && key.length) {
                            throw new Error("PSBT: Non-empty key for ".concat(name, " (key=").concat(base.hex.encode(key), " value=").concat(base.hex.encode(value)));
                        }
                        key = kc ? kc.decode(key) : undefined;
                        value = vc.decode(value);
                        if (!kc) {
                            if (out[name])
                                throw new Error("PSBT: Same keys: ".concat(name, " (key=").concat(key, " value=").concat(value, ")"));
                            out[name] = value;
                            noKey[name] = true;
                            continue;
                        }
                    }
                    else {
                        // For unknown: add key type inside key
                        key = PSBTUnknownKey.encode({ type: elm.key.type, key: elm.key.key });
                    }
                    // Only keyed elements at this point
                    if (noKey[name])
                        throw new Error("PSBT: Key type with empty key and no key=".concat(name, " val=").concat(value));
                    if (!out[name])
                        out[name] = [];
                    out[name].push([key, value]);
                }
                return out;
            },
        });
    }
    // Basic sanity check for scripts
    function checkWSH(s, witnessScript) {
        if (!P.equalBytes(s.hash, (0, sha256_1.sha256)(witnessScript)))
            throw new Error('checkScript: wsh wrong witnessScript hash');
        var w = taproot.OutScript.decode(witnessScript);
        if (w.type === 'tr' || w.type === 'tr_ns' || w.type === 'tr_ms')
            throw new Error("checkScript: P2".concat(w.type, " cannot be wrapped in P2SH"));
        if (w.type === 'wpkh' || w.type === 'sh')
            throw new Error("checkScript: P2".concat(w.type, " cannot be wrapped in P2WSH"));
    }
    function checkScript(script, redeemScript, witnessScript) {
        // TODO: revalidate
        if (script) {
            var s = taproot.OutScript.decode(script);
            // TODO: ms||pk maybe work, but there will be no address
            if (s.type === 'tr_ns' || s.type === 'tr_ms' || s.type === 'ms' || s.type == 'pk')
                throw new Error("checkScript: non-wrapped ".concat(s.type));
            if (s.type === 'sh' && redeemScript) {
                if (!P.equalBytes(s.hash, hash160(redeemScript)))
                    throw new Error('checkScript: sh wrong redeemScript hash');
                var r = taproot.OutScript.decode(redeemScript);
                if (r.type === 'tr' || r.type === 'tr_ns' || r.type === 'tr_ms')
                    throw new Error("checkScript: P2".concat(r.type, " cannot be wrapped in P2SH"));
                // Not sure if this unspendable, but we cannot represent this via PSBT
                if (r.type === 'sh')
                    throw new Error('checkScript: P2SH cannot be wrapped in P2SH');
            }
            if (s.type === 'wsh' && witnessScript)
                checkWSH(s, witnessScript);
        }
        if (redeemScript) {
            var r = taproot.OutScript.decode(redeemScript);
            if (r.type === 'wsh' && witnessScript)
                checkWSH(r, witnessScript);
        }
    }
    var PSBTInputCoder = P.validate(PSBTKeyMap(PSBTInput), function (i) {
        if (i.finalScriptWitness && !i.finalScriptWitness.length)
            throw new Error('validateInput: wmpty finalScriptWitness');
        //if (i.finalScriptSig && !i.finalScriptSig.length) throw new Error('validateInput: empty finalScriptSig');
        if (i.partialSig && !i.partialSig.length)
            throw new Error('Empty partialSig');
        if (i.partialSig)
            for (var _i = 0, _a = i.partialSig; _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                validatePubkey(k, PubT.ecdsa);
            }
        if (i.bip32Derivation)
            for (var _c = 0, _d = i.bip32Derivation; _c < _d.length; _c++) {
                var _e = _d[_c], k = _e[0], v = _e[1];
                validatePubkey(k, PubT.ecdsa);
            }
        // Locktime = unsigned little endian integer greater than or equal to 500000000 representing
        if (i.requiredTimeLocktime !== undefined && i.requiredTimeLocktime < 500000000)
            throw new Error("validateInput: wrong timeLocktime=".concat(i.requiredTimeLocktime));
        // unsigned little endian integer greater than 0 and less than 500000000
        if (i.requiredHeightLocktime !== undefined &&
            (i.requiredHeightLocktime <= 0 || i.requiredHeightLocktime >= 500000000))
            throw new Error("validateInput: wrong heighLocktime=".concat(i.requiredHeightLocktime));
        if (i.nonWitnessUtxo && i.index !== undefined) {
            var last = i.nonWitnessUtxo.outputs.length - 1;
            if (i.index > last)
                throw new Error("validateInput: index(".concat(i.index, ") not in nonWitnessUtxo"));
            var prevOut = i.nonWitnessUtxo.outputs[i.index];
            if (i.witnessUtxo &&
                (!P.equalBytes(i.witnessUtxo.script, prevOut.script) ||
                    i.witnessUtxo.amount !== prevOut.amount))
                throw new Error('validateInput: witnessUtxo different from nonWitnessUtxo');
        }
        if (i.tapLeafScript) {
            // tap leaf version appears here twice: in control block and at the end of script
            for (var _f = 0, _g = i.tapLeafScript; _f < _g.length; _f++) {
                var _h = _g[_f], k = _h[0], v = _h[1];
                if ((k.version & 254) !== v[v.length - 1])
                    throw new Error('validateInput: tapLeafScript version mimatch');
                if (v[v.length - 1] & 1)
                    throw new Error('validateInput: tapLeafScript version has parity bit!');
            }
        }
        return i;
    });
    var PSBTOutputCoder = P.validate(PSBTKeyMap(PSBTOutput), function (o) {
        if (o.bip32Derivation)
            for (var _i = 0, _a = o.bip32Derivation; _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                validatePubkey(k, PubT.ecdsa);
            }
        return o;
    });
    var PSBTGlobalCoder = P.validate(PSBTKeyMap(PSBTGlobal), function (g) {
        var version = g.version || 0;
        if (version === 0) {
            if (!g.unsignedTx)
                throw new Error('PSBTv0: missing unsignedTx');
            if (g.unsignedTx.segwitFlag || g.unsignedTx.witnesses)
                throw new Error('PSBTv0: witness in unsingedTx');
            for (var _i = 0, _a = g.unsignedTx.inputs; _i < _a.length; _i++) {
                var inp = _a[_i];
                if (inp.finalScriptSig && inp.finalScriptSig.length)
                    throw new Error('PSBTv0: input scriptSig found in unsignedTx');
            }
        }
        return g;
    });
    taproot._RawPSBTV0 = P.struct({
        magic: P.magic(P.string(new Uint8Array([0xff])), 'psbt'),
        global: PSBTGlobalCoder,
        inputs: P.array('global/unsignedTx/inputs/length', PSBTInputCoder),
        outputs: P.array(null, PSBTOutputCoder),
    });
    taproot._RawPSBTV2 = P.struct({
        magic: P.magic(P.string(new Uint8Array([0xff])), 'psbt'),
        global: PSBTGlobalCoder,
        inputs: P.array('global/inputCount', PSBTInputCoder),
        outputs: P.array('global/outputCount', PSBTOutputCoder),
    });
    taproot._DebugPSBT = P.struct({
        magic: P.magic(P.string(new Uint8Array([0xff])), 'psbt'),
        items: P.array(null, P.apply(P.array(P.NULL, P.tuple([P.hex(CompactSizeLen), P.bytes(taproot.CompactSize)])), P.coders.dict())),
    });
    function validatePSBTFields(version, info, lst) {
        for (var k in lst) {
            if (k === 'unknown')
                continue;
            if (!info[k])
                continue;
            var _a = info[k].slice(-3), reqInc = _a[0], reqExc = _a[1], allowInc = _a[2];
            if (reqExc.includes(version) || !allowInc.includes(version))
                throw new Error("PSBTv".concat(version, ": field ").concat(k, " is not allowed"));
        }
        for (var k in info) {
            var _b = info[k].slice(-3), reqInc = _b[0], reqExc = _b[1], allowInc = _b[2];
            if (reqInc.includes(version) && lst[k] === undefined)
                throw new Error("PSBTv".concat(version, ": missing required field ").concat(k));
        }
    }
    function cleanPSBTFields(version, info, lst) {
        var out = {};
        for (var k in lst) {
            if (k !== 'unknown') {
                if (!info[k])
                    continue;
                var _a = info[k].slice(-3), reqInc = _a[0], reqExc = _a[1], allowInc = _a[2];
                if (reqExc.includes(version) || !allowInc.includes(version))
                    continue;
            }
            out[k] = lst[k];
        }
        return out;
    }
    function validatePSBT(tx) {
        var version = (tx && tx.global && tx.global.version) || 0;
        validatePSBTFields(version, PSBTGlobal, tx.global);
        for (var _i = 0, _a = tx.inputs; _i < _a.length; _i++) {
            var i = _a[_i];
            validatePSBTFields(version, PSBTInput, i);
        }
        for (var _b = 0, _c = tx.outputs; _b < _c.length; _b++) {
            var o = _c[_b];
            validatePSBTFields(version, PSBTOutput, o);
        }
        // We allow only one empty element at the end of map (compat with bitcoinjs-lib bug)
        var inputCount = !version ? tx.global.unsignedTx.inputs.length : tx.global.inputCount;
        if (tx.inputs.length < inputCount)
            throw new Error('Not enough inputs');
        var inputsLeft = tx.inputs.slice(inputCount);
        if (inputsLeft.length > 1 || (inputsLeft.length && Object.keys(inputsLeft[0]).length))
            throw new Error("Unexpected inputs left in tx=".concat(inputsLeft));
        // Same for inputs
        var outputCount = !version ? tx.global.unsignedTx.outputs.length : tx.global.outputCount;
        if (tx.outputs.length < outputCount)
            throw new Error('Not outputs inputs');
        var outputsLeft = tx.outputs.slice(outputCount);
        if (outputsLeft.length > 1 || (outputsLeft.length && Object.keys(outputsLeft[0]).length))
            throw new Error("Unexpected outputs left in tx=".concat(outputsLeft));
        return tx;
    }
    // Check if object doens't have custom constructor (like Uint8Array/Array)
    var isPlainObject = function (obj) {
        return Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
    };
    function type(v) {
        if (v instanceof Uint8Array)
            return 'bytes';
        if (Array.isArray(v))
            return 'array';
        if (['number', 'string', 'bigint', 'boolean', 'undefined'].includes(typeof v))
            return typeof v;
        if (v === null)
            return 'null'; // typeof null=object
        if (isPlainObject(v))
            return 'object';
        throw new Error("Unknown type=".concat(v));
    }
    // Basic structure merge: object = {...old, ...new}, arrays = old.concat(new). other -> replace
    // function merge<T extends PSBTKeyMap>(
    //   psbtEnum: T,
    //   val: PSBTKeyMapKeys<T>,
    //   cur?: PSBTKeyMapKeys<T>
    // ): PSBTKeyMapKeys<T> {
    // }
    function mergeKeyMap(psbtEnum, val, cur, allowedFields) {
        var res = __assign(__assign({}, cur), val);
        var _loop_2 = function (k) {
            var key = k;
            var _a = psbtEnum[key], _ = _a[0], kC = _a[1], vC = _a[2];
            var cannotChange = allowedFields && !allowedFields.includes(k);
            if (val[k] === undefined && k in val) {
                if (cannotChange)
                    throw new Error("Cannot remove signed field=".concat(k));
                delete res[k];
            }
            else if (kC) {
                var oldKV = (cur && cur[k] ? cur[k] : []);
                var newKV = val[key];
                if (newKV) {
                    if (!Array.isArray(newKV))
                        throw new Error("keyMap(".concat(k, "): KV pairs should be [k, v][]"));
                    // Decode hex in k-v
                    newKV = newKV.map(function (val) {
                        if (val.length !== 2)
                            throw new Error("keyMap(".concat(k, "): KV pairs should be [k, v][]"));
                        return [
                            typeof val[0] === 'string' ? kC.decode(base.hex.decode(val[0])) : val[0],
                            typeof val[1] === 'string' ? vC.decode(base.hex.decode(val[1])) : val[1],
                        ];
                    });
                    var map_1 = {};
                    var add = function (kStr, k, v) {
                        if (map_1[kStr] === undefined) {
                            map_1[kStr] = [k, v];
                            return;
                        }
                        var oldVal = base.hex.encode(vC.encode(map_1[kStr][1]));
                        var newVal = base.hex.encode(vC.encode(v));
                        if (oldVal !== newVal)
                            throw new Error("keyMap(".concat(key, "): same key=").concat(kStr, " oldVal=").concat(oldVal, " newVal=").concat(newVal));
                    };
                    for (var _i = 0, oldKV_1 = oldKV; _i < oldKV_1.length; _i++) {
                        var _b = oldKV_1[_i], k_1 = _b[0], v = _b[1];
                        var kStr = base.hex.encode(kC.encode(k_1));
                        add(kStr, k_1, v);
                    }
                    for (var _c = 0, newKV_1 = newKV; _c < newKV_1.length; _c++) {
                        var _d = newKV_1[_c], k_2 = _d[0], v = _d[1];
                        var kStr = base.hex.encode(kC.encode(k_2));
                        // undefined removes previous value
                        if (v === undefined)
                            delete map_1[kStr];
                        else
                            add(kStr, k_2, v);
                    }
                    res[key] = Object.values(map_1);
                }
            }
            else if (typeof res[k] === 'string') {
                res[k] = vC.decode(base.hex.decode(res[k]));
            }
        };
        // All arguments can be provided as hex
        for (var k in psbtEnum) {
            _loop_2(k);
        }
        // Remove unknown keys
        for (var k in res)
            if (!psbtEnum[k])
                delete res[k];
        return res;
    }
    taproot.RawPSBTV0 = P.validate(taproot._RawPSBTV0, validatePSBT);
    taproot.RawPSBTV2 = P.validate(taproot._RawPSBTV2, validatePSBT);
    // (TxHash, Idx)
    var TxHashIdx = P.struct({ hash: P.bytes(32, true), index: P.U32LE });
    // /Coders
    var isBytes = function (b) { return b instanceof Uint8Array; };
    var OutPK = {
        encode: function (from) {
            if (from.length !== 2 ||
                !P.isBytes(from[0]) ||
                !isValidPubkey(from[0], PubT.ecdsa) ||
                from[1] !== 'CHECKSIG')
                return;
            return { type: 'pk', pubkey: from[0] };
        },
        decode: function (to) { return (to.type === 'pk' ? [to.pubkey, 'CHECKSIG'] : undefined); },
    };
    var p2pk = function (pubkey, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        if (!isValidPubkey(pubkey, PubT.ecdsa))
            throw new Error('P2PK: invalid publicKey');
        return {
            type: 'pk',
            script: taproot.OutScript.encode({ type: 'pk', pubkey: pubkey }),
        };
    };
    taproot.p2pk = p2pk;
    var OutPKH = {
        encode: function (from) {
            if (from.length !== 5 || from[0] !== 'DUP' || from[1] !== 'HASH160' || !isBytes(from[2]))
                return;
            if (from[3] !== 'EQUALVERIFY' || from[4] !== 'CHECKSIG')
                return;
            return { type: 'pkh', hash: from[2] };
        },
        decode: function (to) {
            return to.type === 'pkh' ? ['DUP', 'HASH160', to.hash, 'EQUALVERIFY', 'CHECKSIG'] : undefined;
        },
    };
    var p2pkh = function (publicKey, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        if (!isValidPubkey(publicKey, PubT.ecdsa))
            throw new Error('P2PKH: invalid publicKey');
        var hash = hash160(publicKey);
        return {
            type: 'pkh',
            script: taproot.OutScript.encode({ type: 'pkh', hash: hash }),
            address: Address(network).encode({ type: 'pkh', hash: hash }),
        };
    };
    taproot.p2pkh = p2pkh;
    var OutSH = {
        encode: function (from) {
            if (from.length !== 3 || from[0] !== 'HASH160' || !isBytes(from[1]) || from[2] !== 'EQUAL')
                return;
            return { type: 'sh', hash: from[1] };
        },
        decode: function (to) {
            return to.type === 'sh' ? ['HASH160', to.hash, 'EQUAL'] : undefined;
        },
    };
    var p2sh = function (child, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        var hash = hash160(child.script);
        var script = taproot.OutScript.encode({ type: 'sh', hash: hash });
        checkScript(script, child.script, child.witnessScript);
        var res = {
            type: 'sh',
            redeemScript: child.script,
            script: taproot.OutScript.encode({ type: 'sh', hash: hash }),
            address: Address(network).encode({ type: 'sh', hash: hash }),
        };
        if (child.witnessScript)
            res.witnessScript = child.witnessScript;
        return res;
    };
    taproot.p2sh = p2sh;
    var OutWSH = {
        encode: function (from) {
            if (from.length !== 2 || from[0] !== 'OP_0' || !isBytes(from[1]))
                return;
            if (from[1].length !== 32)
                return;
            return { type: 'wsh', hash: from[1] };
        },
        decode: function (to) { return (to.type === 'wsh' ? ['OP_0', to.hash] : undefined); },
    };
    var p2wsh = function (child, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        var hash = (0, sha256_1.sha256)(child.script);
        var script = taproot.OutScript.encode({ type: 'wsh', hash: hash });
        checkScript(script, undefined, child.script);
        return {
            type: 'wsh',
            witnessScript: child.script,
            script: taproot.OutScript.encode({ type: 'wsh', hash: hash }),
            address: Address(network).encode({ type: 'wsh', hash: hash }),
        };
    };
    taproot.p2wsh = p2wsh;
    var OutWPKH = {
        encode: function (from) {
            if (from.length !== 2 || from[0] !== 'OP_0' || !isBytes(from[1]))
                return;
            if (from[1].length !== 20)
                return;
            return { type: 'wpkh', hash: from[1] };
        },
        decode: function (to) { return (to.type === 'wpkh' ? ['OP_0', to.hash] : undefined); },
    };
    var p2wpkh = function (publicKey, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        if (!isValidPubkey(publicKey, PubT.ecdsa))
            throw new Error('P2WPKH: invalid publicKey');
        if (publicKey.length === 65)
            throw new Error('P2WPKH: uncompressed public key');
        var hash = hash160(publicKey);
        return {
            type: 'wpkh',
            script: taproot.OutScript.encode({ type: 'wpkh', hash: hash }),
            address: Address(network).encode({ type: 'wpkh', hash: hash }),
        };
    };
    taproot.p2wpkh = p2wpkh;
    var OutMS = {
        encode: function (from) {
            var last = from.length - 1;
            if (from[last] !== 'CHECKMULTISIG')
                return;
            var m = OPtoNumber(from[0]);
            var n = OPtoNumber(from[last - 1]);
            if (m === undefined || n === undefined)
                throw new Error('OutScript.encode/multisig wrong params');
            var pubkeys = from.slice(1, -2); // Any is ok, check in for later
            if (n !== pubkeys.length)
                throw new Error('OutScript.encode/multisig: wrong length');
            return { type: 'ms', m: m, pubkeys: pubkeys }; // we don't need n, since it is the same as pubkeys
        },
        // checkmultisig(n, ..pubkeys, m)
        decode: function (to) {
            return to.type === 'ms'
                ? __spreadArray(__spreadArray(["OP_".concat(to.m)], to.pubkeys, true), ["OP_".concat(to.pubkeys.length), 'CHECKMULTISIG'], false) : undefined;
        },
    };
    var p2ms = function (m, pubkeys, allowSamePubkeys) {
        if (allowSamePubkeys === void 0) { allowSamePubkeys = false; }
        if (!allowSamePubkeys)
            uniqPubkey(pubkeys);
        return { type: 'ms', script: taproot.OutScript.encode({ type: 'ms', pubkeys: pubkeys, m: m }) };
    };
    taproot.p2ms = p2ms;
    var OutTR = {
        encode: function (from) {
            if (from.length !== 2 || from[0] !== 'OP_1' || !isBytes(from[1]))
                return;
            return { type: 'tr', pubkey: from[1] };
        },
        decode: function (to) { return (to.type === 'tr' ? ['OP_1', to.pubkey] : undefined); },
    };
    // Helper for generating binary tree from list, with weights
    function taprootListToTree(taprootList) {
        // Clone input in order to not corrupt it
        var lst = Array.from(taprootList);
        // We have at least 2 elements => can create branch
        while (lst.length >= 2) {
            // Sort: elements with smallest weight are in the end of queue
            lst.sort(function (a, b) { return (b.weight || 1) - (a.weight || 1); });
            var b = lst.pop();
            var a = lst.pop();
            var weight = ((a === null || a === void 0 ? void 0 : a.weight) || 1) + ((b === null || b === void 0 ? void 0 : b.weight) || 1);
            lst.push({
                weight: weight,
                // Unwrap children array
                childs: [a.childs || a, b.childs || b],
            });
        }
        // At this point there is always 1 element in lst
        var last = lst[0];
        return (last.childs || last);
    }
    taproot.taprootListToTree = taprootListToTree;
    function checkTaprootScript(script, allowUnknowOutput) {
        if (allowUnknowOutput === void 0) { allowUnknowOutput = false; }
        var out = taproot.OutScript.decode(script);
        if (out.type === 'unknown' && allowUnknowOutput)
            return;
        if (!['tr_ns', 'tr_ms'].includes(out.type))
            throw new Error("P2TR: invalid leaf script=".concat(out.type));
    }
    //Contructs a binary tree from a list of scripts
    function taprootHashTree(tree, allowUnknowOutput) {
        var _a;
        if (allowUnknowOutput === void 0) { allowUnknowOutput = false; }
        if (!tree)
            throw new Error('taprootHashTree: empty tree');
        if (Array.isArray(tree) && tree.length === 1)
            tree = tree[0];
        // Terminal node (leaf)
        if (!Array.isArray(tree)) {
            var version = tree.leafVersion, leafScript = tree.script, tapInternalKey = tree.tapInternalKey;
            // Earliest tree walk where we can validate tapScripts
            if (tree.tapLeafScript || (tree.tapMerkleRoot && !P.equalBytes(tree.tapMerkleRoot, P.EMPTY)))
                throw new Error('P2TR: tapRoot leafScript cannot have tree');
            // Just to be sure that it is spendable
            if (tapInternalKey && P.equalBytes(tapInternalKey, taproot.TAPROOT_UNSPENDABLE_KEY))
                throw new Error('P2TR: tapRoot leafScript cannot have unspendble key');
            var script = typeof leafScript === 'string' ? base.hex.decode(leafScript) : leafScript;
            checkTaprootScript(script, allowUnknowOutput);
            return {
                type: 'leaf',
                tapInternalKey: tapInternalKey,
                version: version,
                script: script,
                hash: (0, taproot.tapLeafHash)(script, version),
            };
        }
        // If tree / branch is not binary tree, convert it
        if (tree.length !== 2)
            tree = taprootListToTree(tree);
        if (tree.length !== 2)
            throw new Error('hashTree: non binary tree!');
        // branch
        // NOTE: both nodes should exist
        var left = taprootHashTree(tree[0], allowUnknowOutput);
        var right = taprootHashTree(tree[1], allowUnknowOutput);
        // We cannot swap left/right here, since it will change structure of tree
        var _b = [left.hash, right.hash], lH = _b[0], rH = _b[1];
        if (cmp(rH, lH) === -1)
            _a = [rH, lH], lH = _a[0], rH = _a[1];
        return { type: 'branch', left: left, right: right, hash: taggedHash('TapBranch', lH, rH) };
    }
    taproot.taprootHashTree = taprootHashTree;

    //Adds a path element to a binary tree
    function taprootAddPath(tree, path) {
        if (path === void 0) { path = []; }
        if (!tree)
            throw new Error("taprootAddPath: empty tree");
        if (tree.type === 'leaf')
            return __assign(__assign({}, tree), { path: path });
        if (tree.type !== 'branch')
            throw new Error("taprootAddPath: wrong type=".concat(tree));
        return __assign(__assign({}, tree), {
            path: path,
            // Left element has right hash in path and otherwise
            left: taprootAddPath(tree.left, __spreadArray([tree.right.hash], path, true)), right: taprootAddPath(tree.right, __spreadArray([tree.left.hash], path, true))
        });
    }
    taproot.taprootAddPath = taprootAddPath;

    //Flattens the tree
    function taprootWalkTree(tree) {
        if (!tree)
            throw new Error("taprootAddPath: empty tree");
        if (tree.type === 'leaf')
            return [tree];
        if (tree.type !== 'branch')
            throw new Error("taprootWalkTree: wrong type=".concat(tree));
        return __spreadArray(__spreadArray([], taprootWalkTree(tree.left), true), taprootWalkTree(tree.right), true);
    }
    taproot.taprootWalkTree = taprootWalkTree;

    // Another stupid decision, where lack of standard affects security.
    // Multisig needs to be generated with some key.
    // We are using approach from BIP 341/bitcoinjs-lib: SHA256(uncompressedDER(SECP256K1_GENERATOR_POINT))
    // It is possible to switch SECP256K1_GENERATOR_POINT with some random point;
    // but it's too complex to prove.
    // Also used by bitcoin-core and bitcoinjs-lib
    taproot.TAPROOT_UNSPENDABLE_KEY = (0, sha256_1.sha256)(secp.Point.BASE.toRawBytes(false));
    // Works as key OR tree.
    // If we only have tree, need to add unspendable key, otherwise
    // complex multisig wallet can be spent by owner of key only. See TAPROOT_UNSPENDABLE_KEY
    function p2tr(internalPubKey, tree, network, allowUnknowOutput) {
        if (network === void 0) { network = taproot.NETWORK; }
        if (allowUnknowOutput === void 0) { allowUnknowOutput = false; }
        // Unspendable
        if (!internalPubKey && !tree)
            throw new Error('p2tr: should have pubKey or scriptTree (or both)');
        var pubKey = typeof internalPubKey === 'string'
            ? base.hex.decode(internalPubKey)
            : internalPubKey || taproot.TAPROOT_UNSPENDABLE_KEY;
        if (!isValidPubkey(pubKey, PubT.schnorr))
            throw new Error('p2tr: non-schnorr pubkey');
        var hashedTree = tree ? taprootAddPath(taprootHashTree(tree, allowUnknowOutput)) : undefined;
        var tapMerkleRoot = hashedTree ? hashedTree.hash : undefined;
        var _a = taprootTweakPubkey(pubKey, tapMerkleRoot || P.EMPTY), tweakedPubkey = _a[0], parity = _a[1];
        var leaves;
        if (hashedTree) {
            leaves = taprootWalkTree(hashedTree).map(function (l) {
                return (__assign(__assign({}, l), {
                    controlBlock: taproot.TaprootControlBlock.encode({
                        version: (l.version || taproot.TAP_LEAF_VERSION) + +parity,
                        internalKey: l.tapInternalKey || pubKey,
                        merklePath: l.path,
                    })
                }));
            });
        }
        var tapLeafScript;
        if (leaves) {
            tapLeafScript = leaves.map(function (l) {
                return [
                    taproot.TaprootControlBlock.decode(l.controlBlock),
                    concat(l.script, new Uint8Array([l.version || taproot.TAP_LEAF_VERSION])),
                ];
            });
        }
        var res = {
            type: 'tr',
            script: taproot.OutScript.encode({ type: 'tr', pubkey: tweakedPubkey }),
            address: Address(network).encode({ type: 'tr', pubkey: tweakedPubkey }),
            // For tests
            tweakedPubkey: tweakedPubkey,
            // PSBT stuff
            tapInternalKey: pubKey,
        };
        // Just in case someone would want to select a specific script
        if (leaves)
            res.leaves = leaves;
        if (tapLeafScript)
            res.tapLeafScript = tapLeafScript;
        if (tapMerkleRoot)
            res.tapMerkleRoot = tapMerkleRoot;
        return res;
    }
    taproot.p2tr = p2tr;
    var OutTRNS = {
        encode: function (from) {
            var last = from.length - 1;
            if (from[last] !== 'CHECKSIG')
                return;
            var pubkeys = [];
            for (var i = 0; i < last; i++) {
                var elm = from[i];
                if (i & 1) {
                    if (elm !== 'CHECKSIGVERIFY')
                        // ROHIT Removing throw, and replacing with return to let the process continue
                        //throw new Error('OutScript.encode/tr_ns: wrong element');
                        return;
                    if (i === last - 1)
                        // ROHIT Removing throw, and replacing with return to let the process continue
                        //throw new Error('OutScript.encode/tr_ns: wrong element');
                        return;
                    continue;
                }
                if (!isBytes(elm))
                    //ROHIT TO SOLVE CHEKKSIG ERROR 
                    //throw new Error('OutScript.encode/tr_ns: wrong element');
                    return;
                pubkeys.push(elm);
            }
            return { type: 'tr_ns', pubkeys: pubkeys };
        },
        decode: function (to) {
            if (to.type !== 'tr_ns')
                return;
            var out = [];
            for (var i = 0; i < to.pubkeys.length - 1; i++)
                out.push(to.pubkeys[i], 'CHECKSIGVERIFY');
            out.push(to.pubkeys[to.pubkeys.length - 1], 'CHECKSIG');
            return out;
        },
    };
    // Returns all combinations of size M from lst
    function combinations(m, list) {
        var res = [];
        if (!Array.isArray(list))
            throw new Error('combinations: lst arg should be array');
        var n = list.length;
        if (m > n)
            throw new Error('combinations: m > lst.length, no combinations possible');
        /*
        Basically works as M nested loops like:
        for (;idx[0]<lst.length;idx[0]++) for (idx[1]=idx[0]+1;idx[1]<lst.length;idx[1]++)
        but since we cannot create nested loops dynamically, we unroll it to a single loop
        */
        var idx = Array.from({ length: m }, function (_, i) { return i; });
        var last = idx.length - 1;
        main: for (; ;) {
            res.push(idx.map(function (i) { return list[i]; }));
            idx[last] += 1;
            var i = last;
            // Propagate increment
            // NOTE: idx[i] cannot be bigger than n-m+i, otherwise last elements in right part will overflow
            for (; i >= 0 && idx[i] > n - m + i; i--) {
                idx[i] = 0;
                // Overflow in idx[0], break
                if (i === 0)
                    break main;
                idx[i - 1] += 1;
            }
            // Propagate: idx[i+1] = idx[idx]+1
            for (i += 1; i < idx.length; i++)
                idx[i] = idx[i - 1] + 1;
        }
        return res;
    }
    taproot.combinations = combinations;
    /**
     * M-of-N multi-leaf wallet via p2tr_ns. If m == n, single script is emitted.
     * Takes O(n^2) if m != n. 99-of-100 is ok, 5-of-100 is not.
     * `2-of-[A,B,C] => [A,B] | [A,C] | [B,C]`
     */
    var p2tr_ns = function (m, pubkeys, allowSamePubkeys) {
        if (allowSamePubkeys === void 0) { allowSamePubkeys = false; }
        if (!allowSamePubkeys)
            uniqPubkey(pubkeys);
        return combinations(m, pubkeys).map(function (i) {
            return ({
                type: 'tr_ns',
                script: taproot.OutScript.encode({ type: 'tr_ns', pubkeys: i }),
            });
        });
    };
    taproot.p2tr_ns = p2tr_ns;
    // Taproot public key (case of p2tr_ns)
    var p2tr_pk = function (pubkey) { return (0, taproot.p2tr_ns)(1, [pubkey], undefined)[0]; };
    taproot.p2tr_pk = p2tr_pk;
    var OutTRMS = {
        encode: function (from) {
            var last = from.length - 1;
            if (from[last] !== 'NUMEQUAL' || from[1] !== 'CHECKSIG')
                return;
            var pubkeys = [];
            var m = OPtoNumber(from[last - 1]);
            if (m === undefined)
                return;
            for (var i = 0; i < last - 1; i++) {
                var elm = from[i];
                if (i & 1) {
                    if (elm !== (i === 1 ? 'CHECKSIG' : 'CHECKSIGADD'))
                        throw new Error('OutScript.encode/tr_ms: wrong element');
                    continue;
                }
                if (!isBytes(elm))
                    throw new Error('OutScript.encode/tr_ms: wrong key element');
                pubkeys.push(elm);
            }
            return { type: 'tr_ms', pubkeys: pubkeys, m: m };
        },
        decode: function (to) {
            if (to.type !== 'tr_ms')
                return;
            var out = [to.pubkeys[0], 'CHECKSIG'];
            for (var i = 1; i < to.pubkeys.length; i++)
                out.push(to.pubkeys[i], 'CHECKSIGADD');
            out.push("OP_".concat(to.m), 'NUMEQUAL');
            return out;
        },
    };
    function p2tr_ms(m, pubkeys, allowSamePubkeys) {
        if (allowSamePubkeys === void 0) { allowSamePubkeys = false; }
        if (!allowSamePubkeys)
            uniqPubkey(pubkeys);
        return {
            type: 'tr_ms',
            script: taproot.OutScript.encode({ type: 'tr_ms', pubkeys: pubkeys, m: m }),
        };
    }
    taproot.p2tr_ms = p2tr_ms;
    var OutUnknown = {
        encode: function (from) {
            return { type: 'unknown', script: taproot.Script.encode(from) };
        },
        decode: function (to) {
            return to.type === 'unknown' ? taproot.Script.decode(to.script) : undefined;
        },
    };
    // /Payments
    var OutScripts = [
        OutPK,
        OutPKH,
        OutSH,
        OutWSH,
        OutWPKH,
        OutMS,
        OutTR,
        OutTRNS,
        OutTRMS,
        OutUnknown,
    ];
    // TODO: we can support user supplied output scripts now
    // - addOutScript
    // - removeOutScript
    // - We can do that as log we modify array in-place
    var _OutScript = P.apply(taproot.Script, P.coders.match(OutScripts));
    // We can validate this once, because of packed & coders
    taproot.OutScript = P.validate(_OutScript, function (i) {
        if (i.type === 'pk' && !isValidPubkey(i.pubkey, PubT.ecdsa))
            throw new Error('OutScript/pk: wrong key');
        if ((i.type === 'pkh' || i.type === 'sh' || i.type === 'wpkh') &&
            (!isBytes(i.hash) || i.hash.length !== 20))
            throw new Error("OutScript/".concat(i.type, ": wrong hash"));
        if (i.type === 'wsh' && (!isBytes(i.hash) || i.hash.length !== 32))
            throw new Error("OutScript/wsh: wrong hash");
        if (i.type === 'tr' && (!isBytes(i.pubkey) || !isValidPubkey(i.pubkey, PubT.schnorr)))
            throw new Error('OutScript/tr: wrong taproot public key');
        if (i.type === 'ms' || i.type === 'tr_ns' || i.type === 'tr_ms')
            if (!Array.isArray(i.pubkeys))
                throw new Error('OutScript/multisig: wrong pubkeys array');
        if (i.type === 'ms') {
            var n = i.pubkeys.length;
            for (var _i = 0, _a = i.pubkeys; _i < _a.length; _i++) {
                var p = _a[_i];
                if (!isValidPubkey(p, PubT.ecdsa))
                    throw new Error('OutScript/multisig: wrong pubkey');
            }
            if (i.m <= 0 || n > 16 || i.m > n)
                throw new Error('OutScript/multisig: invalid params');
        }
        if (i.type === 'tr_ns' || i.type === 'tr_ms') {
            for (var _b = 0, _c = i.pubkeys; _b < _c.length; _b++) {
                var p = _c[_b];
                if (!isValidPubkey(p, PubT.schnorr))
                    throw new Error("OutScript/".concat(i.type, ": wrong pubkey"));
            }
        }
        if (i.type === 'tr_ms') {
            var n = i.pubkeys.length;
            if (i.m <= 0 || n > 16 || i.m > n)
                throw new Error('OutScript/tr_ms: invalid params');
        }
        return i;
    });
    // Address
    // TODO: clean-up
    function validateWitness(version, data) {
        if (data.length < 2 || data.length > 40)
            throw new Error('Witness: invalid length');
        if (version > 16)
            throw new Error('Witness: invalid version');
        if (version === 0 && !(data.length === 20 || data.length === 32))
            throw new Error('Witness: invalid length for version');
    }
    taproot.validateWitness = validateWitness;
    function programToWitness(version, data, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        validateWitness(version, data);
        var coder = version === 0 ? base.bech32 : base.bech32m;
        return coder.encode(network.bech32, [version].concat(coder.toWords(data)));
    }
    taproot.programToWitness = programToWitness;
    // TODO: remove?
    function parseWitnessProgram(version, data) {
        validateWitness(version, data);
        var encodedVersion = version > 0 ? version + 0x50 : version;
        return concat(new Uint8Array([encodedVersion]), taproot.VarBytes.encode(Uint8Array.from(data)));
    }
    taproot.parseWitnessProgram = parseWitnessProgram;
    function formatKey(hashed, prefix) {
        return taproot.base58check.encode(concat(Uint8Array.from(prefix), hashed));
    }
    function WIF(network) {
        if (network === void 0) { network = taproot.NETWORK; }
        return {
            encode: function (privKey) {
                var compressed = concat(privKey, new Uint8Array([0x01]));
                return formatKey(compressed.subarray(0, 33), [network.wif]);
            },
            decode: function (wif) {
                var parsed = taproot.base58check.decode(wif);
                if (parsed[0] !== network.wif)
                    throw new Error('Wrong WIF prefix');
                parsed = parsed.subarray(1);
                // Check what it is. Compressed flag?
                if (parsed.length !== 33)
                    throw new Error('Wrong WIF length');
                if (parsed[32] !== 0x01)
                    throw new Error('Wrong WIF postfix');
                return parsed.subarray(0, -1);
            },
        };
    }
    taproot.WIF = WIF;
    // Returns OutType, which can be used to create outscript
    function Address(network) {
        if (network === void 0) { network = taproot.NETWORK; }
        return {
            encode: function (from) {
                var type = from.type;
                if (type === 'wpkh')
                    return programToWitness(0, from.hash, network);
                else if (type === 'wsh')
                    return programToWitness(0, from.hash, network);
                else if (type === 'tr')
                    return programToWitness(1, from.pubkey, network);
                else if (type === 'pkh')
                    return formatKey(from.hash, [network.pubKeyHash]);
                else if (type === 'sh')
                    return formatKey(from.hash, [network.scriptHash]);
                return 1;
            },
            decode: function (address) {
                if (address.length < 14 || address.length > 74)
                    throw new Error('Invalid address length');
                // Bech32
                if (network.bech32 && address.toLowerCase().startsWith(network.bech32)) {
                    var res = void 0;
                    try {
                        res = base.bech32.decode(address);
                        if (res.words[0] !== 0)
                            throw new Error("bech32: wrong version=".concat(res.words[0]));
                    }
                    catch (_) {
                        // Starting from version 1 it is decoded as bech32m
                        res = base.bech32m.decode(address);
                        if (res.words[0] === 0)
                            throw new Error("bech32m: wrong version=".concat(res.words[0]));
                    }
                    if (res.prefix !== network.bech32)
                        throw new Error("wrong bech32 prefix=".concat(res.prefix));
                    var _a = res.words, version = _a[0], program = _a.slice(1);
                    var data_1 = base.bech32.fromWords(program);
                    validateWitness(version, data_1);
                    if (version === 0 && data_1.length === 32)
                        return { type: 'wsh', hash: data_1 };
                    else if (version === 0 && data_1.length === 20)
                        return { type: 'wpkh', hash: data_1 };
                    else if (version === 1 && data_1.length === 32)
                        return { type: 'tr', pubkey: data_1 };
                    else
                        throw new Error('Unkown witness program');
                }
                var data = base.base58.decode(address);
                if (data.length !== 25)
                    throw new Error('Invalid base58 address');
                // Pay To Public Key Hash
                if (data[0] === network.pubKeyHash) {
                    var bytes = base.base58.decode(address);
                    return { type: 'pkh', hash: bytes.slice(1, bytes.length - 4) };
                }
                else if (data[0] === network.scriptHash) {
                    var bytes = base.base58.decode(address);
                    return {
                        type: 'sh',
                        hash: base.base58.decode(address).slice(1, bytes.length - 4),
                    };
                }
                throw new Error("Invalid address prefix=".concat(data[0]));
            },
        };
    }
    taproot.Address = Address;
    // /Address
    var SignatureHash;
    (function (SignatureHash) {
        SignatureHash[SignatureHash["DEFAULT"] = 0] = "DEFAULT";
        SignatureHash[SignatureHash["ALL"] = 1] = "ALL";
        SignatureHash[SignatureHash["NONE"] = 2] = "NONE";
        SignatureHash[SignatureHash["SINGLE"] = 3] = "SINGLE";
        SignatureHash[SignatureHash["ANYONECANPAY"] = 128] = "ANYONECANPAY";
        SignatureHash[SignatureHash["ALL_SIGHASH_ANYONECANPAY"] = 129] = "ALL_SIGHASH_ANYONECANPAY";
        SignatureHash[SignatureHash["NONE_SIGHASH_ANYONECANPAY"] = 130] = "NONE_SIGHASH_ANYONECANPAY";
        SignatureHash[SignatureHash["SINGLE_SIGHASH_ANYONECANPAY"] = 131] = "SINGLE_SIGHASH_ANYONECANPAY";
    })(SignatureHash = taproot.SignatureHash || (taproot.SignatureHash = {}));
    taproot.SigHashCoder = P.apply(P.U32LE, P.coders.tsEnum(SignatureHash));
    function sum(arr) {
        return arr.map(function (n) { return BigInt(n); }).reduce(function (a, b) { return a + b; });
    }
    // TODO: encoder maybe?
    function unpackSighash(hashType) {
        var masked = hashType & 31;
        return {
            isAny: !!(hashType & 128),
            isNone: masked === 2,
            isSingle: masked === 3,
        };
    }
    var _sortPubkeys = function (pubkeys) { return Array.from(pubkeys).sort(cmp); };
    taproot._sortPubkeys = _sortPubkeys;
    var def = {
        sequence: function (n) { return (n === undefined ? taproot.DEFAULT_SEQUENCE : n); },
        lockTime: function (n) { return (n === undefined ? taproot.DEFAULT_LOCKTIME : n); },
    };
    taproot.TAP_LEAF_VERSION = 0xc0;
    var tapLeafHash = function (script, version) {
        if (version === void 0) { version = taproot.TAP_LEAF_VERSION; }
        return taggedHash('TapLeaf', new Uint8Array([version]), taproot.VarBytes.encode(script));
    };
    taproot.tapLeafHash = tapLeafHash;
    function getTaprootKeys(privKey, pubKey, internalKey, merkleRoot) {
        if (merkleRoot === void 0) { merkleRoot = P.EMPTY; }
        if (P.equalBytes(internalKey, pubKey)) {
            privKey = taprootTweakPrivKey(privKey, merkleRoot);
            pubKey = secp.schnorr.getPublicKey(privKey);
        }
        return { privKey: privKey, pubKey: pubKey };
    }
    taproot.getTaprootKeys = getTaprootKeys;
    var Transaction = /** @class */ (function () {
        // function Transaction(version, lockTime, PSBTVersion,opts) { //Changed the position of opts so that it can test examples work
        function Transaction(opts, version, lockTime, PSBTVersion) {
            if (version === void 0) { version = taproot.DEFAULT_VERSION; }
            if (lockTime === void 0) { lockTime = 0; }
            if (PSBTVersion === void 0) { PSBTVersion = 0; }
            if (opts === void 0) { opts = {}; }
            this.PSBTVersion = PSBTVersion;
            this.opts = opts;
            this.global = {};
            this.inputs = [];
            this.outputs = [];
            if (lockTime !== taproot.DEFAULT_LOCKTIME)
                this.global.fallbackLocktime = lockTime;
            this.global.txVersion = version;
        }
        // Import
        Transaction.fromRaw = function (raw, opts) {
            if (opts === void 0) { opts = {}; }
            var parsed = taproot.RawTx.decode(raw);
            var tx = new Transaction(parsed.version, parsed.lockTime, undefined, opts);
            for (var _i = 0, _a = parsed.outputs; _i < _a.length; _i++) {
                var o = _a[_i];
                tx.addOutput(o);
            }
            tx.outputs = parsed.outputs;
            tx.inputs = parsed.inputs;
            if (parsed.witnesses) {
                for (var i = 0; i < parsed.witnesses.length; i++)
                    tx.inputs[i].finalScriptWitness = parsed.witnesses[i];
            }
            return tx;
        };
        // PSBT
        Transaction.fromPSBT = function (psbt, opts) {
            if (opts === void 0) { opts = {}; }
            var parsed;
            try {
                parsed = taproot.RawPSBTV0.decode(psbt);
            }
            catch (e0) {
                try {
                    parsed = taproot.RawPSBTV2.decode(psbt);
                }
                catch (e2) {
                    // Throw error for v0 parsing, since it popular, otherwise it would be shadowed by v2 error
                    throw e0;
                }
            }
            var version = parsed.global.version || 0;
            var unsigned = parsed.global.unsignedTx;
            var txVersion = !version ? unsigned === null || unsigned === void 0 ? void 0 : unsigned.version : parsed.global.txVersion;
            var lockTime = !version ? unsigned === null || unsigned === void 0 ? void 0 : unsigned.lockTime : parsed.global.fallbackLocktime;
            var tx = new Transaction(txVersion, lockTime, version, opts);
            // We need slice here, because otherwise
            var inputCount = !version ? unsigned === null || unsigned === void 0 ? void 0 : unsigned.inputs.length : parsed.global.inputCount;
            tx.inputs = parsed.inputs.slice(0, inputCount).map(function (i, j) {
                var _a;
                return (__assign(__assign({ finalScriptSig: P.EMPTY }, (_a = parsed.global.unsignedTx) === null || _a === void 0 ? void 0 : _a.inputs[j]), i));
            });
            var outputCount = !version ? unsigned === null || unsigned === void 0 ? void 0 : unsigned.outputs.length : parsed.global.outputCount;
            tx.outputs = parsed.outputs.slice(0, outputCount).map(function (i, j) {
                var _a;
                return (__assign(__assign({}, i), (_a = parsed.global.unsignedTx) === null || _a === void 0 ? void 0 : _a.outputs[j]));
            });
            tx.global = __assign(__assign({}, parsed.global), { txVersion: txVersion }); // just in case propietary/unknown fields
            if (lockTime !== taproot.DEFAULT_LOCKTIME)
                tx.global.fallbackLocktime = lockTime;
            return tx;
        };
        Transaction.prototype.toPSBT = function (ver) {
            if (ver === void 0) { ver = this.PSBTVersion; }
            var inputs = this.inputs.map(function (i) { return cleanPSBTFields(ver, PSBTInput, i); });
            for (var _i = 0, inputs_1 = inputs; _i < inputs_1.length; _i++) {
                var inp = inputs_1[_i];
                // Don't serialize empty fields
                if (inp.partialSig && !inp.partialSig.length)
                    delete inp.partialSig;
                if (inp.finalScriptSig && !inp.finalScriptSig.length)
                    delete inp.finalScriptSig;
                if (inp.finalScriptWitness && !inp.finalScriptWitness.length)
                    delete inp.finalScriptWitness;
            }
            var outputs = this.outputs.map(function (i) { return cleanPSBTFields(ver, PSBTOutput, i); });
            if (ver && ver !== 2)
                throw new Error("Wrong PSBT version=".concat(ver));
            var global = __assign({}, this.global);
            if (!ver) {
                global.unsignedTx = taproot.RawTx.decode(this.unsignedTx);
                delete global.fallbackLocktime;
                delete global.txVersion;
            }
            else {
                global.version = ver;
                global.txVersion = this.version;
                global.inputCount = this.inputs.length;
                global.outputCount = this.outputs.length;
                if (global.fallbackLocktime && global.fallbackLocktime === taproot.DEFAULT_LOCKTIME)
                    delete global.fallbackLocktime;
            }
            if (this.opts.bip174jsCompat) {
                if (!inputs.length)
                    inputs.push({});
                if (!outputs.length)
                    outputs.push({});
            }
            return (ver === 2 ? taproot.RawPSBTV2 : taproot.RawPSBTV0).encode({
                global: global,
                inputs: inputs,
                outputs: outputs,
            });
        };
        Object.defineProperty(Transaction.prototype, "lockTime", {
            // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
            get: function () {
                var height = taproot.DEFAULT_LOCKTIME;
                var heightCnt = 0;
                var time = taproot.DEFAULT_LOCKTIME;
                var timeCnt = 0;
                for (var _i = 0, _a = this.inputs; _i < _a.length; _i++) {
                    var i = _a[_i];
                    if (i.requiredHeightLocktime) {
                        height = Math.max(height, i.requiredHeightLocktime);
                        heightCnt++;
                    }
                    if (i.requiredTimeLocktime) {
                        time = Math.max(time, i.requiredTimeLocktime);
                        timeCnt++;
                    }
                }
                if (heightCnt && heightCnt >= timeCnt)
                    return height;
                if (time !== taproot.DEFAULT_LOCKTIME)
                    return time;
                return this.global.fallbackLocktime || taproot.DEFAULT_LOCKTIME;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "version", {
            get: function () {
                // Should be not possible
                if (this.global.txVersion === undefined)
                    throw new Error('No global.txVersion');
                return this.global.txVersion;
            },
            enumerable: false,
            configurable: true
        });
        Transaction.prototype.inputStatus = function (idx) {
            this.checkInputIdx(idx);
            var input = this.inputs[idx];
            // Finalized
            if (input.finalScriptSig && input.finalScriptSig.length)
                return 'finalized';
            if (input.finalScriptWitness && input.finalScriptWitness.length)
                return 'finalized';
            // Signed taproot
            if (input.tapKeySig)
                return 'signed';
            if (input.tapScriptSig && input.tapScriptSig.length)
                return 'signed';
            // Signed
            if (input.partialSig && input.partialSig.length)
                return 'signed';
            return 'unsigned';
        };
        // TODO: re-use in preimages
        Transaction.prototype.inputSighash = function (idx) {
            this.checkInputIdx(idx);
            var sighash = this.inputType(this.inputs[idx]).sighash;
            // ALL or DEFAULT -- everything signed
            // NONE           -- all inputs + no outputs
            // SINGLE         -- all inputs + output with same index
            // ALL + ANYONE   -- specific input + all outputs
            // NONE + ANYONE  -- specific input + no outputs
            // SINGLE         -- specific inputs + output with same index
            var sigOutputs = sighash === SignatureHash.DEFAULT ? SignatureHash.ALL : sighash & 3;
            var sigInputs = sighash & SignatureHash.ANYONECANPAY;
            return { sigInputs: sigInputs, sigOutputs: sigOutputs };
        };
        Transaction.prototype.signStatus = function () {
            // if addInput or addOutput is not possible, then all inputs or outputs are signed
            var addInput = true, addOutput = true;
            var inputs = [], outputs = [];
            for (var idx = 0; idx < this.inputs.length; idx++) {
                var status = this.inputStatus(idx);
                // Unsigned input doesn't affect anything
                if (status === 'unsigned')
                    continue;
                var _a = this.inputSighash(idx), sigInputs = _a.sigInputs, sigOutputs = _a.sigOutputs;
                // Input type
                if (sigInputs === SignatureHash.ANYONECANPAY)
                    inputs.push(idx);
                else
                    addInput = false;
                // Output type
                if (sigOutputs === SignatureHash.ALL)
                    addOutput = false;
                else if (sigOutputs === SignatureHash.SINGLE)
                    outputs.push(idx);
                else if (sigOutputs === SignatureHash.NONE) {
                    // Doesn't affect any outputs at all
                }
                else
                    throw new Error("Wrong signature hash output type: ".concat(sigOutputs));
            }
            return { addInput: addInput, addOutput: addOutput, inputs: inputs, outputs: outputs };
        };
        Object.defineProperty(Transaction.prototype, "isFinal", {
            get: function () {
                for (var idx = 0; idx < this.inputs.length; idx++)
                    if (this.inputStatus(idx) !== 'finalized')
                        return false;
                return true;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "hasWitnesses", {
            // Info utils
            get: function () {
                var out = false;
                for (var _i = 0, _a = this.inputs; _i < _a.length; _i++) {
                    var i = _a[_i];
                    if (i.finalScriptWitness && i.finalScriptWitness.length)
                        out = true;
                }
                return out;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "weight", {
            // https://en.bitcoin.it/wiki/Weight_units
            get: function () {
                if (!this.isFinal)
                    throw new Error('Transaction is not finalized');
                // TODO: Can we find out how much witnesses/script will be used before signing?
                var out = 32;
                if (this.hasWitnesses)
                    out += 2;
                out += 4 * CompactSizeLen.encode(this.inputs.length).length;
                out += 4 * CompactSizeLen.encode(this.outputs.length).length;
                for (var _i = 0, _a = this.inputs; _i < _a.length; _i++) {
                    var i = _a[_i];
                    out += 160 + 4 * taproot.VarBytes.encode(i.finalScriptSig).length;
                }
                for (var _b = 0, _c = this.outputs; _b < _c.length; _b++) {
                    var o = _c[_b];
                    out += 32 + 4 * taproot.VarBytes.encode(o.script).length;
                }
                if (this.hasWitnesses) {
                    for (var _d = 0, _e = this.inputs; _d < _e.length; _d++) {
                        var i = _e[_d];
                        if (i.finalScriptWitness)
                            out += taproot.RawWitness.encode(i.finalScriptWitness).length;
                    }
                }
                return out;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "vsize", {
            get: function () {
                return Math.ceil(this.weight / 4);
            },
            enumerable: false,
            configurable: true
        });
        Transaction.prototype.toBytes = function (withScriptSig, withWitness) {
            if (withScriptSig === void 0) { withScriptSig = false; }
            if (withWitness === void 0) { withWitness = false; }
            return taproot.RawTx.encode({
                version: this.version,
                lockTime: this.lockTime,
                inputs: this.inputs.map(function (i) { return (__assign(__assign({}, i), { finalScriptSig: (withScriptSig && i.finalScriptSig) || P.EMPTY })); }),
                outputs: this.outputs,
                witnesses: this.inputs.map(function (i) { return i.finalScriptWitness || []; }),
                segwitFlag: withWitness && this.hasWitnesses,
            });
        };
        Object.defineProperty(Transaction.prototype, "unsignedTx", {
            get: function () {
                return this.toBytes(false, false);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "hex", {
            get: function () {
                return base.hex.encode(this.toBytes(true, this.hasWitnesses));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "hash", {
            // TODO: hash requires non-empty script in inputs, why?
            get: function () {
                if (!this.isFinal)
                    throw new Error('Transaction is not finalized');
                return base.hex.encode(sha256x2(this.toBytes(true)));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "id", {
            get: function () {
                if (!this.isFinal)
                    throw new Error('Transaction is not finalized');
                return base.hex.encode(sha256x2(this.toBytes(true)).reverse());
            },
            enumerable: false,
            configurable: true
        });
        // Input stuff
        Transaction.prototype.checkInputIdx = function (idx) {
            if (!Number.isSafeInteger(idx) || 0 > idx || idx >= this.inputs.length)
                throw new Error("Wrong input index=".concat(idx));
        };
        // Modification
        Transaction.prototype.normalizeInput = function (i, cur, allowedFields) {

            var res = __assign(__assign({}, cur), i);
            if (res.sequence === undefined)
                res.sequence = taproot.DEFAULT_SEQUENCE;
            if (res.hash === undefined && typeof res.txid === 'string')
                res.hash = base.hex.decode(res.txid);
            if (res.hash === undefined && typeof res.txid === 'object')
                res.hash = res.txid;
            if (typeof res.hash === 'string')
                res.hash = base.hex.decode(res.hash).reverse();

            if (res.tapMerkleRoot === null)
                delete res.tapMerkleRoot;
            if (res.hash === undefined || res.index === undefined)
                throw new Error('Transaction/input: hash and index required');
            res = mergeKeyMap(PSBTInput, res, cur, allowedFields);
            PSBTInputCoder.encode(res);

            // Cannot move in PSBTInputCoder, since it requires opts for parsing
            if (res.nonWitnessUtxo) {
                var outputs = res.nonWitnessUtxo.outputs;
                if (outputs.length - 1 < res.index)
                    throw new Error('nonWitnessUtxo: incorect output index');
                var tx = Transaction.fromRaw(taproot.RawTx.encode(res.nonWitnessUtxo), this.opts);
                var hash = base.hex.encode(res.hash);
                if (tx.id !== hash)
                    //ROHIT UNDONE var txid = base.hex.encode(res.txid);
                    //ROHIT UNDONE if (tx.id !== txid)
                    throw new Error("nonWitnessUtxo: wrong hash, exp=".concat(txid, " got=").concat(tx.id));
            }
            // TODO: use this.prevout?
            var prevOut;
            if (res.nonWitnessUtxo && i.index !== undefined)
                prevOut = res.nonWitnessUtxo.outputs[res.index];
            else if (res.witnessUtxo)
                prevOut = res.witnessUtxo;
            if (!this.opts.disableScriptCheck)
                checkScript(prevOut && prevOut.script, res.redeemScript, res.witnessScript);
            return res;
        };
        Transaction.prototype.addInput = function (input) {
            if (!this.signStatus().addInput)
                throw new Error('Tx has signed inputs, cannot add new one');
            this.inputs.push(this.normalizeInput(input));
            //ROHIT ATTEMPT UNDONE this.inputs.push(this.normalizeInput(this.inputs,input));
            return this.inputs.length - 1;
        };
        Transaction.prototype.updateInput = function (idx, input) {
            this.checkInputIdx(idx);
            var allowedFields = undefined;
            var status = this.signStatus();
            if (!status.addInput || status.inputs.includes(idx))
                allowedFields = PSBTInputUnsignedKeys;
            this.inputs[idx] = this.normalizeInput(input, this.inputs[idx], allowedFields);
        };
        // Output stuff
        Transaction.prototype.checkOutputIdx = function (idx) {
            if (!Number.isSafeInteger(idx) || 0 > idx || idx >= this.outputs.length)
                throw new Error("Wrong output index=".concat(idx));
        };
        Transaction.prototype.normalizeOutput = function (o, cur, allowedFields) {
            var res = __assign(__assign({}, cur), o);
            if (res.amount !== undefined)
                res.amount = typeof res.amount === 'string' ? taproot.decimal.decode(res.amount) : res.amount;
            res = mergeKeyMap(PSBTOutput, res, cur, allowedFields);
            PSBTOutputCoder.encode(res);
            if (res.script === undefined || res.amount === undefined)
                throw new Error('Transaction/output: script and amount required');
            if (!this.opts.allowUnknowOutput && taproot.OutScript.decode(res.script).type === 'unknown') {
                throw new Error('Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnkownScript=true, if you sure');
            }
            if (!this.opts.disableScriptCheck)
                checkScript(res.script, res.redeemScript, res.witnessScript);
            return res;
        };
        Transaction.prototype.addOutput = function (o) {
            if (!this.signStatus().addOutput)
                throw new Error('Tx has signed outputs, cannot add new one');
            this.outputs.push(this.normalizeOutput(o));
            return this.outputs.length - 1;
        };
        Transaction.prototype.updateOutput = function (idx, output) {
            this.checkOutputIdx(idx);
            var allowedFields = undefined;
            var status = this.signStatus();
            if (!status.addOutput || status.outputs.includes(idx))
                allowedFields = PSBTOutputUnsignedKeys;
            this.outputs[idx] = this.normalizeOutput(output, this.outputs[idx], allowedFields);
        };
        Transaction.prototype.addOutputAddress = function (address, amount, network) {
            if (network === void 0) { network = taproot.NETWORK; }
            return this.addOutput({
                script: taproot.OutScript.encode(Address(network).decode(address)),
                amount: typeof amount === 'string' ? taproot.decimal.decode(amount) : amount,
            });
        };
        Object.defineProperty(Transaction.prototype, "fee", {
            // Utils
            get: function () {
                var res = 0n;
                for (var _i = 0, _a = this.inputs; _i < _a.length; _i++) {
                    var i = _a[_i];
                    var prevOut = this.prevOut(i);
                    if (!prevOut)
                        throw new Error('Empty input amount');
                    res += prevOut.amount;
                }
                for (var _b = 0, _c = this.outputs; _b < _c.length; _b++) {
                    var i = _c[_b];
                    res -= i.amount;
                }
                return res;
            },
            enumerable: false,
            configurable: true
        });
        // Signing
        // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
        // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
        // but we are trying to be less complicated for audit purpose for now.
        Transaction.prototype.preimageLegacy = function (idx, prevOutScript, hashType) {
            var _a = unpackSighash(hashType), isAny = _a.isAny, isNone = _a.isNone, isSingle = _a.isSingle;
            if (idx < 0 || !Number.isSafeInteger(idx))
                throw new Error("Invalid input idx=".concat(idx));
            if ((isSingle && idx >= this.outputs.length) || idx >= this.inputs.length)
                return P.U256BE.encode(1n);
            prevOutScript = taproot.Script.encode(taproot.Script.decode(prevOutScript).filter(function (i) { return i !== 'CODESEPARATOR'; }));
            var inputs = this.inputs.map(function (input, inputIdx) { return (__assign(__assign({}, input), { finalScriptSig: inputIdx === idx ? prevOutScript : P.EMPTY })); });
            if (isAny)
                inputs = [inputs[idx]];
            else if (isNone || isSingle) {
                inputs = inputs.map(function (input, inputIdx) { return (__assign(__assign({}, input), { sequence: inputIdx === idx ? def.sequence(input.sequence) : 0 })); });
            }
            var outputs = this.outputs;
            if (isNone)
                outputs = [];
            else if (isSingle) {
                outputs = this.outputs.slice(0, idx).fill(EMPTY_OUTPUT).concat([outputs[idx]]);
            }
            var tmpTx = taproot.RawTx.encode({
                lockTime: this.lockTime,
                version: this.version,
                segwitFlag: false,
                inputs: inputs,
                outputs: outputs,
            });
            return sha256x2(tmpTx, P.I32LE.encode(hashType));
        };
        Transaction.prototype.preimageWitnessV0 = function (idx, prevOutScript, hashType, amount) {
            var _a = unpackSighash(hashType), isAny = _a.isAny, isNone = _a.isNone, isSingle = _a.isSingle;
            var inputHash = EMPTY32;
            var sequenceHash = EMPTY32;
            var outputHash = EMPTY32;
            var inputs = this.inputs;
            if (!isAny)
                inputHash = sha256x2.apply(void 0, inputs.map(TxHashIdx.encode));
            if (!isAny && !isSingle && !isNone)
                sequenceHash = sha256x2.apply(void 0, inputs.map(function (i) { return P.U32LE.encode(def.sequence(i.sequence)); }));
            if (!isSingle && !isNone) {
                outputHash = sha256x2.apply(void 0, this.outputs.map(taproot.RawOutput.encode));
            }
            else if (isSingle && idx < this.outputs.length)
                outputHash = sha256x2(taproot.RawOutput.encode(this.outputs[idx]));
            var input = inputs[idx];
            return sha256x2(P.I32LE.encode(this.version), inputHash, sequenceHash, P.bytes(32, true).encode(input.hash), P.U32LE.encode(input.index), taproot.VarBytes.encode(prevOutScript), P.U64LE.encode(amount), P.U32LE.encode(def.sequence(input.sequence)), outputHash, P.U32LE.encode(this.lockTime), P.U32LE.encode(hashType));
        };
        Transaction.prototype.preimageWitnessV1 = function (idx, prevOutScript, hashType, amount, codeSeparator, leafScript, leafVer, annex) {
            if (codeSeparator === void 0) { codeSeparator = -1; }
            if (leafVer === void 0) { leafVer = 0xc0; }
            if (!Array.isArray(amount) || this.inputs.length !== amount.length)
                throw new Error("Invalid amounts array=".concat(amount));
            if (!Array.isArray(prevOutScript) || this.inputs.length !== prevOutScript.length)
                throw new Error("Invalid prevOutScript array=".concat(prevOutScript));
            var out = [
                P.U8.encode(0),
                P.U8.encode(hashType),
                P.I32LE.encode(this.version),
                P.U32LE.encode(this.lockTime),
            ];
            var outType = hashType === SignatureHash.DEFAULT ? SignatureHash.ALL : hashType & 3;
            var inType = hashType & SignatureHash.ANYONECANPAY;
            if (inType !== SignatureHash.ANYONECANPAY) {
                out.push.apply(out, [
                    this.inputs.map(TxHashIdx.encode),
                    amount.map(P.U64LE.encode),
                    prevOutScript.map(taproot.VarBytes.encode),
                    this.inputs.map(function (i) { return P.U32LE.encode(def.sequence(i.sequence)); }),
                ].map(function (i) { return (0, sha256_1.sha256)(concat.apply(void 0, i)); }));
            }
            if (outType === SignatureHash.ALL) {
                out.push((0, sha256_1.sha256)(concat.apply(void 0, this.outputs.map(taproot.RawOutput.encode))));
            }
            var spendType = (annex ? 1 : 0) | (leafScript ? 2 : 0);
            out.push(new Uint8Array([spendType]));
            if (inType === SignatureHash.ANYONECANPAY) {
                var inp = this.inputs[idx];
                out.push(TxHashIdx.encode(inp), P.U64LE.encode(amount[idx]), taproot.VarBytes.encode(prevOutScript[idx]), P.U32LE.encode(def.sequence(inp.sequence)));
            }
            else
                out.push(P.U32LE.encode(idx));
            if (spendType & 1)
                out.push((0, sha256_1.sha256)(taproot.VarBytes.encode(annex)));
            if (outType === SignatureHash.SINGLE)
                out.push(idx < this.outputs.length ? (0, sha256_1.sha256)(taproot.RawOutput.encode(this.outputs[idx])) : EMPTY32);
            if (leafScript)
                out.push((0, taproot.tapLeafHash)(leafScript, leafVer), P.U8.encode(0), P.I32LE.encode(codeSeparator));
            return taggedHash.apply(void 0, __spreadArray(['TapSighash'], out, false));
        };
        // Utils for sign/finalize
        // Used pretty often, should be fast
        Transaction.prototype.prevOut = function (input) {
            if (input.nonWitnessUtxo)
                return input.nonWitnessUtxo.outputs[input.index];
            else if (input.witnessUtxo)
                return input.witnessUtxo;
            else
                throw new Error('Cannot find previous output info.');
        };
        Transaction.prototype.inputType = function (input) {
            // TODO: check here if non-segwit tx + no nonWitnessUtxo
            var txType = 'legacy';
            var defaultSighash = SignatureHash.ALL;
            var prevOut = this.prevOut(input);
            var first = taproot.OutScript.decode(prevOut.script);
            var type = first.type;
            var cur = first;
            var stack = [first];
            if (first.type === 'tr') {
                defaultSighash = SignatureHash.DEFAULT;
                return {
                    txType: 'taproot',
                    type: 'tr',
                    last: first,
                    lastScript: prevOut.script,
                    defaultSighash: defaultSighash,
                    sighash: input.sighashType || defaultSighash,
                };
            }
            else {
                if (first.type === 'wpkh' || first.type === 'wsh')
                    txType = 'segwit';
                if (first.type === 'sh') {
                    if (!input.redeemScript)
                        throw new Error('inputType: sh without redeemScript');
                    var child = taproot.OutScript.decode(input.redeemScript);
                    if (child.type === 'wpkh' || child.type === 'wsh')
                        txType = 'segwit';
                    stack.push(child);
                    cur = child;
                    type += "-".concat(child.type);
                }
                // wsh can be inside sh
                if (cur.type === 'wsh') {
                    if (!input.witnessScript)
                        throw new Error('inputType: wsh without witnessScript');
                    var child = taproot.OutScript.decode(input.witnessScript);
                    if (child.type === 'wsh')
                        txType = 'segwit';
                    stack.push(child);
                    cur = child;
                    type += "-".concat(child.type);
                }
                // TODO: check for uncompressed public keys in segwit tx
                var last = stack[stack.length - 1];
                if (last.type === 'sh' || last.type === 'wsh')
                    throw new Error('inputType: sh/wsh cannot be terminal type');
                var lastScript = taproot.OutScript.encode(last);
                var res = {
                    type: type,
                    txType: txType,
                    last: last,
                    lastScript: lastScript,
                    defaultSighash: defaultSighash,
                    sighash: input.sighashType || defaultSighash,
                };
                return res;
            }
        };
        // TODO: signer can be privateKey OR instance of bip32 HD stuff
        Transaction.prototype.signIdx = function (privateKey, idx, allowedSighash, _auxRand) {
            this.checkInputIdx(idx);
            var input = this.inputs[idx];
            var inputType = this.inputType(input);
            // Handle BIP32 HDKey
            if (!(privateKey instanceof Uint8Array)) {
                if (!input.bip32Derivation || !input.bip32Derivation.length)
                    throw new Error('bip32Derivation: empty');
                var signers = input.bip32Derivation
                    .filter(function (i) { return i[1].fingerprint == privateKey.fingerprint; })
                    .map(function (_a) {
                        var pubKey = _a[0], path = _a[1].path;
                        var s = privateKey;
                        for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
                            var i = path_1[_i];
                            s = s.deriveChild(i);
                        }
                        if (!P.equalBytes(s.publicKey, pubKey))
                            throw new Error('bip32Derivation: wrong pubKey');
                        if (!s.privateKey)
                            throw new Error('bip32Derivation: no privateKey');
                        return s;
                    });
                if (!signers.length)
                    throw new Error("bip32Derivation: no items with fingerprint=".concat(privateKey.fingerprint));
                var signed = false;
                for (var _i = 0, signers_1 = signers; _i < signers_1.length; _i++) {

                    var s = signers_1[_i];
                    if (this.signIdx(s.privateKey, idx))
                        signed = true;
                }
                return signed;
            }
            // Sighash checks
            // Just for compat with bitcoinjs-lib, so users won't face unexpected behaviour.
            if (!allowedSighash)
                allowedSighash = [inputType.defaultSighash];
            var sighash = inputType.sighash;
            if (!allowedSighash.includes(sighash)) {
                throw new Error("Input with not allowed sigHash=".concat(sighash, ". Allowed: ").concat(allowedSighash.join(', ')));
            }
            // NOTE: it is possible to sign these inputs for legacy/segwit v0 (but no taproot!),
            // however this was because of bug in bitcoin-core, which remains here because of consensus.
            // If this is absolutely neccessary for you workflow, please open issue. For now it is disable to
            // avoid complicated workflow where SINGLE will block adding new outputs
            var _a = this.inputSighash(idx), sigInputs = _a.sigInputs, sigOutputs = _a.sigOutputs;
            if (sigOutputs === SignatureHash.SINGLE && idx >= this.outputs.length) {
                throw new Error("Input with sighash SINGLE, but there is no output with corresponding index=".concat(idx));
            }
            // Actual signing
            // Taproot
            var prevOut = this.prevOut(input);
            if (inputType.txType === 'taproot') {
                if (input.tapBip32Derivation)
                    throw new Error('tapBip32Derivation unsupported');
                var prevOuts = this.inputs.map(this.prevOut);
                var prevOutScript = prevOuts.map(function (i) { return i.script; });
                var amount = prevOuts.map(function (i) { return i.amount; });
                var signed = false;
                var schnorrPub = secp.schnorr.getPublicKey(privateKey);
                var merkleRoot = input.tapMerkleRoot || P.EMPTY;
                if (input.tapInternalKey) {
                    // internal + tweak = tweaked key
                    // if internal key == current public key, we need to tweak private key,
                    // otherwise sign as is. bitcoinjs implementation always wants tweaked
                    // priv key to be provided
                    var _b = getTaprootKeys(privateKey, schnorrPub, input.tapInternalKey, merkleRoot), pubKey = _b.pubKey, privKey = _b.privKey;
                    var _c = taprootTweakPubkey(input.tapInternalKey, merkleRoot), taprootPubKey = _c[0], parity = _c[1];
                    if (P.equalBytes(taprootPubKey, pubKey)) {
                        var hash = this.preimageWitnessV1(idx, prevOutScript, sighash, amount);
                        var sig = concat(secp.schnorr.signSync(hash, privKey, _auxRand), sighash !== SignatureHash.DEFAULT ? new Uint8Array([sighash]) : P.EMPTY);
                        this.updateInput(idx, { tapKeySig: sig });
                        signed = true;
                    }
                }
                if (input.tapLeafScript) {
                    input.tapScriptSig = input.tapScriptSig || [];
                    var _loop_3 = function (cb, _script) {
                        var script = _script.subarray(0, -1);
                        var scriptDecoded = taproot.Script.decode(script);
                        var ver = _script[_script.length - 1];
                        var hash = (0, taproot.tapLeafHash)(script, ver);
                        var _j = getTaprootKeys(privateKey, schnorrPub, cb.internalKey, P.EMPTY // Because we cannot have nested taproot tree
                        ), pubKey = _j.pubKey, privKey = _j.privKey;
                        var pos = scriptDecoded.findIndex(function (i) { return i instanceof Uint8Array && P.equalBytes(i, pubKey); });
                        // Skip if there is no public key in tapLeafScript
                        if (pos === -1)
                            return "continue";
                        var msg = this_1.preimageWitnessV1(idx, prevOutScript, sighash, amount, undefined, script, ver);
                        var sig = concat(secp.schnorr.signSync(msg, privKey, _auxRand), sighash !== SignatureHash.DEFAULT ? new Uint8Array([sighash]) : P.EMPTY);
                        this_1.updateInput(idx, { tapScriptSig: [[{ pubKey: pubKey, leafHash: hash }, sig]] });
                        signed = true;
                    };
                    var this_1 = this;
                    for (var _d = 0, _e = input.tapLeafScript; _d < _e.length; _d++) {
                        var _f = _e[_d], cb = _f[0], _script = _f[1];
                        _loop_3(cb, _script);
                    }
                }
                if (!signed)
                    throw new Error('No taproot scripts signed');
                return true;
            }
            else {
                // only compressed keys are supported for now
                var pubKey = secp.getPublicKey(privateKey, true);
                // TODO: replace with explicit checks
                // Check if script has public key or its has inside
                var hasPubkey = false;
                var pubKeyHash = hash160(pubKey);
                for (var _g = 0, _h = taproot.Script.decode(inputType.lastScript); _g < _h.length; _g++) {
                    var i = _h[_g];
                    if (i instanceof Uint8Array && (P.equalBytes(i, pubKey) || P.equalBytes(i, pubKeyHash)))
                        hasPubkey = true;
                }
                if (!hasPubkey)
                    throw new Error("Input script doesn't have pubKey: ".concat(inputType.lastScript));
                var hash = void 0;
                if (inputType.txType === 'legacy') {
                    if (!this.opts.allowLegacyWitnessUtxo && !input.nonWitnessUtxo) {
                        throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
                    }
                    hash = this.preimageLegacy(idx, inputType.lastScript, sighash);
                }
                else if (inputType.txType === 'segwit') {
                    var script = inputType.lastScript;
                    // If wpkh OR sh-wpkh, wsh-wpkh is impossible, so looks ok
                    // TODO: re-check
                    if (inputType.last.type === 'wpkh')
                        script = taproot.OutScript.encode({ type: 'pkh', hash: inputType.last.hash });
                    hash = this.preimageWitnessV0(idx, script, sighash, prevOut.amount);
                }
                else
                    throw new Error("Transaction/sign: unknown tx type: ".concat(inputType.txType));
                var sig = signECDSA(hash, privateKey, this.opts.lowR);
                this.updateInput(idx, {
                    partialSig: [[pubKey, concat(sig, new Uint8Array([sighash]))]],
                });
            }
            return true;
        };
        // TODO: this is bad API. Will work if user creates and signs tx, but if
        // there is some complex workflow with exchanging PSBT and signing them,
        // then it is better to validate which output user signs. How could a better API look like?
        // Example: user adds input, sends to another party, then signs received input (mixer etc),
        // another user can add different input for same key and user will sign it.
        // Even worse: another user can add bip32 derivation, and spend money from different address.
        Transaction.prototype.sign = function (privateKey, allowedSighash, _auxRand) {
            //debugger; //ROHIT
            var num = 0;
            for (var i = 0; i < this.inputs.length; i++) {
                try {
                    if (this.signIdx(privateKey, i, allowedSighash, _auxRand))
                        num++;
                }
                catch (e) { }
            }
            if (!num)
                throw new Error('No inputs signed');
            return num;
        };
        Transaction.prototype.finalizeIdx = function (idx) {
            this.checkInputIdx(idx);
            if (this.fee < 0n)
                throw new Error('Outputs spends more than inputs amount');
            var input = this.inputs[idx];
            var inputType = this.inputType(input);
            // Taproot finalize
            if (inputType.txType === 'taproot') {
                if (input.tapKeySig)
                    input.finalScriptWitness = [input.tapKeySig];
                else if (input.tapLeafScript && input.tapScriptSig) {
                    // TODO: this works the same as bitcoinjs lib fork, however it is not secure,
                    // since we add signatures to script which we don't understand.
                    // Maybe it is better to disable it?
                    // Proper way will be to create check for known scripts, however MuSig, p2tr_ns and other
                    // scripts are still not standard; and it will take significant amount of work for them.
                    // Sort leafs by control block length. TODO: maybe need to check script length too?
                    var leafs = input.tapLeafScript.sort(function (a, b) {
                        return taproot.TaprootControlBlock.encode(a[0]).length - taproot.TaprootControlBlock.encode(b[0]).length;
                    });
                    var _loop_4 = function (cb, _script) {
                        // Last byte is version
                        var script = _script.slice(0, -1);
                        var ver = _script[_script.length - 1];
                        var outScript_1 = taproot.OutScript.decode(script);
                        var hash = (0, taproot.tapLeafHash)(script, ver);
                        var scriptSig = input.tapScriptSig.filter(function (i) { return P.equalBytes(i[0].leafHash, hash); });
                        var signatures = [];
                        if (outScript_1.type === 'tr_ms') {
                            var m = outScript_1.m;
                            var pubkeys = outScript_1.pubkeys;
                            var added = 0;
                            var _loop_6 = function (pub) {
                                var sigIdx = scriptSig.findIndex(function (i) { return P.equalBytes(i[0].pubKey, pub); });
                                // Should have exact amount of signatures (more -- will fail)
                                if (added === m || sigIdx === -1) {
                                    signatures.push(P.EMPTY);
                                    return "continue";
                                }
                                signatures.push(scriptSig[sigIdx][1]);
                                added++;
                            };
                            for (var _c = 0, pubkeys_3 = pubkeys; _c < pubkeys_3.length; _c++) {
                                var pub = pubkeys_3[_c];
                                _loop_6(pub);
                            }
                            // Should be exact same as m
                            if (added !== m)
                                return "continue";
                        }
                        else if (outScript_1.type === 'tr_ns') {
                            var _loop_7 = function (pub) {
                                var sigIdx = scriptSig.findIndex(function (i) { return P.equalBytes(i[0].pubKey, pub); });
                                if (sigIdx === -1)
                                    return "continue";
                                signatures.push(scriptSig[sigIdx][1]);
                            };
                            for (var _d = 0, _e = outScript_1.pubkeys; _d < _e.length; _d++) {
                                var pub = _e[_d];
                                _loop_7(pub);
                            }
                            if (signatures.length !== outScript_1.pubkeys.length)
                                return "continue";
                        }
                        else if (outScript_1.type === 'unknown' && this_2.opts.allowUnknowInput) {
                            // Trying our best to sign what we can
                            var scriptDecoded_1 = taproot.Script.decode(script);
                            signatures = scriptSig
                                .map(function (_a) {
                                    var pubKey = _a[0].pubKey, signature = _a[1];
                                    var pos = scriptDecoded_1.findIndex(function (i) { return i instanceof Uint8Array && P.equalBytes(i, pubKey); });
                                    if (pos === -1)
                                        throw new Error('finalize/taproot: cannot find position of pubkey in script');
                                    return { signature: signature, pos: pos };
                                })
                                // Reverse order (because witness is stack and we take last element first from it)
                                .sort(function (a, b) { return a.pos - b.pos; })
                                .map(function (i) { return i.signature; });
                            if (!signatures.length)
                                return "continue";
                        }
                        else
                            throw new Error('Finalize: Unknown tapLeafScript');
                        // Witness is stack, so last element will be used first
                        input.finalScriptWitness = signatures
                            .reverse()
                            .concat([script, taproot.TaprootControlBlock.encode(cb)]);
                        return "break";
                    };
                    var this_2 = this;
                    for (var _i = 0, leafs_1 = leafs; _i < leafs_1.length; _i++) {
                        var _a = leafs_1[_i], cb = _a[0], _script = _a[1];
                        var state_1 = _loop_4(cb, _script);
                        if (state_1 === "break")
                            break;
                    }
                    if (!input.finalScriptWitness)
                        throw new Error('finalize/taproot: empty witness');
                }
                else
                    throw new Error('finalize/taproot: unknown input');
                // Clean input
                for (var k in input)
                    if (!PSBTInputFinalKeys.includes(k))
                        delete input[k];
                return;
            }
            var outScript = inputType.lastScript;
            var isSegwit = inputType.txType === 'segwit';
            if (!input.partialSig || !input.partialSig.length)
                throw new Error('Not enough partial sign');
            // TODO: this is completely broken, fix.
            var inputScript;
            var witness = [];
            // TODO: move input scripts closer to payments/output scripts
            // Multisig
            if (inputType.last.type === 'ms') {
                var m = inputType.last.m;
                var pubkeys = inputType.last.pubkeys;
                var signatures = [];
                var _loop_5 = function (pub) {
                    var sign = input.partialSig.find(function (s) { return P.equalBytes(pub, s[0]); });
                    if (!sign)
                        return "continue";
                    signatures.push(sign[1]);
                };
                // partial: [pubkey, sign]
                for (var _b = 0, pubkeys_2 = pubkeys; _b < pubkeys_2.length; _b++) {
                    var pub = pubkeys_2[_b];
                    _loop_5(pub);
                }
                signatures = signatures.slice(0, m);
                if (signatures.length !== m) {
                    throw new Error("Multisig: wrong signatures count, m=".concat(m, " n=").concat(pubkeys.length, " signatures=").concat(signatures.length));
                }
                inputScript = taproot.Script.encode(__spreadArray(['OP_0'], signatures, true));
            }
            else if (inputType.last.type === 'pk') {
                inputScript = taproot.Script.encode([input.partialSig[0][1]]);
            }
            else if (inputType.last.type === 'pkh') {
                // check if output is correct here
                inputScript = taproot.Script.encode([input.partialSig[0][1], input.partialSig[0][0]]);
            }
            else if (inputType.last.type === 'wpkh') {
                // check if output is correct here
                inputScript = P.EMPTY;
                witness = [input.partialSig[0][1], input.partialSig[0][0]];
            }
            else if (inputType.last.type === 'unknown' && !this.opts.allowUnknowInput)
                throw new Error('Unknown inputs not allowed');
            var finalScriptSig, finalScriptWitness;
            if (input.witnessScript) {
                // P2WSH
                if (inputScript && inputScript.length > 0 && outScript && outScript.length > 0) {
                    witness = taproot.Script.decode(inputScript).map(function (i) {
                        if (i === 'OP_0')
                            return P.EMPTY;
                        if (i instanceof Uint8Array)
                            return i;
                        throw new Error("Wrong witness op=".concat(i));
                    });
                }
                if (witness && outScript)
                    witness = witness.concat(outScript);
                outScript = taproot.Script.encode(['OP_0', (0, sha256_1.sha256)(outScript)]);
                inputScript = P.EMPTY;
            }
            if (isSegwit)
                finalScriptWitness = witness;
            if (input.redeemScript) {
                // P2SH
                finalScriptSig = taproot.Script.encode(__spreadArray(__spreadArray([], taproot.Script.decode(inputScript), true), [outScript], false));
            }
            else if (!isSegwit)
                finalScriptSig = inputScript;
            if (!finalScriptSig && !finalScriptWitness)
                throw new Error('Unknown error finalizing input');
            if (finalScriptSig)
                input.finalScriptSig = finalScriptSig;
            if (finalScriptWitness)
                input.finalScriptWitness = finalScriptWitness;
            // Clean input
            for (var k in input)
                if (!PSBTInputFinalKeys.includes(k))
                    delete input[k];
        };
        Transaction.prototype.finalize = function () {
            for (var i = 0; i < this.inputs.length; i++)
                this.finalizeIdx(i);
        };
        Transaction.prototype.extract = function () {
            if (!this.isFinal)
                throw new Error('Transaction has unfinalized inputs');
            if (!this.outputs.length)
                throw new Error('Transaction has no outputs');
            // TODO: Check if inputs.amount >= outputs.amount
            return this.toBytes(true, true);
        };
        Transaction.prototype.combine = function (other) {
            for (var _i = 0, _a = ['PSBTVersion', 'version', 'lockTime']; _i < _a.length; _i++) {
                var k = _a[_i];
                if (this[k] !== other[k])
                    throw new Error("Transaction/combine: different ".concat(k, " this=").concat(this[k], " other=").concat(other[k]));
            }
            for (var _b = 0, _c = ['inputs', 'outputs']; _b < _c.length; _b++) {
                var k = _c[_b];
                if (this[k].length !== other[k].length) {
                    throw new Error("Transaction/combine: different ".concat(k, " length this=").concat(this[k].length, " other=").concat(other[k].length));
                }
            }
            var thisUnsigned = this.global.unsignedTx ? taproot.RawTx.encode(this.global.unsignedTx) : P.EMPTY;
            var otherUnsigned = other.global.unsignedTx ? taproot.RawTx.encode(other.global.unsignedTx) : P.EMPTY;
            if (!P.equalBytes(thisUnsigned, otherUnsigned))
                throw new Error("Transaction/combine: different unsigned tx");
            this.global = mergeKeyMap(PSBTGlobal, this.global, other.global);
            for (var i = 0; i < this.inputs.length; i++)
                this.updateInput(i, other.inputs[i]);
            for (var i = 0; i < this.outputs.length; i++)
                this.updateOutput(i, other.outputs[i]);
            return this;
        };
        return Transaction;
    }());
    taproot.Transaction = Transaction;
    // User facing API?
    // Simple pubkey address, without complex scripts
    function getAddress(type, privKey, network) {
        if (network === void 0) { network = taproot.NETWORK; }
        if (type === 'tr') {
            return p2tr(secp.schnorr.getPublicKey(privKey), undefined, network).address;
        }
        var pubKey = secp.getPublicKey(privKey, true);
        if (type === 'pkh')
            return (0, taproot.p2pkh)(pubKey, network).address;
        if (type === 'wpkh')
            return (0, taproot.p2wpkh)(pubKey, network).address;
        throw new Error("getAddress: unknown type=".concat(type));
    }
    taproot.getAddress = getAddress;
    // TODO: rewrite
    function multisig(m, pubkeys, sorted, witness) {
        if (sorted === void 0) { sorted = false; }
        if (witness === void 0) { witness = false; }
        var ms = (0, taproot.p2ms)(m, sorted ? (0, taproot._sortPubkeys)(pubkeys) : pubkeys);
        return witness ? (0, taproot.p2wsh)(ms) : (0, taproot.p2sh)(ms);
    }
    taproot.multisig = multisig;
    function sortedMultisig(m, pubkeys, witness) {
        if (witness === void 0) { witness = false; }
        return multisig(m, pubkeys, true, witness);
    }
    taproot.sortedMultisig = sortedMultisig;
    // Copy-pase from bip32 derive, maybe do something like 'bip32.parsePath'?
    var HARDENED_OFFSET = 0x80000000;
    function bip32Path(path) {
        var out = [];
        if (!/^[mM]'?/.test(path))
            throw new Error('Path must start with "m" or "M"');
        if (/^[mM]'?$/.test(path))
            return out;
        var parts = path.replace(/^[mM]'?\//, '').split('/');
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var c = parts_1[_i];
            var m = /^(\d+)('?)$/.exec(c);
            if (!m || m.length !== 3)
                throw new Error("Invalid child index: ".concat(c));
            var idx = +m[1];
            if (!Number.isSafeInteger(idx) || idx >= HARDENED_OFFSET)
                throw new Error('Invalid index');
            // hardened key
            if (m[2] === "'")
                idx += HARDENED_OFFSET;
            out.push(idx);
        }
        return out;
    }
    taproot.bip32Path = bip32Path;
    function PSBTCombine(psbts) {
        if (!psbts || !Array.isArray(psbts) || !psbts.length)
            throw new Error('PSBTCombine: wrong PSBT list');
        var tx = Transaction.fromPSBT(psbts[0]);
        for (var i = 1; i < psbts.length; i++)
            tx.combine(Transaction.fromPSBT(psbts[i]));
        return tx.toPSBT();
    }
    taproot.PSBTCombine = PSBTCombine;
    function numberToScriptArray(number) {

        array = coinjs.numToBytes(number);
        let lastIndex = array.length - 1;
        while (lastIndex >= 0 && array[lastIndex] === 0) {
            lastIndex--;
        }
        array.splice(lastIndex + 1);
        return array;
    }
    taproot.numberToScriptArray = numberToScriptArray;
})();

//Inserting these two lines so that Paul Miller Github tests can work.
var hex = base.hex;
var btc = taproot;
var Transaction = taproot.Transaction;
var secp256k1_schnorr = secp.schnorr;
var secp256k1 = secp;
var schnorr = secp.schnorr;

//ChatGPT replaced code for deeStrictEqual and should
function deepStrictEqual(actual, expected) {
    if (typeof actual !== 'object' || typeof expected !== 'object') {
        const result = actual === expected;
        console.log(`deepStrictEqual: ${result ? 'Success' : 'Failure'} - Actual: ${actual}, Expected: ${expected}`);
        return result;
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    if (actualKeys.length !== expectedKeys.length) {
        console.log(`deepStrictEqual: Failure - Different number of keys`);
        return false;
    }

    for (const key of actualKeys) {
        if (!deepStrictEqual(actual[key], expected[key])) {
            console.log(`deepStrictEqual: Failure - Property '${key}' mismatch`);
            return false;
        }
    }

    console.log(`deepStrictEqual: Success`);
    return true;
}

// Test suite function (replaced with should)
function should(suiteDescription, tests) {
    console.log(`Running test suite: ${suiteDescription}`);
    tests();
}


// Test runner function
function test(testDescription, testFunction) {
    try {
        testFunction();
    } catch (error) {
        logResult(false, `${testDescription} - ${error}`);
    }
}

// Log test result
function logResult(result, message) {
    if (result) {
        console.log(`YESSS ${message}`);
    } else {
        console.error(`NO!!! ${message}`);
    }
}

function throws(func) {
    try {
        func();
        console.log(`throws: Failure - No exception was thrown`);
        return false;
    } catch (error) {
        console.log(`throws: Success - Exception was thrown: ${error}`);
        return true;
    }
}

// End of ChatGPT test functions

function demonstrateNestedArray(nestedArray) {

    console.log("Original nestedArray:");
    console.log(nestedArray);

    console.log("\nAccessing elements:");


    console.log("\nIterating through nestedArray:");
    for (var i = 0; i < nestedArray.length; i++) {
        if (Array.isArray(nestedArray[i])) {
            console.log("Element at index", i, "is an array:", nestedArray[i]);
            for (var j = 0; j < nestedArray[i].length; j++) {
                console.log("  Element at index", j, ":", nestedArray[i][j]);
            }
        } else {
            console.log("Element at index", i, ":", nestedArray[i]);
        }
    }
}

//START OF BIP32 SECTION
/*! scure-bip32 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
var bip32 = {};
(function () {
    var HDKey = /** @class */ (function () {

        var hmac = hashmini.hmac;
        var ripemd160 = hashmini.ripemd160;
        var sha256 = hashmini.sha256;
        var sha512 = hashmini.sha512;
        //var _assert_1 = require("@noble/hashes/_assert");
        var utils_1 = hashmini.utils;
        var modular_1 = secp.utils;
        //var base_1 = base;
        var Point = secp.Point;
        var base58check = (0, base.base58check)(sha256);

        function _assert_1(condition, message = "Assertion failed") {
            if (!condition) {
                throw new Error(message);
            }
        }

        function _assert_1(value, length, message = "Value is not a Uint8Array or does not have the expected length") {
            if (!(value instanceof Uint8Array)) {
                throw new Error(message);
            }
        }

        const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

        var __assign = (this && this.__assign) || function () {
            return Object.assign.apply(Object, arguments);
        };


        function utf8ToBytes(str) {
            if (typeof str !== 'string') {
                throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
            }
            return new TextEncoder().encode(str);
        }


        function bytesToNumber(bytes) {
            return BigInt("0x".concat((0, utils_1.bytesToHex)(bytes)));
        }
        function numberToBytes(num) {
            return (0, utils_1.hexToBytes)(num.toString(16).padStart(64, '0'));
        }
        var MASTER_SECRET = (0, utf8ToBytes)('Bitcoin seed');
        // Bitcoin hardcoded by default
        var BITCOIN_VERSIONS = { private: 0x0488ade4, public: 0x0488b21e };
        var HARDENED_OFFSET = 0x80000000;
        var hash160 = function (data) { return (0, ripemd160)((0, sha256)(data)); };
        var fromU32 = function (data) { return (0, createView)(data).getUint32(0, false); };
        var toU32 = function (n) {
            if (!Number.isSafeInteger(n) || n < 0 || n > Math.pow(2, 32) - 1) {
                throw new Error("Invalid number=".concat(n, ". Should be from 0 to 2 ** 32 - 1"));
            }
            var buf = new Uint8Array(4);
            (0, createView)(buf).setUint32(0, n, false);
            return buf;
        };

        function HDKey(opt) {
            this.depth = 0;
            this.index = 0;
            this.chainCode = null;
            this.parentFingerprint = 0;
            if (!opt || typeof opt !== 'object') {
                throw new Error('HDKey.constructor must not be called directly');
            }
            this.versions = opt.versions || BITCOIN_VERSIONS;
            this.depth = opt.depth || 0;
            this.chainCode = opt.chainCode;
            this.index = opt.index || 0;
            this.parentFingerprint = opt.parentFingerprint || 0;
            if (!this.depth) {
                if (this.parentFingerprint || this.index) {
                    throw new Error('HDKey: zero depth with non-zero index/parent fingerprint');
                }
            }
            if (opt.publicKey && opt.privateKey) {
                throw new Error('HDKey: publicKey and privateKey at same time.');
            }
            if (opt.privateKey) {
                if (!secp.utils.isValidPrivateKey(opt.privateKey)) {
                    throw new Error('Invalid private key');
                }
                this.privKey =
                    typeof opt.privateKey === 'bigint' ? opt.privateKey : bytesToNumber(opt.privateKey);
                this.privKeyBytes = numberToBytes(this.privKey);
                this.pubKey = secp.getPublicKey(opt.privateKey, true);
            }
            else if (opt.publicKey) {
                this.pubKey = Point.fromHex(opt.publicKey).toRawBytes(true); // force compressed point
            }
            else {
                throw new Error('HDKey: no public or private key provided');
            }
            this.pubHash = hash160(this.pubKey);
        }
        Object.defineProperty(HDKey.prototype, "fingerprint", {
            get: function () {
                if (!this.pubHash) {
                    throw new Error('No publicKey set!');
                }
                return fromU32(this.pubHash);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "identifier", {
            get: function () {
                return this.pubHash;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "pubKeyHash", {
            get: function () {
                return this.pubHash;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "privateKey", {
            get: function () {
                return this.privKeyBytes || null;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "publicKey", {
            get: function () {
                return this.pubKey || null;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "privateExtendedKey", {
            get: function () {
                var priv = this.privateKey;
                if (!priv) {
                    throw new Error('No private key');
                }
                return base58check.encode(this.serialize(this.versions.private, (0, utils_1.concatBytes)(new Uint8Array([0]), priv)));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(HDKey.prototype, "publicExtendedKey", {
            get: function () {
                if (!this.pubKey) {
                    throw new Error('No public key');
                }
                return base58check.encode(this.serialize(this.versions.public, this.pubKey));
            },
            enumerable: false,
            configurable: true
        });
        HDKey.fromMasterSeed = function (seed, versions) {
            if (versions === void 0) { versions = BITCOIN_VERSIONS; }
            (0, _assert_1)(seed);
            if (8 * seed.length < 128 || 8 * seed.length > 512) {
                throw new Error("HDKey: wrong seed length=".concat(seed.length, ". Should be between 128 and 512 bits; 256 bits is advised)"));
            }
            var I = (0, hmac)(sha512, MASTER_SECRET, seed);
            return new HDKey({
                versions: versions,
                chainCode: I.slice(32),
                privateKey: I.slice(0, 32),
            });
        };
        HDKey.fromExtendedKey = function (base58key, versions) {
            if (versions === void 0) { versions = BITCOIN_VERSIONS; }
            // => version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
            var keyBuffer = base58check.decode(base58key);
            var keyView = (0, createView)(keyBuffer);
            var version = keyView.getUint32(0, false);
            var opt = {
                versions: versions,
                depth: keyBuffer[4],
                parentFingerprint: keyView.getUint32(5, false),
                index: keyView.getUint32(9, false),
                chainCode: keyBuffer.slice(13, 45),
            };
            var key = keyBuffer.slice(45);
            var isPriv = key[0] === 0;
            if (version !== versions[isPriv ? 'private' : 'public']) {
                throw new Error('Version mismatch');
            }
            if (isPriv) {
                return new HDKey(__assign(__assign({}, opt), { privateKey: key.slice(1) }));
            }
            else {
                return new HDKey(__assign(__assign({}, opt), { publicKey: key }));
            }
        };
        HDKey.fromJSON = function (json) {
            return HDKey.fromExtendedKey(json.xpriv);
        };
        HDKey.prototype.derive = function (path) {
            if (!/^[mM]'?/.test(path)) {
                throw new Error('Path must start with "m" or "M"');
            }
            if (/^[mM]'?$/.test(path)) {
                return this;
            }
            var parts = path.replace(/^[mM]'?\//, '').split('/');
            // tslint:disable-next-line
            var child = this;
            for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                var c = parts_1[_i];
                var m = /^(\d+)('?)$/.exec(c);
                var m1 = m && m[1];
                if (!m || m.length !== 3 || typeof m1 !== 'string') {
                    throw new Error("Invalid child index: ".concat(c));
                }
                var idx = +m1;
                if (!Number.isSafeInteger(idx) || idx >= HARDENED_OFFSET) {
                    throw new Error('Invalid index');
                }
                // hardened key
                if (m[2] === "'") {
                    idx += HARDENED_OFFSET;
                }
                child = child.deriveChild(idx);
            }
            return child;
        };
        HDKey.prototype.deriveChild = function (index) {
            if (!this.pubKey || !this.chainCode) {
                throw new Error('No publicKey or chainCode set');
            }
            var data = toU32(index);
            if (index >= HARDENED_OFFSET) {
                // Hardened
                var priv = this.privateKey;
                if (!priv) {
                    throw new Error('Could not derive hardened child key');
                }
                // Hardened child: 0x00 || ser256(kpar) || ser32(index)
                data = (0, utils_1.concatBytes)(new Uint8Array([0]), priv, data);
            }
            else {
                // Normal child: serP(point(kpar)) || ser32(index)
                data = (0, utils_1.concatBytes)(this.pubKey, data);
            }
            var I = (0, hmac)(sha512, this.chainCode, data);
            var childTweak = bytesToNumber(I.slice(0, 32));
            var chainCode = I.slice(32);
            if (!secp.utils.isValidPrivateKey(childTweak)) {
                throw new Error('Tweak bigger than curve order');
            }
            var opt = {
                versions: this.versions,
                chainCode: chainCode,
                depth: this.depth + 1,
                parentFingerprint: this.fingerprint,
                index: index,
            };
            try {
                // Private parent key -> private child key
                if (this.privateKey) {
                    var added = (0, modular_1.mod)(this.privKey + childTweak, secp.CURVE.n);
                    if (!secp.utils.isValidPrivateKey(added)) {
                        throw new Error('The tweak was out of range or the resulted private key is invalid');
                    }
                    opt.privateKey = added;
                }
                else {
                    var added = Point.fromHex(this.pubKey).add(Point.fromPrivateKey(childTweak));
                    // Cryptographically impossible: hmac-sha512 preimage would need to be found
                    if (added.equals(Point.ZERO)) {
                        throw new Error('The tweak was equal to negative P, which made the result key invalid');
                    }
                    opt.publicKey = added.toRawBytes(true);
                }
                return new HDKey(opt);
            }
            catch (err) {
                return this.deriveChild(index + 1);
            }
        };
        HDKey.prototype.sign = function (hash) {
            if (!this.privateKey) {
                throw new Error('No privateKey set!');
            }
            (0, _assert_1)(hash, 32);
            return secp.sign(hash, this.privKey).toCompactRawBytes();
        };
        HDKey.prototype.verify = function (hash, signature) {
            (0, _assert_1)(hash, 32);
            (0, _assert_1)(signature, 64);
            if (!this.publicKey) {
                throw new Error('No publicKey set!');
            }
            var sig;
            try {
                sig = secp.Signature.fromCompact(signature);
            }
            catch (error) {
                return false;
            }
            return secp.verify(sig, hash, this.publicKey);
        };
        HDKey.prototype.wipePrivateData = function () {
            this.privKey = undefined;
            if (this.privKeyBytes) {
                this.privKeyBytes.fill(0);
                this.privKeyBytes = undefined;
            }
            return this;
        };
        HDKey.prototype.toJSON = function () {
            return {
                xpriv: this.privateExtendedKey,
                xpub: this.publicExtendedKey,
            };
        };
        HDKey.prototype.serialize = function (version, key) {
            if (!this.chainCode) {
                throw new Error('No chainCode set');
            }
            (0, _assert_1)(key, 33);
            // version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
            return (0, utils_1.concatBytes)(toU32(version), new Uint8Array([this.depth]), toU32(this.parentFingerprint), toU32(this.index), this.chainCode, key);
        };
        return HDKey;
    }());
    bip32.HDKey = HDKey
})();
var HDKey = bip32.HDKey;

