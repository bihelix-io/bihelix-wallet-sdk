const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const bip32 = require('bip32');
const request = require('request-promise');

const LANGUAGE_LIST = {
  1: "chinese_simplified", 
  2: "chinese_traditional",
  3: "english",
  4: "japanese",
  5: "spanish",
  6: "italian",
  7: "french",
  8: "korean"
};

class BiHelixWalletSDK {
  /**
   * @param {string} provider
   * @param {json} options  
   */
  constructor(provider, options = {}) {
    let {network='bitcoin', mnemonic='', password='', languageType=3} = options;
    bip39.setDefaultWordlist(LANGUAGE_LIST[languageType]);
    this.serverUrl = provider;
    this.mnemonic = mnemonic == '' ? bip39.generateMnemonic() : mnemonic;
    this.password = password;
    this.seed = bip39.mnemonicToSeedSync(this.mnemonic, this.password) || '';
    if (network == 'testnet') {
      this.network = bitcoin.networks.testnet;
    } else if (network == 'regtest') {
      this.network = bitcoin.networks.regtest;
    } else {
      this.network = bitcoin.networks.bitcoin;
    }
  }

  /**
   * get mnemonic
   */
  getMnemonic () {
    let str = this.mnemonic.replace(/\s/g, ',');

    return {"code":0, "msg":"success", data:{"mnemonic":str}};
  }

  /**
   * get publickey/address/privatekey by mnemonic
   * @param {string} mnemonic
   */
  getPubPrivKey(mnemonic, password='', derivationPath="m/86'/1'/0'/9", type='rgb') {
    if (!mnemonic) {
      return {"code":1, "msg":"mnemonic is null!"};
    }

    let publicKey = '';
    let address = '';
    let privateKey = '';
    switch (type) {
      case "rgb":
        let network = this.network;
        let seed = '';
        if (password) {
          seed = bip39.mnemonicToSeedSync(mnemonic, password);
        } else {
          seed = bip39.mnemonicToSeedSync(mnemonic);
        }
        let root = bip32.fromSeed(seed, network);
        if (derivationPath) {
          root = bitcoin.bip32.fromSeed(seed);
          const child = root.derivePath(derivationPath);
          const keyPair = bitcoin.ECPair.fromPrivateKey(child.privateKey, {network: network});
          privateKey = keyPair.toWIF();
          publicKey = bip32.fromPublicKey(keyPair.publicKey, child.chainCode, network).toBase58();
          const p2wpkhRes = bitcoin.payments.p2wpkh({pubkey: keyPair.publicKey, network});
          address = p2wpkhRes.address;
        } else {
          privateKey = root.toWIF();
          publicKey = root.neutered().toBase58();
          const p2wpkhRes = bitcoin.payments.p2wpkh({pubkey: root.publicKey, network});
          address = p2wpkhRes.address;
        }
        break;
    }

    return {"code":0, "msg":"success", "data":{"pubKey":publicKey, address, privateKey}};
  }

  /**
   * create rgb wallet
   */
  async createRGBWallet(mnemonic='', password='', derivationPath="m/86'/1'/0'/9", feeRate=1.5, upTo=true) {
    this.mnemonic = mnemonic ? mnemonic : this.mnemonic;
    this.password = password ? password : this.password;
    let pkAddrPrivate = this.getPubPrivKey(this.mnemonic, password, derivationPath);
    let walletInfo = {};
    if (pkAddrPrivate.code == 0) {
      let data = pkAddrPrivate.data;
      let address = data.address;
      let pubKey = data.pubKey;
      let privateKey = data.privateKey;
      walletInfo = {pubKey, address, privateKey, mnemonic:this.mnemonic};
    
      let params = {"pk":pubKey};
      let result = await request({
        url: this.serverUrl + "/api/wallet",
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body:params
      });
      
      if (result.code == 0) { // create wallet success
        result.msg = 'success';
        let beforeUtxo = await this.beforeCreateUtxo(pubKey, feeRate, upTo);
        if (beforeUtxo.code == 0) {
          let endUtxo = await this.endCreateUtxo(pubKey, beforeUtxo.data.psbt);
        }
      }

      result['data'] = walletInfo;
      return result;
    } else {
       return {"code":2, "msg":"create wallet fail!"};
    }
  }

