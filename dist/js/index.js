// let URL = "http://13.213.87.244:8001";// regtest
let URL = "https://tp-testnet.bihelix.io";// testnet

let env = getDataFromLocalStorage('env');
let selectElement = document.getElementById("env");
if (!env) {
	env = selectElement.options[selectElement.selectedIndex].text;
	setDataToLocalStorage('env', env); 
} else {
	for (var i = 0; i < selectElement.options.length; i++) {
	    var option = selectElement.options[i];
	    if (option.value === env) {
	        option.selected = true;
	        break;
	    }
	}
}

let walletInfo = getDataFromLocalStorage('walletData' + env);
let password = '';
let mnemonic = '';
let pubKey = '';

if (walletInfo) {
	password = walletInfo.password;
	mnemonic = walletInfo.mnemonic;
	pubKey = walletInfo.pubKey;
	// let socket = new WebSocket('ws://13.213.87.244:8003/?pk=' + pubKey); // regtest
	/**let socket = new WebSocket('ws://ws-tp-testnet.bihelix.io/?pk=' + pubKey); // regtest

	// open socket 
  	socket.onopen = function(event) { 
    	console.log('open');
  	};

  	socket.onmessage = function(event) { 
    	let data = event.data;
    	if (data._type == 'Refresh' || data._type == 'Receive') {
    		let historyData = getDataFromLocalStorage('historyData' + env);
			if (historyData) {
				for (let obj of historyData) {
					if (obj.txid == data.txid) {
						obj['status'] = data.status;
					}
				}
		    	showHistoryData(historyData);
		    	setDataToLocalStorage('historyData' + env, historyData);
		    }
    	} 
  	}; 

  	socket.onclose = function(event) { 
	    console.log('Client notified socket has closed', event); 
  	}; 

  	socket.onerror = function(event){
	    console.log("on error=", event);
  	}

  	function send(message){
	    socket.send('connect success');
  	}*/
}

let walletSDK = new WalletSDK(URL, {"network":env, mnemonic, password}); //env: reg test prod
let assetId = getDataFromLocalStorage('assetId'+env);

