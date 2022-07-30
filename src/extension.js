// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios').default;
const vscode = require('vscode');
const DataProvider  = require("./dataProvider.js");
const selectedClaims = require("./selectedclaims");
const applancescripts = require("./appliancesidescripts")
const aglogin = require("./appgate.js");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	var authprep = new aglogin.prelogin();
var session = new aglogin.postlogin();
var myData = new DataProvider(session);
var selected = new selectedClaims();
	if(context.environmentVariableCollection.get("URL")){
		if(context.secrets.get(context.environmentVariableCollection.get('URL').value)){
			session.buildheaders(context)
			vscode.window.showInformationMessage('existing session found')
		}
	}else{
		vscode.window.showInformationMessage('run "Configure AG scripter"')
	}
		context.environmentVariableCollection.delete('userClaims')
		context.environmentVariableCollection.delete('deviceClaims')
		context.environmentVariableCollection.delete('systemClaims')
	

	let onappliancescripts = vscode.commands.registerCommand('customappgate.appliancesidescripts', async function(){
		let obentitlementscripts = await session.customGet('entitlement-scripts')
		let obcriteriascripts = await session.customGet('criteria-scripts')
		let obuserscripts = await session.customGet('user-scripts')
		let obconditions = await session.customGet('conditions')
		var appplianceSideScripts = new applancescripts(obentitlementscripts, obuserscripts, obcriteriascripts, obconditions)
		vscode.window.createTreeView('appliancesidescripts', {treeDataProvider: appplianceSideScripts})
	})
	


	let activesessionmode = vscode.commands.registerCommand('customappgate.sessions', async function(){
		var sessiontreeview = vscode.window.createTreeView("activesessions", {treeDataProvider: myData});
		//vscode.commands.executeCommand('customappgate.collapse')
		myData.refresh();
		
	}
	)
	
let openscript = vscode.commands.registerCommand('customappgate.edit', async function (e) {
	openInUntitled(e.toExpand, 'javascript')
})
async function openInUntitled(content, language) {
    const document = await vscode.workspace.openTextDocument({
        language,
		content
    });
    vscode.window.showTextDocument(document);
}

	let configure = vscode.commands.registerCommand('customappgate.configure', async function() {
		//vscode.commands.executeCommand('workbench.actions.treeView.activesessions.collapseAll');
		await authprep.build(context);
		await session.url(authprep.baseURI);
		session.authenticate(authprep.body, context);
		
	})

	
	//var authd = new aglogin.prelogin;
	let newfunc = vscode.commands.registerCommand('customappgate.new', async function () {
		let obentitlementscripts = await session.customGet('/admin-messages/summarize')
		for (let i of obentitlementscripts){
			console.log(i.message.match(/(?<=Script )[^ ]+/))
		}
	}
	)
	

	let setscriptsclaims = vscode.commands.registerCommand('customappgate.setclaims', async function(e) {
		await myData.getChildren(e);
		myData.refresh();
		vscode.window.createTreeView("selectedclaims", {treeDataProvider: selected});
		selected.getclaims(e.claims)
		selected.refresh();	
		return
	})
	let clearclaims = vscode.commands.registerCommand('customappgate.clearclaims', function () {
		selected.getclaims({userClaims: "", deviceClaims: "", systemClaims: ""});
		selected.refresh();
	})
	let userClaimsScript = vscode.commands.registerCommand('customappgate.userClaimsScript', async function () {
		getoutputChannel().clear();
		
		let data = await session.userClaimsScript( vscode.window.activeTextEditor.document.getText(), selected.claims);
		for (let i in data) {
			//getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
			(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result')? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().append(data[i]);
			getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
		}
		getoutputChannel().show(true);
	})

	let entitlementScript = vscode.commands.registerCommand('customappgate.entitlementScript', async function() {
		getoutputChannel().clear();
		let data = await session.entitlementScript(vscode.window.activeTextEditor.document.getText(), await vscode.window.showQuickPick(['host', 'portOrType', 'appShortcut']), selected.claims);
		for (let i in data) {
			//getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
			(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result')? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().append(data[i]);
			getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
		}
		getoutputChannel().show(true);
	})
	let _channel = vscode.window.createOutputChannel('script-results');
	function getoutputChannel(){
		if (!_channel) {
			_channel = vscode.window.createOutputChannel('script-results'); 
		}
		return _channel
	}
	
	
	context.subscriptions.push(configure, onappliancescripts,setscriptsclaims, entitlementScript, userClaimsScript, clearclaims, newfunc);

}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}