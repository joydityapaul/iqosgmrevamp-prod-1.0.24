define([
    'postmonger'
], function (
    Postmonger
) {
    'use strict';

    var connection = new Postmonger.Session();
    var payload = {};
    var eventDefinitionKey;
    $(window).ready(onRender);
    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);
    connection.on('clickedNext', save);
    connection.trigger('requestInteraction');
    connection.on('requestedInteraction', function (settings) {
        eventDefinitionKey = settings.triggers[0].metaData.eventDefinitionKey;
    });

    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');

    }

    function initialize(data) {
        if (data) {
            payload = data;
        }
        var message;
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        $.each(inArguments, function (index, inArgument) {
            $.each(inArgument, function (key, val) {
                console.log("inArgument " + inArgument);
            });
        });


    }

    function onGetTokens(tokens) {

    }

    function onGetEndpoints(endpoints) {

    }


    function save() {
        payload['arguments'].execute.inArguments = [{
            "spice_id": "{{Event." + eventDefinitionKey + ".spice_id}}",
            "journey": "{{Contact.Attribute.GM_Revamp_Master_DE.Audience}}",
            "c_fname":"{{Contact.Attribute.GM_Revamp_Master_DE.First_Name}}",
            "lname": "{{Contact.Attribute.GM_Revamp_Master_DE.Last_Name}}",
            "action": "{{Contact.Attribute.Consumer_GM_Revamp_Tracking.Action}}",
            "SegmentName": "{{Event." + eventDefinitionKey + ".SegmentName}}",
            "ContactKey": "{{Event." + eventDefinitionKey + ".ContactKey}}",
            "spiceIDs": "{{Event." + eventDefinitionKey + ".spiceIDs}}",
            "richMenuID": "{{Event." + eventDefinitionKey + ".richMenuID}}", 
            "menuAction": "{{Event." + eventDefinitionKey + ".menuAction}}" 
        }];
        payload['metaData'].isConfigured = true;
        connection.trigger('updateActivity', payload);
    }


});