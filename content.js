/////////////// ///////////////////

///////////////////////////////////////////

//////////////////////////////////////////

var docsHostWindow;
var currentURL = '';

var targetNode;
var mutationConfig;
var observer;

var curSlideCount = -1;
var clickedElements = [];
var curParagraphs = null;
var curPageID = '';

var paragraphIdentifiers = null;

var selectedBoxID = null;

var lastSelectedParagraph = null;
var lastSelectedParagraphObj = null;
var lastSelectedParagraphNumber = null;
var lastSelectedParagraphIdentifier = null;
var lastSelectedPage = null;

var selectedParagraph = null;
var selectedParagraphObj = null;
var selectedParagraphNumber = null;
var selectedParagraphIdentifier = null;
var selectedPage = null;

var filmstripHeight = -1, filmstripWidth = -1;
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

var paragraphAddedObjId = null;
var paragraphAddedParagraphId = null;

var paragraphReplacedObjId = null;
var paragraphReplacedParagraphId = null;
var paragraphReplacedParagraphNumber = null;

var sectionStructure = null, sectionStructureFlag = false;
var objectToHighlight = null;

var curSectionHeaderStructure = null;
var slideNavigatorShown = false;

var printMessageTimestamp2 = 0;
var printMessageTimestamp3 = 0;

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

