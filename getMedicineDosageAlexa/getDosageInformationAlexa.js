'use strict';

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */


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


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Alexa Skills Kit sample. ' +
        'Please tell me your favorite color by saying, my favorite color is red';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me your favorite color by saying, ' +
        'my favorite color is red';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Alexa Skills Kit sample. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createFavoriteColorAttributes(favoriteColor) {
    return {
        favoriteColor,
    };
}

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

function confirmIntent(sessionAttributes, fulfillmentState, medicineName, dosageTime, slots, intentName,callback) {
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


    console.log(sessionAttributes);


    const cardTitle = 'Dosage Information';
    const speechOutput = message.content;
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = message.content;
    const shouldEndSession = true;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

    // return {
    //         "outputSpeech": {
    //         "type": "PlainText",
    //         "text": message.content
    //      },
    //         directives: [{
    //             type: 'Dialog.ConfirmIntent',
    //             updatedIntent:{
    //                 intentName,
    //                 slots
    //             // fulfillmentState,
    //             // message
    //             }
    //         }
    //         ]

    // };

    // return {
    //     "sessionAttributes":sessionAttributes,
    //     "response": {
    //         "outputSpeech": {
    //         "type": "PlainText",
    //         "text": message.content
    //      },
    //         directives: [{
    //             type: 'Dialog.ConfirmIntent',
    //             updatedIntent:{
    //                 intentName,
    //                 slots
    //             // fulfillmentState,
    //             // message
    //             }
    //         }
    //         ]
    //     }
    // };
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
    console.log(" medicineType valye in In validateCheckDosage = "+medicineType)
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

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setColorInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const favoriteColorSlot = intent.slots.Color;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (favoriteColorSlot) {
        const favoriteColor = favoriteColorSlot.value;
        sessionAttributes = createFavoriteColorAttributes(favoriteColor);
        speechOutput = `I now know your favorite color is ${favoriteColor}. You can ask me ` +
            "your favorite color by saying, what's my favorite color?";
        repromptText = "You can ask me your favorite color by saying, what's my favorite color?";
    } else {
        speechOutput = "I'm not sure what your favorite color is. Please try again.";
        repromptText = "I'm not sure what your favorite color is. You can tell me your " +
            'favorite color by saying, my favorite color is red';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function checkDosage(intent, session, callback) {
    const slots = intent.slots;
    var medicineType = slots.medicineType.value;
    const dosageTime = slots.dosageTime.value;

    // Seesion Attributes
    var outputSessionAttributes = session.attributes

    // Perform basic validation on the supplied input slots.
    // Use the elicitSlot dialog action to re-prompt for the first violation detected.
    console.log("In DialogCodeHook");
    if (!medicineType && ("medicineName" in outputSessionAttributes)) {
      medicineType = outputSessionAttributes.medicineName;
    }
    const validationResult = validateCheckDosage(medicineType, dosageTime);
    if (!validationResult.isValid) {
        slots[`${validationResult.violatedSlot}`] = null;
        callback(elicitSlot(session.attributes, intent.name, slots, validationResult.violatedSlot, validationResult.message));
        return;
    }
    outputSessionAttributes.medicineName = medicineType;
    // This is for validation - the first time the lambda function is called
    // if (source === 'DialogCodeHook') {

    // }

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
        callback(confirmIntent(session.attributes, 'Fulfilled', medicineName, dosageTime, intent.slots, intent.name));
    } else {
        confirmIntent(outputSessionAttributes, 'Fulfilled', medicineName, dosageTime, intent.slots, intent.name,callback);
        // getDosageInformation(session.attributes, 'Fulfilled', intent, callback, herokuEnv, apiKey, patientId, bearerToken, medicineName, dosageTime);
    }
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'checkDosage') {
        checkDosage(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
