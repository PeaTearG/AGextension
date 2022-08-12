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
  groupEntitlementScripts(){
    this.host = this.entitlementScript.filter(f=> f.type === 'host')
    this.portOrType = this.entitlementScript.filter(f=> f.type === 'portOrType')
    this.appShortcut = this.entitlementScript.filter(f=> f.type === 'appShortcut')
  }
 getChildren(element){
  this.groupEntitlementScripts()
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
            subclaim['scriptType'] = element.contextValue;
            subclaim.contextValue = 'script';
            subclaim.iconPath = new vscode.ThemeIcon(scripticonmap[element.contextValue]);
            array.push(subclaim)
        }}
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