/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests that we report JS exceptions in event handlers coming from
// network requests, like onreadystate for XHR. See bug 618078.

const TEST_URI = "http://example.com/browser/browser/devtools/webconsole/test/test-bug-618078-network-exceptions.html";

function test()
{
  addTab("data:text/html;charset=utf-8,Web Console test for bug 618078");

  browser.addEventListener("load", function onLoad() {
    browser.removeEventListener("load", onLoad, true);
    openConsole(null, function(hud) {
      expectUncaughtException();
      content.location = TEST_URI;

      waitForMessages({
        webconsole: hud,
        messages: [{
          text: "bug618078exception",
          category: CATEGORY_JS,
          severity: SEVERITY_ERROR,
        }],
      }).then(finishTest);
    });
  }, true);
}
