const vscode = require("vscode");

class entitlementsAnalyzer {
  constructor(session) {
    this.session = session;
    //this.claims = claims;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.policies = this.getPolicies()
    this.entitlements = this.getEntitlements()
    this.sites = this.getSites()

  }
  refresh(){
    this._onDidChangeTreeData.fire();
  }
  async getPolicies(){
    return await this.session.customGet('policies')
  }
  async getSites(){
    return await this.session.customGet('sites')
  }
  async getEntitlements(){
    return await this.session.customGet('entitlements')
  }
  getTreeItem(element) {
    return element;
  }
  async defineEntitlementTreeItems(element){
    
    //const policyType = ["Access", "Admin", "Device", "Dns", "Mixed"]
    //let entitlements = await this.getEntitlementsOfSite(element.label)
    let array = [];
    for (let entitlement of element.entitlements){
      let policies = await this.getPoliciesofEntitlement(entitlement)
      let newentitlement = new vscode.TreeItem(entitlement.name)
      if (policies.length > 0){
        newentitlement.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        newentitlement['policies'] = policies
      }
      newentitlement['tags'] = entitlement.tags
      newentitlement['id'] = entitlement.id
      newentitlement['disabled'] = entitlement.disabled
      newentitlement.contextValue = "entitlement"
      newentitlement.label = entitlement.name
      array.push(newentitlement)
    }
    return array;
  }
  async definePolicies(element){
    let policies = await this.getPoliciesofEntitlement(element)
    let array = []
    for (let policy of policies){
      let newpolicy = new vscode.TreeItem(policy.name)
      newpolicy.contextValue = "policy"
      newpolicy.label = policy.name
      array.push(newpolicy)
    }
    return array;
  }
  async defineSiteTreeItems(){
    let array = [];
    for (let site of await this.sites){
      let entitlements = await this.getEntitlementsOfSite(site.name)
      let newsite = new vscode.TreeItem(site.name)
      if (entitlements.length > 0){
        newsite.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        newsite["entitlements"] = entitlements
      }
      newsite.contextValue = "site"
      newsite.label = site.name
      array.push(newsite)
    }
    return array
  }
  async getEntitlementsOfSite(site){
    let array = []
    
    for (let entitlement of await this.entitlements){
      if(entitlement.siteName === site){
        array.push(entitlement)
      }
    }
    return array
  }
  async getPoliciesofEntitlement(entitlement){
    let array = []
    for (let policy of await this.policies){
      if(policy.entitlements.includes(entitlement.id)){
        array.push(policy)
      }
      for (let tag of entitlement.tags){
        if(policy.entitlementLinks.includes(tag)){
          array.push(policy)
        }
      }
    }
    
    return array
  }



  /*makematches(element){
    let data = element.toExpand
      data.forEach(async (p) => {
        const result = this.session.conditionTest(p.expression, this.claims)
        if(await result.result){
          let treeitem = new vscode.TreeItem(p.name, vscode.TreeItemCollapsibleState.None)
          treeitem.contextValue = p
          this.assign(element.contextValue, treeitem)
        }
      })
  }

  async runtest(element){
    const evaluations = await Promise.all(element.toExpand.map(async (i) => {
      let resp = await this.session.conditionTest(i.expression, this.claims)
      return  resp.result ? this[element.contextValue].push(i) : i; `{${resp.result}:${i}}` ; 
   }))
    return evaluations
  }
 
  

  configuretooltop(policy){
    if(policy.type === 'Dns'){
      return policy.dnsSettings
    }
    if(policy.type === 'Access'){
      return this.getmatchentitlements(policy)
    }
  }

  async getmatchentitlements(entitlementarrs){
    let actions = [];
    if(typeof this.Access === 'undefined'){
      await this.getEntitlements()
    }
   actions.push(await entitlementarrs.entitlements.forEach(e=>this.entitlements.filter(r=>r.id===e)).actions)
    actions.push(await entitlementarrs.entitlements.forEach(e=>this.entitlementLinks.filter(r=>r.id===e)).tags)
    return actions
  }*/
  async getChildren(element) {
    if(element){
      if(element.contextValue === "site"){
        return await this.defineEntitlementTreeItems(element)
      }
      else if(element.contextValue === "entitlement"){
        return await this.definePolicies(element)
      }
    }else{
      return this.defineSiteTreeItems()
    }

  }

 /*async getChildren(element) {
    if (element) {
      if(element.hasOwnProperty('toExpand')){
      await this.runtest(element)
      return this[element.contextValue].map(m=>{
        let n = new vscode.TreeItem(`${m.name}`, m.type === 'Access' ? vscode.TreeItemCollapsibleState.Collapsed: vscode.TreeItemCollapsibleState.None)
        n.tooltip = new vscode.MarkdownString()
        n.tooltip.appendMarkdown(`[${m.name}](https://${this.session.baseURI}:8443/ui/access/policies/edit/${m.id})`)
        if(m.dnsSettings.length){
          n.tooltip.appendCodeblock(JSON.stringify(m.dnsSettings, null, 2), 'json')
        }
        if(m.disabled){
          n.iconPath = new vscode.ThemeIcon('warning')
        }
        n.contextValue = m
        //n.push(element)
        return n
    })}else{
      if(element.contextValue.type === "Access"){
        let ents = await this.getEntitlements()
        let treeitems = []
        await element.contextValue.entitlements.forEach(e => {treeitems.push(ents.reduce((acc, val) => {
          if(e === val.id){
            let n = new vscode.TreeItem(`${val.name}`)
            n.tooltip = new vscode.MarkdownString()
            n.contextValue="entitlement"
            n.iconPath = new vscode.ThemeIcon("arrow-both")
            n.tooltip.appendMarkdown(`https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${val.id}`)
            n.tooltip.appendCodeblock(JSON.stringify(val.actions[0], null, 2), 'json')
            acc.push(n)
          }
        return acc},[]))})
        await element.contextValue.entitlementLinks.forEach(ee => {treeitems.push(ents.reduce((acc, val) => {
          if(val.tags.includes(ee)){
            let n = new vscode.TreeItem(`${val.name}`)
            n.tooltip = new vscode.MarkdownString()
            n.contextValue="tag"
            n.iconPath = new vscode.ThemeIcon("tag")
            n.tooltip.appendMarkdown(`https://${this.session.baseURI}:8443/ui/access/policies/edit/${element.id}`)
            n.tooltip.appendCodeblock(JSON.stringify(val.actions[0], null, 2), 'json')
            acc.push(n)
          }
        return acc},[]))})
        return treeitems.flat()
      }
    }
     } else {
        return this.defineClaimTreeItems()
    };
};*/
}


module.exports = entitlementsAnalyzer;