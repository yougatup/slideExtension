/////////////// ///////////////////

///////////////////////////////////////////

//////////////////////////////////////////

var docsHostWindow;
var currentURL = '';

var targetNode;
var mutationConfig;
var observer;

var clickedElements = [];
var curParagraphs = [];
var curPageID = '';

var paragraphIdentifiers = null;

var selectedBoxID = null;
var selectedParagraph = '';
var selectedParagraphObj = null;
var selectedParagraphNumber = null;
var selectedParagraphIdentifier = null;
var selectedPage = null;

var clickEvent;
var autoCompleteAppeared = false;
var autoCompleteConfirmed = false;

var paragraphIdSnapshot = null;
var systemTurnBox = null;
var systemTurn = false;

var systemMouseDown = false;
var systemMouseCoorInfo = {
    screenX: null,
    screenY: null,
    clientX: null,
    clientY: null
};

var addedParagraphDetected = false;
var removedParagraphDetected = false;

var textAddedParagraphIdentifier;
var systemTurnTextAdded = false;

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

function getUnique(myList) {
    var retValue = [];
    
    for(var i=0;i<myList.length;i++) {
        if(retValue.indexOf(myList[i]) < 0) {
            retValue.push(myList[i]);
        }
    }
    // usage example:
    return retValue;
}

function getClickedItem(mutationsList){
    var flag = false;
    var addedElements = [];
    var removedElements = [];

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
    // console.log(clickedElements);
/*
    console.log("clicked");
    console.log($("#" + clickedElements[0]));
    console.log(clickedElements);
    */

    issueEvent(document, "clearPlaneCanvas", null);

/*
    if(clickedElements.length != 0) {
        for(var i=0;i<clickedElements.length;i++) {
            highlightSlideObject(clickedElements[i]);
        }
    }
*/

    if(systemMouseDown) {
        console.log("system mouse up");
        document.elementFromPoint(systemMouseCoorInfo.clientX, systemMouseCoorInfo.clientY).dispatchEvent(new MouseEvent('mouseup', {bubbles: true, screenX: systemMouseCoorInfo.systemX, screenY: systemMouseCoorInfo.systemY, clientX: systemMouseCoorInfo.clientX, clientY: systemMouseCoorInfo.clientY}));


        paragraphIdentifiers = paragraphIdSnapshot;

        // paragraphIdentifiers = $.extend(true, {}, paragraphIdSnapshot); // hard copy

        curParagraphs = getParagraphStructure();
        console.log(systemTurnBox);

        var myParagraph = getParagraphs(curParagraphs, systemTurnBox);

        if(myParagraph.length == paragraphIdentifiers[systemTurnBox].length + 1) {
            var objID = createObjId();

            paragraphIdentifiers[systemTurnBox].push(objID);
            storeMapping(systemTurnBox, myParagraph.length-1, objID);

            console.log("******** OBJECT ADDED : " + objID);
        }
        else if(myParagraph.length != paragraphIdentifiers[systemTurnBox].length) {
            console.log("########## HEY TAKE A LOOK ########### " + myParagraph.length + " " + paragraphIdentifiers[systemTurnBox].length);
            console.log($.extend(true, {}, paragraphIdSnapshot));
            console.log(myParagraph);
        }

        // paragraphIdentifiers is a snapshot before system's turn.
        // Current status of bullets could be different. --> Only bullets are added after this transaction.

        clickedElements = temporary;
       
        console.log("********** ATOMIC ENDS **********");
        console.log(paragraphIdentifiers);

        systemMouseDown = false;
        systemTurn = false;

        keyPress(8, function() {
           keyPress(65, function() {
                   keyPress(66, function() {
                           keyDown(8, function() {
                                   keyDown(8, function() {
                                           keyPress(8, null);
                                           });
                                   });
                           });
                   });
                });
//                        keyDown(8, function() { // back space
    }
}

function removeHighlight(mappingIdentifiers, lastElemIndex) {
    issueEvent(document, "removeHighlight", {
            pageID: getPageID(),
            mappingIdentifiers: mappingIdentifiers,
            boxID: selectedBoxID,
            lastElemIndex: lastElemIndex
    });
}

function keyUp(keyCode, myCallback) {
    // for putting characters

    var ee = new KeyboardEvent("keyup", {
        bubbles : true,
        cancelable : false,
        shiftKey : false,
        keyCode : keyCode
    });

    console.log(keyCode);

    var editingIFrame = $('iframe.docs-texteventtarget-iframe')[0];

    console.log(editingIFrame);
    console.log(editingIFrame.contentDocument);
    editingIFrame.contentDocument.dispatchEvent(ee);
    
    if(myCallback != null)
        myCallback();
}
function keyPress(keyCode, myCallback) {
    // for putting characters

    var ee = new KeyboardEvent("keypress", {
        bubbles : true,
        cancelable : false,
        shiftKey : false,
        keyCode : keyCode
    });

    console.log(keyCode);

    var editingIFrame = $('iframe.docs-texteventtarget-iframe')[0];

    console.log(editingIFrame);
    console.log(editingIFrame.contentDocument);
    editingIFrame.contentDocument.dispatchEvent(ee);
    
    if(myCallback != null)
        myCallback();
}

