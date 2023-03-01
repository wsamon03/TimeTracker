const mustache = require('mustache');
const { ipcRenderer } = require('electron')
	
var itemDisplayTemplate = 
`{{#activities}}
    <div class='card item stopWatch {{itemClasses}} {{hideStopWatchClass}}' onclick="startStop('{{id}}');">
        <div class='card-body'>
            <h5 class='card-title'>{{timeDisplay}} {{title}}</h5>
            <span class='floatRight' onclick="showEdit('{{id}}');">edit</span>
            <p class='card-text'>{{description}}</p>
        </div>
    </div>
    <div class='card item edit {{itemClasses}} {{showEditClass}}' >
        <div class='card-body'>
            <h5 class='card-title'>{{timeDisplay}} <input type='text' class='form-control' value='{{title}}' /></h5>
            <span class='floatRight' onclick="showStopWatch('{{id}}');">save</span>
            <p class='card-text'><textarea class='form-control' rows='2' value='{{description}}'></textarea></p>
        </div>
    </div>
{{/activities}}`;

ipcRenderer.on('setActivities', (event, itemList) => {
    // add any starting times if needed for new items
    itemList.activities.forEach(function (item) {
        if (item.id != null && times[item.id] == null && item.time > 0) {
            times[item.id] = [];
            times[item.id].push(0);
            times[item.id].push(item.time * (60 * 1000));
        }
    });

    //display the item list
	var templatedItems = mustache.to_html(itemDisplayTemplate, itemList);
	document.getElementById('itemDisplay').innerHTML = templatedItems;
});


function clearNewItem() {
    document.getElementById("newItemTitle").value = "";
    document.getElementById("newItemDescription").value = "";
}

function startStop(id) {
    if (clockIsRunning(id)) {
        pauseTimer(id);
    }
    else {
        startTimer(id);
    }
}

function clockIsRunning(id) {
    if (times[id] == null) { return false; }
	return (times[id].length % 2 === 1);
}

function calculateTotalTime(id) {
	var totalTime = 0;
	
	for (i = 0; i < times[id].length; i++)
	{
		if (i % 2 === 1)
		{
			totalTime += times[id][i] - times[id][i - 1];
		}
	}
	
	if (clockIsRunning(id))
    {
		totalTime += (new Date() - times[id][times[id].length - 1]);
	}
	
	return totalTime;
}

/* Timer Functions */
function startTimer(id) {
	if (clockIsRunning(id)) {
        return;
    }

    if (times[id] == null) {
        times[id] = [];
    }

    times[id].push(new Date());
}

function pauseTimer(id) {
	if (clockIsRunning(id))
	{
		times[id].push(new Date());
	}
	
    updateActivityTime(id);
}

function stopTimer(id) {
	if (clockIsRunning())
	{
		times[id].push(new Date());
	}
		
    updateActivityTime(id);
}
/* END Timer Functions */

/* Activity Update Functions */
function updateActivityTime(id) {
    var totalTimeMS = calculateTotalTime(id);
    var sec = (totalTimeMS / 1000).toFixed(0);
    var hour = parseInt(sec / (60 * 60));
    sec -= hour * 60 * 60;
    var min = parseInt(sec / 60);
    sec -= min * 60;

    var timeDisp = hour > 0 ? String(hour).padStart(2,'0') + ":" + String(min).padStart(2,'0') + " hours" : String(min).padStart(2,'0') + ":" + String(sec).padStart(2,'0') + " mins"; 

    ipcRenderer.send('updateActivityTime',
        {
            "id": id,
            "time": totalTimeMS / (60 * 1000),
            "timeDisplay": timeDisp,
            "itemClasses": clockIsRunning(id) ? "running" : ""
        }
    );
}

function createNewActivity(id) {
    ipcRenderer.send('addActivity',
        {
            "id": typeof id == "undefined" ? create_UUID() : id,
            "title": document.getElementById("newItemTitle").value,
            "description": document.getElementById("newItemDescription").value,
            "itemClasses":""
        }
    );
}

function createAndStartNewActivity() {
    var id = create_UUID();
    createNewActivity(id);
    startTimer(id);
}

/* END Activity Update Functions */


/* Activity File Functions */

function loadMostRecentlySavedActivities() {    
    ipcRenderer.send('loadMostRecentFile');
}

function loadSavedActivities() {
    ipcRenderer.send('loadLogFile');
}

function saveActivities() {
    ipcRenderer.send('saveLogFile');
}

/* END Activity File Functions */

/* Helper Functions */
function create_UUID() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

var timerDisplayId;
function startTimerDisplay() {
    timerDisplayId = setInterval(updateAllTimes, 1000);
}

function updateAllTimes() {
    Object.keys(times).forEach(function (timeKey) {
        updateActivityTime(timeKey);
    });
}
/* END Helper Functions */


/* Initial Startup */
var times = {};
ipcRenderer.send('requestActivities');
startTimerDisplay();