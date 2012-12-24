// ======================================================================================================
// Class: Dojo Implementation of Timeline-JS using GFX
// Adnan (Web Semantics, Inc.)
// Date: 21 Dec 2012
// ======================================================================================================

/*
 Changes: 
 (1) Implementation as Dijit Widget
 (2) Resizable at run-time
 (3) Cursor/Time needle dragging
 (4) Fix problem, creating a marker when click on the scale
 (5) Create periods on moues Drag
 
 */

/*!
 * timeline.js
 * @version 0.1.0
 * @author <a href="mailto:samuel.goldszmidt@gmail.com">Samuel Goldszmidt</a>
 * @description 
 * <p>Javascript library for timeline representation of <audio /> <video /> HTML5 tag.</p>
 * <p>Copyright (C) 2011 Samuel Goldszmidt</p>
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * Creates an instance of Timeline.
 *
 * @constructor
 * @this {Circle}
 * @param {String} media The Id of the media (audio/video) element tag
 * @param {String} timeline The Id of the timeline (div) element tag
 * @param {Number} duration The duration of the media in seconds
 * @param {Object} [override_options] Options for configuration of the timeline
 * @param {Number} [override_options.height] The height of the entire timeline (applied to timeline div tag).
 * @param {Number} [override_options.width] The width of the entire timeline (applied to timeline div tag).
 * @param {Number} [override_options.scaleHeight] The scale height of the timeline scale (applied to timeline div tag).
 * @param {String} [override_options.scaleBackgroundColor] The background color of the scale of the timeline.
 * @param {String} [override_options.scaleColor] The scale color of the timeline.
 * @param {String} [override_options.trackSeparatorColor] The track separator color of the timeline.
 * @param {String} [override_options.backgroundColor] The background color of the timeline.
 * @param {String} [override_options.textColor] The color of the text on the timeline.
 * @param {String} [override_options.cursorColor] The color of the cursor on the timeline.
 * @param {Number} [override_options.maxScaleFactor] The max scale factor of the timeline.
 * @param {Number} [override_options.numberOfTracks] The number of track to display on the timeline.
 * @param {String} [override_options.periodShape] The type of shape for periods on the timeline.
 * @param {String} [override_options.cursorHeight] The height of the cursor on the timeline.
 * @param {String} [scale] The Id of the scale (input range) element tag
 * @param {String} [scroll] The Id of the scale (input range) element tag
 */