function showText(id) {;
	updateEnv();
    var mainContainer = document.getElementById('mainContainer');
    if (id == 'issueBtn') {
    	mainContainer.innerHTML = `
	        <div class="myDiv">
	        	pubKey: <input type="text" style="font-size: 14px; width: 265px;" name="pubKey" id="pubKey" value="" />
	        </div>
		    <div class="myDiv">
		    	ticker: <input type="text" style="font-size: 14px; width: 265px;" name="ticker" id="ticker" value="" />
		    </div>  
		    <div class="myDiv">
		    	name: <input type="text" style="font-size: 14px; width: 265px;" name="name" id="name" value="" />
		    </div>  
	        <div class="myDiv">
	        	presision: <input type="text" style="font-size: 14px; width: 265px;" name="presision" id="presision" value="" />
	        </div>  
	        <div class="myDiv">
	        	amount: <input type="text" style="font-size: 14px; width: 265px;" name="amount" id="amount" value="" />
	        </div>  
	        <textarea class="textAreaCont" id="issueId"></textarea>
	        <div>
	        	<button class="returnButton" id="backBtn" name="backBtn">back</button>
	        	<button class="returnButton" id="issueSubmit" name="issueSubmit">submit</button>
	        <div>
	    `;
    } else if (id == 'receiveBtn') {
    	mainContainer.innerHTML = `
	        <div class="myDiv">
	        	recPubKey: <input type="text" style="font-size: 14px; width: 265px;" name="recPubKey" id="recPubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	sendPubKey: <input type="text" style="font-size: 14px; width: 265px;" name="sendPubKey" id="sendPubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	assetId: <input type="text" style="font-size: 14px; width: 265px;" name="assetId" id="assetId" value="" />
	        </div>
	        <div class="myDiv">	
	        	amount: <input type="text" style="font-size: 14px; width: 265px;" name="amount" id="amount" value="" />
	        </div>
	        	<textarea class="textAreaCont" id="receiveId"></textarea>
	        <div> 
	        	<button class="returnButton" id="backBtn" name="backBtn">back</button>
	        	<button class="returnButton" id="receiveSubmit" name="receiveSubmit">submit</button>
	        <div>
	    `;
    } else if (id == 'sendBtn') {
    	mainContainer.innerHTML = `
	        <div class="myDiv">
	        	pubKey: <input type="text" style="font-size: 14px; width: 265px;" name="pubKey" id="pubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	assetId: <input type="text" style="font-size: 14px; width: 265px;" name="assetId" id="assetId" value="" />
			</div>
			<div class="myDiv">
	        	amounts: <input type="text" style="font-size: 14px; width: 265px;" name="amount" id="amount" value="" />
	        </div>
	        <div class="myDiv">
	        	invoices: <input type="text" style="font-size: 14px; width: 265px;" name="invoice" id="invoice" value="" />
	        </div>
	        <div class="myDiv">
	        	<textarea class="textAreaCont" id="sendId"></textarea>
	        </div>
	        <div> 
	        	<button class="returnButton" id="backBtn" name="backBtn">back</button>
	        	<button class="returnButton" id="sendSubmit" name="sendSubmit">submit</button>
	        <div>
	    `;
    } else if (id == 'transferBtn') {
    	mainContainer.innerHTML = `
	        <div class="myDiv">
	        	recPubKeys: <input type="text" style="font-size: 14px; width: 265px;" name="recPubKey" id="recPubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	sendPubKey: <input type="text" style="font-size: 14px; width: 265px;" name="sendPubKey" id="sendPubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	assetId: <input type="text" style="font-size: 14px; width: 265px;" name="assetId" id="assetId" value="" />
			</div>
			<div class="myDiv">
	        	amounts: <input type="text" style="font-size: 14px; width: 265px;" name="amount" id="amount" value="" />
	        </div>	
	        <div class="myDiv">
	        	<textarea class="textAreaCont" id="transferId"></textarea>
	        </div>
	        <div> 
	        	<button class="returnButton" id="backBtn" name="backBtn">back</button>
	        	<button class="returnButton" id="transferSubmit" name="transferSubmit">submit</button>
	        <div>
	    `;
    } else if (id == 'historyBtn') {
    	mainContainer.innerHTML = `
	        <div class="myDiv">
	        	pubKey: <input type="text" style="font-size: 14px; width: 265px;" name="pubKey" id="pubKey" value="" />
	        </div>
	        <div class="myDiv">
	        	assetId: <input type="text" style="font-size: 14px; width: 265px;" name="assetId" id="assetId" value="" />
			</div>
	        <table class="myTable" id="myTable"></table>
	        <div> 
	        	<button class="returnButton" id="backBtn" name="backBtn">back</button>
	        	<button class="returnButton" id="historySubmit" name="historySubmit">submit</button>
	        <div>
	    `;
    } else {
    	if (walletInfo) {
    		let curPath = walletInfo.derivationPath || '';
    		mainContainer.innerHTML = `
		        <div class="myDiv">
		        	addr: <input type="text" style="font-size: 14px; width: 280px;" value="${walletInfo.address}" readonly />
		        </div>
		        <div class="myDiv">
		        	pubKey: <input type="text" style="font-size: 14px; width: 280px;" value="${walletInfo.pubKey}" readonly />
		        </div>
		        <div class="myDiv">
		        	privKey: <input type="text" style="font-size: 14px; width: 280px;" value="${walletInfo.privateKey}" readonly />
		        </div>
		        <div class="myDiv">
		        	pwd: <input type="text" style="font-size: 14px; width: 280px;" value="${walletInfo.password}" readonly />
		        </div>
		        <div class="myDiv">
		        	mnem: <input type="text" style="font-size: 14px; width: 280px;" value="${walletInfo.mnemonic}" readonly />
		        </div>
		        <div class="myDiv">
		        	derivPath: <input type="text" style="font-size: 14px; width: 280px;" value="${curPath}" readonly />
		        </div>
		        <div>
	        		<button class="divWalletBtn" id="backBtn" name="backBtn">back</button> 
	        	</div>
		    `;
		} else {
			mainContainer.innerHTML = `
		        <div class="myDiv">
		        	password: <input type="text" style="font-size: 14px; width: 265px;" name="password" id="password" value="" />
		        <div>
		        <div class="myDiv">
		        	derivPath: <input type="text" style="font-size: 14px; width: 265px;" name="derivationPath" id="derivationPath" value="" />
		        <div>
		        <div class="myDiv">
		        	assetId: <input type="text" style="font-size: 14px; width: 265px;" name="assetId" id="assetId" value="" />
		        <div>
		        <textarea class="textArea" id="walletId">mnemonic</textarea>
		        <div class='walletBtnId'>
	        		<button class="walletButton" id="backBtn" name="backBtn">back</button>
	        		<button class="walletButton" id="walletSubmit" name="walletSubmit">submit</button>
	        		<button class="walletButton" id="importSubmit" name="importSubmit">importSubmit</button>
	        	</div>
		    `;
		}
    }
    
}


