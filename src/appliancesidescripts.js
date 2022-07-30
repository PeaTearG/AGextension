const vscode = require("vscode");

class appliancesidescripts {
  constructor(entitlementScripts, userClaimScripts, criteriaScripts) {
    this.claimtypes = ['entitlementScripts', 'userClaimScripts', 'criteriaScripts'];
    this.criteriaScripts = criteriaScripts
    this.entitlementScripts = entitlementScripts
    this.userClaimScripts = userClaimScripts
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
        let array = [];
        for (let i of element['toExpand']){
            let subclaim = new vscode.TreeItem(i['name'], vscode.TreeItemCollapsibleState.None)
            subclaim['toExpand'] = i['expression']
            subclaim.contextValue = 'script';
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
          console.log(subclaim)
          array.push(subclaim)
        }
        return array
      }
      }
    }
module.exports = appliancesidescripts;