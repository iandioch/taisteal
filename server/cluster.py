from collections import defaultdict
from math import radians, asin, sqrt, cos, sin

def estimated_distance_km(lat1, lng1, lat2, lng2):
    # Haversine formula.
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlng = lng2 - lng1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles. Determines return value units.
    return c * r

def create_cluster_obj(cluster_id, visit):
    return {
        'location': {
            'lat': visit['location']['lat'],
            'lng': visit['location']['lng'],
            'id': cluster_id,
            'type': 'CLUSTER',
            'region': visit['location']['region'],
            'country': visit['location']['country'],
            'human_readable_name': '{} Region'.format(visit['location']['region']),
        },
        'num_visits': 0,
        'days': 0,
    }

def add_location_to_cluster(cluster, v):
    # TODO(iandioch): num_visits will be incorrect here,
    # because it is estimated from separate departures and
    # arrivals from a place, but if it is a journey between
    # two places being combined, that confuses everything.
    cluster['num_visits'] += v['num_visits']
    # Also not correct, as two half-day visits will each have
    # v['days'] = 1, and they will sum to 2 instead of to 1.
    cluster['days'] += v['days']
    v['cluster'] = cluster['location']['id']

# Modifies the given list of visits to reflect discovered local clusters. These local clusters are situations where a STATION can be clearly identified as associated with a nearby TOWN; the STATION will label the TOWN as a clusterfor it.
def get_local_clusters(visits, cluster_threshold_km=15):
    town_pos_set = set()
    for i, v in enumerate(visits):
        if v['location']['type'] == 'TOWN':
            town_pos_set.add(i)
    for i, station in enumerate(visits):
        if i in town_pos_set:
            continue
        if station['location']['type'] not in ['STATION', 'AIRPORT']:
            continue
        possible_towns = []
        for j in town_pos_set:
            town = visits[j]
            distance_km = estimated_distance_km(station['location']['lat'], station['location']['lng'], town['location']['lat'], town['location']['lng'])
            if distance_km > cluster_threshold_km:
                continue
            possible_towns.append((j, distance_km))
        if not len(possible_towns):
            continue
        possible_towns.sort(key = lambda x: x[1])
        town = visits[possible_towns[0][0]]
        print('Identified {} as a station for town {}'.format(station['location']['id'], town['location']['id']))
        # station visit is close enough to town visit
        add_location_to_cluster(town, station)
        town['location']['type'] = 'TOWN_CLUSTER'

# Returns a list of new visit dicts for any identified clusters in the given
# `visits` list. Will modify that given `visits` list, adding `cluster` entries
# to the dicts for which a cluster was found.
# A cluster will be created for any 2 visits which share a location["region"].
# A cluster will also be created for any 2 visits which have a location less
# than cluster_threshold_distance estimated distance from each other.
def get_clusters(visits, cluster_threshold_km=25):
    print('Getting clusters for {} visits, with a distance threshold of {}.'.format(len(visits), cluster_threshold_km))
    get_local_clusters(visits)

    # `cluster` should be the cluster, and `component_visits` should be a list
    # of all of the visits that went into this cluster.
    def get_name_for_cluster(cluster, component_visits):
        regions = defaultdict(int)
        for v in component_visits:
            regions[v['location']['region']] += v['num_visits']
        sorted_regions = sorted(regions, key = lambda x: -regions[x])
        if len(sorted_regions) == 1:
            return sorted_regions[0]
        if len(sorted_regions) == 2:
            return '{} & {}'.format(sorted_regions[0], sorted_regions[1])
        if len(sorted_regions) == 3:
            return ', '.join(sorted_regions)
        return ', '.join(sorted_regions[:3]) + ', & more'

    def vkey(v):
        return v['location']['id']
    
    parent = {vkey(v): vkey(v) for v in visits}
    count = {vkey(v): 1 for v in visits}
    # Takes a vkey
    def find(v):
        while parent[v] != v:
            v = parent[v]
        return v

    # Takes a vkey
    def union(v1, v2):
        a = find(v1)
        b = find(v2)
        if a == b:
            # Already in same set.
            return
        parent[a] = b
        count[b] += count[a]

    # Do a union() for any visits which have the same region, or are estimated
    # to be geographically close together.
    for i in range(len(visits)-1):
        if 'cluster' in visits[i]:
            # This might be in a local cluster, do not overwrite that with a region cluster.
            continue
        for j in range(i+1, len(visits)):
            if 'cluster' in visits[j]:
                # This might be in a local cluster, do not overwrite that with a region cluster.
                continue
            v1 = visits[i]
            v2 = visits[j]
            v1_loc = v1['location']
            v2_loc = v2['location']
            if ((v1_loc['region'] == v2_loc['region']) or
                (estimated_distance_km(v1_loc['lat'],
                                       v1_loc['lng'],
                                       v2_loc['lat'],
                                       v2_loc['lng']) < cluster_threshold_km)):
                union(vkey(v1), vkey(v2))

    # Unravel the parent[] dict into a series of clusters.
    # A map of root_vkey: {... cluster obj ...}
    cluster = {}
    # A map of root_vkey: [list of visits]
    components = defaultdict(list)
    for v in visits:
        root = find(vkey(v))
        if count[root] == 1:
            # This visit wasn't clustered with any others.
            continue
        if root not in cluster:
            cluster_id = 'CLUSTER("{}")'.format(root)
            cluster[root] = create_cluster_obj(cluster_id, v)
        add_location_to_cluster(cluster[root], v)
        components[root].append(v)

    for c in cluster:
        # Rename the clusters to something more appropriate.
        cluster[c]['location']['human_readable_name'] = get_name_for_cluster(cluster[c], components[c])
        # Move the cluster locations to an average of their component parts' locations.
        # Note: This will absolutely mess up in and around the 180th meridian.
        cluster[c]['location']['lat'] = sum(v['location']['lat'] for v in components[c])/len(components[c])
        cluster[c]['location']['lng'] = sum(v['location']['lng'] for v in components[c])/len(components[c])

    print(f'Identified {len(cluster)} clusters.')
    return list(cluster.values())
