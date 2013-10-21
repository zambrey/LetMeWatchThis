/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var contentManager = null,
	preferencesManager = null,
	cookieManager = null,
	communicationManager = null,
	localStorageManager = null,
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
	localStorageManager = new LocalStorageManager();
	CONSTANTS = new constants();
}

function constants()
{
	//CONSTANT VALUES
	this.HOME_URL = "http://www.primewire.ag/";
	this.QUERY_PATH = "?tv";

	//GITHUB PRIMEWIRE JSON URL
	this.JSON_FILE_URL = "https://raw.github.com/zambrey/LetMeWatchThis/master/primewireTV.json";

	//LOCAL STORAGE_KEYS
	this.LAST_SEEN_SHOWS_VALUE = "lastSeenShowValue";	//This is equivalent of shows cookie

	//PREFERENCE RELATED CONSTANTS
	this.REFRESH_TIME_VAL_PREF = "refreshTimeValPref";
	this.REFRESH_TIME_UNIT_PREF = "refreshTimeUnitPref";
	this.TV_SHOW_PREFS_PREF = "tvShowPrefsPref";
	this.DEFAULT_REFRESH_TIME_VALUE = "3";
	this.DEFAULT_REFRESH_TIME_UNIT = "Hours";

	//INTER-SCRIPT COMMUNICATION KEYS
	this.RESET_NEW_FLAGS = "resetNewFlags";
	//this.NEW_FLAGS_RESET_DONE = "newFlagsReset";
	this.INITIATE_AGAIN = "initiateAgain";
	this.INITIATED = "initiated";
	this.IS_DATA_READY_QUERY = "isDataReadyQuery";
	this.IS_DATA_READY_RESPONSE = "isDataReadyResponse";
	this.NEW_SHOWS_COUNT_QUERY = "newShowsCountQuery";
	this.NEW_SHOWS_COUNT_RESPONSE = "newShowsCountResponse";
}

function initiate()
{
	contentManager.isDataReady = false;
	/*if(userPref)
	{
		for(i=0; i<userPref.length;i++)
		{
			sendXMLReq(userPref[i],detectIfNewEpisodeUploadedCallback);
		}
	}	
	 else
	 	communicationManager.sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH, communicationManager.handleXMLRequestResponse);
	*/
	communicationManager.sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH, communicationManager.handleXMLRequestResponse);
	communicationManager.sendXMLRequest(CONSTANTS.JSON_FILE_URL, communicationManager.handleJSONFileRequestResponse);
	setTimeout(initiate, communicationManager.getRefreshInterval());
}

/*Communication Manager*/
function CommunicationManager()
{
	this.requests = [];
	this.sendXMLRequest = function(url, responseHandler)
	{
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		request.onreadystatechange = this.getResponseHandler(request, responseHandler);
		request.send();
		this.requests.push(request);
	}
	/*this.handleNewEpisodeDetectionResponse = function(request, responseText)
	{
		GET_COOKIE
		FIND_LATEST_EPISODE_IN_RESPONSE_TEXT
		Compare with episode number in cookie
		if(latest_epi_response_text-latest_epi_in_cookie >1)
		{
			while(latest_epi_response_text-latest_epi_in_cookie >1)
				Get episode before latest
				latest_epi_response_text--;
				ADD_TO_CONTENT_MANAGER
				mark_as_new
				Increment contentManager count of new shows
				setbadge(badge will keep updating as and when request responses come in)
		}
		else
		{
			Add only the latest episode to content manager
		}
		Mark show update as complete(Assuming we have an array to keep track of shows from userPrefs getting updated)
		If(all show updates are complete)
			this.customUpdateCompleted();
	}
	this.customUpdateCompleted = function()
	{
		contentManager.isDataReady = true;
		lastUpdated = new Date().getTime();
		communicationManager.sendMessage(CONSTANTS.INITIATED);	 
	}
	*/
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
	this.handleJSONFileRequestResponse = function(request, responseText)
	{
		if(contentManager.primewireTVObj.length == 0){
			var jsObject = JSON.parse(responseText);
			for(var i=0; i<jsObject['TV Series'].length; i++)
			{
				contentManager.primewireTVObj.push(jsObject['TV Series'][i].name);
				contentManager.tvURLMap[jsObject['TV Series'][i].name] = jsObject['TV Series'][i].url;
			}
		}
	}
	this.updateCompleted = function()
	{
		contentManager.isDataReady = true;
		contentManager.areThereNewShows();
		lastUpdated = new Date().getTime();
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
					communicationManager.requests.splice(communicationManager.requests.indexOf(req),1);
				}
			}
			else if(req.status == 0 || req.status >= 400)
			{
				communicationManager.requests.splice(communicationManager.requests.indexOf(req),1);
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
				contentManager.resetNewFlags();
				//sendResponse({messageType: CONSTANTS.NEW_FLAGS_RESET_DONE});
			}
			if(request.messageType == CONSTANTS.INITIATE_AGAIN)
			{
				initiate();
			}
			if(request.messageType == CONSTANTS.IS_DATA_READY_QUERY)
			{
				sendResponse({messageType: CONSTANTS.IS_DATA_READY_RESPONSE, status: contentManager.isDataReady});
				if(!contentManager.isDataReady && lastUpdated != -1 && communicationManager.requests.length == 0)
				{
					var diff = new Date().getTime() - lastUpdated;
					if(diff >= communicationManager.getRefreshInterval())
					{
						initiate();
					}	
				}
			}
			if(request.messageType == CONSTANTS.NEW_SHOWS_COUNT_QUERY)
			{
				sendResponse({messageType: CONSTANTS.NEW_SHOWS_COUNT_RESPONSE, count:contentManager.newShowsCnt});
			}	
		}
	);
}

