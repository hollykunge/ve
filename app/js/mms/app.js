'use strict';

angular.module('mmsApp', ['mms', 'mms.directives', 'app.tpls', 'fa.directive.borderLayout', 'ui.bootstrap', 'ui.router', 'ui.tree', 'angular-growl', 'cfp.hotkeys'])
.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
    // Change the DEFAULT state to workspace.sites on entry
    //$urlRouterProvider.when('', '/workspaces/master/sites');
    //$urlRouterProvider.when('', '/login');
    $urlRouterProvider.rule(function ($injector, $location) {
        var $window = $injector.get('$window');
        var loggedIn = $window.localStorage.getItem('ticket');
        var path = $location.path(), normalized = path.toLowerCase();
        if (!loggedIn && path.indexOf('login') === -1) {
            $location.path('/login');
        }
    });
    $urlRouterProvider.otherwise('/workspaces/master/sites');// when the url isn't mapped go here

    $stateProvider
    .state('login', {
        url: '/login',
        resolve: { },
        views: {
            'pane-center': {
                templateUrl: 'partials/mms/login.html',
                controller: function ($scope, $rootScope, $state, AuthorizationService, growl) {
                    $scope.credentials = {
                      username: '',
                      password: ''
                    };
                    $scope.spin = false;
                    $scope.login = function (credentials) {
                      $scope.spin = true;
                      var credentialsJSON = {"username":credentials.username, "password":credentials.password};
                          AuthorizationService.getAuthorized(credentialsJSON).then(function (user) {
                            if ($rootScope.mmsRedirect) {
                                var toState = $rootScope.mmsRedirect.toState;
                                var toParams = $rootScope.mmsRedirect.toParams;
                                $state.go(toState, toParams);
                            } else {
                              $state.go('workspace.sites', {workspace: 'master'});
                          }
                          }, function (reason) {
                            $scope.spin = false;
                                growl.error(reason.message);
                          });
                    };
                }   
            }
        }
    })
    .state('workspaces', {
        url: '/workspaces?search',
        //parent: login, remove ticket to parent
        resolve: {
            // dummyLogin: function($http, URLService) {
            //     //login redirect if no ticket, otherwise okay
            //     // url service append ticket
            //     return $http.get(URLService.getCheckLoginURL());
            // },
            ticket: function($window, URLService) {
                return URLService.setTicket($window.localStorage.getItem('ticket'));
            },
            workspaces: function(WorkspaceService, ticket) {
                return WorkspaceService.getWorkspaces();
            },
            workspace: function (ticket) {
                return 'master';
            },
            workspaceObj: function (WorkspaceService, workspace, ticket) {
                // TODO; replace workspace with workspaceObj, but first all controllers
                // need to be adapted to handle workspace as an object and not a string
                return WorkspaceService.getWorkspace(workspace);
            },  
            tags: function(ConfigService, workspace, ticket) {
                return ConfigService.getConfigs(workspace, false, 2);
            },
            tag: function ($stateParams, ConfigService, workspace, ticket) {
                return { name: 'latest', timestamp: 'latest' };
            },  
            sites: function(SiteService, ticket) {                 
               return SiteService.getSites();
            },
            site: function(SiteService, ticket) {
                return SiteService.getSite('no_site');
            },
            document : function(ElementService, workspace, time, growl, ticket) {
                return null;
            },
            views: function(ticket) {
                return null;
            },
            view: function(ticket) {
                return null;
            },
            viewElements: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getViewElements(document.sysmlid, false, workspace, time, 2);
            },   
            time: function(tag, ticket) {
                return tag.timestamp;
            },
            configSnapshots: function(ConfigService, workspace, tag, ticket) {
                return [];
            },
            snapshots: function(ticket) {
                return [];        
            },
            snapshot: function(ticket) {
                return null;
            },
            docFilter: function(ticket) {
                return null;
            },
            search: function($stateParams, ElementService, workspace, ticket) {
                if ($stateParams.search === undefined) {
                    return null;
                }
                return ElementService.search($stateParams.search, ['*'], null, 0, 50, false, workspace, 2)
                .then(function(data) {
                    return data;
                }, function(reason) {
                    return null;
                });                
            }
        },
        views: {
            'nav': {
                template: '<mms-nav mms-title="Model Manager" mms-ws="{{workspace}}" mms-config="tag"></mms-nav>',
                controller: function ($scope, $rootScope, workspace, tag) {
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $rootScope.mms_title = 'Model Manager';
                }
            },
            'menu': {
                template: '<mms-menu mms-title="Model Manager" mms-ws="{{workspace}}" mms-workspaces="workspaces" mms-config="tag" mms-tags="tags"></mms-menu>',
                controller: function ($scope, $rootScope, workspaces, workspace, tags, tag) {
                    $scope.workspaces = workspaces;
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $scope.tags = tags;
                    $rootScope.mms_title = 'Model Manager';
                }
            },
            'pane-left': {
                templateUrl: 'partials/mms/pane-left.html',
                controller: 'TreeCtrl'
            },
            'pane-center': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            },
            'pane-right': {
                templateUrl: 'partials/mms/pane-right.html',
                controller: 'ToolCtrl'
            },
            'toolbar-right': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            } 
        }       
    })
    .state('workspace', {
        parent: 'workspaces',
        url: '/:workspace?tag',
        resolve: {
            workspace: function ($stateParams) {
                return $stateParams.workspace;
            },
            workspaceObj: function (WorkspaceService, workspace, ticket) {
                return WorkspaceService.getWorkspace(workspace);
            },
            sites: function(SiteService, time, ticket) {                 
                if (time === 'latest')
                    return SiteService.getSites();
                return SiteService.getSites(time);
            },
            site: function(SiteService, ticket) {
                return SiteService.getSite('no_site');
            },
            document : function(ViewService, ElementService, workspace, time, growl, workspaceObj, ticket) {
            
                // This is a short-term work-around -- all this should be done the back-end MMS in the future
                var wsCoverDocId = 'master_cover';

                return ElementService.getElement(wsCoverDocId, false, workspace, time, 2)
                .then(function(data) {
                    return data;
                }, function(reason) {

                    // if it is an error, other than a 404 (element not found) then stop and return
                    if ((reason.status !== 404 && reason.status !== 410) || time !== 'latest') return null;

                    var viewName = 'Workspace ' + workspaceObj.name + ' Cover Page';

                    return ViewService.createView(undefined, viewName, undefined, workspace, wsCoverDocId)
                    .then(function(data) {
                        return data;
                    }, function(reason) {
                        return null;
                    });
                });
            },
            docFilter: function(ElementService, workspace, time, document, ticket) {
                return ElementService.getElement("master_filter", false, workspace, time, 2)
                .then(function(data) {
                    return data;
                }, function(reason) {
                    if (reason.status !== 404 || time !== 'latest') return null;
                    var siteDocs = {
                        specialization: {type: "Element"},
                        name: 'Filtered Docs',
                        documentation: '{}'
                    };
                    siteDocs.sysmlid = "master_filter";
                    return ElementService.createElement(siteDocs, workspace, null)
                    .then(function(data) {
                        return data;
                    }, function(reason) {
                        return null;
                    });
                });
            },
            views: function(ViewService, workspace, document, time, ticket) {
                return [];
            },
            viewElements: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return [];
                return ViewService.getViewElements(document.sysmlid, false, workspace, time, 2);
            },    
            view: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getView(document.sysmlid, false, workspace, time, 2);
            },
            tags: function(ConfigService, workspace, ticket) {
                return ConfigService.getConfigs(workspace, false, 2);
            },
            tag: function ($stateParams, ConfigService, workspace, ticket) {
                if ($stateParams.tag === undefined || $stateParams.tag === 'latest')
                    return { name: 'latest', timestamp: 'latest' };
                return ConfigService.getConfig($stateParams.tag, workspace, false, 2);
            },        
            configSnapshots: function(ConfigService, workspace, tag, ticket) {
                //if (tag.timestamp === 'latest')
                    return [];
                //return ConfigService.getConfigSnapshots(tag.id, workspace, false, 2);
            },
            time: function(tag, ticket) {
                return tag.timestamp;
            }
        },
        views: {
            'menu@': {
                template: '<mms-menu mms-title="Model Manager" mms-ws="{{workspace}}" mms-workspaces="workspaces" mms-config="tag" mms-tags="tags"></mms-menu>',
                controller: function ($scope, $rootScope, workspaces, workspace, tag, tags) {
                    $scope.workspaces = workspaces;
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $scope.tags = tags;
                    $rootScope.mms_title = 'Model Manager';
                }
            },
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            },
            'pane-right@': {
                templateUrl: 'partials/mms/pane-right.html',
                controller: 'ToolCtrl'
            },
            'toolbar-right@': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }    
        }
    })
    .state('workspace.sites', {//base
        url: '/sites',
        resolve: {
        },
        parent: 'workspace',
        views: {
            'menu@': {
                template: '<mms-menu mms-title="Portal" mms-ws="{{workspace}}" mms-site="site" mms-workspaces="workspaces" mms-config="tag" mms-tags="tags"></mms-menu>',
                controller: function ($scope, $rootScope, workspaces, workspace, site, tag, tags, workspaceObj) {
                    $scope.workspaces = workspaces;
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $scope.tags = tags;
                    $scope.site = site;
                    $rootScope.mms_title = 'Portal: '+workspaceObj.name;
                }
            },
            'pane-left@': {
                templateUrl: 'partials/mms/pane-left.html',
                controller: 'TreeCtrl'
            },
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            }, 
            'toolbar-right@': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }
        }
    })
    .state('workspace.site', {
        url: '/:site',
        parent: 'workspace.sites',
        resolve: {
            site: function($stateParams, SiteService, ticket) {
                return SiteService.getSite($stateParams.site);
            },
            document : function($stateParams, ViewService, ElementService, workspace, site, time, growl, ticket) {
                var siteCoverDocId;
                if ($stateParams.site === 'no_site')
                    return null;
                    //siteCoverDocId = 'master_cover';
                else
                    siteCoverDocId = site.sysmlid + '_cover';

                return ElementService.getElement(siteCoverDocId, false, workspace, time, 2)
                .then(function(data) {
                    return data;
                }, function(reason) {

                    // if it is an error, other than a 404 (element not found) then stop and return
                    if ((reason.status !== 404 && reason.status !== 410) || time !== 'latest') return null;
                    
                    // if it is a tag look-up, then don't create element
                    if (time !== 'latest') 
                        return null;

                    var viewName = site.name + ' Cover Page';
                    var viewDoc = '<mms-site-docs data-mms-site="' + site.sysmlid + '">[cf:site docs]</mms-site-docs>';

                    return ViewService.createView(undefined, viewName, undefined, workspace, siteCoverDocId, viewDoc, site.sysmlid)
                    .then(function(data) {
                        return data;
                    }, function(reason) {
                        return null;
                    });
                });
            },
            views: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getDocumentViews(document.sysmlid, false, workspace, time, true, 2);
            },
            viewElements: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getViewElements(document.sysmlid, false, workspace, time, 2);
            },    
            view: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getView(document.sysmlid, false, workspace, time, 2);
            }
        },
        views: {
            'nav@': {
                template: '<mms-nav mms-title="Model Manager" mms-ws="{{workspace}}" mms-config="tag" mms-site="site"></mms-nav>',
                controller: function ($scope, $rootScope, workspace, tag, site) {
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $rootScope.mms_title = 'Model Manager';
                    $scope.site = site;
                }
            },
            'menu@': {
                template: '<mms-menu mms-title="Portal" mms-ws="{{workspace}}" mms-site="site" mms-workspaces="workspaces" mms-config="tag" mms-tags="tags"></mms-menu>',
                controller: function ($scope, $rootScope, workspaces, workspace, site, tag, tags, workspaceObj) {
                    $scope.workspaces = workspaces;
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $scope.tags = tags;
                    $scope.site = site;
                    $rootScope.mms_title = 'Portal: '+workspaceObj.name;
                }
            },
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            }, 
            'toolbar-right@': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }                    
        }
    })
    .state('workspace.site.documentpreview', {
        url: '/document/:document',
        resolve: {
            document: function($stateParams, ElementService, workspace, time, ticket) {
                return ElementService.getElement($stateParams.document, false, workspace, time, 2);
            },
            views: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getDocumentViews(document.sysmlid, false, workspace, time, true, 2);
            },
            viewElements: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getViewElements(document.sysmlid, false, workspace, time, 2);
            },    
            view: function(ViewService, workspace, document, time, ticket) {
                if (document === null) 
                    return null;
                return ViewService.getView(document.sysmlid, false, workspace, time, 2);
            },
            snapshot: function(ConfigService, configSnapshots, document, workspace, ticket) {
                var docid = document.sysmlid;
                var found = null;
                configSnapshots.forEach(function(snapshot) {
                    if (docid === snapshot.sysmlid)
                        found = snapshot;
                });
                if (found) {
                    return ConfigService.getSnapshot(found.id, workspace, true, 2);
                }
                return found; 
            } 
        },
        views: {
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            }
        }
    })
    .state('workspace.site.document', {
        url: '/documents/:document?time',
        resolve: {
            document: function($stateParams, ElementService, time, ticket) {
                return ElementService.getElement($stateParams.document, false, $stateParams.workspace, time, 2);
            },
            views: function($stateParams, ViewService, document, time, ticket) {
                if (document.specialization.type !== 'Product')
                    return [];
                return ViewService.getDocumentViews($stateParams.document, false, $stateParams.workspace, time, true, 2);
            },
            viewElements: function($stateParams, ViewService, time, ticket) {
                return ViewService.getViewElements($stateParams.document, false, $stateParams.workspace, time, 2);
            },
            view: function($stateParams, ViewService, viewElements, time, ticket) {
                return ViewService.getView($stateParams.document, false, $stateParams.workspace, time, 2);
            },
            snapshots: function(ConfigService, workspace, site, document, ticket) {
                if (document.specialization.type !== 'Product')
                    return [];
                return ConfigService.getProductSnapshots(document.sysmlid, site.sysmlid, workspace, false, 2);
            },
            snapshot: function(ConfigService, workspace, snapshots, document, time, ticket) {
                var docid = document.sysmlid;
                var found = null;
                snapshots.forEach(function(snapshot) {
                    if (snapshot.created === time)
                        found = snapshot;
                });
                if (found) {
                    return ConfigService.getSnapshot(found.id, workspace, true, 2);
                }
                return found; 
            },
            tag: function ($stateParams, ConfigService, workspace, snapshots, ticket) {
                if ($stateParams.tag === undefined)
                {
                    if ($stateParams.time !== undefined && $stateParams.time !== 'latest') {
                        
                        var snapshotFound = false;
                        var snapshotPromise;
                        // if time is defined, then do a reverse look-up from the
                        // product snapshots to determine if there is a match tag
                        snapshots.forEach(function(snapshot) {
                            if (snapshot.created === $stateParams.time) {
                                // product snapshot found based on time, 
                                // next see if there is a configuration for the snapshot
                                if (snapshot.configurations && snapshot.configurations.length > 0) {
                                    // there may be 0 or more, if there is more than 1, 
                                    // base the configuration tag on the first one
                                    snapshotFound = true;

                                    snapshotPromise = ConfigService.getConfig(snapshot.configurations[0].id, workspace, false, 2);
                                }
                            }
                        });
                        if (snapshotFound)
                            return snapshotPromise;
                        else 
                            return { name: 'latest', timestamp: 'latest' };
                    } else {
                        return { name: 'latest', timestamp: 'latest' };
                    }
                } else if ($stateParams.tag === 'latest') {
                    return { name: 'latest', timestamp: 'latest' };
                } else {
                    return ConfigService.getConfig($stateParams.tag, workspace, false, 2);
                }
            },        
            configSnapshots: function(ConfigService, workspace, tag, ticket) {
                //if (tag.timestamp === 'latest')
                    return []; //TODO revert when server is faster
                //return ConfigService.getConfigSnapshots(tag.id, workspace, false);
            },
            time: function($stateParams, ConfigService, workspace, ticket) {
                if ($stateParams.tag !== undefined) {
                    return ConfigService.getConfig($stateParams.tag, workspace, false, 2).then(function(tag) {
                        return tag.timestamp;
                    }); 
                }
                else if ($stateParams.time !== undefined)
                    return $stateParams.time;
                else
                    return "latest";
            },
            docFilter: function($stateParams, ElementService, workspace, site, time, growl, ticket) {
                //need to redefine here since time is redefined
                return ElementService.getElement("master_filter", false, workspace, time, 2)
                .then(function(data) {
                    return data;
                }, function(reason) {
                    return null;
                });
            }
        },
        views: {
            'menu@': {
                template: '<mms-menu mms-title="View Editor" mms-ws="{{workspace}}" mms-site="site" mms-doc="document" mms-workspaces="workspaces" mms-config="tag" mms-tags="tags" mms-snapshot-tag="{{snapshotTag}}" mms-show-tag="{{showTag}}"></mms-menu>',
                controller: function ($scope, $filter, $rootScope, workspaces, workspace, site, document, tag, tags, snapshots, time, docFilter) {
                    $scope.workspaces = workspaces;
                    $scope.workspace = workspace;
                    $scope.tag = tag;
                    $scope.tags = tags;
                    $scope.site = site;
                    $scope.document = document;

                    $scope.showTag = true;
                    $rootScope.mms_title = 'View Editor: '+document.name;
                    var filtered = {};
                    if (docFilter)
                        filtered = JSON.parse(docFilter.documentation);

                    var tagStr = '';
                    if (time !== 'latest') {
                        snapshots.forEach(function(snapshot) {
                            if (filtered[document.sysmlid])
                                return;
                            if (time === snapshot.created && snapshot.configurations && snapshot.configurations.length > 0)
                                snapshot.configurations.forEach(function(config) {
                                    //tagStr += '( <i class="fa fa-tag"></i> ' + config.name + ' ) ';
                                    $scope.tag = config;
                                });
                        });
                        tagStr += '( <i class="fa fa-camera"></i> ' + $filter('date')(time, 'M/d/yy h:mm a') + ' )';
                        if (filtered[document.sysmlid])
                            $scope.showTag = false;
                        $scope.snapshotTag = ' ' + tagStr;
                    }                                        
                }
            },
            'pane-left@': {
                templateUrl: 'partials/mms/pane-left.html',
                controller: 'TreeCtrl'
            },          
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            },
            'pane-right@': {
                templateUrl: 'partials/mms/pane-right.html',
                controller: 'ToolCtrl'
            },
            'toolbar-right@': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }
        }
    })
    .state('workspace.site.document.order', {
        url: '/order',
        views: {      
            'pane-center@': {
                templateUrl: 'partials/mms/reorder-views.html',
                controller: 'ReorderCtrl'
            }
        }
    })
    .state('workspace.site.document.full', {
        url: '/full',
        views: {      
            'pane-center@': {
                templateUrl: 'partials/mms/full-doc.html',
                controller: 'FullDocCtrl'
            }
        }
    })
    .state('workspace.site.document.view', {
        url: '/views/:view',
        resolve: {
            viewElements: function($stateParams, ViewService, time, ticket) {
                //if (time === 'latest')
                //    return ViewService.getViewElements($stateParams.view, false, $stateParams.workspace, time);
                return [];
            },
            view: function($stateParams, ViewService, viewElements, time, ticket) {
                return ViewService.getView($stateParams.view, false, $stateParams.workspace, time, 2);
            }
        },
        views: {
            'pane-center@': {
                templateUrl: 'partials/mms/pane-center.html',
                controller: 'ViewCtrl'
            }
        }
    })
    .state('workspace.diff', {
        url: '/diff/:source/:sourceTime/:target/:targetTime',
        resolve: {
            diff: function($stateParams, WorkspaceService, ticket) {
                return WorkspaceService.diff($stateParams.target, $stateParams.source, $stateParams.targetTime, $stateParams.sourceTime);
            },

            ws1: function( $stateParams, WorkspaceService, ticket){ //ws1:target because that's what DiffElementChangeController has
                return WorkspaceService.getWorkspace($stateParams.target); 
            },

            ws2: function( $stateParams, WorkspaceService, ticket){ //ws2:source because that's what DiffElementChangeController has
                return WorkspaceService.getWorkspace($stateParams.source);
            },

            ws1Configs: function($stateParams, ConfigService, ws1, ticket){
                return ConfigService.getConfigs(ws1.id, false, 2);
            },

            ws2Configs: function($stateParams, ConfigService, ws2, ticket){
                return ConfigService.getConfigs(ws2.id, false, 2);
            },

            targetName: function($stateParams, ws1, ws1Configs,ticket){
                var result = null;
                if(ws1.id === 'master'){
                    result = 'master';
                }
                else{
                    result= ws1.name; //for comparing tasks
                }
                ws1Configs.forEach(function(config){ //for comparing tags - won't go in if comparing on task level
                    if(config.timestamp === $stateParams.targetTime)
                        result = config.name;
                });
                return result;
            },

            sourceName: function($stateParams, ws2, ws2Configs,ticket){
                var result = null ;
                if(ws2.id === 'master'){
                    result = 'master';
                }
                else{
                    result= ws2.name; //for comparing tasks
                }
                ws2Configs.forEach(function(config){ //for comparing tags - won't go in if comparing on task level
                    if(config.timestamp === $stateParams.sourceTime)
                        result = config.name; 
                });
                return result;
            } 
        },
        views: {
            'menu@': {
                templateUrl: 'partials/mms/diff-nav.html',               
                controller: function ($scope, $rootScope,targetName, sourceName, $stateParams, $state, $modal){
                    $scope.targetName = targetName;
                    $scope.sourceName = sourceName;
                    $rootScope.mms_title = 'Merge Differences';

                    $scope.goBack = function () {
                        $modal.open({
                            templateUrl: 'partials/mms/cancelModal.html',
                            controller: function($scope, $modalInstance, $state) {      
                                $scope.close = function() {
                                    $modalInstance.close();
                                };
                                $scope.exit = function() {
                                    $state.go('workspace', {}, {reload:true});
                                    $modalInstance.close(); 
                                };
                            }
                        });
                    };
                }
            },
            'pane-left@': {
                templateUrl: 'partials/mms/diff-pane-left.html',
                controller: 'WorkspaceDiffChangeController'
            },
            'pane-center@': {
                templateUrl: 'partials/mms/diff-pane-center.html',
                controller: 'WorkspaceDiffElementViewController'
            },
            'pane-right@': {
                template: ''
            },
            'toolbar-right@': {
                template: '<mms-toolbar buttons="buttons" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }
        }
    });
    // anonymous factory intercepts requests
    $httpProvider.interceptors.push(function($q, $location, $injector) {
        return {
            'request': function(config) {
                return config;
            },
            'response': function(response) {
                if(response.status === 401){
                    var AuthorizationService = $injector.get('AuthorizationService');
                    var isExpired = AuthorizationService.checklogin();
                    if(isExpired)
                        $location.path('/login');
                }
                return response;        
            }
        };
    });
});