function updateEnv() {
	let selectEnv = document.getElementById("env");
	var curEnv = selectEnv.options[selectEnv.selectedIndex].text;
	if (curEnv != env) {
		env = curEnv;
		setDataToLocalStorage('env', env); 
		walletSDK = new WalletSDK(env); //env: reg test prod
	}
}

function showHistoryData(dataList) {
	var table = document.getElementById("myTable");
	var tr1 = document.createElement("tr");
	var td11 = document.createElement("td");
	var td12 = document.createElement("td");
	var td13 = document.createElement("td");
	var td14 = document.createElement("td");
	var td15 = document.createElement("td");
	td11.textContent = 'createtime';
	td12.textContent = 'updatetime';
	td13.textContent = 'status';
	td14.textContent = 'amount';
	td15.textContent = 'txid';
	tr1.appendChild(td11);
	tr1.appendChild(td12);
	tr1.appendChild(td13);
	tr1.appendChild(td14);
	tr1.appendChild(td15);
	table.appendChild(tr1);
	
	for (let i=0; i<dataList.length;i++) {
		let curData = dataList[i];
		var tr = document.createElement("tr");
		var td1 = document.createElement("td");
		td1.textContent = curData.created_at;
		var td2 = document.createElement("td");
		td2.textContent = curData.updated_at;
		var td3 = document.createElement("td");
		td3.textContent = curData.status;
		var td4 = document.createElement("td");
		td4.textContent = curData.amount;
		var td5 = document.createElement("td");
		td5.textContent = curData.txid;
		tr.appendChild(td1);
		tr.appendChild(td2);
		tr.appendChild(td3);
		tr.appendChild(td4);
		tr.appendChild(td5);
		table.appendChild(tr);
	}
}

async function getWalletAmount() {
	let amount = 0;
	let moneyText = document.getElementById('money');
	moneyText.value = 'balance: 0';
	
	if (!assetId) {
		assetId = getDataFromLocalStorage('assetId'+env);
	}
	if (assetId && walletInfo && walletInfo.pubKey) {
		let balanceRes = await walletSDK.getAssetBalance(walletInfo.pubKey, assetId);
		console.log("balanceRes====",balanceRes);
		if (balanceRes.code == 0) {
			amount = balanceRes.data.spendable;
			moneyText.value = 'balance:' + amount; 
		}
	}

	await showAssetList();

	return amount;
}

getWalletAmount();

