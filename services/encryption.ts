import CryptoJS from 'crypto-js';
import forge from "node-forge";

const thePublicKey = process.env.NEXT_PUBLIC_RSA_PUBLIC_KEY ?? "";

const encryptData = (
  data: unknown,
  secretKey: string = process.env.DATA_SECRET_KEY ?? "",
  iv: string = process.env.DATA_IV_KEY ?? "",
): string => {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), CryptoJS.enc.Utf8.parse(secretKey), {
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
};

const getPublicKey = (): string => {
  return thePublicKey;
};

const generateDataIV = (): string => {
  return forge.random.getBytesSync(16);
};

const encryptWithPublicKey = (iv: string, publicKey: string): string => {
  const pem = forge.pki.publicKeyFromPem(publicKey);
  const encryptedIV = pem.encrypt(iv, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });
  return forge.util.encode64(encryptedIV);
};

const encryptPayLoad = async (data: unknown): Promise<{ iv: string; data: string }> => {
  const publicKey = thePublicKey;
  const iv = generateDataIV();
  const encryptedIV = encryptWithPublicKey(iv, publicKey);

  const key = forge.util.createBuffer(iv);
  const cipher = forge.cipher.createCipher("AES-CBC", key);
  cipher.start({ iv: forge.util.createBuffer(iv) });
  cipher.update(forge.util.createBuffer(JSON.stringify(data)));
  cipher.finish();

  return {
    iv: encryptedIV,
    data: forge.util.encode64(cipher.output.bytes()),
  };
};

export { encryptData, encryptPayLoad, getPublicKey };
