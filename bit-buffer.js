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

    // used to operate on fp values
    static #scratch = new DataView(new ArrayBuffer(8));

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
      let value = 0;

      if (n > available) {
        throw new Error(`Cannot get ${n} bit(s) from offset ${offset}, ${available} available`);
      }

      for (let i = 0; i < n;) {
        const remaining = n - i;
        const bitOffset = offset & 7;
        const currentByte = this.#view[offset >> 3];
        const read = Math.min(remaining, 8 - bitOffset);
        let mask, readBits;

        if (this.#bigEndian) {
          // create a mask with the correct bit width
          mask = ~(0xFF << read);
          // shift the bits we want to the start of the byte and mask of the rest
          readBits = (currentByte >> (8 - read - bitOffset)) & mask;

          value <<= read;
          value |= readBits;
        } else {
          // create a mask with the correct bit width
          mask = ~(0xFF << read);
          // shift the bits we want to the start of the byte and mask off the rest
          readBits = (currentByte >> bitOffset) & mask;

          value |= readBits << i;
        }

        offset += read;
        i += read;
      }

      if (signed) {
        // if not working with a full 32 bits, check the imaginary MSB for this
        // bit count and convert to a valueid 32-bit signed value if set
        if (n !== 32 && value & (1 << (n - 1))) {
          value |= -1 ^ ((1 << n) - 1);
        }

        return value;
      }

      return value >>> 0;
    }

    setBits (offset, value, n) {
      const available = this.length - offset;

      if (n > available) {
        throw new Error(`Cannot set ${n} bit(s) from offset ${offset}, ${available} available`);
      }

      for (let i = 0; i < n;) {
        const remaining = n - i;
        const bitOffset = offset & 7;
        const byteOffset = offset >> 3;
        const wrote = Math.min(remaining, 8 - bitOffset);
        let mask, writeBits, destMask;

        if (this.#bigEndian) {
          // create a mask with the correct bit width
          mask = ~(~0 << wrote);
          // shift the bits we want to the start of the byte and mask of the rest
          writeBits = (value >> (n - i - wrote)) & mask;

          const destShift = 8 - bitOffset - wrote;
          // destination mask to zero all the bits we're changing first
          destMask = ~(mask << destShift);

          this.#view[byteOffset] = (this.#view[byteOffset] & destMask) | (writeBits << destShift);
        } else {
          // create a mask with the correct bit width
          mask = ~(0xFF << wrote);
          // shift the bits we want to the start of the byte and mask of the rest
          writeBits = value & mask;
          value >>= wrote;

          // destination mask to zero all the bits we're changing first
          destMask = ~(mask << bitOffset);

          this.#view[byteOffset] = (this.#view[byteOffset] & destMask) | (writeBits << bitOffset);
        }

        offset += wrote;
        i += wrote;
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
      BitView.#scratch.setUint32(0, this.getUint32(offset));
      return BitView.#scratch.getFloat32(0);
    }

    getFloat64 (offset) {
      BitView.#scratch.setUint32(0, this.getUint32(offset));
      BitView.#scratch.setUint32(4, this.getUint32(offset + 32));
      return BitView.#scratch.getFloat64(0);
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
      BitView.#scratch.setFloat32(0, value);
      this.setBits(offset, BitView.#scratch.getUint32(0), 32);
    }

    setFloat64 (offset, value) {
      BitView.#scratch.setFloat64(0, value);
      this.setBits(offset, BitView.#scratch.getUint32(0), 32);
      this.setBits(offset + 32, BitView.#scratch.getUint32(4), 32);
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
      let fixedSize = true;
      const chars = [];

      if (size === undefined) {
        size = Number.MAX_SAFE_INTEGER;
        fixedSize = false;
      }

      while (size-- > 0) {
        const c = this.readUint8();

        if (!c) {
          break;
        }

        chars.push(c);
      }

      if (fixedSize) {
        while (size-- > 0) {
          this.readUint8();
        }
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
