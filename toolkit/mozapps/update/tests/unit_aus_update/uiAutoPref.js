/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

Components.utils.import("resource://testing-common/MockRegistrar.jsm");

function run_test() {
  setupTestCommon();
  // Calling do_get_profile prevents an error from being logged
  do_get_profile();

  debugDump("testing that an update download doesn't start when the " +
            PREF_APP_UPDATE_AUTO + " preference is false");

  Services.prefs.setBoolPref(PREF_APP_UPDATE_AUTO, false);
  Services.prefs.setBoolPref(PREF_APP_UPDATE_SILENT, false);

  setUpdateURLOverride();
  // The mock XMLHttpRequest is MUCH faster
  overrideXHR(callHandleEvent);
  standardInit();

  let windowWatcherCID =
    MockRegistrar.register("@mozilla.org/embedcomp/window-watcher;1",
                           WindowWatcher);
  let windowMediatorCID =
    MockRegistrar.register("@mozilla.org/appshell/window-mediator;1",
                           WindowMediator);
  do_register_cleanup(() => {
    MockRegistrar.unregister(windowWatcherCID);
    MockRegistrar.unregister(windowMediatorCID);
  });

  gCheckFunc = check_showUpdateAvailable;
  let patches = getRemotePatchString("complete");
  let updates = getRemoteUpdateString(patches, "minor", null, null, "1.0");
  gResponseBody = getRemoteUpdatesXMLString(updates);
  gAUS.notify(null);
}

function check_status() {
  let status = readStatusFile();
  Assert.notEqual(status, STATE_DOWNLOADING,
                  "the update should not be downloading");

  // Pause the download and reload the Update Manager with an empty update so
  // the Application Update Service doesn't write the update xml files during
  // xpcom-shutdown which will leave behind the test directory.
  gAUS.pauseDownload();
  writeUpdatesToXMLFile(getLocalUpdatesXMLString(""), true);
  writeUpdatesToXMLFile(getLocalUpdatesXMLString(""), false);
  reloadUpdateManagerData();

  do_execute_soon(doTestFinish);
}

// Callback function used by the custom XMLHttpRequest implementation to
// call the nsIDOMEventListener's handleEvent method for onload.
function callHandleEvent(aXHR) {
  aXHR.status = 400;
  aXHR.responseText = gResponseBody;
  try {
    let parser = Cc["@mozilla.org/xmlextras/domparser;1"].
                 createInstance(Ci.nsIDOMParser);
    aXHR.responseXML = parser.parseFromString(gResponseBody, "application/xml");
  } catch (e) {
  }
  let e = { target: aXHR };
  aXHR.onload(e);
}

function check_showUpdateAvailable() {
  do_throw("showUpdateAvailable should not have called openWindow!");
}

const WindowWatcher = {
  openWindow: function(aParent, aUrl, aName, aFeatures, aArgs) {
    gCheckFunc();
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWindowWatcher])
};

const WindowMediator = {
  getMostRecentWindow: function(aWindowType) {
    do_execute_soon(check_status);
    return { getInterface: XPCOMUtils.generateQI([Ci.nsIDOMWindow]) };
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWindowMediator])
}
