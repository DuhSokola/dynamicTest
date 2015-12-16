;(function () {
    'use strict';

    var deps = [
        'amagForm'
    ];

    var app = angular.module('hostApp', deps);

    app.run(function(amagFormValidationService, amagFormPersistenceService, AMAG_FORM_MODE){
        amagFormValidationService.setConfig("/js/modul/validationConfig.json");
        amagFormPersistenceService.setMode(AMAG_FORM_MODE.REST);
        amagFormPersistenceService.setRESTBaseUrl('localhost:3000');
    });
    /**
     * Example to switch language
     */
    app.controller('hostAppCtrl', ['$scope','$rootScope', function ($scope,$rootScope) {
        $rootScope.$on('amagFormValidationError',function(event,args){
            console.log('INVALID');
            console.log(args);
        })
    }]);

}());
