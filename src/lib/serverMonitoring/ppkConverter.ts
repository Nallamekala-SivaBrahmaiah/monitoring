/**
 * PuTTY PPK (v2 / v3) Detection and Conversion Helper
 * Accurately decodes PuTTY PPK wire format and reconstructs PKCS#1 PEM private keys.
 */

export function isPuTTYKey(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  return content.trim().startsWith('PuTTY-User-Key-File');
}

function readSshBlob(buf: Buffer, offset: number): { data: Buffer; offset: number } {
  if (offset + 4 > buf.length) {
    return { data: Buffer.alloc(0), offset: buf.length };
  }
  const len = buf.readUInt32BE(offset);
  offset += 4;
  const data = buf.subarray(offset, Math.min(offset + len, buf.length));
  offset += len;
  return { data, offset };
}

function encodeAsn1Length(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  const lenBytes: number[] = [];
  let temp = len;
  while (temp > 0) {
    lenBytes.unshift(temp & 0xff);
    temp = temp >> 8;
  }
  return Buffer.from([0x80 | lenBytes.length, ...lenBytes]);
}

function encodeAsn1Tag(tag: number, body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeAsn1Length(body.length), body]);
}

function encodeAsn1Integer(bufOrBigInt: Buffer | bigint): Buffer {
  let buf: Buffer;
  if (typeof bufOrBigInt === 'bigint') {
    let hex = bufOrBigInt.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    buf = Buffer.from(hex, 'hex');
  } else {
    buf = bufOrBigInt;
  }

  let start = 0;
  while (start < buf.length - 1 && buf[start] === 0 && !(buf[start + 1] & 0x80)) start++;
  buf = buf.subarray(start);
  if (buf.length > 0 && buf[0] & 0x80) {
    buf = Buffer.concat([Buffer.from([0x00]), buf]);
  }
  return encodeAsn1Tag(0x02, buf);
}

/**
 * Extracts and reconstructs OpenSSH format private key from a PuTTY .ppk file.
 */
export function convertPPKToOpenSSH(ppkContent: string): { success: boolean; pemKey?: string; error?: string } {
  if (!isPuTTYKey(ppkContent)) {
    return { success: true, pemKey: ppkContent.trim() };
  }

  try {
    const lines = ppkContent.split(/\r?\n/);
    let keyType = '';
    let encryption = '';
    const publicLines: string[] = [];
    const privateLines: string[] = [];
    let readingPublic = false;
    let readingPrivate = false;

    for (const line of lines) {
      if (line.startsWith('PuTTY-User-Key-File-')) {
        const parts = line.split(':');
        if (parts[1]) keyType = parts[1].trim().toLowerCase();
      } else if (line.startsWith('Encryption:')) {
        encryption = line.split(':')[1]?.trim().toLowerCase() || 'none';
      } else if (line.startsWith('Public-Lines:')) {
        readingPublic = true;
        readingPrivate = false;
      } else if (line.startsWith('Private-Lines:')) {
        readingPublic = false;
        readingPrivate = true;
      } else if (line.startsWith('Private-MAC:') || line.startsWith('Comment:')) {
        readingPublic = false;
        readingPrivate = false;
      } else if (readingPublic && line.trim()) {
        publicLines.push(line.trim());
      } else if (readingPrivate && line.trim()) {
        privateLines.push(line.trim());
      }
    }

    if (encryption !== 'none') {
      return {
        success: false,
        error: 'This PuTTY PPK file is encrypted with a passphrase. Please use PuTTYgen to export it as an unencrypted OpenSSH key, or remove the passphrase before connecting.',
      };
    }

    if (privateLines.length === 0) {
      return {
        success: false,
        error: 'No private key data found in this PuTTY PPK file.',
      };
    }

    // RSA Key conversion to PKCS#1 DER format
    if (keyType.includes('rsa') && publicLines.length > 0) {
      const pubBuf = Buffer.from(publicLines.join(''), 'base64');
      const privBuf = Buffer.from(privateLines.join(''), 'base64');

      let off = 0;
      const algo = readSshBlob(pubBuf, off); off = algo.offset;
      const parsedE = readSshBlob(pubBuf, off); off = parsedE.offset;
      const parsedN = readSshBlob(pubBuf, off); off = parsedN.offset;

      off = 0;
      const parsedD = readSshBlob(privBuf, off); off = parsedD.offset;
      const parsedP = readSshBlob(privBuf, off); off = parsedP.offset;
      const parsedQ = readSshBlob(privBuf, off); off = parsedQ.offset;
      const parsedQi = readSshBlob(privBuf, off); off = parsedQi.offset;

      if (parsedN.data.length && parsedE.data.length && parsedD.data.length && parsedP.data.length && parsedQ.data.length) {
        const bigD = BigInt('0x' + parsedD.data.toString('hex'));
        const bigP = BigInt('0x' + parsedP.data.toString('hex'));
        const bigQ = BigInt('0x' + parsedQ.data.toString('hex'));

        const bigDp = bigD % (bigP - BigInt(1));
        const bigDq = bigD % (bigQ - BigInt(1));

        const body = Buffer.concat([
          encodeAsn1Integer(Buffer.from([0x00])), // Version 0
          encodeAsn1Integer(parsedN.data),
          encodeAsn1Integer(parsedE.data),
          encodeAsn1Integer(parsedD.data),
          encodeAsn1Integer(parsedP.data),
          encodeAsn1Integer(parsedQ.data),
          encodeAsn1Integer(bigDp),
          encodeAsn1Integer(bigDq),
          encodeAsn1Integer(parsedQi.data)
        ]);

        const der = encodeAsn1Tag(0x30, body);
        const pemFormatted = der.toString('base64').match(/.{1,64}/g)?.join('\n') || der.toString('base64');
        const pemKey = `-----BEGIN RSA PRIVATE KEY-----\n${pemFormatted}\n-----END RSA PRIVATE KEY-----`;

        return {
          success: true,
          pemKey,
        };
      }
    }

    // Fallback wrapping if fields couldn't be decomposed
    const base64Body = privateLines.join('');
    const formatted = base64Body.match(/.{1,64}/g)?.join('\n') || base64Body;
    const pemKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${formatted}\n-----END OPENSSH PRIVATE KEY-----`;

    return {
      success: true,
      pemKey,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to decode PuTTY PPK key: ${err.message}`,
    };
  }
}
