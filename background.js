var contentManager = null,
	preferencesManager = null,
	cookieManager = null,
	communicationManager = null,
	localStorageManager = null,
	CONSTANTS = null,
	lastUpdated = -1,
	REFRESH_INTERVAL = 3*60*60*1000; //Three hour
	allPrefsUpdated = 0;
{
	initiateManagers();

	setTimeout(initiate,4000);	//Need to put in a better check to see if tv shows directory is ready.
}

function initiateManagers()
{
	contentManager = new ContentManager();
	preferencesManager = new PreferencesManager();
	communicationManager = new CommunicationManager();
	localStorageManager = new LocalStorageManager();
	CONSTANTS = new constants();
	communicationManager.sendXMLRequest(CONSTANTS.TV_SHOWS_DIRECTORY_URL, CONSTANTS.TV_SHOWS_DIRECTORY_REQUEST, communicationManager.handleXMLRequestResponse);
}

function constants()
{
	//CONSTANT VALUES
	this.HOME_URL = "http://www.primewire.ag/";
	this.QUERY_PATH = "?tv";
	this.IMAGES_URL = "http://images.primewire.ag/"

	//REQUEST TYPES; JSON file, ticker req, show req
	this.TV_SHOWS_DIRECTORY_REQUEST = "tvShowsDirectoryRequest";
	this.BATCH_SHOWS_DATA_REQUEST = "batchShowsDataRequest";
	this.SINGLE_SHOW_DATA_REQUEST = "singleShowDataRequest";

	//GITHUB PRIMEWIRE JSON URL
	this.TV_SHOWS_DIRECTORY_URL = "https://raw.github.com/zambrey/LetMeWatchThis/master/primewireTV.json";

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
	this.INITIATE_AGAIN = "initiateAgain";
	this.INITIATED = "initiated";
	this.IS_DATA_READY_QUERY = "isDataReadyQuery";
	this.IS_DATA_READY_RESPONSE = "isDataReadyResponse";
	this.NEW_SHOWS_COUNT_QUERY = "newShowsCountQuery";
	this.NEW_SHOWS_COUNT_RESPONSE = "newShowsCountResponse";
	this.TV_SHOW_PREF_UPDATED = "tvShowPrefUpdated";
}

function initiate()
{
	contentManager.isDataReady = false;
	contentManager.resetShows();
	allPrefsUpdated = 0;
	var tempPrefs = preferencesManager.getPreferenceValue(CONSTANTS.TV_SHOW_PREFS_PREF);
	if(!tempPrefs || tempPrefs == "")
		showPrefs = null;
	else
		showPrefs = tempPrefs.split('--');

	if(showPrefs)
	{
		for(var i=0; i<showPrefs.length;i++)
		{
			showPrefURL = contentManager.getUrlForShow(showPrefs[i]);
			communicationManager.sendXMLRequest(CONSTANTS.HOME_URL+showPrefURL, CONSTANTS.BATCH_SHOWS_DATA_REQUEST, communicationManager.handleXMLRequestResponse);
		}
	}	
	else
	{
		console.log("No preferences set yet. Display the message.");
		communicationManager.updateCompleted();
	}

	setTimeout(initiate, communicationManager.getRefreshInterval());
}

