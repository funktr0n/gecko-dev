/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

function test() {
  waitForExplicitFinish();

  runPass("file_bug1108547-2.html", function() {
    runPass("file_bug1108547-3.html", function() {
      finish();
    });
  });
}

function runPass(getterFile, finishedCallback) {
  var rootDir = "http://mochi.test:8888/browser/dom/html/test/";
  var testBrowser;
  var privateWin;

  function whenDelayedStartupFinished(win, callback) {
    let topic = "browser-delayed-startup-finished";
    Services.obs.addObserver(function onStartup(aSubject) {
      if (win != aSubject)
        return;

      Services.obs.removeObserver(onStartup, topic);
      executeSoon(callback);
    }, topic, false);
  }

  // First, set the cookie in a normal window.
  gBrowser.selectedTab = gBrowser.addTab(rootDir + "file_bug1108547-1.html");
  gBrowser.selectedBrowser.addEventListener("load", afterOpenCookieSetter, true);

  function afterOpenCookieSetter() {
    gBrowser.selectedBrowser.removeEventListener("load", afterOpenCookieSetter, true);
    gBrowser.removeCurrentTab();

    // Now, open a private window.
    privateWin = OpenBrowserWindow({private: true});
      whenDelayedStartupFinished(privateWin, afterPrivateWindowOpened);
  }

  function afterPrivateWindowOpened() {
    // In the private window, open the getter file, and wait for a new tab to be opened.
    privateWin.gBrowser.selectedTab = privateWin.gBrowser.addTab(rootDir + getterFile);
    testBrowser = privateWin.gBrowser.selectedBrowser;
    privateWin.gBrowser.tabContainer.addEventListener("TabOpen", onNewTabOpened, true);
  }

  function onNewTabOpened() {
    // When the new tab is opened, wait for it to load.
    privateWin.gBrowser.tabContainer.removeEventListener("TabOpen", onNewTabOpened, true);
    privateWin.gBrowser.tabs[privateWin.gBrowser.tabs.length - 1].linkedBrowser.addEventListener("load", onNewTabLoaded, true);
  }

  function onNewTabLoaded() {
    privateWin.gBrowser.tabs[privateWin.gBrowser.tabs.length - 1].linkedBrowser.removeEventListener("load", onNewTabLoaded, true);

    // Now, ensure that the private tab doesn't have access to the cookie set in normal mode.
    is(testBrowser.contentDocument.getElementById("result").textContent, "",
       "Shouldn't have access to the cookies");

    // We're done with the private window, close it.
    privateWin.close();

    // Clear all cookies.
    Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager).removeAll();

    // Open a new private window, this time to set a cookie inside it.
    privateWin = OpenBrowserWindow({private: true});
      whenDelayedStartupFinished(privateWin, afterPrivateWindowOpened2);
  }

  function afterPrivateWindowOpened2() {
    // In the private window, open the setter file, and wait for it to load.
    privateWin.gBrowser.selectedTab = privateWin.gBrowser.addTab(rootDir + "file_bug1108547-1.html");
    privateWin.gBrowser.selectedBrowser.addEventListener("load", afterOpenCookieSetter2, true);
  }

  function afterOpenCookieSetter2() {
    // We're done with the private window now, close it.
    privateWin.close();

    // Now try to read the cookie in a normal window, and wait for a new tab to be opened.
    gBrowser.selectedTab = gBrowser.addTab(rootDir + getterFile);
    testBrowser = gBrowser.selectedBrowser;
    gBrowser.tabContainer.addEventListener("TabOpen", onNewTabOpened2, true);
  }

  function onNewTabOpened2() {
    // When the new tab is opened, wait for it to load.
    gBrowser.tabContainer.removeEventListener("TabOpen", onNewTabOpened2, true);
    gBrowser.tabs[gBrowser.tabs.length - 1].linkedBrowser.addEventListener("load", onNewTabLoaded2, true);
  }

  function onNewTabLoaded2() {
    gBrowser.tabs[gBrowser.tabs.length - 1].linkedBrowser.removeEventListener("load", onNewTabLoaded2, true);

    // Now, ensure that the normal tab doesn't have access to the cookie set in private mode.
    is(testBrowser.contentDocument.getElementById("result").textContent, "",
       "Shouldn't have access to the cookies");

    // Remove both of the tabs opened here.
    gBrowser.removeCurrentTab();
    gBrowser.removeCurrentTab();

    finishedCallback();
  }
}
