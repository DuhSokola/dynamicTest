;(function () {
    'use strict';

    var deps = [
        'ngResource'
    ];

    var app = angular.module('amagForm', deps);

    app.constant('AMAG_FORM_MODE', {
        'REST': 'rest',
        'MANUALLY': 'manually'
    });

    app.factory('amagFormPersistenceService', ['AMAG_FORM_MODE', '$resource', function (AMAG_FORM_MODE, $resource) {
        var mode = AMAG_FORM_MODE.REST;
        var restUrl;
        var persistFunction;

        var persistRest = function (data) {
            var PersistenceObj = $resource(restUrl);
            var resource = new PersistenceObj(data);
            console.log(data);
            return resource.$save().then(
                function () {
                    console.log('SUCCESS')
                }
            ).catch(
                function () {
                    console.log('ERROR')
                }
            );
        };

        var persist = function (data) {
            if (mode === AMAG_FORM_MODE.REST) {
                persistRest(data);
            } else if (mode === AMAG_FORM_MODE.MANUALLY) {
                persistFunction(data);
            }
        };

        var setPersistenceFunction = function (fn) {
            persistFunction = fn;
        };

        var getMode = function () {
            return mode;
        };

        var setMode = function (MODE) {
            mode = MODE;
        };

        var getRESTBaseUrl = function () {
            return resource;
        };

        var setRESTBaseUrl = function (url) {
            restUrl = url;
        };

        return {
            setMode: setMode,
            getMode: getMode,
            setRESTBaseUrl: setRESTBaseUrl,
            getRESTBaseUrl: getRESTBaseUrl,
            setPersistenceFunction: setPersistenceFunction,
            persist: persist
        }
    }]);

    app.factory('amagFormValidationService', ['$rootScope', function ($rootScope) {
        var validationConfig = {};

        var validate = function (data) {
            var errorList = [];

            for (var item in data) {
                var rule = getValidationRulesById(data[item].validation_rule_id);
                if (rule && rule != '') {
                    if (rule.max.toString() && rule.max.toString() != '') {
                        if (data[item].field_value.length > rule.max) {
                            errorList.push({
                                field_name: item,
                                field_value: data[item].field_value,
                                rule: {max: rule.max},
                                description: 'length gt max(' + rule.max + ')'
                            });
                        }
                    }

                    if (rule.min.toString() && rule.min.toString() != '') {
                        if (data[item].field_value.length < rule.min) {
                            errorList.push({
                                field_name: item,
                                field_value: data[item].field_value,
                                rule: {min: rule.min},
                                description: 'length lt min(' + rule.min + ')'
                            });
                        }
                    }
                    if (rule.required) {
                        if (!data[item].field_value || !/\S/.test(data[item].field_value)) {
                            errorList.push({
                                field_name: item,
                                field_value: data[item].field_value,
                                rule: {required: rule.required},
                                description: 'value is required'
                            });
                        }
                    }
                    if (rule.pattern && rule.pattern != '') {
                        var regexPattern = new RegExp(rule.pattern);
                        if (!regexPattern.test(data[item].field_value)) {
                            errorList.push({
                                field_name: item,
                                field_value: data[item].value,
                                rule: {pattern: rule.pattern},
                                description: 'value do not match the pattern(' + rule.pattern + ')'
                            });
                        }
                    }
                }
            }

            if (errorList.length != 0) {
                $rootScope.$broadcast('amagFormValidationError', errorList);
                return false;
            }

            return true;
        };

        var getValidationRulesById = function (id) {
            var rule = validationConfig.defaultValidationRules;
            for (var item in rule) {
                if (rule[item].id == id) {
                    var ruleObj = rule[item].rule;
                    return ruleObj;
                }
            }
        };

        var setValidationConfig = function (config) {
            $.getJSON(config, function (data) {
                validationConfig = data;
            });
        };

        var getValidationConfig = function () {
            return validationConfig;
        };

        return {
            setConfig: setValidationConfig,
            getConfig: getValidationConfig,
            validate: validate
        }
    }]);

    app.directive('amagForm', ['$parse', 'amagFormValidationService', 'amagFormPersistenceService', function ($parse, amagFormValidationService, amagFormPersistenceService) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                attrs.$set('novalidate', 'true');

                var data = {};
                var form = element;//simple rename
                var inputs = $('[amag-form-field]');
                var checkboxes = $('[amag-form-field]');
                var table_default = form.attr('amag-table-default');
                form.on('submit', function () {
                    for (var i = 0; i < inputs.length; i++) {
                        var field_value = '';
                        var field_name = $(inputs[i]).attr('amag-form-field');
                        var field_validation_rule_id = $(inputs[i]).attr('amag-form-validation-rule') || '';
                        var table = $(inputs[i]).attr('amag-form-table') || table_default;

                        if ($(inputs[i]).attr('type') == 'radio' && !$(inputs[i]).prop("checked")) {
                            //Jump over unchecked radios
                            continue;
                        } else if ($(inputs[i]).attr('type') == 'checkbox') {
                            if ($(inputs[i - 1]).attr('type') != 'checkbox') {
                                data[field_name] = {};
                            }
                            if ($(inputs[i]).prop("checked")) {
                                field_value = $(inputs[i]).val();
                                var checkboxName = $(inputs[i]).attr('amag-form-checkbox');
                                data[field_name][checkboxName] = {
                                    checkbox_group: field_name.toString(),
                                    checkbox_name: checkboxName.toString(),
                                    checkbox_value: field_value.toString(),
                                    table: table.toString(),
                                    validation_rule_id: field_validation_rule_id.toString() || ''
                                };
                            } else {
                                //Jump over unchecked checkboxes
                                continue;
                            }
                        } else {
                            //Everything else and radios
                            field_value = $(inputs[i]).val();
                            data[field_name] = {
                                field_name: field_name.toString(),
                                field_value: field_value.toString(),
                                table: table.toString(),
                                validation_rule_id: field_validation_rule_id.toString() || ''
                            };
                        }
                    }

                    if (amagFormValidationService.validate(data)) {
                        amagFormPersistenceService.persist(data);
                    }
                });


            }
        }
    }]);

}());