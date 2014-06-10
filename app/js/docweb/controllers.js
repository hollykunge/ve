'use strict';

/* Controllers */

angular.module('myApp')
  .controller('ConfigsCtrl', ["$scope", "$http", "$state", "$stateParams",  "configs", function($scope, $http, $state, $stateParams, configs) {

  	$scope.configs = configs;
    $scope.site = $stateParams.site;

    $scope.select_config_view = function(configId) {
        $state.go('docweb.config', {configId: configId});
    };

    $scope.get_latest_drafts = function() {
        $state.go('docweb.latest');
    };

        $scope.create_new_config = function() {
        $state.go('docweb.new');
    };
  }])
  .controller('ConfigCtrl', ["$scope", "$http", "$state", "$stateParams", "config", function($scope, $http, $state, $stateParams, config) {
    $scope.config = config;
    $scope.configId = $scope.config.id;
    
    $scope.newConfigName = $scope.config.name;
    $scope.newConfigDesc = $scope.config.description;
    $scope.toggles = {hideChangeForm: true, hideAddRemoveForm: true};
    $scope.toggleChangeForm = function() {
        $scope.toggles.hideChangeForm = !$scope.toggles.hideChangeForm;
    };
    $scope.toggleAddRemoveForm = function() {
        $scope.toggles.hideAddRemoveForm = !$scope.toggles.hideAddRemoveForm;
    };
    $scope.change = function() {
        /* $http.post('/alfresco/service/javawebscripts/configurations/' + $scope.currentSite, 
            {"name": $scope.newConfigName, "description": $scope.newConfigDesc, "nodeid": $scope.nodeid}).
            success(function(data, status, headers, config) {
                $scope.messages.message = "Change Successful";
                $scope.config.name = $scope.newConfigName;
                $scope.config.description = $scope.newConfigDesc;
                $scope.toggles.hideChangeForm = true;
            }).
            error(function(data, status, headers, config) {
                $scope.messages.message = "Change Failed!";
            });*/
    };
  }])
  .controller('TagAddRemoveCtrl', ["$scope", "$http", function($scope, $http) {
    $scope.selected = [];
    for (var i = 0; i < $scope.config.snapshots.length; i++) {
        $scope.selected.push($scope.config.snapshots[i].id);
    }
    $scope.update = function() {
        /* var post = {"nodeid": $scope.config.nodeid, "snapshots": $scope.selected};
        $http.post('/alfresco/service/javawebscripts/configurations/' + $scope.currentSite, 
            post).
            success(function(data, status, headers, config) {
                $scope.messages.message = "Change Successful";
                //$scope.config.snapshots = result;
                var current = [];
                for (var i = 0; i < $scope.selected.length; i++) {
                    var id = $scope.selected[i];
                    current.push($scope.snapshotMap[id]);
                }
                $scope.config.snapshots = current;
                $scope.toggles.hideAddRemoveForm = true;
            }).
            error(function(data, status, headers, config) {
                $scope.messages.message = "Change Failed!";
            }); */
    };
   }])
    .controller('TagAddRemoveDocCtrl', ["$scope", "$http", function($scope, $http) {
    $scope.showSnapshots = false;
    $scope.toggleShowSnapshots = function() {
        $scope.showSnapshots = !$scope.showSnapshots;
    };
    $scope.snapshots = [];
    for (var i = 0; i < $scope.doc.snapshots.length; i++) {
        var selected = !($scope.selected.indexOf($scope.doc.snapshots[i].id) < 0);
        $scope.snapshots.push({
            id: $scope.doc.snapshots[i].id,
            selected: selected,
            created: $scope.doc.snapshots[i].created,
            url: $scope.doc.snapshots[i].url
        });
    }

    $scope.toggleCheck = function(id) {
        var index = $scope.selected.indexOf(id);
        if (index < 0)
            $scope.selected.push(id);
        else
            $scope.selected.splice(index, 1);
    };
  }])
  .controller('NewCtrl', ["$scope", "$http", function($scope, $http) {
    $scope.newConfigName = "";
    $scope.newConfigDesc = "";
    $scope.selected = [];
    $scope.toggleCheck = function(id) {
        var index = $scope.selected.indexOf(id);
        if (index < 0)
            $scope.selected.push(id);
        else
            $scope.selected.splice(index, 1);
    };
    $scope.new = function() {
        /* var send = {"name": $scope.newConfigName, "description": $scope.newConfigDesc};
        if ($scope.selected.length > 1)
            send.products = $scope.selected;
        //$window.alert("sending " + $scope.newConfigName + " " + $scope.newConfigDesc);
        $http.post('/alfresco/service/javawebscripts/configurations/' + $scope.currentSite, send).
            success(function(data, status, headers, config) {
                //$window.alert("success, wait for email");
                $scope.messages.message = "New Configuration Created! Please wait for an email notification.";
            }).
            error(function(data, status, headers, config) {
                $scope.messages.message = "Creating new configuration failed!";
            });*/
    };

  }]);