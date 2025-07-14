import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Leg, Visit } from 'types'
import { MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE} from './constants'

interface LegState {
    legs: Leg[]
    stats: {
        totalCount: number,
        totalDistance: number, /* km */
    }
};

const initialLegState: LegState = {
    legs: [],
    stats: {
        totalCount: 0,
        totalDistance: 0,
    }
}

const legSlice = createSlice({
    name: 'legs',
    initialState: initialLegState,
    reducers: {
        addLeg: (state, action: PayloadAction<Leg>) => {
            state.legs.push(action.payload);
            const leg = action.payload;
            state.stats.totalCount += leg.count;
            state.stats.totalDistance += leg.count * leg.distance;
        },
        addLegs: (state, action: PayloadAction<Leg[]>) => {
            state.legs = [...state.legs, ...action.payload];

            for (const leg of action.payload) {
                state.stats.totalCount += leg.count;
                state.stats.totalDistance += leg.count * leg.distance;
            }
        }
    },
});

interface VisitState {
    visits: Visit[],
    longestVisit: Visit|null,
    stats: {
        numCountries: number,
    }
}

const initialVisitState: VisitState = {
    visits: [],
    longestVisit: null,
    stats: {
        numCountries: 0,
    }
}

function getLongestVisit(visits: Visit[]): Visit|null { 
    let v = null;
    let vh = 0;
    for (let visit of visits) {
        if (visit.hours >= vh) {
            v = visit;
            vh = visit.hours;
        }
    }
    return v;
}

function computeStats(visits: Visit[]): VisitState['stats'] {
    let countries = new Set<string>();
    for (const visit of visits) {
        countries.add(visit.location.countryCode);
    }
    return {
        numCountries: countries.size,
    }
}

const visitSlice = createSlice({
    name: 'visits',
    initialState: initialVisitState,
    reducers: {
        addVisit: (state, action: PayloadAction<Visit>) => {
            state.visits.push(action.payload);
            if ((!state.longestVisit) || 
                (action.payload.hours > state.longestVisit.hours)) {
                state.longestVisit = action.payload;
            }

            state.stats = computeStats(state.visits);
        },
        addVisits: (state, action: PayloadAction<Visit[]>) => {
            state.visits = [...state.visits, ...action.payload];
            state.longestVisit = getLongestVisit(state.visits);
            state.stats = computeStats(state.visits);
        },
    },
});

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        cameraDistance: 0,
        cameraDistanceFactor: 0,
        batchedCameraDistance: 0,
        mapPOISize: 4,
    },
    reducers: {
        setCameraDistance: (state, action: PayloadAction<number>) => {
            state.cameraDistance = action.payload;
            state.cameraDistanceFactor = (action.payload - MIN_CAMERA_DISTANCE) / (MAX_CAMERA_DISTANCE - MIN_CAMERA_DISTANCE);
            const numSizes = 8;
            state.batchedCameraDistance = Math.floor(state.cameraDistanceFactor * numSizes) / numSizes;
            state.mapPOISize = (state.batchedCameraDistance*2 + 0.25);
        },
    }
});

const store = configureStore({
    reducer: {
        legs: legSlice.reducer,
        visits: visitSlice.reducer,
        ui: uiSlice.reducer,
    }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export { legSlice, visitSlice, uiSlice }
export default store;
