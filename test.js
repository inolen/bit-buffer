const assert = require('assert');
const BitView = require('./bit-buffer').BitView;
const BitStream = require('./bit-buffer').BitStream;

suite('BitBuffer', function () {
  let array, bv, bsw, bsr;

  setup(function () {
    array = new ArrayBuffer(64);
    bv = new BitView(array);
    bsw = new BitStream(bv);
    // Test initializing straight from the array.
    bsr = new BitStream(array);
  });

  test('Min / max signed 5 bits', function () {
    const signedMax = (1 << 4) - 1;

    bsw.writeBits(signedMax, 5);
    bsw.writeBits(-signedMax - 1, 5);
    assert(bsr.readBits(5, true) === signedMax);
    assert(bsr.readBits(5, true) === -signedMax - 1);
  });

  test('Min / max unsigned 5 bits', function () {
    const unsignedMax = (1 << 5) - 1;

    bsw.writeBits(unsignedMax, 5);
    bsw.writeBits(-unsignedMax, 5);
    assert.equal(bsr.readBits(5), unsignedMax);
    assert.equal(bsr.readBits(5), 1);
  });

  test('Min / max int8', function () {
    const signedMax = 0x7F;

    bsw.writeInt8(signedMax);
    bsw.writeInt8(-signedMax - 1);
    assert.equal(bsr.readInt8(), signedMax);
    assert.equal(bsr.readInt8(), -signedMax - 1);
  });

  test('Min / max uint8', function () {
    const unsignedMax = 0xFF;

    bsw.writeUint8(unsignedMax);
    bsw.writeUint8(-unsignedMax);
    assert.equal(bsr.readUint8(), unsignedMax);
    assert.equal(bsr.readUint8(), 1);
  });

  test('Min / max int16', function () {
    const signedMax = 0x7FFF;

    bsw.writeInt16(signedMax);
    bsw.writeInt16(-signedMax - 1);
    assert.equal(bsr.readInt16(), signedMax);
    assert.equal(bsr.readInt16(), -signedMax - 1);
  });

  test('Min / max uint16', function () {
    const unsignedMax = 0xFFFF;

    bsw.writeUint16(unsignedMax);
    bsw.writeUint16(-unsignedMax);
    assert.equal(bsr.readUint16(), unsignedMax);
    assert.equal(bsr.readUint16(), 1);
  });

  test('Min / max int32', function () {
    const signedMax = 0x7FFFFFFF;

    bsw.writeInt32(signedMax);
    bsw.writeInt32(-signedMax - 1);
    assert.equal(bsr.readInt32(), signedMax);
    assert.equal(bsr.readInt32(), -signedMax - 1);
  });

  test('Min / max uint32', function () {
    const unsignedMax = 0xFFFFFFFF;

    bsw.writeUint32(unsignedMax);
    bsw.writeUint32(-unsignedMax);
    assert.equal(bsr.readUint32(), unsignedMax);
    assert.equal(bsr.readUint32(), 1);
  });

  test('Unaligned reads', function () {
    bsw.writeBits(13, 5);
    bsw.writeUint8(0xFF);
    bsw.writeBits(14, 5);

    assert.equal(bsr.readBits(5), 13);
    assert.equal(bsr.readUint8(), 0xFF);
    assert.equal(bsr.readBits(5), 14);
  });

  test('Min / max float32 (normal values)', function () {
    const scratch = new DataView(new ArrayBuffer(8));
    scratch.setUint32(0, 0x00800000);
    scratch.setUint32(4, 0x7f7fffff);

    const min = scratch.getFloat32(0);
    const max = scratch.getFloat32(4);
    bsw.writeFloat32(min);
    bsw.writeFloat32(max);

    assert.equal(bsr.readFloat32(), min);
    assert.equal(bsr.readFloat32(), max);
  });

  test('Min / max float64 (normal values)', function () {
    const scratch = new DataView(new ArrayBuffer(16));
    scratch.setUint32(0, 0x00100000);
    scratch.setUint32(4, 0x00000000);
    scratch.setUint32(8, 0x7fefffff);
    scratch.setUint32(12, 0xffffffff);

    const min = scratch.getFloat64(0);
    const max = scratch.getFloat64(8);
    bsw.writeFloat64(min);
    bsw.writeFloat64(max);

    assert.equal(bsr.readFloat64(), min);
    assert.equal(bsr.readFloat64(), max);
  });

  test('Overwrite previous value with 0', function () {
    bv.setUint8(0, 13);
    bv.setUint8(0, 0);

    assert.equal(bv.getUint8(0), 0);
  });

  test('Read / write ASCII string, fixed length', function () {
    const str = 'foobar';
    const len = 16;

    bsw.writeASCIIString(str, len);
    assert.equal(bsw.index >> 3, len);

    assert.equal(bsr.readASCIIString(len), str);
    assert.equal(bsr.index >> 3, len);
  });

  test('Read / write ASCII string, unknown length', function () {
    const str = 'foobar';

    bsw.writeASCIIString(str);
    assert.equal(bsw.index >> 3, str.length + 1); // +1 for 0x00

    assert.equal(bsr.readASCIIString(), str);
    assert.equal(bsr.index >> 3, str.length + 1);
  });

  test('Read ASCII string, 0 length', function () {
    const str = 'foobar';

    bsw.writeASCIIString(str);
    assert.equal(bsw.index >> 3, str.length + 1); // +1 for 0x00

    assert.equal(bsr.readASCIIString(0), '');
    assert.equal(bsr.index >> 3, 0);
  });

  test('Read overflow', function () {
    let exception = false;

    try {
      bsr.readASCIIString(128);
    } catch (e) {
      exception = true;
    }

    assert(exception);
  });

  test('Write overflow', function () {
    let exception = false;

    try {
      bsw.writeASCIIString('foobar', 128);
    } catch (e) {
      exception = true;
    }

    assert(exception);
  });

  test('Get boolean', function () {
    bv.setUint8(0, 1);
    assert(bv.getBoolean(0));

    bv.setUint8(0, 0);
    assert(!bv.getBoolean(0));
  });

  test('Set boolean', function () {
    bv.setBoolean(0, true);
    assert(bv.getBoolean(0));

    bv.setBoolean(0, false);
    assert(!bv.getBoolean(0));
  });

  test('Read boolean', function () {
    bv.setBits(0, 1, 1);
    bv.setBits(1, 0, 1);

    assert(bsr.readBoolean());
    assert(!bsr.readBoolean());
  });

  test('Write boolean', function () {
    bsr.writeBoolean(true);
    assert.equal(bv.getBits(0, 1, false), 1);

    bsr.writeBoolean(false);
    assert.equal(bv.getBits(1, 1, false), 0);
  });

  test('Read / write UTF8 string, only ASCII characters', function () {
    const str = 'foobar';

    bsw.writeUTF8String(str);
    assert(bsw.index >> 3 === str.length + 1); // +1 for 0x00

    assert.equal(bsr.readUTF8String(), str);
    assert.equal(bsr.index >> 3, str.length + 1);
  });

  test('Read / write UTF8 string, non ASCII characters', function () {
    const str = '日本語';
    const bytes = [
      0xE6,
      0x97,
      0xA5,
      0xE6,
      0x9C,
      0xAC,
      0xE8,
      0xAA,
      0x9E
    ];

    bsw.writeUTF8String(str);

    for (let i = 0; i < bytes.length; i++) {
      assert.equal(bytes[i], bv.getBits(i << 3, 8));
    }

    assert.equal(bsw.index >> 3, bytes.length + 1); // +1 for 0x00

    assert.equal(bsr.readUTF8String(), str);
    assert.equal(bsr.index >> 3, bytes.length + 1);
  });

  test('readBytes', function () {
    bsw.writeBits(0xF0, 8); // 0b11110000
    bsw.writeBits(0xF1, 8); // 0b11110001
    bsw.writeBits(0xF0, 8); // 0b11110000
    bsr.readBits(3); // offset

    const buffer = bsr.readBytes(2);
    assert.equal(buffer[0], 0x3E); // 0b00111110
    assert.equal(buffer[1], 0x1E); // 0b00011110

    assert.equal(bsr.index, 3 + (2 << 3));
  });

  test('writeBytes', function () {
    const data = new Uint8Array(4);
    data[0] = 0xF0;
    data[1] = 0xF1;
    data[2] = 0xF1;

    bsw.skipBits(3);
    bsw.writeBytes(data, 2);
    assert.equal(bsw.index, 19);

    assert.equal(bsr.readBits(8), 128);
  });

  test('Get buffer from view', function () {
    const buffer = bv.buffer;

    bv.setBits(0, 0xFFFFFFFF, 32);

    assert.equal(buffer.length, 64);
    assert.equal(buffer.readUInt16LE(0), 0xFFFF);
  });

  test('Get buffer from stream', function () {
    const buffer = bsr.buffer;

    bsw.writeBits(0xFFFFFFFF, 32);

    assert.equal(buffer.length, 64);
    assert.equal(buffer.readUInt16LE(0), 0xFFFF);
  });

  test('Read from subarray', function () {
    const source = new Uint8Array([...Array(8).keys()]);
    const bs = new BitStream(source.subarray(4, 8));
    assert.equal(bs.readInt8(), 4);
    assert.equal(bs.readInt8(), 5);
    assert.equal(bs.readInt8(), 6);
    assert.equal(bs.readInt8(), 7);
  });
});

