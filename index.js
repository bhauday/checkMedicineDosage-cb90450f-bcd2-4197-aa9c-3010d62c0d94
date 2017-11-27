'use strict';

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function confirmIntent(sessionAttributes, fulfillmentState, medicineName,dosageTime,slots,intentName) {
    let message={ contentType: 'PlainText', content:`Sorry ${medicineName} is not available in my database.`  };
    if(dosageTime){
        if(dosageTime.toLowerCase()=='next'){
            if(medicineName.toLowerCase()=='taltz'){
                message.content=`${medicineName} should be taken at 5pm`
            }
            if(medicineName.toLowerCase()=='krokan'){
                message.content=`${medicineName} should be taken at 10pm.`
            }
            if(medicineName.toLowerCase()=='zinetac'){
                message.content=`${medicineName} should be taken taken at 11pm.`
            }       
        }
        else{
            if(medicineName.toLowerCase()=='taltz'){
                message.content=`${medicineName} was taken at 5am.`
            }
            if(medicineName.toLowerCase()=='krokan'){
                message.content=`${medicineName} was taken at 3am.`
            }
            if(medicineName.toLowerCase()=='zinetac'){
                message.content=`${medicineName} was taken at 2am`
            }
        }
         
    }
    else{
        if(medicineName.toLowerCase()=='taltz'){
            message.content=`${medicineName} should be taken 2 times a day. Were you happy with my assistance.`
        }
        if(medicineName.toLowerCase()=='krokan'){
            message.content=`${medicineName} should be taken 5 times a day. Were you happy with my assistance.`
        }
        if(medicineName.toLowerCase()=='zinetac'){
            message.content=`${medicineName} should be taken 1 time a day. Were you happy with my assistance.`
        }    
    }
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            // fulfillmentState,
            message,
        },
    };
}
function close(sessionAttributes, fulfillmentState, assitanceReply) {
    let message={ contentType: 'PlainText', content:`Sorry I did not understand`  };
    
    if(assitanceReply.toLowerCase()=='yes'){
        message.content=`Happy to help!`;
    }
    else if(assitanceReply.toLowerCase()=='no'){
        message.content=`Please contact Lily assistance at +1-800-545-6962 .`;
    }
    else{
        
    }
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}


function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
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
        return !(isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}

function validateCheckDosage(medicineType, dosageTime) {
    const medicineTypes = ['taltz', 'krokan', 'zinetac'];
    const dosageTimes = ['next', 'last'];
    if (medicineType && medicineTypes.indexOf(medicineType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'medicineType', `I dont have ${medicineType} listed in my medicine section, may be you are looking for Taltz.`);
    }
    if(dosageTime && dosageTimes.indexOf(dosageTime.toLowerCase()) === -1){
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
    if(intentRequest.currentIntent.slots.assistanceConfirmation){
        if(intentRequest.currentIntent.slots.assistanceConfirmation=="yes"){
            callback(close(intentRequest.sessionAttributes,'Fulfilled',intentRequest.currentIntent.slots.assistanceConfirmation))
        }
        else{
            callback(close(intentRequest.sessionAttributes,'Fulfilled',intentRequest.currentIntent.slots.assistanceConfirmation))
        }
    }
    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateCheckDosage(medicineType, dosageTime);
        if (!validationResult.isValid) {
            console.log("stae check 1");
            slots[`${validationResult.violatedSlot}`] = null;
            
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;    
        }
            if(outputSessionAttributes.medicineName && !medicineType){
                if(medicineType){
                    outputSessionAttributes.medicineName=medicineType
                }
                callback(confirmIntent(intentRequest.sessionAttributes, 'Fulfilled',outputSessionAttributes.medicineName,dosageTime,slots,intentRequest.currentIntent.name));
                return;
            }
        if (medicineType) {
            outputSessionAttributes.medicineName = medicineType;
        }
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }
    var medicineName=medicineType || outputSessionAttributes.medicineName;
    callback(confirmIntent(intentRequest.sessionAttributes, 'Fulfilled',medicineName,dosageTime,intentRequest.currentIntent.slots,intentRequest.currentIntent.name));
}

function checkFAQIntent(intentRequest, callback) {
    const FAQQuestionVal = intentRequest.currentIntent.slots.FAQQuestionVal;
    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    
    
    callback(closeFAQIntent(intentRequest.sessionAttributes, 'Fulfilled',FAQQuestionVal));
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
    }
    else if(intentName === 'FAQIntent'){
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
