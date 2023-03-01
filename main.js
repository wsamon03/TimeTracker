const { app, BrowserWindow, ipcMain } = require('electron');
const mustache = require('mustache');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

let itemList = {
	"activities": [
  //      {
  //          "id": "1be1112728ca459ba9cf2cc91c18f817",
		//	"time": "45",
		//	"timeDisplay": "45 minutes",
		//	"title": "Ate ice cream",
  //          "description": "the ice cream was pretty awesome, but it was a bad idea because it's so cold"
		//}
	]
};

let logDir = app.getAppPath() + '/ActivityLogs/';

function createWindow () {
	// Create the browser window.
	win = new BrowserWindow({
		width: 250,
		height: 800,
		webPreferences: {
		  nodeIntegration: true
		}
	});

	// and load the index.html of the app.
	win.loadFile(path.join('renderer', 'mainWindow.html'));

	// Open the DevTools.
	//win.webContents.openDevTools()


	/*var d = new Date();
	console.log('sending ' + d.getSeconds() + ':' + d.getMilliseconds());
	win.once('show', () => {
		win.webContents.send('setActivities', itemList)
	})*/

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null
	});
}

function broadcastActivities() {
	win.webContents.send('setActivities', itemList);
}

function saveActivities() {
    var d = new Date();
    var dOut = d.getFullYear() + '_' + d.getMonth() + d.getDate() + '_' + d.getHours() + '-' + d.getMinutes() + '-' + d.getSeconds();

    try {
        fs.writeFileSync(path.resolve(logDir + dOut + '.txt'), JSON.stringify(itemList), 'utf-8');
        return true;
    }
    catch (e) {
        //console.log(
        dialog.showMessageBoxSync({ title: 'Error Saving Activity Log', message: e.message })
            //)
            ;
        return false;
    }
}

function getSortedLogFiles() {
    var dirContents = fs.readdirSync(logDir);
    var files = [];

    for (let file of dirContents) {
        if (!fs.statSync(path.resolve(logDir + file)).isDirectory()) {
            files.push(file);
        }
    }

    files.sort();
    return files;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);


// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        if (itemList != null && itemList.activities != null && itemList.activities.length > 0) { saveActivities(); }
		app.quit();
	}
});

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('requestActivities', (event) => {
	broadcastActivities();
});

ipcMain.on('updateActivityTime', (event, newActivity) => {

    var existingItem = itemList.activities.find(element => element.id == newActivity.id);

    if (existingItem == null) {
        newActivity.title = "New Activity";
        newActivity.description = "unknown activity";
        itemList.activities.push(newActivity);
    }
    else {
        existingItem.time = newActivity.time;
        existingItem.timeDisplay = newActivity.timeDisplay;
        existingItem.itemClasses = newActivity.itemClasses;
    }

    broadcastActivities();
});

ipcMain.on('addActivity', (event, newActivity) => {
    var existingItem = itemList.activities.find(element => element.id == newActivity.id);

    if (existingItem != null) {
        return;
    }

    itemList.activities.push(newActivity);
    broadcastActivities();
});

ipcMain.on('loadMostRecentFile', (event) => {
    let options = {
        buttons: ['Yes', 'No'],
        message: 'Are you sure you want to reload the last saved activities? This will erase the current list'
    }

    if (itemList != null && itemList.activities.length > 0 && dialog.showMessageBoxSync(win, options) == 1) {
        return;
    }

    var files = getSortedLogFiles();

    if (files === null || files.length == 0) { return; }

    itemList = JSON.parse(fs.readFileSync(path.resolve(logDir + files[files.length - 1])));

    broadcastActivities();
});

ipcMain.on('loadLogFile', (event) => {
    var files = dialog.showOpenDialogSync(win, { title: 'Select Activity Log', dir: logDir, multipleSelect: true });

    if (files == null || files.length == 0) { return; }

    let options = {
        buttons: ['Yes', 'No'],
        message: 'Are you sure you want to load the selected file? This will rease the current list'
    }

    if (itemList != null && itemList.activities.length > 0 && dialog.showMessageBoxSync(win, options) == 1) {
        return;
    }

    var foundOne = false;
    for (let selectedFile of files) {
        var fileItemList = JSON.parse(fs.readFileSync(path.resolve(selectedFile)));
        if (!foundOne) {
            itemList = fileItemList;
        }
        else {
            itemList.activities.concat(fileItemList.activities);
        }
    }

    broadcastActivities();
});

ipcMain.on('saveLogFile', (event) => {
    var msg = itemList == null || itemList.activities == null || itemList.activities.length == 0 ?
        'Are you daft? There is nothing to save!' :
        saveActivities() ? 'Success' : 'SAVE FAILED';
    dialog.showMessageBoxSync(win, { title: 'Save Activities', message: msg });
});