suite('Reading big/little endian', function () {
  let array, u8, bs;

  setup(function () {
    array = new ArrayBuffer(64);
    u8 = new Uint8Array(array);
    bs = new BitStream(array);

    u8[0] = 0x01;
    u8[1] = 0x02;
  });

  test('4b, little-endian', function () {
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));

    // 0000 0001  0000 0010  [01 02]
    // [#2] [#1]  [#4] [#3]
    assert.deepEqual(result, [1, 0, 2, 0]);
  });

  test('8b, little-endian', function () {
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(8));
    result.push(bs.readBits(8));

    // 0000 0001  0000 0010  [01 02]
    // [     #1]  [     #2]
    assert.deepEqual(result, [1, 2]);
  });

  test('10b, little-endian', function () {
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(10));

    // 0000 0001  0000 0010  [01 02]
    // ...   #1]  [   #2][#1...
    assert.deepEqual(result, [513]);
  });

  test('16b, little-endian', function () {
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(16));

    // 0000 0001  0000 0010  [01 02]
    // [                #1]
    assert.deepEqual(result, [0x201]);
  });

  test('24b, little-endian', function () {
    u8[2] = 0x03;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(24));

    // 0000 0001  0000 0010  0000 0011  [01 02 03]
    // [                           #1]
    assert.deepEqual(result, [0x30201]);
  });

  test('4b, big-endian', function () {
    bs.bigEndian = true;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));
    result.push(bs.readBits(4));

    // 0000 0001  0000 0010  [01 02]
    // [#1] [#2]  [#3] [#4]
    assert.deepEqual(result, [0, 1, 0, 2]);
  });

  test('8b, big-endian', function () {
    bs.bigEndian = true;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(8));
    result.push(bs.readBits(8));

    // 0000 0001  0000 0010  [01 02]
    // [     #1]  [     #2]
    assert.deepEqual(result, [1, 2]);
  });

  test('10b, big-endian', function () {
    bs.bigEndian = true;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(10));
    result.push(bs.readBits(6));

    // 0000 0001  0000 0010  [01 02]
    // [         #1][   #2]
    assert.deepEqual(result, [4, 2]);
  });

  test('16b, big-endian', function () {
    bs.bigEndian = true;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(16));

    // 0000 0001  0000 0010  [01 02]
    // [                #1]
    assert.deepEqual(result, [0x102]);
  });

  test('24b, big-endian', function () {
    u8[2] = 0x03;
    bs.bigEndian = true;
    assert.equal(bs.index, 0, 'BitStream didn\'t init at offset 0');

    const result = [];
    result.push(bs.readBits(24));

    // 0000 0001  0000 0010  0000 0011  [01 02 03]
    // [                           #1]
    assert.deepEqual(result, [0x10203]);
  });
});

