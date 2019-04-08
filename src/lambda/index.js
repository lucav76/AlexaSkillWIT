// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
var https = require('https');

// Returns a promise able to download a url; in case of redirect, the new destination is returned
function httpGet(url) {
  return new Promise(((resolve, reject) => {
    const request = https.request(url, (response) => {
      response.setEncoding('utf8');
      let returnData = ''; 
      
      if (response.statusCode === 301) // Redirect
          return resolve(response.headers['location']);
      if (response.statusCode < 200 || response.statusCode >= 300) // Error
        return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
  
      response.on('data', (chunk) => {
        returnData += chunk;
      });    
      response.on('end', () => {
        resolve(returnData);
      });    
      response.on('error', (error) => {
        reject(error);
      });
    });
    request.end();
  }));
}

// Reduces the size of the page, to avoid problems
function dropSomeHtml(content) {
    const idx = content.indexOf("<p")
    return content.substring(idx, idx+32000)
}

// Removes HTML
function cleanContent(content) {
    return content.replace(/<.*?>/g, "").replace(/&.*?;/g, "")
}

// Loads the description of a topic from Wikipedia
// Logs available in CloudWatch  (click on "Logs: Amazon CloudWatch" in the bottom-left corner of the "Code" section)
async function loadWiki(topic) {
    console.log("loadWiki('" + topic + "')")
    
    try {
        var content = await httpGet("https://en.wikipedia.org/wiki/" + topic);
        
        if (content.startsWith("https")) {
          console.log("Follow redirect to: " + content)
          content = await httpGet(content.toString());
        }
        
        content = dropSomeHtml(content)
        console.log("Content: " + content)
        content = content.toString().match(/<p>([\w\W]*?)<\/p>/g) // Selects the paragraphs
        console.log("Paragraphs: " + content)
        content = content[0] // Selects the first paragraph
        console.log("Selected Content: " + content)
        content=cleanContent(content);
        console.log("Cleaned content: " + content)
          
        return content;
    }
    catch(e) {
        return "Err: " + e
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome, ask me about some food?';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// Main intent, asking Wikipedia
const SearchIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SearchIntent';
    },
    async handle(handlerInput) {
        const topic = handlerInput.requestEnvelope.request.intent.slots.Topic.value
        const speechText = 'Here is what I know about ' + topic + ": ";
        const content = await loadWiki(topic);
        
        return handlerInput.responseBuilder
            .speak(speechText + content)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can ask me to look for some food! How can I help?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = `Sorry, I couldn't understand what you said. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        SearchIntentHandler,  // Our intent
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .lambda();
