// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios').default;
const exp = require('constants');
const { v4: uuidv4 } = require('uuid');
const vscode = require('vscode');



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	async function authenticate(pw, idp, un) {
		axios.post(`https://${context.environmentVariableCollection.get('URL').value}:8443/admin/login`, {
			providerName: idp,
			username: un,
			password: pw,
			deviceId: uuidv4()
		},
			{
				headers: {
					Accept: "application/vnd.appgate.peer-v16+json",
					"Content-Type": "application/json",
				}
			})
			.then(({ data }) => {
				context.secrets.store(`${context.environmentVariableCollection.get('URL').value}`, JSON.stringify(data.token));
				context.secrets.store(`${context.environmentVariableCollection.get('URL').value}bearer`, JSON.stringify(data.expires));
				vscode.window.showInformationMessage('authentication successful');
			})
			.catch(function (error) {
				if (error.response) {
					return vscode.window.showInformationMessage('Authentication Failed');
					//			  console.log(error.response.data);
					//			  console.log(error.response.status);
					//			  console.log(error.response.headers);
				}
			})
	}
	let controllerurl = vscode.commands.registerCommand('customappgate.configure', async function (reenteredpw = null) {

		let url = await vscode.window.showInputBox({ value: context.environmentVariableCollection.get('URL').value?context.environmentVariableCollection.get('URL').value:"", placeHolder: context.environmentVariableCollection.get('URL').value?context.environmentVariableCollection.get('URL').value:"controller url", 'ignoreFocusOut': true });
		context.environmentVariableCollection.append("URL", url);


		let loginproviders = await axios
			.get(`https://${context.environmentVariableCollection.get('URL').value}:8443/admin/identity-providers/names`, {
				headers: {
					Accept: "application/vnd.appgate.peer-v16+json",
					"Content-Type": "application/json",
				},
			})
			.then(({ data }) => {
				const providers = [];
				for (let provider of data.data) {
					(provider.type === 'Credentials') ? providers.push(provider.name) : vscode.window.showInformationMessage(`will not work with ${provider.name} due to type ${provider.type}`);
				}
				return providers
			})
		//	  await vscode.window.showInformationMessage(loginproviders);
		let idptouse = await vscode.window.showQuickPick(loginproviders);
		context.secrets.store(`${context.environmentVariableCollection.get('URL').value}idp`, idptouse); 
		let username = await vscode.window.showInputBox({ placeHolder: `username for identity provider: ${idptouse}`, 'ignoreFocusOut': true });
		context.secrets.store(`${context.environmentVariableCollection.get('URL').value}username`, username);
		let password = await vscode.window.showInputBox({ placeHolder: `password for user: ${username}`, 'password': true, 'ignoreFocusOut': true });
		authenticate(password, idptouse, username);
	}
	)
	let collective = vscode.commands.registerCommand('customappgate.collective', async function () {
		let auth = await context.environmentVariableCollection.get('URL').value || "No Colletive Configuted, Run 'Configure AG Script'";
		vscode.window.showInformationMessage(auth);
	}
	)
	let reset = vscode.commands.registerCommand('customappgate.resetcreds', async function () {
		let currentcollective = context.environmentVariableCollection.get('URL').value;
		context.secrets.delete(context.environmentVariableCollection.get('URL').value) ? vscode.window.showInformationMessage(`Bearer token for \n${currentcollective} removed`) : vscode.window.showInformationMessage(`Unable to remove bearer token, run 'Configure AG Script`);
	}
	)
	let _channel = vscode.window.createOutputChannel('script-results');
	function getoutputChannel() {
		if (!_channel) {
			_channel = vscode.window.createOutputChannel('script-results');
		}
		return _channel
	}
	let runscripts = async function (body, apiendpoint) {
		getoutputChannel().clear();
		this.url = context.environmentVariableCollection.get('URL').value;
		this.token = await context.secrets.get(this.url);
		this.expires = await context.secrets.get(`${this.url}bearer`);
		let date = new Date();
		//vscode.window.showInformationMessage(`expires ${this.expires.toString().replace('"','').slice(0,-5)}Z now ${date.toISOString()}`);
		if (`${this.expires.toString().replace('"','').slice(0,-5)}Z` > date.toISOString()){
		axios.post(`https://${this.url}:8443/admin${apiendpoint}`,
			body,
			{
				headers: {
					Accept: "application/vnd.appgate.peer-v16+json",
					"Content-Type": "application/json",
					"Authorization": `Bearer ${JSON.parse(this.token)}`
				}
			})
			.then(({ data }) => {
				for (let i in data) {
					//getoutputChannel().appendLine("_".repeat(100-i.length) + i);
					getoutputChannel().appendLine("");
					(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result') ? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().appendLine(data[i]);
					getoutputChannel().appendLine("_".repeat(100 - i.length) + i);
					getoutputChannel().appendLine("");
				}
				getoutputChannel().show(true);
			})
		}
		else{
			let password = await vscode.window.showInputBox({ placeHolder: `password for user: ${await context.secrets.get(this.url+"username")}`, 'password': true, 'ignoreFocusOut': true });
			let idp = await context.secrets.get(`${context.environmentVariableCollection.get('URL').value}idp`);
			let  un = await context.secrets.get(`${context.environmentVariableCollection.get('URL').value}username`);
			await authenticate(password, idp, un);

		}
	}
	let userclaimsscript = vscode.commands.registerCommand('customappgate.userclaimsscript', function (userClaim = {}, deviceClaim = {}, systemClaim = {}) {
		let apiendpoint = '/user-scripts/test';
		let body = {
			'expression': vscode.window.activeTextEditor.document.getText(),
			'userClaims': userClaim,
			'deviceClaims': deviceClaim,
			'systemClaims': systemClaim
		}
		runscripts(body, apiendpoint)
	})
	let entitlementscript = vscode.commands.registerCommand('customappgate.entitlementscript', async function (userClaim = {}, deviceClaim = {}, systemClaim = {}) {
		let apiendpoint = '/entitlement-scripts/test';
		let body = {
			'expression': vscode.window.activeTextEditor.document.getText(),
			'userClaims': userClaim,
			'deviceClaims': deviceClaim,
			'systemClaims': systemClaim,
			'type': await vscode.window.showQuickPick(['host', 'portOrType', 'appShortcut'])
		}
		runscripts(body, apiendpoint)
	})
	let criteriascript = vscode.commands.registerCommand('customappgate.criteriascript', function (userClaim = {}, deviceClaim = {}, systemClaim = {}) {
		let apiendpoint = '/conditions/test';
		let body = {
			'expression': vscode.window.activeTextEditor.document.getText(),
			'userClaims': userClaim,
			'deviceClaims': deviceClaim,
			'systemClaims': systemClaim
		}
		runscripts(body, apiendpoint)
	})


	context.subscriptions.push(criteriascript, controllerurl, collective, reset, userclaimsscript, entitlementscript);

}// this method is called when your extension is deactivated

function deactivate() { }

module.exports = {
	activate,
	deactivate
}