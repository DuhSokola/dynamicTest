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

                if (data[item][Object.keys(data[item])[0]].field_type == 'checkbox') {
                    rule = getValidationRulesById(data[item][Object.keys(data[item])[0]].validation_rule_id);
                }

                if (rule && rule != '') {
                    if (rule.max && rule.max != '') {
                        if (data[item].field_value.length > rule.max) {
                            errorList.push({
                                field_name: item,
                                field_value: data[item].field_value,
                                rule: {max: rule.max},
                                description: 'length gt max(' + rule.max + ')'
                            });
                        }
                    }
                    if (rule.min && rule.min != '') {
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
                        //first field must have validation attr
                        if (data[item][Object.keys(data[item])[0]].field_type == 'checkbox') {
                            var isValid = false;
                            for (var checkbox in data[item]) {
                                if (data[item][checkbox].field_value) {
                                    isValid = true;
                                }
                            }
                            if (!isValid) {
                                errorList.push({
                                    field_name: item,
                                    field_value: data[item][checkbox].field_value,
                                    rule: {required: rule.required},
                                    description: 'value is required'
                                });
                            }
                        } else if (!data[item].field_value || !/\S/.test(data[item].field_value)) {
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
                var table_default = form.attr('amag-form-table-default');
                form.on('submit', function () {
                    var inputs = $('[amag-form-field]');

                    for (var i = 0; i < inputs.length; i++) {
                        var field_value = '';
                        var field_name = $(inputs[i]).attr('amag-form-field');
                        var field_validation_rule_id = $(inputs[i]).attr('amag-form-validation-rule') || '';
                        var table = $(inputs[i]).attr('amag-form-field-table') || table_default;

                        field_value = $(inputs[i]).val();
                        data[field_name] = {
                            field_name: field_name.toString(),
                            field_value: field_value.toString(),
                            table: table.toString(),
                            validation_rule_id: field_validation_rule_id.toString() || ''
                        };
                    }

                    var checkboxes = $('[amag-form-checkbox-group]');

                    var checkboxGroups = [];
                    for (var i = 0; i < checkboxes.length; i++) {
                        checkboxGroups.push($(checkboxes[i]).attr('amag-form-checkbox-group'));
                    }
                    $.unique(checkboxGroups);

                    for (var i = 0; i < checkboxGroups.length; i++) {
                        var query = '[amag-form-checkbox-group=' + checkboxGroups[i] + ']';
                        var checkboxesOfGroup = $(query);

                        data[checkboxGroups[i]] = {};

                        checkboxesOfGroup.each(function (index, element) {
                            var checkboxName = $(element).attr('amag-form-checkbox-name');
                            var checkboxValue = $(element).prop('checked');
                            var table = $(element).attr('amag-form-field-table') || table_default;
                            var validation_rule_id = $(element).attr('amag-form-validation-rule') || '';

                            data[checkboxGroups[i]][checkboxName] = {
                                field_type: 'checkbox',
                                field_name: checkboxName.toString(),
                                field_value: checkboxValue.toString(),
                                table: table.toString(),
                                validation_rule_id: validation_rule_id.toString() || ''
                            };
                        });
                    }

                    var radios = $.unique($('[amag-form-radio-group]'));
                    var radioGroups = [];

                    for (var i = 0; i < radios.length; i++) {
                        radioGroups.push($(radios[i]).attr('amag-form-radio-group'));
                    }

                    $.unique(radioGroups);

                    for (var i = 0; i < radioGroups.length; i++) {
                        var query = '[amag-form-radio-group=' + radioGroups[i] + ']:checked';
                        var radioGroupValue = $(query).val() || '';
                        var table = $('[amag-form-radio-group=' + radioGroups[i] + ']').attr('amag-form-field-table') || table_default;
                        var validation_rule_id = $('[amag-form-radio-group=' + radioGroups[i] + ']').attr('amag-form-validation-rule') || '';

                        data[radioGroups[i]] = {
                            field_type: 'radio',
                            field_name: radioGroups[i].toString(),
                            field_value: radioGroupValue.toString(),
                            table: table.toString(),
                            validation_rule_id: validation_rule_id.toString() || ''
                        };
                    }

                    if (amagFormValidationService.validate(data)) {
                        amagFormPersistenceService.persist(data);
                    }
                });


            }
        }
    }]);

}());