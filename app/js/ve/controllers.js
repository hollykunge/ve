'use strict';

/* Controllers */

angular.module('myApp')
.controller('NavTreeCtrl', ['$scope', '$state', 'document', 'snapshots', 'site', 'time', 'ElementService', 'ViewService', 'ConfigService', 'growl',
function($scope, $state, document, snapshots, site, time, ElementService, ViewService, ConfigService, growl) {
    $scope.document = document;
    $scope.snapshots = snapshots;
    $scope.site = site;
    $scope.time = time;
    $scope.editable = $scope.document.editable && time === 'latest';
    $scope.createNewSnapshot = function() {
        ConfigService.createSnapshot($scope.document.sysmlid)
        .then(function(result) {
            growl.success("Create Successful: wait for email.");
        }, function(reason) {
            growl.error("Create Failed: " + reason.message);
        });
    };

    var tree = {};

      // 1. Iterate over view2view and create an array of all element ids
      // 2. Call get element ids and create a map of element id -> element name structure
      // 3. Iterate over view2view and create a map of element id -> element tree node reference
      
    //ViewService.getDocument($scope.documentid, false, 'master', time)
    //.then(function(data) {

        // Array of all the view element ids
        var viewElementIds = [];

        // Map of view elements from view id -> tree node object
        var viewElementIds2TreeNodeMap = {};
        
        // document id is the root the tree heirarchy
        var rootElementId = document.sysmlid;

        // Iterate through all the views in the view2view attribute
        // view2view is a set of elements with related child views
        // Note: The JSON format is NOT nested - it uses refrencing
        for (var i = 0; i < document.specialization.view2view.length; i++) {

          var viewId = document.specialization.view2view[i].id;
          
          viewElementIds.push(viewId);
        }

        function addSectionElements(element, viewNode, parentNode) {
            var contains = null;
            if (element.specialization)
                contains = element.specialization.contains;
            else
                contains = element.contains;
          for (var j = 0; j < contains.length; j++) {
            var containedElement = contains[j];
            if (containedElement.type === "Section") {
              var sectionTreeNode = { label : containedElement.name, 
                    type : "section",
                    view : viewNode.data.sysmlid,
                    data : containedElement, 
                    children : [] };

              parentNode.children.push(sectionTreeNode);

              addSectionElements(containedElement, viewNode, sectionTreeNode);

            }
          }
        };

        // Call the get element service and pass in all the elements
        ElementService.getElements(viewElementIds, false, 'master', time)
        .then(function(elements) {

          // Fill out all the view names first
          for (var i = 0; i < elements.length; i++) {
            var viewTreeNode = { label : elements[i].name, 
                                  type : "view",
                                  data : elements[i], 
                              children : [] };

            viewElementIds2TreeNodeMap[elements[i].sysmlid] = viewTreeNode;

            addSectionElements(elements[i], viewTreeNode, viewTreeNode);
          }

          for (var i = 0; i < document.specialization.view2view.length; i++) {

            var viewId = document.specialization.view2view[i].id;
            
            for (var j = 0; j < document.specialization.view2view[i].childrenViews.length; j++) {
              
              var childViewId = document.specialization.view2view[i].childrenViews[j];

              viewElementIds2TreeNodeMap[viewId].children.push( viewElementIds2TreeNodeMap[childViewId] );

            }
          }

          $scope.my_data = [ viewElementIds2TreeNodeMap[rootElementId] ];

        });
      //});

    $scope.my_tree = tree;
    $scope.my_data = [];

    $scope.my_tree_handler = function(branch) {
        var viewId;

        if (branch.type == "section")
            viewId = branch.view;
        else
            viewId = branch.data.sysmlid;

        $state.go('doc.view', {viewId: viewId});

    };

    $scope.reorder_tree_view = function() {
        $state.go('doc.order');
    };

    $scope.try_adding_a_branch = function() {

        var branch = tree.get_selected_branch();

        if (branch.type === "section")
            return;

        ViewService.createView(branch.data.sysmlid, 'Untitled View', $scope.document.sysmlid)
        .then(function(view) {
            return tree.add_branch(branch, {
                label: view.name,
                type: "view",
                data: view
            });
        });
    };
}])
.controller('ReorderCtrl', ['$scope', 'document', 'ElementService', 'ViewService', '$state', 'growl',
function($scope, document, ElementService, ViewService, $state, growl) {
    $scope.doc = document;
    var viewElementIds = [];
    var viewElementIds2TreeNodeMap = {};
    var rootElementId = $scope.doc.sysmlid;

    for (var i = 0; i < document.specialization.view2view.length; i++) {
        var viewId = document.specialization.view2view[i].id;
        viewElementIds.push(viewId);
    }
    ElementService.getElements(viewElementIds)
    .then(function(elements) {
        for (var i = 0; i < elements.length; i++) {
            var viewTreeNode = { 
                id: elements[i].sysmlid, 
                name: elements[i].name, 
                children : [] 
            };
            viewElementIds2TreeNodeMap[elements[i].sysmlid] = viewTreeNode;    
        }
        for (var i = 0; i < document.specialization.view2view.length; i++) {
            var viewId = document.specialization.view2view[i].id;
            for (var j = 0; j < document.specialization.view2view[i].childrenViews.length; j++) {
                var childViewId = document.specialization.view2view[i].childrenViews[j];
                viewElementIds2TreeNodeMap[viewId].children.push(viewElementIds2TreeNodeMap[childViewId]);
            }
        }
        $scope.tree = [viewElementIds2TreeNodeMap[rootElementId]];
    });

    $scope.save = function() {
        var newView2View = [];
        for (var i = 0; i < viewElementIds.length; i++) {
            var viewObject = {id: viewElementIds[i], childrenViews: []};
            for (var j = 0; j < viewElementIds2TreeNodeMap[viewElementIds[i]].children.length; j++) {
                viewObject.childrenViews.push(viewElementIds2TreeNodeMap[viewElementIds[i]].children[j].id);
            }
            newView2View.push(viewObject);
        }
        document.specialization.view2view = newView2View;
        ViewService.updateDocument(document)
        .then(function(data) {
            growl.success('Reorder Successful');
            $state.go('doc', {}, {reload:true});
        }, function(reason) {
            growl.error('Reorder Save Error: ' + reason.message);
        });
    };
}]);