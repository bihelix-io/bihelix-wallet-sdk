# BiHelix Wallet SDK

The BiHelix Wallet SDK is a cutting-edge solution for Web3 users and developers, offering secure and reliable support for native Bitcoin transactions and seamless digital asset management.

With the integration of the RGB protocol and Lightning Network (LN) technology, developers can easily add RGB protocol and Bitcoin payments to their applications with minimal learning effort. As a top choice based on the native Bitcoin blockchain, the BiHelix Wallet SDK provides powerful and flexible tools, allowing you to effortlessly manage your Web3 assets.

The BiHelix Wallet SDK offers the following features:

- RGB Asset Protocol (currently supporting RGB20, with upcoming support for RGB21 and more).
- Client-side PSBT signer.
- Support for multi-transfer transactions.
- Enhanced transfers with BiHelix BID technology.
- Upcoming support for PayJoin and CoinJoin protocols.

## Contents

- [Installation](#Installation)
- [Usage](#Usage)
- [Diagram](#Diagram)
- [Methods](#Methods)
  - Asset
    - [unspentList](#unspentList)
    - [assetRegistry](#assetRegistry)
    - [assetList](#assetList)
    - [assetBalance](#assetBalance)
    - [transactionList](#transactionList)
    - [acceptMultiAsset](#acceptMultiAsset)
    - [acceptAsset](#acceptAsset)
  - Gas
    - [estimateGas](#estimateGas)
  - Invoice
    - [createAssetInvoice](#createAssetInvoice)
  - PSBT
    - [createCSVPSBT](#createCSVPSBT)
    - [createMultiAssetPSBT](#createMultiAssetPSBT)
    - [createAssetPSBT](#createAssetPSBT)
    - [signPSBT](#signPSBT)
    - [unsignedPSBT](#unsignedPSBT)
  - Misc
    - [exportDescriptor](#exportDescriptor)
    - [exportFullDescriptor](#exportFullDescriptor)
    - [convertExtendPubKey](#convertExtendPubKey)
    - [failTransfer](#failTransfer)
    - [delTransfer](#delTransfer)

## Installation

```bash
npm install https://github.com/bihelix-io/bihelix-wallet-sdk
```

## Usage

The standard deviation for RGB

> When creating a new wallet, it is recommended to use RGB with the OP_RETURN wpkh derivation path `m/84h/1h/0h/9` (testnet) or `m/84h/0h/0h/9` (mainnet) as suggested by the RGB official. Theoretically, other derivations are also supported for now, currently there is no restriction.

- Full descriptor with hardend list
  - native segwit testnet：wpkh([fingerprint/84h/1h/0h]tpub/9/\*)
  - native segwit mainnet：wpkh([fingerprint/84h/0h/0h]tpub/9/\*)
  - taproot testnet： tr([fingerprint/86h/1h/0h]tpub/10/\*)
  - taproot mainnet： tr([fingerprint/86h/0h/0h]tpub/10/\*)

The technical accuracy for RGB asset precision(i.e. RGB20 amount precision)

> It is recommended to set the precision for RGB20 to 8, to match BTC(or satoshi unit). This ensures consistency between frontend and backend values.
> The frontend should send values to the backend multiplied by 1e8, and display them in a formatted way, such as: 0.1 RNA.
> The backend should return token values multiplied by 1e8.

Initialize wallet sdk instance.

```javascript
const SDK = require("bihelix-wallet-sdk");
const sdk = new SDK(provider, address);
```

#### Parameters

- provider: string - The API provider URL.
- address: string - The wallet address.
- network: string (optional) - The network to use ("bitcoin", "testnet", or "regtest"). Default is "bitcoin" mainnet.

## Diagram

RGB20 token (multi) transfer process.

![Transfer](./doc/diagram/bid.png)

## Methods

### unspentList

#### Description

Retrieves the list of unspent transactions.

```javascript
async unspentList(address = "", settledOnly = true)
```

#### Parameters

- address: string (optional) - The wallet address. Default is the instance bitcoin address.
- settledOnly: boolean (optional) - Whether to retrieve only settled transactions. Default is true.

#### Example

```javascript
const unspentList = await sdk.unspentList();
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "unspents": [
      {
        "utxo": {
          "outpoint": {
            "txid": "186e0b6a19a593a0100adead6376a88dfca5e745c8c5a79d2b1239fa33d3815b",
            "vout": 0
          },
          "btc_amount": 6000,
          "colorable": true
        },
        "rgb_allocations": [
          {
            "asset_id": "rgb:28erwHp-KbsgGTLUk-9HVTBQ94W-9q5VFSB3s-44wFYLb98-kUPhLuF",
            "amount": 1500,
            "settled": true
          },
          {
            "asset_id": "rgb:28erwHp-KbsgGTLUk-9HVTBQ94W-9q5VFSB3s-44wFYLb98-kUPhLuF",
            "amount": 500,
            "settled": true
          }
        ]
      }
    ]
  }
}
```

### assetRegistry

#### Description

Retrieves the asset registry list from BiHelix node.

```javascript
async assetRegistry()
```

#### Parameters

#### Example

```javascript
const registry = await sdk.assetRegistry();
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "asset_owner": "tb1qrspdu96a9s2qx39a4mqpzf4guxz7l3w7t8h6dv",
      "asset_id": "rgb:2DFQNGC-f29tozN8w-oj222Sapy-M985R8dYA-cQD4VjLYB-zWfvp54",
      "asset_schema": "RGB20",
      "issued_supply": "1000000",
      "asset_ticker": "RGBTEST4",
      "asset_name": "RGBTest4",
      "asset_precision": 0
    }
  ]
}
```

### assetList

#### Description

Retrieves the list of assets.

```javascript
async assetList(assetTypes)
```

#### Parameters

- assetTypes: string - The types of assets to retrieve("rgb20, rgb21").

#### Example

```javascript
const result = await sdk.assetList("type1, type2");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "assets": [
      {
        "asset": {
          "asset_id": "rgb:28erwHp-KbsgGTLUk-9HVTBQ94W-9q5VFSB3s-44wFYLb98-kUPhLuF",
          "asset_iface": "RGB20",
          "ticker": "RGBTEST4",
          "name": "RGBTest4",
          "precision": 0,
          "issued_supply": 1000000,
          "timestamp": 1713322847,
          "added_at": 1713322847,
          "balance": {
            "settled": 994000,
            "future": 993500,
            "spendable": 994000
          }
        },
        "utxos": [
          {
            "outpoint": {
              "txid": "0e881b54ff1c82070844655e24174d5f91132ecc9c446cd282b9bec206233527",
              "vout": 1
            },
            "btc_amount": 15221,
            "colorable": true
          }
        ]
      }
    ]
  }
}
```

### assetBalance

#### Description

Retrieves the balance of a specific asset.

```javascript
async assetBalance(assetId)
```

#### Parameters

- assetId: string - The asset ID.

#### Example

```javascript
const result = await sdk.assetBalance("asset-id");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "settled": 10000,
    "future": 10000,
    "spendable": 10000
  }
}
```

### transactionList

#### Description

Retrieves the list of transactions for a specific asset.

```javascript
async transactionList(assetId, pageSize = 10, pageNo = 1)
```

#### Parameters

- assetId: string - The asset ID.
- pageSize: number (optional) - The number of transactions per page. Default is 10.
- pageNo: number (optional) - The page number. Default is 1.

#### Example

```javascript
const transactions = await sdk.transactionList("asset-id");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "idx": 1,
      "batch_transfer_idx": 1,
      "created_at": 1714371014,
      "updated_at": 1714374494,
      "status": "Settled",
      "amount": 100,
      "kind": "ReceiveBlind",
      "sender": "tb1q86kuzty6rqez8v6mkzwqsmwfgem8jvz8te8zps",
      "receiver": "tb1qs6vjt8c3lj6rtp2wpq5y55mxmu256837nh6cts",
      "txid": "72a80132c1a69357f86f94c74fa4d81d3611b3a6e292afaf8e3e831b8124a2a8",
      "recipient_id": "tb:utxob:w74XPb8-gijKLk327-bKtvB38rF-Dr7vVNGo8-bgp16k4Dq-aWPaVf",
      "receive_utxo": {
        "txid": "a76c3ea1e86c514dbfc7249bf905bd6ff6deedbb958eb636534ca29af547d63b",
        "vout": 3
      },
      "change_utxo": null,
      "expiration": 1714374614,
      "transport_endpoints": [
        {
          "endpoint": "http://127.0.0.0:8080/json-rpc",
          "transport_type": "JsonRpc",
          "used": true
        }
      ]
    }
  ]
}
```

### acceptMultiAsset

#### Description

Accepts multiple assets to finish the transfer.

```javascript
async acceptMultiAsset(pubKey, psbt, recipientIds, assetIds)
```

#### Parameters

- pubKey: string - The public key.
- psbt: string - The partially signed Bitcoin transaction.
- recipientIds: string - The recipient IDs (comma-separated).
- assetIds: string - The asset IDs (comma-separated).

#### Example

```javascript
const result = await sdk.acceptMultiAsset("pubKey", "psbt", "recipient1, recipient2", "asset-id1, asset-id2");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "txid": "a03af972eea88ee0a8aef0a0bad8c7766399e59d029d443f2ee1c8e189d6e1ab"
  }
}
```

### acceptAsset

#### Description

Accepts a specific asset to finish the transfer.

```javascript
async acceptAsset(pubKey, psbt, recipientIds, assetId)
```

#### Parameters

- pubKey: string - The public key.
- psbt: string - The partially signed Bitcoin transaction.
- recipientIds: string - The recipient IDs (comma-separated).
- assetId: string - The asset ID.

#### Example

```javascript
const result = await sdk.acceptAsset("pubKey", "psbt", "recipient1, recipient2", "asset-id");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "txid": "2f66a276ce773d7ccf0ab4c86aaa645b56c2cc6998138b8895d558cb9fss320b"
  }
}
```

### estimateGas

#### Description

Estimates the gas fee for a transaction.

```javascript
async estimateGas(assetId, operate = "transfer")
```

#### Parameters

- assetId: string - The asset ID.
- operate: string (optional) - The operation type. Default is "transfer".
  - transfer: get estimated gas fee for transfer
  - issue: get estimated gas fee for issue token

#### Example

```javascript
const gas = await sdk.estimateGas("asset-id");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": 580
}
```

### createAssetInvoice

#### Description

Creates an asset invoice form receiver.

```javascript
async createAssetInvoice(address, assetId, amounts, assetTypes = "rgb20")
```

#### Parameters

- address: string - The recipient address(es) (comma-separated).
- assetId: string - The asset ID.
- amounts: string - The amounts (comma-separated).
- assetTypes: string (optional) - The asset types. Default is "rgb20".

#### Example

```javascript
const invoice = await sdk.createAssetInvoice("address1, address2", "asset-id", "1000, 2000");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "invoice": "rgb:2uxU95k-eh4dzC1y3-tfM2Mka5T-aMfWoH8/RGB20/1000+utxob:JGV9FPn-8y2FjqwHv-BF6bmZ?expiry=1711940171&endpoints=rpc://10.0.0.162/json-rpc",
      "recipient_id": "utxob:JGV9FPn-rcRxeC1cd-uTHsTF7Mk-Mvj5PKuV8-8y2FjqwHv-BF6bmZ",
      "expiration_timestamp": 1711940171
    }
  ]
}
```

### createCSVPSBT

#### Description

Creates a CSV PSBT (Partially Signed Bitcoin Transaction) for customize csv data.

```javascript
async createCSVPSBT(pubKey, commitment, feeRate = 30)
```

#### Parameters

- pubKey: string - The public key.
- commitment: string - The commitment string.
- feeRate: number (optional) - The fee rate. Default is 30.

#### Example

```javascript
const psbt = await sdk.createCSVPSBT("pubKey", "customize commitment");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "psbt": "cHNidP8BAH0BAAAAARK2XXQGzxi8RNXyjcRsewWB......sAs4yJssEHALeFwVPUFJFVAEgYWJkZXc2dpdGFiZWdpaHBpbWtsb3MA"
  }
}
```

### createMultiAssetPSBT

#### Description

Creates a multi-asset PSBT (Partially Signed Bitcoin Transaction).

```javascript
async createMultiAssetPSBT(pubKey, invoices, feeRate = 120, donation = true)
```

#### Parameters

- pubKey: string - The public key.
- invoices: object - The invoices.
- feeRate: number (optional) - The fee rate. Default is 120.
- donation: boolean (optional) - Whether to include a donation. Default is true.

#### Example

```javascript
const invoices = [
  {
    asset_id: "rgb:2ZyMWs7-3pbiFDwFu-b6ir4LNDT-wamPbBT5B-jXyeRkDnV-BrjP3fr",
    invoice: "rgb:2ZyMWs7-3pbiFDwFu-b6ir4LNDT-wamPbBT5B-jXyeRkDnV-...points=rpc://127.0.0.1:8080/json-rpc",
    recipient_id: "tb:utxob:2bVJDP7-MTAZsTEX6-ksAn2udWY-us1yHuxtG-JJRoCB9rF-Bobnqp",
    amount: 5000,
  },
];
const psbt = await sdk.createMultiAssetPSBT("pubKey", invoices);
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "psbt": "03af972eea......8c7766399e59d0",
    "txid": "a03af972eea88ee0a8aef0a0bad8c7766399e59d029d443f2ee1c8e189d6e1ab"
  }
}
```

### createAssetPSBT

#### Description

Creates an asset PSBT (Partially Signed Bitcoin Transaction).

```javascript
async createAssetPSBT(pubKey, assetId, amounts, invoices, feeRate = 30, donation = true)
```

#### Parameters

- pubKey: string - The public key.
- assetId: string - The asset ID.
- amounts: string - The amounts (comma-separated).
- invoices: string - The invoices (comma-separated).
- feeRate: number (optional) - The fee rate. Default is 30.
- donation: boolean (optional) - Whether to include a donation. Default is true.

#### Example

```javascript
const psbt = await sdk.createAssetPSBT("pubKey", "asset-id", "1000, 2000", "invoice1, invoice2");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "psbtStr": "cHNidP8BAH0BAAAAA...VYAAAABAAAAAACQAAAAA=",
    "recipientIds": "utxob:JGV9FPn-rcRxeC1...v-BF6bmZ,utxob:DxvnPGz-NKfPf...iD-fgpej8nu7-ggheVt",
    "pathList": ["m/86/1/0/9/0/2", "m/86/1/0/9/0/6"],
    "assetId": "rgb:2uxU95k-eh4dzC1y3-tfM2Mka5T-eakP4Rh66-MZiA2vUe1-aMfWoH8"
  }
}
```

### signPSBT

#### Description

Signs a PSBT (Partially Signed Bitcoin Transaction).

```javascript
signPSBT(psbtStr, privKeys);
```

#### Parameters

- psbtStr: string - The PSBT string.
- privKeys: string - The private keys (comma-separated).

#### Example

```javascript
const signedPsbt = sdk.signPSBT("psbtStr", "privKey1, privKey2");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "psbt": "cHNiuywRIV8EKkSjPxX2Ec6CXAc0mmhzkAw...ysUh4RiBrqXbVAAAAACQAABBB0AAAAA"
  }
}
```

### unsignedPSBT

#### Description

Creates an unsigned PSBT (Partially Signed Bitcoin Transaction).

```javascript
unsignedPSBT(utxos, address, amount);
```

#### Parameters

- utxos: object[] - The array of UTXOs.
- address: string - The recipient address.
- amount: number - The amount to send.

#### Example

```javascript
const unsignedPsbt = sdk.unsignedPSBT(utxos, "address", 1000);
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "psbt": "cHNiuywRIV8EKkSjPxX2Ec6CXAc0mmh...sUh4RiBrqXbVAAAAACQAABBB0AAAAA"
  }
}
```

### exportDescriptor

#### Description

Exports the descriptor for a given private key.

```javascript
exportDescriptor(privateKey);
```

#### Parameters

- privateKey: string - The private key.

#### Example

```javascript
const descriptor = sdk.exportDescriptor("privKey");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "pubKey": "wpkh(038f740d3b28bef5d7e6135ef9bac56cefb2998cc0dafe289843f21faf16d04d0e)"
  }
}
```

### exportFullDescriptor

#### Description

Exports the full descriptor for a given mnemonic and path.

```javascript
exportFullDescriptor(mnemonic, path, (password = ""));
```

#### Parameters

- mnemonic: string - The mnemonic.
- path: string - The derivation path.
- password: string (optional) - The password. Default is "".

#### Example

```javascript
const fullDescriptor = sdk.exportFullDescriptor("mnemonic", "m/86/1/0/9");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "pubKey": "wpkh([ce7e53f5/86/1/0/9]tpubDFgEZRx2xohFuZ9uSCnC4d...GtTzULg7vyUZkH3vxY1sRZNyHU4aQaKK4jywe/0/*)"
  }
}
```

### convertExtendPubKey

#### Description

Converts an extended public key.

```javascript
convertExtendPubKey(vpub);
```

#### Parameters

- vpub: string - The extended public key (vpub format).

#### Example

```javascript
const convertedPubKey = sdk.convertExtendPubKey("vpub");
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "pubKey": "tpubDE89YTZ8zcnE7e74aY5ai4uHvqc5DeNp4cQJDWdmcXGyRhzkkq47sEHSehBHZUVAMJ7wekwVumWn6Sowq4JwjCzCVKQz2qSgzD1EV4Qm61W"
  }
}
```

### failTransfer

#### Description

Check for expired transactions and set status to 'failed'

```javascript
async failTransfer(idx = -1, assetOnly = false)
```

#### Parameters

- idx: number (optional) - The transfer index. Default is -1.
- assetOnly: boolean (optional) - Whether to only fail the asset. Default is false.

#### Example

```javascript
const result = await sdk.failTransfer(1, true);
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": false
}
```

### delTransfer

#### Description

Delete a transfer.

```javascript
async delTransfer(idx = -1, assetOnly = false)
```

#### Parameters

- idx: number (optional) - The transfer index. Default is -1.
- assetOnly: boolean (optional) - Whether to only delete the asset. Default is false.

#### Example

```javascript
const result = await sdk.delTransfer(1, true);
```

#### Returns

```json
{
  "code": 0,
  "msg": "success",
  "data": false
}
```
