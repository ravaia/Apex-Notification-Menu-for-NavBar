var notificationMenu = (function () {
    "use strict";
    var util = {
        /**********************************************************************************
         ** required functions 
         *********************************************************************************/
        featureInfo: {
            name: "APEX Notification Menu",
            info: {
                scriptVersion: "1.6.2",
                utilVersion: "1.3.5",
                url: "https://github.com/RonnyWeiss",
                license: "MIT"
            }
        },
        isDefinedAndNotNull: function (pInput) {
            if (typeof pInput !== "undefined" && pInput !== null && pInput != "") {
                return true;
            } else {
                return false;
            }
        },
        isAPEX: function () {
            if (typeof (apex) !== 'undefined') {
                return true;
            } else {
                return false;
            }
        },
        varType: function (pObj) {
            if (typeof pObj === "object") {
                var arrayConstructor = [].constructor;
                var objectConstructor = ({}).constructor;
                if (pObj.constructor === arrayConstructor) {
                    return "array";
                }
                if (pObj.constructor === objectConstructor) {
                    return "json";
                }
            } else {
                return typeof pObj;
            }
        },
        debug: {
            info: function () {
                if (util.isAPEX()) {
                    var i = 0;
                    var arr = [];
                    for (var prop in arguments) {
                        arr[i] = arguments[prop];
                        i++;
                    }
                    arr.push(util.featureInfo);
                    apex.debug.info.apply(this, arr);
                }
            },
            error: function () {
                var i = 0;
                var arr = [];
                for (var prop in arguments) {
                    arr[i] = arguments[prop];
                    i++;
                }
                arr.push(util.featureInfo);
                if (util.isAPEX()) {
                    apex.debug.error.apply(this, arr);
                } else {
                    console.error.apply(this, arr);
                }
            }
        },
        /**********************************************************************************
         ** optinal functions 
         *********************************************************************************/
        escapeHTML: function (str) {
            if (str === null) {
                return null;
            }
            if (typeof str === "undefined") {
                return;
            }
            if (typeof str === "object") {
                try {
                    str = JSON.stringify(str);
                } catch (e) {
                    /*do nothing */
                }
            }
            if (util.isAPEX()) {
                return apex.util.escapeHTML(String(str));
            } else {
                str = String(str);
                return str
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#x27;")
                    .replace(/\//g, "&#x2F;");
            }
        },
        jsonSaveExtend: function (srcConfig, targetConfig) {
            var finalConfig = {};
            var tmpJSON = {};
            /* try to parse config json when string or just set */
            if (typeof targetConfig === 'string') {
                try {
                    tmpJSON = JSON.parse(targetConfig);
                } catch (e) {
                    util.debug.error({
                        "msg": "Error while try to parse targetConfig. Please check your Config JSON. Standard Config will be used.",
                        "err": e,
                        "targetConfig": targetConfig
                    });
                }
            } else {
                tmpJSON = $.extend(true, {}, targetConfig);
            }
            /* try to merge with standard if any attribute is missing */
            try {
                finalConfig = $.extend(true, {}, srcConfig, tmpJSON);
            } catch (e) {
                finalConfig = $.extend(true, {}, srcConfig);
                util.debug.error({
                    "msg": "Error while try to merge 2 JSONs into standard JSON if any attribute is missing. Please check your Config JSON. Standard Config will be used.",
                    "err": e,
                    "finalConfig": finalConfig
                });
            }
            return finalConfig;
        },
        link: function (link, tabbed) {
            if (tabbed) {
                window.open(link, "_blank");
            } else {
                return window.parent.location.href = link;
            }
        },
        cutString: function (text, textLength) {
            try {
                if (textLength < 0) return text;
                else {
                    return (text.length > textLength) ?
                        text.substring(0, textLength - 3) + "..." :
                        text
                }
            } catch (e) {
                return text;
            }
        },
        removeHTML: function (pHTML) {
            if (util.isAPEX() && apex.util && apex.util.stripHTML) {
                return apex.util.stripHTML(pHTML);
            } else {
                return $("<div/>").html(pHTML).text();
            }
        }
    };

    return {

        initialize: function (elementID, ajaxID, udConfigJSON, items2Submit, escapeRequired, sanitize, sanitizerOptions) {
            var timers;
            var errCount = 0;

            var stdConfigJSON = {
                "refresh": 0,
                "mainIcon": "fa-bell",
                "mainIconColor": "white",
                "mainIconBackgroundColor": "rgba(70,70,70,0.9)",
                "mainIconBlinking": false,
                "counterBackgroundColor": "rgb(232, 55, 55 )",
                "counterFontColor": "white",
                "linkTargetBlank": false,
                "showAlways": false,
                "browserNotifications": {
                    "enabled": true,
                    "cutBodyTextAfter": 100,
                    "link": false
                },
                "accept": {
                    "color": "#44e55c",
                    "icon": "fa-check"
                },
                "decline": {
                    "color": "#b73a21",
                    "icon": "fa-close"
                },
                "hideOnRefresh": true
            };

            /* this is the default json for purify js */
            var sanitizeConfigJSON;
            var stdSanatizerConfigJSON = {
                "ALLOWED_ATTR": ["accesskey", "align", "alt", "always", "autocomplete", "autoplay", "border", "cellpadding", "cellspacing", "charset", "class", "dir", "height", "href", "id", "lang", "name", "rel", "required", "src", "style", "summary", "tabindex", "target", "title", "type", "value", "width"],
                "ALLOWED_TAGS": ["a", "address", "b", "blockquote", "br", "caption", "code", "dd", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "label", "li", "nl", "ol", "p", "pre", "s", "span", "strike", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"]
            };

            if (sanitize !== false) {
                if (sanitizerOptions) {
                    sanitizeConfigJSON = util.jsonSaveExtend(stdSanatizerConfigJSON, sanitizerOptions);
                } else {
                    sanitizeConfigJSON = stdSanatizerConfigJSON;
                }
            }

            var configJSON = {};
            configJSON = util.jsonSaveExtend(stdConfigJSON, udConfigJSON);

            /* define container and add it to parent */
            var container = drawContainer(elementID);

            if (configJSON.browserNotifications.enabled) {
                try {
                    if (!("Notification" in window)) {
                        util.debug.error("This browser does not support system notifications");
                    } else {
                        Notification.requestPermission();
                    }
                } catch (e) {
                    util.debug.error("Error while try to get notification permission");
                    util.debug.error(e);
                }
            }

            /* get data and draw */
            getData(drawBody);

            /* Used to set a refresh via json configuration */
            if (configJSON.refresh > 0) {
                timers = setInterval(function () {
                    if ($("#" + elementID).length === 0) {
                        clearInterval(timers);
                    }
                    /* stop timer after 3 loading errors occured */
                    if (errCount >= 2) {
                        clearInterval(timers);
                    }
                    if (container.children("span").length == 0) {
                        if (ajaxID) {
                            getData(refreshBody);
                        } else {
                            refreshBody(dataJSON);
                        }
                    }
                }, configJSON.refresh * 1000);
            }

            /***********************************************************************
             **
             ** function to escape of sanitize html
             **
             ***********************************************************************/
            function escapeOrSanitizeHTML(pHTML) {
                /* escape html if escape is set */
                if (escapeRequired !== false) {
                    return util.escapeHTML(pHTML);
                } else {
                    /* if sanitizer is activated sanitize html */
                    if (sanitize !== false) {
                        return DOMPurify.sanitize(pHTML, sanitizeConfigJSON);
                    } else {
                        return pHTML;
                    }
                }
            }

            /***********************************************************************
             **
             ** function to get data from Apex
             **
             ***********************************************************************/
            function getData(f) {
                apex.server.plugin(
                    ajaxID, {
                        pageItems: items2Submit
                    }, {
                        success: function (d) {
                            errCount = 0;
                            f(d);
                        },
                        error: function (d) {
                            if (errCount === 0) {
                                var dataJSON = {
                                    row: [{
                                            "NOTE_ICON": "fa-exclamation-triangle",
                                            "NOTE_ICON_COLOR": "#FF0000",
                                            "NOTE_HEADER": (d.responseJSON && d.responseJSON.error) ? d.responseJSON.error : "Error occured",
                                            "NOTE_TEXT": null,
                                            "NOTE_COLOR": "#FF0000"
                                    }
                                ]
                                };

                                f(dataJSON);
                                if (d.responseText) {
                                    util.debug.error(d.responseText);
                                }
                            }
                            errCount++;
                        },
                        dataType: "json"
                    });
            }

            /***********************************************************************
             **
             ** Used to draw a container
             **
             ***********************************************************************/
            function drawContainer(elementID) {
                var li = $("<li></li>");
                li.addClass("t-NavigationBar-item");

                var div = $("<div></div>");
                div.attr("id", elementID);

                div.bind("apexrefresh", function () {
                    if (container.children("span").length == 0) {
                        getData(refreshBody);
                    }
                });

                li.append(div);

                $(".t-NavigationBar").prepend(li);
                return (div);
            }

            /***********************************************************************
             **
             ** Used to draw a note body
             **
             ***********************************************************************/
            function drawBody(dataJSON) {
                configJSON.counterBackgroundColor = escapeOrSanitizeHTML(configJSON.counterBackgroundColor);
                configJSON.counterFontColor = escapeOrSanitizeHTML(configJSON.counterFontColor);
                configJSON.mainIcon = escapeOrSanitizeHTML(configJSON.mainIcon);
                configJSON.mainIconBackgroundColor = escapeOrSanitizeHTML(configJSON.mainIconBackgroundColor);
                configJSON.mainIconColor = escapeOrSanitizeHTML(configJSON.mainIconColor);

                var div = $("<div></div>");
                div.addClass("toggleNotifications");
                div.attr("id", elementID + "_toggleNote");

                var ul = "#" + elementID + "_ul";

                div.on("touchstart click", function () {
                    $(ul).toggleClass("toggleList");
                });

                $(document).on("touchstart click", function (e) {
                    if ((!div.is(e.target) && div.has(e.target).length === 0) && !$(e.target).parents(ul).length > 0) {
                        if ($(ul).hasClass("toggleList") === false) {
                            $(ul).toggleClass("toggleList");
                        }
                    }
                });

                var countDiv = $("<div></div>");
                countDiv.addClass("count");
                div.append(countDiv);

                var numDiv = $("<div></div>");
                numDiv.addClass("num");
                numDiv.css("background", configJSON.counterBackgroundColor);
                numDiv.css("color", configJSON.counterFontColor);
                numDiv.attr("id", elementID + "_numdiv");
                numDiv.html(dataJSON.row.length);
                countDiv.append(numDiv);

                var bellLabel = $("<label></label>");
                bellLabel.addClass("show");
                bellLabel.css("background", configJSON.mainIconBackgroundColor);

                var bellI = $("<i></i>");
                bellI.addClass("fa");
                bellI.addClass(configJSON.mainIcon);
                bellI.css("color", configJSON.mainIconColor);

                if (configJSON.mainIconBlinking) {
                    bellI.addClass("fa-blink");
                }

                bellLabel.append(bellI);

                div.append(bellLabel);

                container.append(div);

                refreshBody(dataJSON);
            }

            /***********************************************************************
             **
             ** Used to refresh
             **
             ***********************************************************************/
            function refreshBody(dataJSON) {
                var toggleNote = "#" + elementID + "_toggleNote";
                $(toggleNote).hide();
                if (dataJSON.row) {
                    var numDivID = "#" + elementID + "_numdiv";
                    var ulID = "#" + elementID + "_ul";
                    if (dataJSON.row.length > 0) {
                        $(numDivID).css("background", configJSON.counterBackgroundColor);
                        $(toggleNote).show();
                        $(numDivID).show();
                        $(numDivID).text(dataJSON.row.length);
                        $(ulID).empty();
                        drawList($(toggleNote), dataJSON)
                    } else {
                        if (configJSON.showAlways) {
                            $(toggleNote).show();
                            $(numDivID).hide();
                        }
                        $(ulID).empty();
                    }
                }
            }

            /***********************************************************************
             **
             ** Used to draw the note list
             **
             ***********************************************************************/
            function drawList(div, dataJSON) {
                var str = "";
                var ul;
                var isRefresh = false;
                if ($("#" + elementID + "_ul").length) {
                    ul = $("#" + elementID + "_ul");
                    isRefresh = true;
                } else {
                    ul = $("<ul></ul>");
                    ul.attr("id", elementID + "_ul");
                    ul.addClass("notifications");
                    ul.addClass("toggleList");
                }

                if (isRefresh && configJSON.hideOnRefresh && $(ul).hasClass("toggleList") === false) {
                    $(ul).addClass("toggleList");
                }

                if (dataJSON.row) {
                    $.each(dataJSON.row, function (item, data) {
                        if (configJSON.browserNotifications.enabled) {
                            if (data.NO_BROWSER_NOTIFICATION != 1) {
                                try {
                                    var title, text;
                                    if (data.NOTE_HEADER) {
                                        title = util.removeHTML(data.NOTE_HEADER);
                                    }
                                    if (data.NOTE_TEXT) {
                                        text = util.removeHTML(data.NOTE_TEXT);
                                        text = util.cutString(text, configJSON.browserNotifications.cutBodyTextAfter);
                                    }
                                    /* fire notification after timeout for better browser usability */
                                    setTimeout(function () {
                                        if (!("Notification" in window)) {
                                            util.debug.Error("This browser does not support system notifications");
                                        } else if (Notification.permission === "granted") {
                                            var notification = new Notification(title, {
                                                body: text,
                                                requireInteraction: configJSON.browserNotifications.requireInteraction
                                            });
                                            if (configJSON.browserNotifications.link && data.NOTE_LINK) {
                                                notification.onclick = function (event) {
                                                    util.link(data.NOTE_LINK)
                                                }
                                            }
                                        } else if (Notification.permission !== 'denied') {
                                            Notification.requestPermission(function (permission) {
                                                if (permission === "granted") {
                                                    var notification = new Notification(title, {
                                                        body: text,
                                                        requireInteraction: configJSON.browserNotifications.requireInteraction
                                                    });
                                                    if (configJSON.browserNotifications.link && data.NOTE_LINK) {
                                                        notification.onclick = function (event) {
                                                            util.link(data.NOTE_LINK)
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    }, 150 * item);
                                } catch (e) {
                                    util.debug.error("Error while try to get notification permission");
                                    util.debug.error(e);
                                }
                            }
                        }

                        if (data.NOTE_HEADER) {
                            data.NOTE_HEADER = escapeOrSanitizeHTML(data.NOTE_HEADER);
                        }
                        if (data.NOTE_ICON) {
                            data.NOTE_ICON = escapeOrSanitizeHTML(data.NOTE_ICON);
                        }
                        if (data.NOTE_ICON_COLOR) {
                            data.NOTE_ICON_COLOR = escapeOrSanitizeHTML(data.NOTE_ICON_COLOR);
                        }
                        if (data.NOTE_TEXT) {
                            data.NOTE_TEXT = escapeOrSanitizeHTML(data.NOTE_TEXT);
                        }

                        var a = $("<a></a>");

                        if (data.NOTE_LINK) {
                            a.attr("href", data.NOTE_LINK);
                            if (configJSON.linkTargetBlank) {
                                a.attr("target", "_blank");
                            }
                            a.on("touchstart click", function (e) {
                                $(ul).addClass("toggleList");
                            });
                        }

                        var li = $("<li></li>");
                        li.addClass("note");
                        if (data.NOTE_COLOR) {
                            li.css("box-shadow", "-5px 0 0 0 " + data.NOTE_COLOR);
                        }

                        if (data.NOTE_ACCEPT || data.NOTE_DECLINE) {
                            li.css("padding-right", "32px");

                            if (data.NOTE_ACCEPT) {
                                var acceptA = $("<a></a>");
                                acceptA.addClass("accept-a");
                                acceptA.attr("href", data.NOTE_ACCEPT);

                                var acceptI = $("<i></i>");
                                acceptI.addClass("fa");
                                acceptI.addClass(configJSON.accept.icon);
                                acceptI.css("color", configJSON.accept.color);
                                acceptI.css("font-size", "20px");
                                acceptA.append(acceptI);

                                li.append(acceptA);
                            }
                            if (data.NOTE_DECLINE) {
                                var declineA = $("<a></a>");
                                declineA.addClass("decline-a");
                                declineA.attr("href", data.NOTE_DECLINE);
                                if (data.NOTE_ACCEPT) {
                                    declineA.css("bottom", "40px");
                                }

                                var declineI = $("<i></i>");
                                declineI.addClass("fa");
                                declineI.addClass(configJSON.decline.icon);
                                declineI.css("color", configJSON.decline.color);
                                declineI.css("font-size", "24px");
                                declineA.append(declineI);

                                li.append(declineA);
                            }
                        }

                        var noteHeader = $("<div></div>");
                        noteHeader.addClass("note-header");

                        var i = $("<i></i>");
                        i.addClass("fa");
                        if (data.NOTE_ICON) {
                            i.addClass(data.NOTE_ICON);
                        }
                        if (data.NOTE_ICON_COLOR) {
                            i.css("color", data.NOTE_ICON_COLOR);
                        }
                        i.addClass("fa-lg");

                        noteHeader.append(i);
                        if (data.NOTE_HEADER) {
                            noteHeader.append(data.NOTE_HEADER);
                        }
                        li.append(noteHeader);

                        var span = $("<span></span>");
                        span.addClass("note-info");
                        if (data.NOTE_TEXT) {
                            span.html(data.NOTE_TEXT);
                        }
                        li.append(span);

                        a.append(li);

                        ul.append(a);
                    });

                }

                $("body").append(ul);
            }
        }
    }
})();
