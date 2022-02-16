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
		},
        template: `<div class="leg" style="margin: 1rem 0; border: 1px solid #000000; padding: 0.5rem">
            <b style="font-family: monospace">{{id}}</b><br>
            Departure: <i>{{departure_address}}</i><br>
            Arrival: <i>{{arrival_address}}</i>
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

    Vue.component('collection', {
        props: {
            initialCollection: Object,
        },
        data: function() {
            return {
                title: this.initialCollection.title,
                parts: this.initialCollection.parts,
            }
        },
        computed: {
            id: function() {
                return this.initialCollection.id;
            }
        },
        template: `<div class="leg" style="margin: 1rem 0; border: 1px solid #000000; padding: 0.5rem">
            <b style="font-family: monospace">{{id}}</b>
            <br>Title: <input v-model="title"></input>
            <div v-for="part in parts" style="border: 1px solid #aaaaaa">
                Note: <input v-model="part.note"></input><br>
                Leg ID: <input v-model="part.leg_id"></input><br>
                <button v-on:click="deletePart(part.position)">Delete part</button>
            </div>
            <button v-on:click="addPart()">Add part</button>
            <button v-on:click="save()">Save collection</button>
        </div>`,
        methods: {
            addPart: function() {
                this.parts.push({
                    leg_id: null,
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
            }
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
