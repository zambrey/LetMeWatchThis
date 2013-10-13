/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var contentManager = null,
	preferencesManager = null,
	cookieManager = null,
	communicationManager = null,
	CONSTANTS = null,
	lastUpdated = -1,
	REFRESH_INTERVAL = 3*60*60*1000; //Three hour

{
	initiateManagers();
	setTimeout(initiate,8000);
}

function initiateManagers()
{
	contentManager = new ContentManager();
	preferencesManager = new PreferencesManager();
	cookieManager = new CookieManager();
	communicationManager = new CommunicationManager();
	CONSTANTS = new constants();
}

function constants()
{
	//CONSTANT VALUES
	this.HOME_URL = "http://www.primewire.ag/";
	this.QUERY_PATH = "?tv";

	//PREFERENCE RELATED CONSTANTS
	this.REFRESH_TIME_VAL_PREF = "refreshTimeValPref";
	this.REFRESH_TIME_UNIT_PREF = "refreshTimeUnitPref";
	this.DEFAULT_REFRESH_TIME_VALUE = "3";
	this.DEFAULT_REFRESH_TIME_UNIT = "Hours";

	//INTER-SCRIPT COMMUNICATION KEYS
	this.RESET_NEW_FLAGS = "resetNewFlags";
	this.INITIATE_AGAIN = "initiateAgain";
	this.NEW_FLAGS_RESET_DONE = "newFlagsReset";
	this.INITIATED = "initiated";
	this.IS_DATA_READY_QUERY = "isDataReadyQuery";
	this.IS_DATA_READY_RESPONSE = "isDataReadyResponse"
}

function initiate()
{
	contentManager.isDataReady = false;
	communicationManager.sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH, communicationManager.handleXMLRequestResponse);
	setTimeout(initiate, communicationManager.getRefreshInterval());
}

/*Communication Manager*/
function CommunicationManager()
{
	this.sendXMLRequest = function(url, responseHandler)
	{
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		request.onreadystatechange = this.getResponseHandler(request, responseHandler);
		request.send();
	}
	this.handleXMLRequestResponse = function(request, responseText)
	{
		contentManager.resetShows();
		var doc = document.implementation.createHTMLDocument("shows"), showsParent, showsList, show, showObject, title, cover, link;
		doc.documentElement.innerHTML = responseText;
		showsParent = doc.getElementById("slide-runner")
		showsList = showsParent.children;
		for(i=0; i<showsList.length; i++)
		{
			if(showsList[i].tagName == "A" || showsList[i].tagName == "a")
			{
				show = showsList[i];
				title = show.getAttribute("title").substring(6);
				cover = show.firstChild.getAttribute("src");
				link = show.getAttribute("href");
				contentManager.addShow(new ShowObject(title, cover, link));	
			}
			
		}
		setTimeout(communicationManager.updateCompleted, 1000);
	}
	this.updateCompleted = function()
	{
		contentManager.isDataReady = true;
		contentManager.areThereNewShows();
		lastUpdated = new Date().getTime();
		setBadge();
		communicationManager.sendMessage(CONSTANTS.INITIATED);
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
				}
			}
			else if(req.status == 0 || req.status >= 400)
			{
				//requests.splice(requests.indexOf(req),1);
			}
		}
	}
	this.getRefreshInterval = function()
	{
		var refreshTimeVal = parseInt(preferencesManager.getPreferenceValue(CONSTANTS.REFRESH_TIME_VAL_PREF)),
			refreshTimeUnit = preferencesManager.getPreferenceValue(CONSTANTS.REFRESH_TIME_UNIT_PREF),
			refreshInterval = 0;
		if(!refreshTimeVal || !refreshTimeUnit)
		{
			refreshInterval = REFRESH_INTERVAL;
			preferencesManager.setPreferenceValue(CONSTANTS.REFRESH_TIME_VAL_PREF, CONSTANTS.DEFAULT_REFRESH_TIME_VALUE);
			preferencesManager.setPreferenceValue(CONSTANTS.REFRESH_TIME_UNIT_PREF, CONSTANTS.DEFAULT_REFRESH_TIME_UNIT);
		}
		else
		{
			refreshInterval = refreshTimeVal * 1000;
			if(refreshTimeUnit == "Minutes")
			{
				refreshInterval = refreshInterval * 60;
			}
			if(refreshTimeUnit == "Hours")
			{
				refreshInterval = refreshInterval * 60 * 60;
			}
		} 
		return refreshInterval;	
	}	
	this.sendMessage = function(msgType)
	{
		var msgObject = new Object();
		msgObject.messageType = msgType;
		chrome.extension.sendRequest(msgObject, function(response){});
	}
	chrome.extension.onRequest.addListener(
		function(request, sender, sendResponse) {
			if (request.messageType == CONSTANTS.RESET_NEW_FLAGS)
			{
				resetNewFlags();
				sendResponse({messageType: CONSTANTS.NEW_FLAGS_RESET_DONE});
			}
			if(request.messageType == CONSTANTS.INITIATE_AGAIN)
			{
				initiate();
			}
			if(request.messageType == CONSTANTS.IS_DATA_READY_QUERY)
			{
				sendResponse({messageType: CONSTANTS.IS_DATA_READY_RESPONSE, status: contentManager.isDataReady});
				if(!contentManager.isDataReady && lastUpdated != -1 && requests.length == 0)
				{
					var diff = new Date().getTime() - lastUpdated;
					if(diff >= communicationManager.getRefreshInterval())
					{
						initiate();
					}	
				}
			}	
		}
	);
}

