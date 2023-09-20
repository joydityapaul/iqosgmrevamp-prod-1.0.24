
const fs = require('fs');
const JsonFind = require('json-find');
const constants = require('./constants.js')
const utility = require('./utility.js')

module.exports = {
    jsonModelFilePath: '',
    day: '',

    getPrimaryMessagePathCollection: function (typeOfCustomer, dynamicContent) {
        var JSONModel = utility.readJSONFile(this.jsonModelFilePath);

        if (JSONModel)
            switch (typeOfCustomer) {
                case constants.newCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.newCustomer), dynamicContent);
                case constants.existingCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.existingCustomer), dynamicContent);
                case constants.secondevice:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.secondevice), dynamicContent);
                case constants.ndrCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.ndrCustomer), dynamicContent);
                case constants.DFTCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.DFTCustomer), dynamicContent);
                case constants.NewSubscriberCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.NewSubscriberCustomer), dynamicContent);
                case constants.ExA2ndSubscriberCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.ExA2ndSubscriberCustomer), dynamicContent);
                case constants.ExA1stSubscriberCustomer:
                    return this.getPrimaryJSONMessagesPathCollection(JSON.parse(JSONModel),
                        constants.getPrimaryMessageKeyPart(constants.ExA1stSubscriberCustomer), dynamicContent);
                default:
                    return [];
            }
        else {

            return [];
        }

    },
    getPrimaryJSONMessagesPathCollection: function (JSONModel, typeOfCustomer, dynamicContent) {

        var key = this.day.concat(typeOfCustomer);
        var LINEMessagesObject = JsonFind(JSONModel);
        var primaryMesageObject = LINEMessagesObject.checkKey(key); // Primary Object from Menifest i.e. "Day46_NewSubscriber_Primary"

        var primaryObjectKeys = Object.keys(primaryMesageObject);

        var JSONFilePathCollection = [];
        primaryObjectKeys.forEach(element => {
            let JSONFilePath = ''
            if (element.includes('_DC')) {  // element can be "Day46_NewSubscriber_Message3_DC"
                let tempArray = element.split('_');
                let key = tempArray[2] + "_" + tempArray[3]; // "Message3_DC"
                let dynamicContentObject = primaryMesageObject[element];
                JSONFilePath = utility.getDynamicContent(constants, dynamicContentObject, key, dynamicContent, this.day);

            } else {
                JSONFilePath = primaryMesageObject[element]
            }

            if (JSONFilePath)
                JSONFilePathCollection.push(JSONFilePath)
        });
        primaryObjectKeys.forEach(element => {

        });

        return JSONFilePathCollection;

    },
    getSecondoryMessagePathCollection: function (messageID, version, loyality, typeOfCustomer, subscriptionPlan, dynamicContent) {

        var JSONModel = utility.readJSONFile(this.jsonModelFilePath);
        if (JSONModel)
            return this.getSecondoryJSONPathCollection(JSON.parse(JSONModel), messageID, version, loyality, subscriptionPlan, dynamicContent);
        else {
            return [];
        }
    },
    getSecondoryJSONPathCollection: function (JSONModel, messageID, version, loyality, subscriptionPlan, dynamicContent) {
        var _this = this;
        var JSONFilePathCollection = [];
        var LINEMessagesObject = JsonFind(JSONModel);
        var secondoryMesageObject = LINEMessagesObject.checkKey(messageID); // "Day46_New_Message4_Level1" Object

        if (secondoryMesageObject)
            var secondoryObjectKeys = Object.keys(secondoryMesageObject);
        var JSONFilePathCollection = [];
        secondoryObjectKeys.forEach(element => {
            let JSONFilePath = ''
            if (element.includes('_DC')) {  // element can be "Day46_New_Message5_DC"
                let tempArray = element.split('_');
                let key = tempArray[2] + "_" + tempArray[3]; // "Message3_DC"
                let dynamicContentObject = secondoryMesageObject[element]; // "Day46_New_Message5_DC" Object
                JSONFilePathOrObject = utility.getDynamicContent(constants, dynamicContentObject, key, dynamicContent, this.day);
                if (typeof JSONFilePathOrObject === 'object') {
                    JSONFilePath = JSONFilePathOrObject["" + version];
                }
                else
                    JSONFilePath = JSONFilePathOrObject; // if plain JSON File Path

            }
            else { // element can be "Day46_NewSubscriber_Message3"
                let node = secondoryMesageObject[element];
                if (typeof node === 'object') {
                    if (node["" + loyality] && loyality != null && version == null) {
                        JSONFilePath = node["" + loyality];
                    }
                    else if (node["" + version]) {
                        JSONFilePath = node["" + version];
                    }
                    else if (node["" + loyality]) {
                        JSONFilePath = node["" + loyality];
                    } else if (node["" + subscriptionPlan]) {
                        JSONFilePath = node["" + subscriptionPlan];
                    }
                }
                else {
                    JSONFilePath = node;
                }
            }

            if (JSONFilePath)
                JSONFilePathCollection.push(JSONFilePath)
        });

        return JSONFilePathCollection

    }

}