function keyDown(keyCode, myCallback) {
    // ESC: 27
    // Back space: 8
    // Space: 32

    var ee = new KeyboardEvent("keydown", {
        bubbles : true,
        cancelable : false,
        shiftKey : false,
        keyCode : keyCode
    });

    console.log(keyCode);
    console.log(ee);

    var editingIFrame = $('iframe.docs-texteventtarget-iframe')[0];

    console.log(editingIFrame);
    console.log(editingIFrame.contentDocument);
    editingIFrame.contentDocument.dispatchEvent(ee);
    
    if(myCallback != null)
        myCallback();
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
            "objIdList": clickedElements,
            "paragraphIdentifier": selectedParagraphIdentifier
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
   	    "clickedElements": clickedElements,
        "paragraphNumber": selectedParagraphNumber,
        "paragraphIdentifier": selectedParagraphIdentifier
   	});
}

function getIdTree(root) {
    var childrenCnt = $(root)[0].children.length;
    var tree = {};
    var childs = [];

    for(var i=0;i<childrenCnt;i++) {
        var children = $(root)[0].children[i];

        if($(children).attr("id") != null) {
            childs.push({'box': $(children),
                         'paragraphs': [],
                    });
        }
    }

    for(var j=0;j<childs.length;j++) {
        var rootID = $(childs[j]["box"]).attr("id");

        for(var k=0;k<100;k++) {
            var elem = $("#" + rootID + "-paragraph-" + k);

            if($(elem).length <= 0) break;

            childs[j]["paragraphs"].push(elem);
        }
    }

//    console.log(childs);

    return childs;
}

function getParagraphStructure() {
    var idTree;
    var curPage = getPageID();

    return getIdTree($("#editor-" + curPage));
}

function clickParagraph(boxObjID, paragraphNumber) {
    console.log(curParagraphs);

    for(var i=0;i<curParagraphs.length;i++) {
        var objId = $(curParagraphs[i].box).attr("id").split("-")[1];

        if(objId == boxObjID) {
            console.log(curParagraphs[i]);
            console.log(paragraphNumber);

            var paragraphObj = curParagraphs[i].paragraphs[paragraphNumber];
            var boundary = $(paragraphObj)[0].getBoundingClientRect();

            console.log($(paragraphObj)[0].getBoundingClientRect());

            console.log(window.screenX + " " + window.screenY);

            var screenX = parseFloat(window.screenX + boundary.left + boundary.width - 10);
            var screenY = parseFloat(window.screenY + boundary.top + boundary.height - 10);

            systemMouseCoorInfo.screenX = screenX;
            systemMouseCoorInfo.screenY = screenY;
            systemMouseCoorInfo.clientX = boundary.left + boundary.width;
            systemMouseCoorInfo.clientY = boundary.top + boundary.height;

            console.log(systemMouseCoorInfo);

            clickSystemMouse();

            break;
        }
    }

    // console.log(curParagraphs);
    // console.log(boxObjID);
    // console.log($("#editor-" + boxObjID));
    // console.log(paragraphNumber);
}

function getParagraphs(pageObj, boxID) {
    // console.log(pageObj);
    // console.log(boxID);

    for(var i=0;i<pageObj.length;i++) {
        var bID = $(pageObj[i].box).attr("id").split('-')[1];

        if(bID == boxID) {
            return $(pageObj[i].paragraphs);
        }
    }

    return null;
}

function createObjId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function storeMapping(objId, paragraphNumber, paragraphId) {
    // console.log("STORE MAPPING");

    // console.log(objId + ' ' + paragraphNumber + ' ' + paragraphId);

    issueEvent(document, "sendParagraphMappingData", {
        objId: objId,
        paragraphNumber: paragraphNumber,
        paragraphId: paragraphId
    });
}

