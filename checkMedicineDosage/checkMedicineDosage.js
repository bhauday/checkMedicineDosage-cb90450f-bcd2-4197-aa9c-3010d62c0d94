'use strict';

var request = require("request");
var rp = require('request-promise');

let apiKeys = {
  'dev': 'l7xxfff2da3a70a34a60bb32d2bcf2fd0791',
  'tst': 'l7xxe8e2440d66d34eb4807c1db6f6305990',
  'sim': 'l7xx2e4f44efe5034a4aa27c31e8495f4a9a'
};
var defaultHerokuEnv = "sim"
var defaultPatientId = "1298965";
var defaultBearerToken = "00DP00000002vUC!ARIAQAtII_NkNX_sTM48gHuCsV5glXy_5UVQ46GNpEJ9J6YHNL2Lem1IzIKi2XeENxstMIjZcBKeoOs6rhXztm_cG8vgGl_W";
//var defaultPatientId = null;
//var defaultBearerToken = null;

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message
        }
    };
}

function confirmIntent(sessionAttributes, fulfillmentState, medicineName, dosageTime, slots, intentName) {
    var message = { contentType: 'PlainText', content: `Sorry ${medicineName} is not available in my database.` };
    if (dosageTime) {
        if (dosageTime.toLowerCase() == 'next') {
            if (medicineName.toLowerCase() == 'taltz') {
                message.content = `${medicineName} should be taken at 5pm`;
            }
            if (medicineName.toLowerCase() == 'krokan') {
                message.content = `${medicineName} should be taken at 10pm.`;
            }
            if (medicineName.toLowerCase() == 'zinetac') {
                message.content = `${medicineName} should be taken taken at 11pm.`;
            }
        } else {
            if (medicineName.toLowerCase() == 'taltz') {
                message.content = `${medicineName} was taken at 5am.`;
            }
            if (medicineName.toLowerCase() == 'krokan') {
                message.content = `${medicineName} was taken at 3am.`;
            }
            if (medicineName.toLowerCase() == 'zinetac') {
                message.content = `${medicineName} was taken at 2am`;
            }
        }

    } else {
        if (medicineName.toLowerCase() == 'taltz') {
            message.content = `${medicineName} should be taken 2 times a day. Were you happy with my assistance.`;
        }
        if (medicineName.toLowerCase() == 'krokan') {
            message.content = `${medicineName} should be taken 5 times a day. Were you happy with my assistance.`;
        }
        if (medicineName.toLowerCase() == 'zinetac') {
            message.content = `${medicineName} should be taken 1 time a day. Were you happy with my assistance.`;
        }
    }
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            // fulfillmentState,
            message
        }
    };
}

function close(sessionAttributes, fulfillmentState, assistanceReply) {
    var message = { contentType: 'PlainText', content: `Sorry I did not understand` };

    if (assistanceReply.toLowerCase() == 'yes') {
        message.content = `Happy to help!`;
    } else if (assistanceReply.toLowerCase() == 'no') {
        message.content = `Please contact Lily assistance at +1-800-545-6962 .`;
    } else {
        //do nothing
    }
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message
        }
    };
}


function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots
        }
    };
}

// ---------------- Helper Functions --------------------------------------------------

function parseLocalDate(date) {
    /**
     * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
     * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
     */
    const dateComponents = date.split(/\-/);
    return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
    try {
        return !(Number.isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent }
    };
}

function validateCheckDosage(medicineType, dosageTime) {
    const medicineTypes = ['taltz', 'krokan', 'zinetac'];
    const dosageTimes = ['next', 'last'];
    if (medicineType && medicineTypes.indexOf(medicineType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'medicineType', `I dont have ${medicineType} listed in my medicine section, maybe you are looking for Taltz.`);
    }
    if (dosageTime && dosageTimes.indexOf(dosageTime.toLowerCase()) === -1) {
        return buildValidationResult(false, 'medicineType', `I dont have understand what you are`);
    }

    return buildValidationResult(true, null, null);
}


