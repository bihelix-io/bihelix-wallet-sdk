const bitcoin = require("bitcoinjs-lib");
const request = require("request-promise");

class BiHelixWalletSDK {
  constructor(provider, address, network = "bitcoin") {
    this.provider = provider;
    this.address = address;

    if (network == "testnet") {
      this.network = bitcoin.networks.testnet;
    } else if (network == "regtest") {
      this.network = bitcoin.networks.regtest;
    } else {
      this.network = bitcoin.networks.bitcoin;
    }
  }

  async fetch(uri, body) {
    const result = await request({
      url: this.provider + uri,
      method: "POST",
      json: true,
      headers: { "content-type": "application/json" },
      body,
    });

    if (result.code == 0) {
      result.msg = "success";
    }

    return result;
  }

  async assetBalance(assetId) {
    if (!assetId) {
      return { code: 1, msg: "assetId is null!" };
    }

    const result = await this.fetch("/api/get_asset_balance", {
      address: this.address,
      asset_id: assetId,
    });

    return result;
  }

  async transactionList(assetId) {
    if (!assetId) {
      return { code: 1, msg: "assetId is null!" };
    }

    const result = await this.fetch("/api/transaction_list", {
      address: this.address,
      asset_id: assetId,
    });

    return result;
  }

  async createAssetInvoice(address, assetId, amounts, assetTypes = "rgb20") {
    if (!address) {
      return { code: 1, msg: "address is null!" };
    }

    if (!assetId) {
      return { code: 2, msg: "assetId is null!" };
    }

    if (!amounts) {
      return { code: 3, msg: "amounts is null!" };
    }

    const addressList = address.split(",");
    const amountList = amounts.split(",");
    for (let amount of amountList) {
      if (amount <= 0) {
        return { code: 4, msg: "amount cannot be less than 0" };
      }
    }

    let result = await this.assetList(assetTypes);
    if (result.code == 0) {
      const nia = result.data.assets;
      if (nia.length > 0) {
        let curNiaInfo = "";
        for (let niaInfo of nia) {
          if (niaInfo.asset.asset_id == assetId) {
            curNiaInfo = niaInfo.asset;
            break;
          }
        }

        if (!curNiaInfo) {
          return { code: 5, msg: "assetId not found" };
        }

        for (let address of addressList) {
          result = await this.checkAsset(
            address,
            assetId,
            curNiaInfo.asset_iface,
            curNiaInfo.precision,
            curNiaInfo.name,
            curNiaInfo.ticker,
            curNiaInfo.issued_supply
          );

          if (result.code != 0) {
            return result;
          }
        }

        const backData = [];
        for (let i = 0; i < addressList.length; i++) {
          const invoice = await this.fetch("/api/receive_asset", {
            address: addressList[i],
            asset_id: assetId,
            amount: parseFloat(amountList[i]),
          });

          if (invoice.code != 0) {
            return invoices;
          } else {
            backData.push(invoice.data);
          }
        }

        if (backData.length > 0) {
          return {
            code: 0,
            msg: "success",
            data: backData,
          };
        }
      }
    }

    return result;
  }

  async createAssetPSBT(pubKey, assetId, amounts, invoices, freeRate = 30, donation = true) {
    if (!pubKey) {
      return { code: 1, msg: "pubKey is null!" };
    }

    if (!assetId) {
      return { code: 2, msg: "assetId is null!" };
    }

    if (!amounts) {
      return { code: 3, msg: "amounts is null!" };
    }

    if (!invoices) {
      return { code: 4, msg: "invoices is null!" };
    }

    freeRate = parseFloat(freeRate);
    if (!freeRate) {
      return { code: 5, msg: "feeRate cannot be less than 0!" };
    }

    const amountList = amounts.split(",");
    const invoiceList = invoices.split(",");

    const invoiceArr = [];
    let recipientIds = "";
    for (let i = 0; i < invoiceList.length; i++) {
      let invoice = invoiceList[i];
      let invoiceRes = await this.decodeInvoice(invoice);
      if (invoiceRes.code == 0) {
        let recipientId = invoiceRes.data.recipient_id;
        invoiceArr.push({
          invoice: invoice,
          recipient_id: recipientId,
          amount: parseFloat(amountList[i]),
        });
        if (!recipientIds) {
          recipientIds = recipientId;
        } else {
          recipientIds = recipientIds + "," + recipientId;
        }
      } else {
        return invoiceRes;
      }
    }

    const createPsbtRes = await this.fetch("/api/create_asset_psbt", {
      pk: pubKey,
      address: address,
      asset_id: assetId,
      invoices: invoiceArr,
      donation: donation,
      free_rate: freeRate,
    });

    if (createPsbtRes.code == 0) {
      let psbtStr = createPsbtRes.data.psbt;
      const psbt = bitcoin.Psbt.fromBase64(psbtStr);
      const inputs = psbt.data.inputs;
      let pathList = [];
      inputs.forEach((input) => {
        let curPath = input.bip32Derivation[0].path;
        pathList.push(curPath);
      });

      return {
        code: 0,
        msg: "success",
        data: {
          psbtStr,
          recipientIds,
          pathList,
          assetId,
        },
      };
    }

    return createPsbtRes;
  }

