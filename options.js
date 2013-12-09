angular.module('plunker', ['ui.bootstrap']);

var backgroundPage = chrome.extension.getBackgroundPage(),
	timeVal = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF),
	timeUnit = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_PREF),
	numAttempts = 0;

{
	renderOptionsPage();
	fetchAutocompleteData();
	setInteraction();

	$("#timeValue").val(timeVal);
	$("#selectedTimeUnit").html(timeUnit+" <span class=\"caret\"></span>");	
	$(".lastUpdated").text(getLastUpdatedText());

}

function renderOnDataReady()
{
	setLastUpdatedText();
}

function setTimeoutOnDataNotReady()
{
	if(numAttempts++ < 15)
		setTimeout(renderOptionsPage,1000);
	else
		showError();
}

function renderOptionsPage()
{
	sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
}

function setInteraction()
{

    $(".dropdown-menu li a").click(function(){
		$(this).parent().parent().prev().html($(this).text()+" <span class=\"caret\"></span>");
      	backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_PREF, $(this).text());
      	//sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $("#timeValue").change(function(){
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF, $(this).val());
   		//sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $(".icon-refresh").click(function(){
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $("#notificationPrefHelp").tooltip();
   $("#refreshIntervalHelp").tooltip();
}

function setLastUpdatedText()
{
	$(".lastUpdated").text(getLastUpdatedText());
	setTimeout(setLastUpdatedText, 1*60*1000);	//Update text every 1 mins
}

function getLastUpdatedText()
{
	var currentTime = new Date().getTime(),
		readableTime,
		diff = currentTime - backgroundPage.lastUpdated,
		showsPref = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF),
		hoursStr="",
		minutesStr="",
		secondsStr="",
		hour, minute, second;
	if(!showsPref || showsPref == "")
	{
		return "No preferences set to update data.";
	}
	if(backgroundPage.lastUpdated < 0)
	{
		return "Data will be updated soon.";
	}
	readableTime = convertMillisecondsToReadableForm(diff);
	hour = Math.floor(readableTime[0]);
	minute = Math.floor(readableTime[1]);
	second = Math.floor(readableTime[2]);
	if(hour == 0 && minute == 0 && second == 0)
	{
		return "Data updated just now."
	}
	hoursStr = hour>0 ? hour+" hours" : "";
	minutesStr = minute>0 ? minute+" minutes" : "";
	secondsStr = second>0  ? second+" seconds" : "";
	return "Data last updated "+hoursStr+" "+minutesStr+" "+secondsStr + " ago.";
}

function showError()
{
	//if(showsPref && showsPref != "")
	{
		$(".lastUpdated").text("Something went wrong.");
		$(".lastUpdated").attr('class','lastUpdatedError');	
	}
}

function convertMillisecondsToReadableForm(milli)
{
	var arr = new Array(3);
	milli = milli/1000;
	for(var i=2; i>=0; i--)
	{
		arr[i] = milli%60;
		milli = Math.floor(milli/60);
	}
	return arr;
}

function fetchAutocompleteData()
{
	var availableTags = backgroundPage.contentManager.getPrimewireTVObj();

	$("#tvShowList").typeahead({
		source: availableTags,
		items: 10,
		minLength: 2
	});
}

function sendMessage(msgType, argument)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.CONSTANTS.INITIATE_AGAIN)
	{
		$(".icon-refresh").addClass('icon-refresh-rotate');
	}
	else if(msgType == backgroundPage.CONSTANTS.TV_SHOW_PREF_UPDATED)
	{
		msgObject.actionType = argument[0]; //ADD/REMOVE
		msgObject.actionParam = argument[1]; //TV SHOW NAME
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.CONSTANTS.IS_DATA_READY_RESPONSE)
		{
			if(response.status)
			{
				renderOnDataReady();
			}
			else
			{
				setTimeoutOnDataNotReady();
			}
		}
	});
}

function AlertDemoCtrl($scope) 
{
  $scope.alerts = [];
  var showsPref = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF),
  		tempPrefs = [],
  		tvShowMap = backgroundPage.contentManager.getTVUrlMap();

  if (showsPref) 
  {
    tempPrefs = showsPref.split('--');
  }
  else
  {
  	showsPref = "";
  }
  for (var i=0; i<tempPrefs.length; i++)
  {
    $scope.alerts.push({msg: tempPrefs[i]});
  }

  $scope.addAlert = function()
  {
    var tvShowToAdd = document.getElementById("tvShowList").value,
    	showsPref = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF);
    if(!showsPref)
    {
    	showsPref = [];
    }
    else
    {
    	showsPref = showsPref.split("--");
    }
    if(showsPref.indexOf(tvShowToAdd) == -1 && (tvShowToAdd in tvShowMap))
    {
      $scope.alerts.push({msg: tvShowToAdd});
      //var stringToStore = tvShowToAdd+'--';
      //showsPref = showsPref.concat(stringToStore);
      showsPref.push(tvShowToAdd);
      backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF, showsPref.join("--"));
      sendMessage(backgroundPage.CONSTANTS.TV_SHOW_PREF_UPDATED, ["ADD", tvShowToAdd]);
    }
    else
    {
    	console.log("Show has already been added or does not exist in the directory.");
    }
    $("#tvShowList").val("");
  };

  $scope.closeAlert = function(index) 
  {
  	var tvShowToRemove = $scope.alerts[index].msg,
  		showsPref = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF);
    $scope.alerts.splice(index, 1);
    tempPrefs = showsPref.split('--');
    tempPrefs.splice(index, 1);
    showsPref = tempPrefs.join('--');
    backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.TV_SHOW_PREFS_PREF, showsPref);
    sendMessage(backgroundPage.CONSTANTS.TV_SHOW_PREF_UPDATED, ["REMOVE", tvShowToRemove]);
  };
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == backgroundPage.CONSTANTS.INITIATED)
		{
			setLastUpdatedText();
			$(".icon-refresh").removeClass('icon-refresh-rotate');
		}	
	});
 