// --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
function checkDosage(intentRequest, callback) {
    const medicineType = intentRequest.currentIntent.slots.medicineType;
    const dosageTime = intentRequest.currentIntent.slots.dosageTime;

    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    if (intentRequest.currentIntent.slots.assistanceConfirmation) {
        if (intentRequest.currentIntent.slots.assistanceConfirmation == "yes") {
            callback(close(intentRequest.sessionAttributes, 'Fulfilled', intentRequest.currentIntent.slots.assistanceConfirmation));
        } else {
            callback(close(intentRequest.sessionAttributes, 'Fulfilled', intentRequest.currentIntent.slots.assistanceConfirmation));
        }
    }
    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateCheckDosage(medicineType, dosageTime);
        if (!validationResult.isValid) {
            console.log("state check 1");
            slots[`${validationResult.violatedSlot}`] = null;

            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }
        if (outputSessionAttributes.medicineName && !medicineType) {
            if (medicineType) {
                outputSessionAttributes.medicineName = medicineType
            }
            callback(confirmIntent(intentRequest.sessionAttributes, 'Fulfilled', outputSessionAttributes.medicineName, dosageTime, slots, intentRequest.currentIntent.name));
            return;
        }
        if (medicineType) {
            outputSessionAttributes.medicineName = medicineType;
        }
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }
    var medicineName = medicineType || outputSessionAttributes.medicineName;

    // We have the medicineName and dosageTime, so now we can provide the proper response.
    // If the caller is supplying the patientId and the bearer token, or we have them hard
    // coded as defaults in this file, then we try to call the actual LillyPlus dosages
    // services. If not, we revert to the hard-coded responses in the confirmIntent method.
    const slots = intentRequest.currentIntent.slots;
    var herokuEnv = null;
    var apiKey = null;
    var patientId = null;
    var bearerToken = null;

    if ("herokuEnv" in slots) {
      herokuEnv = slots.herokuEnv;
    }
    if (herokuEnv !== undefined && herokuEnv !== null && herokuEnv != '' && defaultHerokuEnv !== null) {
      apiKey = apiKeys.defaultHerokuEnv || null;
    }
    if
    if ("pcpPatientId" in slots) {
      patientId = slots.pcpPatientId;
    }
    if ("bearerToken" in slots) {
      bearerToken = slots.bearerToken;
    }
    if (patientId === undefined || patientId === null || patientId == '') {
        patientId = defaultPatientId;
    }
    if (bearerToken === undefined || bearerToken === null || bearerToken == '') {
        bearerToken = defaultBearerToken;
    }
    if (bearerToken == null || patientId == null || apiKey == null) {
        callback(confirmIntent(intentRequest.sessionAttributes, 'Fulfilled', medicineName, dosageTime, intentRequest.currentIntent.slots, intentRequest.currentIntent.name));
    } else {
        getDosageInformation(intentRequest.sessionAttributes, 'Fulfilled', intentRequest, callback, apiKey, patientId, bearerToken, medicineName, dosageTime);
    }

}

// This function attempts to call the LillyPlus dosage service to fetch the appropriate dosage time.
// It uses the "request" node package to do the HTTP request. https://github.com/request/request
// Because we cannot authenticate the Alexa device to the LP services due to limitations of the
// Lilly IdentityHub, we are passing in (or using a hard coded value) both the patientID and the
// OAuth bearerToken. The token is only good for one hour, so it makes it a little involved to
// demo this functionality.
//
// note: as of now, I am not distinguishing any error conditions - it either succeeds or fails.
// it needs to be cleaned up to provide a meaningful response to the user (one of which would be
// that he/she is not logged in - others would relate to not being enrolled the program for the
// medication passed in the the medicineType slot)
function getDosageInformation(sessionAttributes, fulfillmentState, intentRequest, callback, herokuEnv, apiKey, patientId, bearerToken, medicineName, dosageTime) {

    var responseObject = null;
    let uri = `https://gateway-np.lillyapi.com:8443/${herokuEnv}/virtualClaudia/v3/patient/product/dosage?pcpPatientId=${patientId}&vcProductId=${medicineName}`
    console.log("About to call request method: " + uri);

    var options = {
        method: "GET",
        uri: uri,
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'X-API-Key': apiKey,
            'Requestor': 'VCClient',
            'Authorization': 'Bearer ' + bearerToken
        }
    };

    rp(options)
        .then(function(parsedBody) {
          console.log("In then block");
          console.log(parsedBody);
            //var data = JSON.parse(response.body);
            console.log("In then block 1");
            var nextDosageIndex = parsedBody.payload.nextDosageNumber;
            var next_dosage_date = parsedBody.payload.dosages[nextDosageIndex].dosageTakenDate;
            console.log("In then block 2");
            const slots = intentRequest.currentIntent.slots;
            const intentName = intentRequest.currentIntent.name;
            console.log("Response Date: " + next_dosage_date);
            // Convert the date to a human format
            var date = new Date(0);
            date.setUTCSeconds(next_dosage_date);
            message = { contentType: 'PlainText', content: `Your next dosage is scheduled for ${date}.` };
        })
        .catch(function(err) {
            var message = { contentType: 'PlainText', content: `There was a problem accessing LillyPlus services to get your dosage information.` };
            console.log("in error block - setting response object.");
            console.log(err);
            callback({
                sessionAttributes,
                dialogAction: {
                    type: 'Close',
                    fulfillmentState,
                    message
                }
            });
        });

    // let end = Date.now() + 5000;
    // while (Date.now() < end);
    // console.log("5 second timeout");
}

function checkFAQIntent(intentRequest, callback) {
    const FAQQuestionVal = intentRequest.currentIntent.slots.FAQQuestionVal;
    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};


    callback(closeFAQIntent(intentRequest.sessionAttributes, 'Fulfilled', FAQQuestionVal));
}


// --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'checkDosage') {
        return checkDosage(intentRequest, callback);
    } else if (intentName === 'FAQIntent') {
        return checkFAQIntent(intentRequest, callback);
    }
    throw new Error(`Intent with name ${intentName} not supported`);
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);

        /**
         * Uncomment this if statement and populate with your Lex bot name and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
         * bot version.
         */
        /*
        if (event.bot.name !== 'checkDosage') {
             callback('Invalid Bot Name');
        }
        */
        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};