define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom-geometry",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dnd/Moveable",
    "dijit/_WidgetBase"
],
        function(declare, lang, on, domGeom, domConstruct, domAttr, domStyle, Moveable, WidgetBase) {
            return declare([WidgetBase], {
                region: 'center',
                options: {
                    'height': 160,
                    'width': 600,
                    'scaleHeight': 30,
                    'scaleBackgroundColor': '#111',
                    'scaleColor': '#ccc',
                    'trackSeparatorColor': '#fff',
                    'backgroundColor': '#ddd',
                    'textColor': '#eee',
                    'cursorColor': '#f00',
                    'maxScaleFactor': 5,
                    'numberOfTracks': 3,
                    'periodShape': 'rectangle',
                    'cursorHeight': 100,
                    //'followCursor':true,
                    'mode': 'read', /* create, read, update, delete*/
                    'newPeriodColor': '#0A3AEE'
                },
                constructor: function(override_options) {

                    // Obtain options
                    if (override_options) {
                        for (var i in override_options)
                            if (override_options[i] != undefined)
                                this.options[i] = override_options[i];
                    }

                    // Media duration
                    this.duration = null;

                    // Widget width, height
                    this.width = this.options.width;
                    this.height = this.options.height;

                    // Other settings
                    this.time = 0;
                    this._periods = [];
                    this._markers = [];

                    //this._currentActives = []
                    this.updateTarget = null; // for update mode, need to know the target the user want to udpate
                    this.updateAnchor = null; // for update mode, need to know, for periods, if it's a left or right udapte (timein or timeout)

                    this.mouseDownEvent = null;
                    this.mouseUpEvent = null;

                },
                postCreate: function() {
                    this.inherited(arguments);
                    this.init(this.domNode);
                },
                init: function(timeline, scale, scroll) {

                    this.timeline = timeline;

                    if (scale) {
                        this.scale = document.getElementById(scale);
                        this.scale.setAttribute("max", this.options.maxScaleFactor)
                    }

                    if (scroll) {
                        this.scroll = document.getElementById(scroll)
                    }

                    this.timeline.style.height = this.options.height + "px";
                    this.set('background', this.options.backgroundColor);

                    this.canvas = domConstruct.create("canvas");
                    this.context = this.canvas.getContext("2d");
                    this.timeline.appendChild(this.canvas);

                    // Attach a dragging event
                    var dnd = new Moveable(this.timeline);
                    // Don't allow moving the DOM Node (only capture the events)
                    dnd.onMove = lang.hitch(this, this.onMouseDrag);

                    /* 
                     this.draggingScale = false;
                     this.draggingScroll = false;
                     this.setCurrentTime = false;
                     this.followCursor = false
                     */
                },
                set: function(key, value) {
                    if (key == 'background')
                        domStyle.set(this.timeline, {background: value});

                },
                get: function(key) {

                },
                // Invoked when the media is ready
                ready: function(duration, media) {
                    this.duration = duration;
                    this.media = media;
                    this.ratio = this.width / this.duration;
                    this.addEventListeners();
                },
                // Resize the widget to the specified width
                resize: function(size) {
                    this.inherited(arguments);
                    if (size) {
                        this.width = size.w;
                        this.ratio = this.width / this.duration;
                        this.redraw();
                    }
                },
                // Refresh the user interface (Access when the widget is ready)
                redraw: function() {

                    var width = this.width;
                    // Adjust the width of the timeline container and canvas
                    domAttr.set(this.canvas, 'width', width + "px");
                    domStyle.set(this.timeline, {width: width + "px"});

                    var lastTimeLabelX = 0;

                    // Timeline
                    this.drawRect(0, 0, width, this.options.scaleHeight, this.options.scaleBackgroundColor);

                    var x = this.timeToX(0);
                    this.context.fillStyle = this.options.textColor;
                    var sec = 0;
                    while (x < width && sec < this.duration) {
                        x = this.timeToX(sec);
                        var anchor_height = 5;
                        var anchor_end = this.options.scaleHeight;
                        if (sec % 10 == 0)
                            anchor_height = 10;
                        if (sec % 30 == 0) {
                            anchor_height = 15;
                            anchor_end = this.options.height;
                        }

                        if (sec % 60 == 0) {
                            anchor_height = 20;
                            anchor_end = this.options.height;
                        }

                        this.drawLine(x, this.options.scaleHeight - anchor_height, x, anchor_end, this.options.scaleColor);
                        var hours = parseInt(sec / 3600) % 24;
                        var minutes = parseInt(sec / 60) % 60;
                        var seconds = sec % 60;

                        // Construct the label
                        var time = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
                        if (x - lastTimeLabelX > 50) {
                            this.context.fillText(time, x - 20, 10);
                            lastTimeLabelX = x;
                        }
                        sec += 1;
                    }
                    // Tracks
                    for (var i = 0; i < this.options.numberOfTracks; i++) {
                        this.drawLine(0, i * (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks + this.options.scaleHeight, width, i * (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks + this.options.scaleHeight, this.options.trackSeparatorColor)
                    }

                    // Periods
                    this._drawPeriods();

                    // Markers
                    for (var i = 0; i < this._markers.length; i++) {
                        var obj = this._markers[i];
                        this.drawLine(this.timeToX(obj.time), this.options.scaleHeight, this.timeToX(obj.time), this.options.height - 1, obj.color)
                    }
                    // Time ticker (cursor)
                    this.drawLine(this.timeToX(this.time), 0, this.timeToX(this.time), this.options.cursorHeight, this.options.cursorColor);

                },
                // Draw Periods
                _drawPeriods: function() {
                    for (var i = 0; i < this._periods.length; i++) {
                        var obj = this._periods[i]
                        if (this.options.periodShape == 'rectangle') {
                            if (this.time > obj.time_in && this.time < obj.time_out) {
                                this.drawRect(this.timeToX(obj.time_in), this.yTrack(obj.track).top, this.timeToX(obj.time_out) - this.timeToX(obj.time_in), this.yTrack(obj.track).bottom - this.yTrack(obj.track).top, obj.color, obj.label, true)
                            }
                            else {
                                this.drawRect(this.timeToX(obj.time_in), this.yTrack(obj.track).top, this.timeToX(obj.time_out) - this.timeToX(obj.time_in), this.yTrack(obj.track).bottom - this.yTrack(obj.track).top, obj.color, obj.label)
                            }
                        }
                        if (this.options.periodShape == 'bubble') {
                            if (this.time > obj.time_in && this.time < obj.time_out) {
                                this.drawBubble(this.timeToX(obj.time_in), this.yTrack(obj.track).top, this.timeToX(obj.time_out) - this.timeToX(obj.time_in), this.yTrack(obj.track).bottom - this.yTrack(obj.track).top, obj.track, obj.color, obj.label, true)
                            } else {
                                this.drawBubble(this.timeToX(obj.time_in), this.yTrack(obj.track).top, this.timeToX(obj.time_out) - this.timeToX(obj.time_in), this.yTrack(obj.track).bottom - this.yTrack(obj.track).top, obj.track, obj.color, obj.label)
                            }
                        }
                    }
                },
                // add events
                addEventListeners: function() {
                    on(this.media, "timeupdate", lang.hitch(this, this.onTimeUpdate));
                    on(this.canvas, "click", lang.hitch(this, this.onMouseClick));
                    on(this.canvas, "mousedown", lang.hitch(this, this.onMouseDown));
                    on(this.canvas, "mousedown", lang.hitch(this, this.onCanvasMouseMove));
                    on(this.canvas, "mouseup", lang.hitch(this, this.onMouseUp));

                    if (this.scale)
                        on(this.scale, "change", lang.hitch(this, this.onScaleUpdate));

                    if (this.scroll)
                        on(this.scroll, "change", lang.hitch(this, this.onScrollUpdate));

                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onTimeUpdate: function(event) {
                    this.time = this.media.currentTime
                    // dispatch current 'active' elements	
                    /*
                     for(var i=0; i<this._periods.length; i++){
                     if(this.time > this._periods[i].time_in && this.time < this._periods[i+1].time_out){
                     //console.log("go", this._periods[i].id)
                     if(this._currentActives.indexOf(this._periods[i].id) == -1){
                     this._currentActives.push(this._periods[i].id)
                     }	
                     }else {
                     if(this._currentActives.indexOf(this._periods[i].id) != -1){
                     this._currentActives.splice(this._currentActives.indexOf(this._periods[i].id), 1);
                     }			
                     }
                     }
                     console.log(this._currentActives)
                     */
                    this.redraw()
                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onScaleUpdate: function(event) {
                    this.scroll.setAttribute('max', Math.max(0, this.duration - this.getWindowVisibleTime()))
                    this.redraw();
                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onScrollUpdate: function(event) {
                    this.redraw();
                },
                /**
                 * @event
                 * @param  mover, leftTop
                 * @private
                 */
                onMouseDrag: function(mover, leftTop, event) {
                    this.onMouseClick(event);
                    this.onMouseUp(event);
                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onMouseClick: function(event) {
                    /*    
                     var totalOffsetX = 0;
                     var totalOffsetY = 0;
                     var canvasX = 0;
                     var canvasY = 0;
                     var currentElement = this.timeline;
                     do{
                     totalOffsetX += currentElement.offsetLeft;
                     totalOffsetY += currentElement.offsetTop;
                     }                      while(currentElement = currentElement.offsetParent)
                     var x = event.pageX - totalOffsetX;
                     var y = event.pageY - totalOffsetY;
                     */

                    var pos = this.getRelativePosition({x: event.pageX, y: event.pageY});
                    var mouse_time = this.xToTime(pos.x);
                    // Detect a click on the scale area, move the time needle
                    if (pos.y > this.options.scaleHeight && pos.y < this.options.height) {
                        for (var i = 0; i < this._periods.length; i++) {
                            var period = this._periods[i];
                            if (mouse_time > period.time_in && mouse_time < period.time_out && pos.y > this.yTrack(period.track).top && pos.y < this.yTrack(period.track).bottom) {
                                mouse_time = period.time_in;
                                if (this.options.mode == 'delete') {
                                    this._periods.splice(i, 1);
                                    this.redraw();
                                    return false;
                                }
                                this.media.currentTime = mouse_time;
                            }
                        }
                    }
                    if (pos.y > 0 && pos.y < this.options.scaleHeight) {
                        this.media.currentTime = mouse_time;
                    }
                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onMouseDown: function(event) {
                    this.mouseDownEvent = event
                },
                /**
                 * @event
                 * @param  event
                 * @private
                 */
                onMouseUp: function(event) {
                    return;
                    this.mouseUpEvent = event

                    var pos = this.getRelativePosition({x: event.pageX, y: event.pageY});
                    /* Bug fix (Adnan, 23/12/2012): don't allow create/update if mouse on the scale area */
                    if (pos.y > this.options.scaleHeight && pos.y < this.options.height) {
                        var initial_point = this.getRelativePosition({x: this.mouseDownEvent.pageX, y: this.mouseDownEvent.pageY})
                        var final_point = this.getRelativePosition({x: this.mouseUpEvent.pageX, y: this.mouseUpEvent.pageY})

                        if (this.options.mode == 'create') {

                            if (initial_point == final_point) {
                                // create marker
                            }
                            else {
                                // create period
                                this.addPeriod(this.xToTime(initial_point.x), this.xToTime(final_point.x), this.options.newPeriodColor, this.yToTrack(final_point.y))
                            }
                        }
                        if (this.options.mode == 'update') {
                            if (this.updateAnchor == 'right') {
                                this._periods[this.updateTarget].time_out = this.xToTime(final_point.x)
                            } else {
                                this._periods[this.updateTarget].time_in = this.xToTime(final_point.x)
                            }
                            this.redraw()
                        }
                    }
                },
                /**
                 * @event                  * @param  event
                 * @private
                 */
                onCanvasMouseMove: function(event) {
                    if (this.options.mode == 'update') {
                        var pos = this.getRelativePosition({x: event.pageX, y: event.pageY});
                        var mouse_time = this.xToTime(pos.x);
                        for (var i = 0; i < this._periods.length; i++) {
                            var period = this._periods[i];
                            if (mouse_time > period.time_in && mouse_time < period.time_out && pos.y > this.yTrack(period.track).top && pos.y < this.yTrack(period.track).bottom) {
                                //mouse_time = period.time_in
                                // TODO : bug : not set this, or modify while update shape 
                                this.updateTarget = i;
                                this.updateAnchor = 'right';
                                if (Math.abs(period.time_in - mouse_time) < Math.abs(period.time_out - mouse_time)) {
                                    this.updateAnchor = 'left';
                                }
                            }
                        }
                    }
                },
                /**
                 * Add Period
                 * @param {Number} time_in The time in of the period in seconds
                 * @param {Number} time_out The time out of the period in seconds
                 * @param {String} color The color of the period
                 * @param {Number} [track] The track number where the period must be                  */
                addPeriod: function(time_in, time_out, color, track, label) {
                    var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                    if (track == undefined) {
                        track = 1
                    }
                    var period = {id: id, time_in: parseInt(time_in), time_out: parseInt(time_out), color: color, track: track}
                    if (label != undefined) {
                        period.label = label;
                    }
                    this._periods.push(period)
                    this.redraw()
                    return id
                },
                /**
                 * Add Marker
                 * @param {Number} time_in The time in of the marker in seconds
                 * @param {String} color The color of the marker
                 */
                // TODO ADD Track position of the marker
                addMarker: function(time, color) {
                    this._markers.push({time: parseInt(time), color: color});
                    this.redraw();
                },
                /**
                 * Live set option
                 */
                setOption: function(name, value) {
                    this.options[name] = value;
                },
                // TIME-X CONVERSION UTILS
                /**
                 * @private
                 */
                timeToX: function(time) {
                    //var visibleTime = this.xToTime(this.w)
                    //var visibleTime = this.duration * this.scale.value
                    var visibleTime = this.getWindowVisibleTime()
                    if (visibleTime < this.duration) {
                        time = time - this.scroll.value;
                    }
                    if (this.scale) {
                        return time * this.scale.value * this.ratio;
                    }
                    else {
                        return time * 1 * this.ratio;
                    }
                },
                /**
                 * @private
                 */
                xToTime: function(x) {
                    var visibleTime = this.getWindowVisibleTime()
                    if (this.scroll) {
                        var timeShift = Math.max(0, this.scroll.value);
                    } else {
                        var timeShift = 0
                    }
                    if (this.scale) {
                        return x / (this.scale.value * this.ratio) + timeShift;
                    }
                    else {
                        return x / (1 * this.ratio) + timeShift;
                    }

                },
                // Y CONVERSION UTILS
                /**
                 * @private
                 */
                yTrack: function(track) {
                    top_position = (track - 1) * (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks + this.options.scaleHeight;
                    bottom_position = track * (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks + this.options.scaleHeight;
                    var positions = {top: top_position, bottom: bottom_position}
                    return positions
                },
                yToTrack: function(y) {
                    var track_height = (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks
                    for (var j = 0; j < this.options.numberOfTracks; j++) {
                        if (y > this.options.scaleHeight + j * track_height && y < this.options.scaleHeight + (j + 1) * track_height) {
                            return j + 1
                        }
                    }
                    return 1
                },
                /**
                 * @private
                 */
                getWindowVisibleTime: function() {
                    if (this.scale) {
                        return this.duration / this.scale.value
                    } else {
                        return this.duration
                    }
                },
                // X,Y CONVERSION UTILS
                /**
                 * @private                  */
                getRelativePosition: function(obj) {
                    var totalOffsetX = 0;
                    var totalOffsetY = 0;
                    var canvasX = 0;
                    var canvasY = 0;
                    var currentElement = this.timeline;
                    do {
                        totalOffsetX += currentElement.offsetLeft;
                        totalOffsetY += currentElement.offsetTop;
                    }
                    while (currentElement = currentElement.offsetParent)
                    var x = obj.x - totalOffsetX;
                    var y = obj.y - totalOffsetY;
                    return {x: x, y: y}
                },
                // DRAW UTILS
                /**
                 * @private
                 */
                drawLine: function(x1, y1, x2, y2, color) {
                    this.context.strokeStyle = color;
                    this.context.lineWidth = 1
                    this.context.beginPath();
                    this.context.moveTo(x1, y1);
                    this.context.lineTo(x2, y2);
                    this.context.stroke();
                },
                /**
                 * @private
                 */
                drawRect: function(x, y, w, h, color, label, highlight) {
                    this.context.fillStyle = color;
                    this.context.strokeStyle = '#FF0';
                    this.context.lineWidth = 3
                    this.context.fillRect(x, y, w, h);
                    //if(highlight){this.context.stroke();}
                },
                /**
                 * @private
                 */
                drawBubble: function(x, y, w, h, t, color, label, highlight) {
                    var cx = x + w / 2
                    var h_track = (this.options.height - this.options.scaleHeight) / this.options.numberOfTracks * t
                    var cy = y
                    var r = w / 2
                    this.context.fillStyle = color;
                    this.context.strokeStyle = '#FF0';
                    this.context.lineWidth = 3
                    this.context.beginPath();
                    this.context.moveTo(x, this.options.scaleHeight)
                    this.context.quadraticCurveTo(x, this.options.scaleHeight + h_track, x + w / 2, this.options.scaleHeight + h_track)
                    this.context.quadraticCurveTo(x + w, this.options.scaleHeight + h_track, x + w, this.options.scaleHeight)
                    this.context.moveTo(x, this.options.scaleHeight)
                    this.context.fill();
                    if (highlight) {
                        this.context.stroke();
                    }
                    this.context.closePath();
                    if (label) {
                        var label_width = this.context.measureText(label);
                        this.context.fillStyle = "#000";
                        this.context.fillText(label, x + w / 2 - label_width.width / 2, this.options.scaleHeight + h_track - 10);
                    }
                },
                /**
                 * @private
                 */
                drawCircle: function(cx, cy, r, color) {
                    this.context.fillStyle = color;
                    this.context.beginPath();
                    this.context.arc(cx, cy, r, 0, Math.PI * 2, true);
                    this.context.closePath();
                    this.context.fill();
                },
                /**
                 * @private
                 */
                drawCenteredRect: function(x, y, w, h, color) {
                    this.context.fillStyle = color;
                    this.context.fillRect(x - w / 2, y - h / 2, w, h);
                },
                /**
                 * @private
                 */
                drawRombus: function(x, y, w, h, color, drawLeft, drawRight, strokeColor) {
                    this.context.fillStyle = color;
                    if (strokeColor) {
                        this.context.lineWidth = 2;
                        this.context.strokeStyle = strokeColor;
                        this.context.beginPath();
                        this.context.moveTo(x, y - h / 2);
                        this.context.lineTo(x + w / 2, y);
                        this.context.lineTo(x, y + h / 2);
                        this.context.lineTo(x - w / 2, y);
                        this.context.lineTo(x, y - h / 2);
                        this.context.stroke();
                        this.context.lineWidth = 1;
                    }

                    if (drawLeft) {
                        this.context.beginPath();
                        this.context.moveTo(x, y - h / 2);
                        this.context.lineTo(x - w / 2, y);
                        this.context.lineTo(x, y + h / 2);
                        this.context.fill();
                    }

                    if (drawRight) {
                        this.context.beginPath();
                        this.context.moveTo(x, y - h / 2);
                        this.context.lineTo(x + w / 2, y);
                        this.context.lineTo(x, y + h / 2);
                        this.context.fill();
                    }
                }
            });
        });
