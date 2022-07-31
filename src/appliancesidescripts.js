const vscode = require("vscode");

class appliancesidescripts {
  constructor(entitlementScripts, userClaimScripts, criteriaScripts, conditions) {
    this.claimtypes = ['entitlementScript', 'userClaimsScript', 'criteriaScript', 'conditions'];
    this.criteriaScript = criteriaScripts
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
 getChildren(element){
    if(element){
        const scripticonmap = {userClaimsScript: "person-add",entitlementScript:"live-share", criteriaScript:"tasklist", conditions:"lock-small"}
        let array = [];
        for (let i of element['toExpand']){
            let subclaim = new vscode.TreeItem(i['name'], vscode.TreeItemCollapsibleState.None)
            subclaim['toExpand'] = i['expression']
            subclaim['scriptType'] = element.contextValue;
            subclaim.contextValue = 'script';
            subclaim.iconPath = new vscode.ThemeIcon(scripticonmap[element.contextValue]);
            array.push(subclaim)
        }
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