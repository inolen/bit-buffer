declare module 'bit-buffer' {
	import {Buffer} from 'buffer';

	export class BitView {
		constructor(buffer: ArrayBuffer | Buffer, byteLength?: number);

		readonly buffer: Buffer;
		readonly byteLength: number;

		getBits(offset: number, bits: number, signed?: boolean);

		getInt8(offset: number);

		getInt16(offset: number);

		getInt32(offset: number);

		getUint8(offset: number);

		getUint16(offset: number);

		getUint32(offset: number);

		getFloat32(offset: number);

		getFloat64(offset: number);

		setBits(offset: number, value: number, bits: number);

		setInt8(offset: number);

		setInt16(offset: number);

		setInt32(offset: number);

		setUint8(offset: number);

		setUint16(offset: number);

		setUint32(offset: number);

		setFloat32(offset: number, value: number);

		setFloat64(offset: number, value: number);
	}

	export class BitStream {
		constructor(source: ArrayBuffer | Buffer | BitView, byteOffset?: number, byteLength?: number)

		readonly length: number;
		readonly bitsLeft: number;
		readonly buffer: Buffer;
		byteIndex: number;
		index: number;

		readBits(bits: number, signed?: boolean): number;

		writeBits(value: number, bits: number);

		readBoolean(): boolean;

		readInt8(): number;

		readUint8(): number;

		readInt16(): number;

		readUint16(): number;

		readInt32(): number;

		readUint32(): number;

		readFloat32(): number;

		readFloat64(): number;

		writeBoolean(value: boolean);

		writeInt8(value: number);

		writeUint8(value: number);

		writeInt16(value: number);

		writeUint16(value: number);

		writeInt32(value: number);

		writeUint32(value: number);

		writeFloat32(value: number);

		writeFloat64(value: number);

		readASCIIString(length?: number): string;

		readUTF8String(length?: number): string;

		writeASCIIString(data: string, length?: number);

		writeUTF8String(data: string, length?: number);

		readBitStream(length: number): BitStream;

		readArrayBuffer(byteLength: number): Uint8Array;

		writeBitStream(stream: BitStream, length?: number);

		writeArrayBuffer(buffer: BitStream, length?: number);
	}
}
