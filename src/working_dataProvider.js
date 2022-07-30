const vscode = require("vscode");
const axios = require('axios').default;

class DataProvider {
  constructor(userdata) {
    //this.url = context.environmentVariableCollection.get('URL').value;
		//this.token = context.secrets.get(this.url);
    this.users = userdata
    
    /*this.users = [
      {
        firstName: "John",
        lastName: "Doe",
        position: { name: "Manager", level: "3" },
      },
      {
        firstName: "Jane",
        lastName: "Doe",
        position: { name: "Backend Engineer", level: "2" },
      },
    ];*/
    this.userTreeItems = this.convertUsersToTreeItems();
  }

  getTreeItem(element) {
    return element;
  }

getChildren(element) {
    if (element) {
      return element.getPositionDetails();
    }
      else {
      return this.userTreeItems;
    };
};

  convertUsersToTreeItems() {
    let array = [];
   // this.users.forEach((element) => 
    for (let element of this.users){
      console.log(element);
      array.push(
        new UserTreeItem(element, vscode.TreeItemCollapsibleState.Collapsed)
      );
    };
    return array;
  }
}

class UserTreeItem {
  // we must provide the property label for it to show up the tree view
  constructor(user, collapsibleState) {
    this.user = user;
    this.label = `${user.username} ${user.providerName}`;
    this.collapsibleState = collapsibleState;
    this.positionDetails = [];

    this.convertPositionToTreeItems();
  }

  // Convert each property in user.position to a TreeItem which is treated as child of the user tree item
  convertPositionToTreeItems() {
    if (this.user.distinguishedName) {
      let prop1 = new vscode.TreeItem(
        "User Claims"
      );
      let prop2 = new vscode.TreeItem(
        "Device Claims"
      );
      let prop3 = new vscode.TreeItem(
        "System Claims"
      );
      this.positionDetails = [prop1, prop2, prop3];
    }
  }

  getPositionDetails() {
    return this.positionDetails;
  }
}

module.exports = DataProvider;