async function showAssetList() {
	var table = document.getElementById("assetIdList");
	if (walletInfo) {
		let totalBalance = 0;
		let assetDataList = await walletSDK.assetList(walletInfo.pubKey, "rgb20,rgb21,rgb25");
		let dataList = assetDataList.data;
		console.log("dataList====",dataList);		
		if (dataList) {
			let niaList = dataList.nia;
			let udaList = dataList.uda;
			let cfaList = dataList.cfa;
			let assetArr = niaList.concat(udaList).concat(cfaList);
			for (let data of assetArr) {
				var tr = document.createElement("tr");
				var td1 = document.createElement("td");
				td1.textContent = data.asset_iface;
				var td2 = document.createElement("td");
				td2.textContent = data.asset_id;
				var td3 = document.createElement("td");
				let spendable = parseInt(data.balance.spendable);
				totalBalance += spendable;
				td3.textContent = spendable;
				tr.appendChild(td1);
				tr.appendChild(td2);
				tr.appendChild(td3);
				table.appendChild(tr);
			}
			if (!assetId) {
				let moneyText = document.getElementById('money');
				if (moneyText) {
					moneyText.value = 'balance:' + totalBalance; 
				}
			}
		}
	} else {
		var tr = document.createElement("tr");
		var td1 = document.createElement("td");
		var td2 = document.createElement("td");
		var td3 = document.createElement("td");
		td2.textContent = 'No Data';
		tr.appendChild(td1);
		tr.appendChild(td2);	
		tr.appendChild(td3);
		table.appendChild(tr);
	}
}

async function receive() {
	let recPubKey = document.getElementById("recPubKey").value;
    if (!recPubKey) {
        alert("ticker cannot be empty");
        return;
    }

    let sendPubKey = document.getElementById("sendPubKey").value;
    if (!sendPubKey) {
        alert("ticker cannot be empty");
        return;
    }

	if (!assetId) {
		assetId = getDataFromLocalStorage('assetId' + env);
		if (!assetId) {
			assetId = document.getElementById("assetId").value;
			if (assetId) {
				setDataToLocalStorage('assetId'+env, assetId);
			}
		}
	}

	let amount = document.getElementById("amount").value;
	if (amount < 100) {
		alert("amount Cannot be less than 100");
        return;
	}
	let res = await walletSDK.recieve(recPubKey, sendPubKey, assetId, amount);
	if (res.code == 0) {
		setDataToLocalStorage('receiveData' + env, res);
	}

	let textarea = document.getElementById('receiveId');
	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(res);
}

async function issue() {
	let pk = document.getElementById("pubKey").value;
    if (!pk) {
        alert("pubKey cannot be empty");
        return;
    }

    let ticker = document.getElementById("ticker").value;
    if (!ticker || ticker.length > 8) {
        alert("Ticker cannot be empty and the length cannot be greater than 8");
        return;
    }

    let name = document.getElementById("name").value;
    if (!name) {
        alert("name cannot be empty");
        return;
    }

    let presision = document.getElementById("presision").value;
    if (!presision) {
        alert("presision cannot be empty");
        return;
    }

    let amount = document.getElementById("amount").value;

    let res = await walletSDK.issue(pk, ticker, name, presision, amount);
    let textarea = document.getElementById('issueId');
    textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(res);
    if (res.code == 0) {
    	setDataToLocalStorage('assetId' + env, res.data.asset.asset_id);
    	setDataToLocalStorage('issueData' + env, res);
    }
}

async function sendTransfer() {
	let pubKey = document.getElementById("pubKey").value;
    if (!pubKey) {
        alert("ticker cannot be empty");
        return;
    }

	if (!assetId) {
		assetId = getDataFromLocalStorage('assetId' + env);
	}

	let amount = document.getElementById("amount").value;
	if (!amount) {
		alert("amount is null");
        return;
	}

	let invoice = document.getElementById("invoice").value;
	if (!invoice) {
		alert("invoice cannot be empty");
        return;
	}

	let res = await walletSDK.send(pubKey, assetId, amount, invoice, true);
	if (res.code == 0) {
		setDataToLocalStorage('sendData' + env, res);
	}
	let textarea = document.getElementById('sendId');
	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(res);
}

