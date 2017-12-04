'use strict';

var request = require("request");
var rp = require('request-promise');
var dateFormat = require('dateformat');

var apiKeys = {
  'dev': 'l7xxfff2da3a70a34a60bb32d2bcf2fd0791',
  'tst': 'l7xxe8e2440d66d34eb4807c1db6f6305990',
  'sim': 'l7xx2e4f44efe5034a4aa27c31e8495f4a9a'
};

var defaultHerokuEnv = "sim";
var defaultPatientId = "1008895";
var defaultBearerToken = "00DP00000002vUC!ARIAQLAmK4GJVdokX2.aZc6xKT3d_5aa3W98lBjDIJNOyECH3Bhr90wrMT.FhjnDRvF.Pyg5JvEglGFYPym3eHnHTeRIlCGt";
// var defaultHerokuEnv = null;
// var defaultPatientId = null;
// var defaultBearerToken = null;

// Lex concept - asking the user to provide the value of a slot from the lambda function (as opposed to from Lex)
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
        if (dosageTime.toLowerCase() === 'next') {
            if (medicineName.toLowerCase() === 'taltz') {
                message.content = `Your next dose of ${medicineName} should be taken tomorrow`;
            }
            if (medicineName.toLowerCase() === 'olumiant') {
                message.content = `Your next dose of ${medicineName} should be taken today.`;
            }
        } else {
            if (medicineName.toLowerCase() === 'taltz') {
                message.content = `Your last dose of ${medicineName} was taken on Wednesday May 12th.`;
            }
            if (medicineName.toLowerCase() === 'olumiant') {
                message.content = `Your last dose of ${medicineName} was taken yesterday.`;
            }
        }

    } else {
        if (medicineName.toLowerCase() === 'taltz') {
            message.content = `${medicineName} should be taken every 2 weeks for the first 6 weeks, then every 4 weeks after that. Did I answer your question?`;
        }
        if (medicineName.toLowerCase() === 'olumiant') {
            message.content = `${medicineName} should be taken once a day. Did I answer your question?`;
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

    if (assistanceReply.toLowerCase() === 'yes') {
        message.content = `Happy to help!`;
    } else if (assistanceReply.toLowerCase() === 'no') {
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
    if (messageContent === null) {
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
  console.log("In validateCheckDosage")
    const medicineTypes = ['taltz', 'olumiant'];
    const dosageTimes = ['next', 'last'];
    if (medicineType === null) {
      return buildValidationResult(false, 'medicineType', `What medication are you asking about?`);
    }
    if (medicineTypes.indexOf(medicineType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'medicineType', `I dont have ${medicineType} listed as a medication.`);
    }
    if (dosageTime && dosageTimes.indexOf(dosageTime.toLowerCase()) === -1) {
        return buildValidationResult(false, 'dosageTime', `Please specify whether you want the last or next dosage date.`);
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
    const slots = intentRequest.currentIntent.slots;
    var medicineType = slots.medicineType;
    const dosageTime = slots.dosageTime;

    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    if (slots.assistanceConfirmation) {
        if (slots.assistanceConfirmation === "yes") {
            callback(close(intentRequest.sessionAttributes, 'Fulfilled', slots.assistanceConfirmation));
        } else {
            callback(close(intentRequest.sessionAttributes, 'Fulfilled', slots.assistanceConfirmation));
        }
    }

    // This is for validation - the first time the lambda function is called
    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.
        // Use the elicitSlot dialog action to re-prompt for the first violation detected.
        console.log("In DialogCodeHook");
        if (!medicineType && ("medicineName" in outputSessionAttributes)) {
          medicineType = outputSessionAttributes.medicineName;
        }
        const validationResult = validateCheckDosage(medicineType, dosageTime);
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }
        outputSessionAttributes.medicineName = medicineType;
    }

    var medicineName = medicineType || outputSessionAttributes.medicineName;

    // We have the medicineName and dosageTime, so now we can provide the proper response.
    // If the caller is supplying the patientId and the bearer token, or we have them hard
    // coded as defaults in this file, then we try to call the actual LillyPlus dosages
    // services. If not, we revert to the hard-coded responses in the confirmIntent method.

    var herokuEnv = null;
    var apiKey = null;
    var patientId = null;
    var bearerToken = null;

    if ("herokuEnv" in slots) {
      herokuEnv = slots.herokuEnv;
    }
    if (herokuEnv === undefined || herokuEnv === null || herokuEnv !== '') {
      herokuEnv = defaultHerokuEnv;
    }
    if (herokuEnv !== null) {
      apiKey = apiKeys[herokuEnv] || null;
    }
    if ("patientId" in slots) {
      patientId = slots.patientId;
    }
    if ("bearerToken" in slots) {
      bearerToken = slots.bearerToken;
    }
    if (patientId === undefined || patientId === null || patientId === '') {
        patientId = defaultPatientId;
    }
    if (bearerToken === undefined || bearerToken === null || bearerToken === '') {
        bearerToken = defaultBearerToken;
    }
    console.log(`herokuEnv=${herokuEnv}
      apiKey=${apiKey}
      patientId=${patientId}
      bearerToken=${bearerToken}`);
    if (bearerToken === null || patientId === null || apiKey === null) {
        callback(confirmIntent(intentRequest.sessionAttributes, 'Fulfilled', medicineName, dosageTime, intentRequest.currentIntent.slots, intentRequest.currentIntent.name));
    } else {
        getDosageInformation(intentRequest.sessionAttributes, 'Fulfilled', intentRequest, callback, herokuEnv, apiKey, patientId, bearerToken, medicineName, dosageTime);
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

  if (medicineName === null && ("medicineName" in sessionAttributes)) {
    medicineName = sessionAttributes.medicineName;
  }

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
        },
        json: true
    };

    rp(options)
        .then(function(parsedBody) {
          var message = null;

          // Fetch the dosage profiles and find the currently active profiles
          if (parsedBody.payload.dosageProfiles !== null) {
            var activeProfile = null;
            for (let profile of parsedBody.payload.dosageProfiles) {
              if (profile.isActive) {
                var nextDosageIndex = profile.nextDosageNumber;

                // if the dosageTime passed in is "last", then fetch the last recorded dose, otherwise fetch the next dose due
                if (dosageTime === "last" && nextDosageIndex == 0) {
                  message = { contentType: 'PlainText', content: `You have not recorded taking ${medicineName} yet.` };
                }
                else {
                  var dosageIndex = nextDosageIndex;
                  var isWas = "next dose is due ";
                  if (dosageTime === "last") {
                    dosageIndex = nextDosageIndex - 1;
                    isWas = "last dose was taken ";
                  }
                  var dosageDate = profile.dosages[dosageIndex].dosageDate;
                  var date = new Date(0);
                  date.setUTCSeconds(dosageDate);
                  // Convert the date to a human-readable format
                  let formattedDate = dateFormat(date, "dddd, mmmm dS");
                  message = { contentType: 'PlainText', content: `Your ${isWas} ${formattedDate}.` };
                }
              }
              break;
            }
          }
          if (message == null) {
            message = { contentType: 'PlainText', content: `No dosage information could be found for ${medicineName} in your profile.` };
          }
          callback({
              sessionAttributes,
              dialogAction: {
                  type: 'Close',
                  fulfillmentState,
                  message
              }
          });
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
//        console.log(`event.bot.name=${event.bot.name}`);

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
