import { createHash } from 'crypto';
import { encode, toWords } from 'bech32';
import { fromSeed } from 'bip32';
import { validateMnemonic, mnemonicToSeed, entropyToMnemonic } from 'bip39';
import { ec } from 'elliptic';
import CryptoJS from 'crypto-js';
import { ecdsaSign } from 'secp256k1';

const CosmosHdPath = "m/44'/118'/0'/0/0";
const CosmosPrefix = 'cosmos';

export const standardRandomBytesFunc = (x: number) => CryptoJS.lib.WordArray.random(x).toString();
const secp256k1 = new ec('secp256k1');

const hash = (hash: string, data: Buffer): Buffer =>
  createHash(hash)
    .update(data)
    .digest();

const getWalletAddress = (publicKey: Buffer, prefix: string) => {
  const bytes = hash('ripemd160', hash('sha256', publicKey));
  return encode(prefix, toWords(bytes));
};

export type Signature = {
  signature: string,
  pub_key: {
    type: string,
    value: string,
  },
};

export class Wallet {
  private constructor(
    private _privateKey: Buffer,
    private _publicKey: Buffer,
    private _address: string,
    private _mnemonic?: string
  ) { }

  get mnemonic(): string {
    return this._mnemonic || '';
  }

  get address(): string {
    return this._address;
  }
  
  signStdTx(json: string): Signature {
    const hash = createHash('sha256')
      .update(json)
      .digest('hex')
    const buf = Buffer.from(hash, 'hex')
    const { signature } = ecdsaSign(buf, this._privateKey)

    return {
      signature: Buffer.from(signature).toString('base64'),
      pub_key: {
        type: "tendermint/PubKeySecp256k1",
        value: this._publicKey.toString('base64')
      }
    }
  }

  static async newWalletFromMnemonic(
    mnemonic: string,
    prefix: string = CosmosPrefix,
    hdPath: string = CosmosHdPath,
  ) {
    if (!validateMnemonic(mnemonic)) {
      throw Error('invalid mnemonic');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const masterKey = fromSeed(seed);
    
    const hd = masterKey.derivePath(hdPath);

    if (!hd.privateKey) {
      throw Error('invalid mnemonic');
    }
    
    return new Wallet(
      hd.privateKey,
      hd.publicKey,
      getWalletAddress(hd.publicKey, prefix),
      mnemonic,
    );
  };

  static async newWalletFromPrivateKey(
    privateKey: string,
    encoding: string = 'hex',
    prefix: string = CosmosPrefix,
  ) {
    const keys = secp256k1.keyFromPrivate(privateKey, encoding);
    
    const _privateKey = keys.getPrivate().toBuffer();
    const _publicKey = Buffer.from(keys.getPublic(true, 'hex'), 'hex');

    return new Wallet(
      _privateKey,
      _publicKey,
      getWalletAddress(_publicKey, prefix),
    );
  };

  static async newWallet(
    randomBytesFunc = standardRandomBytesFunc,
    prefix: string = CosmosPrefix,
    hdPath: string = CosmosHdPath,
  ) {
    const randomBytes = Buffer.from(randomBytesFunc(32), 'hex');
    if (randomBytes.length !== 32) {
      throw Error('Entropy has incorrect length');
    }

    const mnemonic = entropyToMnemonic(randomBytes.toString('hex'));

    return Wallet.newWalletFromMnemonic(mnemonic, prefix, hdPath);
  }
}
