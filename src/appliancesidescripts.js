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
      //console.log(entitlement)
      entitlement.actions.some(action=>
        //console.log(action.hosts.includes(`script://${scriptname}`))
        action.hosts.includes(`script://${scriptname}`)
      )
      //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])
  )
return count
}

countbyportOrType(scriptname){
  let count = this.entitlements.filter(entitlement=>
    //console.log(entitlement)
    entitlement.actions.some(action=>{
        return action.hasOwnProperty('ports')  ? action.ports.includes(`script://${scriptname}`) : action.hasOwnProperty('types')  ? action.types.includes(`script://${scriptname}`) : undefined; 
    }
        //action.hasOwnProperty('types') ? action.types.includes(`script://${scriptname}`) : []
    ))
        //|| action.types.includes(`script://${scriptname}`) 
    
    //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])

return count
}

countbyappShortcut(scriptid){
  let count = this.entitlements.filter(entitlement=>
    //console.log(entitlement)
    entitlement.appShortcutScripts.includes(scriptid)
    )
    //return acc + val.actions.filter(f => f.hosts.includes(`script://${scriptname}`))}, [])
return count
}

 async getChildren(element){
  
  await this.groupEntitlementScripts()
    if(element){
      let array = [];
      if(element.label === 'entitlementScript'){
        this.groupEntitlementScripts()
        let enttypes = ['host', 'appShortcut', 'portOrType']
        for (let i of enttypes){
          let ent = new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Collapsed)
          ent['toExpand'] = this[i]
          array.push(ent)
        }
      }
        else{const scripticonmap = {userClaimsScript: "person-add",entitlementScript:"live-share", criteriaScript:"tasklist", conditions:"lock-small"}
        for (let i of element['toExpand']){
            let subclaim = new vscode.TreeItem(i['name'], vscode.TreeItemCollapsibleState.None)
            subclaim['toExpand'] = i['expression']
            subclaim['scriptType'] = i.type;
            if(i.type === 'appShortcut'){
              subclaim.contextValue = this.countbyappShortcut(i['id']);
            }else if(i.type === 'host'){
              subclaim.contextValue = this.countbyhost(i['name'])
            }else if(i.type === 'portOrType'){
              subclaim.contextValue = this.countbyportOrType(i['name'])
            }
            subclaim.tooltip = new vscode.MarkdownString();
            subclaim.label += ` (${subclaim.contextValue.length})`
            subclaim.contextValue.forEach(e=>subclaim.tooltip.appendMarkdown(`[${e.name}](https://controller.sdpfederal.com:8443/ui/access/entitlements/edit/${e.id})  \n`))
            subclaim.iconPath = new vscode.ThemeIcon(scripticonmap[element.contextValue]);
            array.push(subclaim)
        }}
        console.log(array)
        return array
      }
      else {
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