/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	timeVal = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF),
	timeUnit = backgroundPage.preferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_PREF),
	numAttempts = 0;

{
	renderOptionsPage();
	$("#timeValue").val(timeVal);
	$("#selectedTimeUnit").html(timeUnit+" <span class=\"caret\"></span>");	
	$(".lastUpdated").text(getLastUpdatedText());
}

function renderOnDataReady()
{
	setLastUpdatedText();
	setInteraction();
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
      	sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $("#timeValue").change(function(){
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF, $(this).val());
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $(".icon-refresh").click(function(){
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   })
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
		hoursStr="",
		minutesStr="",
		secondsStr="",
		hour, minute, second;
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
	$(".lastUpdated").text("Something went wrong.");
	$(".lastUpdated").attr('class','lastUpdatedError');
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

function sendMessage(msgType)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.CONSTANTS.INITIATE_AGAIN)
	{
		$(".icon-refresh").addClass('icon-refresh-rotate');
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

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == backgroundPage.CONSTANTS.INITIATED)
		{
			setLastUpdatedText();
			$(".icon-refresh").removeClass('icon-refresh-rotate');
		}	
	});
 