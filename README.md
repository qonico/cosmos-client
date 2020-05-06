# cosmos-client
Cosmos and other cosmos based blockchains js client, writen in typescrip and very simple to use.

## Installing
```
npm i @qonico/cosmos-client
```

## Usage
```
import axios from 'axios';
import { StdTx, Wallet, UnsignedStdTx } from '@qonico/cosmos-client';

const RestServer = 'http://localhost:1317';
const ChainId = 'namechain';
const Token = 'nametoken';
const mnemonic = 'some mnemonic seed...';

// We use the rest comsmos api to generate the unsigned Tx
// make sure it fits on UnsignedStdTx type definition
export const buyName = async (address: string, name: string, amount: number): Promise<UnsignedStdTx> =>
  axios.post(`${RestServer}/nameservice/names`, JSON.stringify({
    base_req: {
      chain_id: ChainId,
      from: address,
    },
    name,
    amount: `${amount}${Token}`,
    buyer: address,
  }))
    .then(result => result.data)
    .catch(result => result);

(async () => {
  wallet = await Wallet.newWalletFromMnemonic(mnemonic);
  const unsignedTx = await buyName(wallet.address, 'jack1.id', 10);

  try {
  const result = await new StdTx(unsignedTx, ChainId)
    .setRestServer(RestServer)
    .addSignatureFromWallet(wallet)
    .broadcast('block');
    console.log(result);
  } catch (error) {
    console.error(error);
  }
})();
```

## Authors
* **Fernando Caamaño** - *Initial work* - [Qonico](https://github.com/qonico)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details