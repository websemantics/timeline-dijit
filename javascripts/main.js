/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

require(["dojo/ready", "dojo/on", "dojo/dom", "dojo/_base/lang", "dojo/dom-style", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", "javascripts/Timeline.js"],
        function(ready, on, dom, lang, domStyle, ContentPane, BorderContainer, Timeline) {

            // Start when the dom is ready
            ready(function() {
                console.log('ready');
                loadMainExample("main_example");
            });

            var media_content = '<audio id="{id}_audio">\
                                            <source src="http://ulysses.ircam.fr/upload/tmp/Vampire_3component.mp4" type="audio/mp4">\
                                            <source src="http://upload.wikimedia.org/wikipedia/commons/b/bb/Vampire_3component.ogg" type="audio/ogg">\
                                            </audio>';

            var buttons_content = '<div id="{id}_buttons" style="padding:0;margin:0">\
                                            <button id="play"></button>\
                                            <button id="pause"></button>\
                                            <button id="stop"></button>\
                                            </div>';


            function loadMainExample(id) {

                var timeline = new Timeline({'height': 100,
                    'width': 750,
                    'scaleHeight': 30,
                    'scaleBackgroundColor': '#a50000',
                    'scaleColor': '#ccc',
                    'backgroundColor': '#E7E2DE',
                    'textColor': '#eee',
                    'cursorColor': '#000',
                    'maxScaleFactor': 1,
                    'numberOfTracks': 3,
                    'periodShape': 'rectangle',
                    'cursorHeight': 100, });
                timeline.addPeriod(5, 12, '#274257', 1)
                timeline.addPeriod(7, 13, '#2A75A9', 2)
                timeline.addPeriod(12, 25, '#274257', 3)
                timeline.addPeriod(23, 28, '#2A75A9', 1)

                var master = new BorderContainer({
                    design: 'sidebar',
                    gutters: true,
                    class: "unselectable",
                    liveSplitters: true,
                    style: "padding:10px;margin:5px;width:800px;height:120px;"
                }, id);

                var left = new ContentPane({
                    id: "left_pane",
                    region: 'leading',
                    splitter: true,
                    class: "unselectable",
                    content: lang.replace(buttons_content, {id: id}) + lang.replace(media_content, {id: id})
                });

                var right = new ContentPane({
                    id: "right_pane",
                    region: 'center',
                    splitter: true,
                    class: "unselectable",
                });

                right.addChild(timeline);
                master.addChild(left);
                master.addChild(right);
                master.startup();

                var audioNode = dom.byId(id + "_audio");
                // Attach an event on the Audio node
                on(audioNode, "loadedmetadata", function(evt) {
                    var duration = evt.target.duration;
                    //var timeline = new Timeline('audio', 'sound_visualisation', duration, self.options);
                    timeline.ready(duration, audioNode);
                });

                var play_button = dom.byId('play');
                var stop_button = dom.byId('stop');
                var pause_button = dom.byId('pause');

                hide(pause_button);
                // Button events
                on(play_button, "click", function(evt) {
                    hide(play_button);
                    show(pause_button);
                    audioNode.play();
                });

                on(stop_button, "click", function(evt) {
                    hide(pause_button);
                    show(play_button);
                    audioNode.pause();
                    audioNode.currentTime = 0;

                });

                on(pause_button, "click", function(evt) {
                    hide(pause_button);
                    show(play_button);
                    audioNode.pause();
                });

                // Show DOM Node
                function show(node) {
                    domStyle.set(node, "visibility", "visible");
                    domStyle.set(node, "display", "inline-block");
                }

                // Hide DOM Node
                function hide(node) {
                    domStyle.set(node, "visibility", "hidden");
                    domStyle.set(node, "display", "none");
                }

            }

        }
);