/*Content Manager*/
function ContentManager()
{
	this.shows = [];
	this.primewireTVObj = [];
	this.tvURLMap = {};
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
	this.getPrimewireTVObj = function()
	{
		return this.primewireTVObj;
	}
	this.getTVUrlMap = function()
	{
		return this.tvURLMap;
	}
	this.getUrlForShow = function(tvShowName)
	{
		if(tvShowName in this.tvURLMap)
			return this.tvURLMap[tvShowName];
		return null;
	}
	this.areThereNewShows = function()
	{
		//cookieManager.getCookie(contentManager.compareAgainstCookie);
		compareAgainstCookie(localStorageManager.getLocalStorageValue(CONSTANTS.LAST_SEEN_SHOWS_VALUE));
	}
	this.compareAgainstCookie = function(showsCookie)
	{
		var showsArray = contentManager.getShows();
		contentManager.newShowsCnt = 0;
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
				//First check if tvShowStorePref has some values
				//If no values have been given, show notifications for all shows
				//Find if showTitle is in tvShowPrefStore
				//If present do the following code
				//if not present skip the following code
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
		setBadge();
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
	this.TV_SHOW_PREFS_KEY = "tvShowPrefStore";
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
		else if(preferenceType == CONSTANTS.TV_SHOW_PREFS_PREF)
		{
			prefKey = this.TV_SHOW_PREFS_KEY;
		}
		return prefKey;
	}
}

function LocalStorageManager()
{
	this.lastSeenShowsKey = "pw-tv-shows";
	this.getLocalStorageValue = function(valueType)
	{
		if(valueType == CONSTANTS.LAST_SEEN_SHOWS_VALUE)
		{
			return this.processBeforeReturningValue(localStorage.getItem(this.getKeyForValueType(valueType)));
		}
		return localStorage.getItem(this.getKeyForValueType(valueType));
	}
	this.setLocalStorageValue = function(valueType, value)
	{
		if(valueType == CONSTANTS.LAST_SEEN_SHOWS_VALUE)
		{
			localStorage.setItem(this.getKeyForValueType(valueType), this.processBeforeSettingValue(value));
		}
	}
	this.getKeyForValueType = function(valueType)
	{
		var valKey = null;
		if(valueType == CONSTANTS.LAST_SEEN_SHOWS_VALUE)
		{
			valKey = this.lastSeenShowsKey;
		}
		return valKey;
	}
	this.processBeforeReturningValue = function(valueString)
	{
		var oldShowTitles,oldShows;
		if(valueString)
		{
			oldShowTitles = new Array()
			oldShows = valueString.split('--');
			for(i=0; i<oldShows.length; i++)
			{
				oldShowTitles.push(oldShows[i]);
			}
		}
		return oldShowTitles;
	}
	this.processBeforeSettingValue = function(value)
	{
		var valueString = '';
		for(i=0; i<value.length; i++)
		{
			valueString = valueString.concat(value[i].showTitle);
			if(i<value.length-1)
			{
				valueString = valueString.concat('--');
			}
		}
		return valueString;
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
		var oldShowTitles,oldShows;
		if(cookieString)
		{
			oldShowTitles = new Array()
			oldShows = cookieString.split('--');
			for(i=0; i<oldShows.length; i++)
			{
				oldShowTitles.push(oldShows[i]);
			}
		}
		return oldShowTitles;
	}
	this.processBeforeSettingCookie = function(cookieValue)
	{
		var cookieString = '';
		for(i=0; i<cookieValue.length; i++)
		{
			cookieString = cookieString.concat(cookieValue[i].showTitle);
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
		chrome.browserAction.setBadgeBackgroundColor({"color":[248,248,6,200]});	
	}
	else
	{
		chrome.browserAction.setBadgeText({"text":"".toString()});		
	}
}

