/*-----------------------------------------------------------------------------
 This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
 natural language support to a bot.
 For a complete walkthrough of creating this type of bot see the article at
 http://docs.botframework.com/builder/node/guides/understanding-natural-language/
 -----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var infos = require('./prompts/infos');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({recognizers: [recognizer]})
/*
 .matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
 */
    .matches('what-is-concussion', (session, args) => {
        session.send(infos.whatIsConcussion);
    }).matches('when-can-have-concussion', (session, args) => {
        session.send(infos.whenCanHaveConcussion);
    }).matches('what-evidence-on-concussion', (session, args) => {
        session.send(infos.whatEvidenceOnConcussionIntro);
        session.sendTyping();
        setTimeout(() => {
            session.send(infos.whatEvidenceOnConcussionFirstPart);
        }, 10000);
        session.sendTyping();
        setTimeout(() => {
            session.send(infos.whatEvidenceOnConcussionSecondPart);
        }, 10000);
        session.sendTyping();
        setTimeout(() => {
            session.send(infos.whatEvidenceOnConcussionEnd);
        }, 10000);
    })
    .matches('why-resting-after-concusssion', (session, args) => {
        session.send(infos.whyRestingAfterConcusssion);
    }).matches('why-declare-concusssion', (session, args) => {
        session.send(infos.whyDeclareConcusssion);
    }).matches('how-restart-activity', (session, args) => {
        session.send(infos.howRestartActivity);
    }).matches('do-pre-season-test', (session, args) => {
        session.beginDialog('pre-season-test');
    }).matches('help', (session, args) => {
        session.send('Appelez Mathieu');
    }).onDefault((session) => {
        session.send('Désole, Je ne comprends pas \'%s\'.', session.message.text);
    });

//=========================================================
// Activity Events
//=========================================================

bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
            .address(message.address)
            .text("Bonjour %s, je suis Cortex, votre assistant qui va suivre votre statut cognitif.", name || 'à vous');
        bot.send(reply);
        bot.beginDialog(message.address, '/create-subscription', {userId: message.user.id});
    }
});

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('pre-season-test', [(session, args) => {
    session.send(infos.testPreSeason);
    session.beginDialog('/orientation-questions');
}, (session, results) => {
    session.send(JSON.stringify(results.response));
}]);

var questions = [
    {field: 'month', prompt: "Quel mois sommes nous ?", type: "string"},
    {field: 'date', prompt: "Quelle est la date aujourd'hui ?", type: "string"},
    {field: 'dayOfWeek', prompt: "Quel est le jour de la semaine ?", type: "string"},
    {field: 'year', prompt: "En quelle année sommes-nous ?", type: "number"},
    {field: 'hour', prompt: "Quelle heure est-il ?", type: "string"}
];
bot.dialog('/orientation-questions', [
    function (session, args) {
        // Save previous state (create on first call)
        session.dialogData.index = args ? args.index : 0;
        session.dialogData.form = args ? args.form : {};

        var currentQuestion = questions[session.dialogData.index];
        switch (currentQuestion.type) {
            case "string":
                builder.Prompts.text(session, currentQuestion.prompt);
                break;
            case "number":
                builder.Prompts.number(session, currentQuestion.prompt);
                break;
        }
    },
    function (session, results) {
        // Save users reply
        var field = questions[session.dialogData.index++].field;
        session.dialogData.form[field] = results.response;

        // Check for end of form
        if (session.dialogData.index >= questions.length) {
            // Return completed form
            session.endDialogWithResult({response: session.dialogData.form});
        } else {
            // Next field
            session.replaceDialog('/orientation-questions', session.dialogData);
        }
    }
]);

bot.dialog('/create-subscription', [
    (session, args) => {
        builder.Prompts.choice(session, "Pour commencer, voulez-vous réaliser un test d'évaluation de pré-saison", [
            'Oui', 'Non'
        ]);
    },
    (session, args) => {
        if (args.response.entity === 'Oui') {
            session.beginDialog('pre-season-test');
        }
        else {
            session.send('Ok. En quoi puis-je vous aider ?');
        }
    }
]);

bot.dialog('/', intents);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = {default: connector.listen()}
}

