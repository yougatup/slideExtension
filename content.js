/////////////// ///////////////////

///////////////////////////////////////////

//////////////////////////////////////////

var docsHostWindow;
var currentURL = '';

var targetNode;
var mutationConfig;
var observer;

var clickedElements = [];

function issueEvent(object, eventName, data) {
 	var myEvent = new CustomEvent(eventName, {detail: data} );
 
	// window.postMessage(eventName, "*");

 	object.dispatchEvent(myEvent);
}

function checkURL() {
	if(currentURL != window.location.href) {
		currentURL = window.location.href;

		chrome.runtime.sendMessage({
				type:"URL_CHANGED",
				currentURL: window.location.href
		});
	}
}

function transit() {
	window.location.hash = "slide=id.g3a22d564a8_0_37";
}

function firefire() {
	chrome.runtime.sendMessage({sendBack:true, data:null});
}

function getClickedItem(mutationsList){
    var flag = false;
    var addedElements = [];
    var removedElements = [];

    function getUnique(myList) {
        var retValue = []
        
        for(var i=0;i<myList.length;i++) {
            if(retValue.indexOf(myList[i]) < 0) {
                retValue.push(myList[i]);
            }
        }
        // usage example:
        return retValue;
    }

    function iterateParent(element, objId) {
        var curNode = element;
        var flag = false;


        for(var k=0;k<10;k++) { // just to avoid infinite loop
            if(curNode.length == 0) break;
            if(curNode == null) break;

            var id = $(curNode).attr("id");

            if(id != '' && id != null){
                flag = true;
                break;
            }

            if(objId != null) 
                $(curNode).attr("gslide_objId", objId)

            curNode = $(curNode).parent();
        }

        if(flag) return curNode;
        else return null;
    }

    function getCheckedElement(myList, hasSibling, addRemoveFlag) {
        var retValue = [];

        for(var j=0;j<myList.length;j++) {
            if(addRemoveFlag == true) {
                var curNode = null;
                var tailNode = null;

                // A new node was created
                if(myList[j].tagName == 'g' && myList[j].childNodes.length == 1 && $(myList[j].childNodes[0]).attr("stroke") == '#5da2ff') {
                    curNode = $(myList[j].childNodes[0]);
                }
                else if(myList[j].tagName == 'path' && $(myList[j]).attr("stroke") == '#5da2ff') {
                    curNode = $(myList[j]);
                }

                tailNode = curNode;

                if(curNode != null) {
                    curNode = iterateParent(curNode, null);

                    if(curNode != null){
                        iterateParent(tailNode, $(curNode).attr("id"));

                        retValue.push($(curNode).attr("id"));
                    }
                }
            }
            else {
                if($(myList[j]).attr("gslide_objId") != null) {
                    var elementId = $(myList[j]).attr("gslide_objId");

                    retValue.push(elementId);
                }
            }
            // An element is newly created
        }

        return retValue;
    }

    for(var i=0;i<mutationsList.length;i++) {
        var singleMutation = mutationsList[i];

        if(singleMutation.addedNodes != null) {
            addedElements = addedElements.concat(getCheckedElement(singleMutation.addedNodes, singleMutation.previousSibling != null,true));
        }

        if(singleMutation.removedNodes != null) {
            removedElements = removedElements.concat(getCheckedElement(singleMutation.removedNodes, singleMutation.previousSibling != null, false));
        }
    }

    addedElements = getUnique(addedElements);
    removedElements = getUnique(removedElements);

    /// GET clickedelements - removedElements + addedElements

    var temporary = [];

    for(var i=0;i<clickedElements.length;i++) {
        var flag = false;

        for(var j=0;j<removedElements.length;j++) {
            if(clickedElements[i] == removedElements[j]) {
                flag = true;
                break;
            }
        }

        if(!flag)
            temporary.push(clickedElements[i]);
    }

    for(var i=0;i<addedElements.length;i++) {
        var flag = false;

        for(var j=0;j<temporary.length;j++) {
            if(temporary[j] == addedElements[i]) {
                flag = true;
                break;
            }
        }

        if(!flag)
            temporary.push(addedElements[i]);
    }

    clickedElements = temporary;
/*
    console.log("clicked");
    console.log($("#" + clickedElements[0]));
    console.log(clickedElements);
    */

    issueEvent(document, "removeAllHighlight", null);

    if(clickedElements.length != 0) {
        for(var i=0;i<clickedElements.length;i++) {
            highlightSlideObject(clickedElements[i]);
        }
    }
}

function getPageID() {
	var retValue = null;

    $(".punch-filmstrip-selected-thumbnail-pagenumber").each(function() {
		var thumbnaileObj = this;

		$("g[id^='filmstrip-slide-']").each(function() {
			var id = $(this).attr("id");

			if(id.endsWith("-bg")) {
				var commonAncestor = get_common_ancestor(thumbnaileObj, this);

				if($(commonAncestor).is("g")) {
					var splitted = $(this).attr("id").split("-");
					var pageId = splitted[3];

					retValue = pageId;

					return false;
				}
			}
		});
    });

	if(retValue == null) return window.location.hash.substr(10);
	else return retValue;
}

function updatePdfjsHighlight(mutationsList) {
    var pageId = getPageID();

    issueEvent(document, "ROOT_UPDATE_HIGHLIGHT_REQUEST", {
            "pageId": pageId,
            "objIdList": clickedElements
    });
}

function get_common_ancestor(a, b)
{
    $parentsa = $(a).parents();
    $parentsb = $(b).parents();

    var found = null;

    $parentsa.each(function() {
        var thisa = this;

        $parentsb.each(function() {
            if (thisa == this)
            {
                found = this;
                return false;
            }
        });

        if (found) return false;
    });

    return found;
}

