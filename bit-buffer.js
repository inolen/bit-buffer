(function (root) {

var BitBuffer = function (source) {
	this._buffer = source.buffer ? source.buffer : source;
	this._view = new Uint8Array(this._buffer);
	this._offset = 0;
	// Used to massage fp values so we can operate on them
	// at the bit level.
	this._scratch = new DataView(new ArrayBuffer(4));
};

Object.defineProperty(BitBuffer.prototype, 'length', {
	get: function () {
		return this._buffer.byteLength;
	},
	enumerable: true,
	configurable: false
});

Object.defineProperty(BitBuffer.prototype, 'available', {
	get: function () {
		return this.length * 8 - this._offset;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(BitBuffer.prototype, 'bitOffset', {
	get: function () {
		return this._offset;
	},
	set: function (val) {
		this._offset = val;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(BitBuffer.prototype, 'byteOffset', {
	get: function () {
		return this._offset >> 3;
	},
	set: function (val) {
		this._offset = val << 3;
	},
	enumerable: true,
	configurable: true
});

BitBuffer.prototype._getBit = function (offset) {
	return this._view[offset >> 3] >> (offset & 7) & 0x1;
};

BitBuffer.prototype._setBit = function (offset, value) {
	this._view[offset >> 3] |= value << (offset&7);
};

BitBuffer.prototype.readBits = function (bits, signed) {
	if (bits > this.available) {
		throw new Error('Cannot read ' + bits + ' bit(s), ' + this.available + ' available');
	}

	var value = 0;
	for (var i = 0; i < bits; i++) {
		value |= (this._getBit(this._offset++) << i);
	}

	// FIXME We could compare bits to this._offset's alignment
	// and OR on entire byte if appropriate.

	if (signed) {
		// If we're not working with a full 32 bits, check the
		// imaginary MSB for this bit count and convert to a
		// valid 32-bit signed value if set.
		if (bits !== 32 && value & (1 << (bits - 1))) {
			value |= -1 ^ ((1 << bits) - 1);
		}

		return value;
	}

	return value >>> 0;
};

BitBuffer.prototype.writeBits = function (value, bits) {
	if (bits > this.available) {
		throw new Error('Cannot write ' + value + ' using ' + bits + ' bit(s), ' + available + ' available');
	}

	for (var i = 0; i < bits; i++) {
		this._setBit(this._offset++, value & 0x1);
		value = (value >> 1);
	}
};

BitBuffer.prototype.readInt8 = function () {
	return this.readBits(8, true);
};
BitBuffer.prototype.readUint8 = function () {
	return this.readBits(8, false);
};
BitBuffer.prototype.readInt16 = function () {
	return this.readBits(16, true);
};
BitBuffer.prototype.readUint16 = function () {
	return this.readBits(16, false);
};
BitBuffer.prototype.readInt32 = function () {
	return this.readBits(32, true);
};
BitBuffer.prototype.readUint32 = function () {
	return this.readBits(32, false);
};
BitBuffer.prototype.readFloat32 = function () {
	this._scratch.setUint32(0, this.readUint32());
	return this._scratch.getFloat32(0);
};

BitBuffer.prototype.writeInt8  =
BitBuffer.prototype.writeUint8 = function (value) {
	this.writeBits(value, 8);
};
BitBuffer.prototype.writeInt16  =
BitBuffer.prototype.writeUint16 = function (value) {
	this.writeBits(value, 16);
};
BitBuffer.prototype.writeInt32  =
BitBuffer.prototype.writeUint32 = function (value) {
	this.writeBits(value, 32);
};
BitBuffer.prototype.writeFloat32 = function (value) {
	this._scratch.setFloat32(0, value);
	this.writeBits(this._scratch.getUint32(0), 32);
};

BitBuffer.prototype.readASCIIString = function (bytes) {
	if (bytes * 8 > this.available) {
		throw new Error('Cannot read ' + bytes + ' byte(s), ' + this.available / 8 + ' available');
	}

	// Read all the bytes into chars, but stop appending at
	// the first 0x00.
	var i = 0;
	var chars = [];
	var append = true;

	// Read while we still have space available, or until we've
	// hit the fixed byte length passed in.
	while (this.available && (!bytes || (bytes && i < bytes))) {
		var c = this.readBits(8, true);

		// Stop appending chars once we hit 0x00
		if (c === 0x00) {
			append = false;

			// If we don't have a fixed length to read, break out now.
			if (!bytes) {
				break;
			}
		}

		if (append) {
			chars.push(c);
		}

		i++;
	}

	return chars.map(function (x) {
		return String.fromCharCode(x);
	}).join('');
};

BitBuffer.prototype.writeASCIIString = function(string, bytes) {
	var length = bytes || string.length + 1;  // + 1 for NULL

	for (var i = 0; i < length; i++) {
		this.writeBits(i < string.length ? string.charCodeAt(i) : 0x00, 8);
	}
};

// AMD / RequireJS
if (typeof define !== 'undefined' && define.amd) {
	define(function () {
		return BitBuffer;
	});
}
// Node.js
else if (typeof module !== 'undefined' && module.exports) {
	module.exports = BitBuffer;
}
// included directly via <script> tag
else {
	root.async = async;
}

}(this));