function process(mutationsList) {
    var newParagraphs = getParagraphStructure();

    getClickedItem(mutationsList);

    if(!systemTurn) {
        if(clickedElements.length == 1) {
            // console.log(curParagraphs);
            // console.log(newParagraphs);

            var clickedElemID = clickedElements[0].split('-')[1];

            // console.log("old");
            // console.log(paragraphIdentifiers[clickedElemID]);

            originalParagraph = getParagraphs(curParagraphs, clickedElemID);
            newParagraph = getParagraphs(newParagraphs, clickedElemID);

            var myFlag = false;

            for(var i=0;i<newParagraph.length;i++) {
                var cnt = 0;

                for(var j=0;j<newParagraph.length;j++) {
                    if(newParagraph[j][0].id == newParagraph[i][0].id)
                        cnt++;
                }

                if(cnt >= 2) {
                    myFlag = true;
                    break;
                }
            }

            if(!myFlag) {
                var newParagraphIdentifiers = [];

                console.log(originalParagraph);
                console.log(newParagraph);

                for(var k=0;k<newParagraph.length;k++) console.log(newParagraph[k][0].id);
                console.log('\n');

                for(var k=0;k<originalParagraph.length;k++) console.log(originalParagraph[k][0].id);
                console.log('\n');

                for(var i=0;i<newParagraph.length;i++) {
                    // if(!(i < originalParagraph.length && newParagraph[i][0].id == originalParagraph[i][0].id)) { }
                    if(!(i < originalParagraph.length && $(newParagraph[i]).is($(originalParagraph[i])) )) {
                        var flag = false;

                        if(originalParagraph != null) {
                            for(var j=originalParagraph.length-1;j>=0;j--){

                                if($(newParagraph[i]).is($(originalParagraph[j]))){
                                    // if(newParagraph[i][0].id == originalParagraph[j][0].id) { }
                                    flag = true;

                                    console.log("here 1" + " " + i + " " + j);
                                    storeMapping(clickedElemID, i, paragraphIdentifiers[clickedElemID][j]);
                                    newParagraphIdentifiers.push(paragraphIdentifiers[clickedElemID][j]);

                                    break;
                                }
                            }
                        }

                        if(!flag) { // i-th element was added 
                            var paragraphId = createObjId();

                            if(systemTurnTextAdded) {
                                newParagraphIdentifiers.push(textAddedParagraphIdentifier);
                                systemTurnTextAdded = false;
                            }
                            else {
                                if(systemTurn == false) {
                                    console.log("here 2" + " " + i + " " + j);

                                    storeMapping(clickedElemID, i, paragraphId);
                                    newParagraphIdentifiers.push(paragraphId);
                                }
                                else {
                                    console.log("really?" + " " + i + " " + j);
                                    // newParagraphIdentifiers.push(paragraphIdSnapshot[clickedElemID][j]);
                                    newParagraphIdentifiers.push(createObjId());
                                }
                            }
                        }

                    }
                    else{
                        if(paragraphIdentifiers[clickedElemID] == null){ // the first registration
                            var paragraphId = createObjId();

                            console.log("here 3" + " " + i + " " + j);
                            storeMapping(clickedElemID, i, paragraphId);

                            newParagraphIdentifiers.push(paragraphId);
                        }
                        else{
                            console.log("here 4" + " " + i + " " + j);

                            newParagraphIdentifiers.push(paragraphIdentifiers[clickedElemID][i]);
                        }
                    }
                }

                /*for(var i=0;i<originalParagarphMatched.length;i++) {
                  conso
                  }*/

                // console.log(originalParagraph);
                // console.log(newParagraph);

                if(!systemTurn) {
                    var addedMapping, removedMapping;

                    console.log("OLD and NEW");
                    console.log(paragraphIdentifiers[clickedElemID]);
                    console.log(newParagraphIdentifiers);

                    addedMapping = getDifference(newParagraphIdentifiers, paragraphIdentifiers[clickedElemID]);
                    removedMapping = getDifference(paragraphIdentifiers[clickedElemID], newParagraphIdentifiers);

                    console.log("ADDED MAPPING");
                    console.log(addedMapping);

                    console.log("REMOVED MAPPING");
                    console.log(removedMapping);

                    removeHighlight(removedMapping, newParagraphIdentifiers.length);
                }

                paragraphIdentifiers[clickedElemID] = newParagraphIdentifiers;

                console.log("new");
                console.log(paragraphIdentifiers[clickedElemID]);

                // console.log(paragraphIdentifiers);
                curParagraphs = newParagraphs;
            }
        }
        else {
            curParagraphs = newParagraphs;
        }
    }

    updateCurPageAndObjects();
    updatePdfjsHighlight(mutationsList);

    if(systemTurn && !systemMouseDown) {
        clickParagraph(selectedBoxID, selectedParagraphNumber);
    }

    // console.log("printMessage2 end!");
}

function getDifference(a, b) {
    var retValue = [];

    if(a == null) return [];

    for(var i=0;i<a.length;i++) {
        var flag = false;

        if(b != null) {
            for(var j=0;j<b.length;j++) {
                if(a[i] == b[j]) {
                    flag = true;
                    break;
                }
            }
        }

        if(!flag) retValue.push(a[i]);
    }

    return retValue;
}

function printMessage2(mutationsList) {
    // console.log("printMessage2 called!");
    // console.log(mutationsList);

    // console.log(paragraphIdentifiers);

    if(paragraphIdentifiers == null) {
        issueEvent(document, "getParagraphMapping", null);
    }
    else process(mutationsList);
}

function clickSystemMouse() {
    systemMouseDown = true;

    console.log("system mouse down");

    document.elementFromPoint(systemMouseCoorInfo.clientX, systemMouseCoorInfo.clientY).dispatchEvent(new MouseEvent('mousedown', {bubbles: true, screenX: systemMouseCoorInfo.systemX, screenY: systemMouseCoorInfo.systemY, clientX: systemMouseCoorInfo.clientX, clientY: systemMouseCoorInfo.clientY}));
}

function isIncluded(_a, b) {
    var a = {
        left: _a.left,
        top: _a.top,
        width: _a.width,
        height: _a.height
    };

    var widthMargin = b.width;
    var heightMargin  = b.height / 2;

    a.left -= widthMargin;
    a.top -= heightMargin;
    a.width += 2 * widthMargin;
    a.height += 2 * heightMargin;

    if(a.top <= b.top &&
       b.top + b.height <= a.top + a.height) return true;
    else return false;
}

function getParagraphText(p) {
    var textBoxes = $(p).find(".sketchy-text-content-text");
    var retText = '';

    for(var i=0;i<textBoxes.length;i++) {
        var box = textBoxes[i];
        var innerText = box.innerHTML;

        var state = 0;
        // 0: content, 1: inner <text> 

        while(innerText != '') {
            var position = -1;

            for(var j=0;j<innerText.length;j++) {
                if(innerText[j] == '>') {
                    position = j;
                    break;
                }
            }

            innerText = innerText.substr(position+1);

            var closingPosition = innerText.indexOf("</text>");
            var content = innerText.substr(0, closingPosition);

            retText = retText + ' ' + content;

            innerText = innerText.substr(closingPosition + 7);
        }
    }

    return retText;
}

