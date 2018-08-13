function click(e) {
	chrome.tabs.executeScript(null, {code:"document.body.style.backgroundImage='url(" + images[e.target.id] + "'"});

	chrome.extension.getBackgroundPage().console.log('yya');

	window.close();
}

document.addEventListener('DOMContentLoaded', function() {
		var divs = document.querySelectorAll('div');

		for(var i=0;i<divs.length;i++) {
			divs[i].addEventListener('click', click);
		}

		chrome.extension.getBackgroundPage().console.log('foo');
});

var images = {
	joe: 'https://cloud.fullstackacademy.com/joe_alves.jpg',
	kate: 'https://cloud.fullstackacademy.com/kate.png'
}

