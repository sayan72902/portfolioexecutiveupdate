//Model used for creating Project Tree Nodes.
Ext.define('ProjectTreeModel', {
	extend: 'Ext.data.TreeModel',
	fields: [
                {name: '_ref', type: 'string'},
                {name: 'Name', type: 'string'}
            ]
});

//Model used for creating PortfolioIteam tree node.
//This model will be used for both Epic and feature nodes.
Ext.define('PortfolioItemTreeModel', {
    extend: 'Ext.data.TreeModel',
    fields: [
            {name: '_ref', type: 'string'},
            {name: '_type', type: 'string'},
            {name: 'Name', type: 'string'},
            {name: 'Project', type: 'object'},
            {name: 'State', type: 'object'},
            {name: 'PercentDoneByStoryCount', type: 'double'},
            {name: 'FormattedID', type: 'string'},
            {name: 'Owner', type: 'object'},
            {name: 'c_Customer', type: 'string'},
            {name: 'c_LaunchRisk', type: 'object'},
            {name: 'c_OriginalLaunch', type: 'object'},
            {name: 'c_TargetLaunch', type: 'string'},
            {name: 'Notes', type: 'string'}
        ],
    hasMany: {model: 'FeatureTreeModel', name:'features', associationKey: 'features'}
});
 
 
 /*global Rally Ext Deft _ describe it before*/
 
 Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout:{
        type: 'vbox',
        aling: 'stretch',
        padding: 10
    },
    
    //List of all project names that needs to be excluded.
    projNamesToBeRemoved : ["ISS Research & Development", "Execution", "Archive", "Service Teams"],
    
    launch: function(){
        this._loadProjectStore();
    },
    
     //Loading the Project store soa that Project Tree can be constructed.
    _loadProjectStore: function(){
        var projectStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'Project',
                fetch: ['Name', 'State', 'Parent','Children'],
                limit: Infinity,
                filters:[{
                    Property:'State',
                    Value: 'Open'
                }],
                sorters: [{
                        property: 'Name',
                        direction: 'ASC'
                    }],
                autoLoad: true,
                context: {
                    workspace: '/workspace/1089940337',
                    //project:'/project/17750175838', 
                    projectScopeDown: true
                },
                
                listeners:{
                    load: function(projectStore, data, success)
                    { 
                       this._getAllProjectsAlongWithChildrenNeedForProjectTree(projectStore);
                       this._constructProjectTree(projectStore);
                    },
                    
                     scope:this
                }
            });
    },
    
    //Get all Projects along with their children. 
    _getAllProjectsAlongWithChildrenNeedForProjectTree: function(projectStore){
        this.removeProjColl = [];
        var that=this;
        
        //determine all the projects along with the child that needs to be removed.
        Ext.Array.each(projectStore.getRecords(),function(thisProject){
            if(_.contains(that.projNamesToBeRemoved, thisProject.get('Name'))){
                that.removeProjColl.push(thisProject);
                //console.log('Get Children count: ', thisProject.get('Children').Count);
                if( thisProject.get('Children') && thisProject.get('Children').Count > 0){
                    that._getAllChildProjects(thisProject, projectStore);
                }
            }
        });
    },
    
    //Recursive function to get all child project records from Parent.
    _getAllChildProjects: function(thisProject, projectStore){
        var that = this;
        Ext.Array.each(projectStore.getRecords(), function(projData) {
            if(projData.get('Parent') && projData.get('Parent')._ref === thisProject.data._ref){
                that.removeProjColl.push(projData);
                that._getAllChildProjects(projData, projectStore);
            }
        });
    },
    
     //Constructing the Project Tree.
    _constructProjectTree: function(projectStore){
        
        var that = this;
        
        //configuring the root Project node. (considering the Worksapce as the Root)
         var projectTreeRootNode = Ext.create('ProjectTreeModel',{
                    _ref: '/workspace/1089940337',
                    Name: 'Research and Development Workspace',
                    text: 'Research and Development Workspace',
                    root: true,
                    expandable: true,
                    expanded: true,
                    iconCls: 'ico-test-workspace'
                });
                
        //console.log('Project Root Node is: ', projectTreeRootNode);
        
        this._constructChildNodesFromRootNodes(projectTreeRootNode, projectStore);
        
        this._createProjectHierarchyTree(projectTreeRootNode);
    },
    
     //Configuring all the Project nodes immedeately placed under the Root Node.
    //all projects placed under workspace have parent as Null.
    _constructChildNodesFromRootNodes: function(projectTreeRootNode, projectStore){
         var that = this;
        Ext.Array.each(projectStore.getRecords(), function(thisProject) {
            if(!_.contains(that.removeProjColl, thisProject) && !thisProject.get('Parent')){
                
                if(thisProject.get('Name') && thisProject.get('_ref')){
                    var projectTreeNode = Ext.create('ProjectTreeModel',{
                        _ref: thisProject.get('_ref'),
                        Name: thisProject.get('Name'),
                        text: thisProject.get('Name'),
                        expandable: ( thisProject.get('Children') && thisProject.get('Children').Count > 0),
                        expanded: ( thisProject.get('Children') && thisProject.get('Children').Count > 0),
                        leaf: !( thisProject.get('Children') && thisProject.get('Children').Count > 0),
                        iconCls: 'ico-test-project'
                    });
                    
                    that._constructProjectTreeNodes(projectTreeNode, projectStore);
                    
                    projectTreeRootNode.appendChild(projectTreeNode);
                }
                
            }
        });
    },
    
    //Reccursive function to configure all Project nodes including child traversal.
    _constructProjectTreeNodes: function(parentNode, projectStore){
        var that = this;
        Ext.Array.each(projectStore.getRecords(), function(thisProject) {
            if((!_.contains(that.removeProjColl, thisProject)) && (thisProject.get('Parent') && thisProject.get('Parent')._ref === parentNode.data._ref)){
                
                if(thisProject.get('Name') && thisProject.get('_ref')){
                    
                    var projectTreeNode = Ext.create('ProjectTreeModel',{
                        _ref: thisProject.get('_ref'),
                        Name: thisProject.get('Name'),
                        text: thisProject.get('Name'),
                        leaf: !( thisProject.get('Children') && thisProject.get('Children').Count > 0),
                        expandable: ( thisProject.get('Children') && thisProject.get('Children').Count > 0),
                        iconCls: 'ico-test-project'
                    });
                    
                    if(!projectTreeNode.leaf){
                        that._constructProjectTreeNodes(projectTreeNode, projectStore);
                    }
                    
                    //Required to indentify the Strategy project nodes 
                    //since this Project records will be loaded by default.
                    if(projectTreeNode.data.Name === 'Strategy'){
                        that.defaultProjectNode = projectTreeNode;
                    }
                    
                    parentNode.appendChild(projectTreeNode);
                }
                
            }
        });
    },
    
    //Creating the Project Tree and adding it to the left panel.
    _createProjectHierarchyTree: function(projectTreeRootNode){
        //console.log('Entire Project Tree: ', projectTreeRootNode);
        
        var that = this;
        this.projectTreeStore = Ext.create('Ext.data.TreeStore', {
           model: 'ProjectTreeModel',
           root: projectTreeRootNode
        });
       
       var projectTreePanel = Ext.create('Ext.tree.Panel', {
            store: this.projectTreeStore,
            autoScroll: true,
            useArrows: true,
            lines: false,
            displayField: 'Name',
            rootVisible: true,
            width: 500,
            //height: 600,
            listeners: {
               itemclick: function( treePanel, record, item, index, e, eOpts ){
                   //console.log('The clicked item is: ', record);
                   
                   that.selectedProjNodeForContainers = record;
                   
                   if(record.data.Name && record.data._ref){
                        Ext.getCmp('rightPanel').setTitle('Monthly Update of "'+ record.data.Name +'" Project');
                        that._loadHierachicalGridStore(record.data._ref);
                   }
               } 
            }
        });
        
       //console.log('Test for Strategy node: ', this.defaultProjectNode);
       //this.add(projectTreePanel);
       
       var leftPanel = Ext.create('Ext.panel.Panel',{
            id: 'leftPanel',
            title: 'Workspace & Projects',
            region:'west',
            width: 250,
            split:true,
            collapsible: true,   // make collapsible
            layout: 'fit',
            items: [projectTreePanel]
         });
         
        var rightPanel = Ext.create('Ext.panel.Panel',{
            id: 'rightPanel',
            title: 'Select Project from left pane to load Monthly Update',
            region: 'center',     // center region is required, no width/height specified
            layout: 'fit',
            listeners: {
                afterrender: function ( rightPanel, eOpts) {
                    if(that.defaultProjectNode && that.defaultProjectNode.data._ref){
                       
                       //setting the deafult project node post rendering of the Right pane.
                       //required to load default project records.
                        that.selectedProjNodeForContainers = that.defaultProjectNode;
                        Ext.getCmp('rightPanel').setTitle('Monthly Update of "'+ that.defaultProjectNode.data.Name +'" Project');
                        that._loadHierachicalGridStore(that.defaultProjectNode.data._ref);
                    }
                }
            }
        });
         
        var containerPanel = Ext.create('Ext.panel.Panel', {
            id: 'containerPanel',
            width: '100%',
            height: 650,
            align: 'fit',
            layout: 'border',
            items: [leftPanel, rightPanel]
        });
         
        this.add(containerPanel);
    },
    
    _loadHierachicalGridStore: function(projRef){
        Ext.getBody().mask('Monthly update creation in progress...');
        
        this.selectedProjRef = projRef;
        
        var that = this, i, quarters = this._getAllFilterQuarters(); //Determine current quarter and next 3 future quarter
        var quarterFilter = Ext.create('Rally.data.wsapi.Filter', {
                                    property : 'c_TargetLaunch',
                                    operator : 'contains',
                                    value : quarters[0]
                                });
        
        
        for(i=1; i<quarters.length; i++){
            quarterFilter = quarterFilter.or(Ext.create('Rally.data.wsapi.Filter', {
                                    property : 'c_TargetLaunch',
                                    operator : 'contains',
                                    value : quarters[i]
                                }));
        }
        
        Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem/Epic',
            fetch: ['Name', 'Project','State', 'PercentDoneByStoryCount', 'FormattedID', 'Owner', 'c_LaunchRisk', 'c_OriginalLaunch', 'c_TargetLaunch', 'c_Customer', 'Notes', 'Children'],
            context: {
                workspace: that.getContext().getWorkspace()._Ref,
                limit: Infinity,
                project: projRef,
                projectScopeUp: false,
                projectScopeDown: true
            },
            filters: quarterFilter,
            sorters: [
                {
                    property: 'c_TargetLaunch',         //Need to add a sorter function for target launch.
                    direction: 'ASC'
                }
            ]
        }).load().then({
            success: this._loadFeatures,
            scope: this
        }).then({
            success:function(results) {
                if(!results){
                    Ext.getCmp('rightPanel').removeAll();
                    Ext.getBody().unmask();
                    return;
                }
                that._makeGrid(results);
            },
            failure: function(){
                Ext.getBody().unmask();
                console.log("oh something is wrong!");
            }
        });
    },
    
     _loadFeatures: function(epics){
        //console.log("load features started");
        var promises = [];
        _.each(epics, function(epic){
            var features = epic.get('Children');
            if (features.Count > 0) {
                features.store = epic.getCollection('Children',{fetch:['Name', 'Project','State', 'PercentDoneByStoryCount', 'FormattedID', 'Parent', 'Owner', 'c_LaunchRisk', 'c_OriginalLaunch', 'c_TargetLaunch','c_Customer', 'Notes']});
                promises.push(features.store.load());
            }
        });
        return Deft.Promise.all(promises);
    },
    
    //Logic to determine all 4 quarters counting from current quarter
    // and also considering next three quarters.
    _getAllFilterQuarters: function(){
        var Lumenize = require('./lumenize'), time = new Lumenize.Time('this quarter'), i = 0; 
        this.filterQuarters = [time.toString().replace('Q', ' Q')];
        for (i; i < 3; ++i) {
            this.filterQuarters.push(time.increment().toString().replace('Q', ' Q'));
        }
    
        return this.filterQuarters;
    },
    
    _makeGrid: function(results){
        var portfolioItems = _.flatten(results);
        var data = [];
        
        _.each(portfolioItems, function(thisPortfolioItem){
            data.push(thisPortfolioItem.data);
        });
        
        //console.log('Flattened data: ', data);
        
        var epicTargetLaunchColl = this._getAllEpicTargetLaunch(data);
        
        //console.log('Epic Target Launch collection: ', epicTargetLaunchColl);
        
        if(epicTargetLaunchColl.length > 0){
            
            this._createTargetLaunchTab(epicTargetLaunchColl, data);
        }
        
        Ext.getBody().unmask();
        
    },
    
    _getAllEpicTargetLaunch: function(data){
        var epicTargetLaunchColl = [];
        Ext.Array.each(data, function(record){
            if(record.Parent && record.Parent.c_TargetLaunch){
                var epicLaunch = record.Parent.c_TargetLaunch;
                if(!_.contains(epicTargetLaunchColl,epicLaunch)){
                    epicTargetLaunchColl.push(epicLaunch);
                }
            }
        });
        
        return epicTargetLaunchColl;
    },
    
    _createTargetLaunchTab: function(targetLaunchColl, portfolioItemData){
        var that = this, i = 0, tabIDLabel = 'launchTab';
        
        if(this.tabs){
            //console.log('Remove all existing Tabs');
            this.tabs.items.each(function(item){
                that.tabs.remove(item);
            });
        }
        else
        {
            //console.log('initializing tabs panel.');
            this.tabs = Ext.create('Ext.tab.Panel', {});
        }
            
        //Need to configure both epics with target launch.
        for (i = 0; i < (targetLaunchColl.length); i++) { 
            var tabCounter = i;
            this._configuringTabGrid(targetLaunchColl[i], portfolioItemData, (tabIDLabel + tabCounter++));
        }
        
        //console.log('Check out the tabs: ', this.tabs.items);
        
        if(this.tabs.items.getCount() > 0)
            this.tabs.setActiveTab(0);       //setting the first tab as active by default.
        
        Ext.getCmp('rightPanel').add(this.tabs);
    },
    
    _configuringTabGrid: function(targetLaunch, portfolioItemData, tabId){
        
        var that = this;
        
        if(that._isSelectedProjectNodeSupportCategorization()){
            that._categorizedGrid(portfolioItemData, targetLaunch, tabId);
        }
        else{
            //console.log('No project Categorization available!!');
            that._constructGridWithoutCategories(portfolioItemData, targetLaunch, tabId);
            Ext.getBody().unmask();
        }
    },
    
    _isSelectedProjectNodeSupportCategorization: function(){
        var that = this;
        this.childProjectNodesForContainer = [];
        
        if(this.selectedProjNodeForContainers && this.selectedProjNodeForContainers.childNodes.length > 0){
            Ext.Array.each(this.selectedProjNodeForContainers.childNodes, function(thisChildNode){
                if(thisChildNode.isLeaf()){
                    that.childProjectNodesForContainer = [];
                    return false;
                }
                else{
                    that.childProjectNodesForContainer.push(thisChildNode);
                }
                    
            });
        }
        
        return (this.childProjectNodesForContainer.length > 0);
    },
    
     _categorizedGrid: function(portfolioItemData, targetLaunch, tabId){
        var categoryDataColl = [];
        var that = this;
        var isCategoryPanelExpanded = true;
        
        Ext.Array.each(this.childProjectNodesForContainer, function(thisCategoryNode) {
            var epicCategorisedColl = that._determineProjectCategoryNodes(portfolioItemData, thisCategoryNode, targetLaunch);
            
            if(epicCategorisedColl.length > 0)
                categoryDataColl.push({
                    key: thisCategoryNode,
                    value: epicCategorisedColl
                });
        });
        
        if(categoryDataColl.length > 0){
            //console.log('categoryDataColl incuding: ', categoryDataColl);
            
            var containerPanelId = 'panel'+ tabId;
            this._createTargetLaunchTabWithPanelContainer(targetLaunch, tabId, containerPanelId);
                            
            for(var i=0; i < categoryDataColl.length; i++){
                isCategoryPanelExpanded = (i===0);
                this._createCategoryGridStore(categoryDataColl[i], targetLaunch, containerPanelId, isCategoryPanelExpanded);
            }
            
        }
    },
    
     _createTargetLaunchTabWithPanelContainer: function(targetLaunch, tabId, containerPanelId){
        //Create a Tab with the Target Launch date.
         var launchTab = this.tabs.add({
                    title: targetLaunch,
                    autoScroll: true,
                    itemId: tabId,
                    layout: {
                        type: 'vbox',
                        align: 'stretch',
                        padding: 5
                    },
                    rendererTo: Ext.getBody()
                });
        
        if(categoryContainerPanel){
            categoryContainerPanel.removeAll();
        }
        
        var categoryContainerPanel = Ext.create('Ext.panel.Panel', {
                autoScroll: true,
                id: containerPanelId,
                bodyPadding: 5,
                width: 1300,
                //height: 580,
                layout: {
                    type: 'vbox',       // Arrange child items vertically
                    align: 'stretch',    // Each takes up full width
                    padding: 5
                }
            });

        launchTab.add(categoryContainerPanel);
    },
    
    _constructGridWithoutCategories: function(portfolioItemData, targetLaunch, tabId){
        
        var epicCategorisedColl = this._determineEpicsWithoutProjectCategoryNodes(portfolioItemData, targetLaunch);
            
        if(epicCategorisedColl.length > 0){
            var containerPanelId = 'panel'+ tabId;
            this._createTargetLaunchTabWithPanelContainer(targetLaunch, tabId, containerPanelId);
            this._createEpicStoreWithoutCategory(_.flatten(epicCategorisedColl), targetLaunch, containerPanelId);
        }
       
    },
    
    _determineEpicsWithoutProjectCategoryNodes: function(portfolioItemData, targetLaunch){
        var that = this;
        var epicCategorisedColl = [];                      // value pair key: category node and value: collection of epics with fearure records.
        var allEpicsAdded = [];
        
        Ext.Array.each(portfolioItemData, function(thisPortfolio){
            var epicRecord = thisPortfolio.Parent;
            if(epicRecord && !that._isEpicAllreadyPresent(allEpicsAdded, epicRecord) && epicRecord.c_TargetLaunch === targetLaunch){
                var epicFeaturesColl = [];
                var featureColl = that._getAssociatedFeatureRecords(epicRecord, portfolioItemData);
                
                epicFeaturesColl.push({
                    key: epicRecord,
                    value: featureColl
                });
                
                allEpicsAdded.push(epicRecord);
                
                epicCategorisedColl.push(epicFeaturesColl);
            }
         });
         
         return epicCategorisedColl;
    },
    
     _determineProjectCategoryNodes: function(portfolioItemData, thisCategoryNode, targetLaunch){
        var that = this;
        var epicCategorisedColl = [];                      // value pair key: category node and value: collection of epics with fearure records.
        var allEpicsAdded = [];
        var projectRootNode = this.projectTreeStore.getRootNode();
        
        Ext.Array.each(portfolioItemData, function(thisPortfolio){
            var epicRecord = thisPortfolio.Parent;
            if(epicRecord && !that._isEpicAllreadyPresent(allEpicsAdded, epicRecord) && epicRecord.c_TargetLaunch === targetLaunch){
                var projName = epicRecord.Project._refObjectName;
                
                if(projName){
                    var projectNode = projectRootNode.findChild('Name', projName, true);
                    if(projectNode && projectNode.isAncestor(thisCategoryNode)){
                        var epicFeaturesColl = [];
                        var featureColl = that._getAssociatedFeatureRecords(epicRecord, portfolioItemData);
                        
                        epicFeaturesColl.push({
                            key: epicRecord,
                            value: featureColl
                        });
                        
                        allEpicsAdded.push(epicRecord);
                        
                        epicCategorisedColl.push(epicFeaturesColl);
                    }
                }
            }
            
        });
        
        return epicCategorisedColl;
    },
    
    _isEpicAllreadyPresent: function(allEpicsAdded, epicRecord){
        var isPresent = false;
        Ext.Array.each(allEpicsAdded, function(thisEpic) {
            if(thisEpic._ref === epicRecord._ref){
                isPresent = true;
                return false;
            }
        });
        
        return isPresent;
    },
    
    _getAssociatedFeatureRecords: function(thisEpic, portfolioItemData){
        var featuresColl = [];
        Ext.Array.each(portfolioItemData, function(thisFeature){
            if(thisFeature.Parent && thisFeature.Parent._ref === thisEpic._ref){
                 if(!_.contains(featuresColl, thisFeature)){
                     featuresColl.push(thisFeature);
                 }
            }
        });
        
        return featuresColl;
    },
    
    _createEpicStoreWithoutCategory: function(epicFeatureDataColl, targetLaunch,containerPanelId){
        var that = this;
        var epicCategoryRootNode = Ext.create('PortfolioItemTreeModel',{
                    Name: 'Category Epic Root',
                    text: 'Category Epic Root',
                    root: true,
                    expandable: true,
                    expanded: true
                });
        
        //Create Epics and their child Features Nodes from Grid Data
        //Add the nodes to Category Epic Root.
        //Donot display this Root node.
        this._createEpicNodesAlongWithChildFeatures(epicCategoryRootNode, epicFeatureDataColl);
        
        //console.log('Category Epic Root Node: ', epicCategoryRootNode);
        
        var panelHeight = 550;
        var portfolioItemTreePanel = this._createEpicTreePanelGrid(epicCategoryRootNode, panelHeight);
                  
        var container = Ext.getCmp(containerPanelId);
        if(container){
            container.add(portfolioItemTreePanel);
        }
    },
    
    _createCategoryGridStore: function(categoryData, targetLaunch, containerPanelId, isCategoryPanelExpanded){
        var categoryNode = categoryData.key;
        var categoryPanelTitle = categoryNode.data.Name;
        //console.log('Grid title: ', categoryPanelTitle);
        var epicFeatureDataColl = _.flatten(categoryData.value);  
        //console.log('grid data: ', epicFeatureDataColl);
        
        // add grid data inside each category.
        var that = this;
        var epicCategoryRootNode = Ext.create('PortfolioItemTreeModel',{
                    Name: 'Category Epic Root',
                    text: 'Category Epic Root',
                    root: true,
                    expandable: true,
                    expanded: true
                });
        
        //Create Epics and their child Features Nodes from Grid Data
        //Add the nodes to Category Epic Root.
        //Donot display this Root node.
        this._createEpicNodesAlongWithChildFeatures(epicCategoryRootNode, epicFeatureDataColl);
        
        //console.log('Category Epic Root Node: ', epicCategoryRootNode);
        
        var panelHeight = 150;
        var projectTreePanel = this._createEpicTreePanelGrid(epicCategoryRootNode, panelHeight);
        
        //add the tree panel to each of the category panel.
        var categoryPanel = Ext.create('Ext.panel.Panel',{
                      autoScroll: true,
                      title: categoryPanelTitle,
                      width: 1200,
                      //height: 200,
                      collapsible: true,
                      collapsed: !isCategoryPanelExpanded,
                      layout: {
                          type: 'vbox',
                          align: 'stretch',
                          padding: 5
                      },
                      items: [projectTreePanel]
                  });
                  
        var container = Ext.getCmp(containerPanelId);
        if(container){
            container.add(categoryPanel);
        }
    },
    
    _createEpicNodesAlongWithChildFeatures: function(epicRootNode, epicFeatureDataColl){
        var that = this;
        Ext.Array.each(epicFeatureDataColl, function(epicFeatureData){
            
            var epicTreeNode = that._createPortfolioItemTreeNode(epicFeatureData.key);
            Ext.Array.each(epicFeatureData.value, function(thisFeature){
                 var featureTreeNode = that._createPortfolioItemTreeNode(thisFeature);
                 epicTreeNode.appendChild(featureTreeNode);
            });
            
            epicRootNode.appendChild(epicTreeNode);
        });
    },
    
    _createPortfolioItemTreeNode: function(thisPortfolioItem){
        var noEntryText = '--No Entry--';
        var noOwnerText = '--No Owner--';
        var portfolioTreeNode = Ext.create('PortfolioItemTreeModel',{
                    _ref: thisPortfolioItem._ref,
                    Name: thisPortfolioItem.Name,
                    FormattedID:  thisPortfolioItem.FormattedID,
                    c_TargetLaunch: this._getFieldText(thisPortfolioItem.c_TargetLaunch,  '--No Target--'),
                    c_LaunchRisk: this._getFieldText(thisPortfolioItem.c_LaunchRisk, noEntryText),
                    c_OriginalLaunch: this._getFieldText(thisPortfolioItem.c_OriginalLaunch, '--No Target--'),
                    PercentDoneByStoryCount: thisPortfolioItem.PercentDoneByStoryCount,
                    Project: this._getFieldText(thisPortfolioItem.Project._refObjectName,  noEntryText),
                    State: (thisPortfolioItem.State) ? this._getFieldText(thisPortfolioItem.State._refObjectName,  noEntryText) : noEntryText,
                    Owner: (thisPortfolioItem.Owner) ? this._getFieldText(thisPortfolioItem.Owner._refObjectName,  noEntryText) : noOwnerText,
                    c_Customer: this._getFieldText(thisPortfolioItem.c_Customer,  noEntryText),
                    Notes: thisPortfolioItem.Notes,
                    leaf: (thisPortfolioItem._type === 'PortfolioItem/Epic') ? false : true,
                    expandable: (thisPortfolioItem._type === 'PortfolioItem/Epic') ? true :  false,
                    expanded: false,
                    iconCls: (thisPortfolioItem._type === 'PortfolioItem/Epic') ? 'ico-test-epic' : 'ico-test-feature'
                });
        return portfolioTreeNode;
    },
    
    _createEpicTreePanelGrid: function(epicCategoryRootNode, panelHeight){
        var that = this;
        var portfolioTreeStore = Ext.create('Ext.data.TreeStore', {
               model: 'PortfolioItemTreeModel',
               root: epicCategoryRootNode
            });
           
        var portfolioItemTreePanel = Ext.create('Ext.tree.Panel', {
            store: portfolioTreeStore,
            useArrows: true,
            lines: false,
            displayField: 'FormattedID',
            rootVisible: false,
            width: '100%',
            height: 'auto', // Extra scroll for individual sections:
            columns: [
                    {
                          xtype: 'treecolumn',
                          text: 'ID',
                          dataIndex: 'FormattedID',
                          width: 100
                   },
                    {
                        text: 'Name',
                        dataIndex: 'Name',
                        width: 300
                    },
                    {
                        text: 'Launch Risk',
                        renderer : function(val) {
                            if (val == "Low") {
                                // yellow circle image:
                                return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACrUlEQVQ4T5WTbUhTURjH/+fetXzJTMJiBamVUJQpKVYT58vEUBCUEOyDVENLyY+RizY3TWGs+iZoJfrBsBcKoSRRZ+IkDUtME+cHIYfIUBO1TPHebbdz7lyO6ov38HA+nPv/Pc95zv8h+OszGfTZhEgXiUTUBDjJjiXAIRFpUJJIV3WtpTtQQv/xfWa9PpooUHFQpSo6fSY+MioqRhkZeUA+W1xcgNP5TZgYH1ucd7meS27Umy2WGXYmA5iYU+CeRpuVd0GdGi5gE6PzI2h3vALx8ig4cQkJh85CSdfQ4MCqvdf21uuGkUFkQLVB/yBNm1WSotHsfeZ4SlpGnwAiB+LhwXnpToOtK8k6FCYUSh/s/T/6e21NplrLLcLurFKpmq+VlB1+Od2GlpEmECZ2cwDNLgOomKeLIxyKk4uRH1eAlqbGOZfLpSNmY+XDrOycivhzicqCF7mA4BOz7P7MTM7E/mjVteLL8GfB1t1ZT2j5Q7rr5eedmEFNr1nODir2iB4sry3j58Yaln4tgeMIKAMRoRFovPwIx4OOoflxw0dSY9Cv3L5rCjcNGDA+Ow73pheOuSnMryxAFEVZRHbRUNDgfW1PP5qBjqvvYK2rXv0DqLGb0Pm1E5OzUxAEEZLHJ+B202AAFluAtJgMvCnaAvivMLkxidyGHHgFahwmppm4oC2Aku40ZACtqC3/NRJDknxX8DfxVGK8cn9lBCSRArw+AR8cAJEroe/Bc3CWfsfE8Jhg66FNDHzG+31WGNqNsvuYWAawnVaiCOYRErYHd5JMuBF7c/sZ/UbSZGpL1NRI1i4rqeowbotDfKDQfWGoUtehNLZMGrTbt40UaOXUTG2eOkUTvu5ZR9/0ezR+qpf7UJ5cgfQjWgQh+P9W/meY4ugwRe9gmALHc6fj/BvHbD3Y3HrBDgAAAABJRU5ErkJggg==" />';
                            } else if (val == "Medium") {
                                // Green circle image:
                                return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACk0lEQVQ4T5WTXUhTYRjH/+88zo8cluiU1cVMuujDiBCypaZtfd5I1E0XQR9kBNJV2aDJtmYwrG5ECLUoKOqmLrqpbLPSTV1EBJbWTbUgx5qJH7No25mn59nO/IhueuHPe8553//vPM/zPq/AX8Nus+4RQtkrFGESwHpeVoAPilCGFEX0Otvcz5ZaaE96OKxWo5DQXFZmOLJxc6XeaFwrFZfoU2s/JiIIBj/LoyPvIuFw6L4io9Phdgd5LQVgs0aCq95iady2vVanzY4BiTfA3AMgmQWsOATkbkVc1uLVsD/60ut5NC+jlSEpgNNmvdpgsTTV1tXp8PsuMNtDAA2JzEma51WVnACKDsM34Iu+8Hq67W3uc4JzNpQZbh07ddqgTd4DZm4AcTaT5CUAhZ4FfSs9injhQdzu6QqFwqHjwtF64Zpl976zO2qqJHw/AMRUc+bvCr0L1azhZ9K6Oxgcei17PU87BIU/fLLpTPVqPdUk4lABZEgkKYIpOoI5SmMS0FC25IW0CjB2YXymAje7rwfEJZt1uuWivTDnp43CHyHAPNXgI6URIUMCINaCGMCjoAGxNY/Rftk5swiYtQMTT4BpMidVo8R/VMUgBnDZ8wlQqgIWUlg5BozupwjUjdk0Z8QQrRoJQ0oeYnyyKp0CF9FMRawxbZEQoPwo9VTIbGAAzzmq+J0BxVPw+9/KfZ7ejuXHGG4Hvramw2YjK3eJGJTnQlxpWTxGrgk3Ur3ZTI1UqxPfrgAhgvBmBuRxzupc4IKSdR6+fh91Y1+6kRiQaeWdZnNjtalOp836BUSf06l0piFFzTTvQjyRj8DwQLTf27e8lTOQzGXaULlJX15esewyfQl+ksdG3v/7MjEgM/73Ov8BIpsg2EnHBEwAAAAASUVORK5CYII=" />';
                            } else if (val == "High") {
                                // Red circle image:
                                return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC2klEQVQ4T5WTa0iTURjH/2fvxem25pyXzaAU+xIZwihYljrvKH1QlIKim2IZSH6JGjTZNANZGQhCmYuQzE9Cn0oML80ypZLAS0kU+mnNy1DTKbK9ezvvNnNFXzrw8JyX8/5/z3me8zwEfy2rxVxEiFhMRJJJgIPSsQh8EYn4ThRJf2Nzy6tICf0ntGxmcwphUafTJ589lJ6ekJKaxsQnJAbPlpcWMT/3XZiZml5yu13PRD/abS0t89JZECCJZSxu5+TllxuPZyu47W1sT0xgvbcXIsNAWVEBucEAP89jfHTE6xwafB7wo0GCBAGNFvM9U15+bdaJHMVmdzdWOzvhl8kQoOIA9WLYtFVV0FRW4s1bp/f10OBDa3PLdSLlnKxL7rpYc0Xn6+nBisMRFAthAMJiUBihe+35c1CWleNJZ4f7h9t1gdgabrYWFBTXZxqOMq7SUvgixFJkMDIQloGMkzw1+r3f8RRjH98LAwP9bYRef6z68lWjdm4eCzbb7tUFAcLPFWB7A+K6hwIIZAzlaTTQ2zuwui8Njx89GCdNFvPqjVtW9ZrFAu/kJPyBADZnZ+H3LIJhfWDlVMQDMskoQCp7tDEXCZ0vYb/TuPYbsGq1YqWvD14qFgUqjAbYGGqSj6IQaoQltA4E8iMmxLa9CAF2Utgz8xlfS0oQoEGkqJwiBOCCEAJGLocsKobWgIPG5oAn5XAohWAR84vqjRkG5hPND7RukphThr2C0L0SrFJLISp6Cx5xXcMYnfggDA68ags+o16n77pUU6vz2O1wNTWAV4UAvARRRYFXJ4FVJYJVxCH6VDVQWLb7jDuNlJObW5tNG2mh9S6W70dA1Grwmr3gY/WIOVMHrvAknCPDtBuHQo0U2crZptzyY1kmBbO1ia3xIWz0ttN0VFCdvgYuwwgfy9FWdkriP1s5cpiSdPrgMKWmHmDiEyOH6ZswPTWztPCvYYocz/8d51+jDDLYmxw8UgAAAABJRU5ErkJggg==" />';
                            } else if (val == "--No Entry--") {
                                // Gray circle image:
                                return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACUklEQVQ4T6WTT2gTQRTG32x2NyYpTfOvcTFQc/SgeGsMLVVKKgjevapFRHoUDZiSRFsIorciIlWv3gXBhmprte1RlOAx7SGENCFp7O5iNpuM82ZIGkou4sBjYWe+33vvmzcETqx0KjlHCL1KKIkTgHO4TQF+UUK3KSUfs0u5tUEJOyNWJpk8S2RYCGvajfMXLoYmJqJqMBTie7VqFfb3i9bPH9+rlXL5HbVhJZPL7eEeB6BYkuHJzGzieiw+5ZVlBSzLAtM0gbL0Ho8LVFUF27Zhd/trc3M9/75rwyJCOCCbSj67PJuYn565MmoYJtF1nQu73Q6LLg9sxOsdYzFKtzY//95Yz6+ml3L3Cfasadqbm/N3z1hWG3Td4MJOB8UYlMEYDZ1gy+fzsYo88Hb1ZalcLt8imcWHzxNz1xZi8Wn14KDKRVjqMHHPr2g0iq1Y+bUPK4SVv3P7zr1YcHwc6vUGF2N2jHa7zb42/ydJEhBCQJZliEQi0Gw04PWrF7vkcSp5+OBR2muYf5hpBjvc5ua1Wi3eOwodDgf7YgiI2+2C0+EwPF3ONvsA3TCh2TwEw0AItiDEeCOYtQdBgMt1CgJ+nwD0Whjz+6FY3OMVCNcBFEVlgQABQaAkEQgE/FCv1UQLPRMnL02phUKB94wAFKiqsw9RFKwCIQSCwQDsfNsSJg5eY4MZUyqV+tkRgAMkQlThdruZD3B8jScHqVKpEHa/PLsQOsHpxFBhZMSDLdEvG5+OB2nYKKNhaObRkc49YNPHYXitQ0f5vx/T4PP81+f8FxFWadj+MGPoAAAAAElFTkSuQmCC" />';
                            } else {
                                // No image since this is a Feature with no entry:
                                return "";
                            }
                        },
                        dataIndex: 'c_LaunchRisk',
                        align: 'center',
                        width: 100
                    },
                    {
                        xtype: 'templatecolumn',                 
                        text: '% Done By Story Count',
                        dataIndex: 'PercentDoneByStoryCount',
                        width: 150,
                        tpl:  Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryCountTemplate')
                    },
                    {
                        text: 'Target Launch',
                        dataIndex: 'c_TargetLaunch',
                        width: 100
                    },
                    {
                        text: 'Original Launch',
                        dataIndex: 'c_OriginalLaunch',
                        width: 100
                    },
                    {
                        text: 'Project',
                        dataIndex: 'Project',
                        width: 150
                    },
                    {
                        text: 'State',
                        dataIndex: 'State',
                        width: 100
                    },
                    {
                        text: 'Owner',
                        dataIndex: 'Owner',
                        width: 150
                    },
                    {
                        text: 'Customer',
                        dataIndex: 'c_Customer',
                        width: 100
                    },
                    {
                        xtype:'actioncolumn',
                        text: 'Notes',
                        width:50,
                        items: [{
                            icon: 'https://cdn3.iconfinder.com/data/icons/developerkit/png/View.png',  // Use a URL in the icon config
                            width: 75,
                            tooltip: 'View',
                            handler: function(grid, rowIndex, colIndex) {
                                var columnIndex = that._getColumnIndex(grid, 'Notes');
                                if(colIndex == columnIndex){
                                    //popup window code.
                                    var record = grid.getStore().getAt(rowIndex);
                                    that._displayNotesDailog(record);
                                }
                            }
                        }]
                    }
            ]
        });
        
        return portfolioItemTreePanel;
    },
    
    _getColumnIndex: function(grid, headerName){
        var gridColumns = grid.headerCt.getGridColumns();
        for(var i=0;i<gridColumns.length; i++){
            if(gridColumns[i].text == headerName){
                return i;
            }
        }
    },
    
    _getFieldText: function(fieldValue, defaultValue) {
        return _.isUndefined(fieldValue) || _.isNull(fieldValue) ? defaultValue : fieldValue;
    },
    
    _displayNotesDailog: function(recordData){
        Ext.create('Rally.ui.dialog.RichTextDialog', {
                 autoShow: true,
                 title: 'Epic Note(s)',
                 record: recordData,
                 fieldName: 'Notes',
                 height: 300,
                 width: 550,
                 closable: true
             });
    }
});