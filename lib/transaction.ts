import axios from 'axios';

import { successResponse, errorResponse, IMsg, IFee } from './util';
import { Wallet, Signature } from './wallet';

const LocalRestServer = 'http://localhost:1317';

export type ITx = {
  msg: IMsg[],
  fee: IFee,
  signatures: Signature[],
  memo: string,
}

export abstract class Transaction {
  protected promiseChain: (() => Promise<void>)[] = [];
  protected _tx?: ITx;

  protected constructor(
    protected _chainId: string,
    protected _restServer: string = LocalRestServer,
  ) { }

  protected abstract async addSignature(wallet: Wallet): Promise<void>;

  public setRestServer(restServer: string): Transaction {
    this._restServer = restServer;
    return this;
  }

  public addSignatureFromMnemonic(mnemonic: string, prefix?: string, hdPath?: string): Transaction {
    this.promiseChain.push(async () => {
      const wallet = await Wallet.newWalletFromMnemonic(mnemonic, prefix, hdPath);
      await this.addSignature(wallet);
    });
    return this;  
  }

  public addSignatureFromPrivateKey(privateKey: string, encoding: string = 'hex', prefix?: string): Transaction {
    this.promiseChain.push(async () => {
      const wallet = await Wallet.newWalletFromPrivateKey(privateKey, encoding, prefix);
      await this.addSignature(wallet);
    });
    return this;
  }

  public addSignatureFromWallet(wallet: Wallet): Transaction {
    this.promiseChain.push(async () => {
      await this.addSignature(wallet);
    });
    return this;
  }

  async broadcast(mode: 'block' | 'sync' | 'async') {
    return this.promiseChain.reduce((p, cb) => p.then(cb), Promise.resolve())
    .then(() => axios.post(`${this._restServer}/txs`, {
      tx: this._tx,
      mode,
    }))
    .then(successResponse)
    .catch(errorResponse);
  }

  protected sortObject(obj: any): any {
    if (obj === null) return null
    if (typeof obj !== "object") return obj
    if (Array.isArray(obj)) return obj.map((x) => this.sortObject(x))
    const sortedKeys = Object.keys(obj).sort()
    const result: any = {}
    sortedKeys.forEach(key => {
      result[key] = this.sortObject(obj[key])
    })
    return result
  }
}


