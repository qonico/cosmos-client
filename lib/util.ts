import axios from 'axios';

export type IMsg = {
  type: string,
  value: any,
};

export type ICoin = {
  denom: string,
  amount: string,
};

export type IDecCoin = {
  denom: string
  amount: number | string,
};

export type IFee = {
  amount: ICoin[],
  gas: number | string,
};

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

export const successResponse = (result: any) => result.data;
export const errorResponse = (result: any) => result;

export const getAccountDetails = async (address: string, restServer: string): Promise<AccountDetails> => {
  return axios.get(`${restServer}/auth/accounts/${address}`)
  .then(successResponse)
  .catch(errorResponse);
};