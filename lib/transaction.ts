import axios from 'axios';

import { Wallet, Signature } from './wallet';

const LocalRestServer = 'http://localhost:1317';

export type AccountDetails = {
  height: string,
  result: {
    type: string,
    value: {
      address: string,
      coins: ICoin[],
      public_key: string,
      account_number: number,
      sequence: number,
    },
  },
};

export type IMsg = {
  type: string,
  value: any,
}

export type ICoin = {
  denom: string,
  amount: string,
}

export type IDecCoin = {
  denom: string
  amount: number | string,
}

export type IFee = {
  amount: ICoin[],
  gas: number | string,
}

export type UnsignedStdTx = {
  type: string,
  value: {
    msg: IMsg[],
    fee: { amount: any[], gas: string },
    signatures: any[],
    memo: string,
  },
};

export type IStdTx = {
  msgs?: IMsg[],
  fee: IFee,
  chain_id: string,
  account_number: number | string,
  sequence: number | string,
  memo?: string,
}

export type ITx = {
  msg: IMsg[],
  fee: IFee,
  signatures: Signature[],
  memo: string,
}

abstract class Transaction {
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
    .then(this.successResponse)
    .catch(this.errorResponse);
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

  async getAccountDetails(address: string): Promise<AccountDetails> {
    return axios.get(`${this._restServer}/auth/accounts/${address}`)
    .then(this.successResponse)
    .catch(this.errorResponse);
  }

  // TODO: Apply correst type
  successResponse(result: any) {
    return result.data;
  }
  errorResponse(result: any) {
    return result;
  }
}

export class StdTx extends Transaction {
  private _uStdTx: UnsignedStdTx;
  
  constructor(
    uStdTx: UnsignedStdTx,
    chainId: string,
    restServer?: string,
  ) {
    if (!uStdTx.value.msg.length) throw new Error('you need at least one msg in your transaction')
    
    super(chainId, restServer);
    this._uStdTx = uStdTx;
  }

  protected async addSignature(wallet: Wallet) {
    const account = await this.getAccountDetails(wallet.address);

    const iStdTx: IStdTx = this.sortObject({
      msgs: this._uStdTx.value.msg,
      fee: this._uStdTx.value.fee,
      chain_id: this._chainId,
      account_number: account.result.value.account_number.toString(),
      sequence: account.result.value.sequence.toString(),
      memo: this._uStdTx.value.memo,
    });

    this._tx = {
      msg: this._uStdTx.value.msg,
      fee: this._uStdTx.value.fee,
      memo: this._uStdTx.value.memo,
      signatures: []
    }

    this._tx.signatures.push(wallet.signStdTx(JSON.stringify(iStdTx)));
  }
}




export const buyName = async (restServer: string, token: string, address: string, name: string, amount: number, chainId: string): Promise<UnsignedStdTx> =>
  axios.post(`${restServer}/nameservice/names`, JSON.stringify({
    base_req: {
      chain_id: chainId,
      from: address,
    },
    name,
    amount: `${amount}${token}`,
    buyer: address,
  }))
    .then(result => result.data)
    .catch(result => result);