/*Communication Manager*/
function CommunicationManager()
{
	this.requests = [];
	this.sendXMLRequest = function(url, requestType, responseHandler)
	{
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		request.onreadystatechange = this.getResponseHandler(request, requestType, responseHandler);
		request.send();
		this.requests.push(request);
	}
	this.handleXMLRequestResponse = function(request, requestType, responseText)
	{
		if(requestType == CONSTANTS.BATCH_SHOWS_DATA_REQUEST)
		{
			communicationManager.processResponseForNewEpisodes(request, responseText);
		}
		else if(requestType == CONSTANTS.TV_SHOWS_DIRECTORY_REQUEST)
		{
			communicationManager.setTvShowsDirectory(request, responseText);
		}
		else if(requestType == CONSTANTS.SINGLE_SHOW_DATA_REQUEST)
		{
			communicationManager.processIndividualShowForNewEpisodes(request, responseText);
		}
		else
		{
			console.log("Undefined request type");
		}	
	}
	this.processResponseForNewEpisodes = function(request, responseText)
	{
		allPrefsUpdated += 1;
		
		communicationManager.processIndividualShowForNewEpisodes(request, responseText);
		var tempPrefs = preferencesManager.getPreferenceValue(CONSTANTS.TV_SHOW_PREFS_PREF).split('--');
		if(allPrefsUpdated == tempPrefs.length)
		{
			communicationManager.updateCompleted();
		}
	}

	this.processIndividualShowForNewEpisodes = function(request, responseText)
	{
		var lastSeenShows = localStorageManager.getLocalStorageValue(CONSTANTS.LAST_SEEN_SHOWS_VALUE),
			latestEpisodeFromResponseText = communicationManager.findLatestEpisodeInResponseText(responseText),
			tvShowNameFromResponse = latestEpisodeFromResponseText[0],
			latestSeasonFromResponseText = latestEpisodeFromResponseText[1],
			latestEpisodeNumberFromResponseText = latestEpisodeFromResponseText[2];
			latestEpisodeNameFromResponseText = latestEpisodeFromResponseText[3];
			lastSeasonEpisodeNames = latestEpisodeFromResponseText[4];

		if(lastSeenShows && lastSeenShows.length != 0)
		{
			var latestEpisodeFromStore = lastSeenShows.lastIndexOf(tvShowNameFromResponse);
			if (latestEpisodeFromStore == -1)
			{
				if(!latestEpisodeNameFromResponseText)
					latestEpisodeNameFromResponseText = "Season "+latestSeasonFromResponseText+" Episode "+ latestEpisodeNumberFromResponseText;
				communicationManager.addEpisodeToContent(responseText, tvShowNameFromResponse, latestSeasonFromResponseText, latestEpisodeNumberFromResponseText, latestEpisodeNameFromResponseText, true);
			}
			else
			{
				var endOfLatestEpisode = lastSeenShows.indexOf('--', latestEpisodeFromStore);
				latestEpisodeFromStoreObj = lastSeenShows.slice(latestEpisodeFromStore, endOfLatestEpisode);

				tempEpisodeObj = latestEpisodeFromStoreObj.split("%%");
				latestEpisodeInPref = tempEpisodeObj[2];

				var difference = parseInt(latestEpisodeNumberFromResponseText)-parseInt(latestEpisodeInPref);

				for(var i=0; i<=difference; i++)
				{
					episodeToAdd = parseInt(latestEpisodeInPref)+i;
					episodeToAdd = episodeToAdd.toString();

					//Need to check if this works when i != 0
					episodeNameToAdd = lastSeasonEpisodeNames[lastSeasonEpisodeNames.length-1-(difference-i)];
					if(!episodeNameToAdd)
						episodeToAdd = "Season "+latestSeasonFromResponseText+" Episode "+ episodeToAdd;

					communicationManager.addEpisodeToContent(responseText, tvShowNameFromResponse, latestSeasonFromResponseText, episodeToAdd, episodeNameToAdd, !(i==0));
				}
			}
		}
		else
		{
			communicationManager.addEpisodeToContent(responseText, tvShowNameFromResponse, latestSeasonFromResponseText, latestEpisodeNumberFromResponseText, latestEpisodeNameFromResponseText, true);
		}

		setBadge();
	}
	/* addEpisodeToContent
	 * Builds link to episode's webpage and shows's cover and add the show object to content
	 */
	this.addEpisodeToContent = function(responseText, tvShowNameFromResponse, latestSeasonFromResponseText, latestEpisodeNumberFromResponseText, latestEpisodeNameFromResponseText, isNewEpisode)
	{
		var doc = document.implementation.createHTMLDocument("addPrefShow");
		doc.documentElement.innerHTML = responseText;
		
		var spanLinkObj = doc.getElementsByClassName("titles")[1].firstChild,
			linkElementObj = spanLinkObj.children[0],
			linkToTVShow = linkElementObj.getAttribute("href");
			link = linkToTVShow+"/season-"+latestSeasonFromResponseText+"-episode-"+latestEpisodeNumberFromResponseText,
			tempShowObj = new ShowObject(tvShowNameFromResponse, latestSeasonFromResponseText, latestEpisodeNumberFromResponseText, latestEpisodeNameFromResponseText, link, isNewEpisode);
		
		if(isNewEpisode)
			contentManager.addShow(tempShowObj, 1);
		else
			contentManager.addShow(tempShowObj, 0);	
	}

	/* findLatestEpisodeInResponseText
	 * Argument: Request Response Text
	 * Returns: Array with TV show name, last season number and last episode number
	 */
	this.findLatestEpisodeInResponseText = function(responseText)
	{
		var doc = document.implementation.createHTMLDocument("latestShow");
		doc.documentElement.innerHTML = responseText;
		var tvShowNameElementFromResponse = doc.getElementsByClassName("titles")[1],
			tvShowNameFromResponse = tvShowNameElementFromResponse.textContent.trim(),
			episodesParent = doc.getElementById("first"),
			episodesList = episodesParent.getElementsByClassName("tv_container");

		for(var i=0; i<episodesList.length; i++)
		{
			subListOfEpisodes = episodesList[i].children;
			var seasonNumber = null;
			var namesOfLastSeasonEpisodes = [];

			for(var j=0; j<subListOfEpisodes.length;j++)
			{
				var element = subListOfEpisodes[j];
				
				if(element.tagName == "H2")
				{
					seasonNumber = element.textContent.slice(7);
				}
				else
				{
					fullEpisodeName = element.textContent;
					var patt = new RegExp('\\w+\\s[\\d]+');
					episodeNumber = patt.exec(fullEpisodeName)[0];
					episodeNumber = episodeNumber.slice(8);
					patt = new RegExp('-[\\d\\D]*');
					tempMatch = patt.exec(fullEpisodeName);
					if(tempMatch != null)
					{
						episodeName = tempMatch[0];
						episodeName = episodeName.trim().slice(2);
					}
					else
					{
						episodeName = "";
					}
					namesOfLastSeasonEpisodes.push(episodeName);
				}
			}
		}

		latestEpisodeObj = [tvShowNameFromResponse, seasonNumber, episodeNumber, episodeName, namesOfLastSeasonEpisodes];
		return latestEpisodeObj;
	}
	this.updateCompleted = function()
	{
		contentManager.isDataReady = true;
		lastUpdated = new Date().getTime();
		communicationManager.sendMessage(CONSTANTS.INITIATED);	 
	}
	
	this.setTvShowsDirectory = function(request, responseText)
	{
		if(contentManager.primewireTVObj.length == 0){
			var jsObject = JSON.parse(responseText);
			for(var i=0; i<jsObject['TV Series'].length; i++)
			{
				contentManager.primewireTVObj.push(jsObject['TV Series'][i].name);
				contentManager.tvURLMap[jsObject['TV Series'][i].name] = jsObject['TV Series'][i].url;
				contentManager.tvImageMap[jsObject['TV Series'][i].name] = jsObject['TV Series'][i].image;
			}
		}
	}
	this.getResponseHandler = function(req, requestType, responseHandler)
	{
		return function()
		{
			if(req.readyState == 4 && req.status == 200)
			{
				if(responseHandler)
				{
					responseHandler(req, requestType, req.responseText);
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
			}
			if(request.messageType == CONSTANTS.INITIATE_AGAIN)
			{
				initiate();
			}
			if(request.messageType == CONSTANTS.IS_DATA_READY_QUERY)
			{
				console.log("IS_DATA_READY_QUERY");
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
			if(request.messageType == CONSTANTS.TV_SHOW_PREF_UPDATED)
			{
				if(request.actionType)
				{
					if(request.actionType == "ADD")
					{
						communicationManager.sendXMLRequest(CONSTANTS.HOME_URL+contentManager.getUrlForShow(request.actionParam), CONSTANTS.BATCH_SHOWS_DATA_REQUEST, communicationManager.handleXMLRequestResponse);
						console.log(request.actionParam +" added.");
					}
					else if(request.actionType == "REMOVE")
					{
						/*
						Update local storage so that it does not cause issue if the show added back again
						*/
						var lastSeen = localStorageManager.getLocalStorageValue(CONSTANTS.LAST_SEEN_SHOWS_VALUE),
							lastSeenList = lastSeen.split("--");
						for(i=0; i<lastSeenList.length; i++)
						{
							var showName = lastSeenList[i].split("%%")[0];
							if(request.actionParam.indexOf(showName) >= 0)
							{
								lastSeenList.splice(i,1);
								break;
							}
						}
						localStorageManager.setLocalStorageValue(CONSTANTS.LAST_SEEN_SHOWS_VALUE, lastSeenList.join("--")+"--");
						console.log(request.actionParam + " removed.");		

						setTimeout(initiate,100);
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
	this.primewireTVObj = [];
	this.tvURLMap = {};
	this.tvImageMap = {};
	this.newShowsCnt = 0;
	this.isDataReady = false;
	this.resetShows = function()
	{
		this.shows = [];
	}
	this.addShow = function(show, newShowAdd)
	{
		for(var i=0; i<this.shows.length; i++)
		{
			if(this.shows[i].showTitle == show.showTitle)
			{
				if(this.shows[i].seasonNumber == show.seasonNumber && this.shows[i].episodeNumber == show.episodeNumber)
				{
					return;
				}
			}
		}
		this.shows.push(show);
		this.newShowsCnt += newShowAdd;
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
	this.getTVImageMap = function()
	{
		return this.tvImageMap;
	}
	this.getUrlForShow = function(tvShowName)
	{
		if(tvShowName in this.tvURLMap)
			return this.tvURLMap[tvShowName];
		return null;
	}
	this.getImageForShow = function(tvShowName)
	{
		if(tvShowName in this.tvImageMap)
			return this.tvImageMap[tvShowName];
		return null;
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
			savedValue = localStorage.getItem(this.getKeyForValueType(valueType));
			//return this.processBeforeReturningValue(savedValue);
			return savedValue;
		}
		return localStorage.getItem(this.getKeyForValueType(valueType));
	}
	this.setLocalStorageValue = function(valueType, value)
	{
		if(valueType == CONSTANTS.LAST_SEEN_SHOWS_VALUE)
		{
			if(value instanceof Array)
				localStorage.setItem(this.getKeyForValueType(valueType), this.processBeforeSettingValue(value));
			else
				localStorage.setItem(this.getKeyForValueType(valueType), value);
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
			valueString = valueString+value[i].showTitle+"%%"+value[i].seasonNumber+"%%"+value[i].episodeNumber;
			//if(i<value.length-1)
			{
				valueString = valueString.concat('--');
			}
		}
		return valueString;
	}
}

function ShowObject(title, season, episodeNumber, episodeName, watchURL, isNew)
{
	this.showTitle = title;
	this.seasonNumber = season;
	this.episodeNumber = episodeNumber;
	this.episodeName = episodeName;
	this.watchURL = watchURL;
	this.isNew = isNew;
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