  /**
   * assetTypes "rgb20", "rgb21", "rgb25"
   */
  async assetList(pubKey, assetTypes) {
    if (!assetTypes) {
      return {"code":1, "msg":"assetTypes is null!"};
    }

    if (!pubKey) {
      return {"code":2, "msg":"pubKey is null!"};
    }

    let typsList = assetTypes.split(',');
    
    for (let type of typsList) {
      if (["rgb20", "rgb21", "rgb25", "RGB20", "RGB21", "RGB25"].indexOf(type) == -1) {
        return {"code":3, "msg":"asset type is error!"};
      }
    }

    let params = {"pk":pubKey, "asset_type":typsList};
    let result = await request({
      url: this.serverUrl + "/api/list_assets",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    }

    return result;
  }

  async getAssetBalance(pubKey, assetId) {
    if (!assetId) {
      return {"code":1, "msg":"assetId is null!"};
    }
    
    if (!pubKey) {
      return {"code":2, "msg":"pubKey is null!"};
    }

    let params = {"pk":pubKey, "asset_id":assetId};
    let result = await request({
      url: this.serverUrl + "/api/get_asset_balance",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async recieve(recPubKey, sendPubKey, assetId, amount, assetTypes='rgb20,rgb21,rgb25') {
    if (!recPubKey) {
      return {"code":1, "msg":"recPubKey is null!"};
    }

    if (!sendPubKey) {
      return {"code":2, "msg":"sendPubKey is null!"};
    }

    if (!assetId) {
      return {"code":3, "msg":"assetId is null!"};
    }

    if (amount <= 0) {
      return {"code":4, "msg":"amount cannot be less than 0!"};
    }
    
    let result = await this.assetList(sendPubKey, assetTypes);
    if (result.code == 0) {
      let nia = result.data.nia;
      if(nia.length > 0) {
        let niaData = nia[0];
        let assetId = niaData.asset_id;
        let schema = niaData.asset_iface;
        let ticker = niaData.ticker;
        let name = niaData.name;
        let precision = niaData.precision;
        let issuedSupply = niaData.issued_supply;
        result = await this.checkAsset(recPubKey, assetId, schema, precision, name, ticker, issuedSupply);
        if (result.code == 0) {
          let params = {"pk":recPubKey, "asset_id":assetId, "amount":parseFloat(amount)};
          if (sendPubKey) {
            params["sender"] = sendPubKey;
          }
          result = await request({
            url: this.serverUrl + "/api/recieve",
            method: "POST",
            json: true,
            headers: {"content-type": "application/json"},
            body:params
          });

          if (result.code == 0) {
            result.msg = 'success';
          } 

          return result;
        }
      }
    }

    return result;
  }

  async checkAsset(pubKey, assetId, schema, precision, name, ticker, issuedSupply) {
    let params = {"pk":pubKey, "asset_id":assetId, "schema":schema, "precision":parseInt(precision), "name":name, "ticker":ticker, "issued_supply":issuedSupply.toString()};
    let result = await request({
      url: this.serverUrl + "/api/check_asset",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async send(pubKey, assetId, amounts, invoices, donation=false) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!assetId) {
      return {"code":2, "msg":"assetId is null!"};
    }
    
    let amountList = [];
    if (!Array.isArray(amounts)) {
      amountList = amounts.split(',');
    } else {
      amountList = amounts;
    }

    let invoiceList = [];
    if (!Array.isArray(invoices)) {
      invoiceList = invoices.split(',');
    } else {
      invoiceList = invoices;
    }

    if (!amountList || amountList.length <= 0) {
      return {"code":3, "msg":"amounts is null!"};
    }

    if (!invoiceList || invoiceList.length <= 0) {
      return {"code":4, "msg":"invoices is null!"};
    }

    if (invoiceList.length != amountList.length) {
      return {"code":5, "msg":"The quantity of amounts and invoices is incorrect!"};
    }

    let invoiceArr = [];
    let invoiceRes = '';
    let recipientIdList = [];
    for (let i=0; i<invoiceList.length; i++) {
      let invoice = invoiceList[i];
      invoiceRes = await this.decodeInvoice(invoice);
      if (invoiceRes.code == 0) {
        let recipientId = invoiceRes.data.recipient_id;
        invoiceArr.push({
          "invoice": invoice,
          "recipient_id": recipientId,
          "amount": parseFloat(amountList[i])
        });
        recipientIdList.push(recipientId);
      }
    }

    if (invoiceArr.length > 0) {
      let beforeRes = await this.beforeSend(pubKey, assetId, donation, invoiceArr);
      if (beforeRes.code == 0) {
        let psbtStr = beforeRes.data.psbt;
        const psbt = bitcoin.Psbt.fromBase64(psbtStr);
        const inputs = psbt.data.inputs;
        inputs.forEach((input, index) => {
          let curPath = input.bip32Derivation[0].path;
          let {privateKey} = this.getPrivateByPath(this.mnemonic, curPath, this.password);
          let network = this.network;
          const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);
          psbt.signInput(index, keyPair);
        });
        psbt.finalizeAllInputs();
        const signedPsbtStr = psbt.toBase64();
        let endRes = await this.endSend(pubKey, signedPsbtStr, assetId, recipientIdList);
        return endRes;
      } else {
        return beforeRes;
      }
    } else {
      return invoiceRes;
    };

  }

  async createUtxo(pubKey, mnemonic, upTo, feeRate) {
    if (!mnemonic) {
      return {"code":1, "msg":"mnemonic is null!"};
    }

    if (!pubKey) {
      return {"code":2, "msg":"pubKey is null!"};
    }

    if (feeRate <= 0) {
      return {"code":3, "msg":"feeRate cannot be less than 0!"};
    }

    upTo = upTo == 'true' ? true : false;
    let params = {"pk":pubKey, "mnemonic":mnemonic, "up_to":upTo, "fee_rate":parseFloat(feeRate)};
    let result = await request({
      url: this.serverUrl + "/api/create_utxo",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async decodeInvoice(invoice) {
    if (!invoice) {
      return {"code":1, "msg":"invoice is null!"};
    }

    let params = {"invoice":invoice};
    let result = await request({
      url: this.serverUrl + "/api/decode_invoice",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  isUpperCase(str) {
      var regex = /^[A-Z]+$/;
      
      return regex.test(str);
  }

  async issue(pubKey, ticker, name, presision, amounts) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!ticker || ticker.length > 8) {
      return {"code":2, "msg":"Ticker cannot be empty and the length cannot be greater than 8!"};
    }

    if (!this.isUpperCase(ticker)) {
      return {"code":3, "msg":"Ticker must be capitalized!"};
    }

    if (!name) {
      return {"code":4, "msg":"name is null!"};
    }

    if (presision <= 0) {
      return {"code":5, "msg":"presision cannot be less than 0!"};
    }

    let amountList = amounts.split(',');
    let list = [];
    for (let a of amountList) {
      if (a <= 0) {
        return {"code":5, "msg":"amounts cannot be less than 0!"};
      }
      list.push(parseInt(a));
    }

    presision = parseInt(presision);
    let params = {"pk":pubKey, "ticker":ticker, "name":name, "presision":presision, "amounts":list};
    let result = await request({
      url: this.serverUrl + "/api/issue",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async listUnspent(pubKey, settledOnly) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    let flag = settledOnly == 'true' ? true : false;
    let params = {"pk":pubKey, "settled_only":flag};
    let result = await request({
      url: this.serverUrl + "/api/list_unspent",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }
  
  async refresh(pubKey) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    let params = {"pk":pubKey};
    let result = await request({
      url: this.serverUrl + "/api/refresh",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async transfer(reciPubKeys, sendPubKey, assetId, amounts, donation=false, assetTypes='rgb20,rgb21,rgb25') { 
    if (!reciPubKeys) {
      return {"code":1, "msg":"reciPubKeys is null!"};
    }

    if (!assetId) {
      return {"code":2, "msg":"assetId is null!"};
    }

    if (!sendPubKey) {
      return {"code":3, "msg":"sendPubKey is null!"};
    }

    if (!amounts) {
      return {"code":4, "msg":"amounts is null!"};
    }
    
    let recPkList = reciPubKeys.split(',');
    let amountList = amounts.split(',');
    if (recPkList.length != amountList.length) {
      return {"code":5, "msg":"The quantity of reciPubKeys and amounts is incorrect!"};
    }
    let invoiceList = [];
    let recieveRes = '';
    for (let i=0; i<recPkList.length; i++) {
      recieveRes = await this.recieve(recPkList[i], sendPubKey, assetId, amountList[i], assetTypes);
      if (recieveRes.code == 0) {
        invoiceList.push(recieveRes.data.invoice);
      }
    }
    if (invoiceList.length > 0) {
      let sendRes = await this.send(sendPubKey, assetId, amountList, invoiceList, donation);
      return sendRes;
    } else {
      return recieveRes;
    };
  }

  async getHistoryTransaction(pubKey, assetId) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!assetId) {
      return {"code":2, "msg":"assetId is null!"};
    }
    
    let params = {"pk":pubKey, "asset_id":assetId};
    let result = await request({
      url: this.serverUrl + "/api/list_transfers",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async listLnpAssets() { 
    let params = {};
    let result = await request({
      url: this.serverUrl + "/api/list_lnp_assets",
      method: "GET",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async listLnpTransfers(assetId) {
    if (!assetId) {
      return {"code":1, "msg":"assetId is null!"};
    }
    
    let params = {"asset_id":assetId};
    let result = await request({
      url: this.serverUrl + "/api/list_lnp_transfers",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async beforeCreateUtxo(pubKey, feeRate, upTo) {
      if (!pubKey) {
        return {"code":1, "msg":"pubKey is null!"};
      }

      if (feeRate <= 0) {
        return {"code":2, "msg":"feeRate cannot be less than 0!"};
      }

      let upToFlag = upTo == 'true' ? true : false;
      let params = {"pk":pubKey, "fee_rate":parseFloat(feeRate), "up_to":upToFlag};
      let result = await request({
        url: this.serverUrl + "/api/before_create_utxo",
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body:params
      });

      if (result.code == 0) {
        result.msg = 'success';
      } 

      return result;
  }

  async endCreateUtxo(pubKey, psbtStr) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!psbtStr) {
      return {"code":2, "msg":"psbt is null!"};
    }

    const psbt = bitcoin.Psbt.fromBase64(psbtStr);
    const inputs = psbt.data.inputs;
    inputs.forEach((input, index) => {
      let curPath = input.bip32Derivation[0].path;
      let {privateKey} = this.getPrivateByPath(this.mnemonic, curPath, this.password);
      let network = this.network;
      const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);
      psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();
    const signedPsbtStr = psbt.toBase64();
    let params = {"pk":pubKey, "psbt":signedPsbtStr};
    let result = await request({
      url: this.serverUrl + "/api/end_create_utxo",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async beforeSend(pubKey, assetId, donation, invoices) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!assetId) {
      return {"code":2, "msg":"assetId is null!"};
    }

    if (!invoices || invoices.length <= 0) {
      return {"code":3, "msg":"invoices is null!"};
    }
    
    let donationFlag = donation == 'true' ? true : false;
    let params = {"pk":pubKey, "asset_id":assetId, "invoices":invoices, "donation":donationFlag};
    let result = await request({
      url: this.serverUrl + "/api/before_send",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  async endSend(pubKey, psbt, assetId, recipientIdList) {
    if (!pubKey) {
      return {"code":1, "msg":"pubKey is null!"};
    }

    if (!psbt) {
      return {"code":2, "msg":"psbt is null!"};
    }

    if (!assetId) {
      return {"code":3, "msg":"assetId is null!"};
    }

    if (!recipientIdList || recipientIdList.length <= 0) {
      return {"code":4, "msg":"recipientIdList is null!"};
    }

    let params = {"pk":pubKey, "psbt":psbt, "asset_id":assetId, "recipient_ids":recipientIdList};
    let result = await request({
      url: this.serverUrl + "/api/end_send",
      method: "POST",
      json: true,
      headers: {"content-type": "application/json"},
      body:params
    });

    if (result.code == 0) {
      result.msg = 'success';
    } 

    return result;
  }

  getPrivateByPath(mnemonic, newPath, password = '') {
    let path = newPath;
    let seed = '';
    if (password) {
      seed = bip39.mnemonicToSeedSync(mnemonic, password);
    } else {
      seed = bip39.mnemonicToSeedSync(mnemonic);
    }
    let network = this.network;
    const root = bitcoin.bip32.fromSeed(seed);
    const child = root.derivePath(path);
    const keyPair = bitcoin.ECPair.fromPrivateKey(child.privateKey, {network: network});
    const privateKey = keyPair.toWIF();

    return {privateKey};
  }

}

module.exports = BiHelixWalletSDK;