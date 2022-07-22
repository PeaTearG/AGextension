// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
const vscode = require('vscode');
const DataProvider = require("./dataProvider.js");
const aglogin = require("./appgate.js");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {


	vscode.commands.registerCommand('customappgate.sessions', function(){
			var url = context.environmentVariableCollection.get('URL').value
			context.secrets.get(url)
			.then((token) => {
				aglogin.activeSessions(url, token, sessfunc)
			});
				function sessfunc(data) {

					let myData = new DataProvider(data.data);
					let tree = vscode.window.createTreeView("activesessions", {treeDataProvider: myData});
					tree.onDidChangeSelection( e => {
						context.secrets.get(context.environmentVariableCollection.get('URL').value)
						.then((token) => {
							aglogin.sessDetails(context.environmentVariableCollection.get('URL').value, token, e.selection[0]['user']['distinguishedName'], winningfunc)
						})						
						})
				}
				function winningfunc(data) {
					let claims = Object.values(data.data)[0];
						context.environmentVariableCollection.append("userClaims", claims.userClaims);
						context.environmentVariableCollection.append("deviceClaims", claims.deviceClaims);
						context.environmentVariableCollection.append("systemClaims", claims.systemClaims);
				};
			}
			)

	let controllerurl = vscode.commands.registerCommand('customappgate.configure', function () {

		vscode.window.showInputBox({placeHolder: "controller url", 'ignoreFocusOut': true, value: context.environmentVariableCollection.get('URL') ? context.environmentVariableCollection.get('URL').value : ""})
		.then((url)=>{
			context.environmentVariableCollection.append("URL", url)
			aglogin.loginProviders(context.environmentVariableCollection.get('URL').value, pickProvider);
		});
		
		function pickProvider(providers){
			vscode.window.showQuickPick(providers, {placeHolder: context.environmentVariableCollection.get('IdP') ? context.environmentVariableCollection.get('IdP').value : ""})
			.then((idptouse) => {
				context.environmentVariableCollection.append('IdP', idptouse)
				return idptouse
		})
		.then((idptouse) => {
			vscode.window.showInputBox({placeHolder: `username for identity provider: ${idptouse}`,'ignoreFocusOut': true, value: context.environmentVariableCollection.get('username') ? context.environmentVariableCollection.get('username').value : ""})
			.then((username) => {
				context.environmentVariableCollection.append('username', username)
				vscode.window.showInputBox({placeHolder: `password for user: ${username}`, 'password': true, 'ignoreFocusOut': true})
				.then((password) => {
					aglogin.login(context.environmentVariableCollection.get('IdP').value, context.environmentVariableCollection.get('username').value, password, context.environmentVariableCollection.get('URL').value, win, lose)
				})
			})
		})
	}

	function win(data) {
		context.secrets.store(`${context.environmentVariableCollection.get('URL').value}`, JSON.stringify(data.token));
		vscode.window.showInformationMessage('authentication successful');
	}

	function lose(response) {
		return vscode.window.showInformationMessage('Authentication Failed');
	}
}
		
			
		
//		await vscode.window.showInputBox({placeHolder: loginproviders.data});
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		//vscode.window.showInputBox({placeHolder: "controller url"});
	
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
	function getoutputChannel(){
		if (!_channel) {
			_channel = vscode.window.createOutputChannel('script-results'); 
		}
		return _channel
	}
	let runscripts = async function (body, apiendpoint) {
		getoutputChannel().clear();
		this.url = context.environmentVariableCollection.get('URL').value;
		this.token = await context.secrets.get(this.url);
		axios.post(`https://${this.url}:8443/admin${apiendpoint}`, 
		body,
			{headers:{
				Accept: "application/vnd.appgate.peer-v16+json",
				"Content-Type": "application/json",
				"Authorization": `Bearer ${JSON.parse(this.token)}`
			}})
		.then(({data}) => {
			for (let i in data) {
				//getoutputChannel().appendLine("_".repeat(100-i.length) + i);
				getoutputChannel().appendLine("");
				(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result')? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().append(data[i]);
				getoutputChannel().appendLine("_".repeat(100-i.length) + i);
				getoutputChannel().appendLine("");
			}
			getoutputChannel().show(true);
		})}
	let userclaimsscript = vscode.commands.registerCommand('customappgate.userclaimsscript', function () {
		let apiendpoint = '/user-scripts/test';
		let body = {
		'expression': vscode.window.activeTextEditor.document.getText(),
		'userClaims': context.environmentVariableCollection.get('userClaims') ? context.environmentVariableCollection.get('userClaims').value : {},
		'deviceClaims': context.environmentVariableCollection.get('deviceClaims') ? context.environmentVariableCollection.get('deviceClaims').value: {},
		'systemClaims': context.environmentVariableCollection.get('systemClaims') ? context.environmentVariableCollection.get('systemClaims').value : {}
		}
		runscripts(body, apiendpoint)
		})
	let entitlementscript = vscode.commands.registerCommand('customappgate.entitlementscript', async function () {
		let apiendpoint = '/entitlement-scripts/test';
		//let type = await vscode.window.showQuickPick(['host', 'portOrType', 'appShortcut']);
		let body = {
		'expression': vscode.window.activeTextEditor.document.getText(),
		'userClaims': context.environmentVariableCollection.get('userClaims') ? context.environmentVariableCollection.get('userClaims').value : {},
		'deviceClaims': context.environmentVariableCollection.get('deviceClaims') ? context.environmentVariableCollection.get('deviceClaims').value: {},
		'systemClaims': context.environmentVariableCollection.get('systemClaims') ? context.environmentVariableCollection.get('systemClaims').value : {},
		'type': await vscode.window.showQuickPick(['host', 'portOrType', 'appShortcut'])
		}
		 runscripts(body, apiendpoint)
		})
	
	context.subscriptions.push(controllerurl,collective, reset, userclaimsscript, entitlementscript);

}// this method is called when your extension is deactivated

function deactivate() {}

module.exports = {
	activate,
	deactivate
}