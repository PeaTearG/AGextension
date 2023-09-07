const vscode = require("vscode");

class entitlementsAnalyzer {
  constructor(session) {
    this.session = session;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.policies = this.getPolicies()
    this.entitlements = this.getEntitlements()
    this.sites = this.getSites()
    this.appliances = this.getAppliances()

  }
  refresh(){
    this._onDidChangeTreeData.fire();
  }
  async getPolicies(){
    return await this.session.customGet('policies')
  }
  async getAppliances(){
    return await this.session.customGet('appliances')
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
      //newentitlement.label = entitlement.name
      newentitlement.tooltip = new vscode.MarkdownString()
      newentitlement.tooltip.appendMarkdown(`[open ${entitlement.name} in browser](https://${this.session.baseURI}:8443/ui/access/entitlements/edit/${entitlement.id})`)
      newentitlement.tooltip.appendCodeblock(JSON.stringify(entitlement.actions, null, 2), 'json')
      array.push(newentitlement)
    }
    return array;
  }
  async definePolicies(element){
    //let policies = await this.getPoliciesofEntitlement(element)
    let array = []
    for (let policy of element.policies){
      let newpolicy = new vscode.TreeItem(policy.name)
      newpolicy.contextValue = "policy"
      //newpolicy.label = policy.name
      newpolicy.tooltip = new vscode.MarkdownString()
      newpolicy.tooltip.appendMarkdown(`[open ${policy.name} in browser](https://${this.session.baseURI}:8443/ui/access/policies/edit/${policy.id})`)
      newpolicy.tooltip.appendCodeblock(JSON.stringify(policy.expression, null, 2), 'javascript')
      array.push(newpolicy)
    }
    return array;
  }
  async defineEntitlementLessSite(element){
    let array = []
    for (let entitlelesssite of element['sites']){
      let newsite = new vscode.TreeItem(entitlelesssite.name, vscode.TreeItemCollapsibleState.None)
      newsite.tooltip = new vscode.MarkdownString(`<a href="https://${this.session.baseURI}:8443/ui/system/sites/edit/${entitlelesssite.id}">${entitlelesssite.name}</a>`)
      newsite.tooltip.supportHtml = true
      newsite.tooltip.isTrusted = true
      array.push(newsite)
    }
    return array
  }
  async defineGatewayLessSite(element){
    let array = []
    for (let gatewaylesssite of element['sites']){
      let newsite = new vscode.TreeItem(gatewaylesssite.name, vscode.TreeItemCollapsibleState.None)
      newsite.tooltip = new vscode.MarkdownString(`<a href="https://${this.session.baseURI}:8443/ui/system/sites/edit/${gatewaylesssite.id}">${gatewaylesssite.name}</a>`)
      newsite.tooltip.supportHtml = true
      newsite.tooltip.isTrusted = true
      array.push(newsite)
    }
    return array
  }
  async defineSiteTreeItems(){
    let array = [];
    let noentitlements = [];
    let nogateways = [];
    for (let site of await this.sites){
      let entitlements = await this.getEntitlementsOfSite(site.name)
      let appliances = await this.getGatewaysOfSite(site.name)
      let newsite = new vscode.TreeItem(`         ${site.name}`)
      if (entitlements.length > 0){
        newsite.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        newsite["entitlements"] = entitlements
      }
      newsite.contextValue = "site"
      newsite.id = site.id
      newsite.tooltip = new vscode.MarkdownString()
      newsite.tooltip.isTrusted = true
      newsite.tooltip.supportHtml = true
      let markdownstring = `<table><thead><tr><th colspan="1"><a href="https://${this.session.baseURI}:8443/ui/system/sites/edit/${site.id}">${site.name}</a></th></tr></thead><tbody>`
      for(let appliance of appliances){
        markdownstring += `<tr><td><a href="https://${this.session.baseURI}:8443/ui/system/appliances/edit/${appliance.id}">${appliance.name}</a></td></tr>`
      }
      markdownstring += '</tbody></table>'
      newsite.tooltip.appendMarkdown(markdownstring)
      if (newsite['entitlements']){
        array.push(newsite)
      }
      if(entitlements.length === 0){
        noentitlements.push(site)
      }
      if(appliances.length === 0){
        nogateways.push(site)
      }
    }
    if (noentitlements.length > 0){
      let entitlementlesssite = new vscode.TreeItem("Entitlementless Sites")
      entitlementlesssite.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
      entitlementlesssite.contextValue = "noentitlements"
      entitlementlesssite['sites'] = noentitlements
      array.push(entitlementlesssite)
    }
    if (nogateways.length > 0){
      let gatewaylesssite = new vscode.TreeItem("Gatewayless Sites")
      gatewaylesssite.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
      gatewaylesssite.contextValue = "nogateways"
      gatewaylesssite['sites'] = nogateways
      array.push(gatewaylesssite)
    }
    return array
  }
  async getEntitlementsOfSite(sitename){
    let array = []
    
    for (let entitlement of await this.entitlements){
      if(entitlement.siteName === sitename){
        array.push(entitlement)
      }
    }
    return array
  }
  async getGatewaysOfSite(sitename){
    let array = []
    for (let appliance of await this.appliances){
      if(appliance.gateway.enabled && appliance.siteName === sitename){
        array.push(appliance)
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
  async getChildren(element) {
    if(element){
      if(element.contextValue === "site"){
        return await this.defineEntitlementTreeItems(element)
      }
      else if(element.contextValue === "entitlement"){
        return await this.definePolicies(element)
      }
      else if(element.contextValue === "noentitlements"){
        return  await this.defineEntitlementLessSite(element)
      }
      else if(element.contextValue === "nogateways"){
        return await this.defineGatewayLessSite(element)
      }
    }else{
      return this.defineSiteTreeItems()
    }

  }
}
module.exports = entitlementsAnalyzer;