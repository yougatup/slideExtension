chrome.runtime.onMessage.addListener(function(message, sender) {
	chrome.tabs.sendMessage(sender.tab.id, message);
});

 chrome.commands.onCommand.addListener(function(command) {
    console.log('Command:', command);

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
	    var myTabId = tabs[0].id;
		console.log(myTabId);

	    chrome.tabs.sendMessage(myTabId, {text: "hi"});
	});

    });
