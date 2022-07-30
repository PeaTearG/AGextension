const vscode = require("vscode");

class selectedClaims {
  constructor() {
    this.claimtypes = ['userClaims', 'deviceClaims', 'systemClaims'];
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.claims = "";
  }
  refresh(){
    this._onDidChangeTreeData.fire();
  }
  getclaims(claims){
    this.claims = claims;
  }
  getTreeItem(element){
    return element;
  }
 getChildren(element){
    if(element){
        let array = [];
        for (let i of Object.keys(element.toExpand)){
            let subclaim = typeof element.toExpand[i] === "object" ? new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Expanded) : new vscode.TreeItem(`${i}: ${element.toExpand[i]}`);
            subclaim['toExpand'] = element.toExpand[i]
            subclaim.contextValue = element.contextValue;
            array.push(subclaim)
        }
        return array
      }
      else {
        let array = [];
        for (let i of this.claimtypes){
          let subclaim = new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Expanded)
          subclaim['toExpand'] = this.claims[i]
          subclaim.contextValue = i;
          array.push(subclaim)
        }
        return array
      }
      }
    }
module.exports = selectedClaims;