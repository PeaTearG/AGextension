const vscode = require("vscode");

class appliancesidescripts {
  constructor(session, entitlementScripts, userClaimScripts, criteriaScripts, conditions) {
    this.claimtypes = ['entitlementScript', 'userClaimsScript', 'criteriaScript', 'conditions'];
    this.criteriaScript = criteriaScripts
    this.session = session
    this.entitlementScript = entitlementScripts
    this.userClaimsScript = userClaimScripts
    this.conditions = conditions
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }
  refresh(){
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element){
    return element;
  }
  async groupEntitlementScripts(){
    this.host = this.entitlementScript.filter(f=> f.type === 'host')
    this.portOrType = this.entitlementScript.filter(f=> f.type === 'portOrType')
    this.appShortcut = this.entitlementScript.filter(f=> f.type === 'appShortcut')
    this.entitlements = await this.session.customGet('entitlements')
  }
  countbyhost(scriptname){
    let count = this.entitlements.filter(entitlement=>
      entitlement.actions.some(action=>
        action.hosts.includes(`script://${scriptname}`)
      )
      //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])
  )
return count
}

countbyportOrType(scriptname){
  let count = this.entitlements.filter(entitlement=>
    entitlement.actions.some(action=>{
        return action.hasOwnProperty('ports')  ? action.ports.includes(`script://${scriptname}`) : action.hasOwnProperty('types')  ? action.types.includes(`script://${scriptname}`) : undefined; 
    }
        //action.hasOwnProperty('types') ? action.types.includes(`script://${scriptname}`) : []
    ))
        //|| action.types.includes(`script://${scriptname}`) 
    
    //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])

return count
}

async countbyappShortcut(scriptid){
  this.hasOwnProperty('entitlements') ? undefined : this.entitlements = await this.session.customGet('entitlements');
  let count = await this.entitlements.filter(entitlement=>
    entitlement.appShortcutScripts.includes(scriptid)
    )
    //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])
return count
}

async countbyuserScript(scriptid){
  this.hasOwnProperty('identityproviders') ? undefined : this.identityproviders = await this.session.customGet('identity-providers');
  //let userClaimsScripts = await this.session.customGet('identity-providers')
  let count = await this.identityproviders.filter(userscript => userscript.userScripts.includes(scriptid))
  return count
}

async countbyCondition(scriptid){
  this.hasOwnProperty('entitlements') ? undefined : this.entitlements = await this.session.customGet('entitlements');
  //let userClaimsScripts = await this.session.customGet('identity-providers')
  let count = await this.entitlements.filter(entitlement => entitlement.conditions.includes(scriptid))
  return count
}

async countbycriteria(scriptname){
  this.hasOwnProperty('policies') ? undefined : this.policies = await this.session.customGet('policies');
  //let userClaimsScripts = await this.session.customGet('identity-providers')
  let count = await this.policies.filter(policy => policy.expression.includes(`/*criteriaScript*/(${scriptname}(claims))/*end criteriaScript*/`))
  return count
}

 async getChildren(element){
    if(element){
     
      let array = [];
      if(element.label === 'entitlementScript'){
        let enttypes = ['host', 'appShortcut', 'portOrType']
        for (let i of enttypes){
          let ent = new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Collapsed)
          ent['scriptfamily'] = element.label;
          ent['toExpand'] = this[i]
          array.push(ent)
        }
      }
        else{const scripticonmap = {userClaimsScript: "person-add",entitlementScript:"live-share", criteriaScript:"tasklist", conditions:"lock-small"}
        for (let i of element['toExpand']){
            let subclaim = new vscode.TreeItem(i['name'], vscode.TreeItemCollapsibleState.None)
            
            subclaim['toExpand'] = i['expression']
            subclaim['scriptType'] = i.type;
            subclaim.tooltip = new vscode.MarkdownString();
            if(i.type === 'appShortcut'){
              subclaim.contextValue = await this.countbyappShortcut(i['id']);
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.scriptfamily;
            }else if(i.type === 'host'){
              subclaim.contextValue = await this.countbyhost(i['name'])
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.scriptfamily;
            }else if(i.type === 'portOrType'){
              subclaim.contextValue = await this.countbyportOrType(i['name'])
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.scriptfamily;
            }else if(element.label === 'userClaimsScript'){
              subclaim.contextValue = await this.countbyuserScript(i['id'])
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/identity/identity-providers/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.label;
            }else if(element.label === 'criteriaScript'){
              subclaim.contextValue = await this.countbycriteria(i['name'])
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/access/policies/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.label;
            }else if(element.label === 'conditions'){
              subclaim.contextValue = await this.countbyCondition(i['id'])
              subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${e.id})  \n`))
              subclaim['scriptfamily'] = element.label;
            }
            subclaim.iconPath = new vscode.ThemeIcon(scripticonmap[element.label]);
            subclaim.label += ` (${subclaim.contextValue.length})`
            subclaim.contextValue = 'script'
            subclaim.iconPath = new vscode.ThemeIcon(scripticonmap[element.contextValue]);
            array.push(subclaim)
        }}
        return array
      }
      else {
        await this.groupEntitlementScripts()
        let array = [];
        for (let i of this.claimtypes){
          let subclaim = new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Collapsed)
          subclaim['toExpand'] = this[i]
          subclaim.contextValue = i;
          array.push(subclaim)
        }
        return array
      }
      }
    }
module.exports = appliancesidescripts;