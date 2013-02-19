BitBuffer
==========

BitBuffer provides two objects, `BitView` and `BitStream`. `BitView` is a wrapper for ArrayBuffers, similar to JavaScript's [DataView](https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays/DataView), but with support for bit-level reads and writes. `BitStream` is a wrapper for a `BitView` used to help maintain your current buffer position, as well as to provide higher-level read / write operations such as for ASCII strings.


## BitView

### Attributes

```javascript
bb.buffer  // Underlying ArrayBuffer.
```

### Methods

#### BitView(buffer)

Default constructor, takes in a single argument of an ArrayBuffer.

### getBits(offset, bits, signed)

Reads `bits` number of bits starting at `offset`, twiddling the bits appropriately to return a proper 32-bit signed or unsigned value. NOTE: While JavaScript numbers are 64-bit floating-point values, we don't bother with anything other than the first 32 bits.

### getInt8, getUint8, getInt16, getUint16, getInt32, getUint32(offset)

Shortcuts for getBits, setting the correct `bits` / `signed` values.

### getFloat32(offset)

Gets 32 bits from `offset`, and coerces and returns as a proper float32 value.

### setBits(offset, value, bits)

Sets `bits` number of bits at `offset`.

### setInt8, setUint8, setInt16, setUint16, setInt32, setUint32(offset)

Shortcuts for setBits, setting the correct `bits` count.

### setFloat32(offset)

Coerces a float32 to uint32 and sets at `offset`.


## BitStream

### Attributes

```javascript
bb.byteIndex  // Get current index in bytes.
bb.byteIndex = 0;  // Set current index in bytes.
```

```javascript
bb.view  // Underlying BitView
```

### Methods

#### readBits(bits, signed)

Updates our current index by `bits` and returns `bits` numbers of bits from the view.

#### writeBits(value, bits)

Sets `bits` numbers of bits from `values` in the view and updates our current index by `bits`.

#### readASCIIString(optional bytes)

Reads bytes from the underlying view until either `bytes` count is reached or a 0x00 terminator is reached.

#### writeASCIIString(string, optional bytes)

Writes a string followed by a NULL character to the buffer. If the string is longer than `bytes` it will be truncated, and if it is shorter 0x00 will be written in its place.