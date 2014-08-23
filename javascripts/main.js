/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

require(["dojo/ready", "dojo/on", "dojo/dom", "dojo/_base/lang", "dojo/dom-style", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", 
"javascripts/timeline"],
        function(ready, on, dom, lang, domStyle, ContentPane, BorderContainer, Timeline) {

            // Start when the dom is ready
            ready(function() {
                    if(dom.byId('main_example'))
                loadExample("main_example");
                    if(dom.byId('bubble_example'))
                loadExample("bubble_example");
                
            });
            /*
             var media_content = '<audio id="{id}_audio">\
             <source src="sound/Vampire_3component.ogg" type="audio/ogg">\
             </audio>';
             */
            var media_content = '<audio id="{id}_audio">\
                            <source src="http://ulysses.ircam.fr/upload/tmp/Vampire_3component.mp4" type="audio/mp4">\
                           <source src="http://upload.wikimedia.org/wikipedia/commons/b/bb/Vampire_3component.ogg" type="audio/ogg">\
                                            </audio>';


            var buttons_content = '<div id="{id}_buttons" style="padding:0;margin:0">\
                                            <button id="{id}_play"></button>\
                                            <button id="{id}_pause"></button>\
                                            <button id="{id}_stop"></button>\
                                            </div>';

            function loadExample(id) {
               var options = null;
               if(id == 'main_example') {
                options = {
                    height: 300,
                    width: 750,
                    highlightStroke: null, /* New: Stroke highlight periods/markers when within time needle range */
                    highlightFill: '#aeaeae', /* New: Fill color highlight periods/markers when within time needle range */
                    scaleBackgroundColor: '#a50000',
                    scaleColor: '#ccc',
                    backgroundColor: '#E7E2DE',
                    scaleLabelColor: '#fff',
                    textLabel: {color: '#eee', align: "middle", padding: 5},
                    cursorColor: '#000',
                    maxScaleFactor: 1,
                    numberOfTracks: 7,
                    focusFill: '#333333',
                    //periodShape: 'bubble',
                    cursorHeight: 100};

                var timeline = new Timeline(options);

                timeline.addPeriod(5, 12, '#7A1631', 1, 'London');
                timeline.addPeriod(7, 13, '#CF423C', 2, 'Oxford');
                timeline.addPeriod(12, 25, '#7A1631', 3, 'Toronto');
                timeline.addPeriod(23, 28, '#CF423C', 1, 'San Francisco');
               } else 
               if(id =='bubble_example') {
                options = {'numberOfTracks':3, 'periodShape':'bubble', 'height':200,
                'backgroundColor':'#EAE5E1', 'trackSeparatorColor':null, 'scaleColor':'#EAE5E1',
                'cursorHeight':30, 'highlightFill':null, highlightStroke: {color: '#FF0', width: 3},
                'highlightTrackFill':null};

                var timeline = new Timeline(options);
                timeline.addPeriod(0,30,'#3F0B1B',3)
                timeline.addPeriod(5,30,'#7A1631',2)
                timeline.addPeriod(5,15,'#FC7D49',1)
                timeline.addPeriod(0,5,'#FC7D49',1)
                timeline.addPeriod(15,25,'#FC7D49',1)
                timeline.addPeriod(25,30,'#CF423C',1)

               }

                var master = new BorderContainer({
                    design: 'sidebar',
                    gutters: true,
                    class: "unselectable",
                    liveSplitters: true,
                    style: "padding:10px;margin:5px;width:800px;height:" + (options.height + 20) + "px;"
                }, id);

                var left = new ContentPane({
                    region: 'leading',
                    splitter: true,
                    id: id+"_left_pane",
                    content: lang.replace(buttons_content, {id: id}) + lang.replace(media_content, {id: id})
                });

                var right = new ContentPane({
                    region: 'center',
                    splitter: true,
                    id:  id+"_right_pane",
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

                var play_button = dom.byId(id+'_play');
                var stop_button = dom.byId(id+'_stop');
                var pause_button = dom.byId(id+'_pause');

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