async function transfer() {
	let recPubKey = document.getElementById("recPubKey").value;
    if (!recPubKey) {
        alert("recPubKey cannot be empty");
        return;
    }

    let sendPubKey = document.getElementById("sendPubKey").value;
    if (!sendPubKey) {
        alert("sendPubKey cannot be empty");
        return;
    }

	if (!assetId) {
		assetId = getDataFromLocalStorage('assetId' + env);
	}

	if (!assetId) {
		assetId = document.getElementById("assetId").value;
		if (assetId) {
			setDataToLocalStorage('assetId' + env, assetId);
		}
	}

	let amount = document.getElementById("amount").value;
	if (!amount) {
		alert("amount cannot be empty");
        return;
	}

	let res = await walletSDK.transfer(recPubKey, sendPubKey, assetId, amount);
	if (res.code == 0) {
		setDataToLocalStorage('transferData' + env, res);
	}
	let textarea = document.getElementById('transferId');
	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(res);
}

async function historyList() {
	let pubKey = document.getElementById("pubKey").value;
    if (!pubKey) {
        alert("ticker cannot be empty");
        return;
    }

	if (!assetId) {
		assetId = getDataFromLocalStorage('assetId' + env);
	}

	let res = await walletSDK.getHistoryTransaction(pubKey, assetId);
	if (res.code == 0) {
		setDataToLocalStorage('historyData' + env, res);
		showHistoryData(res.data);
	}
}

async function createWallet() {
	let password = document.getElementById('password').value;
	if (password && password.length < 6) {
		alert("password length cannot be less than six characters!");
	}

	let derivationPath = document.getElementById('derivationPath').value;
	
	let res = await walletSDK.createRGBWallet('', password, derivationPath);
	let data = res.data;
	data['password'] = password;
	setDataToLocalStorage('walletData' + env, data);
	let textarea = document.getElementById('walletId');
	textarea.value = 'create wallet success: \n' + JSON.stringify(data);
}

async function importWallet() {
	let password = document.getElementById('password').value;
	if (password && password.length < 6) {
		alert("password length cannot be less than six characters!");
	}

	let textarea = document.getElementById('walletId');
	let derivationPath = document.getElementById('derivationPath').value;
	let mnemonic = textarea.value;

	let assetId = document.getElementById("assetId").value;
	if (assetId) {
		setDataToLocalStorage('assetId' + env, assetId);
	}

	let res = await walletSDK.createRGBWallet(mnemonic, password, derivationPath);
	let data = res.data;
	data['password'] = password;
	setDataToLocalStorage('walletData' + env, data);
	
	textarea.value = 'create wallet success: \n' + JSON.stringify(data);
}

document.getElementById('loginBtn').addEventListener('click', async function() {
	showText('loginBtn');
	
	document.getElementById('backBtn').addEventListener('click', function() {
		location.reload();
	});

	if (!walletInfo) {
		document.getElementById('walletSubmit').addEventListener('click', async function() {
			await createWallet();
		});

		document.getElementById('importSubmit').addEventListener('click', async function() {
			await importWallet();
		});
	}
});

// document.getElementById('issueBtn').addEventListener('click', async function() {
// 	showText('issueBtn');

// 	let textarea = document.getElementById('issueId');
// 	let issueData = getDataFromLocalStorage('issueData' + env);
// 	if (issueData) {
//     	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(issueData);
//     }
    
//     if (walletInfo) {
//     	let pubKeyText = document.getElementById('pubKey');
//     	pubKeyText.value = walletInfo.pubKey;
//     }
    
//     document.getElementById('backBtn').addEventListener('click', function() {
// 		location.reload();
// 	});

// 	document.getElementById('issueSubmit').addEventListener('click', async function() {
// 		await issue();
// 	});
// });