  async signPSBT(psbtStr, privKeys) {
    if (!psbtStr) {
      return { code: 1, msg: "psbtStr is null!" };
    }

    if (!privKeys) {
      return { code: 2, msg: "privKeys is null!" };
    }

    const privKeyList = privKeys.split(",");
    const psbt = bitcoin.Psbt.fromBase64(psbtStr);
    const inputs = psbt.data.inputs;
    inputs.forEach((input, index) => {
      const keyPair = bitcoin.ECPair.fromWIF(privKeyList[index], this.network);
      psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();

    return {
      code: 0,
      msg: "success",
      data: { psbt: psbt.toBase64() },
    };
  }

  unsignedPSPB(utxoArray, address, amount) {
    const psbt = new bitcoin.Psbt();
    utxoArray.forEach((utxo) => {
      psbt.addInput({
        hash: utxo.hash,
        index: utxo.index,
        value: utxo.value,
        nonWitnessUtxo: utxo.rawData,
      });
    });

    psbt.addOutput({
      address: address,
      value: amount,
    });

    const unsignedPsbt = psbt.toBase64();
    return {
      code: 0,
      msg: "success",
      data: { psbt: unsignedPsbt },
    };
  }

  async acceptAsset(pubKey, psbt, assetId, recipientIds) {
    if (!pubKey) {
      return { code: 1, msg: "pubKey is null!" };
    }

    if (!psbt) {
      return { code: 2, msg: "psbt is null!" };
    }

    if (!assetId) {
      return { code: 3, msg: "assetId is null!" };
    }

    if (!recipientIds) {
      return { code: 4, msg: "recipientIds is null!" };
    }

    const recipientIdList = recipientIds.split(",");
    const result = await this.fetch("/api/accept_asset", {
      pk: pubKey,
      address: this.address,
      psbt,
      asset_id: assetId,
      recipient_ids: recipientIdList,
    });

    return result;
  }

  async assetList(assetTypes) {
    if (!assetTypes) {
      return { code: 1, msg: "assetTypes is null!" };
    }

    const typsList = assetTypes.split(",");
    const result = await this.fetch("/api/asset_list", {
      address: this.address,
      asset_type: typsList,
    });

    return result;
  }

  async checkAsset(address, assetId, schema, precision, name, ticker, issuedSupply) {
    const result = await this.fetch("/api/check_asset", {
      address: address,
      asset_id: assetId,
      schema,
      precision: parseInt(precision),
      name,
      ticker,
      issued_supply: issuedSupply.toString(),
    });

    return result;
  }

  async decodeInvoice(invoice) {
    if (!invoice) {
      return { code: 1, msg: "invoice is null!" };
    }

    const result = await this.fetch("/api/decode_invoice", {
      invoice,
    });

    return result;
  }

  exportDescriptor(privateKey) {
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, this.network);
    const wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.network });
    const pubKey = "wpkh(" + wpkh.pubkey.toString("hex") + ")";

    return {
      code: 0,
      msg: "success",
      data: {
        pubKey,
      },
    };
  }

  exportFullDescriptor(mnemonic, path, password = "") {
    if (!mnemonic) {
      return { code: 1, msg: "mnemonic is null!" };
    }

    if (!path) {
      return { code: 1, msg: "path is null!" };
    }

    let seed = "";
    if (password) {
      seed = bip39.mnemonicToSeedSync(mnemonic, password);
    } else {
      seed = bip39.mnemonicToSeedSync(mnemonic);
    }

    const root = bitcoin.bip32.fromSeed(seed, this.network);
    const child = root.derivePath(path);
    const keyPair = bitcoin.ECPair.fromPrivateKey(child.privateKey, { network: this.network });
    const fingerprint = root.fingerprint.toString("hex");
    const publicKey = child.neutered().toBase58();
    const newPath = path.replace(/[m]/g, fingerprint);
    const replacePath = newPath.replace(/[']/g, "h");
    const pubKey = "wpkh([" + replacePath + "]" + publicKey + "/0/*)";

    return {
      code: 0,
      msg: "success",
      data: {
        pubKey,
      },
    };
  }

  async unspentList(address = "", settledOnly = true) {
    address = address ? address : this.address;

    const result = await this.fetch("/api/list_unspent", {
      address,
      settled_only: settledOnly,
    });

    return result;
  }
}

module.exports = BiHelixWalletSDK;
