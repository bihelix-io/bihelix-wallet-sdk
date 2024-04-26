const bitcoin = require("bitcoinjs-lib");
const request = require("request-promise");
const bip39 = require("bip39");

/**
 * Represents the BiHelixWalletSDK class.
 */
class BiHelixWalletSDK {
  /**
   * Creates an instance of BiHelixWalletSDK.
   * @param {string} provider - The provider URL.
   * @param {string} address - The wallet address.
   * @param {string} [network="bitcoin"] - The network type (bitcoin, testnet, regtest).
   */
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

  /**
   * Fetches data from the provider.
   * @param {string} uri - The URI to fetch.
   * @param {object} body - The request body.
   * @returns {Promise<object>} The fetched data.
   */
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

  /**
   * Retrieves the balance of a specific asset.
   * @param {string} assetId - The ID of the asset.
   * @returns {Promise<object>} The asset balance.
   */
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

  /**
   * Retrieves the transaction list of a specific asset.
   * @param {string} assetId - The ID of the asset.
   * @returns {Promise<object>} The transaction list.
   */
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

  /**
   * Creates an asset invoice.
   * @param {string} address - The recipient address.
   * @param {string} assetId - The ID of the asset.
   * @param {string} amounts - The amounts to send.
   * @param {string} [assetTypes="rgb20"] - The types of assets.
   * @returns {Promise<object>} The created asset invoice.
   */
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

  /**
   * Creates an asset PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} pubKey - The public key.
   * @param {string} assetId - The ID of the asset.
   * @param {string} amounts - The amounts to send.
   * @param {string} invoices - The invoices.
   * @param {number} [feeRate=30] - The free rate.
   * @param {boolean} [donation=true] - Whether to include a donation.
   * @returns {Promise<object>} The created asset PSBT.
   */
  async createAssetPSBT(pubKey, assetId, amounts, invoices, feeRate = 30, donation = true) {
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

    feeRate = parseFloat(feeRate);
    if (!feeRate) {
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
      fee_rate: feeRate,
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

  /**
   * Signs a PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} psbtStr - The PSBT string.
   * @param {string} privKeys - The private keys.
   * @returns {Promise<object>} The signed PSBT.
   */
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

  /**
   * Creates an unsigned PSBT (Partially Signed Bitcoin Transaction).
   * @param {Array<object>} utxoArray - The array of UTXOs.
   * @param {string} address - The recipient address.
   * @param {number} amount - The amount to send.
   * @returns {object} The unsigned PSBT.
   */
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

  /**
   * Accepts an asset.
   * @param {string} pubKey - The public key.
   * @param {string} psbt - The PSBT.
   * @param {string} assetId - The ID of the asset.
   * @param {string} recipientIds - The recipient IDs.
   * @returns {Promise<object>} The result of accepting the asset.
   */
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

  /**
   * Retrieves the list of assets.
   * @param {string} assetTypes - The types of assets.
   * @returns {Promise<object>} The list of assets.
   */
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

  /**
   * Checks the validity of an asset.
   * @param {string} address - The address.
   * @param {string} assetId - The ID of the asset.
   * @param {string} schema - The asset schema.
   * @param {number} precision - The asset precision.
   * @param {string} name - The asset name.
   * @param {string} ticker - The asset ticker.
   * @param {string} issuedSupply - The issued supply of the asset.
   * @returns {Promise<object>} The result of checking the asset.
   */
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

  /**
   * Decodes an invoice.
   * @param {string} invoice - The invoice to decode.
   * @returns {Promise<object>} The decoded invoice.
   */
  async decodeInvoice(invoice) {
    if (!invoice) {
      return { code: 1, msg: "invoice is null!" };
    }

    const result = await this.fetch("/api/decode_invoice", {
      invoice,
    });

    return result;
  }

  /**
   * Exports the descriptor for a private key.
   * @param {string} privateKey - The private key.
   * @returns {object} The exported descriptor.
   */
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

  /**
   * Exports the full descriptor for a mnemonic.
   * @param {string} mnemonic - The mnemonic.
   * @param {string} path - The derivation path.
   * @param {string} [password=""] - The password.
   * @returns {object} The exported full descriptor.
   */
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

  /**
   * Retrieves the list of unspent transactions.
   * @param {string} [address=""] - The address.
   * @param {boolean} [settledOnly=true] - Whether to include only settled transactions.
   * @returns {Promise<object>} The list of unspent transactions.
   */
  async unspentList(address = "", settledOnly = true) {
    address = address ? address : this.address;

    const result = await this.fetch("/api/list_unspent", {
      address,
      settled_only: settledOnly,
    });

    return result;
  }

  /**
   * Retrieves the list of registry assets.
   * @returns {Promise<object>} The list of registry assets.
   */
  async assetRegistry() {
    const result = await request({
      url: this.provider + "/api/get_all_assets",
      method: "GET",
      json: true,
      headers: { "content-type": "application/json" },
      body: {},
    });

    if (result.code == 0) {
      result.msg = "success";
    }

    return result;
  }
}

module.exports = BiHelixWalletSDK;