document.getElementById('receiveBtn').addEventListener('click', async function() {
	showText('receiveBtn');
    
    let textarea = document.getElementById('receiveId');
	let receiveData = getDataFromLocalStorage('receiveData' + env);
	if (receiveData) {
    	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(receiveData);
    }

    if (walletInfo) {
    	let recPubKeyText = document.getElementById('recPubKey');
    	recPubKeyText.value = walletInfo.pubKey;

    	let assetIdText = document.getElementById('assetId');
    	assetIdText.value = getDataFromLocalStorage('assetId' + env);
    }

    document.getElementById('backBtn').addEventListener('click', function() {
		location.reload();
	});

	document.getElementById('receiveSubmit').addEventListener('click', async function() {
		await receive();
	});
});

document.getElementById('sendBtn').addEventListener('click', async function() {
	showText('sendBtn');

	let textarea = document.getElementById('sendId');
	let sendData = getDataFromLocalStorage('sendData' + env);
	if (sendData) {
    	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(sendData);
    }

    if (walletInfo) {
    	let pubKeyText = document.getElementById('pubKey');
    	pubKeyText.value = walletInfo.pubKey;

    	let assetIdText = document.getElementById('assetId');
    	assetIdText.value = getDataFromLocalStorage('assetId' + env);
    }

    document.getElementById('backBtn').addEventListener('click', function() {
		location.reload();
	});

	document.getElementById('sendSubmit').addEventListener('click', async function() {
		await sendTransfer();
	});
});

document.getElementById('transferBtn').addEventListener('click', async function() {
	showText('transferBtn');

	let textarea = document.getElementById('transferId');
	let transferData = getDataFromLocalStorage('transferData' + env);
	if (transferData) {
    	textarea.value = 'RESPONSE RESULT: \n' + JSON.stringify(transferData);
    }

    if (walletInfo) {
    	let sendPubKeyText = document.getElementById('sendPubKey');
    	sendPubKeyText.value = walletInfo.pubKey;

    	let assetIdText = document.getElementById('assetId');
    	assetIdText.value = getDataFromLocalStorage('assetId' + env);
    }

    document.getElementById('backBtn').addEventListener('click', function() {
		location.reload();
	});

	document.getElementById('transferSubmit').addEventListener('click', async function() {
		await transfer();
	});
});

document.getElementById('historyBtn').addEventListener('click', async function() {
	showText('historyBtn');

	let historyData = getDataFromLocalStorage('historyData' + env);
	if (historyData) {
    	showHistoryData(historyData.data);
    }

    document.getElementById('backBtn').addEventListener('click', function() {
		location.reload();
	});

	document.getElementById('historySubmit').addEventListener('click', async function() {
		await historyList();
	});
});

document.getElementById('loginOut').addEventListener('click', function() {
	let keyList = ['walletDatatestnet', 'assetIdtestnet', 'issueDatatestnet', 'receiveDatatestnet', 'sendDatatestnet', 'transferDatatestnet'];
	if (env != 'testnet') {
		keyList = ['walletDatabitcoin', 'assetIdbitcoin', 'issueDatabitcoin', 'receiveDatabitcoin', 'sendDatabitcoin', 'transferDataproduction'];
	}
	for (let key of keyList) {
		clearData(key);
	}
	alert('loginOut success');
	location.reload();
});

function setDataToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
};
 
function getDataFromLocalStorage(key) {
    let data = localStorage.getItem(key);
    if (typeof data == 'string') {
    	data = JSON.parse(data);
    }

    return data;
};

function clearData(key) {
	localStorage.removeItem(key);
};

// document.getElementById('refreshBtn').addEventListener('click', async function() {
// 	if (pubKey) {
// 		let refreshRes = await walletSDK.refresh(pubKey);
// 		let i=0;
// 		let interVal = setInterval(async() => {
// 			refreshRes = await walletSDK.refresh(pubKey);
// 			let amount = await getWalletAmount();
// 			if (amount > 0 || i >= 10) {
// 				clearInterval(interVal);
// 				interVal = null;
// 			}
// 		}, 30000);
// 	}
// });