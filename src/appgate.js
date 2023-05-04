const vscode = require('vscode');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default;

class prelogin {
    constructor() {
        this.body = {
            deviceId: uuidv4()
        };
        this.providers = [];
        this.headers = {
            Accept: "application/vnd.appgate.peer-v16+json",
            "Content-Type": "application/json",
          };
    }
    controller = async (context) => {
        this.baseURI = await vscode.window.showInputBox({placeHolder: "controller url", 'ignoreFocusOut': true, value: context.environmentVariableCollection.get('URL') ? context.environmentVariableCollection.get('URL').value : null}); 
        context.environmentVariableCollection.append('URL', this.baseURI);
        return this.baseURI;
    }
    loginProviders = async (context) => {
        let resp = await axios.get(`https://${this.baseURI}:8443/admin/identity-providers/names`, {headers: this.headers})
        for (let provider of resp.data.data){
            provider.type === 'Credentials' ? this.providers.push(provider.name) : vscode.window.showInformationMessage(`will not work with ${provider.name} due to type ${provider.type}`);
            
        }
        
    }
    pickProvider = async (context) => {
        this.body['providerName'] = await vscode.window.showQuickPick(this.providers, { placeHolder: "select the identity provider" /*context.environmentVariableCollection.get('IdP') ? context.environmentVariableCollection.get('IdP').value : "Select an IDP"*/})
        context.environmentVariableCollection.append('IdP', this.body.providerName)
        this.providers = [];
    }
    getUsername = async (context) => {
        this.body['username'] = await vscode.window.showInputBox({placeHolder: `username for identity provider: ${context.environmentVariableCollection.get('IdP').value}`,'ignoreFocusOut': true, value: context.environmentVariableCollection.get('username') ? context.environmentVariableCollection.get('username').value : ""})
        context.environmentVariableCollection.append('username', this.body.username)
    }
    getPassword = async () => {
        this.body['password'] = await vscode.window.showInputBox({placeHolder: `password for user: ${this.body.username}`, 'password': true, 'ignoreFocusOut': true})
    }
    build = async (context) => {
        await this.controller(context);
         await this.loginProviders(context);
         await this.pickProvider(context);
         await this.getUsername(context);
         await this.getPassword();
        //console.log(this.body);
        
    }
}

class postlogin{
    constructor(){
        this.headers = {
            Accept: "application/vnd.appgate.peer-v17+json",
            "Content-Type": "application/json"
          };

    }
    url = async (url) => {
        this.baseURI = url;
    }
    do = async (body, context) => {
        let resp = await axios.post(`https://${this.baseURI}:8443/admin/login`, body, {headers: this.headers})
        await context.secrets.store(this.baseURI, resp.data.token);
        if (resp.status == 200) {
            vscode.window.showInformationMessage('Authentication Successful')
        }
        this.headers['Authorization'] = `Bearer ${resp.data.token}`
    }
    authenticate = async (body, context) => {
        let resp = await axios.post(`https://${this.baseURI}:8443/admin/authentication`, body, {headers: this.headers})
        await context.secrets.store(this.baseURI, resp.data.token);
        await this.buildheaders(context)
        if (resp.data.user.needTwoFactorAuth){            
            let optinitbody = {};
            this.otpinit(optinitbody, context)
        }else{
            this.authorize(context)
        }
        vscode.window.showInformationMessage('Authentication Successful')
    }
    otpinit = async (body, context) => {
        let resp = await axios.post(`https://${this.baseURI}:8443/admin/authentication/otp/initialize`, body, {headers: this.headers})
        if (resp.data.type === "AlreadySeeded"){
            let otp = await vscode.window.showInputBox({title: "Enter MFA", ignoreFocusOut: true})
            let otpfinbody = {"otp": otp}
            this.otpfin(otpfinbody, context)
        }
    }
    otpfin = async (body, context) => {
        let resp = await axios.post(`https://${this.baseURI}:8443/admin/authentication/otp`, body, {headers: this.headers})
        await context.secrets.delete(this.baseURI)
        await context.secrets.store(this.baseURI, resp.data.token)
        await await this.buildheaders(context)
        this.authorize(context)
    }
    authorize = async (context) => {
        let resp = await axios.get(`https://${this.baseURI}:8443/admin/authorization`, {headers: this.headers})
        await context.secrets.delete(this.baseURI)
        await context.secrets.store(this.baseURI, resp.data.token);
        await this.buildheaders(context);
        //await vscode.window.showInformationMessage(`Authenticated to ${this.baseURI}!`)
    }
    buildheaders = async (context) => {
        this.baseURI = context.environmentVariableCollection.get('URL').value;
        this.headers['Authorization'] = `Bearer ${await context.secrets.get(this.baseURI)}`
    }
    activeSessions = async ()=> {
        let active = await axios.get(`https://${this.baseURI}:8443/admin/stats/active-sessions/dn`, {headers: this.headers})
        return active.data;
    }
    getClaims = async (dn) => {
        let claims = await axios.get(`https://${this.baseURI}:8443/admin/session-info/${dn}`, {headers: this.headers})
        return claims.data.data
    }
    runScripts = async(scriptTypeEndpoint, body) => {
        let resp =  axios.post(`https://${this.baseURI}${scriptTypeEndpoint}`, body, {headers: this.headers})
        return resp
    }
    customGet = async (apiEndpoint) => {
        let resp = await axios.get(`https://${this.baseURI}:8443/admin/${apiEndpoint}`, {headers: this.headers})
        return resp.data.data
    }