suite('Writing big/little endian', function () {
  let array, u8, bs;

  setup(function () {
    array = new ArrayBuffer(2);
    u8 = new Uint8Array(array);
    bs = new BitStream(array);
  });

  test('4b, little-endian', function () {
    // 0000 0001  0000 0010  [01 02]
    // [#2] [#1]  [#4] [#3]
    bs.writeBits(1, 4);
    bs.writeBits(0, 4);
    bs.writeBits(2, 4);
    bs.writeBits(0, 4);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('8b, little-endian', function () {
    // 0000 0001  0000 0010  [01 02]
    // [     #1]  [     #2]
    bs.writeBits(1, 8);
    bs.writeBits(2, 8);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('10b, little-endian', function () {
    // 0000 0001  0000 0010  [01 02]
    // ...   #1]  [   #2][#1...
    bs.writeBits(513, 10);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('16b, little-endian', function () {
    // 0000 0001  0000 0010  [01 02]
    // [                #1]
    bs.writeBits(0x201, 16);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('4b, big-endian', function () {
    bs.bigEndian = true;

    // 0000 0001  0000 0010  [01 02]
    // [#1] [#2]  [#3] [#4]
    bs.writeBits(0, 4);
    bs.writeBits(1, 4);
    bs.writeBits(0, 4);
    bs.writeBits(2, 4);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('8b, big-endian', function () {
    bs.bigEndian = true;

    // 0000 0001  0000 0010  [01 02]
    // [     #1]  [     #2]
    bs.writeBits(1, 8);
    bs.writeBits(2, 8);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('10b, big-endian', function () {
    bs.bigEndian = true;

    // 0000 0001  0000 0010  [01 02]
    // [         #1][   #2]
    bs.writeBits(4, 10);
    bs.writeBits(2, 6);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });

  test('16b, big-endian', function () {
    bs.bigEndian = true;

    // 0000 0001  0000 0010  [01 02]
    // [                #1]
    bs.writeBits(0x102, 16);

    assert.deepEqual(u8, new Uint8Array([0x01, 0x02]));
  });
});
