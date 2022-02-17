import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

const urlParams = new URLSearchParams(window.location.search);
const privateKey = urlParams.get('key');

function loadJSON(url, callback) {
    var request = new XMLHttpRequest;
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
        var data = JSON.parse(request.responseText);
        callback(data);
      } else {
        console.log("Status code error: " + request.status);
      }
    };

    request.onerror = function() {
      console.log("Error connecting."); 
    };

    request.send();
}


loadJSON('/taisteal/api/get_user_data?key=' + privateKey, (data) => {
    console.log(data);
	Vue.component('leg', {
		props: {
			id: String,
			departure_id: String,
			arrival_id: String,
            highlighted: {
                type: Boolean,
                default: false,
            },
		},
        template: `<div class="leg" :style="'font-size: 0.75rem; margin: 0; border: 1px solid #000000; padding: 0.5rem; background-color:' + (highlighted ? '#ffeeee' : '#ffffff')">
            <b style="font-family: monospace">{{id}}</b><br>
            Departure: <i>{{departure_address}}</i><br>
            Arrival: <i>{{arrival_address}}</i>
            <div><slot></slot></div>
        </div>`,
        computed: {
            departure_address: function() {
                return data['locations'][this.departure_id]['address'];
            },
            arrival_address: function() {
                return data['locations'][this.arrival_id]['address'];
            },
        }
	});

    Vue.component('leg-picker', {
        props: ['value'],
        data: function() {
            return {
                leg_id: this.value,
                dialogOpened: false,
            }
        },
        template: `<div>
        <div style="display: inline-block; width:100%;">
        <div v-if="selectedLeg">
            <leg :id="selectedLeg.id" :departure_id="selectedLeg.departure_id" :arrival_id="selectedLeg.arrival_id" :highlighted="true"></leg></div>
        </div>
        <div v-if="dialogOpened">
            <div v-for="leg in legs">
                <leg :id="leg.id" :departure_id="leg.departure_id" :arrival_id="leg.arrival_id" :highlighted="leg.id == leg_id">
                    <button v-on:click="select(leg.id)">Select</button>
                </leg>
            </div>
        </div>
        <button style="float: left" v-on:click="toggleDialog()">Select a leg</button>
        </div>`,
        computed: {
            legs: function() {
                return data.legs;
            },
            selectedLeg: function() {
                for (const leg of this.legs) {
                    if (leg.id == this.leg_id) return leg;
                }
                return null;
            }
        },
        methods: {
            select: function(leg_id) {
                this.leg_id = leg_id;
                this.dialogOpened = false;
                this.$emit('input', this.leg_id);
            },
            toggleDialog: function() {
                this.dialogOpened = !this.dialogOpened;
            }
        }
    });

    Vue.component('collection', {
        props: {
            initialCollection: Object,
        },
        data: function() {
            return {
                title: this.initialCollection.title,
                parts: this.initialCollection.parts,
                visible: false,
            }
        },
        computed: {
            id: function() {
                return this.initialCollection.id;
            }
        },
        template: `<div class="leg" style="margin: 1rem 0; border: 1px solid #000000; padding: 0.5rem; background-color: #eee">
            <b style="font-family: monospace">{{id}}</b>
            <br>Title: <input style="width: 100%" v-model="title"></input>
            <button v-on:click="visible = !visible">Show/hide</button>
            <div v-if="visible">
                <div v-for="part in parts" :key="part.position + part.leg_id" style="border: 1px solid #aaaaaa; margin: 0.5rem 0; display: inline-block; width: 100%; background-color: #aaa">
                    <span v-if="partType(part) == 'NOTE'">Note:<br><textarea style="width:100%" v-model="part.note"></textarea><br></span>
                    <span v-if="partType(part) == 'LEG'"><leg-picker v-model="part.leg_id"></leg-picker><br></span>
                    <button style="float: right;" v-on:click="moveUp(part.position)" :disabled="part.position == 0">Move up</button>
                    <button style="float: right;" v-on:click="moveDown(part.position)" :disabled="part.position >= parts.length - 1">Move down</button>
                    <button style="float: right;" v-on:click="deletePart(part.position)">Delete part</button>
                </div>
                <button v-on:click="addNote()">Add note</button>
                <button v-on:click="addLeg()">Add leg</button>
                <button v-on:click="save()">Save collection</button>
            </div>
        </div>`,
        methods: {
            partType: function(part) {
                if (part.note && part.note.length) {
                    return "NOTE";
                }
                return "LEG";
            },
            addNote: function() {
                this.parts.push({
                    leg_id: null,
                    note: "note",
                    position: this.parts.length,
                });
            },
            addLeg: function() {
                this.parts.push({
                    leg_id: "",
                    note: null, 
                    position: this.parts.length,
                });
            },
            deletePart: function(position) {
                this.parts.splice(position, 1);
                for (let i = position; i < this.parts.length; i++) {
                    this.parts[i].position -= 1;
                }
            },
            save: function() {
                var request = new XMLHttpRequest;
                request.open('POST', '/taisteal/api/save_collection?key=' + privateKey);
                request.setRequestHeader('Content-type', 'application/json');
                request.send(JSON.stringify({
                    id: this.id,
                    title: this.title,
                    parts: this.parts,
                }));
                request.onload = function() {
                    alert(request.responseText);
                };
            },
            swap: function(a, b) {
                var c = this.parts[a];
                this.parts[a] = this.parts[b];
                this.parts[b] = c;

                this.parts[a].position = a;
                this.parts[b].position = b;
                this.$forceUpdate();
            },
            moveUp: function(pos) {
                this.swap(pos, pos-1);
            },
            moveDown: function(pos) {
                this.swap(pos, pos+1);
            },
        }
    });

    var dashboard = new Vue({
        el: '#user-data-container',
        data: {
            legs: data.legs,
            collections: data.collections,
        },
        template: `<div style="max-width: 1000px">
            <button v-on:click="toggleLegListVisibility()">Show/hide legs</button>
            <div id="leg-list" style="display: none">
                <leg v-for="leg in legs" :id="leg.id" :departure_id="leg.departure_id" :arrival_id="leg.arrival_id"></leg>
            </div>
            <br>
            <button v-on:click="createCollection()">Create new collection</button>
            <div id="collection-list">
                <collection v-for="collection in collections" :initialCollection="collection"></collection>
            </div>
        </div>`,
        methods: {
            toggleLegListVisibility: function() {
                const legList = document.querySelector('#leg-list');
                legList.style.display = (legList.style.display == "none" ? "block" : "none");
            },
            createCollection: function() {
                this.collections.push({
                    id: uuidv4(),
                    title: "",
                    parts: [],
                });
            },
        },
    });
});
