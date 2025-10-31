(function (root) {
  /**********************************************************
   *
   * BitView
   *
   * BitView provides a similar interface to the standard
   * DataView, but with support for bit-level reads / writes.
   *
   **********************************************************/
  class BitView {
    #view;
    #bigEndian;

    static #scratchBuffer = new ArrayBuffer(8);
    static #scratchU32 = new Uint32Array(BitView.#scratchBuffer);
    static #scratchF32 = new Float32Array(BitView.#scratchBuffer);
    static #scratchF64 = new Float64Array(BitView.#scratchBuffer);

    static #bswap32 (x) {
      return (((x & 0xff000000) >>> 24) |
              ((x & 0x00ff0000) >>> 8) |
              ((x & 0x0000ff00) << 8) |
              ((x & 0x000000ff) << 24)) >>> 0;
    }

    constructor (source, byteOffset, byteLength) {
      if (typeof Buffer !== 'undefined' && source instanceof Buffer) {
        this.#view = new Uint8Array(source.buffer, source.byteOffset, source.length);
      } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        this.#view = new Uint8Array(source, source.byteOffset, source.byteLength);
      } else {
        throw new Error('Must specify a valueid ArrayBuffer or Buffer.');
      }

      this.#bigEndian = false;
    }

    get buffer () {
      return typeof Buffer !== 'undefined' ? Buffer.from(this.#view.buffer) : this.#view.buffer;
    }

    get length () {
      return this.#view.length * 8;
    }

    get bigEndian () {
      return this.#bigEndian;
    }

    set bigEndian (x) {
      this.#bigEndian = x;
    }

    getBits (offset, n, signed) {
      const available = this.length - offset;

      if (n > available) {
        throw new Error(`Cannot get ${n} bit(s) from offset ${offset}, ${available} available`);
      }

      const bitsMask = 0xffffffff >>> (32 - n);
      const signMask = (bitsMask + 1) >>> 1;
      const partialWord = n !== 32;
      const skip = offset & 7;
      let value = 0;

      // byte align
      offset >>>= 3;
      n += skip;

      for (let i = 0; i < n; i += 8) {
        value |= this.#view[offset++] << i;
      }

      if (this.#bigEndian) {
        value = BitView.#bswap32(value);

        // shift the swapped value back into place
        value >>>= 32 - n;
      } else {
        // shift off extra bits read in the first iteration
        value >>>= skip;
      }

      // mask off extra bits read in the last iteration
      value &= bitsMask;

      if (signed) {
        if (partialWord && (value & signMask)) {
          value |= -1 ^ bitsMask;
        }
      } else {
        value >>>= 0;
      }

      return value;
    }

    setBits (offset, value, n) {
      const available = this.length - offset;

      if (n > available) {
        throw new Error(`Cannot set ${n} bit(s) from offset ${offset}, ${available} available`);
      }

      const bitsMask = 0xffffffff >>> (32 - n);
      const keep = offset & 7;
      let old = 0;

      // byte align
      offset >>>= 3;
      n += keep;

      for (let i = 0, j = offset; i < n; i += 8, j++) {
        old |= this.#view[j] << i;
      }

      if (this.#bigEndian) {
        old = BitView.#bswap32(old);

        value = (old & ~(bitsMask << 32 - n)) | (value << 32 - n);

        value = BitView.#bswap32(value);
      } else {
        value = (old & ~(bitsMask << keep)) | (value << keep);
      }

      for (let i = 0, j = offset; i < n; i += 8, j++) {
        this.#view[j] = value >>> i;
      }
    }

    getBoolean (offset) {
      return this.getBits(offset, 1, false) !== 0;
    }

    getInt8 (offset) {
      return this.getBits(offset, 8, true);
    }

    getUint8 (offset) {
      return this.getBits(offset, 8, false);
    }

    getInt16 (offset) {
      return this.getBits(offset, 16, true);
    }

    getUint16 (offset) {
      return this.getBits(offset, 16, false);
    }

    getInt32 (offset) {
      return this.getBits(offset, 32, true);
    }

    getUint32 (offset) {
      return this.getBits(offset, 32, false);
    }

    getFloat32 (offset) {
      BitView.#scratchU32[0] = this.getUint32(offset);
      return BitView.#scratchF32[0];
    }

    getFloat64 (offset) {
      const lowWord = this.#bigEndian ? 1 : 0;
      BitView.#scratchU32[lowWord] = this.getUint32(offset);
      BitView.#scratchU32[lowWord ^ 1] = this.getUint32(offset + 32);
      return BitView.#scratchF64[0];
    }

    setBoolean (offset, value) {
      this.setBits(offset, value ? 1 : 0, 1);
    }

    setInt8 (offset, value) {
      this.setBits(offset, value, 8);
    }

    setUint8 (offset, value) {
      this.setInt8(offset, value);
    }

    setInt16 (offset, value) {
      this.setBits(offset, value, 16);
    }

    setUint16 (offset, value) {
      this.setInt16(offset, value);
    }

    setInt32 (offset, value) {
      this.setBits(offset, value, 32);
    }

    setUint32 (offset, value) {
      this.setInt32(offset, value);
    }

    setFloat32 (offset, value) {
      BitView.#scratchF32[0] = value;
      this.setBits(offset, BitView.#scratchU32[0], 32);
    }

    setFloat64 (offset, value) {
      const lowWord = this.#bigEndian ? 1 : 0;
      BitView.#scratchF64[0] = value;
      this.setBits(offset, BitView.#scratchU32[lowWord], 32);
      this.setBits(offset + 32, BitView.#scratchU32[lowWord ^ 1], 32);
    }
  }

  /**********************************************************
   *
   * BitStream
   *
   * Small wrapper for a BitView to maintain your position,
   * as well as to handle reading / writing of string data
   * to the underlying buffer.
   *
   **********************************************************/
  class BitStream {
    #view;
    #index;

    constructor (source, byteOffset, byteLength) {
      if (source instanceof BitView) {
        this.#view = source;
      } else if (typeof Buffer !== 'undefined' && source instanceof Buffer) {
        this.#view = new BitView(source, byteOffset, byteLength);
      } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        this.#view = new BitView(source, byteOffset, byteLength);
      } else {
        throw new Error('Must specify a valueid BitView, ArrayBuffer or Buffer.');
      }

      this.#index = 0;
    }

    static #reader (name, size) {
      return function () {
        if (this.#index + size > this.view.length) {
          throw new Error('Trying to read past the end of the stream');
        }
        const value = this.#view[name](this.#index);
        this.#index += size;
        return value;
      };
    }

    static #writer (name, size) {
      return function (value) {
        this.#view[name](this.#index, value);
        this.#index += size;
      };
    }

    get view () {
      return this.#view;
    }

    get buffer () {
      return this.#view.buffer;
    }

    get length () {
      return this.#view.length;
    }

    get remaining () {
      return this.#view.length - this.#index;
    }

    get index () {
      return this.#index;
    }

    set index (x) {
      this.#index = x;
    }

    get bigEndian () {
      return this.#view.bigEndian;
    }

    set bigEndian (x) {
      this.#view.bigEndian = x;
    }

    readBits (n, signed) {
      const value = this.#view.getBits(this.#index, n, signed);
      this.#index += n;
      return value;
    }

    writeBits (value, n) {
      this.#view.setBits(this.#index, value, n);
      this.#index += n;
    }

    skipBits (n) {
      if (this.#index + n > this.view.length) {
        throw new Error('Trying to skip past the end of the stream');
      }

      this.#index += n;
    }

    readBoolean = BitStream.#reader('getBoolean', 1);
    readInt8 = BitStream.#reader('getInt8', 8);
    readUint8 = BitStream.#reader('getUint8', 8);
    readInt16 = BitStream.#reader('getInt16', 16);
    readUint16 = BitStream.#reader('getUint16', 16);
    readInt32 = BitStream.#reader('getInt32', 32);
    readUint32 = BitStream.#reader('getUint32', 32);
    readFloat32 = BitStream.#reader('getFloat32', 32);
    readFloat64 = BitStream.#reader('getFloat64', 64);

    writeBoolean = BitStream.#writer('setBoolean', 1);
    writeInt8 = BitStream.#writer('setInt8', 8);
    writeUint8 = BitStream.#writer('setUint8', 8);
    writeInt16 = BitStream.#writer('setInt16', 16);
    writeUint16 = BitStream.#writer('setUint16', 16);
    writeInt32 = BitStream.#writer('setInt32', 32);
    writeUint32 = BitStream.#writer('setUint32', 32);
    writeFloat32 = BitStream.#writer('setFloat32', 32);
    writeFloat64 = BitStream.#writer('setFloat64', 64);

    #readString (size, encoding) {
      const chars = [];
      let i = 0;

      if (size === undefined) {
        size = Number.MAX_SAFE_INTEGER;
      }

      while (i < size) {
        const c = this.readUint8();

        i++;

        if (!c) {
          break;
        }

        chars.push(c);
      }

      if (size !== Number.MAX_SAFE_INTEGER) {
        this.skipBits((size - i) << 3);
      }

      return new TextDecoder(encoding).decode(new Uint8Array(chars));
    }

    readASCIIString (length) {
      return this.#readString(length, 'ascii');
    }

    readUTF8String (length) {
      return this.#readString(length, 'utf-8');
    }

    writeASCIIString (value, length) {
      length = length || value.length + 1; // + 1 for NULL

      for (let i = 0; i < length; i++) {
        this.writeUint8(i < value.length ? value.charCodeAt(i) : 0x00);
      }
    }

    writeUTF8String (value, length) {
      const buffer = new TextEncoder().encode(value);

      length = length || buffer.length + 1; // + 1 for NULL

      for (let i = 0; i < length; i++) {
        this.writeUint8(i < buffer.length ? buffer[i] : 0x00);
      }
    }

    readBytes (size) {
      const buffer = new Uint8Array(size);

      for (let i = 0; i < size; i++) {
        buffer[i] = this.readUint8();
      }

      return buffer;
    }

    writeBytes (buffer, size) {
      size = size || buffer.byteLength;

      for (let i = 0; i < size; i++) {
        this.writeUint8(buffer[i]);
      }
    }
  }

  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define(function () {
      return {
        BitView,
        BitStream
      };
    });
  }
  // Node.js
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      BitView,
      BitStream
    };
  }
}(this));
