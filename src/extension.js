// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
//const axios = require('axios').default;
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
//context.environmentVariableCollection.clear();
var authprep = new aglogin.prelogin();
var session = new aglogin.postlogin();
//var myData = new DataProvider(session);
var selected = new selectedClaims();


 async function getURL(){
	if(context.environmentVariableCollection.get('URL')){
		session.url(context.environmentVariableCollection.get('URL').value)
	}else{
		await authprep.controller(context)
		session.url(authprep.baseURI)
	}
	return context.secrets.get(session.baseURI)
}
function hasBearer(){
	getURL()
	.then((t)=>{
		if(t){
		vscode.window.showInformationMessage(`existing session found for ${session.baseURI}`)
		session.headers['Authorization'] = `Bearer ${t}`
		}else{
			vscode.commands.executeCommand('customappgate.configure')
		}
	}).then(()=>{
		vscode.commands.executeCommand('customappgate.sessions')
		vscode.commands.executeCommand('customappgate.appliancesidescripts')
	})}

hasBearer() 



context.environmentVariableCollection.delete('userClaims')
context.environmentVariableCollection.delete('deviceClaims')
context.environmentVariableCollection.delete('systemClaims')


vscode.commands.registerCommand("customappgate.appliancesidescripts",
    async function () {
      let obentitlementscripts = session.customGet("entitlement-scripts");
      let obcriteriascripts = session.customGet("criteria-scripts");
      let obuserscripts = session.customGet("user-scripts");
      let obconditions = session.customGet("conditions");
      var appplianceSideScripts = new applancescripts(session,
        await obentitlementscripts,
        await obuserscripts,
        await obcriteriascripts,
        await obconditions
      );
      vscode.window.createTreeView("appliancesidescripts", {
        treeDataProvider: appplianceSideScripts,
      });
	}
	);
	
vscode.commands.registerCommand('customappgate.sessions', async function(){
	let myData = new DataProvider(session);
	await vscode.window.createTreeView("activesessions", {treeDataProvider: myData});
	myData.refresh();		
}
)


vscode.commands.registerCommand('customappgate.runnow', async(e)=>{
	getoutputChannel().clear();
		let data = await session[e.scriptType](e.toExpand, selected.claims);
		for (let i in data) {
			//getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
			(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result')? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().append(data[i]);
			getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
		}
		getoutputChannel().show(true);
})
	
vscode.commands.registerCommand('customappgate.edit', async function (e) {
	openInUntitled(e.expression, 'javascript')
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
	await session.authenticate(authprep.body, context)

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
	context.subscriptions.push( configure,/* onappliancescripts, */setscriptsclaims, entitlementScript, userClaimsScript, clearclaims);

}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}