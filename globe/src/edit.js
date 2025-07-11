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

const API_ROOT = '/api/';

loadJSON(API_ROOT + 'get_user_data?key=' + privateKey, (data) => {
    console.log(data);
    Vue.component('leg', {
        props: {
            id: String,
            departure_id: String,
            arrival_id: String,
            departure_datetime_str: String,
            arrival_datetime_str: String,
            highlighted: {
                type: Boolean,
                default: false,
            },
        },
        template: `<div class="leg" :style="'font-size: 0.75rem; margin: 0; border: 1px solid #000000; padding: 0.5rem; background-color:' + (highlighted ? '#ffeeee' : '#ffffff')">
            <b style="font-family: monospace">{{id}}</b><br>
            Departure:<br>
            <location :location_id="this.departure_id"></location><br>
            <datetime :datetime="departure_datetime"></datetime><br>
            Arrival:<br>
            <location :location_id="this.arrival_id"></location><br>
            <datetime :datetime="arrival_datetime"></datetime><br>
            Leg duration: {{duration_hours}} hours.<br>
            <div><slot></slot></div>
        </div>`,
        computed: {
            departure_datetime: function() {
                return new Date(this.departure_datetime_str);
            },
            arrival_datetime: function() {
                return new Date(this.arrival_datetime_str);
            },
            duration_hours: function() {
                return Math.round((this.arrival_datetime - this.departure_datetime) / (60*60*1000.0));
            }
        }
    });

    Vue.component('location', {
        props: {
            location_id: String,
        },
        data: function() {
            return {
                loading: false,
                default_location_data: {
                    'name': 'Loading...',
                    'address': 'Loading....',
                    'latitude': 0.001,
                    'longitude': 0.002,
                }
            }
        },
        template: `<span class="location">
            <span v-if="loading">Loading location data</span>
            <span v-if="!loading">
            <b>{{name}}</b> ({{coordinates}})<br>
            <i>{{address}}</i>
            </span>
            </span>`,
        computed: {
            location_data: function() {
                // This usage of this.loading forces this property to recompute on the variable's change.
                this.loading;

                // If for whatever reason this component is initialised with bad data, don't try to look it up.
                if (!this.location_id) {
                    this.loading = true;
                    return this.default_location_data;
                }
                if (data['locations'].hasOwnProperty(this.location_id)) {
                    this.loading = false;
                    return data['locations'][this.location_id];
                }
                console.log(`No data found for ID ${this.location_id}, loading.`);
                this.loading = true;
                loadJSON(`${API_ROOT}get_location?key=${privateKey}&id=${this.location_id}`, (resp) => {
                    console.log(`Received data for ID ${this.location_id}: ${JSON.stringify(resp)}`);
                    data['locations'][this.location_id] = resp['location'];
                    this.loading = false;
                });
                // This data won't be user-visible.
                return this.default_location_data;
            },
            name: function() {
                return this.location_data['name'];
            },
            address: function() {
                return this.location_data['address'];
            },
            coordinates: function() {
                return `${this.location_data['latitude']}, ${this.location_data['longitude']}`;
            },
        }
    });

    Vue.component('datetime', {
        props: {
            datetime: Date,
        },
        template: `<span>{{datetime_str}}</span>`,
        computed: {
            datetime_str: function() {
                var locale = window.navigator.userLanguage||window.navigator.language;
                // Chrome gives US-style dates for "ga" locale...
                if (locale == "ga") locale = "en-IE";
                return this.datetime.toLocaleString(locale);
            }
        }
    });

    Vue.component('datetime-picker', {
        props: {
            default_datetime: Date,
        },
        data: function() {
            return {
                datetime_str: this.getDefaultStr(),
            }
        },
        template: `<div>
            <input size='40' v-model="datetime_str"/>
            <button @click="submit">Submit</button><br>
            In your timezone: <datetime :datetime="parsed_datetime"></datetime>
            <br>
            </div>`,
        computed: {
            parsed_datetime: function() {
                const parsed = new Date(this.datetime_str);
                if (isNaN(parsed)) {
                    return new Date();
                }
                return parsed;
            },
        },
        methods: {
            submit: function() {
                if (isNaN(Date.parse(this.datetime_str))) {
                    window.alert('Could not parse date string.');
                    return;
                }
                this.$emit('submit', new Date(this.datetime_str));
            },
            getDefaultStr: function() {
                if (this.default_datetime) {
                    return this.default_datetime.toISOString();
                }
                return new Date().toISOString();
            }
        }
    });

    Vue.component('location-creator', {
        data: function() {
            return {
                query: 'Krakow',
            }
        },
        template: `<div>
            <input size=80 type="text" v-model="query"/>
            <button v-on:click="performQuery(query)">Select</button>
        </div>`,
        methods: {
            performQuery: function(queryString) {
                loadJSON(API_ROOT + 'get_location_id?key=' + privateKey + '&query=' + encodeURIComponent(queryString), (resp) => {
                    console.log(resp);
                    const id_ = resp['id'];
                    this.$emit('load', this.query, id_);
                });
            }
        }
    });

    Vue.component('leg-creator', {
        data: function () {
            return {
                departure_location_id: undefined,
                departure_location_query: undefined,
                departure_datetime: undefined,
                arrival_location_id: undefined,
                arrival_location_query: undefined,
                arrival_datetime: undefined,
                mode: "TRAIN",
            }
        },
        template: `<div class="leg" style="font-size: 0.75rem; margin: 0; border: 1px solid #000000; padding: 0.5rem; background-color:#ffeeee">
            Departure:<br>
            <location-creator v-if="this.stage == 0" @load="(query, id_) => {departure_location_id = id_; departure_location_query = query;}"></location-creator>
            <location v-else :location_id="departure_location_id"></location>
            <br>

            <datetime-picker v-if="this.stage == 1" @submit="(datetime) => {departure_datetime = datetime; }"></datetime-picker>
            <datetime v-if="this.stage > 1" :datetime="departure_datetime"></datetime>
            <br>

            <div v-if="this.stage >= 2">Arrival:<br>
            <location-creator v-if="this.stage == 2" @load="(query, id_) => {arrival_location_id = id_; arrival_location_query = query;}"></location-creator>
            <location v-if="this.stage > 2" :location_id="arrival_location_id"></location>
            <br>
            </div>

            <datetime-picker :default_datetime="departure_datetime" v-if="this.stage == 3" @submit="(datetime) => {arrival_datetime = datetime; }"></datetime-picker>
            <datetime v-if="this.stage > 3" :datetime="arrival_datetime"></datetime>
            <br>
            <select v-if="this.stage >= 4" required name="mode" v-model="mode">
                <option value="AEROPLANE">Aeroplane</option>
                <option value="TRAIN">Train</option>
                <option value="BUS">Bus</option>
                <option value="CAR">Car</option>
                <option value="BICYCLE">Bicycle</option>
                <option value="TAXI">Taxi</option>
                <option value="MINIBUS">Minibus</option>
                <option value="BOAT">Boat</option>
                <option value="WALK">Walking</option>
                <option value="GONDOLA">Gondola</option>
            </select>

            <button v-if="this.stage >= 4" @click="save">Log leg</button>
            </div>
        </div>`,
        computed: {
            stage: function() {
                if (!this.departure_location_id) {
                    return 0;
                }
                if (!this.departure_datetime) {
                    return 1;
                }
                if (!this.arrival_location_id) {
                    return 2;
                }
                if (!this.arrival_datetime) {
                    return 3;
                }
                return 4;
            }
        },
        methods: {
            save: function() {
                const leg_data = {
                    'departure_query': this.departure_location_query,
                    'departure_datetime': this.departure_datetime.toISOString(),
                    'arrival_query': this.arrival_location_query,
                    'arrival_datetime': this.arrival_datetime.toISOString(),
                    'mode': this.mode,
                };
                console.log("Saving:\n" + JSON.stringify(leg_data));
                var request = new XMLHttpRequest;
                request.open('POST', API_ROOT + 'save_leg?key=' + privateKey);
                request.setRequestHeader('Content-type', 'application/json');
                request.send(JSON.stringify(leg_data));
                request.onload = function() {
                    alert(request.responseText);
                }
            }
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
            <leg :id="selectedLeg.id" :departure_id="selectedLeg.departure_id" :arrival_id="selectedLeg.arrival_id" :departure_datetime_str="selectedLeg.departure_datetime_str" :arrival_datetime_str="selectedLeg.arrival_datetime_str" :highlighted="true"></leg></div>
        </div>
        <div v-if="dialogOpened">
            <div v-for="leg in legs">
                <leg :id="leg.id" :departure_id="leg.departure_id" :arrival_id="leg.arrival_id" :departure_datetime_str="selectedLeg.departure_datetime_str" :arrival_datetime_str="selectedLeg.arrival_datetime_str" :highlighted="leg.id == leg_id">
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
                    <span v-if="partType(part) == 'IMAGE'"><input v-model="part.image_url" style="width: 100%"></input><img :src="part.image_url" style="width: 100%"></img><br></span>
                    <button style="float: right;" v-on:click="moveUp(part.position)" :disabled="part.position == 0">Move up</button>
                    <button style="float: right;" v-on:click="moveDown(part.position)" :disabled="part.position >= parts.length - 1">Move down</button>
                    <button style="float: right;" v-on:click="deletePart(part.position)">Delete part</button>
                </div>
                <button v-on:click="addNote()">Add note</button>
                <button v-on:click="addLeg()">Add leg</button>
                <button v-on:click="addImage()">Add image</button>
                <button v-on:click="save()">Save collection</button>
            </div>
        </div>`,
        methods: {
            partType: function(part) {
                if (part.note && part.note.length) {
                    return "NOTE";
                }
                if (part.image_url && part.image_url.length) {
                    return "IMAGE";
                }
                return "LEG";
            },
            addNote: function() {
                this.parts.push({
                    leg_id: null,
                    note: "note",
                    image_url: null,
                    position: this.parts.length,
                });
            },
            addLeg: function() {
                this.parts.push({
                    leg_id: "",
                    note: null, 
                    image_url: null,
                    position: this.parts.length,
                });
            },
            addImage: function() {
                this.parts.push({
                    leg_id: null,
                    note: null, 
                    image_url: "url",
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
                request.open('POST', API_ROOT + 'save_collection?key=' + privateKey);
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
                <leg-creator></leg-creator>
                <leg v-for="leg in legs" :id="leg.id" :departure_id="leg.departure_id" :arrival_id="leg.arrival_id" :departure_datetime_str="leg.departure_datetime_str" :arrival_datetime_str="leg.arrival_datetime_str"></leg>
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
