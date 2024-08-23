const bitcoin = require("bitcoinjs-lib");
const bitcoinMessage = require("bitcoinjs-message");
const request = require("request-promise");
const bs58check = require("bs58check");
const bip39 = require("bip39");

class BiHelixWalletSDK {
  /**
   * Initializes the BiHelixWalletSDK instance.
   * @param {string} provider - The API provider URL.
   * @param {string} address - The wallet address.
   * @param {string} [network='bitcoin'] - The network to use ('bitcoin', 'testnet', or 'regtest').
   */
  constructor(provider, address, network = "bitcoin") {
    this.provider = provider;
    this.address = address;
    this.network = this.getNetwork(network);
  }

  /**
   * Gets the appropriate network configuration.
   * @param {string} network - The network name.
   * @returns {object} - The network configuration.
   */
  getNetwork(network) {
    const networks = {
      bitcoin: bitcoin.networks.bitcoin,
      testnet: bitcoin.networks.testnet,
      regtest: bitcoin.networks.regtest,
    };
    return networks[network] || bitcoin.networks.bitcoin;
  }

  /**
   * Makes an HTTP request.
   * @param {string} endpoint - The API endpoint.
   * @param {string} [method='POST'] - The HTTP method.
   * @param {object} [body={}] - The request body.
   * @returns {Promise<object>} - The API response.
   */
  async makeRequest(endpoint, method = "POST", body = {}) {
    const options = {
      url: `${this.provider}${endpoint}`,
      method,
      json: true,
      headers: { "content-type": "application/json" },
      body,
    };
    try {
      const result = await request(options);
      if (result.code === 0) {
        result.msg = "success";
      }
      return result;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Validates the provided parameters.
   * @param {object} params - The parameters to validate.
   * @returns {object} - Validation result.
   */
  validateParams(params) {
    for (const [key, value] of Object.entries(params)) {
      if (!value) {
        return { code: 1, msg: `${key} is null!` };
      }
    }
    return { code: 0 };
  }

  /**
   * Parses a comma-separated string into an array.
   * @param {string} input - The comma-separated string.
   * @returns {string[]} - The parsed array.
   */
  parseCommaSeparatedString(input) {
    return input.split(",");
  }

  /**
   * Fetches data from the API.
   * @param {string} uri - The API URI.
   * @param {object} body - The request body.
   * @returns {Promise<object>} - The API response.
   */
  async fetch(uri, body) {
    return this.makeRequest(uri, "POST", body);
  }

  /**
   * Retrieves the list of unspent transactions.
   * @param {string} [address=''] - The wallet address.
   * @param {boolean} [settledOnly=true] - Whether to retrieve only settled transactions.
   * @returns {Promise<object>} - The list of unspent transactions.
   */
  async unspentList(address = "", settledOnly = true) {
    address = address || this.address;
    const validation = this.validateParams({ address });
    if (validation.code !== 0) {
      return validation;
    }
    return this.fetch("/api/list_unspent", { address, settled_only: settledOnly });
  }

  /**
   * Retrieves the asset registry.
   * @returns {Promise<object>} - The asset registry.
   */
  async assetRegistry() {
    return this.makeRequest("/api/get_all_assets", "GET", {});
  }

  /**
   * Retrieves the list of assets.
   * @param {string} assetTypes - The types of assets to retrieve.
   * @returns {Promise<object>} - The list of assets.
   */
  async assetList(assetTypes) {
    const validation = this.validateParams({ assetTypes });
    if (validation.code !== 0) {
      return validation;
    }
    const typsList = this.parseCommaSeparatedString(assetTypes);
    return this.fetch("/api/asset_list", { address: this.address, asset_type: typsList });
  }

  /**
   * Retrieves the balance of a specific asset.
   * @param {string} assetId - The asset ID.
   * @returns {Promise<object>} - The asset balance.
   */
  async assetBalance(assetId) {
    const validation = this.validateParams({ assetId });
    if (validation.code !== 0) {
      return validation;
    }
    return this.fetch("/api/get_asset_balance", { address: this.address, asset_id: assetId });
  }

  /**
   * Retrieves the list of transactions for a specific asset.
   * @param {string} assetId - The asset ID.
   * @param {number} [pageSize=10] - The number of transactions per page.
   * @param {number} [pageNo=1] - The page number.
   * @returns {Promise<object>} - The list of transactions.
   */
  async transactionList(assetId, pageSize = 10, pageNo = 1) {
    const validation = this.validateParams({ assetId });
    if (validation.code !== 0) {
      return validation;
    }
    return this.fetch("/api/transaction_list", {
      address: this.address,
      asset_id: assetId,
      page_size: parseInt(pageSize, 10),
      page_no: parseInt(pageNo, 10),
    });
  }

  /**
   * Accepts multiple assets.
   * @param {string} pubKey - The public key.
   * @param {string} psbt - The partially signed Bitcoin transaction.
   * @param {string} recipientIds - The recipient IDs (comma-separated).
   * @param {string} assetIds - The asset IDs (comma-separated).
   * @returns {Promise<object>} - The API response.
   */
  async acceptMultiAsset(pubKey, psbt, recipientIds, assetIds) {
    const validation = this.validateParams({ pubKey, psbt, recipientIds, assetIds });
    if (validation.code !== 0) {
      return validation;
    }

    const recipientIdList = this.parseCommaSeparatedString(recipientIds);
    const assetIdList = this.parseCommaSeparatedString(assetIds);
    const params = { pk: pubKey, address: this.address, psbt, recipient_ids: recipientIdList, asset_ids: assetIdList };

    return this.fetch("/api/accept_multi_asset", params);
  }

  /**
   * Accepts a specific asset.
   * @param {string} pubKey - The public key.
   * @param {string} psbt - The partially signed Bitcoin transaction.
   * @param {string} recipientIds - The recipient IDs (comma-separated).
   * @param {string} assetId - The asset ID.
   * @returns {Promise<object>} - The API response.
   */
  async acceptAsset(pubKey, psbt, recipientIds, assetId) {
    const validation = this.validateParams({ pubKey, psbt, recipientIds, assetId });
    if (validation.code !== 0) {
      return validation;
    }

    const recipientIdList = this.parseCommaSeparatedString(recipientIds);
    return this.fetch("/api/accept_asset", {
      pk: pubKey,
      address: this.address,
      psbt,
      asset_id: assetId,
      recipient_ids: recipientIdList,
    });
  }

  /**
   * Accepts a Bitcoin asset.
   * @param {string} pubKey - The public key.
   * @param {string} psbt - The partially signed Bitcoin transaction.
   * @param {string} txId - The transaction ID.
   * @returns {Promise<object>} - The API response.
   */
  async acceptBTCAsset(pubKey, psbt, txId) {
    const validation = this.validateParams({ pubKey, psbt, txId });
    if (validation.code !== 0) {
      return validation;
    }

    return this.fetch("/api/accept_btc_asset", { pk: pubKey, address: this.address, psbt, tx_id: txId });
  }

  /**
   * Estimates the gas fee for a transaction.
   * @param {string} assetId - The asset ID.
   * @param {string} [operate='transfer'] - The operation type.
   * @returns {Promise<object>} - The estimated gas fee.
   */
  async estimateGas(assetId, operate = "transfer") {
    const validation = this.validateParams({ assetId, operate });
    if (validation.code !== 0) {
      return validation;
    }

    const params = { address: this.address, asset_id: assetId, operate };
    return this.fetch("/api/estimate_gas", params);
  }

  /**
   * Creates an asset invoice.
   * @param {string} address - The recipient address(es) (comma-separated).
   * @param {string} assetId - The asset ID.
   * @param {string} amounts - The amounts (comma-separated).
   * @param {string} [assetTypes='rgb20'] - The asset types.
   * @param {string} receiverTxids - The receiverTxids (comma-separated).
   * @param {string} receiverVouts - The receiverVouts (comma-separated).
   * @returns {Promise<object>} - The invoice creation result.
   */
  async createAssetInvoice(address, assetId, amounts, assetTypes = "rgb20", receiverTxids = "", receiverVouts = "") {
    const validation = this.validateParams({ address, assetId, amounts });
    if (validation.code !== 0) {
      return validation;
    }

    const addressList = this.parseCommaSeparatedString(address);
    const amountList = this.parseCommaSeparatedString(amounts);
    let receiverTxidList = [];
    let receiverVoutList = [];
    if (receiverTxids) {
      receiverTxidList = this.parseCommaSeparatedString(receiverTxids);
    }
    if (receiverVouts) {
      receiverVoutList = this.parseCommaSeparatedString(receiverVouts);
    }

    for (const amount of amountList) {
      if (amount <= 0) {
        return { code: 4, msg: "amount cannot be less than 0" };
      }
    }

    const result = await this.assetList(assetTypes);
    if (result.code !== 0) {
      return result;
    }

    const assets = result.data.assets;
    const asset = assets.find((a) => a.asset.asset_id === assetId);
    if (!asset) {
      return { code: 5, msg: "assetId not found" };
    }

    for (const address of addressList) {
      const checkResult = await this.checkAsset(address, assetId, asset.asset.asset_iface, asset.asset.precision, asset.asset.name, asset.asset.ticker, asset.asset.issued_supply);
      if (checkResult.code !== 0) {
        return checkResult;
      }
    }

    const backData = [];
    for (let i = 0; i < addressList.length; i++) {
      let params = {
        address: addressList[i],
        asset_id: assetId,
        amount: parseFloat(amountList[i]),
      };
      if (receiverTxidList.length > 0) {
        params["receiver_txid"] = receiverTxidList[i];
      }
      if (receiverVoutList.length > 0) {
        params["receiver_vout"] = receiverVoutList[i];
      }
      const invoice = await this.fetch("/api/receive_asset", params);

      if (invoice.code !== 0) {
        return invoice;
      }
      backData.push(invoice.data);
    }

    return { code: 0, msg: "success", data: backData };
  }

  /**
   * Creates a CSV PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} pubKey - The public key.
   * @param {string} commitment - The commitment string.
   * @param {number} [feeRate=30] - The fee rate.
   * @returns {Promise<object>} - The PSBT creation result.
   */
  async createCSVPSBT(pubKey, commitment, feeRate = 30) {
    const validation = this.validateParams({ pubKey, commitment });
    if (validation.code !== 0) {
      return validation;
    }

    if (commitment.length !== 32) {
      return { code: 1, msg: "commitment length must be 32!" };
    }

    const params = { pubKey, commitment, fee_rate: parseFloat(feeRate) };
    return this.fetch("/api/build_csv_psbt", params);
  }

  /**
   * Creates a multi-asset PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} pubKey - The public key.
   * @param {object} invoices - The invoices.
   * @param {number} [feeRate=120] - The fee rate.
   * @param {boolean} [donation=true] - Whether to include a donation.
   * @returns {Promise<object>} - The PSBT creation result.
   */
  async createMultiAssetPSBT(pubKey, invoices, feeRate = 120, donation = true) {
    const validation = this.validateParams({ pubKey, invoices });
    if (validation.code !== 0) {
      return validation;
    }

    const params = { pk: pubKey, invoices, address: this.address, fee_rate: parseFloat(feeRate), donation };
    return this.fetch("/api/create_multi_asset_psbt", params);
  }

  /**
   * Creates an asset PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} pubKey - The public key.
   * @param {string} assetId - The asset ID.
   * @param {string} amounts - The amounts (comma-separated).
   * @param {string} invoices - The invoices (comma-separated).
   * @param {number} [feeRate=30] - The fee rate.
   * @param {boolean} [donation=true] - Whether to include a donation.
   * @returns {Promise<object>} - The PSBT creation result.
   */
  async createAssetPSBT(pubKey, assetId, amounts, invoices, feeRate = 30, donation = true) {
    const validation = this.validateParams({ pubKey, assetId, amounts, invoices });
    if (validation.code !== 0) {
      return validation;
    }

    const amountList = this.parseCommaSeparatedString(amounts);
    const invoiceList = this.parseCommaSeparatedString(invoices);

    const invoiceArr = [];
    let recipientIds = "";
    for (let i = 0; i < invoiceList.length; i++) {
      const invoice = invoiceList[i];
      const invoiceRes = await this.decodeInvoice(invoice);
      if (invoiceRes.code !== 0) {
        return invoiceRes;
      }

      const recipientId = invoiceRes.data.recipient_id;
      invoiceArr.push({
        invoice,
        recipient_id: recipientId,
        amount: parseFloat(amountList[i]),
      });

      recipientIds = recipientIds ? `${recipientIds},${recipientId}` : recipientId;
    }

    const createPsbtRes = await this.fetch("/api/create_asset_psbt", {
      pk: pubKey,
      address: this.address,
      asset_id: assetId,
      invoices: invoiceArr,
      donation,
      fee_rate: parseFloat(feeRate),
    });

    if (createPsbtRes.code !== 0) {
      return createPsbtRes;
    }

    const psbtStr = createPsbtRes.data.psbt;
    const psbt = bitcoin.Psbt.fromBase64(psbtStr);
    const pathList = psbt.data.inputs.map((input) => input.bip32Derivation[0].path);

    return { code: 0, msg: "success", data: { psbtStr, recipientIds, pathList, assetId } };
  }

  /**
   * Creates a Bitcoin PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} pubKey - The public key.
   * @param {string} receiver - The recipient Bitcoin address.
   * @param {number} feeRate - The fee rate in satoshis per byte.
   * @param {number} amount - The amount to send in satoshis.
   * @returns {Promise<object>} - The PSBT creation result.
   */
  async createBTCPSBT(pubKey, receiver, feeRate, amount) {
    const validation = this.validateParams({ pubKey, receiver, feeRate, amount });
    if (validation.code !== 0) {
      return validation;
    }

    return this.fetch("/api/create_btc_psbt", { pk: pubKey, address: this.address, to_address: receiver, fee_rate: parseFloat(feeRate), amount: parseInt(amount) });
  }

  /**
   * Signs a PSBT (Partially Signed Bitcoin Transaction).
   * @param {string} psbtStr - The PSBT string.
   * @param {string} privKeys - The private keys (comma-separated).
   * @returns {object} - The signed PSBT.
   */
  signPSBT(psbtStr, privKeys) {
    const validation = this.validateParams({ psbtStr, privKeys });
    if (validation.code !== 0) {
      return validation;
    }

    const privKeyList = this.parseCommaSeparatedString(privKeys);
    const psbt = bitcoin.Psbt.fromBase64(psbtStr);
    psbt.data.inputs.forEach((input, index) => {
      const keyPair = bitcoin.ECPair.fromWIF(privKeyList[index], this.network);
      psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();
    return { code: 0, msg: "success", data: { psbt: psbt.toBase64() } };
  }

  /**
   * Creates an unsigned PSBT (Partially Signed Bitcoin Transaction).
   * @param {object[]} utxos - The array of UTXOs.
   * @param {string} address - The recipient address.
   * @param {number} amount - The amount to send.
   * @returns {object} - The unsigned PSBT.
   */
  unsignedPSBT(utxos, address, amount) {
    const validation = this.validateParams({ utxos, address });
    if (validation.code !== 0) {
      return validation;
    }

    const psbt = new bitcoin.Psbt();
    utxos.forEach((utxo) => {
      psbt.addInput({
        hash: utxo.hash,
        index: utxo.index,
        value: utxo.value,
        nonWitnessUtxo: utxo.rawData,
      });
    });

    psbt.addOutput({ address, value: amount });
    return { code: 0, msg: "success", data: { psbt: psbt.toBase64() } };
  }

  /**
   * Exports the descriptor for a given private key.
   * @param {string} privateKey - The private key.
   * @returns {object} - The descriptor.
   */
  exportDescriptor(privateKey) {
    const validation = this.validateParams({ privateKey });
    if (validation.code !== 0) {
      return validation;
    }

    const keyPair = bitcoin.ECPair.fromWIF(privateKey, this.network);
    const wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.network });
    return { code: 0, msg: "success", data: { pubKey: `wpkh(${wpkh.pubkey.toString("hex")})` } };
  }

  /**
   * Exports the full descriptor for a given mnemonic and path.
   * @param {string} mnemonic - The mnemonic.
   * @param {string} path - The derivation path.
   * @param {string} [password=''] - The password (optional).
   * @returns {object} - The full descriptor.
   */
  exportFullDescriptor(mnemonic, path, password = "") {
    const validation = this.validateParams({ mnemonic, path });
    if (validation.code !== 0) {
      return validation;
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic, password);
    const root = bitcoin.bip32.fromSeed(seed, this.network);
    const child = root.derivePath(path);
    const fingerprint = root.fingerprint.toString("hex");
    const publicKey = child.neutered().toBase58();
    const newPath = path.replace(/[m]/g, fingerprint).replace(/[']/g, "h");
    return { code: 0, msg: "success", data: { pubKey: `wpkh([${newPath}]${publicKey}/0/*)` } };
  }

  /**
   * Converts an extended public key.
   * @param {string} vpub - The extended public key (vpub format).
   * @returns {object} - The converted public key.
   */
  convertExtendPubKey(vpub) {
    const validation = this.validateParams({ vpub });
    if (validation.code !== 0) {
      return validation;
    }

    const tpubPrefix = Buffer.from(this.network.bip32.public.toString(16).padStart(8, "0"), "hex").toString("hex");
    let data = bs58check.decode(vpub).slice(4);
    data = Buffer.concat([Buffer.from(tpubPrefix, "hex"), data]);
    return { code: 0, msg: "success", data: { pubKey: bs58check.encode(data) } };
  }

  /**
   * Signs a message using a private key.
   *
   * This function takes a private key in WIF format and a message, and generates
   * a signature using the ECPair and bitcoinMessage libraries. The signed message
   * is then encoded in base64 format and returned.
   *
   * @param {string} privkey - The private key in Wallet Import Format (WIF).
   * @param {string} msg - The message to be signed.
   * @returns {Object} - An object containing the status code, message, and the signed message.
   */
  signMessage(privkey, msg) {
    const keyPair = bitcoin.ECPair.fromWIF(privkey, this.network);
    const signature = bitcoinMessage.sign(msg, keyPair.privateKey, keyPair.compressed);
    const signMsg = signature.toString("base64");

    return { code: 0, msg: "success", data: { signMsg: signMsg } };
  }

  /**
   * Checks an asset.
   * @param {string} address - The wallet address.
   * @param {string} assetId - The asset ID.
   * @param {string} schema - The asset schema.
   * @param {number} precision - The asset precision.
   * @param {string} name - The asset name.
   * @param {string} ticker - The asset ticker.
   * @param {string} issuedSupply - The issued supply of the asset.
   * @returns {Promise<object>} - The asset check result.
   */
  async checkAsset(address, assetId, schema, precision, name, ticker, issuedSupply) {
    const params = {
      address,
      asset_id: assetId,
      schema,
      precision: parseInt(precision, 10),
      name,
      ticker,
      issued_supply: issuedSupply.toString(),
    };
    return this.fetch("/api/check_asset", params);
  }

  /**
   * Decodes an invoice.
   * @param {string} invoice - The invoice string.
   * @returns {Promise<object>} - The decoded invoice.
   */
  async decodeInvoice(invoice) {
    const validation = this.validateParams({ invoice });
    if (validation.code !== 0) {
      return validation;
    }
    return this.fetch("/api/decode_invoice", { invoice });
  }
}

module.exports = BiHelixWalletSDK;