/*Content Manager*/
function ContentManager()
{
	this.shows = [];
	this.newShowsCnt = 0;
	this.isDataReady = false;
	this.resetShows = function()
	{
		this.shows = [];
	}
	this.addShow = function(show)
	{
		this.shows.push(show);
	}
	this.getShows = function()
	{
		return this.shows;
	}
	this.setShows = function(shows)
	{
		this.shows = shows;
	}
	this.areThereNewShows = function()
	{
		cookieManager.getCookie(contentManager.compareAgainstCookie);
	}
	this.compareAgainstCookie = function(showsCookie)
	{
		var showsArray = contentManager.getShows();
		if(!showsCookie)
		{
			contentManager.newShowsCnt += showsArray.length;
			for(i=0; i<showsArray.length; i++)
			{
				showsArray[i].isNew = true;
			}
		}
		else
		{
			for(i=0; i<showsArray.length; i++)
			{
				var showTitle = showsArray[i].showTitle;
				if(showsCookie.indexOf(showTitle) < 0)
				{
					contentManager.newShowsCnt++;
					showsArray[i].isNew = true;
				}
				else
				{
					break;
				}
			}	
		}
	}
	this.resetNewFlags = function()
	{
		var showsList = contentManager.getShows();
		contentManager.newShowsCnt = 0;
		for(i=0; i<showsList.length; i++)
		{
			showsList[i].isNew = false;
		}
		setBadge();
	}
}

/*Preferences Manager*/
function PreferencesManager()
{
	this.REFRESH_TIME_VALUE_KEY = "refreshTimeVal";
	this.REFRESH_TIME_UNIT_KEY = "refreshTimeUnit";
	this.VIEW_STYLE_KEY = "viewStyle";
	this.getPreferenceValue = function(preferenceType)
	{	
		return localStorage.getItem(this.getLocalStorageKeyForPreferenceType(preferenceType));
	}
	this.setPreferenceValue = function(preferenceType, preferenceValue)
	{
		localStorage.setItem(this.getLocalStorageKeyForPreferenceType(preferenceType),preferenceValue);
	}
	this.getLocalStorageKeyForPreferenceType = function(preferenceType)
	{
		var prefKey = null;
		if(preferenceType == CONSTANTS.REFRESH_TIME_VAL_PREF)
		{
			prefKey = this.REFRESH_TIME_VALUE_KEY;
		}
		else if(preferenceType == CONSTANTS.REFRESH_TIME_UNIT_PREF)
		{
			prefKey = this.REFRESH_TIME_UNIT_KEY;
		}
		else if(preferenceType == CONSTANTS.VIEW_STYLE_PREF)
		{
			prefKey = this.VIEW_STYLE_KEY;
		}
		return prefKey;
	}
}

/*Cookie Manager*/
function CookieManager()
{
	this.cookieValidDuration = 60*60*24*30*12;
	this.cookieKey = "pw-tv-shows";
	this.getCookie = function(cookieHandler)
	{
		var details = new Object(), oldShows = null;
		details.url = CONSTANTS.HOME_URL;
		details.name = this.cookieKey;
		chrome.cookies.get(details, function(cookie){
			if(cookie)
			{
				oldShows = cookieManager.processBeforeReturningCookie(cookie.value);
			}
			if(cookieHandler)
			{
				cookieHandler(oldShows)
			}
		});
		return oldShows;
	}
	this.setCookie = function(cookieValue)
	{
		var details = new Object();
		details.url = CONSTANTS.HOME_URL;
		details.name = cookieManager.cookieKey;
		details.value = this.processBeforeSettingCookie(cookieValue);
		details.expirationDate = (new Date().getTime()/1000) + this.cookieValidDuration;
		chrome.cookies.remove({"url":CONSTANTS.HOME_URL,"name":details.name});
		chrome.cookies.set(details);
	}
	this.processBeforeReturningCookie = function(cookieString)
	{
		var oldMovieTitles,oldMovies;
		if(cookieString)
		{
			oldMovieTitles = new Array()
			oldMovies = cookieString.split('--');
			for(i=0; i<oldMovies.length; i++)
			{
				oldMovieTitles.push(oldMovies[i]);
			}
		}
		return oldMovieTitles;
	}
	this.processBeforeSettingCookie = function(cookieValue)
	{
		var cookieString = '';
		for(i=0; i<cookieValue.length; i++)
		{
			cookieString = cookieString.concat(cookieValue[i].movieTitle);
			if(i<cookieValue.length-1)
			{
				cookieString = cookieString.concat('--');
			}
		}
		return cookieString;
	}
}

function ShowObject(title, coverSrc, watchURL)
{
	this.showTitle = title;
	this.showCover = coverSrc;
	this.watchURL = watchURL;
	this.isNew = false;
}

function setBadge()
{
	var badgeNumber = contentManager.newShowsCnt;
	if(badgeNumber > 0)
	{
		chrome.browserAction.setBadgeText({"text":badgeNumber.toString()});//248,148,6
		chrome.browserAction.setBadgeBackgroundColor({"color":[248,148,6,200]});	
	}
	else
	{
		chrome.browserAction.setBadgeText({"text":"".toString()});		
	}
}

