import { Transaction } from './transaction';
import { Wallet } from './wallet';
import { getAccountDetails, IMsg, IFee } from './util';

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
    const account = await getAccountDetails(this._restServer, wallet.address);

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