var backgroundPage = chrome.extension.getBackgroundPage(),
	popupRenderManager = null,
	communicationManager = null,
	popupInteractionManager = null,
	searchManager = null;
{
	initiateManagers();
	$(".icon-search").click(function()
	{
		$(".icon-search").toggleClass("icon-search-right");
		$(".searchField").toggleClass("hiddenSearch");
		$(".searchField").focus();
	});
	popupRenderManager.initRender()
}

function initiateManagers()
{
	popupRenderManager = new PopupRenderManager();
	popupInteractionManager = new PopupInteractionManager();
	communicationManager = new CommunicationManager();
}

function PopupRenderManager()
{
	this.listViewHolder = document.getElementById('showList');
	this.dataSource = null;
	this.numAttempts = 0;
	this.initRender = function()
	{
		communicationManager.sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
	}
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
	this.renderDataSource = function()
	{
		var showObjects = popupRenderManager.dataSource;
		popupRenderManager.listViewHolder.innerHTML = "";  //Removing all other names
		for(i=0; i<showObjects.length; i++)
		{
			popupRenderManager.listViewHolder.appendChild(popupRenderManager.createShowListItem(showObjects[i].showTitle, showObjects[i].isNew, showObjects[i].showCover, showObjects[i].watchURL));
		}
		communicationManager.sendMessage(backgroundPage.CONSTANTS.NEW_SHOWS_COUNT_QUERY); 
	}
	this.createShowListItem = function(showTitle, isNew, showCover, watchURL)
	{
		var showDiv = document.createElement('div'),
			clickHandler,
			hoverInHandler,
			hoverOutHandler,
			cover,
			nameDiv;
		if(isNew)
		{
			showDiv.style.border="1px solid rgb(248,248,6)";
		}
		showDiv.setAttribute("class","showDiv");
		cover = document.createElement('img');
		cover.setAttribute('src', showCover);
		cover.setAttribute('class','showCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = popupRenderManager.formatShowTitle(showTitle);
		nameDiv.setAttribute('class','showName');
		showDiv.appendChild(cover);
		showDiv.appendChild(nameDiv);
		clickHandler = popupInteractionManager.getShowRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+watchURL);
		hoverInHandler = popupInteractionManager.getShowRowHoverInHandler();
		hoverOutHandler = popupInteractionManager.getShowRowHoverOutInHandler();
		showDiv.addEventListener('click',clickHandler);
		showDiv.addEventListener('mouseover', hoverInHandler);
		showDiv.addEventListener('mouseout', hoverOutHandler);
		return showDiv;
	}
	this.formatShowTitle = function(showTitle)
	{
		var formattedTitle = "",
			seasonIndex = showTitle.indexOf("Season"),
			episodeIndex = showTitle.indexOf("Episode"),
			title = showTitle.substring(0,seasonIndex),
			season = showTitle.substring(seasonIndex, episodeIndex),
			episode = showTitle.substring(episodeIndex);
		formattedTitle = "<b>"+title+"</b><br>"+season+"<br>"+episode;
		return formattedTitle;

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
	this.getShowRowHoverInHandler = function()
	{
		return function(e)
		{
			e.currentTarget.children[1].style.bottom = "0";
		}
	}
	this.getShowRowHoverOutInHandler = function()
	{
		return function(e)
		{
			e.currentTarget.children[1].style.bottom = "-112px";
		}
	}
}

function CommunicationManager()
{
	this.sendMessage = function(msgType)
	{
		var msgObject = new Object();
		msgObject.messageType = msgType;
		chrome.extension.sendRequest(msgObject, function(response)
		{
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
			if(response.messageType == backgroundPage.CONSTANTS.NEW_SHOWS_COUNT_RESPONSE)
			{
				if(response.count > 0)
				{
					backgroundPage.cookieManager.setCookie(popupRenderManager.dataSource);
					communicationManager.sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS);
				}
			}
		});
	}
}
