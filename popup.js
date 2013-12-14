var backgroundPage = chrome.extension.getBackgroundPage(),
	popupRenderManager = null,
	communicationManager = null,
	popupInteractionManager = null,
	searchManager = null;
{
	initiateManagers();
	popupRenderManager.initRender();
}

function initiateManagers()
{
	popupRenderManager = new PopupRenderManager();
	popupInteractionManager = new PopupInteractionManager();
	communicationManager = new CommunicationManager();
	searchManager = new SearchManager();
}

function PopupRenderManager()
{
	this.listViewHolder = document.getElementById("showList");
	this.searchResultsHolder = document.getElementById("searchResults")
	this.dataSource = null;
	this.numAttempts = 0;
	this.dataSourceType = "";
	this.initRender = function()
	{
		communicationManager.sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
		popupRenderManager.dataSourceType = "latest";
	}
	this.renderOnDataReady = function()
	{
		popupRenderManager.fetchAutocompleteData();
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
		var showObjects = popupRenderManager.dataSource,
			showPref = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF);
		popupRenderManager.listViewHolder.innerHTML = "";
		popupRenderManager.searchResultsHolder.innerHTML = "";
		if(popupRenderManager.dataSourceType == "latest")
		{
			if(showPref)
			{
				showPref = showPref.split("--");
			}
			for(var i=0; i<showPref.length; i++)
			{
				var div = popupRenderManager.createShowElement(showPref[i]);
				popupRenderManager.listViewHolder.appendChild(div);
				var episodeContainer = document.createElement("div");
				episodeContainer.className = "episodeContainer";
				for(var j=0; j<showObjects.length; j++)
				{
					if(showPref[i].indexOf(showObjects[j].showTitle) >=0 ) //TODO: Need to change this
					{
						episodeContainer.appendChild(popupRenderManager.createEpisodeElement(showObjects[j]));
						if(showObjects[j].isNew)
						{
							popupRenderManager.listViewHolder.lastChild.className += " newArrival";
						}
					}
				}
				popupRenderManager.listViewHolder.appendChild(episodeContainer);
			}
			communicationManager.sendMessage(backgroundPage.CONSTANTS.NEW_SHOWS_COUNT_QUERY); 
		}
		else if(popupRenderManager.dataSourceType == "search")
		{
			var numSeasons = Object.keys(showObjects).length;
			popupRenderManager.searchResultsHolder.appendChild(popupRenderManager.createShowElement(searchManager.currentShowName));
			var seasonContainer = document.createElement("div");
			seasonContainer.className = "seasonContainer";
			for(var i=0; i<=numSeasons; i++)
			{
				var seasonKey = "Season "+(i)
				var episodeObjects = showObjects[seasonKey];
				if(!episodeObjects)
				{
					continue;
				}
				seasonContainer.appendChild(popupRenderManager.createSeasonElement(seasonKey));
				var episodeContainer = document.createElement("div");
				episodeContainer.className = "episodeContainer";
				for(var j=0; j<episodeObjects.length; j++)
				{
					episodeObjects[j].seasonNumber = i;
					episodeContainer.appendChild(popupRenderManager.createEpisodeElement(episodeObjects[j]));
				}
				seasonContainer.appendChild(episodeContainer);	
			}
			popupRenderManager.searchResultsHolder.appendChild(seasonContainer);
			$("#goBack").removeClass("hiddengobackholder");
			$(".searchField").val("");
			popupRenderManager.searchResultsHolder.parentNode.style.left="-350px";
		}
	}
	this.createShowElement = function(title)
	{
		var div = document.createElement("div");
		div.className = "show";
		var statusIcon = document.createElement('i');
		statusIcon.className = "icon-chevron-up icon-white statusIndicator";
		statusIcon.style.marginTop = "28px";
		var showTitle = document.createElement('div');
		showTitle.className = "showTitle";
		showTitle.innerText = title;
		var showCover = document.createElement("img");
		showCover.className = "showCover";
		showCover.src = backgroundPage.contentManager.getImageForShow(title);
		div.appendChild(statusIcon);
		div.appendChild(showCover);
		div.appendChild(showTitle);
		div.onclick  = function(e){$(e.currentTarget).next().slideToggle(); $(e.currentTarget.firstChild).toggleClass("statusIndicatorOpen");};
		div.style.cursor = "default";
		return div;
	}
	this.createSeasonElement = function(seasonKey)
	{
		var season = document.createElement("div");
		season.className = "season";
		var seasonTitle = document.createElement('div');
		seasonTitle.className = "seasonTitle";
		seasonTitle.innerText = seasonKey;
		var statusIcon = document.createElement('i');
		statusIcon.className = "icon-chevron-up icon-white statusIndicator";
		statusIcon.style.marginTop = "11px";
		season.appendChild(statusIcon);
		season.appendChild(seasonTitle);
		season.onclick = function(e){$(e.currentTarget).next().slideToggle(); $(e.currentTarget.firstChild).toggleClass("statusIndicatorOpen");};
		return season;
	}
	this.createEpisodeElement = function(showObject)
	{
		var showDiv = document.createElement('div'),
			clickHandler,
			hoverInHandler,
			hoverOutHandler,
			cover,
			nameDiv;
		/*if(showObject.isNew)
		{
			showDiv.style.border="1px solid rgb(248,248,6)";
		}
		showDiv.setAttribute("class","showDiv");
		cover = document.createElement('img');
		cover.setAttribute('src', showObject.showCover);
		cover.setAttribute('class','showCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = "<b>"+showObject.showTitle+"</b><br>Season: "+showObject.seasonNumber+"<br>Episode: "+showObject.episodeNumber;
		nameDiv.setAttribute('class','showName');
		showDiv.appendChild(cover);
		showDiv.appendChild(nameDiv);
		clickHandler = popupInteractionManager.getShowRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+showObject.watchURL);
		hoverInHandler = popupInteractionManager.getShowRowHoverInHandler();
		hoverOutHandler = popupInteractionManager.getShowRowHoverOutInHandler();
		showDiv.addEventListener('click',clickHandler);
		showDiv.addEventListener('mouseover', hoverInHandler);
		showDiv.addEventListener('mouseout', hoverOutHandler);
		return showDiv;*/
		//showDiv.innerText = "Season "+showObject.seasonNumber + ", Episode " + showObject.episodeNumber;
		showDiv.innerText = "S"+showObject.seasonNumber+"E"+showObject.episodeNumber +" "+showObject.episodeName;
		showDiv.className = "episode";
		if(showObject.isNew)
		{
			showDiv.className += " newArrival";
		}
		clickHandler = popupInteractionManager.getShowRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+showObject.watchURL);
		showDiv.addEventListener('click',clickHandler);
		return showDiv;
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
	this.fetchAutocompleteData = function()
	{
		var availableTags = backgroundPage.contentManager.getPrimewireTVObj();

		$("#tvShowListPopup").typeahead({
			source: availableTags,
			items: 10,
			minLength: 2
		});
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
	$("#searchBtn").click(function(e)
	{
		e.preventDefault();
		var text = $("#tvShowListPopup").val();
		if(text)
		{
			searchManager.searchEpisodeListingForShow(text);
		}
	});
	$("#showSearch").click(function()
	{
		$(".form-search").toggleClass("hiddenSearch");
		$(".searchField").focus();
	});
	$("#openOptions").click(function()
	{
		chrome.tabs.create({url:"options.html"});
	});
	$("#removeSearch").click(function()
	{
		$(".form-search").toggleClass("hiddenSearch");
	});
	$("#goBack").click(function()
	{
		popupRenderManager.dataSourceType = "latest";
		popupRenderManager.dataSource = backgroundPage.contentManager.getShows();;
		popupRenderManager.renderDataSource();
		popupRenderManager.listViewHolder.parentNode.style.left = "0px";
		$("#goBack").addClass("hiddengobackholder");
	});
	$("#showInfo").click(function()
	{
		$(".icon-info-sign").toggleClass('icon-white');
		if($("#infoPanel").css('opacity') == '0')
		{
			$("#infoPanel").css('opacity','1');
			$("#infoPanel").css('left','2px');	
		}
		else
		{
			$("#infoPanel").css('opacity','0');
			$("#infoPanel").css('left','-350px');
		}
	});
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
				console.log("IS_DATA_READY_RESPONSE: "+response);
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
					//backgroundPage.cookieManager.setCookie(popupRenderManager.dataSource);
					backgroundPage.localStorageManager.setLocalStorageValue(backgroundPage.CONSTANTS.LAST_SEEN_SHOWS_VALUE, popupRenderManager.dataSource);
					communicationManager.sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS);
				}
			}
		});
	}
	this.sendXMLRequest = function(url, responseHandler)
	{
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		request.onreadystatechange = this.getResponseHandler(request, responseHandler);
		request.send();
		//this.requests.push(request);
	}
	this.getResponseHandler = function(req, responseHandler)
	{
		return function()
		{
			if(req.readyState == 4 && req.status == 200)
			{
				if(responseHandler)
				{
					responseHandler(req, req.responseText);
					//communicationManager.requests.splice(communicationManager.requests.indexOf(req),1);
				}
			}
			else if(req.status == 0 || req.status >= 400)
			{
				//communicationManager.requests.splice(communicationManager.requests.indexOf(req),1);
			}
		}
	}
	this.handleEpisodeRequestResponse = function(request, responseText)
	{
		var doc = document.implementation.createHTMLDocument("episodes"), episodesParent, episodesList, subListOfEpisodes;
		doc.documentElement.innerHTML = responseText;

		episodesParent = doc.getElementById("first");
		episodesList = episodesParent.getElementsByClassName("tv_container");

		for(var i=0; i<episodesList.length; i++)
		{
			subListOfEpisodes = episodesList[i].children;
			var pointerToSeason = "";

			for(var j=0; j<subListOfEpisodes.length;j++)
			{
				var element = subListOfEpisodes[j];
				
				if(element.tagName == "H2")
				{
					pointerToSeason = element.textContent;
					searchManager.currentEpisodeListing[pointerToSeason] = [];
				}
				else
				{
					fullEpisodeName = element.textContent;
					fullEpisodeName = fullEpisodeName.replace(/\s+/g, ' ');
					var patt = new RegExp('\\w+\\s[\\d]+');
					episodeNumber = patt.exec(fullEpisodeName)[0].split(" ");
					episodeNumber = episodeNumber[episodeNumber.length-1];
					patt = new RegExp('-[\\d\\D]*');
					tempMatch = patt.exec(fullEpisodeName);
					if(tempMatch != null)
					{
						episodeName = tempMatch[0];
						episodeName = episodeName.trim().slice(2);
					}
					else
					{
						episodeName = pointerToSeason+" Episode "+episodeNumber;
					}
					var watchURL = element.children[0].getAttribute("href");
					tempObject = {"episodeNumber":episodeNumber, "episodeName":episodeName, "watchURL":watchURL};
					searchManager.currentEpisodeListing[pointerToSeason].push(tempObject);
				}
			}
		}
		/**This is where we call to render the search results**/
		popupRenderManager.dataSource = searchManager.currentEpisodeListing;
		popupRenderManager.renderDataSource();
		$("#removeSearch").trigger("click");
	}
}

function SearchManager()
{
	this.SEASON_KEY = "Season ";
	this.currentShowName = null;
	this.currentEpisodeListing = {};	//Populated in handleEpisodeRequestResponse

	this.searchEpisodeListingForShow = function(tvShowName)
	{
		this.currentEpisodeListing = {};
		var tvShowURL = backgroundPage.contentManager.getUrlForShow(tvShowName);
		if(tvShowURL)
		{
			communicationManager.sendXMLRequest(backgroundPage.CONSTANTS.HOME_URL+tvShowURL, communicationManager.handleEpisodeRequestResponse);
			this.currentShowName = tvShowName;
			popupRenderManager.dataSourceType = "search";
		}
		else
		{
			//Show some error message
			alert("Could not find anything.");
		}
	}
	this.getNumberOfSeasons = function()
	{
		return Object.keys(searchManager.currentEpisodeListing).length;
	}
	this.getNumberOfEpisodesInSeason = function(season)
	{
		return this.currentEpisodeListing[this.SEASON_KEY+season].length;
	}
}
