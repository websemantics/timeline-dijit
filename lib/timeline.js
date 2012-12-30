/*
 
 Dijit-Timeline
 
 Dojo Implementation of Timeline-JS using Dojox GFX API (SVG, VML and Canvas support)
 Copyright (c) 2012 Web Semantics, Inc (See Original Copyright below).
 Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license) 
 Date 21 Dec 2012
 Version: 1.0
 
 Changes: 
 ========
 
 (1) Implementation as Dijit 
 (2) Resizable at run-time
 (3) Cursor dragging
 (4) Fix problem, creating a marker/period  when click on the scale
 (5) Create periods/markers on moues Drag 
 (6) Left and right padding
 (7) SVG, VML and HTML5 Canvas support using Dojox GFX
 (8) Font support
 (9) Text margin around labels
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

define(["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/dom-style", "dojo/dnd/Moveable", "dijit/_WidgetBase", "dojox/gfx"],
        function(declare, lang, on, domStyle, Moveable, WidgetBase, gfx) {

            // Time duration of the media
            var duration = 0;
            // The timeline DOM node
            timeline = null;
            // Width (inner width) to Time (duration) ratio
            var ratio = 1;
            // Scrollbars
            var scrollbar_scale = null;
            var scrollbar_scroll = null;
            // Timeline Widget Options (private)
            var options = {
                height: 160,
                width: 600,
                paddingLeft: 20, /* New: Padding on the left of the widget */
                paddingRight: 20, /* New: Padding on the right of the widget */
                anchorHeights: {default: 5, 10: 10, 30: 14, 60: 18}, /* New: Adjustable Anchor height */
                font: {family: "Arial", size: "11px", weight: "bold"}, /* New: Font support */
                highlightStroke: {color: '#FF0', width: 1}, /* New: Stroke highlight periods when within time needle range */
                periodStroke: null, /* New: Stroke highlight periods when within time needle range */
                highlightFill: '#aeaeae', /* New: Fill color highlight periods when within time needle range */
                focusFill: '#a66b00', /* New: Focus color highlight periods when within time needle range */
                highlightTrackFill: '#eee', /* New: Fill color highlight a track */
                scaleHeight: 30,
                scaleBackgroundColor: '#111',
                scaleColor: '#ccc',
                trackSeparatorColor: '#fff',
                trackSeparatorDottedWidth: 0,
                backgroundColor: '#ddd',
                scaleLabelColor: '#eee',
                textLabel: {color: '#eee', align: "left", padding: 10},
                tracksPadding: false, /* New: if ture, the track will take into account the left and right paddings  */
                textMargin: 5, /* New: Left and Right margin around labels */
                showScaleLabels: true, /* New: Show or hide scale labels */
                showPeriodLabels: true, /* New: Show or hide period labels */
                cursorColor: '#f00',
                maxScaleFactor: 5,
                numberOfTracks: 3,
                periodShape: 'rectangle', /* Has two values: 'bubble' or 'rectangle' */
                cursorHeight: 100,
                //'followCursor':true,
                mode: 'read', /* create, read, update, delete*/
                newPeriodColor: '#0A3AEE',
                handleWidth: 10, /* New: Period resize handler */
                handleMinWidth: 10, /* New: Minimum width before handles turn state to outside */
                insideHandleFill: [255, 255, 255, 0.3],
                outsideHandleFill: [180, 180, 180, 0.3],
                minDuration: 0.05, /* min duration for period, also the duration of a marker */
                markerWidth: 3, /* Marker width in pixels */
            };

            /************************
             * Classes
             ***********************/

            var Scale = declare([], {
                // summary:
                // 	the timeline scale area (contains the background color, timestamp labels etc)
                constructor: function(surface) {
                    // surface: Surface
                    //		the master graphics context
                    //		
                    this.shape = null; /* GFX Shape */
                    this._anchors = {}; /* List of all the timeline scale anchors */
                    this.event_shape = null; /* Used to capture events */
                    this.group = surface.createGroup(); /* the graphics context used to draw the graphics
                     elements of the timeline scale area */
                    this.elements_group = this.group.createGroup(); /* Container group for all graphics elements */
                    this.labels_group = this.group.createGroup(); /* Container group for all scale labels */
                    this.events_group = this.group.createGroup(); /* Container group for all scale labels */
                },
                draw: function(x, y, width, inner_width) {
                    // summary:
                    //		draws the content of the Scale
                    // x: Number
                    //		the x coordinate of the timeline scale area
                    // y: Number
                    //		the y coordinate of the timeline scale area
                    // width: Number
                    //		the width of the timeline scale area
                    // inner_width: Number
                    //		width without the paddings (left and right)
                    //

                    // Draw the background color
                    this.shape = drawRect(this.shape, x, y, width, options.scaleHeight, options.scaleBackgroundColor, this.elements_group);
                    this.event_shape = drawRect(this.event_shape, x, y, width, options.scaleHeight, [0, 0, 0, 0], this.events_group);

                    // Draw the labels and time anchors
                    var lastTimeLabelX = 0;
                    var lastTimeLabelWidth = 0;

                    var x = _time.timeToX(0);

                    // Clear all labels first
                    if (options.showScaleLabels && this.labels_group)
                        this.labels_group.clear();

                    var sec = 0;
                    if (inner_width / duration >= 1) /* Only increments that are greater than or equal to 1 */
                        while (x < inner_width && sec < duration) {
                            x = _time.timeToX(sec);

                            var anchor_height = options.anchorHeights.default;
                            var anchor_end = options.scaleHeight;

                            // Adjust the Anchor height
                            for (var a in options.anchorHeights)
                                if (a != 'default' && sec % a == 0)
                                    anchor_height = options.anchorHeights[a];

                            this._anchors[sec] = drawLine(this._anchors[sec], x + options.paddingLeft,
                                    options.scaleHeight - anchor_height, x + options.paddingLeft, anchor_end, options.scaleColor, this.elements_group);

                            var hours = parseInt(sec / 3600) % 24;
                            var minutes = parseInt(sec / 60) % 60;
                            var seconds = sec % 60;

                            // Construct the label, first clear exsiting ones!
                            var time = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

                            /* New: dynamic text width */
                            if (options.showScaleLabels && (x - lastTimeLabelX > (lastTimeLabelWidth + options.textMargin * 2))) {
                                var text = createText(null, time, x + options.paddingLeft, 10, 0, {color: options.scaleLabelColor, align: 'left', padding: 0}, this.labels_group);
                                lastTimeLabelWidth = text.getTextWidth();
                                lastTimeLabelX = x;
                            }
                            sec += 1;
                        }

                }
            });

            var Time = declare([], {
                // summary:
                //		a generic time class for generic time : x-coordinate conversions
                timeToX: function(time) {
                    // summary:
                    //		convert time to x position
                    // time: Time
                    //		the time on according to the scale

                    //var visibleTime = _time.xToTime(this.w)
                    //var visibleTime = duration * scrollbar_scale.value
                    var visibleTime = this.getWindowVisibleTime();

                    if (visibleTime < duration)
                        time = time - scrollbar_scroll.value;
                    if (scrollbar_scale)
                        return time * scrollbar_scale.value * ratio;
                    else
                        return time * 1 * ratio;
                },
                xToTime: function(x) {
                    // summary:
                    //		convert x position to time
                    // x: Number
                    //		the x coordinate on the timeline scale area

                    if (scrollbar_scroll) {
                        var timeShift = Math.max(0, scrollbar_scroll.value);
                    } else {
                        var timeShift = 0
                    }
                    if (scrollbar_scale) {
                        return x / (scrollbar_scale.value * ratio) + timeShift;
                    }
                    else {
                        return x / (1 * ratio) + timeShift;
                    }

                },
                getWindowVisibleTime: function() {
                    // summary:
                    //		provides the visible time duration on the surface
                    // x: Number
                    //		the x coordinate on the timeline scale area

                    if (scrollbar_scale) {
                        return duration / scrollbar_scale.value;
                    } else {
                        return duration;
                    }
                }
            });

            // Time helper class
            var _time = new Time();

            var EventHandler = declare([], {
                // summary:
                //		a generic mouse events class manager for the timeline elements
                //              it is mainly used for the drag event. All other event must be paused
                //              when the mouse is being dragged

                handlers: [],
                connect_handlers: [],
                register: function(node, event_name, object_context, method) {
                    // summary:
                    //		register a pausable event listener (global to the all classes)
                    var len = this.handlers.length;
                    return this.handlers[len] = on.pausable(node, event_name, lang.hitch(object_context, method));
                }, connect: function(node, event_name, object_context, method) {
                    // summary:
                    //		register a none pausable event listener. Pause is implemented by 
                    //		removing and recreating the event, hence, all information passed are store
                    //
                    // Example:
                    //          _events_handler.connect(this.group, 'mouseout', this, this.onMouseOut);

                    var len = this.connect_handlers.length;
                    var handle = node.connect(event_name, lang.hitch(object_context, method));
                    return this.connect_handlers[len] = {
                        handle: handle,
                        params: {
                            node: node,
                            event_name: event_name,
                            object_context: object_context,
                            method: method
                        }
                    };
                },
                pause: function() {
                    // summary:
                    //		pause all pausable events
                    for (var i in this.handlers)
                        this.handlers[i].pause();

                    // Remove all connect events
                    for (i in this.connect_handlers) {
                        if (this.connect_handlers[i].handle)
                            this.connect_handlers[i].handle.remove();
                        this.connect_handlers[i].handle = null;
                    }
                },
                resume: function() {
                    // summary:
                    //		resume all pausable events
                    for (var i in this.handlers)
                        this.handlers[i].resume();

                    // Re-create all connect events
                    for (i in this.connect_handlers) {
                        var p = this.connect_handlers[i].params;
                        this.connect_handlers[i].handle = p.node.connect(p.event_name, lang.hitch(p.object_context, p.method));
                    }
                }
            });

            // Time helper class
            var _events_handler = new EventHandler();

            var Needle = declare([], {
                // summary:
                //		a time needle / ticker
                constructor: function(surface) {
                    // surface: Surface
                    //		the master graphics context
                    //		
                    this.shape = null; /* GFX Shape  */
                    this.group = surface.createGroup();
                },
                draw: function(x, y, width) {
                    // summary:
                    //		draws the content of the Scale
                    // x: Number
                    //		the x coordinate of the timeline scale area
                    // y: Number
                    //		the y coordinate of the timeline scale area
                    // width: Number
                    //		the width of the timeline scale area

                    this.shape = drawLine(this.shape, x, y, x, options.cursorHeight, options.cursorColor, this.group);
                }
            });

            // Time helper class
            var _time = new Time();

            var Handle = declare([], {
                // summary:
                //		a resize handler that is used to resize a period
                constructor: function(group) {
                    // group: Group
                    //		the parent graphical group
                    // width: Number
                    //		the handle width
                    // color: Color
                    //		the handle color
                    this.inside = true; /* handle is drawn in the inside of Period body */
                    this.shape = null;
                    this.mouse_cursor = 'default';
                    this.parent_group = group;
                    this.group = group.createGroup();
                    // Hide the handle
                    this.hide();
                },
                getWidth: function() {
                    // summary:
                    //		return the width of the handle
                    return options.handleWidth;
                },
                getColor: function() {
                    // summary:
                    //		return the color of the handle
                    if (this.inside)
                        return options.insideHandleFill;
                    else
                        return options.outsideHandleFill;
                },
                show: function() {
                    // summary:
                    //		show the handle

                    // if exists already, return;
                    var children = this.parent_group.children;

                    for (var i = 0; i < children.length; ++i)
                        if (children[i] == this.group)
                            return;

                    this.parent_group.add(this.group);
                },
                hide: function() {
                    // summary:
                    //		show the handle
                    this.parent_group.remove(this.group);
                },
                draw: function(x, y, w, h) {
                    // summary:
                    //		draws the resize handler graphics, etc
                    this.y = 2;
                    this.height = h - 3;
                    this.shape = drawRect(this.shape, x + this.x, y + this.y, this.getWidth(), this.height, this.getColor(), this.group);
                },
                inXRange: function(x) {
                    return (x >= this.x && x <= this.x + this.getWidth());
                },
                onMouseMove: function(event) {
                    changeCursor(this.mouse_cursor);
                }
            });

            var LeftHandle = declare([Handle], {
                // summary:
                //		a left hand resize handler that is used to resize a period
                constructor: function(group) {
                    this.mouse_cursor = 'w-resize';
                },
                draw: function(x, y, w, h) {
                    // summary:
                    //		draws the resize handler graphics, etc
                    if (this.inside)
                        this.x = 1;
                    else
                        this.x = -1 - this.getWidth();

                    this.inherited(arguments);
                }
            });

            var RightHandle = declare([Handle], {
                // summary:
                //		a right hand resize handler that is used to resize a period
                constructor: function(group) {
                    this.mouse_cursor = 'e-resize';
                },
                draw: function(x, y, w, h) {
                    // summary:
                    //		draws the resize handler graphics, etc
                    if (this.inside)
                        this.x = w - this.getWidth() - 1;
                    else
                        this.x = w + 1;

                    this.inherited(arguments);
                }
            });


            var Period = declare([], {
                // summary:
                //		a generic time period, an instance that has start and end time
                constructor: function(id, time_in, time_out, color, label, track) {
                    // id: String
                    //		random id
                    // time_in: Number
                    //		start time
                    // time_out: Number
                    //		end time
                    // color: Color
                    //		period background color
                    // track: Track
                    //		container track
                    this.id = id;
                    this.focused = false;
                    this.time_in = time_in;
                    this.time_out = time_out;
                    this.color = color;
                    this.label = label;
                    this.track = track;
                    this.being_dragged = false;
                    this.drag_mode = 'move'; /* This determine what the dragging shoud affect (move, e-resize or w-resize) */
                    this.shape = null; /* Shape that represent the background */
                    this.label_shape = null; /* Shape that represent the label */
                    this.group = track.periods_group.createGroup(); /* use the track graphics context */
                    this.elements_group = this.group.createGroup(); /* use the track graphics context */
                    this.handles_group = this.group.createGroup(); /* use the track graphics context */
                    this.events_group = this.group.createGroup(); /* use the track graphics context */

                    this.left_handle = null;
                    this.left_handle = null;

                    _events_handler.connect(this.events_group, 'mouseout', this, this.onMouseOut);
                    _events_handler.connect(this.events_group, 'mouseover', this, this.onMouseOver);

                    this.initHandles();

                },
                initHandles: function() {
                    // summary:
                    //		init left and right handles
                    this.left_handle = new LeftHandle(this.handles_group);
                    this.right_handle = new RightHandle(this.handles_group);

                },
                draw: function(time, y) {
                    // summary:
                    //		draws the period background, label and other graphics
                    // time: Time / Number
                    //		the current time on the time scale
                    // y: Number
                    //		the y coordinates of the period shape

                    // If the time is not provided, use the time_in
                    time = time || this.time_in;

                    var pos = this.yTrack();
                    var x = this.x = options.paddingLeft + _time.timeToX(this.time_in);
                    var y = this.y = y || pos.top;
                    var w = this.w = this.getWidth();
                    var h = this.h = pos.bottom - pos.top;

                    if (w >= 1) {
                        if (options.periodShape == 'rectangle') {
                            if (this.focused) {
                                this.shape = drawRect(this.shape, x, y + 1, w, h - 1, options.focusFill, this.elements_group);
                                if (options.focusStroke)
                                    this.shape.setStroke(options.focusStroke);

                            }
                            else if (this.inTimeRange(time))
                                this.shape = drawRect(this.shape, x, y + 1, w, h - 1, this.color, this.elements_group, true);
                            else {
                                this.shape = drawRect(this.shape, x, y + 1, w, h - 1, this.color, this.elements_group);
                                if (options.periodStroke)
                                    this.shape.setStroke(options.periodStroke);
                            }

                            if (this.label) {
                                // Estimating the font height, better idea? contact me. */
                                var font_height = parseInt(options.font.size.replace("px", ""));

                                this.label_shape = createText(this.label_shape, this.label, x, y + (h / 2) + (font_height / 2), w, options.textLabel, this.elements_group);
                            }
                        }
                        // Use the parent (track) surface context to draw bubbles
                        if (options.periodShape == 'bubble') {
                            if (this.inTimeRange(time))
                                this.shape = drawBubble(this.shape, x, y, w, h, this.track.order, this.color, this.elements_group, true);
                            else
                                this.shape = drawBubble(this.shape, x, y, w, h, this.track.order, this.color, this.elements_group);
                        }

                        this.left_handle.draw(x, y, w, h);
                        this.right_handle.draw(x, y, w, h);

                        var limits = this.xLimits(x);
                        this.event_shape = drawRect(this.event_shape, options.paddingLeft + limits.x1, y + 1, limits.w, h - 1, [0, 0, 0, 0], this.events_group);

                        //this.arrow = drawArrow(this.arrow, x, y, w, h, 'green', this.group);

                    }
                },
                getWidth: function() {
                    // summary
                    //          calculate the width
                    return _time.timeToX(this.time_out) - _time.timeToX(this.time_in);
                },
                moveToFront: function() {
                    // summary
                    //          bring the shape to the front in the track
                    this.track.moveToFront(this);
                },
                showHandles: function() {
                    // summary
                    //          show the resize handles (left and right)
                    if (this.left_handle)
                        this.left_handle.show();
                    if (this.right_handle)
                        this.right_handle.show();
                },
                hideHandles: function() {
                    // summary
                    //          hide the resize handles (left and right)
                    if (this.left_handle)
                        this.left_handle.hide();
                    if (this.right_handle)
                        this.right_handle.hide();
                },
                handlesPosition: function(inside) {
                    // summary
                    //          set the inside attribute of both handles
                    if (this.left_handle)
                        this.left_handle.inside = inside;
                    if (this.right_handle)
                        this.right_handle.inside = inside;
                },
                isFocused: function() {
                    // summary
                    // returns true if the period is selected
                    return this.focused == true;
                },
                focus: function() {
                    // summary:
                    //		focus this
                    this.focused = true;
                    this.moveToFront();
                    this.draw();
                },
                unfocus: function() {
                    // summary:
                    //		focus this
                    this.focused = false;
                    this.draw();
                },
                switchTrack: function(new_track) {
                    // summary:
                    //		change the track
                    this.track.removeChild(this);
                    new_track.addChild(this);
                },
                switchGroup: function(new_group, old_group) {
                    // summary:
                    //		change the graphics context
                    old_group = old_group || this.track.periods_group;
                    old_group.remove(this.group);
                    new_group.add(this.group);
                },
                confineY: function(y, h) {
                    // summary:
                    //		restrict x to the body space of the Timeline

                    if (y + h > options.height)
                        y = options.height - h;

                    if (y < options.scaleHeight)
                        y = options.scaleHeight;

                    return y;

                },
                inTimeRange: function(time) {
                    // summary:
                    //		evaluates if the time falls within the time tange of the period
                    return (time > this.time_in && time < this.time_out);
                },
                xLimits: function(x) {
                    // summary:
                    //		return begining and end x coordinates depends on the handles state (inside or outside)
                    var x1 = _time.timeToX(this.time_in);
                    var x2 = _time.timeToX(this.time_out);

                    // Adjust the x1 (start), x2 (end) location if the handles are from the outside
                    if (!this.left_handle.inside)
                        x1 -= this.left_handle.getWidth();
                    if (!this.right_handle.inside)
                        x2 += this.right_handle.getWidth();
                    return {x1: x1, x2: x2, w: x2 - x1};
                },
                inXRange: function(x) {
                    // summary:
                    //		evaluates if the x falls within the size/location of the period  
                    var limits = this.xLimits(x);
                    return (x > limits.x1 && x < limits.x2);
                },
                onMouseDragStart: function(pos, mouse_time, media) {
                    // summary:
                    //		on mouse start drag event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element
                    this.being_dragged = true;
                    this.start_drag = {
                        x: pos.x,
                        y: pos.y,
                        time_in_diff: mouse_time - this.time_in,
                        time_out_diff: this.time_out - mouse_time};

                },
                onMouseDragStop: function(mover) {
                    // summary:
                    //		on mouse end drag
                    this.being_dragged = false;
                },
                onMouseDrag: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse click event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element
                    // Returns the Y coordinate
                    var local_duration = this.time_out - this.time_in;

                    var track_y = this.yTrack();

                    var y = track_y.top;
                    var h = track_y.bottom - track_y.top;
                    var min_width = options.handleWidth * 2 + options.handleMinWidth;

                    if (this.drag_mode == 'move') {
                        this.time_in = mouse_time - this.start_drag.time_in_diff;

                        // Adjust the time: from 0 to duration (max)
                        if (this.time_in < 0)
                            this.time_in = 0;
                        if (this.time_in + local_duration > duration)
                            this.time_in = duration - local_duration;

                        // Set the time out
                        this.time_out = this.time_in + local_duration;
                        // Move Y
                        y = y + pos.y - this.start_drag.y;
                        // Adjust the Y Coord
                        y = this.confineY(y, h);

                    } else if (this.drag_mode == 'e-resize') {
                        var time_in = mouse_time - this.start_drag.time_in_diff;
                        if (this.time_out - time_in > options.minDuration) {
                            this.time_in = time_in;
                            local_duration = this.time_out - this.time_in;
                            // Adjust the time: from 0 to duration (max)
                            if (this.time_in < 0)
                                this.time_in = 0;
                            if (this.time_in + local_duration > duration)
                                this.time_in = duration - local_duration;
                        }
                        this.handlesPosition(this.getWidth() > min_width);

                    } else if (this.drag_mode == 'w-resize') {
                        var time_out = mouse_time + this.start_drag.time_out_diff;
                        if (time_out - this.time_in > options.minDuration) {
                            this.time_out = time_out;

                            if (this.time_out > duration)
                                this.time_out = duration;
                        }

                        this.handlesPosition(this.getWidth() > min_width);
                    }

                    this.draw(this.time_in, y);
                    return y;
                },
                onMouseDown: function(event) {
                },
                onMouseUp: function(event) {
                },
                onMouseMove: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse move event (this event is created on the parent timeline, passed onto Tracks and Periods)

                    // Get the relative/local mouse x cooridnate to the current period (starts from 0)
                    var x = pos.x - (this.x - options.paddingLeft);

                    // Change mouse cursor of drag mode is resize
                    if (this.drag_mode != 'move') {
                        this.drag_mode = 'move';
                        changeCursor('move');
                    }

                    if (this.left_handle && this.left_handle.inXRange(x)) {
                        this.left_handle.onMouseMove(event);
                        this.drag_mode = 'e-resize';
                    }
                    else if (this.right_handle && this.right_handle.inXRange(x)) {
                        this.right_handle.onMouseMove(event);
                        this.drag_mode = 'w-resize';
                    }

                    return this;
                },
                onMouseOver: function() {
                    this.drag_mode = null;
                    changeCursor('move');
                    this.showHandles();
                },
                onMouseOut: function() {
                    this.drag_mode = null;
                    this.hideHandles();
                    changeCursor('default');
                },
                onMouseClick: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse click event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element
                    media.currentTime = this.time_in;
                },
                isDragMode: function(mode) {
                    return this.drag_mode == mode;
                },
                isDragging: function() {
                    return this.being_dragged == true;
                },
                yTrack: function() {
                    // summary:
                    //		calculate the y coordinate of the container track
                    return this.track.yTrack();
                }
            });

            var Marker = declare([Period], {
                // summary:
                //		a generic time instance, a spcial case of period wher its start and end time are equal
                constructor: function(id, time_in, time_out, color, label, track) {
                    // time_in: Number
                    //		marker time
                    this.time_out = time_in + options.minDuration;
                },
                initHandles: function() {
                    // summary:
                    //		init left and right handles
                },
                draw: function(time, y) {
                    // summary:
                    //		draws the marker background, label and other graphics
                    // time: Time / Number
                    //		the current time on the time scale
                    // y: Number
                    //		the y coordinates of the period shape

                    // If the time is not provided, use the time_in
                    time = time || this.time_in;

                    var pos = this.yTrack();
                    var x = this.x = options.paddingLeft + _time.timeToX(this.time_in);
                    var y = this.y = y || pos.top;
                    var w = this.w = this.getWidth();
                    var h = this.h = pos.bottom - pos.top;

                    if (this.focused)
                        this.shape = drawRect(this.shape, x, y + 1, w, h - 1, options.focusFill, this.elements_group);
                    else if (this.inTimeRange(time))
                        this.shape = drawRect(this.shape, x, y + 1, w, h - 1, this.color, this.elements_group, true);
                    else
                        this.shape = drawRect(this.shape, x, y + 1, w, h - 1, this.color, this.elements_group);

                    this.event_shape = drawRect(this.event_shape, x, y + 1, w, h - 1, [0, 0, 0, 0], this.events_group);
                },
                getWidth: function() {
                    // summary
                    //          return marker width
                    return options.markerWidth;
                },
                xLimits: function(x) {
                    // summary:
                    //		return begining and end x coordinates depends on the handles state (inside or outside)
                    var x1 = _time.timeToX(this.time_in);
                    var x2 = x1 + this.getWidth();

                    return {x1: x1, x2: x2, w: x2 - x1};
                }
            });

            var Track = declare([], {
                // summary:
                //		a generic track class, contains periods and markers
                constructor: function(order, surface) {
                    // order: Number
                    //		the order of the track
                    // surface: Surface
                    //		the master graphics context
                    //		
                    this.border = null; /* GFX Shape: border line  */
                    this.shape = null; /* GFX Shape: background-color  */
                    this.periods = []; /* List of all periods */
                    this.markers = []; /* List of all markers */
                    this.focused = false;
                    this.move_item = null; /* Item receiving onMouseMove event (to generate onMouseOut event) */

                    this.order = order;
                    if (surface)
                        this.init(surface);
                },
                init: function(surface) {
                    // summary:
                    //		Initilize the Track instance
                    this.surface = surface;
                    this.group = surface.createGroup(); /* the graphics context used to draw the graphics elements of the track */
                    this.elements_group = this.group.createGroup(); /* the graphics context  */
                    this.periods_group = this.group.createGroup(); /* the graphics context  */
                    this.markers_group = this.group.createGroup(); /* the graphics context  */
                },
                draw: function(x, y, width, time) {
                    // summary:
                    //		draws the content of the Scale
                    // x: Number
                    //		the x coordinate of the timeline scale area
                    // y: Number
                    //		the y coordinate of the timeline scale area
                    // width: Number
                    //		the width of the timeline scale area
                    // time: Time / Number
                    //		the current time on the time scale
                    //
                    var height = (options.height - options.scaleHeight) / options.numberOfTracks;
                    y = y + (this.order * height + options.scaleHeight);

                    this.border = drawDottedLine(this.border, x, x + width, y, options.trackSeparatorDottedWidth, options.trackSeparatorColor, this.elements_group);

                    if (!this.focused)
                        this.shape = drawRect(this.shape, x, y - height + 1, width, height - 2, [0, 0, 0, 0], this.elements_group);
                    else
                        this.shape = drawRect(this.shape, x, y - height + 1, width, height - 2, options.highlightTrackFill, this.elements_group);

                    // Draw periods
                    for (var i = 0; i < this.periods.length; i++)
                        if (!this.periods[i].isDragging())
                            this.periods[i].draw(time);

                    // Draw markers
                    for (var i = 0; i < this.markers.length; i++)
                        if (!this.markers[i].isDragging())
                            this.markers[i].draw(time);

                },
                focus: function() {
                    // summary:
                    //		focus this
                    this.focused = true;
                },
                unfocus: function() {
                    // summary:
                    //		focus this
                    this.focused = false;
                },
                childListName: function(child) {
                    // summary:
                    //		return the list name the child belongs to

                    if (child instanceof Period)
                        return 'periods';
                    else
                    if (child instanceof Marker)
                        return 'markers';

                    return null;
                },
                moveToFront: function(child) {
                    // summary:
                    //		bring the child to the front

                    this.removeChild(child);
                    this.addChild(child);
                    child.group.moveToFront();
                },
                removeChild: function(child) {
                    // summary:
                    //		implementation of remove a Period or Marker from this track
                    //	child
                    //          to be removed either from this.periods, or this.markers
                    //  list_name
                    //          name of the array ( eriods or markers)

                    var list_name = this.childListName(child);
                    if (list_name) {
                        // Get the target list (Markers or Periods)
                        var list = this[list_name];
                        var new_list = [];
                        var len = this[list_name].length;
                        for (var i = 0; i < len; i++) {
                            if (this[list_name][i] != child) {
                                new_list[new_list.length] = this[list_name][i];
                                delete this[list_name][i];
                            } else {
                                // Remove from the associate group (periods_group, markers_group)
                                this[list_name + '_group'].remove(child.group);
                            }
                        }
                        this[list_name] = new_list;
                        delete list;
                    }
                },
                addChild: function(child) {
                    // summary:
                    //		implementation of add a Period or Marker from this track

                    var list_name = this.childListName(child);
                    if (list_name) {
                        var list = this[list_name];
                        child.track = this;
                        this[list_name][this[list_name].length] = child;
                        this[list_name + '_group'].add(child.group);
                        child.draw();
                    }
                },
                onMouseDragStart: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse drag start event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element
                    return this._mouseEvent(pos, mouse_time, media, 'onMouseDragStart');
                },
                onMouseClick: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse click event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element

                    return this._mouseEvent(pos, mouse_time, media, 'onMouseClick');

                },
                onMouseOver: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse over event 

                },
                onMouseOut: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse out event 
                    /*
                     if (this.move_item) {
                     this.move_item.onMouseOut(event);
                     this.move_item = null;
                     }*/

                },
                onMouseMove: function(pos, mouse_time, media, event) {
                    // summary:
                    //		on mouse move event
                    // pos: Object (x,y)
                    //		the x,y coordinates of the mouse
                    // mouse_time:Number
                    //		the mouse time locations
                    // media: Object
                    //          the media element
                    var move_item = this.xToItem(pos.x);
                    // Call onMouseMove method on the item (Period / Marker)
                    if (move_item)
                        this._mouseEvent(pos, mouse_time, media, 'onMouseMove', move_item);
                    // Hack: change mouse cursor to default if there's no item
                    else
                        changeCursor('default');
                    return move_item;
                },
                _mouseEvent: function(pos, mouse_time, media, event_type, item) {
                    // summary:
                    //		a generic mouse event handlers, allow sending different types of mouse events to Periods/Markers
                    // item: Period or Marker
                    //		the item to send the mouse event to
                    // mouse_time:Number
                    //		the mouse time location
                    // media: Object
                    //          the media element
                    // event_type: String
                    //          mouse event type (i.e. 'onMouseClick', 'onMouseDragStart' etc)
                    // Find if a period/Marker is a hit, return as selected
                    item = item || this.xToItem(pos.x);
                    if (item)
                        item[event_type](pos, mouse_time, media);
                    return item;
                },
                xToItem: function(x) {
                    // summary:
                    //		return a period or marker within x, if any

                    var item = this.xToPeriod(x);
                    if (!item)
                        item = this.xToMarker(x);

                    return item;
                },
                xToPeriod: function(x) {
                    // summary:
                    //		return a period within x, if any
                    for (var i = this.periods.length - 1; i >= 0; i--)
                        if (this.periods[i].inXRange(x))
                            return this.periods[i];
                    return null;
                },
                xToMarker: function(x) {
                    // summary:
                    //		return a marker within x, if any
                    for (var i = this.markers.length - 1; i >= 0; i--)
                        if (this.markers[i].inXRange(x))
                            return this.markers[i];
                    return null;
                },
                addPeriod: function(time_in, time_out, color, label) {
                    // summary:
                    //		add a period to this track
                    // time_in: Number
                    //		start time
                    // time_out: Number
                    //		End time
                    // color: Color
                    //		the color of the period background
                    // label: String
                    //		the title of the period, if provided
                    //

                    var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                    this.periods.push(new Period(id, parseInt(time_in), parseInt(time_out), color, label, this));
                    return id;
                },
                addMarker: function(time, color, label) {
                    // summary:
                    //		add a marker to this track
                    // time: Number
                    //		marker time
                    // color: Color
                    //		the color of the marker background
                    // label: String
                    //		the title of the marker, if provided
                    //

                    var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                    this.markers.push(new Marker(id, parseInt(time), 0, color, label, this));
                    return id;
                },
                getHeight: function() {
                    // summary:
                    //		returns the height of the track
                    return (options.height - options.scaleHeight) / options.numberOfTracks;
                },
                yTrack: function() {
                    // summary:
                    //		calculate the y coordinate of the track
                    var h = this.getHeight();
                    var top_position = (this.order - 1) * h + options.scaleHeight;
                    var bottom_position = this.order * h + options.scaleHeight;
                    return  {top: top_position, bottom: bottom_position};
                }
            });

            /**************************
             * Global / Shared Methods
             **************************/

            function drawRect(shape, x, y, w, h, color, group, highlight) {
                // summary:
                //		Draw a rectangle on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x: Number
                //              X coordinate 
                // y: Number
                //              Y coordinate 
                // w: Number
                //              Width of the rectangle
                // h: Number
                //              Height of the rectangle
                // group: Surface / Group
                //              The context to create the shape
                // 
                // returns: shape
                //		The shape created / updated.

                if (!shape)
                    shape = group.createRect({x: x, y: y, width: w, height: h}).setFill(color);
                else
                    shape.setShape({x: x, y: y, width: w, height: h}).setFill(color);

                // Highlight the shape
                highlightShape(shape, color, highlight);

                return shape;
            }

            function   createText(shape, text, x, y, w, params, group) {
                // summary:
                //		Draw a Text on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x, y: Number
                //              X and Y coordinate s
                // align: String
                //              An alignment of a text in regards to the anchor position ("start", "middle", "end")
                // color: Color
                //              Text color
                // group: Surface / Group
                //              The context to create the shape
                // 
                // returns: shape
                //		The shape created / updated.

                var local_align = 'middle'; /* ("start", "middle", "end") */
                switch (params.align) {
                    case 'right':
                        local_align = 'end';
                        x = x + w - params.padding;
                        break;
                    case 'left':
                        local_align = 'start';
                        x += params.padding;
                        break;
                    case 'middle':
                        x += (w / 2);
                        break;
                    default:
                }


                if (!shape)
                    shape = group.createText({x: x, y: y, text: text, align: local_align}).setFill(params.color).setFont(options.font);
                else
                    shape.setShape({x: x, y: y, text: text, align: local_align}).setFill(params.color).setFont(options.font);
                return shape;
            }

            function drawLine(shape, x1, y1, x2, y2, color, group) {
                // summary:
                //		Draw a line on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x1,y1,x2,y2: Number
                //              (X1,Y1) - (X2-Y2) line coordinates 
                // color: Color
                //              Line color
                // group: Surface / Group
                //              The context to create the shape
                // 
                // returns: shape
                //		The shape created / updated.

                if (!shape)
                    shape = group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(color);
                else
                    shape.setShape({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(color);
                return shape;
            }


            function drawDottedLine(shape, x1, x2, y, dash_length, color, group) {
                // summary:
                //		Draw a dotted line on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x1,y1,x2,y2: Number
                //              (X1,Y1) - (X2-Y2) line coordinates 
                // color: Color
                //              Line color
                // group: Surface / Group
                //              The context to create the shape
                // 
                // returns: shape
                //		The shape created / updated.

                // A fix for the stroke width
                dash_length = (dash_length > 0) ? dash_length : x2 - x1;
                y++;
                // Create the path
                var path = "";

                for (var x = x1; x < x2; x += dash_length) {
                    path += "M " + x + "," + y + " " + (x + dash_length) + "," + y + " ";
                    x += dash_length;
                }

                if (!shape)
                    shape = group.createPath({path: path});
                else
                    shape.setShape({path: path});

                shape.setStroke({width: 1, color: color});

                return shape;
            }

            function drawBubble(shape, x, y, w, h, track_order, color, group, highlight) {
                // summary:
                //		Draw a bubble shapr on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x,y: Number
                //              (X,Y) coordinates 
                // w,h: Number
                //              The size of the bubble
                // track_order: Number
                //              The track order number
                // color: Color
                //              The bubble color
                // 
                // returns: shape
                //		The shape created / updated.
                var cx = x + w / 2;
                var h_track = (options.height - options.scaleHeight) / options.numberOfTracks * track_order;
                var cy = y;
                var r = w / 2;
                var sh = options.scaleHeight;

                // Create the path
                var path = "M " + x + " " + sh + "Q " + x + " " + (sh + h_track) + " " + (x + w / 2) + " " + (sh + h_track) + "Q " + (x + w) + " " + (sh + h_track) + " " + (x + w) + " " + sh + "M " + x + " " + sh + "Z";
                if (!shape)
                    shape = group.createPath({path: path});
                else
                    shape.setShape({path: path});

                // Highlight the shape
                highlightShape(shape, color, highlight);

                return shape;
            }

            function drawArrow(shape, x, y, w, h, color, group) {
                // summary:
                //		Draw a bubble shapr on the group / surface provided
                // shape: Shape
                //              Null to create a new shape or an already defined shape to update
                // x,y: Number
                //              (X,Y) coordinates 
                // w,h: Number
                //              The size of the bubble
                // color: Color
                //              The bubble color
                // 
                // returns: shape
                //		The shape created / updated.

                var cx = x + w / 2;
                var h_track = (options.height - options.scaleHeight) / options.numberOfTracks * 2;
                var cy = y;
                var r = w / 2;
                var sh = options.scaleHeight;
                /*
                 var path ="M0.00, 0.00L 40.00, 35.00L0.00, 80.00z";
                 x-=200;
                 y-=200;
                 var path ="M"+x+", "+y+"L "+(x+140)+", "+(y+135)+"L"+(x)+", "+(y)+"z";
                 console.log(path);
                 */

                // Create the path
                var path = "M " + x + " " + sh + "Q " + x + " " + (sh + h_track) + " " + (x + w / 2) + " " + (sh + h_track) + "Q " + (x + w) + " " + (sh + h_track) + " " + (x + w) + " " + sh + "M " + x + " " + sh + "Z";
                if (!shape)
                    shape = group.createPath({path: path});
                else
                    shape.setShape({path: path});

                return shape;
            }

            function changeCursor(style) {
                // summary:
                //		change the mouse cursor
                // style: String
                //              the style of the mouse cursor: 'wait', 'move' etc
                //
                domStyle.set(timeline, {cursor: style});
            }

            function highlightShape(shape, color, highlight) {
                // summary:
                //		highlight a shape or rest to default
                // shape: Shape
                //              the shape that has to be highlighted
                //
                if (highlight) {
                    if (options.highlightStroke)
                        shape.setStroke(options.highlightStroke);
                    if (options.highlightFill)
                        shape.setFill(options.highlightFill);
                }
                else {
                    shape.setStroke(null);
                    shape.setFill(color);
                }

            }

            /************************
             * Timeline Dijit Widget
             ***********************/

            return declare([WidgetBase], {
                region: 'center',
                // Attributes
                time: 0,
                _scale: null,
                _tracks: [],
                _needle: null,
                // Selected Marker, Period or track
                selected: null,
                selected_track: null,
                // Dragging State
                last_drag_pos: null, /* Last postion when mouse drag */
                start_dragging: false,
                needle_dragging: false, // Time needle is being dragged
                selected_dragging: false, // Selected Item (Period or Marker) is being dragged
                mouseDownEvent: null,
                mouseUpEvent: null,
                constructor: function(override_options) {
                    // Update the widget options
                    if (override_options) {
                        for (var i in override_options)
                            if (override_options[i] != undefined)
                                options[i] = override_options[i];
                    }
                },
                postCreate: function() {
                    this.inherited(arguments);
                    this.init(this.domNode);
                },
                init: function(_timeline, scale, scroll) {

                    timeline = _timeline;

                    if (scale) {
                        scrollbar_scale = document.getElementById(scale);
                        scrollbar_scale.setAttribute("max", options.maxScaleFactor)
                    }

                    if (scroll) {
                        scrollbar_scroll = document.getElementById(scroll)
                    }

                    this.set('height', options.height);
                    this.set('background', options.backgroundColor);
                    this._createSurface(timeline);

                },
                // Create GFX Surface
                _createSurface: function(parent) {
                    // summary:
                    //		create a dojox GFX surface element (SVG, VML or Canvas)
                    // parent: DOMNode
                    //          the container html element
                    this.surface = gfx.createSurface(parent, options.width, options.height);
                    this.surface.whenLoaded(lang.hitch(this, this.surfaceReady));
                },
                surfaceReady: function() {
                    // summary:
                    //		this function is triggered when the surface has succssfully created
                    //

                    // Create group the background color
                    this.background_group = this.surface.createGroup();


                    // Create the time scale area
                    this._scale = new Scale(this.surface);

                    // Create tracks, in reverese order (so that the bubbles display corretly)
                    for (var i = options.numberOfTracks - 1; i >= 0; i--)
                        if (this._tracks[i])
                            this._tracks[i].init(this.surface);
                        else
                            this._tracks[i] = new Track(i + 1, this.surface);

                    // Create group for the selected item (Period or Marker) with higher z-index
                    this.selected_group = this.surface.createGroup();

                    // Create the time needle / ticker 
                    this._needle = new Needle(this.surface);

                    // Create group for the top layer (highest z-index), used to catch mouse out event
                    this.top_group = this.surface.createGroup();

                },
                set: function(key, value) {
                    // summary:
                    //		Sets the optional values of the widget, including background color,
                    //          width, height etc, and make sure it updates the corresponding graphical elements
                    // key: String
                    //              the name of the attribute/option
                    // value: String
                    //              the value
                    if (key == 'background')
                        domStyle.set(timeline, {background: value});
                    else if (key == 'width') {
                        // Adjust the width of the timeline container and surface

                        if (timeline)
                            domStyle.set(timeline, {width: value + "px"});

                        if (this.surface) {
                            var dim = this.surface.getDimensions();
                            this.surface.setDimensions(value, dim.height);
                        }

                    } else if (key == 'height') {
                        // Adjust the height of the timeline and surface
                        if (timeline)
                            domStyle.set(timeline, {height: value + "px"});

                        if (this.surface) {
                            var dim = this.surface.getDimensions();
                            this.surface.setDimensions(dim.width, value);
                        }
                    }
                    // Set the options value
                    options[key] = value;
                },
                get: function(key) {
                    // summary:
                    //		Returns the widget optional values
                    if (key == 'inner_width') {
                        return options.width - (options.paddingLeft + options.paddingRight);
                    }
                    return options[key];
                },
                ready: function(_duration, media) {
                    // summary:
                    //		Invoked when the media is ready
                    duration = _duration;
                    this.media = media;
                    ratio = this.get('inner_width') / duration;
                    this.draw = this._draw;
                    this.draw();
                    this.addEventListeners();
                },
                // Resize the widget to the specified width
                resize: function(size) {
                    // summary:
                    //		as a dijit-wedgit, Timeline receives all resize driggers
                    //          from its parent container (i.e. BorderContainer )

                    this.inherited(arguments);
                    if (size) {
                        options.width = size.w;
                        ratio = this.get('inner_width') / duration;
                        this.draw();
                    }
                },
                // Refresh the user interface (Access when the widget is ready)
                draw: function() {
                    // summary:
                    //		draw the content of the Timeline-dijit
                    //          empty to start until the surface / media are ready
                    //          it then points to this._draw

                },
                // Actual draw function (draw = _draw when the surface is ready)
                _draw: function() {
                    // summary:
                    //		draw the content of the Timeline-dijit

                    var width = this.get('width');
                    var inner_width = this.get('inner_width');

                    //this.shape = drawRect(this.shape, 0, 0, options.width, options.height, 'red', this.background_group);

                    // Adjust the width of the timeline container and canvas
                    this.set('width', width);

                    // Draw the scale background
                    this._scale.draw(0, 0, width, inner_width);

                    // Draw Tracks
                    for (var i in this._tracks)
                        this.drawTrack(this._tracks[i], width, inner_width);

                    // Time needle (cursor)
                    this._needle.draw(_time.timeToX(this.time) + options.paddingLeft, 0);
                },
                drawTrack: function(track, width, inner_width) {
                    // summary:
                    //		draws a single track

                    width = width || this.get('width');
                    inner_width = inner_width || this.get('inner_width');
                    var _x_ = (options.tracksPadding) ? options.paddingLeft : 0;
                    var _width_ = (options.tracksPadding) ? inner_width : width;
                    track.draw(_x_, 0, _width_, this.time);
                },
                addEventListeners: function() {
                    // summary:
                    //		attach all event handlers requred to operate the Timeline
                    on(this.media, "timeupdate", lang.hitch(this, this.onTimeUpdate));

                    _events_handler.register(timeline, 'click', this, this.onMouseClick);
                    _events_handler.register(timeline, 'mousedown', this, this.onMouseDown);
                    _events_handler.register(timeline, 'mousemove', this, this.onMouseMove);
                    _events_handler.register(timeline, 'mouseup', this, this.onMouseUp);


                    if (scrollbar_scale)
                        on(scrollbar_scale, "change", lang.hitch(this, this.onScaleUpdate));

                    if (scrollbar_scroll)
                        on(scrollbar_scroll, "change", lang.hitch(this, this.onScrollUpdate));

                    // Attach mouse dragging events (override onMove to disallow moving the associated dom node)
                    var dnd = new Moveable(timeline);
                    dnd.onMove = lang.hitch(this, this.onMouseDrag);
                    dnd.onMoveStart = lang.hitch(this, this.onMouseDragStart);
                    dnd.onMoveStop = lang.hitch(this, this.onMouseDragStop);
                },
                selectItem: function(item, select, attribute) {
                    // summary:
                    //		select/focus or deselect/unfocus a Track, Marker or Period
                    // item: Track, Marker or Period
                    //          item being selected (if not null)
                    // selected: Boolean
                    //          either select (true) or deselect (false)
                    // attribute: String
                    //          a local attribte to hold the selected item ('selected':for 
                    //          periods and markers, and 'selected_track' for tracks)
                    // return
                    //          the item being selected / deslected
                    attribute = attribute || 'selected';

                    if (item) {
                        if (select) {
                            // deselect the previously selected, if any
                            if (this[attribute])
                                this[attribute].unfocus();
                            this[attribute] = item;
                            this[attribute].focus();
                        } else {
                            item.unfocus();
                            this[attribute] = null;
                        }
                        return item;
                    }
                    return null;
                },
                onTimeUpdate: function(event) {
                    // summary:
                    //		media time update (change of time location)
                    // event: Event
                    //		media event object
                    this.time = this.media.currentTime;
                    this.draw();
                },
                onScaleUpdate: function(event) {
                    // summary:
                    //		handles scale scrollbar
                    // event: Event
                    //		scrollbar event object
                    scrollbar_scroll.setAttribute('max', Math.max(0, duration - _time.getWindowVisibleTime()))
                    this.draw();
                },
                onScrollUpdate: function(event) {
                    // summary:
                    //		handles scroll scrollbar
                    // event: Event
                    //		scrollbar event object
                    this.draw();
                },
                onMouseDragStart: function(mover) {
                    // summary:
                    //		start the dragging mode
                    this.start_dragging = true;
                    // Pause all events, globally!
                    _events_handler.pause();
                },
                onMouseDrag: function(mover, leftTop, event) {
                    // summary:
                    //		handles mouse drag event
                    // event: Event
                    //		mouse event object

                    var pos = this.getRelativePosition({x: event.pageX - options.paddingLeft, y: event.pageY});
                    var mouse_time = _time.xToTime(pos.x);

                    // Start dragging mode:
                    if (this.start_dragging) {
                        // Turn off start dragging mode (for the needle and Marker / Period
                        this.start_dragging = this.needle_dragging = this.selected_dragging = false;

                        // Scale area
                        if (pos.y > 0 && pos.y < options.scaleHeight)
                            this.needle_dragging = true;
                        // Otherwise, drag a Marker / Period 
                        else {
                            var item = null;
                            // Pass mouse event to a track
                            var track = this.yToTrack(pos.y);
                            // Get the first item that's under the mouse cursor,
                            var item = track.onMouseDragStart(pos, mouse_time, this.media, event);
                            // If there was a Marker or Period, set as selected
                            if (item) {
                                this.selectItem(item, true);
                                // Move the item to the selected_group (higher z-index)
                                this.selected.switchGroup(this.selected_group);
                                this.selected_dragging = true;
                            }
                        }
                    }

                    // Dragging mode

                    // Needle drag mode
                    if (this.needle_dragging)
                        this.media.currentTime = mouse_time;
                    // Item (Period/Marker) drag mode
                    else if (this.selected_dragging) {
                        // Pass mouse drag event to the selected item
                        this.selected.onMouseDrag(pos, mouse_time, this.media, event);
                        // Highlight the track, if the period, marker is in move drag mode (modes list: move, w-resize or e-resize)
                        this.last_drag_pos = pos;
                        if (this.selected.isDragMode('move')) {
                            var track = this.yToTrack(pos.y);

                            if (this.selected_track != track) {
                                var temp = this.selected_track;
                                this.selectItem(this.selected_track, false, 'selected_track');
                                if (temp)
                                    this.drawTrack(temp);
                                this.selectItem(track, true, 'selected_track');
                                track.focus();
                                this.drawTrack(track);
                            }
                        }
                    }

                },
                onMouseDragStop: function(mover) {
                    // summary:
                    //		stop the dragging mode
                    this.needle_dragging = false;
                    this.selected_dragging = false;

                    // Check if a Period or Marker has moved to a new track
                    if (this.selected_track) {
                        if (this.selected && this.selected.track != this.selected_track) {
                            this.selected.switchTrack(this.selected_track);
                        }
                        // Deselect the track
                        this.selectItem(this.selected_track, false, 'selected_track');
                    }
                    if (this.selected) {
                        this.selected.onMouseDragStop();
                        // If the mouse x,y falls outside of the element, send onMouseOut to selected
                        var pos = this.last_drag_pos;

                        if (pos) {
                            if (pos.y > options.scaleHeight && pos.y < options.height) {
                                var track = this.yToTrack(pos.y);
                                var selected_track = this.selected.track;
                                if (track != selected_track || (track == selected_track && selected_track.xToItem(pos.x) != this.selected))
                                    this.selected.onMouseOut();
                            } else
                                this.selected.onMouseOut();
                        }
                    }

                    _events_handler.resume();
                    this.draw();
                },
                onMouseClick: function(event) {
                    // summary:
                    //		handles mouse click
                    // event: Event
                    //		mouse event object

                    // Selected Period or Marker
                    var item = null;

                    var pos = this.getRelativePosition({x: event.pageX - options.paddingLeft, y: event.pageY});
                    var mouse_time = _time.xToTime(pos.x);


                    // Detect a click on timeline body (not the scale area), pass mouse event to trackss -> periods / markers
                    if (pos.y > options.scaleHeight && pos.y < options.height) {
                        // Pass mouse events to current track
                        var track = this.yToTrack(pos.y);
                        item = this._sendMouseEvent(track, 'onMouseClick', event);
                        // If there was a Marker or Period, set as selected
                        if (item)
                            return this.selectItem(item, true);
                        else
                            // If no new selected Marker / Period, deslect the previous one,
                            this.selectItem(this.selected, false);
                    } else if (pos.y > 0 && pos.y < options.scaleHeight) {
                        // Move the media current time to the current mouse location
                        this.media.currentTime = mouse_time;
                    }
                },
                onMouseDown: function(event) {
                    // summary:
                    //		handles mouse down
                    // event: Event
                    //		mouse event object
                    this.mouseDownEvent = event;
                },
                onMouseUp: function(event) {
                    // summary:
                    //		handles mouse up
                    // event: Event
                    //		mouse event object

                    this.mouseUpEvent = event;

                    var pos = this.getRelativePosition({x: event.pageX - options.paddingLeft, y: event.pageY});
                    /* Bug fix (Adnan, 23/12/2012): don't allow create/update if mouse on the scale area */
                    if (pos.y > options.scaleHeight && pos.y < options.height) {
                        var initial_point = this.getRelativePosition({x: this.mouseDownEvent.pageX, y: this.mouseDownEvent.pageY})
                        var final_point = this.getRelativePosition({x: this.mouseUpEvent.pageX, y: this.mouseUpEvent.pageY})

                        if (options.mode == 'create') {
                            if (initial_point == final_point) {
                                // create marker
                            }
                            else {
                                // create event
                                this.addPeriod(_time.xToTime(initial_point.x), _time.xToTime(final_point.x), options.newPeriodColor, this.yToTrack(final_point.y))
                            }
                        }
                    }
                },
                onMouseMove: function(event) {
                    // summary:
                    //		handles mouse move
                    // event: Event
                    //		mouse event object

                    var pos = this.getRelativePosition({x: event.pageX - options.paddingLeft, y: event.pageY});

                    // Detect a move on timeline body (not the scale area), pass mouse event to trackss -> periods / markers
                    if (pos.y > options.scaleHeight && pos.y < options.height) {
                        // Pass mouse events to current track
                        var track = this.yToTrack(pos.y);
                        this._sendMouseEvent(track, 'onMouseMove', event);
                    }
                },
                _sendMouseEvent: function(item, event_name, event) {
                    // summary:
                    //		pass on mouse event
                    var pos = this.getRelativePosition({x: event.pageX - options.paddingLeft, y: event.pageY});
                    var mouse_time = _time.xToTime(pos.x);
                    return item[event_name](pos, mouse_time, this.media, event);
                },
                yToTrackIndex: function(y) {
                    // summary:
                    //		returns the track index for a given y coordinate

                    var track_height = (options.height - options.scaleHeight) / options.numberOfTracks;
                    y = y - options.scaleHeight;
                    var track_index = parseInt(y / track_height);
                    // Adjusst track index, not less than zero or greater than numberOfTracks
                    track_index = (track_index > (options.numberOfTracks - 1)) ? options.numberOfTracks - 1 : (track_index < 0) ? 0 : track_index;
                    return track_index;
                },
                yToTrack: function(y) {
                    // summary:
                    //		obtain a track given the y coordinate
                    // 
                    var i = this.yToTrackIndex(y);
                    return this._tracks[i];
                },
                getTrack: function(track_order) {
                    // summary:
                    //		obtain a track of a specific order, create one if it doesn't exist
                    // 
                    track_order = track_order || 1;

                    var i = track_order - 1;

                    // Create if it it doesn't exist,
                    if (!this._tracks[i])
                        this._tracks[i] = new Track(track_order);

                    return  this._tracks[i];
                },
                addPeriod: function(time_in, time_out, color, track_order, label) {
                    // summary:
                    //		add a period instance to a track
                    // time_in: Number
                    //		The time in of the period in seconds
                    // time_out: Number
                    //		The time out of the period in seconds
                    // color: Color
                    //		The color of the period
                    // track_order: Number
                    //		The track number where the period must be
                    // label: String
                    //		label of the period

                    var track = this.getTrack(track_order);
                    return track.addPeriod(time_in, time_out, color, label);
                },
                addMarker: function(time, color, track_order, label) {
                    // summary:
                    //		add a marker instance to a track
                    // time: Number
                    //		The time of the marker in seconds
                    // color: Color
                    //		The color of the marker
                    // track_order: Number
                    //		The track number where the marker must be
                    // label: String
                    //		label of the marker

                    var track = this.getTrack(track_order);
                    return track.addMarker(time, color, label);
                },
                getRelativePosition: function(obj) {
                    // summary:
                    //		Relative coordinates to the timeline container div
                    // obj: Object
                    //		(X,Y) coordinates of the object
                    var totalOffsetX = 0;
                    var totalOffsetY = 0;
                    var canvasX = 0;
                    var canvasY = 0;
                    var currentElement = timeline;
                    do {
                        totalOffsetX += currentElement.offsetLeft;
                        totalOffsetY += currentElement.offsetTop;
                    }
                    while (currentElement = currentElement.offsetParent)
                    var x = obj.x - totalOffsetX;
                    var y = obj.y - totalOffsetY;
                    return {x: x, y: y}
                }
            });
        });