function findCursorPosition(cursorCoor, paragraphObj) {
    var textTags = $(paragraphObj).find("text");
    // console.log(textTags);

    var pos = -1;

    // console.log("############## cursor ##############");
    // console.log(cursorCoor.left);

    // console.log("###### FIND ###### ");
    var accumulatedString = '';

    for(var i=0;i<textTags.length;i++) {
        var textElem = textTags[i];
        var boundary = $(textElem)[0].getBoundingClientRect();

        if(((boundary.top + boundary.bottom) / 2) < cursorCoor.top|| 
           ((boundary.top + boundary.bottom) / 2) >= cursorCoor.top && boundary.right+1 <= cursorCoor.left) {
            accumulatedString = accumulatedString + (i == 0 ? '' : ' ') + $(textElem).html();
            // console.log("whole junk push : " + accumulatedString);
        }
        else {
            // console.log("go one by one");
            accumulatedString = accumulatedString + ' ';

            var textElemString = $(textElem).html();
            var lastRight = -1;

            for(var j=0;j<textElemString.length;j++) {
                $(textElem).html(textElemString.substr(0, j+1));
                boundary = $(textElem)[0].getBoundingClientRect();

                // console.log(boundary);
                // console.log((boundary.left + boundary.right) / 2);

                var midPoint = -1;

                if(j == 0){
                    // console.log(boundary.left + " " + boundary.right);
                    midPoint = (boundary.left + boundary.right) / 2;
                }
                else{
                    // console.log(lastRight + " " + boundary.right);
                    midPoint = (lastRight + boundary.right) / 2;
                }

                if(cursorCoor.left< midPoint) {
                    break;
                }

                accumulatedString = accumulatedString + textElemString[j];
                lastRight = boundary.right;

                // console.log(accumulatedString);
            }

            $(textElem).html(textElemString);

            break;
        }
    }

    return accumulatedString;
}

function printMessage3(mutationsList) {
    var cursorDOM = $("[shape-rendering='crispEdges'][style*='opacity: 1;']");

    // console.log("printMessage3 called!");
    // console.log("hmm?");

    if($(cursorDOM).length > 0) {
        if(autoCompleteConfirmed) {
            autoCompleteConfirmed = false;
            systemTurn = false;

            issueEvent(document, "removeAutoComplete", null);
        }

        var cursorBoundary = $(cursorDOM)[0].getBoundingClientRect();

        var cursorLeft = cursorBoundary.left;
        var cursorTop = cursorBoundary.top;
        var cursorHeight = cursorBoundary.height;
        var cursorWidth = cursorBoundary.width;

        var cursorCoor  = {
            left: cursorLeft,
            top: cursorTop,
            height: cursorHeight,
            width: cursorWidth
        };

        var flag = false;

        for(var i=0;i<curParagraphs.length;i++) {
            var box = curParagraphs[i];

            if(clickedElements.indexOf($(box.box).attr("id")) >= 0) {
                for(var j=0;j<box.paragraphs.length;j++) {
                    var paragraph = box.paragraphs[j];
                    var pid = $(paragraph).attr("id");

                    if(isIncluded(document.getElementById(pid).getBoundingClientRect(), cursorCoor)) {
                        visualizeParagraph(pid);
                        flag = true;

                        selectedBoxID = $(box.box).attr("id").split("-")[1]; 

						selectedParagraph = $("#" + pid);
                        selectedParagraphObj = paragraph;
                        selectedPage = getPageID();
                        selectedParagraphNumber = j;
                        selectedParagraphIdentifier = paragraphIdentifiers[selectedBoxID][j];

                        // console.log(selectedParagraphIdentifier);
                        // console.log(document.getElementById(pid).getBoundingClientRect());

                        // var resultString = findCursorPosition(cursorCoor, selectedParagraph);
                        // console.log(resultString);

						break;
                    }
                }
            }
        }

        if(!flag) {
            clearVisualizeParagraph();

            issueEvent(document, "removeAutoComplete", null);
        }
		else {
            // console.log(clickedElements);

            updateCurPageAndObjects();
            updatePdfjsHighlight(mutationsList);

			var paragraphText = getParagraphText(selectedParagraph);

            // console.log(curParagraphs);
            var bg = curParagraphs[0].box;
            var boundingClientRect = document.getElementById($(bg).attr("id")).getBoundingClientRect();
            // highlightSearchResults(paragraphText);


    	    issueEvent(document, "checkAutoComplete", {
    	        top: boundingClientRect.top + boundingClientRect.height + 20,
                left: boundingClientRect.left,
                width: boundingClientRect.width,
                words: paragraphText,
                pageID: getPageID(),
                objID: clickedElements[0].split('-')[1],
                paragraphNumber: selectedParagraphNumber,
                paragraphIdentifier: selectedParagraphIdentifier
    	    });
		}

//        $("#slidePlaneCanvasPopup").css("left", cursorLeft);
//        $("#slidePlaneCanvasPopup").css("top", cursorTop + cursorHeight);
    }
    else {
        // console.log("here!");

        cursorDOM = $(".sketchy-text-selection-overlay");

        // console.log(cursorDOM);

        if($(cursorDOM).length > 0) { // region
            // console.log($(cursorDOM));
        }
        else { // nothing
            clearVisualizeParagraph();

            if(!autoCompleteConfirmed)
                issueEvent(document, "removeAutoComplete", null);
        }
    }

    // console.log("printMessage3 end!");
}
/*
function highlightSearchResults(p) {
    issueEvent(document, "highlightSearchResults", {
        words: p
    });
}*/

