var assert = require('assert'),
	BitBuffer = require('../bit-buffer');

suite('BitBuffer', function () {
	var array, bbw, bbr;

	setup(function () {
		array = new ArrayBuffer(64);
		bbw = new BitBuffer(array);
		bbr = new BitBuffer(array);
	});

	test('Min / max signed 5 bits', function () {
		var signed_max = (1 << 4) - 1;

		bbw.writeBits(signed_max, 5);
		bbw.writeBits(-signed_max - 1, 5);
		assert(bbr.readBits(5, true) === signed_max);
		assert(bbr.readBits(5, true) === -signed_max - 1);
	});

	test('Min / max unsigned 5 bits', function () {
		var unsigned_max = (1 << 5) - 1;

		bbw.writeBits(unsigned_max, 5);
		bbw.writeBits(-unsigned_max, 5);
		assert(bbr.readBits(5) === unsigned_max);
		assert(bbr.readBits(5) === 1);
	});

	test('Min / max int8', function () {
		var signed_max = 0x7F;

		bbw.writeInt8(signed_max);
		bbw.writeInt8(-signed_max - 1);
		assert(bbr.readInt8() === signed_max);
		assert(bbr.readInt8() === -signed_max - 1);
	});

	test('Min / max uint8', function () {
		var unsigned_max = 0xFF;

		bbw.writeUint8(unsigned_max);
		bbw.writeUint8(-unsigned_max);
		assert(bbr.readUint8() === unsigned_max);
		assert(bbr.readUint8() === 1);
	});

	test('Min / max int16', function () {
		var signed_max = 0x7FFF;

		bbw.writeInt16(signed_max);
		bbw.writeInt16(-signed_max - 1);
		assert(bbr.readInt16() === signed_max);
		assert(bbr.readInt16() === -signed_max - 1);
	});

	test('Min / max uint16', function () {
		var unsigned_max = 0xFFFF;

		bbw.writeUint16(unsigned_max);
		bbw.writeUint16(-unsigned_max);
		assert(bbr.readUint16() === unsigned_max);
		assert(bbr.readUint16() === 1);
	});

	test('Min / max int32', function () {
		var signed_max = 0x7FFFFFFF;

		bbw.writeInt32(signed_max);
		bbw.writeInt32(-signed_max - 1);
		assert(bbr.readInt32() === signed_max);
		assert(bbr.readInt32() === -signed_max - 1);
	});

	test('Min / max uint32', function () {
		var unsigned_max = 0xFFFFFFFF;

		bbw.writeUint32(unsigned_max);
		bbw.writeUint32(-unsigned_max);
		assert(bbr.readUint32() === unsigned_max);
		assert(bbr.readUint32() === 1);
	});

	test('Unaligned reads', function () {
		bbw.writeBits(13, 5);
		bbw.writeUint8(0xFF);
		bbw.writeBits(14, 5);

		assert(bbr.readBits(5) === 13);
		assert(bbr.readUint8() === 0xFF);
		assert(bbr.readBits(5) === 14);
	});

	test('ASCII string, fixed length', function () {
		var str = 'foobar';
		var len = 16;

		bbw.writeASCIIString(str, len);
		assert(bbw.byteOffset === len);

		assert(bbr.readASCIIString(len) === str);
		assert(bbr.byteOffset === len);
	});

	test('ASCII string, unknown length', function () {
		var str = 'foobar';

		bbw.writeASCIIString(str);
		assert(bbw.byteOffset === str.length + 1);  // +1 for 0x00

		assert(bbr.readASCIIString() === str);
		assert(bbr.byteOffset === str.length + 1);
	});

	test('Read overflow', function () {
		var exception = false;

		try {
			bbr.readASCIIString(128);
		} catch (e) {
			exception = true;
		}

		assert(exception);
	});

	test('Write overflow', function () {
		var exception = false;

		try {
			bbw.writeASCIIString('foobar', 128);
		} catch (e) {
			exception = true;
		}

		assert(exception);
	});
});