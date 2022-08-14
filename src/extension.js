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
var myData = new DataProvider(session);
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
		//this._appliances()
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

vscode.commands.registerCommand('customappgate.revoketokens', async function(e){
	console.log(e)
	//https://appgate.company.com:8443/admin/token-records/revoked/by-dn/{distinguished-name}
	let body = {
		revocationReason: "Triggered",
		delayMinutes: 0,
		tokensPerSecond: 7
	}
	await session.customPut(`token-records/revoked/by-dn/${e.dn}`, body)	
}
)



let remotecmd = vscode.commands.registerCommand('customappgate.remotecmd', async function multiStepInput() { 
	
	async function collectInputs() {
        const state = {};
		await MultiStepInput.run(input => selectAppliance(input, state))
        return state;
    }
	const title = 'Remote Commands';
	async function selectAppliance(input, state){
		const items = await appliances()
		const pick = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 3,
			items: items,
			ignoreFocusOut:true,
			placeholder: 'Choose an appliance',
			activeItem: typeof state.appliance !== 'string' ? state.appliance: undefined,
			shouldResume: shouldResume
		});
		state.appliance = pick;
		return (input) => selectCommand(input, state);
	}
	async function selectCommand(input, state){
		state.command = await input.showQuickPick({
			title,
			step: 2,
			totalSteps: 3,
			ignoreFocusOut:true,
			items: ['tcpdump','ping','netcat'].map(l=>({label:l})),
			//placeholder: 'Select the command to run',
			activeItem: typeof state.command !== 'string' ? state.command: undefined,
			shouldResume: shouldResume
		});
		
		return (input) => configureCommand(input, state);		
	}
	async function configureCommand(input, state){
		let int = await interfaces(state)
		
		if(state.command.label === 'ping' || state.command.label === 'tcpdump'){
		state.configureCommand = await input.showQuickPick({
			title,
			step:3,
			totalSteps:4,
			ignoreFocusOut:true,
			placeholder: 'select the interface to use',
			items: state.command.label === 'ping' ? state.appliance.nics : int,
			activeItem: typeof state.configuration !== 'string' ? state.configuration: undefined,
			shouldResume: shouldResume
		})
		

        
		
		return(input) => state.command.label === 'ping' ? pingDestination(input, state) : dumpCommands(input, state)
	}
	else if(state.command.label === 'netcat'){
		state.configuration = await input.showQuickPick({
			title,
			step:3,
			totalSteps:6,
			ignoreFocusOut:true,
			items: ['tcp','udp'].map(p=>({label:p})),
			placeholder: 'protocol',
			activeItem: typeof state.configuration !== 'string' ? state.configuration: 'undefined',
			shouldResume: shouldResume
	})
	return(input) => netcatIPversion(input, state);
};
		async function pingDestination(input, state){
			state.pingDestination = await input.showInputBox({
				title,
				step:4,
				totalSteps:4,
				ignoreFocusOut:true,
				prompt: 'enter the FQDN or IP address to ping',
				activeItem: typeof state.pingDestination !== 'string' ? state.pingDestination: undefined,
				validate: validateNameIsUnique,
				shouldResume: shouldResume
			})
			
			return(input) => runRemoteCommand(input, state, {
				destination: state.pingDestination,
				interface: state.configureCommand.label
			})
		}
		async function dumpCommands(input, state){
				state.dumpCommands = await input.showInputBox({
					title,
					step:4,
					totalSteps:4,
					ignoreFocusOut:true,
					prompt: '(optionally) enter a tcpdump expression to filter results',
					activeItem: typeof state.dumpCommands !== 'string' ? state.dumpCommands: undefined,
					validate: validateNameIsUnique,
					shouldResume: shouldResume
				})
				return(input) =>  runRemoteCommand(input, state, {
					expression: state.dumpCommands,
					interface: state.configureCommand.label})
			}
	async function netcatIPversion(input, state){
		state.netcatIPversion = await input.showQuickPick({
			title,
			step:4,
			totalSteps:6,
			ignoreFocusOut:true,
			placeholder: 'select the ip version to use',
			items: ['ip4', 'ip6'].map(p=>({label:p})),
			activeItem: typeof state.netcatIPversion !== 'string' ? state.netcatIPversion: undefined,
			shouldResume: shouldResume
		})
		return(input) => netcatPort(input, state)
	}
	async function netcatPort(input, state){
		state.netcatPort = await input.showQuickPick({
			title,
			step:5,
			totalSteps:6,
			ignoreFocusOut:true,
			placeholder: 'select the port to use',
			items: ['443', '80', '3389', '2389', '22'].map(p=>({label:p})),
			activeItem: typeof state.netcatPort !== 'string' ? state.netcatPort: undefined,
			shouldResume: shouldResume
		})
		return(input) => netcatDestination(input, state)
	}
	async function netcatDestination(input, state){
		state.netcatDestination = await input.showInputBox({
			title,
			step:6,
			totalSteps:6,
			ignoreFocusOut:true,
			prompt: 'enter the destination for netcat',
			activeItem: typeof state.netcatDestination !== 'string' ? state.netcatDestination: undefined,
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		})
		return(input) => runRemoteCommand(input, state, {
			destination: state.netcatDestination,
			port: state.netcatPort.label,
			version: parseInt(state.netcatIPversion.label.at(-1),10),
			protocol: state.configuration.label
		})
	}
	async function runRemoteCommand(input, state, body){
		let resp = await session.remoteCMD(`appliances/${state.appliance.id}/command/${state.command.label}`, body)
		let lines = resp.split(/\r?\n/)
		await input.showQuickPick({
			title,
			step:6,
			totalSteps:6,
			enabled:false,
			items: lines.map(l=>({label:l})),
			ignoreFocusOut:true,
			activeItem: typeof state.runRemoteCommand !== 'string' ? state.runRemoteCommand: undefined,
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		})

	}
	}
