const bitcoin = require("bitcoinjs-lib");
const request = require("request-promise");

class BiHelixWalletSDK {
  constructor(provider, pubKey, network = "bitcoin") {
    this.provider = provider;
    this.pubKey = pubKey;

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

    return result;
  }

  async assetBalance(assetId) {
    if (!assetId) {
      return { code: 1, msg: "assetId is null!" };
    }

    const result = await this.fetch("/api/get_asset_balance", {
      pk: this.pubKey,
      asset_id: assetId,
    });

    return result;
  }

  async transactionList(assetId) {
    if (!assetId) {
      return { code: 1, msg: "assetId is null!" };
    }

    const result = await this.fetch("/api/transaction_list", {
      pk: this.pubKey,
      asset_id: assetId,
    });

    return result;
  }

  async receiveAsset(recPubKeys, assetId, amounts, assetTypes = "rgb20") {
    if (!recPubKeys) {
      return { code: 1, msg: "recPubKeys is null!" };
    }

    if (!assetId) {
      return { code: 2, msg: "assetId is null!" };
    }

    if (!amounts) {
      return { code: 3, msg: "amounts is null!" };
    }

    const recPubKeyList = recPubKeys.split(",");
    const amountList = amounts.split(",");
    for (let amount of amountList) {
      if (amount <= 0) {
        return { code: 4, msg: "amount cannot be less than 0" };
      }
    }

    let result = await this.assetList(assetTypes);
    if (result.code == 0) {
      const nia = result.data.nia;
      if (nia.length > 0) {
        let curNiaInfo = "";
        for (let niaInfo of nia) {
          if (niaInfo.asset_id == assetId) {
            curNiaInfo = niaInfo;
            break;
          }
        }

        if (!curNiaInfo) {
          return { code: 5, msg: "assetId not found" };
        }

        for (let pubKey of recPubKeyList) {
          result = await this.checkAsset(
            pubKey,
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
        for (let i = 0; i < recPubKeyList.length; i++) {
          const invoice = await this.fetch("/api/receive_asset", {
            pk: recPubKeyList[i],
            asset_id: assetId,
            amount: parseFloat(amountList[i]),
            sender: this.pubKey,
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
            msg: null,
            data: backData,
          };
        }
      }
    }

    return result;
  }

  async createAssetPsbt(assetId, amounts, invoices, donation = true) {
    if (!assetId) {
      return { code: 1, msg: "assetId is null!" };
    }

    if (!amounts) {
      return { code: 2, msg: "amounts is null!" };
    }

    if (!invoices) {
      return { code: 3, msg: "invoices is null!" };
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
      pk: this.pubKey,
      asset_id: assetId,
      invoices: invoiceArr,
      donation: donation,
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
        msg: null,
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
      msg: null,
      data: { psbt: psbt.toBase64() },
    };
  }

  async acceptAsset(psbt, assetId, recipientIds) {
    if (!psbt) {
      return { code: 1, msg: "psbt is null!" };
    }

    if (!assetId) {
      return { code: 2, msg: "assetId is null!" };
    }

    if (!recipientIds) {
      return { code: 3, msg: "recipientIds is null!" };
    }

    const recipientIdList = recipientIds.split(",");
    const result = await this.fetch("/api/accept_asset", {
      pk: this.pubKey,
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
      pk: this.pubKey,
      asset_type: typsList,
    });

    return result;
  }

  async checkAsset(recPubKey, assetId, schema, precision, name, ticker, issuedSupply) {
    const result = await this.fetch("/api/check_asset", {
      pk: recPubKey,
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
}

module.exports = BiHelixWalletSDK;