function clearVisualizeParagraph() {
    selectedParagraph = '';
    selectedParagraphObj = null;
    selectedPage = null;
    // selectedParagraphNumber = null;

    issueEvent(document, "clearVisualizeParagraph", null);
}

function visualizeParagraph(pid) {
    var boundingClientRect = document.getElementById(pid).getBoundingClientRect();

    issueEvent(document, "visualizeParagraph", {
        height: boundingClientRect.height,
        width: boundingClientRect.width,
        left: boundingClientRect.left,
        top: boundingClientRect.top
    });
}

function getSlideObjectForHighlight(p) {
	var slideObjId = p.data.slideObjId;

	highlightSlideObject(slideObjId);
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

function findUpdatedSlides(mutationsList) {
    var slideId = [];

    function findSlideId(target) {
        var paragraphObj = iterateParent(target, null);
        var splitted = paragraphObj.attr("id").split('-');
        var retValue = [];

        if(splitted.length >= 6 && splitted[4] == "paragraph") {
            var slideObj = iterateParent($(paragraphObj).parent(), null);
            var slide = iterateParent($(slideObj).parent(), null);

            retValue.push(slide.attr("id").split('-')[3]);
        }

        return retValue;
    }

    for(var i=0;i<mutationsList.length;i++) {
        var target;

        for(var j=0;j<mutationsList[i].addedNodes.length;j++) {
            target = $(mutationsList[i].addedNodes[j]);
            slideId = slideId.concat(findSlideId(target));
        }

        for(var j=0;j<mutationsList[i].removedNodes.length;j++) {
            if(mutationsList[i].removedNodes[j].classList.contains("sketchy-text-content-text")) {
                target = $(mutationsList[i].target);
                slideId = slideId.concat(findSlideId(target));

                break;
            }
        }
    }

    slideId = getUnique(slideId);
//    console.log(slideId);

    return slideId;
}

function printMessage(mutationsList) {
	// console.log(mutationsList);
    var updatedSlides = findUpdatedSlides(mutationsList);

    for(var i=0;i<updatedSlides.length;i++) {
        issueEvent(document, "updateSlideInfo", {
                "pageId": updatedSlides[i]
                });
//	    highlightSlideObject(updatedSlides[i]);
    }

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

function getNumberOfParagraphs(objId) {
    for(var i=0;i<curParagraphs.length;i++) {
        var oID = curParagraphs[i].box.attr("id").split('-')[1];

        if(oID == objId){
            var len = curParagraphs[i].paragraphs.length;

            console.log(curParagraphs[i].paragraphs);

            if(len > 1) return len;

            var textLen = $(curParagraphs[i].paragraphs[0]).find("text").length;

            console.log($(curParagraphs[i].paragraphs[0]).find("text"));
            console.log($(curParagraphs[i].paragraphs[0]).find("text").length);

            if(textLen > 0) return 1;
            else return 0;
        }
    }

    return -1;
}

$(document).ready(function() {
	if(this.location.hostname == "localhost" && this.location.pathname == '/') { 
		chrome.runtime.onMessage.addListener(function(details) {
            switch(details.type) {
                case "URL_CHANGED":
                    console.log("URL_CHANGED");
                    break;
                case "ADDTEXT_SENDTEXT":
                    console.log(details.data);
                    issueEvent(document, "addText", details.data);
                    break;
                case "HIGHLIGHT_SLIDE_OBJECT":
                    issueEvent(document, "highlightSlideObject", details.data);
                    break;
                case "CLEAR_PLANE_CANVAS":
                    issueEvent(document, "clearPlaneCanvas", details.data);
                    break;
                case "ROOT_UPDATE_HIGHLIGHT_REQUEST":
                    issueEvent(document, "ROOT_UPDATE_HIGHLIGHT_REQUEST", details.data);
                    break;
                case "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS":
                    issueEvent(document, "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", details.data);
                    break;
                case "SEND_IMAGE":
                    issueEvent(document, "SEND_IMAGE", details.data);
                    break;
                case "UPDATE_SLIDE_INFO":
                    issueEvent(document, "UPDATE_SLIDE_INFO", details.data);
                    break;
                case "requestShowingAutoComplete":
                    issueEvent(document, "locateAutoComplete", details.data);
                    break;
                case "appearAutoComplete":
                    issueEvent(document, "appearAutoComplete", details.data);
                    break;
                case "removeAutoComplete":
                    issueEvent(document, "removeAutoComplete", details.data);
                    break;
                case "clearVisualizeParagraph":
                    issueEvent(document, "clearVisualizeParagraph", details.data);
                    break;
                case "visualizeParagraph":
                    issueEvent(document, "visualizeParagraph", details.data);
                    break;
                case "sendAutoCompleteInstance":
                    issueEvent(document, "sendAutoCompleteInstance", details.data);
                    break;
                case "prepareAutoCompleteNumbers":
                    issueEvent(document, "prepareAutoCompleteNumbers", details.data);
                    break;
                case "showAutoCompleteNumbers":
                    issueEvent(document, "showAutoCompleteNumbers", details.data);
                    break;
                case "autoCompleteRegister":
                    issueEvent(document, "autoCompleteRegister", details.data);
                    break;
                case "checkAutoComplete":
                    issueEvent(document, "checkAutoComplete", details.data);
                    break;
                case "getParagraphMapping":
                    issueEvent(document, "getParagraphMapping", details.data);
                    break;
                case "removeHighlight":
                    issueEvent(document, "removeHighlight", details.data);
                    break;
                case "sendParagraphMappingData":
                //     console.log("SEND PARAGRAPH MAPPING DATA ------------ ");
                    issueEvent(document, "sendParagraphMappingData", details.data);
                    break;
                    /*
                case "dataLoadedACK":
                    issueEvent(document, "dataLoadedACK", details.data);
                    break;*/
            }
		});

        $(document).on("TEXT_ADD_COMPLETE", function(e) {
            chromeSendMessage("TEXT_ADD_COMPLETE", e.detail);
                });

        $(document).on("paragraphMappingData", function(e) {
            chromeSendMessage("paragraphMappingData", e.detail);
        });

        $(document).on("PDFJS_HIGHLIGHT_TEXT", function(e) {
            chromeSendMessage("PDFJS_HIGHLIGHT_TEXT", e.detail);
        });

        $(document).on("PDFJS_REMOVE_HIGHLIGHT", function(e) {
            chromeSendMessage("PDFJS_REMOVE_HIGHLIGHT", e.detail);
        });

        $(document).on("autoCompleteSubmitted", function(e) {
            chromeSendMessage("autoCompleteSubmitted", e.detail);
        });

        $(document).on("autoCompleteCancelled", function(e) {
            chromeSendMessage("autoCompleteCancelled", e.detail);
        });

        $(document).on("requestShowingAutoComplete", function(e) {
            chromeSendMessage("requestShowingAutoComplete", e.detail);
        });

        $(document).on("__dataLoaded", function(e) {
                console.log("YE, I'm Serious");
            var p = e.detail;

            console.log("SEND DATA LOADED");

            chromeSendMessage("__dataLoaded", p);
        });

		$(document).on("prepareAutoCompleteNumbersDone", function(e) {
            var p = e.detail;

            chromeSendMessage("prepareAutoCompleteNumbersDone", p);
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
                case "requestShowingAutoComplete":
                    issueEvent(document, "highlightSearchResults", details);
                    break;
                case "removeAutoComplete":
                    issueEvent(document, "removeAutoComplete", details);
                    break;
                case "prepareAutoCompleteNumbers":
                    issueEvent(document, "prepareAutoCompleteNummbers", details.data);
                    break;
                case "showAutoCompleteNumbers":
                    issueEvent(document, "showAutoCompleteNumbers", details.data);
                    break;
                case "autoCompleteSubmitted":
                    issueEvent(document, "autoCompleteSubmitted", details.data);
                    break;
                case "autoCompleteCancelled":
                    issueEvent(document, "autoCompleteCancelled", details.data);
                    break;
            }
		});

        $(document).on("highlighted", function(e) {
            chromeSendMessage("ADDTEXT_GETOBJ", e.detail);
        });

		$(document).on("highlightSlideObject", function(e) {
            var p = e.detail;

            chromeSendMessage("HIGHLIGHT_SLIDE_OBJECT", p);
		});

        $(document).on('clearPlaneCanvas', function(e) {
            var p = e.detail;

            chromeSendMessage("CLEAR_PLANE_CANVAS", p);
        });

        $(document).on("sendImage", function(e) {
            var p = e.detail;

            chromeSendMessage("SEND_IMAGE", p);
        });

        $(document).on("prepareSnapshotForAutoComplete", function(e) {
            var p = e.detail;

            chromeSendMessage("prepareSnapshotForAutoComplete", p);
        });

        $(document).on("appearAutoComplete", function(e) {
            var p = e.detail;

            chromeSendMessage("appearAutoComplete", p);
        });

        $(document).on("sendAutoCompleteInstance", function(e) {
            var p = e.detail;

            chromeSendMessage("sendAutoCompleteInstance", p);
        });

        $(document).on("autoCompleteAppeared", function(e) {
            var p = e.detail;

            chromeSendMessage("autoCompleteAppeared", p);
        });

        $(document).on("autoCompleteDisappeared", function(e) {
            var p = e.detail;

            chromeSendMessage("autoCompleteDisappeared", p);
        });
 
 
        $(document).on("getSlideObjectForHighlight", function(e) {
            chromeSendMessage("GET_SLIDE_OBJECT_FOR_HIGHLIGHT", e.detail);
        });
    }

	if(this.location.hostname == "docs.google.com") {
		chrome.runtime.onMessage.addListener(function(details) {
            switch(details.type) {
                case "ADDTEXT_GETOBJ":

                if(clickedElements.length > 0) {
                    for(var i=0;i<clickedElements.length;i++) {

                        var objId = clickedElements[i].substr(7);
                        var paragraph = getParagraphs(curParagraphs, objId);
                        var paragraphId;

                        console.log(details.data);
                        console.log(objId);
                        console.log(paragraph[0]);
                        console.log(paragraphId);
                        console.log(selectedParagraphIdentifier);
                        console.log(paragraphIdentifiers[objId]);
                        console.log($(paragraph[0]).find("text"));

                        if(paragraph.length == 1 && $(paragraph[0]).find("text").length == 0) { // empty
                            console.log("here, empty");
                            paragraphId = paragraphIdentifiers[objId][0];

                            storeMapping(objId, 0, paragraphId);
                        }
                        else {
                            console.log("here, not empty");
                            paragraphId = createObjId();
                            storeMapping(objId, paragraph.length, paragraphId);
                        }

                        console.log(paragraphId);

                        chromeSendMessage("ADDTEXT_SENDTEXT", {
                           "text": details.data.text,
                           "pageNumber": details.data.pageNumber,
                           "paragraphIdentifier": paragraphId,
                           "startIndex": details.data.startIndex,
                           "endIndex": details.data.endIndex,
                           "objId": objId,
                           "color": details.data.color,
                           "pageId": null
                                });

                        systemTurnTextAdded = true;
                        textAddedParagraphIdentifier = paragraphId;
                    }
                }
                else {
                    var paragraphId = createObjId();
                    storeMapping(objId, 0, paragraphId);

                    chromeSendMessage("ADDTEXT_SENDTEXT", {
                       "text": details.data.text,
                       "pageNumber": details.data.pageNumber,
                       "startIndex": details.data.startIndex,
                       "endIndex": details.data.endIndex,
                       "paragraphIdentifier": paragraphId,
                       "objId": null,
                       "color": details.data.color,
                       "pageId": getPageID()
                    });

                    systemTurnTextAdded = true;
                    textAddedParagraphIdentifier = paragraphId;
                }
                    
                break;

				case "GET_SLIDE_OBJECT_FOR_HIGHLIGHT":
					issueEvent(document, "getSlideObjectForHighlight", details);
					break;
				case "TEXT_ADD_COMPLETE":
					issueEvent(document, "TEXT_ADD_COMPLETE", details);
					break;
                case "autoCompleteAppeared":
					issueEvent(document, "autoCompleteAppeared", details);
					break;
                case "autoCompleteDisappeared":
					issueEvent(document, "autoCompleteDisappeared", details);
					break;
                case "prepareAutoCompleteNumbersDone":
					issueEvent(document, "prepareAutoCompleteNumbersDone", details);
					break;
                case "autoCompleteSubmitted":
                    issueEvent(document, "autoCompleteSubmitted", details.data);
                    break;
                case "paragraphMappingData":
                    issueEvent(document, "paragraphMappingData", details.data);
                    break;
                case "prepareSnapshotForAutoComplete":
                    issueEvent(document, "prepareSnapshotForAutoComplete", details.data);
                    break;
                case "__dataLoaded":
                    console.log("RECEIVED DATA LOADED");
                    issueEvent(document, "__dataLoaded", details.data);
                    break;
            }
		});

        /*
        $(document).on("TEXT_ADD_COMPLETE", function(e) {
                systemTurnTextAdded = false;
        });*/

        $(document).on("paragraphMappingData", function(e) {
            var p = e.detail;

                // console.log("PROCESS!");

                paragraphIdentifiers = p.paragraphMapping;
                console.log(paragraphIdentifiers);
                
                // process(p.mutationsList);
                });

        $(document).on("prepareSnapshotForAutoComplete", function(e) {
            var p = e.detail;

            systemTurn = true;
            systemTurnBox = selectedBoxID;

            console.log("********** SNAPSHOT **********");
            console.log(paragraphIdentifiers);

            paragraphIdSnapshot = $.extend(true, {}, paragraphIdentifiers); // hard copy

            issueEvent(document, "autoCompleteRegister", p);
        });

        $(document).on("removeHighlight", function(e) {
            var p = e.detail;

            chromeSendMessage("removeHighlight", p);
        });

        $(document).on("autoCompleteRegister", function(e) {
            var p = e.detail;

            chromeSendMessage("autoCompleteRegister", p);
        });

        $(document).on("getParagraphMapping", function(e) {
            var p = e.detail;

            chromeSendMessage("getParagraphMapping", p);
        });

        $(document).on("sendParagraphMappingData", function(e) {
            var p = e.detail;

            chromeSendMessage("sendParagraphMappingData", p);
        });

        $(document).on("__dataLoaded", function(e) {
            var p = e.detail;

            paragraphIdentifier = p.paragraphTable;

            console.log(paragraphIdentifier);

            // issueEvent(document, "dataLoadedACK", null);
        });

        /*
        $(document).on("dataLoadedACK", function(e) {
            var p = e.detail;

            chromeSendMessage("dataLoadedACK", p);
        });*/

        $(document).on("checkAutoComplete", function(e) {
            var p = e.detail;

            chromeSendMessage("checkAutoComplete", p);
        });

        $(document).on("autoCompleteSubmitted", function(e) {
            console.log(paragraphIdentifiers);
        });

        $(document).on("prepareAutoCompleteNumbersDone", function(e) {
            autoCompleteConfirmed = true;

            keyDown(27, function() { // press esc
                issueEvent(document, "showAutoCompleteNumbers", null);
            });

            // esc
        });

        $(document).on('highlightSlideObject', function(e) {
            var p = e.detail;

            chromeSendMessage("HIGHLIGHT_SLIDE_OBJECT", p);
        });

        $(document).on('showAutoCompleteNumbers', function(e) {
            var p = e.detail;

            chromeSendMessage("showAutoCompleteNumbers", p);
        });

        $(document).on('clearPlaneCanvas', function(e) {
            var p = e.detail;

            chromeSendMessage("CLEAR_PLANE_CANVAS", p);
        });

        $(document).on("ROOT_UPDATE_HIGHLIGHT_REQUEST", function(e) {
            var p = e.detail;

            chromeSendMessage("ROOT_UPDATE_HIGHLIGHT_REQUEST", p);
        });

        $(document).on("ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", function(e) {
            var p = e.detail;

            chromeSendMessage("ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", p);
        });

        $(document).on("getSlideObjectForHighlight", function(e) {
			getSlideObjectForHighlight(e.detail);
        });

        $(document).on("updateSlideInfo", function(e) {
            var p = e.detail;

            chromeSendMessage("UPDATE_SLIDE_INFO", p);
        });

        $(document).on("showAutoComplete", function(e) {
            var p = e.detail;

            chromeSendMessage("showAutoComplete", p);
        });

        $(document).on("removeAutoComplete", function(e) {
            var p = e.detail;

            chromeSendMessage("removeAutoComplete", p);
        });

        $(document).on("clearVisualizeParagraph", function(e) {
            var p = e.detail;

            chromeSendMessage("clearVisualizeParagraph", p);
                });

        $(document).on("visualizeParagraph", function(e) {
            var p = e.detail;

            chromeSendMessage("visualizeParagraph", p);
        });

        $(document).on("prepareAutoCompleteNumbers", function(e) {
            var p = e.detail;

            chromeSendMessage("prepareAutoCompleteNumbers", p);
        });

        $(document).on("highlightSearchResults", function(e) {
            var p = e.detail;

            chromeSendMessage("highlightSearchResults", p);
        });

        $(document).on("autoCompleteAppeared", function(e) {
            var p = e.detail;

            autoCompleteAppeared = true;
        });

        $(document).on("autoCompleteDisappeared", function(e) {
            var p = e.detail;

            autoCompleteAppeared = false;
        });


        $(document).on("slideKeyDown", function(e) {
                var p = e.detail;

                // console.log(p);
                // console.log(e);

                if(p.keyCode == 9) { // tab
                    if(autoCompleteAppeared) {
//                        keyDown(8, function() { // back space
//                            keyDown(27, function() { // esc

                                var bg = curParagraphs[0].box;
                                var boundingClientRect = document.getElementById($(bg).attr("id")).getBoundingClientRect();
                                // highlightSearchResults(paragraphText);

                                console.log(selectedParagraphObj);

                                var objID = $(selectedParagraphObj).attr("id").split('-')[1];

                                console.log(objID);
                                console.log(selectedParagraphNumber);

                                issueEvent(document, "prepareAutoCompleteNumbers", {
    	                            top: boundingClientRect.top + boundingClientRect.height + 20,
                                    left: boundingClientRect.left,
                                    width: boundingClientRect.width,
                                    objID: objID,
                                    paragraph: selectedParagraphNumber,
                                    paragraphIdentifier: selectedParagraphIdentifier,
                                    pageID: selectedPage
    	                        });
//                            });
//                        });
                    }
                }

                if(p.keyCode == 40) { // down arrow

                   // document.dispatchEvent(clickEvent);

                /*
                    keyDown(27, function() {
                            keyPress(32, function() {
                                    keyDown(8, null);
                                    });
                            });*/
                }

        });

        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////
        /////////// keyPress and keyDown functions /////////////
        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////

/*
        $(document).on("keypress", function(e) {
                console.log('keydown -- ext');
                });*/
		observer = new MutationObserver(printMessage);

		mutationConfig = { attributes: false, childList: true, subtree: true };
		observer.observe(document.getElementById("filmstrip"), mutationConfig);

        anotherObserver = new MutationObserver(printMessage2);

		mutationConfig2 = { attributes: false, childList: true, subtree: true };
        anotherObserver.observe(document.getElementById("slides-view"), mutationConfig2);

        anotherObserver3 = new MutationObserver(printMessage3);

        mutationConfig3 = { attributes: true, childList: false, subtree: true};
        anotherObserver3.observe(document.getElementById("slides-view"), mutationConfig3);

        setTimeout(attachKeyListener, 5000);
		// setInterval(checkURL, 500);

        function attachKeyListener() {
    		var editingIFrame = $('iframe.docs-texteventtarget-iframe')[0];
            var myDoc = document;
    
            // console.log(editingIFrame);
    
    	    if (editingIFrame) {
    		    editingIFrame.contentDocument.addEventListener("keydown", hook, false);
    		    editingIFrame.contentDocument.addEventListener("click", clickHook, false);
    		}
/*
            $(document).on("click", function(e) {
                    console.log(e);

                    clickEvent = e.originalEvent;

                    console.log(clickEvent);
                    });*/
    
            function clickHook(e) {
                console.log(e);
            }

    		function hook(e){
                // console.log(e);
    		    var keyCode = e.keyCode;
    
                issueEvent(document, "slideKeyDown", {
                    keyCode: e.keyCode
                });
    		}

        }
    }
 });

/*
$(window).on("inverse", function() {
		console.log($(".filmstrip"));

	$(".filmstrip").before($(".panel-right"));

	console.log("--inverse--");
	console.log(this);
});*/