function updateCurPageAndObjects() {
    var pageId = getPageID();


   	issueEvent(document, "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", {
   	    "pageId": pageId,
   	    "clickedElements": clickedElements
   	});
}

function printMessage2(mutationsList) {
    getClickedItem(mutationsList);
    updateCurPageAndObjects();
    updatePdfjsHighlight(mutationsList);
}


function highlightSlideObject(objId) {
    var boundingClientRect = document.getElementById(objId).getBoundingClientRect();

    issueEvent(document, "highlightSlideObject", {
        objId: objId,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
        left: boundingClientRect.left,
        top: boundingClientRect.top
            });
}

function printMessage(mutationsList) {
	// console.log(mutationsList);
	// console.log("### print happen ###");
	// console.log(mutationsList);
	// checkURL();
	// console.log($("[id|='filmstrip-slide']"));

	/*
    for(var mutation of mutationsList) {
        if (mutation.type == 'childList') {
			//if(mutation.target != null && mutation.target.id != null && mutation.target.id != '' && !removedElements.includes(mutation.target.id)) {
            	console.log('A child node has been added or removed.');
				console.log(mutation);

			//	removedElements.push(mutation.target.id);
			//}
        }
    }*/
	
}

function chromeSendMessage(type, data) {
	chrome.runtime.sendMessage({
			"type": type,
            "data": data
	});
}

$(document).ready(function() {
	if(this.location.hostname == "localhost" && this.location.pathname == '/') { 
		chrome.runtime.onMessage.addListener(function(details) {
            switch(details.type) {
                case "URL_CHANGED":
                    break;
                case "ADDTEXT_SENDTEXT":
                    issueEvent(document, "addText", details.data);
                    break;
                case "HIGHLIGHT_SLIDE_OBJECT":
                    issueEvent(document, "highlightSlideObject", details.data);
                    break;
                case "REMOVE_ALL_HIGHLIGHT":
                    issueEvent(document, "removeAllHighlight", details.data);
                    break;
                case "ROOT_UPDATE_HIGHLIGHT_REQUEST":
                    issueEvent(document, "ROOT_UPDATE_HIGHLIGHT_REQUEST", details.data);
                    break;
                case "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS":
                    issueEvent(document, "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", details.data);
                    break;
            }
		});

        $(document).on("PDFJS_HIGHLIGHT_TEXT", function(e) {
            chromeSendMessage("PDFJS_HIGHLIGHT_TEXT", e.detail);
        });

        $(document).on("PDFJS_REMOVE_HIGHLIGHT", function(e) {
            chromeSendMessage("PDFJS_REMOVE_HIGHLIGHT", e.detail);
        });
	}
    
    // pdf.js contents script
    else if(this.location.hostname == "localhost"){
		chrome.runtime.onMessage.addListener(function(details) {
            switch(details.type) {
                case "PDFJS_HIGHLIGHT_TEXT":
                    issueEvent(document, "PDFJS_HIGHLIGHT_TEXT", details);
                    break;
                case "PDFJS_REMOVE_HIGHLIGHT":
                    issueEvent(document, "PDFJS_REMOVE_HIGHLIGHT", details);
                    break;
            }
		});

        $(document).on("highlighted", function(e) {
            chromeSendMessage("ADDTEXT_GETOBJ", e.detail);
        });
    }

	if(this.location.hostname == "docs.google.com") {
		chrome.runtime.onMessage.addListener(function(details) {
            switch(details.type) {
                case "ADDTEXT_GETOBJ":
                if(clickedElements.length > 0) {
                    for(var i=0;i<clickedElements.length;i++) {
                        chromeSendMessage("ADDTEXT_SENDTEXT", {
                           "text": details.data.text,
                           "startIndex": details.data.startIndex,
                           "endIndex": details.data.endIndex,
                           "objId": clickedElements[i].substr(7),
                           "pageId": null
                                });
                    }
                }
                else {
                    chromeSendMessage("ADDTEXT_SENDTEXT", {
                       "text": details.data.text,
                       "startIndex": details.data.startIndex,
                       "endIndex": details.data.endIndex,
                       "objId": null,
                       "pageId": getPageID()
                    });
                }
                    
                break;
            }
		});

        $(document).on('keyup', function(e) {
              console.log('Caret at: ', e.target.selectionStart)
        });

        $(document).on('highlightSlideObject', function(e) {
            var p = e.detail;

            chromeSendMessage("HIGHLIGHT_SLIDE_OBJECT", p);
        });

        $(document).on('removeAllHighlight', function(e) {
            var p = e.detail;

            chromeSendMessage("REMOVE_ALL_HIGHLIGHT", p);
        });

        $(document).on("ROOT_UPDATE_HIGHLIGHT_REQUEST", function(e) {
            var p = e.detail;

            chromeSendMessage("ROOT_UPDATE_HIGHLIGHT_REQUEST", p);
        });

        $(document).on("ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", function(e) {
            var p = e.detail;

            chromeSendMessage("ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", p);
        });

		observer = new MutationObserver(printMessage);

		mutationConfig = { attributes: false, childList: true, subtree: true };
		observer.observe(document.getElementById("filmstrip"), mutationConfig);

        anotherObserver = new MutationObserver(printMessage2);

		mutationConfig2 = { attributes: false, childList: true, subtree: true };
        anotherObserver.observe(document.getElementById("slides-view"), mutationConfig2);

		// setInterval(checkURL, 500);
    }
 });

/*
$(window).on("inverse", function() {
		console.log($(".filmstrip"));

	$(".filmstrip").before($(".panel-right"));

	console.log("--inverse--");
	console.log(this);
});*/


