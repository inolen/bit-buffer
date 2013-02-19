BitBuffer
==========

BitBuffer is a wrapper for ArrayBuffers, similar to JavaScript's [DataView](https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays/DataView), but with support for bit-level reads and writes.

### Attributes

```javascript
bb.length  // Length in bits of underlying array buffer.
```

```javascript
bb.available  // Number of available bits.
```

```javascript
bb.offset  // Get current offset in bits.
bb.offset = 0;  // Set current offset in bits.
```

```javascript
bb.byteOffset  // Get current offset in bytes.
bb.byteOffset = 0;  // Set current offset in bytes.
```

### Methods

#### BitBuffer(buffer)

Default constructor, takes in a single argument of an ArrayBuffer.

### readBits(bits, signed)

Reads `bits` number of bits, updating the current offset in our view, and twiddling the bits appropriately to return a proper 32-bit signed or unsigned value. NOTE: While JavaScript numbers are 64-bit floating-point values, we don't bother with anything other than the first 32 bits.

### readInt8, readUint8, readInt16, readUint16, readInt32, readUint32

Shortcuts for readBits, setting the correct `bits` / `signed` values.

### readFloat32

Reads 32 bits from the buffer, and coerces and returns as a proper float32 value.

### writeBits(value, bits)

Writes `bits` number of bits to the buffer, updating the current offset in our view.

### writeInt8, writeUint8, writeInt16, writeUint16, writeInt32, writeUint32

Shortcuts for writeBits, setting the correct `bits` count.

### writeFloat32

Coerces a float32 to uint32 and writes to the buffer.

### readASCIIString(bytes)

Reads an ASCII string from the buffer, returning up to the trailing NULL character. NOTE: `bytes` is an optional parameter, if specified the offset to the buffer will always be increased by `bytes` count.

### writeASCIIString(string, bytes)

Writes a string followed by a NULL character to the buffer. NOTE: `bytes` is again optional, if specified the string will be truncated if its length is longer than `bytes`, or padded with NULL characters if shorter.