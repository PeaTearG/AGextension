const vscode = require("vscode");



class DataProvider {
  constructor(session) {
    this.session = session;
    this.sessionaggregation = [];
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }
  refresh(){
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  defineClaimTreeItems(claims){
    const claimTypes = ["userClaims", "deviceClaims", "systemClaims"]
    const claimiconmap = {userClaims: "account",deviceClaims:"device-desktop", systemClaims:"gear"}
    let array = [];
    for (let claimtype of claimTypes){

    //this will return count the number of policies by
      //function(acc, arr){}
      //claimTypes.reduce((acc, t)=>(acc, t)){
      let newclaim = new vscode.TreeItem(claimtype, vscode.TreeItemCollapsibleState.Collapsed)
      newclaim['toExpand'] = claims[claimtype];
      newclaim.tooltip = new vscode.MarkdownString()
      newclaim.tooltip.appendCodeblock(JSON.stringify(claims[claimtype], null, 2), 'json')
      newclaim.iconPath = new vscode.ThemeIcon(claimiconmap[claimtype]);
      array.push(newclaim)
    }
    return array;
  }

  async getChildren(element) {
    if (element) {
      if(element.hasOwnProperty('dn')){
        let claims = await this.session.getClaims(element.dn)
        element['claims'] = Object.values(claims)[0];
        return this.defineClaimTreeItems(element.claims)
      }else{
        let array = [];
        for (let i of Object.keys(element.toExpand)){
          let subclaim = typeof element.toExpand[i] === "object" ? new vscode.TreeItem(i, vscode.TreeItemCollapsibleState.Collapsed) : new vscode.TreeItem(`{${i}: ${element.toExpand[i]}}`);
          subclaim['toExpand'] = element.toExpand[i];
          subclaim.tooltip = new vscode.MarkdownString()
          subclaim.tooltip.appendCodeblock(JSON.stringify(element.toExpand[i], null, 2), 'json')
          subclaim.iconPath = element.iconPath;
          array.push(subclaim)
        }
        return array
      }
     
    }
      else {
        this.activesessions = await this.session.activeSessions();
        let array = [];
        // this.users.forEach((element) => 
         for (let element of await this.activesessions.data){
          let newsession = new vscode.TreeItem(element.username, vscode.TreeItemCollapsibleState.Collapsed)
          newsession['dn'] = element.distinguishedName;
          newsession.contextValue = "asession"
          array.push(newsession)
         }
          
         ;
         return array;
    };
};

  

}


module.exports = DataProvider;