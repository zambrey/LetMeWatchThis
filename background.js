/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var contentManager = null,
	preferencesManager = null,
	cookieManager = null,
	CONSTANTS = null,
	newShowsCnt,
	isDataReady = false,
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
	isDataReady = false;
	//requests = [];
	sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH, handleXMLRequestResponse);
	setTimeout(initiate, getRefreshInterval());
}

function getMovieTitlesForLanguage(languageName)
{
	sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH+languageName.toLowerCase(), CONSTANTS.MOVIES_REQUEST, languageName);
}

function sendXMLRequest(url, responseHandler)
{
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.onreadystatechange = getResponseHandler(request, responseHandler);
	request.send();
	//requests.push(request);
}

function handleXMLRequestResponse(request, responseText)
{
	// if(requestType == CONSTANTS.LANGUAGES_REQUEST)
	// {
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
		// contentManager.resetMovies();
		// langsChecked = new Array(); langsChecked.length = contentManager.getLanguagesData().length;

		// for(i=0; i<contentManager.getLanguagesData().length; i++)
		// {
		// 	langsChecked[i] = 0;
		// 	getMovieTitlesForLanguage(contentManager.getLanguagesData()[i]);
		// }
		setTimeout(updateCompleted, 1000);
	// }
	// else if(requestType == CONSTANTS.MOVIES_REQUEST)
	// {	
	// 	var	movieObjArray, 
	// 		movieElems, 
	// 		movieCovers,
	// 		movieDetails;
	// 	doc= document.implementation.createHTMLDocument("movies");
	// 	doc.documentElement.innerHTML = responseText;
	// 	movieObjArray = new Array();
	// 	movieElems = doc.getElementsByClassName("movie-title");
	// 	movieCovers = doc.getElementsByClassName("movie-cover-wrapper");
	// 	movieDetails = doc.getElementsByClassName("desc_body");
	// 	for(i=0; i<movieElems.length; i++)
	// 	{
	// 		movieDetails[i].removeChild(movieDetails[i].childNodes[1]);
	// 		movieObjArray.push(new MovieObject(	movieElems[i].innerHTML.split(' - ')[0],
	// 											movieCovers[i].firstChild.getAttribute('src'),
	// 											"Starring "+movieDetails[i].innerText.substring(3),
	// 											movieCovers[i].getAttribute('href')));
	// 	}
	// 	contentManager.setMoviesData(capitaliseFirstLetter(languageName), movieObjArray);
	// 	updateNumberOfNewMovies(languageName, movieObjArray);
	// }
	//requests.splice(requests.indexOf(request),1);
}

function getResponseHandler(req, responseHandler)
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

function breakCookieString(cookieString)
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

function getCookie(languageName)
{
	var details = new Object(), oldMovieTitles;
	details.url = homeUrl;
	details.name = languageName.toLowerCase()+'Movies';
	chrome.cookies.get(details, function(cookie){
		oldMovieTitles = breakCookieString(cookie.value);
	});
	return oldMovieTitles;
}

function updateNumberOfNewMovies(languageName, movieObjArray)
{
	var moviesCookie = null,
		details = new Object(),
		languageIndex = contentManager.getLanguageIndex(languageName);
	details.url = CONSTANTS.HOME_URL;
	details.name = languageName.toLowerCase()+'Movies';
	cookieManager.getCookie(languageName, compareNewDataAgainstCookie);
}

function compareNewDataAgainstCookie(language, moviesCookie)
{
	var languageIndex = contentManager.getLanguageIndex(language),
		movieObjArray = contentManager.getMoviesData(language);
	if(!moviesCookie)
	{
		newMoviesCnt[languageIndex] += movieObjArray.length;
		for(i=0; i<movieObjArray.length; i++)
		{
			movieObjArray[i].isNew = true;
		}
	}
	else
	{
		for(i=0; i<movieObjArray.length; i++)
		{
			var movieTitle = movieObjArray[i].movieTitle;
			if(moviesCookie.indexOf(movieTitle) < 0)
			{
				newMoviesCnt[contentManager.getLanguagesData().indexOf(language)]++;
				movieObjArray[i].isNew = true;
			}
			else
			{
				break;
			}
		}	
	}
	langsChecked[languageIndex] = 1;
}

function updateCompleted()
{
	isDataReady = true;
	lastUpdated = new Date().getTime();
	sendMessage(CONSTANTS.INITIATED);
	setBadge();
}


function capitaliseFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function getRefreshInterval()
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

function ShowObject(title, coverSrc, watchURL)
{
	this.showTitle = title;
	this.showCover = coverSrc;
	this.watchURL = watchURL;
	this.isNew = false;
}

function resetNewFlags(language)
{
	var index = contentManager.getLanguagesData().indexOf(language),
		movieList = contentManager.getMoviesData(language);
	newMoviesCnt[index] = 0;
	for(i=0; i<movieList.length; i++)
	{
		movieList[i].isNew = false;
	}
	setBadge();
}

function setBadge()
{
	var badgeNumber = newShowsCnt;
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

function sendMessage(msgType)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	chrome.extension.sendRequest(msgObject, function(response){});
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == CONSTANTS.RESET_NEW_FLAGS)
		{
			if(request.language)
			{
				resetNewFlags(request.language);
				sendResponse({messageType: CONSTANTS.NEW_FLAGS_RESET_DONE, language:request.language});
			}
		}
		if(request.messageType == CONSTANTS.INITIATE_AGAIN)
		{
			initiate();
		}
		if(request.messageType == CONSTANTS.IS_DATA_READY_QUERY)
		{
			sendResponse({messageType: CONSTANTS.IS_DATA_READY_RESPONSE, status: isDataReady});
			if(!isDataReady && lastUpdated != -1 && requests.length == 0)
			{
				var diff = new Date().getTime() - lastUpdated;
				if(diff >= getRefreshInterval())
				{
					initiate();
				}	
			}
		}	
	});



/*Content Manager*/
function ContentManager()
{
	this.shows = [];
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
}

/*Preferences Manager*/
function PreferencesManager()
{
	this.DEFAULT_LANGUAGE_KEY = "defaultLanguage";
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
		if(preferenceType == CONSTANTS.DEF_LANG_PREF)
		{
			prefKey = this.DEFAULT_LANGUAGE_KEY;
		}
		else if(preferenceType == CONSTANTS.REFRESH_TIME_VAL_PREF)
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
	this.cookieValidDuration = 60*60*24*30*12,
	this.getCookie = function(language, cookieHandler)
	{
		var details = new Object(), oldMovieTitles = null;
		details.url = CONSTANTS.HOME_URL;
		details.name = language.toLowerCase()+'Movies';
		chrome.cookies.get(details, function(cookie){
			if(cookie)
			{
				oldMovieTitles = cookieManager.processBeforeReturningCookie(cookie.value);
			}
			if(cookieHandler)
			{
				cookieHandler(language, oldMovieTitles)
			}
		});
		return oldMovieTitles;
	}
	this.setCookie = function(language, cookieValue)
	{
		var details = new Object();
		details.url = CONSTANTS.HOME_URL;
		details.name = language.toLowerCase()+'Movies';
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