function shouldResume() {
	// Could show a notification with the option to resume.
	return new Promise((resolve, reject) => {
		// noop
	});
}
async function validateNameIsUnique(name) {
	// ...validate...
	//await new Promise(resolve => setTimeout(resolve, 1000));
	return undefined;//name === 'vscode' ? 'Name not unique' : undefined;
}
async function appliances(){
	let app = await session.customGet('appliances')
	return app.map((a) => ({
		label:`${a.name} (${a.hostname})`, 
		id: a.id,
		networking: a.networking, 
		nics: a.networking.nics.map((n)=>({label:n.name, enabled: n.enabled}))}))
}
async function interfaces(state){
	let ints = await session.remoteCMD(`appliances/${state.appliance.id}/command/tcpdump`, {expression: "-D"})
	return ints.match(/(?<=^\d\.)\S+/gm).map(i=>({label:i}))
}
	const state = await collectInputs();

	
	/* let appliances = await session.customGet('appliances')
	await theone()
	async function theone(){ 
		await vscode.window.showQuickPick(await appliances.map(a=>`${a.name} (${a.hostname})`),{canPickMany: false, onDidSelectItem: await command()})
	}
	async function command(){
		session.headers.Accept = 'application/vnd.appgate.peer-v17+text'
		await vscode.window.showQuickPick(['ping','tcpdump','netcat'], {canPickMany: false, onDidSelectItem: await resp()})
		session.headers.Accept = 'application/vnd.appgate.peer-v17+json'
	} 
	async function resp(){
		await session.customPost(`appliances/${appliances.filter(f=> theone === `${f.name} (${f.hostname})`)[0].id}/command/${command}`, {destination: "8.8.8.8", interface: "eth0"})
	}  */
	//.then(result=>console.log(result.content))
	//console.log(await resp)
	
	//console.log(appliances.filter(f=> theone === `${f.name} (${f.hostname})`))
})


vscode.commands.registerCommand('customappgate.runnow', async(e)=>{
	getoutputChannel().clear();
		let data = await session[e.scriptfamily](e.toExpand, selected.claims);
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
			getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
			(i === 'executionMs') ? getoutputChannel().appendLine(data[i]) : (i === 'result')? getoutputChannel().appendLine(JSON.stringify(data[i])) : getoutputChannel().append(data[i]);
			getoutputChannel().appendLine("_".repeat(100-i.length) + i);
			getoutputChannel().appendLine("");
		}
		getoutputChannel().show(true);
	})
	




	let entitlementScript = vscode.commands.registerCommand('customappgate.entitlementScript', async function() {
		getoutputChannel().clear();
		let data = await session.entitlementScript(vscode.window.activeTextEditor.document.getText(), selected.claims);
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
	
	context.subscriptions.push(remotecmd, configure,/* onappliancescripts, */setscriptsclaims, entitlementScript, userClaimsScript, clearclaims);

}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
class InputFlowAction {
}
InputFlowAction.back = new InputFlowAction();
InputFlowAction.cancel = new InputFlowAction();
InputFlowAction.resume = new InputFlowAction();
class MultiStepInput {
    constructor() {
        this.steps = [];
    }
    static async run(start) {
        const input = new MultiStepInput();
        return input.stepThrough(start);
    }
    async stepThrough(start) {
        let step = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            }
            catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                }
                else if (err === InputFlowAction.resume) {
                    step = this.steps.pop();
                }
                else if (err === InputFlowAction.cancel) {
                    step = undefined;
                }
                else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }
    async showQuickPick({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode.window.createQuickPick();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
				input.ignoreFocusOut=true;
                input.placeholder = placeholder;
                input.items = items;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [
                    ...(this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                disposables.push(input.onDidTriggerButton(item => {
                    if (item === vscode.QuickInputButtons.Back) {
                        reject(InputFlowAction.back);
                    }
                    else {
                        resolve(item);
                    }
                }), input.onDidChangeSelection(items => resolve(items[0])), input.onDidHide(() => {
                    (async () => {
                        reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                    })()
                        .catch(reject);
                }));
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        }
        finally {
            disposables.forEach(d => d.dispose());
        }
    }
    async showInputBox({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode.window.createInputBox();
                input.title = title;
                input.step = step;
				input.ignoreFocusOut=true;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.buttons = [
                    ...(this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                let validating = validate('');
                disposables.push(input.onDidTriggerButton(item => {
                    if (item === vscode.QuickInputButtons.Back) {
                        reject(InputFlowAction.back);
                    }
                    else {
                        resolve(item);
                    }
                }), input.onDidAccept(async () => {
                    const value = input.value;
                    input.enabled = false;
                    input.busy = true;
                    if (!(await validate(value))) {
                        resolve(value);
                    }
                    input.enabled = true;
                    input.busy = false;
                }), input.onDidChangeValue(async (text) => {
                    const current = validate(text);
                    validating = current;
                    const validationMessage = await current;
                    if (current === validating) {
                        input.validationMessage = validationMessage;
                    }
                }), input.onDidHide(() => {
                    (async () => {
                        reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                    })()
                        .catch(reject);
                }));
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        }
        finally {
            disposables.forEach(d => d.dispose());
        }
    }
}