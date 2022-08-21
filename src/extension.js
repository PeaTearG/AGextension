// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
//const axios = require('axios').default;
const vscode = require('vscode');
const DataProvider  = require("./dataProvider.js");
const selectedClaims = require("./selectedclaims");
const applancescripts = require("./appliancesidescripts")
const aglogin = require("./appgate.js");
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
	const allappliances = await appliances()
	this.commands = ['tcpdump','ping','netcat'].map(l=>({label:l}))
	const ipVersions = ['ip4', 'ip6'].map(p=>({label:p}));
	const ipProtocols = ['tcp', 'udp'].map(p=>({label:p}));
	let commonports = ['443', '80', '3389', '22']
	function netcatports(cp) {return cp.map(p=>({label:p}))}
	async function selectAppliance(input, state){
		state.appliance = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 4,
			items: allappliances,
			ignoreFocusOut:true,
			placeholder: 'Choose an appliance',
			activeItem: typeof state.appliance !== 'string' ? state.appliance : undefined,
			shouldResume: shouldResume
		});
		return (input) => selectCommand(input, state);
	}
	async function selectCommand(input, state){
		state.command = await input.showQuickPick({
			title,
			step: 2,
			totalSteps: 4,
			ignoreFocusOut:true,
			items: this.commands,
			placeholder: `Select a command to run on ${state.appliance.label}`,
			activeItem: typeof state.command !== 'string' ? state.command: undefined,
			shouldResume: shouldResume
		});
		
		return (input) => configureCommand(input, state);		
	}

	async function configureCommand(input, state){	
		if(state.command.label === 'ping' || state.command.label === 'tcpdump'){
		var int = await interfaces(state)
		state.configureCommand = await input.showQuickPick({
			title,
			step:3,
			totalSteps:4,
			ignoreFocusOut:true,
			placeholder: `${state.command.label} ${state.command.label === "ping" ? "-I" : "-i"} <select interface>`,
			items: state.command.label === 'ping' ? state.appliance.nics : int,
			activeItem: typeof state.configuration !== 'string' ? state.configuration: undefined,
			shouldResume: shouldResume
		})
		return(input) => state.command.label === 'ping' ? pingDestination(input, state) : dumpCommands(input, state)
	}
	else if(state.command.label === 'netcat'){
		state.configureCommand = await input.showQuickPick({
			title,
			step:3,
			totalSteps:6,
			ignoreFocusOut:true,
			items: ipProtocols,
			placeholder: 'protocol',
			activeItem: typeof state.configureCommand !== 'string' ? state.configureCommand: 'undefined',
			shouldResume: shouldResume
	})
	return(input) => netcatIPversion(input, state);
}
	}
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
			
			runRemoteCommand(input, state, {
				destination: state.pingDestination,
				interface: state.configureCommand.label
			})
			input.steps.pop()
			return(input) => pingDestination(input, state)
		}
		async function dumpCommands(input, state){
			//vscode.showInformationMessage()
				state.dumpCommands = await input.showInputBox({
					title,
					step:4,
					totalSteps:4,
					ignoreFocusOut:true,
					placeholder: '(optionally) enter a tcpdump expression to filter results',
					//prompt: new vscode.MarkdownString(`[TCPdump cheatsheet](https://packetlife.net/media/library/12/tcpdump.pdf)  \n`) ,
					activeItem: typeof state.dumpCommands !== 'string' ? state.dumpCommands: undefined,
					validate: validateTCPdump,
					shouldResume: shouldResume
				})
				
				runRemoteCommand(input, state, {
					expression: state.dumpCommands,
					interface: state.configureCommand.label})
					input.steps.pop()
					return(input) => dumpCommands(input, state)
			}
	async function netcatIPversion(input, state){
		state.netcatIPversion = await input.showQuickPick({
			title,
			step:4,
			totalSteps:6,
			ignoreFocusOut:true,
			placeholder: 'select the ip version to use',
			items: ipVersions,
			activeItem: typeof state.netcatIPversion !== 'string' ? state.netcatIPversion: undefined,
			shouldResume: shouldResume
		})
		return(input) => netcatPort(input, state)
	}
	
	
	async function netcatPort(input, state){
		let portselection = await netcatports(commonports)
		portselection.push({label: "$(add)"})
		state.netcatPort = await input.showQuickPick({
			title,
			step:5,
			totalSteps:6,
			ignoreFocusOut:true,
			placeholder: 'select the port to use',
			items: portselection,//['443', '80', '3389', '2389', '22'].map(p=>({label:p})),
			//buttons: [portButton],
			activeItem: typeof state.netcatPort !== 'string' ? state.netcatPort: undefined,
			shouldResume: shouldResume
		})
		
			//console.log(`dont add: ${input}`)
			if(state.netcatPort.label === '$(add)'){
				return(input) => addportsquestionmark(input, state)
			}else{
				return(input) => netcatDestination(input, state)
			}
			
	}


	async function addportsquestionmark(input, state){
		state.netcatPort.label = await input.showInputBox({
			title,
			step:5.5,
			totalSteps:6,
			ignoreFocusOut:true,
			prompt: 'enter a valid port number',
			validate: validatePort,
			shouldResume: shouldResume
		})
		commonports.push(state.netcatPort.label)
	return(input) => netcatDestination(input, state)
}
	
	async function netcatDestination(input, state){
		state.netcatDestination = await input.showInputBox({
			title,
			step:6,
			totalSteps:6,
			ignoreFocusOut:true,
			placeHolder: 'enter the destination for netcat',
			//prompt: netcatDestination,
			activeItem: typeof state.netcatDestination !== 'string' ? state.netcatDestination: undefined,
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		})
		//netcatports.includes(state.netcatDestination) ? {} : netcatports.push(state.netcatDestination)
		runRemoteCommand(input, state, {
			destination: state.netcatDestination,
			port: state.netcatPort.label,
			version: parseInt(state.netcatIPversion.label.at(-1),10),
			protocol: state.configureCommand.label
		})
		input.steps.pop()
		return(input) => netcatDestination(input, state)
	}
	async function runRemoteCommand(input, state, body){
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Running ${state.command.label}, may take up to 30 Seconds`,
			cancellable: false
		}, ()=>{
			let resp = session.remoteCMD(`appliances/${state.appliance.id}/command/${state.command.label}`, body)
			display(resp)
			return resp
		})
		async function display(resp){
			let data = await resp
			getoutputChannel().clear();
		let lines = await data.split(/\r?\n/)
		lines.forEach(l=>getoutputChannel().appendLine(l))
		getoutputChannel().show(true);
		
		}

		
	}
	
function shouldResume() {
	// Could show a notification with the option to resume.
	return new Promise((resolve, reject) => {
		// noop
	});
}

function validateTCPdump(cmd){
	let tcpdumpcmdmap = [
		["-nn", "Don't resolve hostnames or ports"],
		["-n","Don't resolve hostnames"],
		["-c","Stop capture after this many packets"],
		["-e","Print link level header on each line"],
		["-N","Only print hostname, no domain info"],
		["-Q","Specify packet direction (in, out, inout)"],
		["-s","snaplen, 68 bytes is adequate for IP, ICMP, TCP and UDP"],
		["-ttt", "print the timestamp delta between lines"],
		["host", "only capture matching hosts, can be prefixed with dst or src"],
		["net", "only capture matching addresses, works with partial octets"],
		["port", "only capture matching ports,can be prefixed with dst or src"],
		["portrange", "only capture within port range"],
		["proto", "ipv4 or 6: ah, esp, icmp, igmp,  igrp, tcp, udp, etc"],
		["vlan", "capture only matching vlan"]
	]
	//let optionsmessage = ""
	tcpdumpcmdmap.forEach(c => cmd.includes(c[0]) ? vscode.window.showInformationMessage(c[1]) : null)
	
}
async function validateNameIsUnique(name) {
	// ...validate...
	//await new Promise(resolve => setTimeout(resolve, 1000));
	return undefined;//name === 'vscode' ? 'Name not unique' : undefined;
}
function validatePort(port) {

	if(port.length){
		if(/[^\d]/.test(port)){
			return "ports must be integers"
		}else if(65535 >= parseInt(port) < 1){
			return "Not a valid port number"
		}
		else{
			return undefined
		}
	}else{
		return undefined
	} 
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
	//let avail = ints.match(/(?<=^\d\.)\S+/gm).map(i=>({label:i}))
	//console.log(JSON.stringify(avail))
	return await ints.match(/(?<=^\d\.)\S+/gm).map(i=>({label:i}))
}
	await collectInputs();
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
	
	
    async showQuickPick({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume}) {
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
					//console.log(activeItem)
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
                }), 
				input.onDidChangeSelection(items => resolve(items[0])), input.onDidHide(() => {
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
    async showInputBox({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume}) {
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