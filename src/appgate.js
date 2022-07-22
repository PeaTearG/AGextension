const vscode = require('vscode');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default;

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

function sessDetails(url, creds, dn, succfunc) {
    axios.get(`https://${url}:8443/admin/session-info/${dn}`,
    {headers: authHeaders(creds)
    })
    .then(({data}) => {
        succfunc(data)
    })
    .catch((error)=>{console.log(error)})
}

module.exports = {sessDetails, activeSessions, loginProviders, login, headers, authHeaders};