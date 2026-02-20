
const buf = Buffer.from('hello world');
const attempt1 = Buffer.from(buf, 'base64');
console.log('Original:', buf);
console.log('Attempt 1 (Buffer.from(buf, "base64")):', attempt1);

const base64Str = buf.toString('base64');
const attempt2 = Buffer.from(base64Str, 'base64');
console.log('Base64 String:', base64Str);
console.log('Attempt 2 (Buffer.from(base64Str, "base64")):', attempt2);
console.log('Matches original:', attempt2.equals(buf));
