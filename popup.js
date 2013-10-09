/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	popupRenderManager = null,
	popupInteractionManager = null;
{
	initiateManagers();
	popupRenderManager.initRender()
}

function initiateManagers()
{
	popupRenderManager = new PopupRenderManager();
	popupInteractionManager = new PopupInteractionManager();
}

function sendMessage(msgType, languageName)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.CONSTANTS.RESET_NEW_FLAGS)
	{
		//msgObject.language = languageName;
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.CONSTANTS.NEW_FLAGS_RESET_DONE)
		{
			//popupRenderManager.removeLanguageControlBadge(languageName);
		}
		if(response.messageType == backgroundPage.CONSTANTS.IS_DATA_READY_RESPONSE)
		{
			if(response.status)
			{
				popupRenderManager.renderOnDataReady();
			}
			else
			{
				popupRenderManager.setTimeoutOnDataNotReady();
			}
		}
	});
}

function PopupRenderManager()
{
	this.listViewHolder = document.getElementById('showList').childNodes[0];
	this.dataSource = null;
	this.numAttempts = 0;
	this.renderOnDataReady = function()
	{
		popupRenderManager.hideProgressIndicator();
		if(!backgroundPage)
		{
			backgroundPage = chrome.extension.getBackgroundPage();	
		}
		this.dataSource = backgroundPage.contentManager.getShows();
		setTimeout(popupRenderManager.renderDataSource,250);
	}
	this.setTimeoutOnDataNotReady = function()
	{
		popupRenderManager.showProgressIndicator();
		if(this.numAttempts++ < 15)
			setTimeout(popupRenderManager.initRender, 1000);
		else
			popupRenderManager.showProgressFailure();
	}
	this.initRender = function()
	{
		sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
	}
	this.renderDataSource = function(movieItemsSource)
	{
		var titleTable,
			showObjects = popupRenderManager.dataSource;
		popupRenderManager.listViewHolder.innerHTML = "";  //Removing all other names
		for(i=0; i<showObjects.length; i++)
		{
			popupRenderManager.listViewHolder.appendChild(popupRenderManager.createShowListItem(showObjects[i].showTitle, showObjects[i].isNew, showObjects[i].showCover, showObjects[i].watchURL));
		} 
		if(backgroundPage.newShowsCnt>0)
		{	
			backgroundPage.cookieManager.setCookie(popupRenderManager.dataSource);
			sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS);
		}	
	}
	this.createShowListItem = function(showTitle, isNew, showCover, watchURL)
	{
		var tr = document.createElement('tr');
		if(isNew)
		{
			tr.setAttribute('class','warning');
		}
		var holderDiv = document.createElement('div');
		td = document.createElement('td');
		cover = document.createElement('img');
		cover.setAttribute('src', showCover);
		cover.setAttribute('class','listMovieCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = showTitle;
		nameDiv.setAttribute('class','movieNameDiv');
		holderDiv.appendChild(cover);
		holderDiv.appendChild(nameDiv);
		td.appendChild(holderDiv);
		td.style.minWidth = "355px";
		tr.appendChild(td);
		tr.style.cursor = 'pointer';
		clickHandler = popupInteractionManager.getShowRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+watchURL);
		tr.addEventListener('click',clickHandler);
		return tr;
	}
	this.hideProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'none';	
		}
	}
	this.showProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'block';
		}
	}
	this.showProgressFailure = function()
	{
		$("#progressIndicatorDiv").css('display','none');
		$("#progressFail").css('display','block');
	}
	this.showAlertBox = function(message)
	{
		$("#alertTextHolder").text(message);
		$("#alertBox").css({'opacity':'1','pointer-events':'all'});
	}
	this.dismissAlertBox = function()
	{
		$("#alertBox").css({'opacity':'0','pointer-events':'none'});
	}
}

function PopupInteractionManager()
{
	this.getShowRowClickHandler = function(url)
	{
		return function()
		{
			chrome.tabs.create({"url":url},function(){});
		}
	}
}