    customPut = async(apiEndpoint, body) => {
        let resp = await axios.put(`https://${this.baseURI}:8443/admin/${apiEndpoint}`, body, {headers: this.headers})
        return resp.data.data
    }
    remoteCMD = async(apiEndpoint, body) => {
        let resp = await axios.post(`https://${this.baseURI}:8443/admin/${apiEndpoint}`, body, {headers: {Accept:"application/vnd.appgate.peer-v17+text", Authorization: this.headers.Authorization}})
        return resp.data
    }

    userClaimsScript = async (script, context) => {
        let body = new scriptBody(script, context);
        let resp = await this.runScripts(':8443/admin/user-scripts/test', body.format())
        return resp.data;
    }

    conditions = async (script, claims) => {
        let body = new scriptBody(script, claims);
        let resp = await this.runScripts(':8443/admin/conditions/test', body.format())
        return resp.data;
    }

     conditionTest = async (script, claims) => {
        let body = new scriptBody(script, claims);
        let resp = await this.runScripts(':8443/admin/conditions/test', body.format())
        return resp.data;
    }

    criteriaScript = async (script, claims) => {
        let body = new scriptBody(script, claims);
        let resp = await this.runScripts(':8443/admin/conditions/test', body.format())
        return resp.data;
    }

    entitlementScript = async (script, context) => {
        let type = await vscode.window.showQuickPick(['host', 'portOrType', 'appShortcut'])
        let body = new entitlementScriptBody(script, context)
        let resp = await this.runScripts(':8443/admin/entitlement-scripts/test', body[type]())
        return resp.data
    }
}

class scriptBody{
    constructor(script, claims){
        this.body = {
            expression: script,
            userClaims: claims.userClaims ? claims.userClaims : {},//claims.user,
            deviceClaims: claims.deviceClaims ? claims.deviceClaims : {},//claims.device,
            systemClaims: claims.systemClaims ? claims.systemClaims : {},//claims.system,
        }
    }
    format = () => {
        return JSON.stringify(this.body);
    }
}

class entitlementScriptBody extends scriptBody{
    constructor(script, claims){
        super(script, claims)
    }
    host = () => {
        this.body['type'] = 'host'
        return this.body;
    }
    portOrType = () => {
        this.body['type'] = 'portOrType'
        return this.body;
    }
    appShortcut = () => {
        this.body['type'] = 'appShortcut'
        return this.body;
    }
}


const headers = {
    Accept: "application/vnd.appgate.peer-v16+json",
    "Content-Type": "application/json",
  }

function loginProviders(url, pickprovider) {
    axios.get(`https://${url}:8443/admin/identity-providers/names`, {headers: headers})
    .then(({data})=>{
        var providers = [];
        for (let provider of data.data){
            provider.type === 'Credentials' ? providers.push(provider.name) : vscode.window.showInformationMessage(`will not work with ${provider.name} due to type ${provider.type}`);
        }
        pickprovider(providers);
    })
};

function login(provider, username, password, url, successfunc, failfunc) {
    axios.post(`https://${url}:8443/admin/login`, {
        providerName: provider,
        username: username,
        password: password,
        deviceId: uuidv4()
    },
    {headers: headers}
    )
    .then(({data}) => {
        successfunc(data)
    })
    .catch((error)=>{failfunc(error)})
}

function authHeaders(creds){
    return {
        Accept: "application/vnd.appgate.peer-v16+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${JSON.parse(creds)}`
      };
    //authheaders['Authorization'] = `Bearer ${creds}`;
    //return JSON.stringify(authheaders);
}

function activeSessions(url, creds, succfunc) {
    axios.get(`https://${url}:8443/admin/stats/active-sessions/dn`,
    {headers: authHeaders(creds)
    })
    .then(({data}) => {
        succfunc(data)
    })
    .catch((error)=>{console.log(error)})
}

function runScripts(url, creds, body, apiendpoint, succFunc) {
    axios.post(`https://${this.url}:8443/admin${apiendpoint}`, body, {headers: authHeaders(creds)})
    .then(({data})=> {
        succFunc(data)
    })
}



function sessDetails(url, creds, dn, succfunc) {
    axios.get(`https://${url}:8443/admin/session-info/${dn}`,
    {headers: authHeaders(creds)
    })
    .then(({data}) => {
        succfunc(data)
    })
    .catch((error)=>{console.log(error)})
}




module.exports = {prelogin, postlogin, runScripts, sessDetails, activeSessions, loginProviders, login, headers, authHeaders};