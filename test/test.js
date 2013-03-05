var assert = require('assert'),
	BitView = require('../bit-buffer').BitView,
	BitStream = require('../bit-buffer').BitStream;

suite('BitBuffer', function () {
	var array, bv, bsw, bsr;

	setup(function () {
		array = new ArrayBuffer(64);
		bv = new BitView(array);
		bsw = new BitStream(bv);
		// Test initializing straight from the array.
		bsr = new BitStream(array);
	});

	test('Min / max signed 5 bits', function () {
		var signed_max = (1 << 4) - 1;

		bsw.writeBits(signed_max, 5);
		bsw.writeBits(-signed_max - 1, 5);
		assert(bsr.readBits(5, true) === signed_max);
		assert(bsr.readBits(5, true) === -signed_max - 1);
	});

	test('Min / max unsigned 5 bits', function () {
		var unsigned_max = (1 << 5) - 1;

		bsw.writeBits(unsigned_max, 5);
		bsw.writeBits(-unsigned_max, 5);
		assert(bsr.readBits(5) === unsigned_max);
		assert(bsr.readBits(5) === 1);
	});

	test('Min / max int8', function () {
		var signed_max = 0x7F;

		bsw.writeInt8(signed_max);
		bsw.writeInt8(-signed_max - 1);
		assert(bsr.readInt8() === signed_max);
		assert(bsr.readInt8() === -signed_max - 1);
	});

	test('Min / max uint8', function () {
		var unsigned_max = 0xFF;

		bsw.writeUint8(unsigned_max);
		bsw.writeUint8(-unsigned_max);
		assert(bsr.readUint8() === unsigned_max);
		assert(bsr.readUint8() === 1);
	});

	test('Min / max int16', function () {
		var signed_max = 0x7FFF;

		bsw.writeInt16(signed_max);
		bsw.writeInt16(-signed_max - 1);
		assert(bsr.readInt16() === signed_max);
		assert(bsr.readInt16() === -signed_max - 1);
	});

	test('Min / max uint16', function () {
		var unsigned_max = 0xFFFF;

		bsw.writeUint16(unsigned_max);
		bsw.writeUint16(-unsigned_max);
		assert(bsr.readUint16() === unsigned_max);
		assert(bsr.readUint16() === 1);
	});

	test('Min / max int32', function () {
		var signed_max = 0x7FFFFFFF;

		bsw.writeInt32(signed_max);
		bsw.writeInt32(-signed_max - 1);
		assert(bsr.readInt32() === signed_max);
		assert(bsr.readInt32() === -signed_max - 1);
	});

	test('Min / max uint32', function () {
		var unsigned_max = 0xFFFFFFFF;

		bsw.writeUint32(unsigned_max);
		bsw.writeUint32(-unsigned_max);
		assert(bsr.readUint32() === unsigned_max);
		assert(bsr.readUint32() === 1);
	});

	test('Unaligned reads', function () {
		bsw.writeBits(13, 5);
		bsw.writeUint8(0xFF);
		bsw.writeBits(14, 5);

		assert(bsr.readBits(5) === 13);
		assert(bsr.readUint8() === 0xFF);
		assert(bsr.readBits(5) === 14);
	});

	test('Min / max float32 (normal values)', function () {
		var scratch = new DataView(new ArrayBuffer(8));

		scratch.setUint32(0, 0x00800000);
		scratch.setUint32(4, 0x7f7fffff);

		var min = scratch.getFloat32(0);
		var max = scratch.getFloat32(4);

		bsw.writeFloat32(min);
		bsw.writeFloat32(max);

		assert(bsr.readFloat32() === min);
		assert(bsr.readFloat32() === max);
	});

	test('Min / max float64 (normal values)', function () {
		var scratch = new DataView(new ArrayBuffer(16));

		scratch.setUint32(0, 0x00100000);
		scratch.setUint32(4, 0x00000000);
		scratch.setUint32(8, 0x7fefffff);
		scratch.setUint32(12, 0xffffffff);

		var min = scratch.getFloat64(0);
		var max = scratch.getFloat64(8);

		bsw.writeFloat64(min);
		bsw.writeFloat64(max);

		assert(bsr.readFloat64() === min);
		assert(bsr.readFloat64() === max);
	});

	test('Overwrite previous value with 0', function () {
		bv.setUint8(0, 13);
		bv.setUint8(0, 0);

		assert(bv.getUint8(0) === 0);
	});

	test('Read / write ASCII string, fixed length', function () {
		var str = 'foobar';
		var len = 16;

		bsw.writeASCIIString(str, len);
		assert(bsw.byteIndex === len);

		assert(bsr.readASCIIString(len) === str);
		assert(bsr.byteIndex === len);
	});

	test('Read / write ASCII string, unknown length', function () {
		var str = 'foobar';

		bsw.writeASCIIString(str);
		assert(bsw.byteIndex === str.length + 1);  // +1 for 0x00

		assert(bsr.readASCIIString() === str);
		assert(bsr.byteIndex === str.length + 1);
	});

	test('Read overflow', function () {
		var exception = false;

		try {
			bsr.readASCIIString(128);
		} catch (e) {
			exception = true;
		}

		assert(exception);
	});

	test('Write overflow', function () {
		var exception = false;

		try {
			bsw.writeASCIIString('foobar', 128);
		} catch (e) {
			exception = true;
		}

		assert(exception);
	});
});