function transit(pageID) {
    window.location.hash = "slide=id." + pageID;
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

    // console.log(mutationsList);
    
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
		else if(myList[j].tagName == 'path' && $(myList[j]).attr("stroke") == '#8ab4f8') {
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
//	document.elementFromPoint(systemMouseCoorInfo.clientX, systemMouseCoorInfo.clientY).dispatchEvent(new MouseEvent('mouseup', {bubbles: true, screenX: systemMouseCoorInfo.systemX, screenY: systemMouseCoorInfo.systemY, clientX: systemMouseCoorInfo.clientX, clientY: systemMouseCoorInfo.clientY}));


	paragraphIdentifiers = paragraphIdSnapshot;

	// paragraphIdentifiers = $.extend(true, {}, paragraphIdSnapshot); // hard copy

	curParagraphs = getParagraphStructure();
	console.log(systemTurnBox);

	var myParagraph = getParagraphs(curParagraphs, systemTurnBox);

	if(myParagraph.length == paragraphIdentifiers[systemTurnBox].length + 1) {
	    var objID = createObjId();

	    paragraphIdentifiers[systemTurnBox].push(objID);
	    storeMapping(systemTurnBox, myParagraph.length-1, objID, true);

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
/*
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
	*/
	//                        keyDown(8, function() { // back space
    }
    }

    function removeHighlight(mappingIdentifiers, lastElemIndex) {
	issueEvent(document, "removeHighlight", {
	    pageID: getPageID(),
	    mappingIdentifiers: mappingIdentifiers,
	    boxID: selectedBoxID,
	    lastElemIndex: lastElemIndex,
	    startIndex: null,
	    endIndex: null,
	    pageNumber: null,
	    updateFlag: false
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

	console.log($(".punch-filmstrip-selected-thumbnail-pagenumber"));

	$(".punch-filmstrip-selected-thumbnail-pagenumber").each(function() {
	    var thumbnaileObj = this;

	    $("g[id^='filmstrip-slide-']").each(function() {
		var id = $(this).attr("id");

		if(id.endsWith("-bg")) {
		    console.log($(this));
		    console.log($(thumbnaileObj));

		    var commonAncestor = get_common_ancestor(thumbnaileObj, this);

		    if($(commonAncestor).is("g")) {
			console.log($(commonAncestor));

			var splitted = $(this).attr("id").split("-");
			var pageId = splitted[3];

			retValue = pageId;

			return false;
		    }
		}
	    });
	});

	console.log(retValue);
	console.log(window.location);

	if(retValue == null) return window.location.hash.substr(10);
	else return retValue;
    }

    function updatePdfjsHighlight(number) {
	console.log(number);
	console.log(selectedParagraphIdentifier);

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

    function getCurParagraphsString() {
	var retValue = [];

	for(var i=0;i<curParagraphs.length;i++) {
	    var box = $(curParagraphs[i].box[0]).attr("id");
	    var para = [];
	    
	    for(var j=0;j<curParagraphs[i].paragraphs.length;j++) {
		para.push($(curParagraphs[i].paragraphs[j]).attr("id"));
	    }

	    retValue.push({
		box: box,
		para: para
	    });
	}

	return retValue;
    }

    function updateCurPageAndObjects() {
	var pageId = getPageID();

	if(pageId != curPageID) {
	    updatePdfjsHighlight(1);
	}

	curPageID = pageId;

	issueEvent(document, "ROOT_UPDATE_CUR_PAGE_AND_OBJECTS", {
	    "pageId": pageId,
	    "clickedElements": clickedElements,
	    "paragraphNumber": selectedParagraphNumber,
	    "paragraphIdentifier": selectedParagraphIdentifier,
	    "curParagraphs": getCurParagraphsString()
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

	if(curPage == '') {
	    root = null;
	    return;
	}

	console.log("curPageID : " + curPage);

	var temp = getIdTree($("#editor-" + curPage));

	console.log("idTree : ");
	console.log(temp);

	return temp;
    }

    function clickParagraph(boxObjID, paragraphNumber) {
	// DO NOT CLICK.
	/*
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
	}*/

	// systemMouseDown = true;

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

    function storeMappingWithCurrentParagraph(objId) {
	console.log(selectedBoxID);
	console.log(selectedParagraph);
	console.log(selectedParagraphObj);
	console.log(selectedPage);
	console.log(selectedParagraphNumber);
	console.log(selectedParagraphIdentifier);
    }

    function storeMapping(objId, paragraphNumber, paragraphId, isOverride) {
	// console.log("STORE MAPPING");

	// console.log(objId + ' ' + paragraphNumber + ' ' + paragraphId);

	issueEvent(document, "sendParagraphMappingData", {
	    objId: objId,
	    paragraphNumber: paragraphNumber,
	    paragraphId: paragraphId,
	    isOverride: isOverride
	});
    }

    function displayParagraphs(p, flag) {
	console.log(paragraphIdentifiers);
	clearVisualizeParagraphForTransition();

	for(var i=0;i<p.length;i++) {
	    console.log($(p[i].box));
	    console.log($(p[i].box).find("image"));

	    if($(p[i].box).find("image").length > 0) {
		visualizeParagraph($(p[i].box).attr("id") + "-paragraph-99", false, flag);
	    }
	    else {
		for(var j=0;j<p[i].paragraphs.length;j++) {
		    visualizeParagraph($(p[i].paragraphs[j]).attr("id"), false, flag);
		}
	    }
	}
    //	function visualizeParagraph(pid) 
    }

    function process(mutationsList) {
	issueEvent(document, "extension_disappearMenuButton", null);

	var newParagraphs = getParagraphStructure();
	var oldParagraphIdentifiers, newParagraphIdentifiers;

	console.log("new paragraphs : ");
	console.log(newParagraphs);

	if(curParagraphs == null) curParagraphs = newParagraphs;

	getClickedItem(mutationsList);

	console.log(clickedElements);

	if(!systemTurn) {
	    if(paragraphAddedObjId != null && paragraphAddedObjId in paragraphIdentifiers) {
		console.log(paragraphAddedObjId);
		newParagraphIdentifiers = paragraphIdentifiers[paragraphAddedObjId];

		var lastParagraphSize = newParagraphs[newParagraphs.length-1].paragraphs.length;

		storeMapping(paragraphAddedObjId, lastParagraphSize-1, paragraphAddedParagraphId, true);
		newParagraphIdentifiers.push(paragraphAddedParagraphId);

		paragraphAddedObjId = null;
		paragraphAddedParagraphId = null;

		curParagraphs = newParagraphs;
	    }
	    else if(clickedElements.length == 1) {
		// console.log(curParagraphs);
		// console.log(newParagraphs);

		var clickedElemID = clickedElements[0].split('-')[1];

		// console.log("old");
		// console.log(paragraphIdentifiers[clickedElemID]);
		//
		//
		console.log(curParagraphs);
		console.log(newParagraphs);
		console.log(paragraphIdentifiers[clickedElemID]);

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
					storeMapping(clickedElemID, i, paragraphIdentifiers[clickedElemID][j], true);
					newParagraphIdentifiers.push(paragraphIdentifiers[clickedElemID][j]);

					break;
				    }
				}
			    }

			    if(!flag) { // i-th element was added 

				console.log(paragraphAddedObjId);
				console.log(i);
				console.log(newParagraph.length-1);

				if(paragraphAddedObjId != null && i >= newParagraph.length-1) {
				    // the addition was because of text conversion

				    console.log(newParagraphIdentifiers);
				    console.log(paragraphAddedObjId);
				    console.log(paragraphAddedParagraphId);

				    newParagraphIdentifiers.push(paragraphAddedParagraphId);

				    paragraphAddedObjId = null;
				    paragraphAddedParagraphId = null;
				}
				else if(paragraphReplacedObjId != null) {
				    console.log(paragraphReplacedObjId);
				    console.log(paragraphReplacedParagraphId);
				    console.log(paragraphReplacedParagraphNumber);

				    console.log(i);

				    newParagraphIdentifiers.push(paragraphReplacedParagraphId);

				    paragraphReplacedObjId = null;
				    paragraphReplacedParagraphId = null;
				    paragraphReplacedParagraphNumber = null;

				    console.log(i, originalParagraph.length-1, newParagraph.length-1);
				    console.log($(newParagraph[i+1]));
				    console.log($(originalParagraph[i]));
				    console.log($(newParagraph[i+1]).is($(originalParagraph[i])));

				    if(i >= originalParagraph.length-1 && i+1 >= newParagraph.length-1 && 
				       $(newParagraph[i+1]).is($(originalParagraph[i]))){
				    	var paragraphId = createObjId();
				    	newParagraphIdentifiers.push(paragraphId);
					break;
				    }
				}
				else {
				    var paragraphId = createObjId();
				    console.log("here 2" + " " + i + " " + j);

				    storeMapping(clickedElemID, i, paragraphId, true);
				    newParagraphIdentifiers.push(paragraphId);
				    /*
				       if(systemTurnTextAdded) {
				       newParagraphIdentifiers.push(textAddedParagraphIdentifier);
				       storeMapping(clickedElemID, i, textAddedParagraphIdentifier, true);

				       systemTurnTextAdded = false;
				       }
				       else {
				       if(systemTurn == false) {
				       console.log("here 2" + " " + i + " " + j);

				       storeMapping(clickedElemID, i, paragraphId, true);
				       newParagraphIdentifiers.push(paragraphId);
				       }
				       else {
				       console.log("really?" + " " + i + " " + j);
				    // newParagraphIdentifiers.push(paragraphIdSnapshot[clickedElemID][j]);
				    newParagraphIdentifiers.push(createObjId());
				    }
				    }
				    */
				}
			    }
			}
			else{
			    if(paragraphIdentifiers[clickedElemID] == null){ // the first registration
				var paragraphId = createObjId();

				console.log("here 3" + " " + i + " " + j);
				storeMapping(clickedElemID, i, paragraphId, true);

				newParagraphIdentifiers.push(paragraphId);
			    }
			    else{
				console.log("here 4" + " " + i + " " + j);

				newParagraphIdentifiers.push(paragraphIdentifiers[clickedElemID][i]);
				storeMapping(clickedElemID, i, paragraphIdentifiers[clickedElemID][i], true);
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

			oldParagraphIdentifiers = paragraphIdentifiers[clickedElemID];
			newParagraphIdentifiers = newParagraphIdentifiers;

			console.log(paragraphIdentifiers[clickedElemID]);
			console.log(newParagraphIdentifiers);

			addedMapping = getDifference(newParagraphIdentifiers, paragraphIdentifiers[clickedElemID]);
			removedMapping = getDifference(paragraphIdentifiers[clickedElemID], newParagraphIdentifiers);

			console.log("ADDED MAPPING");
			console.log(addedMapping);

			console.log("REMOVED MAPPING");
			console.log(removedMapping);

			if(removedMapping.length > 0) 
			    removeHighlight(removedMapping, newParagraphIdentifiers.length);
		    }

		    paragraphIdentifiers[clickedElemID] = newParagraphIdentifiers;

		    console.log("new");
		    console.log(paragraphIdentifiers[clickedElemID]);

		    // console.log(paragraphIdentifiers);
		    curParagraphs = newParagraphs;
		}
	    }
	    else{
		console.log(paragraphAddedObjId);
		console.log(paragraphAddedParagraphId);
		console.log(paragraphIdentifiers);

		if(paragraphAddedObjId != null && paragraphAddedObjId in paragraphIdentifiers) {
		    console.log(paragraphAddedObjId);
		    newParagraphIdentifiers = paragraphIdentifiers[paragraphAddedObjId];

		    var lastParagraphSize = newParagraphs[newParagraphs.length-1].paragraphs.length;

		    storeMapping(paragraphAddedObjId, lastParagraphSize-1, paragraphAddedParagraphId, true);
		    newParagraphIdentifiers.push(paragraphAddedParagraphId);

		    paragraphAddedObjId = null;
		    paragraphAddedParagraphId = null;

		    curParagraphs = newParagraphs;
		}
		else {
		    curParagraphs = newParagraphs;
		}
	    }
	}

	updateCurPageAndObjects();

	console.log(curPageID);

	if(curParagraphs != null) {
	    console.log(curParagraphs);

	    var currentPageId = getPageID();

	    for(var i=0;i<curParagraphs.length;i++) {
		if(!curParagraphs[i].box.attr("id").endsWith("-bg")) {
		    var objId = curParagraphs[i].box.attr("id").split("-")[1];

		    for(var j=0;j<curParagraphs[i].paragraphs.length;j++) {
			var paragraphId = createObjId();

			var paragraphNumber = parseInt(curParagraphs[i].paragraphs[j].attr("id").split("-")[3]);
			storeMapping(objId, paragraphNumber, paragraphId, false);
			/*
			   var paragraphId = createObjId();

			   console.log(paragraphIdentifiers);
			   console.log(objId);
			   console.log(paragraphIdentifiers[objId]);

			   if(!(objId in paragraphIdentifiers)) {
			   console.log(paragraphNumber);
			   paragraphIdentifiers[objId] = [paragraphId];
			   storeMapping(objId, paragraphNumber, paragraphId, true);
			   }
			   else if(paragraphIdentifiers[objId].length <= paragraphNumber){
			   paragraphIdentifiers[objId].push(paragraphId);
			   console.log(paragraphIdentifiers[objId].length, paragraphNumber);
			   storeMapping(objId, paragraphNumber, paragraphId, true);
			   }*/
		    }
		}
	    }

	    displayParagraphs(curParagraphs, false);
	}
	/*
	else {
	    // no paragraph, but clicked

	    for(var i=0;i<clickedElements.length;i++) {
		var objID = clickedElements[i];
		var obj = $("#" + objID);

		console.log(obj);

		var boundary = $(obj)[0].getBoundingClientRect();

		issueEvent(document, "visualizeParagraph", {
		    pid: "editor-" + objID + "-paragraph-" + objID + "-figure",
		    height: boundary.height,
		    width: boundary.width,
		    left: boundary.left,
		    top: boundary.top,
		    flag: true,
		    pageID: curPageID
		});
	    }
	}*/

	if(systemTurn && !systemMouseDown) {
	    clickParagraph(selectedBoxID, selectedParagraphNumber);
	}

	var myHeight = filmstripHeight * 60 / 100;
	var myWidth = filmstripWidth * 60 / 100;
	var curHeight = $($("#filmstrip")[0].childNodes[0]).height();
	var curWidth = $($("#filmstrip")[0].childNodes[0]).width();
/*
	if(curHeight != myHeight) {
		$($("#filmstrip")[0].childNodes[0]).height(myHeight);
		$($("#filmstrip")[0].childNodes[0]).width(myWidth);
	}*/

	$("#outlineTaskPlane").height(filmstripHeight * 40 / 100);

	if(clickedElements.length > 0) {
	    issueEvent(document, "extension_confirmPutParagraph", {
		objID: clickedElements[0].split("-")[1],
		oldParagraphIdentifiers: oldParagraphIdentifiers,
		newParagraphIdentifiers: newParagraphIdentifiers
	    });
	}

	console.log("printMessage2 end!");

	console.log(objectToHighlight);

	if(objectToHighlight != null) {
	    getSlideObjectForHighlight(objectToHighlight);
	    objectToHighlight = null;
	}
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
	process(mutationsList);
	/*
	var timestamp = + new Date();

	console.log(timestamp);

	if(printMessageTimestamp2 + 400 <= timestamp) {
	    setTimeout(
		    function() {
			process(mutationsList);
		    }, 400);

	    printMessageTimestamp2 = timestamp;
	}
	*/

    }

    function clickSystemMouse(name) {
	console.log(name);

	// systemMouseDown = true;

	console.log("system mouse down");

	// console.log(document.elementFromPoint(112, 357));

	// document.elementFromPoint(325, 687).dispatchEvent(new MouseEvent('mousedown', {bubbles: true, screenX: 757, screenY: -878, clientX: 325, clientY: 687}));
	// document.elementFromPoint(325, 687).dispatchEvent(new MouseEvent('mouseup', {bubbles: true, screenX: 757, screenY: -878, clientX: 325, clientY: 687}));

    	// window.location.hash = "slide=id." + name;
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

    function printMessage3Body(mutationsList) {
	var cursorDOM = $("[shape-rendering='crispEdges'][style*='opacity: 1;']");

	console.log(cursorDOM);

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

	    console.log(cursorDOM);
	    console.log(cursorBoundary);

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
			    console.log(paragraph);
			    console.log(pid);
			    var paragraphText = getParagraphText(paragraph);
			    console.log(paragraphText);

			    visualizeParagraph(pid, true, false);
			    flag = true;

			    console.log(selectedParagraph);

			    if(!(selectedParagraph != null && selectedParagraph.is($("#" + pid)))) {
				selectedBoxID = $(box.box).attr("id").split("-")[1]; 

				selectedParagraph = $("#" + pid);
				selectedParagraphObj = paragraph;
				selectedPage = getPageID();
				selectedParagraphNumber = j;
				selectedParagraphIdentifier = paragraphIdentifiers[selectedBoxID][j];

				lastSelectedParagraph = selectedParagraph;
				lastSelectedParagraphObj = selectedParagraphObj;
				lastSelectedPage = selectedPage;
				lastSelectedParagraphNumber = selectedParagraphNumber;
				lastSelectedParagraphIdentifier = selectedParagraphIdentifier;

				console.log(lastSelectedParagraph);

				updateCurPageAndObjects();
				updatePdfjsHighlight(2);

				issueEvent(document, "extension_setMenu", {
				    rect: document.getElementById(pid).getBoundingClientRect(),
				    curParagraphObjID: pid,
				    paragraphNumber: selectedParagraphNumber
				});
			    }

			    // console.log(selectedParagraphIdentifier);
			    // console.log(document.getElementById(pid).getBoundingClientRect());

			    // var resultString = findCursorPosition(cursorCoor, selectedParagraph);
			    // console.log(resultString);
			}
			else {
			    visualizeParagraph(pid, false, false);
			}

			console.log($(paragraph));
		    }
		}
	    }

	    if(!flag) {
	//	clearVisualizeParagraph();

		issueEvent(document, "removeAutoComplete", null);
	    }
	    else {
		// console.log(clickedElements);

		console.log($(selectedParagraph));

		var paragraphText = getParagraphText(selectedParagraph);

		// console.log(curParagraphs);
		var bg = curParagraphs[0].box;
		var paragraphBoundingClientRect = document.getElementById($(selectedParagraph).attr("id")).getBoundingClientRect();
		var bgBoundingClientRect = document.getElementById($(bg).attr("id")).getBoundingClientRect();
		// highlightSearchResults(paragraphText);

		console.log(paragraphText);

		issueEvent(document, "checkAutoComplete", {
		    top: paragraphBoundingClientRect.top + paragraphBoundingClientRect.height + 5,
		    left: bgBoundingClientRect.left,
		    width: bgBoundingClientRect.width,
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

	    console.log(cursorDOM);
	    console.log(clickedElements);

	    console.log($("#" + clickedElements[0]));
	    console.log($("#" + clickedElements[0]).find("image"));

	    var clickedObj = $("#" + clickedElements[0]);

	    console.log(curParagraphs);
	    console.log(curParagraphs);

	    var paragraph = curParagraphs[2].paragraphs[0];

	    var paragraphNumber = -1;
	    var bodyText = $(paragraph).find("text")[0].innerHTML;

	    console.log(bodyText);

	    if(bodyText == "Click") paragraphNumber = 0;
	    else paragraphNumber = curParagraphs[2].paragraphs.length;

	    console.log(paragraphNumber);

	    if($(clickedObj).find("image").length > 0) {
		issueEvent(document, "extension_setMenu", {
		    rect: document.getElementById(clickedElements[0]).getBoundingClientRect(),
		    curParagraphObjID: clickedElements[0],
		    paragraphNumber: 99,
		    obj_to_push_paragraphNumber: paragraphNumber
		});
	    }

	    if($(cursorDOM).length > 0) { // region
		// console.log($(cursorDOM));
	    }
	    else { // nothing
	//	clearVisualizeParagraph();

		if(!autoCompleteConfirmed)
		    issueEvent(document, "removeAutoComplete", null);
	    }
	}

	var curPageID = getPageID();
	var curObjects = [];

	$("#editor-" + curPageID).find("g[id^='editor-']").each(function(e) {
	    if($(this).attr("id").includes("-paragraph-")) {
		curObjects.push({
		    id: $(this).attr("id"),
		    text: $.trim(getParagraphText($(this)))
		});
	    }
	});

	updateBar(getPageID(), curObjects);
    }

    function printMessage3(mutationsList) {
	var timestamp = + new Date();

	console.log(timestamp, printMessageTimestamp3);

	if(printMessageTimestamp3 + 1000 <= timestamp) {
	    printMessageTimestamp3 = timestamp;

	    setTimeout(
		    function() {
			printMessage3Body(mutationsList);
		    }, 1000);
	}

    }

    function updateBar(pageID, curObjects) {
	console.log(pageID, curObjects);

	issueEvent(document, "extension_updateSimilarBar", {
	    pageID: pageID,
	    curObjects: curObjects
	});
    }

    /*
       function highlightSearchResults(p) {
       issueEvent(document, "highlightSearchResults", {
       words: p
       });
       }*/

    function clearVisualizeParagraphForTransition() {
	selectedParagraph = null;
	selectedParagraphObj = null;
	selectedPage = null;
	selectedParagraphIdentifier = null;

	issueEvent(document, "clearVisualizeParagraph", null);
    }

    function clearVisualizeParagraph() {
	if(selectedParagraph != null) {
	    selectedParagraph = null;
	    selectedParagraphObj = null;
	    selectedPage = null;
	    selectedParagraphIdentifier = null;
	    // selectedParagraphNumber = null;

	    issueEvent(document, "clearVisualizeParagraph", null);
	    updatePdfjsHighlight(3);
	}
    }

    function visualizeParagraph(pid, flag, flag2) {
	console.log(pid, flag);

	var boundingClientRect;

	if(pid.split('-')[3] == 99) {
	    boundingClientRect = document.getElementById("editor-" + pid.split('-')[1]).getBoundingClientRect();
	}
	else {
	    boundingClientRect = document.getElementById(pid).getBoundingClientRect();
	}

	issueEvent(document, "visualizeParagraph", {
	    pid: pid,
	    height: boundingClientRect.height,
	    width: boundingClientRect.width,
	    left: boundingClientRect.left,
	    top: boundingClientRect.top,
	    flag: flag,
	    pageID: curPageID,
	    boundaryFlag: flag2
	});
    }

    function getSlideObjectForHighlight(p) {
	var slideObjId = p;

	highlightSlideObject(slideObjId);
    }

    function highlightSlideObject(objId) {
	console.log(objId);
	console.log($("#" + objId));
	console.log(document.getElementById(objId));

	var boundingClientRect = document.getElementById(objId).getBoundingClientRect();

	console.log(boundingClientRect);

	issueEvent(document, "highlightSlideObject", {
	    objId: objId,
	    height: boundingClientRect.height,
	    width: boundingClientRect.width,
	    left: boundingClientRect.left,
	    top: boundingClientRect.top
	});
    }

    function getSlideCount() {
	var cnt = 0;

	$("g[id^='filmstrip-slide-']").each(function(e) {
	    var id = $(this).attr("id");
	    if(id.endsWith("-bg")) {
		cnt++;
	    }
	});

	return cnt;
    }

    function findUpdatedSlides(mutationsList) {
	var slideId = [];
	var slideCount = getSlideCount();

	// console.log(curSlideCount + ' ' + slideCount);

	if(curSlideCount != slideCount) {
	    issueEvent(document, "extension_requestSlideNumberUpdate", null);
	}

	curSlideCount = slideCount;

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
		if(mutationsList[i].removedNodes[j].classList != null && mutationsList[i].removedNodes[j].classList.contains("sketchy-text-content-text")) {
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

    function getSectionTitle(sectionHierarchy, pageID) {
	if(pageID in sectionHierarchy) {
	    console.log(pageID);
	    console.log(sectionHierarchy);

	    var keys = Object.keys(sectionHierarchy[pageID]);

	    for(var j=0;j<keys.length;j++) {
		var key = keys[j];

		console.log(key);
		console.log(sectionHierarchy[pageID][key]);

		if(sectionHierarchy[pageID][key][0] != null){
		    console.log(sectionHierarchy[pageID][key][0]);
		    return sectionHierarchy[pageID][key][0];
		}
	    }

	    return "null";
	}
	else {
	    return "null";
	}
    }

    function putSectionTitle(thumbnailObj, sectionTitle) {
	if($(thumbnailObj).find(".inlineSectionHeaders").length > 0) {
	    var textElem = $(thumbnailObj).find(".inlineSectionHeaders");
	    var rectElem = $(thumbnailObj).find(".inlineSectionHeaderRect");

	    if(sectionTitle != "null")
	    	$(textElem).html(sectionTitle);
	    else
	    	$(textElem).html('');

	    var textBBox = $(textElem)[0].getBBox();

	    var textElemWidth = textBBox.width;
	    var textElemHeight = textBBox.height;

	    $(rectElem).attr("width",textElemWidth+20); 
	    $(rectElem).attr("height", textElemHeight);
	}
	else {
	    var temp = $(thumbnailObj).attr("transform").split(' ')[1];
	    var textElem = $(thumbnailObj).find("text")[0];

	    var rectElem = $(thumbnailObj).find("rect")[0];

	    var clonedTextElem = $(textElem).clone();
	    var clonedRectElem = $(rectElem).clone();
	    var clonedRectElem2 = $(textElem).clone();

	    var clonedTextElemClass = "punch-filmstrip-thumbnail-pagenumber";

	    $(clonedTextElem).attr("class", clonedTextElemClass + " inlineSectionHeaders");
	    $(clonedTextElem).attr("x", "10");
	    $(clonedTextElem).attr("y", "0");
	    $(clonedTextElem).attr("text-anchor", "start");

	    if(sectionTitle != "null")
	    	$(clonedTextElem).html(sectionTitle);
	    else
	    	$(clonedTextElem).html('');


	    $(thumbnailObj).append(clonedTextElem);

	    var textBBox = $(clonedTextElem)[0].getBBox();

	    var textElemWidth = textBBox.width;
	    var textElemHeight = textBBox.height;

	    console.log(textElemWidth, textElemHeight);

	    var clonedRectElemClass = $(clonedRectElem).attr("class");
	    $(clonedRectElem).attr("class", clonedRectElemClass + " inlineSectionHeaderRect");
	    $(clonedRectElem).attr("stroke-width", "1");
	    $(clonedRectElem).attr("x", "0");
	    $(clonedRectElem).attr("y", "-10");
	    $(clonedRectElem).attr("width",textElemWidth+20); 
	    $(clonedRectElem).attr("height", textElemHeight);

	    $(clonedRectElem).css("stroke", "black");
	    $(clonedRectElem).css("fill", "yellow");
	    $(clonedRectElem).css("z-index", "987987");

	    $(clonedRectElem).insertBefore(clonedTextElem);

	    $(clonedRectElem2).attr("class", "inlineSectionSimilarBar");
	    $(clonedRectElem2).attr("x", "40");
	    $(clonedRectElem2).attr("y", "40");
	    $(clonedRectElem2).attr("width", "20");
	    $(clonedRectElem2).attr("height", "50");
	    $(clonedRectElem2).attr("fill", "red");
	    $(clonedRectElem2).attr("font-weight", "bold");
	    $(clonedRectElem2).html("100 %");

/*
	    $(clonedRectElem2).attr("stroke-width", "1");
	    $(clonedRectElem2).css("stroke", "black");
	    */

	    $(clonedRectElem2).css("z-index", "987987");

	    $(thumbnailObj).append(clonedRectElem2);

	    /*
	    console.log($(thumbnailObj));
	    console.log($(thumbnailObj).prev());

	    var thisTransformValue = $(thumbnailObj).attr("transform").split(' ')[1].split(')')[0];

	    var prevObj = $(thumbnailObj).prev();
	    var prevTransformValue = $(prevObj).attr("transform").split(' ')[1].split(')')[0];

	    console.log($(thumbnailObj));
	    console.log($(prevObj));
	    console.log(thisTransformValue);
	    console.log(prevTransformValue);

	    $(prevObj).appendTo($(thumbnailObj).parent());
	    
	    var curObj = $(thumbnailObj);

	    for(var i=0;i<20;i++) {
	    	var curTransformValue = $(curObj).attr("transform").split(' ')[1].split(')')[0];

		if(curTransformValue < thisTransformValue) {
		    $(thumbnailObj).detach().insertAfter($(curObj));
		    break;
		}

		curObj = $(curObj).prev();

		var attr = $(curObj).attr("transform");
		console.log(attr);

		if (!(typeof attr !== typeof undefined && attr !== false)) {
		    break;
		}

		console.log($(curObj));
	    }
	    */
	}
    }

    function addSectionHeadersOnFilmstrip(sectionHierarchy) {
	console.log(sectionHierarchy);

	var filmstripList = [];
	var appendedSectionList = {};

	$(".punch-filmstrip-thumbnail").each(function(e) {
	    var thumbnailObj = $(this);

	    // console.log($(this));
	    // console.log($(this).find("g[id^='filmstrip-slide-']"));

	    $(this).find("g[id^='filmstrip-slide-']").each(function(e) {
		// console.log($(this));

		var id = $(this).attr("id");

		if(id.endsWith("-bg")) {
		    var pageID = id.split('-')[3];
		    var sectionTitle = getSectionTitle(sectionHierarchy, pageID);

		    // console.log(sectionHierarchy);
		    // console.log(pageID);
		    // console.log(sectionTitle);

		    putSectionTitle(thumbnailObj, sectionTitle);

		    appendedSectionList[sectionTitle] = 1;
		}
		
	    });

	    /*
	    console.log($(this));

	    var temp = $(this).attr("transform").split(' ')[1];
	    var textElem = $(this).find("text")[0];

	    var rectElem = $(this).find("rect")[0];

	    var clonedTextElem = $(textElem).clone();
	    var clonedRectElem = $(rectElem).clone();
	    var clonedRectElem2 = $(rectElem).clone();

	    var clonedTextElemClass = $(clonedTextElem).attr("class");

	    $(clonedTextElem).attr("class", clonedTextElemClass + " inlineSectionHeaders");
	    $(clonedTextElem).attr("x", "10");
	    $(clonedTextElem).attr("y", "0");
	    $(clonedTextElem).attr("text-anchor", "start");
	    $(clonedTextElem).html("Introduction");

	    $(this).append(clonedTextElem);

	    var textBBox = $(clonedTextElem)[0].getBBox();

	    var textElemWidth = textBBox.width;
	    var textElemHeight = textBBox.height;

	    console.log(textElemWidth, textElemHeight);

	    $(clonedRectElem).attr("stroke-width", "1");
	    $(clonedRectElem).attr("x", "0");
	    $(clonedRectElem).attr("y", "-10");
	    $(clonedRectElem).attr("width",textElemWidth+20); 
	    $(clonedRectElem).attr("height", textElemHeight);

	    $(clonedRectElem).css("stroke", "black");
	    $(clonedRectElem).css("fill", "yellow");
	    $(clonedRectElem).css("z-index", "987987");

	    $(clonedRectElem).insertBefore(clonedTextElem);

	    $(clonedRectElem2).attr("stroke-width", "1");
	    $(clonedRectElem2).attr("x", "20");
	    $(clonedRectElem2).attr("y", "20");
	    $(clonedRectElem2).attr("width", "20");
	    $(clonedRectElem2).attr("height", "50");

	    $(clonedRectElem2).css("stroke", "black");
	    $(clonedRectElem2).css("fill", "orange");
	    $(clonedRectElem2).css("z-index", "987987");

	    $(this).append(clonedRectElem2);
	    */
	});

	$(".inlineSectionHeaders").attr("z-index", "987987987");

	$(".outlineTaskPlaneElement").each(function(e) {
	    var contents = $(this).html();

	    if(contents in appendedSectionList) {
		$(this).css("color", "black");
	    }
	    else {
		$(this).css("color", "lightgrey");
	    }
	});
    }

    function outlineTaskRowClicked() {
	
    }

    function appendOutlineTaskRow(sectionTitle, sectionOrder) {
	$("#outlineTaskPlane").append(
		'<div class="outlineTaskPlaneElement" sectionOrder="' + sectionOrder + '" onclick="outlineTaskRowClicked()">' + sectionTitle + '</div>'
		);

	$(".outlineTaskPlaneElement").css("font-size", "18px");
	$(".outlineTaskPlaneElement").css("cursor", "pointer");
	$(".outlineTaskPlaneElement").css("margin", "5px");
    }

    function getSectionStructure() {
	issueEvent(document, "extension_getSectionStructure", null);
    }

    function printMessage(mutationsList) {
	// console.log(mutationsList);
	var updatedSlides = findUpdatedSlides(mutationsList);

	var curSlidePage = $("#pages");

	if(!slideNavigatorShown) {
	    $(curSlidePage).find("g").each(function(e) {
		if($(this).attr("id") != null && $(this).attr("id").endsWith("-bg")) {
		    var boundingClientRect = document.getElementById($(this).attr("id")).getBoundingClientRect();
		    // highlightSearchResults(paragraphText);

		    issueEvent(document, "extension_showSlideNavigator", {
			top: boundingClientRect.top - 20,
			left: boundingClientRect.left,
			width: boundingClientRect.width,
		    });

		    slideNavigatorShown = true;
		}
	    });
	}

	if(filmstripHeight == -1) {
	    filmstripHeight = ($($("#filmstrip")[0].childNodes[0]).height());
	    filmstripWidth = ($($("#filmstrip")[0].childNodes[0]).width());
	}

	if(!sectionStructureFlag) {
	    getSectionStructure();
	    sectionStructureFlag = true;
	}

	$($("#filmstrip")[0].childNodes[0]).height(filmstripHeight * 60 / 100);
	$("#outlineTaskPlane").height(filmstripHeight * 40 / 100);
	$("#outlineTaskPlane").width(filmstripWidth);

	if($("#outlineTaskPlane").length <= 0) {
	    $($("#filmstrip").parent()).append(
		    '<div id="outlineTaskPlane">' + 
		    '</div>'
		    );

	    $("#outlineTaskPlane").css("overflow", "auto");
	    $("#outlineTaskPlane").css("border-top", "1px solid black");

	    $("#outlineTaskPlane").append(
		    '<div class="outlineTaskPlaneHeader"> Document structure </div>'
		    );

	    $(".outlineTaskPlaneHeader").css("font-size", "20px");
	    $(".outlineTaskPlaneHeader").css("font-weight", "bold");
	    $(".outlineTaskPlaneHeader").css("text-align", "center");
	    $(".outlineTaskPlaneHeader").css("margin", "5px");
	}

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

    function isBullet(text) {
	if(text == '●' || text == '○' || text == '■') return true;
	else return false;
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

    function getSlideNumberWithObject(obj) {
	var cnt = 0;
	var objTop = $(obj).offset().top;

	$("g[id^='filmstrip-slide-']").each(function() {
	    var id = $(this).attr("id");

   	    if(id.endsWith("-bg")) {
		var myTop = $(this).offset().top;

		if(myTop < objTop) {
		    cnt++;
		}
	    }
	});

	return cnt;
    }

    function getSlideNumber(p) {
	var returnValue = -1;

	var boxID = p.data.objID.split("-")[1];
	var slideCnt = 0;

	$("g[id^='filmstrip-slide-']").each(function() {
	    if(returnValue == -1) {
		var id = $(this).attr("id");

		if(id.split("-")[3] == boxID) {
		    returnValue = getSlideNumberWithObject($(this));
		    return;
		}
	    }
	});

	return returnValue;
    }

    $(document).ready(function() {
	if(this.location.hostname == "localhost" && this.location.pathname == '/') { 
	    // root script
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
		    case "__removeAutoComplete":
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
		    case "pdfjs_removeHighlight":
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

		    case "initialSlideGeneration":
			issueEvent(document, "initialSlideGeneration", details.data);
			break;
		    case "addSectionHighlight":
			issueEvent(document, "addSectionHighlight", details.data);
			break;
		    case "loadGslide":
			issueEvent(document, "loadGslide", details.data);
			break;
		    case "registerMappings":
			issueEvent(document, "registerMappings", details.data);
			break;
		    case "GET_SLIDE_OBJECT_FOR_HIGHLIGHT":
			issueEvent(document, "get_slide_object_for_highlight", details);
			break;
		    case "extension_appendTextIntoParagraph":
			issueEvent(document, "extension_appendTextIntoParagraph", details);
			break;
		    case "extension_confirmPutParagraph":
			issueEvent(document, "extension_confirmPutParagraph", details);
			break;
		    case "pdfjs_clearDatabase" :
			issueEvent(document, "pdfjs_clearDatabase", details);
			break;
		    case "extension_getSectionStructure" :
			issueEvent(document, "extension_getSectionStructure", details);
			break;
		    case "extension_getInlineSectionHeaders" :
			issueEvent(document, "extension_getInlineSectionHeaders", details);
			break;
		    case "extension_showSlideNavigator" :
			issueEvent(document, "extension_showSlideNavigator", details);
			break;
		    case "extension_updateNavigationElement" :
			issueEvent(document, "extension_updateNavigationElement", details);
			break;
		    case "pdfjs_locateObject" :
			issueEvent(document, "pdfjs_locateObject", details);
			break;
		    case "extension_updateSimilarBar" :
			issueEvent(document, "extension_updateSimilarBar", details);
			break;
		    case "extension_setMenu" :
			issueEvent(document, "extension_setMenu", details);
			break;
		    case "extension_disappearMenuButton" :
			issueEvent(document, "extension_disappearMenuButton", details);
			break;
		    case "pdfjs_disableSlideplane" :
			issueEvent(document, "pdfjs_disableSlideplane", details);
			break;
		    case "pdfjs_enableSlideplane" :
			issueEvent(document, "pdfjs_enableSlideplane", details);
			break;
		    case "extension_sendStyle" :
			issueEvent(document, "extension_sendStyle", details);
			break;
		    case "extension_sendCurParagraphForStyling" :
			issueEvent(document, "extension_sendCurParagraphForStyling", details);
			break;
		}
	    });

	    $(document).on("root_getCurParagraphForStyling", function(e) {
		chromeSendMessage("root_getCurParagraphForStyling", e.detail);
	    });

	    $(document).on("root_sendStyleCurPage", function(e) {
		chromeSendMessage("root_sendStyleCurPage", e.detail);
	    });

	    $(document).on("root_submitSimilarBarScore", function(e) {
		chromeSendMessage("root_submitSimilarBarScore", e.detail);
	    });

	    $(document).on("root_slideNavigatorShownCheck", function(e) {
		chromeSendMessage("root_slideNavigatorShownCheck", e.detail);
	    });

	    $(document).on("root_locateObject", function(e) {
		chromeSendMessage("root_locateObject", e.detail);
	    });

	    $(document).on("root_simulateClick", function(e) {
		chromeSendMessage("root_simulateClick", e.detail);
	    });

	    $(document).on("root_getSectionHierarchyStructure", function(e) {
		console.log(e.detail);

		chromeSendMessage("root_getSectionHierarchyStructure", e.detail);
	    });

	    $(document).on("root_sendSectionTitleToExtension", function(e) {
		console.log(e.detail);

		chromeSendMessage("root_sendSectionTitleToExtension", e.detail);
	    });

	    $(document).on("root_displayParagraphsCall", function(e) {
		chromeSendMessage("root_displayParagraphsCall", e.detail);
	    });

	    $(document).on("root_replaceParagraphIdentifier", function(e) {
		chromeSendMessage("root_replaceParagraphIdentifier", e.detail);
	    });
	    $(document).on("root_appendParagraphIdentifier", function(e) {
		chromeSendMessage("root_appendParagraphIdentifier", e.detail);
	    });

	    $(document).on("root_sendParagraphIdentifier", function(e) {
		chromeSendMessage("root_sendParagraphIdentifier", e.detail);
	    });
	    $(document).on("root_changeParagraphIdentifier", function(e) {
		chromeSendMessage("root_changeParagraphIdentifier", e.detail);
	    });

	    $(document).on("root_changeMapping", function(e) {
		chromeSendMessage("root_changeMapping", e.detail);
	    });

	    $(document).on("highlight_slide_object_mouse_enter", function(e) {
		chromeSendMessage("HIGHLIGHT_SLIDE_OBJECT_MOUSE_ENTER", e.detail);
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

	    $(document).on("sendSlideInfoToPDF", function(e) {
		var p = e.detail;

		chromeSendMessage("sendSlideInfoToPDF", p);
	    });

	    $(document).on("PdfjsMoveScrollBar", function(e) {
		var p = e.detail;

		chromeSendMessage("PdfjsMoveScrollBar", p);
	    });

	    $(document).on("__removeAutoComplete", function(e) {
		var p = e.detail;

		chromeSendMessage("__removeAutoComplete", p);
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
		    case "__removeAutoComplete":
			issueEvent(document, "removeAutoComplete", details.data);
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
		    case "sendSlideInfoToPDF":
			issueEvent(document, "sendSlideInfoToPDF", details.data);
			break;
		    case "PdfjsMoveScrollBar":
			issueEvent(document, "PdfjsMoveScrollBar", details.data);
			break;
		    case "extension_putSlideNumberOnBoxes":
			issueEvent(document, "extension_putSlideNumberOnBoxes", details.data);
			break;
		    case "extension_requestSlideNumberUpdate":
			issueEvent(document, "extension_requestSlideNumberUpdate", details.data);
			break;
		    case "root_getSectionHierarchyStructure":
			issueEvent(document, "root_getSectionHierarchyStructure", details.data);
			break;
		}
	    });

	    $(document).on("pdfjs_disableSlideplane", function(e) {
		chromeSendMessage("pdfjs_disableSlideplane", e.detail);
	    });

	    $(document).on("pdfjs_clearParagraphs", function(e) {
		chromeSendMessage("pdfjs_clearParagraphs", e.detail);
	    });

	    $(document).on("pdfjs_displayParagraphs", function(e) {
		chromeSendMessage("pdfjs_displayParagraphs", e.detail);
	    });

	    $(document).on("pdfjs_enableSlideplane", function(e) {
		chromeSendMessage("pdfjs_enableSlideplane", e.detail);
	    });

	    $(document).on("pdfjs_locateObject", function(e) {
		chromeSendMessage("pdfjs_locateObject", e.detail);
	    });

	    $(document).on("pdfjs_printInlineSectionHeaders", function(e) {
		chromeSendMessage("pdfjs_printInlineSectionHeaders", e.detail);
	    });

	    $(document).on("pdfjs_clearDatabase", function(e) {
		chromeSendMessage("pdfjs_clearDatabase", e.detail);
	    });

	    $(document).on("pdfjs_removeHighlight", function(e) {
		chromeSendMessage("pdfjs_removeHighlight", e.detail);
	    });
	    $(document).on("addSectionHighlight", function(e) {
		chromeSendMessage("addSectionHighlight", e.detail);
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

	    $(document).on("initialSlideGeneration", function(e) {
		var p = e.detail;

		chromeSendMessage("initialSlideGeneration", p);
	    });

	    $(document).on("loadGslide", function(e) {
		var p = e.detail;

		chromeSendMessage("loadGslide", p);
	    });

	    $(document).on("registerMappings", function(e) {
		var p = e.detail;

		chromeSendMessage("registerMappings", p);
	    });

	    $(document).on("pdfjs_storeMappingWithCurrentParagraph", function(e) {
		var p = e.detail;

		chromeSendMessage("pdfjs_storeMappingWithCurrentParagraph", p);
	    });

	    $(document).on("updateSlideNumbersOnBoxes", function(e) {
		var p = e.detail;

		chromeSendMessage("pdfjs_updateSlideNumbersOnBoxes", p);
	    });

	    console.log("Hello???");

	    issueEvent(document, "pdfjs_start", null);
	}

	// chrome extension
	if(this.location.hostname == "docs.google.com" && this.location.pathname[1] == 'p') {
	    console.log(this.location);

	    chrome.runtime.onMessage.addListener(function(details) {
		switch(details.type) {
		    case "ADDTEXT_GETOBJ":
			console.log("clicked elements here");
			console.log(clickedElements);
			console.log(selectedParagraph);

			if(selectedParagraph != null) {
				var objID = $(selectedParagraph).attr("id").split("-")[1];
				var paragraphNumber = $(selectedParagraph).attr("id").split("-")[3];
				var paragraphIdentifier = selectedParagraphIdentifier;
				var pageNumber = details.data.pageNumber;
				var startIndex = details.data.startIndex;
				var endIndex = details.data.endIndex;
				var text = details.data.text;

		    		chromeSendMessage("extension_appendTextIntoParagraph", {
				    "pageID": curPageID,
				    "objID": objID,
				    "paragraphNumber": paragraphNumber,
				    "paragraphIdentifier": paragraphIdentifier,
				    "pageNumber": pageNumber,
				    "segmentStartIndex": startIndex,
				    "segmentEndIndex": endIndex,
				    "text": text
		    		});
			}
			else if(clickedElements.length > 0) {
			    for(var i=0;i<clickedElements.length;i++) {

				var objId = clickedElements[i].substr(7);
				var paragraph = getParagraphs(curParagraphs, objId);
				var paragraphId;

				console.log(curParagraphs);

				console.log(details.data);
				console.log(objId);
				console.log(paragraph);
				console.log(paragraph[0]);
				console.log(paragraphId);
				console.log(selectedParagraphIdentifier);
				console.log(paragraphIdentifiers[objId]);
				console.log($(paragraph[0]).find("text"));

				if((paragraph.length == 1 && $(paragraph[0]).find("text").length == 0) || (paragraph.length == 1 && isBullet($(paragraph[0]).find("text").text()))) { // empty
				    console.log("here, empty");
				    paragraphId = paragraphIdentifiers[objId][0];

				    storeMapping(objId, 0, paragraphId, true);
				}
				else {
				    console.log("here, not empty");

				    paragraphId = createObjId();
				    storeMapping(objId, paragraph.length, paragraphId, true);
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
			    var objId = null;
			    var paragraphCnt = 0;

			    console.log(curParagraphs);

			    if(curParagraphs.length > 0 && 
			       curParagraphs[curParagraphs.length-1].paragraphs.length > 0) {
				paragraphCnt = curParagraphs[curParagraphs.length-1].paragraphs.length;

				var lastParagraph = $(curParagraphs[curParagraphs.length-1].paragraphs[curParagraphs[curParagraphs.length-1].paragraphs.length-1]);
			    	var lastParagraphId = $(lastParagraph).attr("id").split('-')[1];

				objId = lastParagraphId;

				var paragraph = getParagraphs(curParagraphs, objId);

				console.log(lastParagraph);
				console.log(lastParagraphId);
				console.log(paragraph);
				console.log($(paragraph[0]).find("text"));
				console.log($(paragraph[0]).find("text").text());

				if((paragraph.length == 1 && ($(paragraph[0]).find("text").length == 0 || $(paragraph[0]).find("text")[0].innerHTML == "Click")) || (paragraph.length == 1 && isBullet($(paragraph[0]).find("text").text()))) { // empty
				    console.log("here, empty");
				    paragraphId = paragraphIdentifiers[objId][0];

				    storeMapping(objId, 0, paragraphId, true);
				}
				else {
				    console.log("here, not empty");

				    paragraphId = createObjId();
				    storeMapping(objId, paragraph.length, paragraphId, true);
				}
			    	// storeMapping(objId, paragraphCnt-1, paragraphId);

			    }

			    chromeSendMessage("ADDTEXT_SENDTEXT", {
				"text": details.data.text,
				"pageNumber": details.data.pageNumber,
				"startIndex": details.data.startIndex,
				"endIndex": details.data.endIndex,
				"paragraphIdentifier": paragraphId,
				"objId": objId,
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
		    case "HIGHLIGHT_SLIDE_OBJECT_MOUSE_ENTER" :
			issueEvent(document, "highlight_slide_object_mouse_enter", details.data);
			break;
		    case "pdfjs_storeMappingWithCurrentParagraph" :
			issueEvent(document, "pdfjs_storeMappingWithCurrentParagraph", details);
			break;
		    case "pdfjs_updateSlideNumbersOnBoxes" :
			issueEvent(document, "pdfjs_updateSlideNumbersOnBoxes", details);
			break;
		    case "root_changeParagraphIdentifier" :
			issueEvent(document, "root_changeParagraphIdentifier", details);
			break;
		    case "root_sendParagraphIdentifier" :
			issueEvent(document, "root_sendParagraphIdentifier", details);
			break;
		    case "root_appendParagraphIdentifier" :
			issueEvent(document, "root_appendParagraphIdentifier", details);
			break;
		    case "root_replaceParagraphIdentifier" :
			issueEvent(document, "root_replaceParagraphIdentifier", details);
			break;
		    case "root_displayParagraphsCall" :
			issueEvent(document, "root_displayParagraphsCall", details);
			break;
		    case "root_sendSectionTitleToExtension" :
			console.log("??????????");
			issueEvent(document, "root_sendSectionTitleToExtension", details);
			break;
		    case "pdfjs_printInlineSectionHeaders" :
			issueEvent(document, "pdfjs_printInlineSectionHeaders", details);
			break;
	   	    case "root_simulateClick" :
			issueEvent(document, "root_simulateClick", details);
			break;
	   	    case "root_locateObject" :
			issueEvent(document, "root_locateObject", details);
			break;
	   	    case "root_slideNavigatorShownCheck" :
			issueEvent(document, "root_slideNavigatorShownCheck", details);
			break;
	   	    case "root_submitSimilarBarScore" :
			issueEvent(document, "root_submitSimilarBarScore", details);
			break;
		    case "pdfjs_displayParagraphs" :
			issueEvent(document, "pdfjs_displayParagraphs", details);
			break;
		    case "pdfjs_clearParagraphs" :
			issueEvent(document, "pdfjs_clearParagraphs", details);
			break;
		    case "root_sendStyleCurPage" :
			issueEvent(document, "root_sendStyleCurPage", details);
			break;
		    case "root_getCurParagraphForStyling" :
			issueEvent(document, "root_getCurParagraphForStyling", details);
			break;
		}
	    });

	    $(document).on("extension_sendCurParagraphForStyling", function(e) {
		chromeSendMessage("extension_sendCurParagraphForStyling", e.detail);
	    });

	    $(document).on("root_getCurParagraphForStyling", function(e) {
		console.log(lastSelectedParagraph);

		issueEvent(document, "extension_sendCurParagraphForStyling", {
		    objID: lastSelectedParagraph.attr("id").split('-')[1],
		    paragraphNumber: lastSelectedParagraph.attr("id").split('-')[3]
		});
	    });

	    function getTextStyleFromSlideInfo(slideObj, objID, paragraphNumber) {
		console.log(objID);
		console.log(paragraphNumber);

		for(var i=0;i<slideObj.pageElements.length;i++) {
		    console.log(slideObj.pageElements[i]);

		    if(slideObj.pageElements[i].objectId == objID) {
			var text = slideObj.pageElements[i].shape.text;
			var paragraphCnt = 0;

			console.log(text);

			for(var j=0;j<text.textElements.length;j++) {
			    console.log(text.textElements[j]);
			    console.log(paragraphCnt);

			    if("paragraphMarker" in text.textElements[j]) paragraphCnt++;
			    else {
				if(paragraphCnt == paragraphNumber+1) {
				    return text.textElements[j].textRun.style;
				}
			    }
			}
		    }
		}

		return null;
	    }


	    $(document).on("root_sendStyleCurPage", function(e) {
		console.log(curParagraphs);
		console.log(lastSelectedParagraph);
		console.log(lastSelectedParagraph);
		console.log(lastSelectedParagraphObj);
		console.log(lastSelectedParagraphNumber);
		console.log(lastSelectedParagraphIdentifier);

		var objID = lastSelectedParagraphObj.attr("id").split('-')[1];
		var p = e.detail.data;
		console.log(p);

		var myStyle = getTextStyleFromSlideInfo(p, objID, lastSelectedParagraphNumber);

		if(Object.keys(myStyle).length > 0) {
		    // style exist
		    issueEvent(document, "extension_sendStyle", myStyle);
		}
	    });

	    $(document).on("extension_sendStyle", function(e) {
		chromeSendMessage("extension_sendStyle", e.detail);
	    });

	    $(document).on("pdfjs_clearParagraphs", function(e) {
		clearVisualizeParagraphForTransition();
	    });

	    $(document).on("pdfjs_displayParagraphs", function(e) {
		displayParagraphs(curParagraphs, true);
	    });

	    $(document).on("extension_disappearMenuButton", function(e) {
		chromeSendMessage("extension_disappearMenuButton", e.detail);
	    });

	    $(document).on("extension_setMenu", function(e) {
		chromeSendMessage("extension_setMenu", e.detail);
	    });

	    function setInlineSectionSimilarBarHeight(obj, p) {
		if(p <= 0.5) {
		    $(obj).attr("fill", "blue");
		    $(obj).removeAttr("font-weight");
		}
		else {
		    $(obj).attr("fill", "red");
		    $(obj).attr("font-weight", "bold");
		}

		$(obj).html(
			parseInt(100 * p) + ' %'
			);
	    }

	    $(document).on("root_submitSimilarBarScore", function(e) {
		var p = e.detail.data;
		console.log(p);

		$(".punch-filmstrip-thumbnail").find("g[id^='filmstrip-slide-']").each(function(e) {
		    if($(this).attr("id").endsWith(p.pageID)) {
			var root = $(this).parent().parent().parent().parent();

			console.log($(root));
			var inlineSectionSimilarBar = $(root).find(".inlineSectionSimilarBar");

			console.log($(inlineSectionSimilarBar));

			setInlineSectionSimilarBarHeight(inlineSectionSimilarBar, p.total == 0 ? 0 : p.match / p.total);
		    }
		});
//	    $(clonedRectElem2).attr("class", clonedRectElem2Class + " inlineSectionSimilarBar");
	    });

	    $(document).on("extension_updateSimilarBar", function(e) {
		chromeSendMessage("extension_updateSimilarBar", e.detail);
	    });

	    $(document).on("extension_updateNavigationElement", function(e) {
		chromeSendMessage("extension_updateNavigationElement", e.detail);
	    });

	    $(document).on("root_slideNavigatorShownCheck", function(e) {
		slideNavigatorShown = true;
	    });

	    function getPageIDWithObj(objid) {
		var retValue = null;

		$("g[id^='filmstrip-slide-']").each(function() {
		    var id = $(this).attr("id");

		    if(id.endsWith(objid)) {
			retValue = $(this).parent().attr("id").split('-')[3];
			return;
		    }
		});

		return retValue;
	    }

	    $(document).on("root_locateObject", function(e) {
		var p = e.detail.data;

		var objID = p.objID;
		var paragraphNumber = p.paragraphNumber;
		var pageID = getPageIDWithObj(objID);
	
		console.log(pageID);
		console.log(p);

		locateObject(pageID, objID, paragraphNumber);
	    });

	    function getFirstObject(curPageID) {
		var retValue = null;
		$("#editor-" + curPageID).find("g[id^='editor-']").each(function(e) {
		    if(retValue == null && !($(this).attr("id").endsWith("bg"))) {
			retValue = $(this);
			return;
		    }
		});

		return retValue;
	    }

	    function locateObject(pageID, objID, paragraphNumber) {
		if(pageID == null && objID == null) {
		    var curPage = getPageID();
		    var paragraphNumber = 0;
		    var obj = getFirstObject(curPage);
		    console.log($(obj));

		    getSlideObjectForHighlight($(obj).attr("id") + '-paragraph-' + paragraphNumber);

		    issueEvent(document, "extension_updateNavigationElement", {
			id: $(obj).attr("id") + '-paragraph-' + paragraphNumber
		    });
		}
		else {
		    console.log(pageID, objID, paragraphNumber);
		    console.log(objID + '-paragraph-' + paragraphNumber);
		    console.log($("#editor-" + objID + '-paragraph-' + paragraphNumber));

		    var curPage = getPageID();

		    transit(pageID);
		    objectToHighlight = "editor-" + objID + '-paragraph-' + paragraphNumber;

		    console.log(objectToHighlight);

		    console.log(curPage);

		    if(curPage == pageID) {
			getSlideObjectForHighlight("editor-" + objID + '-paragraph-' + paragraphNumber);
			objectToHighlight = null;
		    }
		    // getSlideObjectForHighlight("editor-" + objID + '-paragraph-' + paragraphNumber);
		}
	    }

	    $(document).on("click", function(e) {
		console.log("clickeD!");
		console.log(e.pageX + ' ' + e.pageY);
		console.log(e);

		var screenX = parseFloat(window.screenX + 50);
		var screenY = parseFloat(window.screenY + 50);
	    });

	    $(document).on("root_simulateClick", function(e) {
		var p = e.detail.data;
		console.log("simulateClick");
/*
		var screenX = parseFloat(window.screenX + 50);
		var screenY = parseFloat(window.screenY + 50);

		systemMouseCoorInfo.screenX = screenX;
		systemMouseCoorInfo.screenY = screenY;
		systemMouseCoorInfo.clientX = 10;
		systemMouseCoorInfo.clientY = 10;

		console.log(systemMouseCoorInfo);*/

		clickSystemMouse(p);
	    });

	    $(document).on("extension_showSlideNavigator", function(e) {
		chromeSendMessage("extension_showSlideNavigator", e.detail);
	    });

	    $(document).on("pdfjs_printInlineSectionHeaders", function(e) {
		var p = e.detail;
		console.log(e.detail);

		addSectionHeadersOnFilmstrip(p.data);
	    });

	    $(document).on("extension_getInlineSectionHeaders", function(e) {
		chromeSendMessage("extension_getInlineSectionHeaders", e.detail);
	    });

	    $(document).on("extension_getSectionStructure", function(e) {
		var p = e.detail;

		chromeSendMessage("extension_getSectionStructure", p);
	    });

	    $(document).on("root_sendSectionTitleToExtension", function(e) {
		var p = e.detail.data;

		sectionStructure = p;

		for(var i=0;i<p.sectionStructure.length;i++) {
		    appendOutlineTaskRow(p.sectionStructure[i].text, i);
		}
	    });

	    $(document).on("root_displayParagraphsCall", function(e) {
		displayParagraphs(curParagraphs, false);
	    });

	    $(document).on("extension_confirmPutParagraph", function(e) {
		var p = e.detail;

		chromeSendMessage("extension_confirmPutParagraph", p);
	    });

	    $(document).on("extension_requestSlideNumberUpdate", function(e) {
		var p = e.detail;

		chromeSendMessage("extension_requestSlideNumberUpdate", p);
	    });

	    $(document).on("extension_putSlideNumberOnBoxes", function(e) {
		var p = e.detail;

		chromeSendMessage("extension_putSlideNumberOnBoxes", p);
	    });

	    $(document).on("pdfjs_updateSlideNumbersOnBoxes", function(e) {
		console.log("OBJ ID");
		console.log(e.detail.data.objID);
		console.log(e.detail.data.boxID);
		var slideNumber = getSlideNumber(e.detail);

		console.log(slideNumber);
		console.log(e.detail);

		if(slideNumber != -1) {
		    issueEvent(document, "extension_putSlideNumberOnBoxes", {
			boxID: e.detail.data.boxID,
			slideNumber: slideNumber
		    });
		}
	    });

	    $(document).on("root_replaceParagraphIdentifier", function(e) {
		var p = e.detail.data;

		console.log(p);

		paragraphReplacedObjId = p.objId;
		paragraphReplacedParagraphId = p.paragraphId;
		paragraphReplacedParagraphNumber = p.paragraphNumber;
	    });

	    $(document).on("root_appendParagraphIdentifier", function(e) {
		var p = e.detail.data;

		console.log(paragraphIdentifiers[p.objId]);
		console.log(p);

		paragraphAddedObjId = p.objId;
		paragraphAddedParagraphId = p.paragraphId;
/*
		if(!(p.objId in paragraphIdentifiers)) {
		    paragraphIdentifiers[p.objId] = [p.paragraphId];
		}
		else {
		    paragraphIdentifiers[p.objId].push(p.paragraphId);
		}*/
	    });

	    $(document).on("root_sendParagraphIdentifier", function(e) {
		console.log("I'M here!");
		var p = e.detail.data;
		console.log(paragraphIdentifiers);

		var paragraphNumber = parseInt(p.paragraphNumber)
		if(!(p.objId in paragraphIdentifiers)) {
		    paragraphIdentifiers[p.objId] = [];
		}

		while(paragraphIdentifiers[p.objId].length <= paragraphNumber) {
		    paragraphIdentifiers[p.objId].push('');
		}

		if(paragraphIdentifiers[p.objId][paragraphNumber] != p.paragraphId) {
			paragraphIdentifiers[p.objId][paragraphNumber] = p.paragraphId;
			displayParagraphs(curParagraphs, false);
		}

		console.log(p);
		console.log(paragraphIdentifiers);
	    });

	    $(document).on("root_changeParagraphIdentifier", function(e) {
		var p = e.detail.data;

		console.log(e);
		console.log(p);

		paragraphIdentifiers[p.objId][parseInt(p.paragraphNumber)] = p.paragraphId;

		displayParagraphs(curParagraphs, false);
	    });

	    $(document).on("pdfjs_storeMappingWithCurrentParagraph", function(e) {
		console.log("hi there");

		console.log(selectedBoxID);
		console.log(selectedParagraph);
		console.log(selectedParagraphObj);
		console.log(selectedPage);
		console.log(selectedParagraphNumber);
		console.log(selectedParagraphIdentifier);

		console.log(clickedElements);
		console.log(curParagraphs);

	    });
	    $(document).on("highlight_slide_object_mouse_enter", function(e) {
		console.log(e.detail);
		console.log($("#" + e.detail.slideObjId));

		var objectId = e.detail.slideObjId;

		getSlideObjectForHighlight(objectId);
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

	/// 	systemTurn = true;
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
		// getSlideObjectForHighlight(e.detail);
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

		if(p.keyCode == 40) { // tab : 9
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
			    paragraphAutocompleteIdentifier: createObjId(),
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
	    if(document.getElementById("filmstrip") != null) {
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
		issueEvent(document, "getParagraphMapping", null);
	    }
	}

	$(".panel-right").append(
		'<div id="testDiv"> test test </div>'
		);

	$("#testDiv").css("position", "absolute");
	$("#testDiv").html("haha");
	$("#testDiv").css("left", 0);
	$("#testDiv").css("top", 0);

	/*
	$(".filmstrip").mousedown(function(e) {
	    console.log("mousedown");
	});

	$(".filmstrip").mouseup(function(e) {
	    console.log("mouseup");
	});

	$(".filmstrip").mousemove(function(e) {
	    console.log("mousemove");
	});
	*/

    });

    /*
       $(window).on("inverse", function() {
       console.log($(".filmstrip"));

       $(".filmstrip").before($(".panel-right"));

       console.log("--inverse--");
       console.log(this);
       });*/


